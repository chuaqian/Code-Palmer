#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "driver/gpio.h"
#include "driver/ledc.h"
#include "driver/adc.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "cJSON.h"
// Bind console to USB Serial JTAG so getchar() uses USB
#include "driver/usb_serial_jtag.h"
#include "esp_vfs_dev.h"

static const char *TAG = "SLEEPSYNC_ESP32";

// --- Hardware Pin Definitions ---
#define RGB_R_PIN           GPIO_NUM_10    // Red LED
#define RGB_G_PIN           GPIO_NUM_11    // Green LED  
#define RGB_B_PIN           GPIO_NUM_12    // Blue LED
#define BUZZER_PIN          GPIO_NUM_19    // Buzzer
#define DHT_PIN             GPIO_NUM_18    // DHT11 sensor (future use)
#define LIGHT_SENSOR_PIN    GPIO_NUM_1     // HW-486 light sensor (ADC)
#define SOUND_SENSOR_PIN    GPIO_NUM_3     // HW-496 sound detector (digital)

// --- LEDC Configuration ---
#define LEDC_TIMER              LEDC_TIMER_0
#define LEDC_MODE               LEDC_LOW_SPEED_MODE
#define LEDC_CH0_CHANNEL        LEDC_CHANNEL_0  // Red
#define LEDC_CH1_CHANNEL        LEDC_CHANNEL_1  // Green
#define LEDC_CH2_CHANNEL        LEDC_CHANNEL_2  // Blue
#define LEDC_CH3_CHANNEL        LEDC_CHANNEL_3  // Buzzer
#define LEDC_DUTY_RES           LEDC_TIMER_8_BIT
#define LEDC_FREQUENCY          (4000) // 4kHz for LEDs
#define BUZZER_FREQUENCY        (1000) // 1kHz for buzzer

// --- ADC Configuration ---
#define ADC_CHANNEL_LIGHT       ADC1_CHANNEL_0  // GPIO1
#define ADC_ATTEN               ADC_ATTEN_DB_12 // Full range 0-3.3V
#define ADC_WIDTH               ADC_WIDTH_BIT_12 // 12-bit resolution

// --- System State ---
typedef struct {
    uint8_t red;
    uint8_t green; 
    uint8_t blue;
    uint8_t brightness;
} rgb_state_t;

typedef struct {
    bool alarm_enabled;
    bool alarm_active;
    bool sunrise_active;
    bool sunset_active;
    uint32_t alarm_frequency;
    uint8_t alarm_volume;
    rgb_state_t current_rgb;
} device_state_t;

typedef struct {
    uint16_t light_level;      // 0-4095 (ADC raw)
    bool sound_detected;       // true/false
    float temperature;         // °C (future DHT11)
    float humidity;           // % (future DHT11)
    uint64_t timestamp;       // microseconds since boot
} sensor_data_t;

// Global state
static device_state_t g_device_state = {0};
static sensor_data_t g_sensor_data = {0};
static TaskHandle_t g_alarm_task = NULL;
static TaskHandle_t g_sunrise_task = NULL;
static TaskHandle_t g_sunset_task = NULL;
static QueueHandle_t g_command_queue;

// --- Hardware Setup ---
static esp_err_t setup_gpio(void) {
    // Configure input pins
    gpio_config_t input_conf = {
        .pin_bit_mask = (1ULL << SOUND_SENSOR_PIN),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    esp_err_t ret = gpio_config(&input_conf);
    if (ret != ESP_OK) return ret;
    
    ESP_LOGI(TAG, "✅ GPIO configured - Sound sensor ready");
    return ESP_OK;
}

static esp_err_t setup_adc(void) {
    // Configure ADC1 for light sensor
    esp_err_t ret = adc1_config_width(ADC_WIDTH);
    if (ret != ESP_OK) return ret;
    
    ret = adc1_config_channel_atten(ADC_CHANNEL_LIGHT, ADC_ATTEN);
    if (ret != ESP_OK) return ret;
    
    ESP_LOGI(TAG, "✅ ADC configured - Light sensor ready");
    return ESP_OK;
}

static esp_err_t setup_ledc(void) {
    // Timer config for RGB LEDs
    ledc_timer_config_t ledc_timer = {
        .duty_resolution = LEDC_DUTY_RES,
        .freq_hz = LEDC_FREQUENCY,
        .speed_mode = LEDC_MODE,
        .timer_num = LEDC_TIMER
    };
    esp_err_t ret = ledc_timer_config(&ledc_timer);
    if (ret != ESP_OK) return ret;

    // RGB LED channels
    ledc_channel_config_t ledc_channels[] = {
        {.channel = LEDC_CH0_CHANNEL, .duty = 0, .gpio_num = RGB_R_PIN, .speed_mode = LEDC_MODE, .hpoint = 0, .timer_sel = LEDC_TIMER},
        {.channel = LEDC_CH1_CHANNEL, .duty = 0, .gpio_num = RGB_G_PIN, .speed_mode = LEDC_MODE, .hpoint = 0, .timer_sel = LEDC_TIMER},
        {.channel = LEDC_CH2_CHANNEL, .duty = 0, .gpio_num = RGB_B_PIN, .speed_mode = LEDC_MODE, .hpoint = 0, .timer_sel = LEDC_TIMER}
    };

    // Configure RGB channels
    for (int i = 0; i < 3; i++) {
        ret = ledc_channel_config(&ledc_channels[i]);
        if (ret != ESP_OK) return ret;
    }

    // Buzzer timer (separate frequency)
    ledc_timer_config_t buzzer_timer = {
        .duty_resolution = LEDC_DUTY_RES,
        .freq_hz = BUZZER_FREQUENCY,
        .speed_mode = LEDC_MODE,
        .timer_num = LEDC_TIMER_1
    };
    ret = ledc_timer_config(&buzzer_timer);
    if (ret != ESP_OK) return ret;

    // Buzzer channel
    ledc_channel_config_t buzzer_channel = {
        .channel = LEDC_CH3_CHANNEL,
        .duty = 0,
        .gpio_num = BUZZER_PIN,
        .speed_mode = LEDC_MODE,
        .hpoint = 0,
        .timer_sel = LEDC_TIMER_1
    };
    ret = ledc_channel_config(&buzzer_channel);
    if (ret != ESP_OK) return ret;

    ESP_LOGI(TAG, "✅ LEDC configured - RGB LEDs + Buzzer ready");
    return ESP_OK;
}

// --- Device Control Functions ---
static esp_err_t set_rgb_color(uint8_t red, uint8_t green, uint8_t blue) {
    esp_err_t ret = ESP_OK;
    
    ret |= ledc_set_duty(LEDC_MODE, LEDC_CH0_CHANNEL, red);
    ret |= ledc_set_duty(LEDC_MODE, LEDC_CH1_CHANNEL, green);
    ret |= ledc_set_duty(LEDC_MODE, LEDC_CH2_CHANNEL, blue);
    
    ret |= ledc_update_duty(LEDC_MODE, LEDC_CH0_CHANNEL);
    ret |= ledc_update_duty(LEDC_MODE, LEDC_CH1_CHANNEL);
    ret |= ledc_update_duty(LEDC_MODE, LEDC_CH2_CHANNEL);
    
    if (ret == ESP_OK) {
        g_device_state.current_rgb.red = red;
        g_device_state.current_rgb.green = green;
        g_device_state.current_rgb.blue = blue;
    }
    
    return ret;
}

static esp_err_t set_buzzer(uint32_t frequency, uint8_t volume) {
    esp_err_t ret = ESP_OK;
    
    if (volume > 0 && frequency > 0) {
        ret |= ledc_set_freq(LEDC_MODE, LEDC_TIMER_1, frequency);
        ret |= ledc_set_duty(LEDC_MODE, LEDC_CH3_CHANNEL, volume);
        ret |= ledc_update_duty(LEDC_MODE, LEDC_CH3_CHANNEL);
        
        g_device_state.alarm_frequency = frequency;
        g_device_state.alarm_volume = volume;
    } else {
        ret |= ledc_set_duty(LEDC_MODE, LEDC_CH3_CHANNEL, 0);
        ret |= ledc_update_duty(LEDC_MODE, LEDC_CH3_CHANNEL);
        
        g_device_state.alarm_frequency = 0;
        g_device_state.alarm_volume = 0;
    }
    
    return ret;
}

static void stop_all_effects(void) {
    // Stop all running tasks
    if (g_alarm_task) {
        vTaskDelete(g_alarm_task);
        g_alarm_task = NULL;
    }
    if (g_sunrise_task) {
        vTaskDelete(g_sunrise_task);
        g_sunrise_task = NULL;
    }
    if (g_sunset_task) {
        vTaskDelete(g_sunset_task);
        g_sunset_task = NULL;
    }
    
    // Turn off all outputs
    set_rgb_color(0, 0, 0);
    set_buzzer(0, 0);
    
    // Update state
    g_device_state.alarm_active = false;
    g_device_state.sunrise_active = false;
    g_device_state.sunset_active = false;
    
    ESP_LOGI(TAG, "⏹️ All effects stopped");
}

// --- Sensor Reading Functions ---
static void read_sensors(void) {
    // Read light sensor (ADC)
    int light_raw = adc1_get_raw(ADC_CHANNEL_LIGHT);
    g_sensor_data.light_level = (light_raw < 0) ? 0 : (uint16_t)light_raw;
    
    // Read sound sensor (digital)
    g_sensor_data.sound_detected = gpio_get_level(SOUND_SENSOR_PIN);
    
    // TODO: Add DHT11 temperature/humidity reading
    g_sensor_data.temperature = 22.5f; // Placeholder
    g_sensor_data.humidity = 45.0f;    // Placeholder
    
    // Update timestamp
    g_sensor_data.timestamp = esp_timer_get_time();
}

// --- JSON Output Functions ---
static void send_sensor_data(void) {
    cJSON *json = cJSON_CreateObject();
    cJSON *data = cJSON_CreateObject();
    
    cJSON_AddStringToObject(json, "type", "sensor_data");
    cJSON_AddNumberToObject(data, "light_level", g_sensor_data.light_level);
    cJSON_AddBoolToObject(data, "sound_detected", g_sensor_data.sound_detected);
    cJSON_AddNumberToObject(data, "temperature", g_sensor_data.temperature);
    cJSON_AddNumberToObject(data, "humidity", g_sensor_data.humidity);
    cJSON_AddNumberToObject(data, "timestamp", g_sensor_data.timestamp);
    cJSON_AddItemToObject(json, "data", data);
    
    char *json_string = cJSON_Print(json);
    if (json_string) {
        printf("%s\n", json_string);
        free(json_string);
    }
    cJSON_Delete(json);
}

static void send_device_status(void) {
    cJSON *json = cJSON_CreateObject();
    cJSON *status = cJSON_CreateObject();
    cJSON *rgb = cJSON_CreateObject();
    
    cJSON_AddStringToObject(json, "type", "device_status");
    
    cJSON_AddBoolToObject(status, "alarm_enabled", g_device_state.alarm_enabled);
    cJSON_AddBoolToObject(status, "alarm_active", g_device_state.alarm_active);
    cJSON_AddBoolToObject(status, "sunrise_active", g_device_state.sunrise_active);
    cJSON_AddBoolToObject(status, "sunset_active", g_device_state.sunset_active);
    cJSON_AddNumberToObject(status, "alarm_frequency", g_device_state.alarm_frequency);
    cJSON_AddNumberToObject(status, "alarm_volume", g_device_state.alarm_volume);
    
    cJSON_AddNumberToObject(rgb, "red", g_device_state.current_rgb.red);
    cJSON_AddNumberToObject(rgb, "green", g_device_state.current_rgb.green);
    cJSON_AddNumberToObject(rgb, "blue", g_device_state.current_rgb.blue);
    cJSON_AddItemToObject(status, "rgb", rgb);
    
    cJSON_AddItemToObject(json, "status", status);
    
    char *json_string = cJSON_Print(json);
    if (json_string) {
        printf("%s\n", json_string);
        free(json_string);
    }
    cJSON_Delete(json);
}

static void send_response(const char* command, bool success, const char* message) {
    cJSON *json = cJSON_CreateObject();
    
    cJSON_AddStringToObject(json, "type", "command_response");
    cJSON_AddStringToObject(json, "command", command);
    cJSON_AddBoolToObject(json, "success", success);
    cJSON_AddStringToObject(json, "message", message);
    cJSON_AddNumberToObject(json, "timestamp", esp_timer_get_time());
    
    char *json_string = cJSON_Print(json);
    if (json_string) {
        printf("%s\n", json_string);
        free(json_string);
    }
    cJSON_Delete(json);
}

// --- Sleep Effect Tasks ---
static void sunrise_task(void *pvParameters) {
    g_device_state.sunrise_active = true;
    send_response("start_sunrise", true, "Sunrise simulation started");
    
    // Sunrise color progression - 20 steps over 10 minutes (30s each)
    typedef struct { uint8_t r, g, b; } color_t;
    color_t colors[] = {
        {5, 0, 0},      // Very dim red
        {15, 5, 0},     // Dim red
        {30, 10, 0},    // Deep red
        {50, 15, 0},    // Red-orange
        {80, 25, 5},    // Orange
        {120, 40, 10},  // Bright orange
        {160, 60, 15},  // Warm orange
        {200, 80, 20},  // Yellow-orange
        {255, 120, 40}, // Bright orange
        {255, 160, 60}, // Warm white
        {255, 200, 80}, // Warmer white
        {255, 220, 120},// Bright warm
        {255, 240, 160},// Cool white
        {255, 255, 200},// Daylight
        {255, 255, 255} // Full white
    };
    
    int num_steps = sizeof(colors) / sizeof(colors[0]);
    int delay_ms = 2000; // 2 seconds per step for demo (normally 30s)
    
    for (int i = 0; i < num_steps && g_device_state.sunrise_active; i++) {
        set_rgb_color(colors[i].r, colors[i].g, colors[i].b);
        ESP_LOGI(TAG, "🌅 Sunrise Step %d/%d", i+1, num_steps);
        vTaskDelay(pdMS_TO_TICKS(delay_ms));
    }
    
    if (g_device_state.sunrise_active) {
        send_response("sunrise_complete", true, "Sunrise simulation completed");
    }
    
    g_device_state.sunrise_active = false;
    g_sunrise_task = NULL;
    vTaskDelete(NULL);
}

static void sunset_task(void *pvParameters) {
    g_device_state.sunset_active = true;
    send_response("start_sunset", true, "Sunset simulation started");
    
    // Sunset color progression (reverse of sunrise)
    typedef struct { uint8_t r, g, b; } color_t;
    color_t colors[] = {
        {255, 255, 255}, // Full white
        {255, 240, 160}, // Cool white
        {255, 220, 120}, // Bright warm
        {255, 200, 80},  // Warmer white
        {255, 160, 60},  // Warm white
        {255, 120, 40},  // Bright orange
        {200, 80, 20},   // Yellow-orange
        {160, 60, 15},   // Warm orange
        {120, 40, 10},   // Bright orange
        {80, 25, 5},     // Orange
        {50, 15, 0},     // Red-orange
        {30, 10, 0},     // Deep red
        {15, 5, 0},      // Dim red
        {5, 0, 0},       // Very dim red
        {0, 0, 0}        // Off
    };
    
    int num_steps = sizeof(colors) / sizeof(colors[0]);
    int delay_ms = 1500; // 1.5 seconds per step for demo
    
    for (int i = 0; i < num_steps && g_device_state.sunset_active; i++) {
        set_rgb_color(colors[i].r, colors[i].g, colors[i].b);
        ESP_LOGI(TAG, "🌇 Sunset Step %d/%d", i+1, num_steps);
        vTaskDelay(pdMS_TO_TICKS(delay_ms));
    }
    
    if (g_device_state.sunset_active) {
        send_response("sunset_complete", true, "Sunset simulation completed");
    }
    
    g_device_state.sunset_active = false;
    g_sunset_task = NULL;
    vTaskDelete(NULL);
}

static void alarm_task(void *pvParameters) {
    g_device_state.alarm_active = true;
    send_response("start_alarm", true, "Alarm sequence started");
    
        // Progressive alarm - increasing intensity over 2 minutes
        for (int cycle = 0; cycle < 30 && g_device_state.alarm_active; cycle++) {
            uint8_t intensity = (50 + (cycle * 7) > 255) ? 255 : (50 + (cycle * 7)); // Prevent overflow
            
            uint32_t frequency = 800 + (cycle * 20); // Increase pitch
            if (frequency > 2000) frequency = 2000;        // Flash red with increasing brightness
        set_rgb_color(intensity, 0, 0);
        set_buzzer(frequency, intensity / 3);
        vTaskDelay(pdMS_TO_TICKS(2000)); // 2 seconds on
        
        // Brief pause
        set_rgb_color(0, 0, 0);
        set_buzzer(0, 0);
        vTaskDelay(pdMS_TO_TICKS(1000)); // 1 second off
    }
    
    // Final fade out
    stop_all_effects();
    send_response("alarm_complete", true, "Alarm sequence completed");
    
    g_device_state.alarm_active = false;
    g_alarm_task = NULL;
    vTaskDelete(NULL);
}
// --- JSON Command Processing ---
static void process_json_command(const char *json_str) {
    cJSON *json = cJSON_Parse(json_str);
    if (!json) {
        send_response("parse_error", false, "Invalid JSON format");
        return;
    }
    
    cJSON *command = cJSON_GetObjectItem(json, "command");
    if (!command || !cJSON_IsString(command)) {
        send_response("missing_command", false, "Missing or invalid command field");
        cJSON_Delete(json);
        return;
    }
    
    const char *cmd = command->valuestring;
    ESP_LOGI(TAG, "📨 Processing command: %s", cmd);
    
    // === LIGHTING COMMANDS ===
    if (strcmp(cmd, "start_sunrise") == 0) {
        if (!g_device_state.sunrise_active) {
            stop_all_effects(); // Stop other effects first
            xTaskCreate(sunrise_task, "sunrise", 3072, NULL, 5, &g_sunrise_task);
        } else {
            send_response(cmd, false, "Sunrise already active");
        }
    }
    else if (strcmp(cmd, "start_sunset") == 0) {
        if (!g_device_state.sunset_active) {
            stop_all_effects();
            xTaskCreate(sunset_task, "sunset", 3072, NULL, 5, &g_sunset_task);
        } else {
            send_response(cmd, false, "Sunset already active");
        }
    }
    else if (strcmp(cmd, "set_rgb") == 0) {
        cJSON *r = cJSON_GetObjectItem(json, "r");
        cJSON *g = cJSON_GetObjectItem(json, "g");
        cJSON *b = cJSON_GetObjectItem(json, "b");
        
        if (r && g && b && cJSON_IsNumber(r) && cJSON_IsNumber(g) && cJSON_IsNumber(b)) {
            uint8_t red = (uint8_t)cJSON_GetNumberValue(r);
            uint8_t green = (uint8_t)cJSON_GetNumberValue(g);
            uint8_t blue = (uint8_t)cJSON_GetNumberValue(b);
            
            stop_all_effects(); // Stop automatic effects
            esp_err_t ret = set_rgb_color(red, green, blue);
            if (ret == ESP_OK) {
                send_response(cmd, true, "RGB color set");
            } else {
                send_response(cmd, false, "Failed to set RGB color");
            }
        } else {
            send_response(cmd, false, "Invalid RGB parameters (r, g, b required)");
        }
    }
    else if (strcmp(cmd, "set_brightness") == 0) {
        cJSON *brightness = cJSON_GetObjectItem(json, "brightness");
        if (brightness && cJSON_IsNumber(brightness)) {
            uint8_t level = (uint8_t)cJSON_GetNumberValue(brightness);
            uint8_t r = (g_device_state.current_rgb.red * level) / 255;
            uint8_t g = (g_device_state.current_rgb.green * level) / 255;
            uint8_t b = (g_device_state.current_rgb.blue * level) / 255;
            
            esp_err_t ret = set_rgb_color(r, g, b);
            if (ret == ESP_OK) {
                g_device_state.current_rgb.brightness = level;
                send_response(cmd, true, "Brightness set");
            } else {
                send_response(cmd, false, "Failed to set brightness");
            }
        } else {
            send_response(cmd, false, "Invalid brightness parameter");
        }
    }
    
    // === ALARM COMMANDS ===
    else if (strcmp(cmd, "start_alarm") == 0) {
        if (!g_device_state.alarm_active) {
            stop_all_effects();
            xTaskCreate(alarm_task, "alarm", 3072, NULL, 5, &g_alarm_task);
        } else {
            send_response(cmd, false, "Alarm already active");
        }
    }
    else if (strcmp(cmd, "stop_alarm") == 0) {
        if (g_device_state.alarm_active) {
            stop_all_effects();
            send_response(cmd, true, "Alarm stopped");
        } else {
            send_response(cmd, false, "No alarm active");
        }
    }
    else if (strcmp(cmd, "enable_alarm") == 0) {
        g_device_state.alarm_enabled = true;
        send_response(cmd, true, "Alarm system enabled");
    }
    else if (strcmp(cmd, "disable_alarm") == 0) {
        g_device_state.alarm_enabled = false;
        if (g_device_state.alarm_active) {
            stop_all_effects();
        }
        send_response(cmd, true, "Alarm system disabled");
    }
    else if (strcmp(cmd, "test_buzzer") == 0) {
        cJSON *freq = cJSON_GetObjectItem(json, "frequency");
        cJSON *vol = cJSON_GetObjectItem(json, "volume");
        cJSON *duration = cJSON_GetObjectItem(json, "duration");
        
        uint32_t frequency = freq && cJSON_IsNumber(freq) ? (uint32_t)cJSON_GetNumberValue(freq) : 1000;
        uint8_t volume = vol && cJSON_IsNumber(vol) ? (uint8_t)cJSON_GetNumberValue(vol) : 100;
        uint32_t dur_ms = duration && cJSON_IsNumber(duration) ? (uint32_t)cJSON_GetNumberValue(duration) : 1000;
        
        set_buzzer(frequency, volume);
        vTaskDelay(pdMS_TO_TICKS(dur_ms));  
        set_buzzer(0, 0);
        send_response(cmd, true, "Buzzer test completed");
    }
    
    // === SYSTEM COMMANDS ===
    else if (strcmp(cmd, "get_status") == 0) {
        send_device_status();
        send_response(cmd, true, "Status sent");
    }
    else if (strcmp(cmd, "get_sensors") == 0) {
        read_sensors();
        send_sensor_data();
        send_response(cmd, true, "Sensor data sent");
    }
    else if (strcmp(cmd, "stop_all") == 0) {
        stop_all_effects();
        send_response(cmd, true, "All effects stopped");
    }
    else if (strcmp(cmd, "reset") == 0) {
        stop_all_effects();
        g_device_state.alarm_enabled = false;
        send_response(cmd, true, "Device reset to default state");
    }
    else {
        char error_msg[128];
        snprintf(error_msg, sizeof(error_msg), "Unknown command: %s", cmd);
        send_response(cmd, false, error_msg);
    }
    
    cJSON_Delete(json);
}

// --- Serial Input Task ---
static void serial_input_task(void *pvParameters) {
    char input_buffer[512];
    int buffer_pos = 0;
    bool in_json = false;
    int brace_count = 0;
    
    ESP_LOGI(TAG, "📺 JSON Serial Interface Ready");
    
    while (1) {
        int c = getchar();
        
        if (c != EOF) {
            if (c == '{') {
                if (!in_json) {
                    in_json = true;
                    buffer_pos = 0;
                    brace_count = 0;
                }
                brace_count++;
                if (buffer_pos < sizeof(input_buffer) - 1) {
                    input_buffer[buffer_pos++] = (char)c;
                }
            }
            else if (in_json) {
                if (buffer_pos < sizeof(input_buffer) - 1) {
                    input_buffer[buffer_pos++] = (char)c;
                }
                
                if (c == '}') {
                    brace_count--;
                    if (brace_count == 0) {
                        // Complete JSON received
                        input_buffer[buffer_pos] = '\0';
                        process_json_command(input_buffer);
                        in_json = false;
                        buffer_pos = 0;
                    }
                }
            }
        }
        
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

// --- Sensor Monitoring Task ---
static void sensor_monitoring_task(void *pvParameters) {
    ESP_LOGI(TAG, "📡 Sensor monitoring started");
    uint64_t last_send_time = 0;
    
    while (1) {
        // Read all sensors
        read_sensors();
        
        // Send sensor data every 2 seconds
        uint64_t now = esp_timer_get_time();
        if (now - last_send_time > 2000000) { // 2 seconds in microseconds
            send_sensor_data();
            last_send_time = now;
        }
        
        // Check for sound events (immediate notification)
        static bool last_sound_state = false;
        if (g_sensor_data.sound_detected != last_sound_state) {
            if (g_sensor_data.sound_detected) {
                // Send immediate sound detection notification
                cJSON *json = cJSON_CreateObject();
                cJSON_AddStringToObject(json, "type", "sound_event");
                cJSON_AddBoolToObject(json, "detected", true);
                cJSON_AddNumberToObject(json, "timestamp", g_sensor_data.timestamp);
                
                char *json_string = cJSON_Print(json);
                if (json_string) {
                    printf("%s\n", json_string);
                    free(json_string);
                }
                cJSON_Delete(json);
                
                // Brief visual feedback if no other effects running
                if (!g_device_state.alarm_active && !g_device_state.sunrise_active && !g_device_state.sunset_active) {
                    rgb_state_t original = g_device_state.current_rgb;
                    set_rgb_color(255, 255, 0); // Yellow flash
                    vTaskDelay(pdMS_TO_TICKS(200));
                    set_rgb_color(original.red, original.green, original.blue); // Restore
                }
            }
            last_sound_state = g_sensor_data.sound_detected;
        }
        
        vTaskDelay(pdMS_TO_TICKS(100)); // Check every 100ms
    }
}

// --- Main Application ---
void app_main(void) {
    ESP_LOGI(TAG, "🚀 SleepSync ESP32 Starting...");

    // Initialize device state
    memset(&g_device_state, 0, sizeof(g_device_state));
    memset(&g_sensor_data, 0, sizeof(g_sensor_data));
    
    // Create command queue
    g_command_queue = xQueueCreate(10, sizeof(char*));
    if (!g_command_queue) {
        ESP_LOGE(TAG, "Failed to create command queue");
        return;
    }

    // Route console I/O to USB Serial JTAG
    usb_serial_jtag_driver_config_t usb_cfg = {
        .tx_buffer_size = 512,
        .rx_buffer_size = 512,
    };
    esp_err_t usb_ret = usb_serial_jtag_driver_install(&usb_cfg);
    if (usb_ret == ESP_OK) {
        esp_vfs_usb_serial_jtag_use_driver(); // Note: deprecated but still functional
        setvbuf(stdin, NULL, _IONBF, 0);
        setvbuf(stdout, NULL, _IONBF, 0);
        setvbuf(stderr, NULL, _IONBF, 0);
        ESP_LOGI(TAG, "🔌 USB Serial JTAG console active");
    } else {
        ESP_LOGW(TAG, "⚠️ Failed to init USB Serial JTAG (%d)", usb_ret);
    }
    
    // Hardware initialization
    esp_err_t ret = ESP_OK;
    ret |= setup_gpio();
    ret |= setup_adc();
    ret |= setup_ledc();
    
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "❌ Hardware initialization failed");
        return;
    }
    
    // Brief startup sequence
    ESP_LOGI(TAG, "🔄 Running startup test...");
    set_rgb_color(255, 0, 0);   // Red
    vTaskDelay(pdMS_TO_TICKS(300));
    set_rgb_color(0, 255, 0);   // Green  
    vTaskDelay(pdMS_TO_TICKS(300));
    set_rgb_color(0, 0, 255);   // Blue
    vTaskDelay(pdMS_TO_TICKS(300));
    set_rgb_color(0, 0, 0);     // Off
    
    set_buzzer(1000, 100);      // Brief beep
    vTaskDelay(pdMS_TO_TICKS(200));
    set_buzzer(0, 0);
    
    ESP_LOGI(TAG, "✅ Hardware test complete - All systems ready!");
    
    // Send initial status
    vTaskDelay(pdMS_TO_TICKS(1000)); // Wait for serial to stabilize
    
    // Send ready notification
    cJSON *ready_json = cJSON_CreateObject();
    cJSON_AddStringToObject(ready_json, "type", "device_ready");
    cJSON_AddStringToObject(ready_json, "device", "SleepSync ESP32");
    cJSON_AddStringToObject(ready_json, "version", "1.0.0");
    cJSON_AddNumberToObject(ready_json, "timestamp", esp_timer_get_time());
    
    char *ready_string = cJSON_Print(ready_json);
    if (ready_string) {
        printf("%s\n", ready_string);
        free(ready_string);
    }
    cJSON_Delete(ready_json);
    
    // Start tasks
    xTaskCreate(serial_input_task, "serial_input", 4096, NULL, 10, NULL);
    xTaskCreate(sensor_monitoring_task, "sensor_monitor", 3072, NULL, 5, NULL);
    
    ESP_LOGI(TAG, "🎯 SleepSync ready! Send JSON commands via USB serial");
    ESP_LOGI(TAG, "📡 Streaming sensor data every 2 seconds");
}