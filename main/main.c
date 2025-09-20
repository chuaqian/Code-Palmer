#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/ledc.h"
#include "esp_log.h"
// Bind console to USB Serial JTAG so getchar() uses USB
#include "driver/usb_serial_jtag.h"
#include "esp_vfs_dev.h"

static const char *TAG = "BLUELY_DEMO";

// --- Hardware Pin Definitions ---
#define RGB_R_PIN           GPIO_NUM_10    // Red LED
#define RGB_G_PIN           GPIO_NUM_11    // Green LED  
#define RGB_B_PIN           GPIO_NUM_12    // Blue LED
#define BUZZER_PIN          GPIO_NUM_19    // Buzzer
#define DHT_PIN             GPIO_NUM_18    // DHT11 sensor
#define LIGHT_SENSOR_PIN    GPIO_NUM_1     // HW-486 light sensor
#define SOUND_SENSOR_PIN    GPIO_NUM_3     // HW-496 sound detector

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

// --- Demo State ---
typedef struct {
    uint8_t red;
    uint8_t green; 
    uint8_t blue;
} rgb_color_t;

static bool demo_running = false;
static TaskHandle_t demo_task_handle = NULL;

// --- Hardware Setup ---
static void setup_gpio(void) {
    // Configure input pins
    gpio_config_t input_conf = {
        .pin_bit_mask = (1ULL << SOUND_SENSOR_PIN),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    gpio_config(&input_conf);
    
    ESP_LOGI(TAG, "✅ GPIO configured");
}

static void setup_ledc(void) {
    // Timer config
    ledc_timer_config_t ledc_timer = {
        .duty_resolution = LEDC_DUTY_RES,
        .freq_hz = LEDC_FREQUENCY,
        .speed_mode = LEDC_MODE,
        .timer_num = LEDC_TIMER
    };
    ledc_timer_config(&ledc_timer);

    // RGB LED channels
    ledc_channel_config_t ledc_channels[] = {
        {.channel = LEDC_CH0_CHANNEL, .duty = 0, .gpio_num = RGB_R_PIN, .speed_mode = LEDC_MODE, .hpoint = 0, .timer_sel = LEDC_TIMER},
        {.channel = LEDC_CH1_CHANNEL, .duty = 0, .gpio_num = RGB_G_PIN, .speed_mode = LEDC_MODE, .hpoint = 0, .timer_sel = LEDC_TIMER},
        {.channel = LEDC_CH2_CHANNEL, .duty = 0, .gpio_num = RGB_B_PIN, .speed_mode = LEDC_MODE, .hpoint = 0, .timer_sel = LEDC_TIMER}
    };

    // Configure RGB channels
    for (int i = 0; i < 3; i++) {
        ledc_channel_config(&ledc_channels[i]);
    }

    // Buzzer timer (separate frequency)
    ledc_timer_config_t buzzer_timer = {
        .duty_resolution = LEDC_DUTY_RES,
        .freq_hz = BUZZER_FREQUENCY,
        .speed_mode = LEDC_MODE,
        .timer_num = LEDC_TIMER_1
    };
    ledc_timer_config(&buzzer_timer);

    // Buzzer channel
    ledc_channel_config_t buzzer_channel = {
        .channel = LEDC_CH3_CHANNEL,
        .duty = 0,
        .gpio_num = BUZZER_PIN,
        .speed_mode = LEDC_MODE,
        .hpoint = 0,
        .timer_sel = LEDC_TIMER_1
    };
    ledc_channel_config(&buzzer_channel);

    ESP_LOGI(TAG, "✅ LEDC configured - RGB LEDs + Buzzer ready");
}

// --- RGB Control Functions ---
static void set_rgb_color(uint8_t red, uint8_t green, uint8_t blue) {
    ledc_set_duty(LEDC_MODE, LEDC_CH0_CHANNEL, red);
    ledc_set_duty(LEDC_MODE, LEDC_CH1_CHANNEL, green);
    ledc_set_duty(LEDC_MODE, LEDC_CH2_CHANNEL, blue);
    
    ledc_update_duty(LEDC_MODE, LEDC_CH0_CHANNEL);
    ledc_update_duty(LEDC_MODE, LEDC_CH1_CHANNEL);
    ledc_update_duty(LEDC_MODE, LEDC_CH2_CHANNEL);
}

static void set_buzzer(uint32_t frequency, uint8_t volume) {
    if (volume > 0) {
        ledc_set_freq(LEDC_MODE, LEDC_TIMER_1, frequency);
        ledc_set_duty(LEDC_MODE, LEDC_CH3_CHANNEL, volume);
        ledc_update_duty(LEDC_MODE, LEDC_CH3_CHANNEL);
    } else {
        ledc_set_duty(LEDC_MODE, LEDC_CH3_CHANNEL, 0);
        ledc_update_duty(LEDC_MODE, LEDC_CH3_CHANNEL);
    }
}

static void stop_all_effects(void) {
    set_rgb_color(0, 0, 0);
    set_buzzer(0, 0);
    demo_running = false;
    if (demo_task_handle) {
        vTaskDelete(demo_task_handle);
        demo_task_handle = NULL;
    }
    ESP_LOGI(TAG, "⏹️ All effects stopped");
}

// --- Demo Effect Tasks ---
static void fast_sunrise_task(void *pvParameters) {
    ESP_LOGI(TAG, "🌅 Starting Fast Sunrise Demo (30 seconds)");
    demo_running = true;
    
    // Sunrise color progression
    rgb_color_t colors[] = {
        {20, 5, 2},      // Very dim red
        {50, 10, 5},     // Dim red
        {100, 20, 10},   // Deep red
        {150, 40, 15},   // Red-orange
        {200, 80, 20},   // Orange
        {255, 120, 40},  // Bright orange
        {255, 180, 80},  // Warm white
        {255, 220, 120}, // Bright warm
        {255, 255, 200}, // Cool white
        {255, 255, 255}  // Full white
    };
    
    int num_steps = sizeof(colors) / sizeof(colors[0]);
    int delay_ms = 3000; // 3 seconds per step = 30 seconds total
    
    for (int i = 0; i < num_steps && demo_running; i++) {
        set_rgb_color(colors[i].red, colors[i].green, colors[i].blue);
        ESP_LOGI(TAG, "🌅 Sunrise Step %d/%d - RGB(%d,%d,%d)", 
                 i+1, num_steps, colors[i].red, colors[i].green, colors[i].blue);
        vTaskDelay(pdMS_TO_TICKS(delay_ms));
    }
    
    ESP_LOGI(TAG, "✅ Fast Sunrise Complete");
    demo_running = false;
    demo_task_handle = NULL;
    vTaskDelete(NULL);
}

static void sunset_task(void *pvParameters) {
    ESP_LOGI(TAG, "🌇 Starting Sunset Demo (30 seconds)");
    demo_running = true;
    
    // Sunset color progression (reverse of sunrise)
    rgb_color_t colors[] = {
        {255, 255, 255}, // Full white
        {255, 220, 120}, // Bright warm
        {255, 180, 80},  // Warm white
        {255, 120, 40},  // Bright orange
        {200, 80, 20},   // Orange
        {150, 40, 15},   // Red-orange
        {100, 20, 10},   // Deep red
        {50, 10, 5},     // Dim red
        {20, 5, 2},      // Very dim red
        {0, 0, 0}        // Off
    };
    
    int num_steps = sizeof(colors) / sizeof(colors[0]);
    int delay_ms = 3000; // 3 seconds per step
    
    for (int i = 0; i < num_steps && demo_running; i++) {
        set_rgb_color(colors[i].red, colors[i].green, colors[i].blue);
        ESP_LOGI(TAG, "🌇 Sunset Step %d/%d - RGB(%d,%d,%d)", 
                 i+1, num_steps, colors[i].red, colors[i].green, colors[i].blue);
        vTaskDelay(pdMS_TO_TICKS(delay_ms));
    }
    
    ESP_LOGI(TAG, "✅ Sunset Complete");
    demo_running = false;
    demo_task_handle = NULL;
    vTaskDelete(NULL);
}

static void rainbow_task(void *pvParameters) {
    ESP_LOGI(TAG, "🌈 Starting Rainbow Demo");
    demo_running = true;
    
    // Rainbow colors
    rgb_color_t colors[] = {
        {255, 0, 0},     // Red
        {255, 127, 0},   // Orange
        {255, 255, 0},   // Yellow
        {0, 255, 0},     // Green
        {0, 0, 255},     // Blue
        {75, 0, 130},    // Indigo
        {148, 0, 211},   // Violet
    };
    
    int num_colors = sizeof(colors) / sizeof(colors[0]);
    
    for (int cycle = 0; cycle < 5 && demo_running; cycle++) { // 5 cycles
        for (int i = 0; i < num_colors && demo_running; i++) {
            set_rgb_color(colors[i].red, colors[i].green, colors[i].blue);
            ESP_LOGI(TAG, "🌈 Rainbow Color %d - RGB(%d,%d,%d)", 
                     i+1, colors[i].red, colors[i].green, colors[i].blue);
            vTaskDelay(pdMS_TO_TICKS(1000)); // 1 second per color
        }
    }
    
    set_rgb_color(0, 0, 0); // Turn off
    ESP_LOGI(TAG, "✅ Rainbow Complete");
    demo_running = false;
    demo_task_handle = NULL;
    vTaskDelete(NULL);
}

static void buzzer_test_task(void *pvParameters) {
    ESP_LOGI(TAG, "🔊 Starting Buzzer Test");
    demo_running = true;
    
    // Test different frequencies
    uint32_t frequencies[] = {500, 800, 1000, 1200, 1500};
    int num_freqs = sizeof(frequencies) / sizeof(frequencies[0]);
    
    for (int i = 0; i < num_freqs && demo_running; i++) {
        ESP_LOGI(TAG, "🔊 Buzzer Frequency: %lu Hz", frequencies[i]);
        set_buzzer(frequencies[i], 100); // Medium volume
        vTaskDelay(pdMS_TO_TICKS(1000)); // 1 second each
        set_buzzer(0, 0); // Off
        vTaskDelay(pdMS_TO_TICKS(500)); // 0.5 second pause
    }
    
    ESP_LOGI(TAG, "✅ Buzzer Test Complete");
    demo_running = false;
    demo_task_handle = NULL;
    vTaskDelete(NULL);
}

static void alarm_demo_task(void *pvParameters) {
    ESP_LOGI(TAG, "⏰ Starting Alarm Demo");
    demo_running = true;
    
    // Progressive alarm - increasing intensity
    for (int intensity = 50; intensity <= 255 && demo_running; intensity += 50) {
        // Flash red with increasing brightness
        set_rgb_color(intensity, 0, 0);
        set_buzzer(800, intensity / 3); // Buzzer volume follows LED intensity
        ESP_LOGI(TAG, "⏰ Alarm Intensity: %d/255", intensity);
        vTaskDelay(pdMS_TO_TICKS(1000));
        
        // Brief pause
        set_rgb_color(0, 0, 0);
        set_buzzer(0, 0);
        vTaskDelay(pdMS_TO_TICKS(500));
    }
    
    stop_all_effects();
    ESP_LOGI(TAG, "✅ Alarm Demo Complete");
    demo_task_handle = NULL;
    vTaskDelete(NULL);
}

// --- Command Processing ---
static void process_command(char *command) {
    // Remove newline characters
    char *newline = strchr(command, '\n');
    if (newline) *newline = '\0';
    newline = strchr(command, '\r');
    if (newline) *newline = '\0';
    
    ESP_LOGI(TAG, "📨 Received command: '%s'", command);
    
    // Stop any running demo first
    if (demo_running && strcmp(command, "STOP_ALARM") != 0) {
        stop_all_effects();
        vTaskDelay(pdMS_TO_TICKS(100)); // Brief pause
    }
    
    if (strcmp(command, "FAST_SUNRISE") == 0) {
        if (demo_task_handle == NULL) {
            xTaskCreate(fast_sunrise_task, "fast_sunrise", 2048, NULL, 5, &demo_task_handle);
        }
    }
    else if (strcmp(command, "TRIGGER_SUNSET") == 0) {
        if (demo_task_handle == NULL) {
            xTaskCreate(sunset_task, "sunset", 2048, NULL, 5, &demo_task_handle);
        }
    }
    else if (strcmp(command, "RED_AMBIENT") == 0) {
        set_rgb_color(80, 20, 10); // Warm red
        ESP_LOGI(TAG, "🔴 Red Ambient Light ON");
    }
    else if (strcmp(command, "BLUE_CALM") == 0) {
        set_rgb_color(10, 30, 100); // Calm blue
        ESP_LOGI(TAG, "🔵 Blue Calm Light ON");
    }
    else if (strcmp(command, "NIGHT_LIGHT") == 0) {
        set_rgb_color(30, 20, 10); // Dim warm light
        ESP_LOGI(TAG, "💡 Night Light ON");
    }
    else if (strcmp(command, "RAINBOW") == 0) {
        if (demo_task_handle == NULL) {
            xTaskCreate(rainbow_task, "rainbow", 2048, NULL, 5, &demo_task_handle);
        }
    }
    else if (strcmp(command, "BUZZER_TEST") == 0) {
        if (demo_task_handle == NULL) {
            xTaskCreate(buzzer_test_task, "buzzer_test", 2048, NULL, 5, &demo_task_handle);
        }
    }
    else if (strcmp(command, "TRIGGER_ALARM") == 0) {
        if (demo_task_handle == NULL) {
            xTaskCreate(alarm_demo_task, "alarm_demo", 2048, NULL, 5, &demo_task_handle);
        }
    }
    else if (strcmp(command, "STOP_ALARM") == 0 || strcmp(command, "STOP") == 0) {
        stop_all_effects();
    }
    else if (strcmp(command, "STATUS") == 0) {
        ESP_LOGI(TAG, "📊 STATUS:");
        ESP_LOGI(TAG, "- Demo Running: %s", demo_running ? "YES" : "NO");
        ESP_LOGI(TAG, "- Sound Sensor: %s", gpio_get_level(SOUND_SENSOR_PIN) ? "ACTIVE" : "QUIET");
        ESP_LOGI(TAG, "- Hardware: ESP32-S3 Ready");
    }
    else if (strcmp(command, "HELP") == 0) {
        ESP_LOGI(TAG, "");
        ESP_LOGI(TAG, "🎭 BLUELY DEMO COMMANDS:");
        ESP_LOGI(TAG, "FAST_SUNRISE     - Quick 30-sec sunrise demo");
        ESP_LOGI(TAG, "TRIGGER_SUNSET   - Full sunset simulation");
        ESP_LOGI(TAG, "RED_AMBIENT      - Warm red sleep light");
        ESP_LOGI(TAG, "BLUE_CALM        - Calming blue light");
        ESP_LOGI(TAG, "NIGHT_LIGHT      - Gentle night light");
        ESP_LOGI(TAG, "RAINBOW          - Rainbow color cycle");
        ESP_LOGI(TAG, "BUZZER_TEST      - Test alarm tones");
        ESP_LOGI(TAG, "TRIGGER_ALARM    - Progressive alarm demo");
        ESP_LOGI(TAG, "STOP_ALARM       - Stop all effects");
        ESP_LOGI(TAG, "STATUS           - Show system status");
        ESP_LOGI(TAG, "HELP             - Show this menu");
        ESP_LOGI(TAG, "");
    }
    else {
        ESP_LOGW(TAG, "❓ Unknown command: '%s' - Type HELP for commands", command);
    }
}

// --- Serial Input Task ---
static void serial_input_task(void *pvParameters) {
    char input_buffer[64];
    int buffer_pos = 0;
    
    ESP_LOGI(TAG, "📺 Serial Command Interface Ready");
    ESP_LOGI(TAG, "Type 'HELP' for available commands");
    
    while (1) {
        int c = getchar();
        
        if (c != EOF) {
            if (c == '\n' || c == '\r') {
                if (buffer_pos > 0) {
                    input_buffer[buffer_pos] = '\0';
                    process_command(input_buffer);
                    buffer_pos = 0;
                }
            }
            else if (buffer_pos < sizeof(input_buffer) - 1) {
                input_buffer[buffer_pos++] = (char)c;
            }
        }
        
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

// --- Sensor Monitoring Task (Optional) ---
static void sensor_monitoring_task(void *pvParameters) {
    ESP_LOGI(TAG, "📡 Sensor monitoring started");
    
    while (1) {
        // Read sound sensor (digital output)
        bool sound_detected = gpio_get_level(SOUND_SENSOR_PIN);
        
        if (sound_detected) {
            ESP_LOGI(TAG, "🔊 Sound detected!");
            // Brief visual feedback if no demo running
            if (!demo_running) {
                set_rgb_color(255, 255, 0); // Yellow flash
                vTaskDelay(pdMS_TO_TICKS(200));
                set_rgb_color(0, 0, 0);
            }
        }
        
        vTaskDelay(pdMS_TO_TICKS(500)); // Check every 500ms
    }
}

// --- Main Application ---
void app_main(void) {
    ESP_LOGI(TAG, "🚀 BLUELY Smart Alarm Demo Starting...");

    // Route console I/O to USB Serial JTAG so Web Serial can talk to getchar()/printf
    usb_serial_jtag_driver_config_t usb_cfg = {
        .tx_buffer_size = 256,
        .rx_buffer_size = 256,
    };
    esp_err_t usb_ret = usb_serial_jtag_driver_install(&usb_cfg);
    if (usb_ret == ESP_OK) {
        // Bind VFS console to USB Serial JTAG driver (IDF 5.5 API)
        esp_vfs_usb_serial_jtag_use_driver();
        // Disable buffering to minimize latency for interactive commands
        setvbuf(stdin, NULL, _IONBF, 0);
        setvbuf(stdout, NULL, _IONBF, 0);
        setvbuf(stderr, NULL, _IONBF, 0);
        ESP_LOGI(TAG, "🔌 USB Serial JTAG console active");
    } else {
        ESP_LOGW(TAG, "⚠️ Failed to init USB Serial JTAG (%d). Falling back to default console.", usb_ret);
    }
    
    // Hardware initialization
    setup_gpio();
    setup_ledc();
    
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
    ESP_LOGI(TAG, "🔖 WEB_SERIAL_READY: Type HELP or send commands over USB serial (CR/LF)");
    
    // Start tasks
    xTaskCreate(serial_input_task, "serial_input", 4096, NULL, 10, NULL);
    xTaskCreate(sensor_monitoring_task, "sensor_monitor", 2048, NULL, 5, NULL);
    
    ESP_LOGI(TAG, "🎯 Demo ready! Connect via Web Serial or type commands in terminal");
    ESP_LOGI(TAG, "Type 'HELP' to see available demo commands");
}