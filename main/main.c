#include <stdio.h>
#include <string.h>
#include <math.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "driver/gpio.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "driver/ledc.h"
#include "esp_log.h"
#include "esp_rom_sys.h"
#include "esp_system.h"

static const char *TAG = "BLUELY_SLEEP_PEBBLE";

// --- Pin Definitions (ESP32-S3 compatible) ---
#define DHT_PIN             GPIO_NUM_18
// ESP32-S3 ADC1 channels: GPIO1-GPIO10 are ADC1_CH0-ADC1_CH9
#define PHOTORESISTOR_GPIO  GPIO_NUM_1     // GPIO1 for HW-486 photoresistor  
#define SOUND_DIGITAL_GPIO  GPIO_NUM_3     // GPIO3 for HW-496 sound detector (DO - digital output)
#define PHOTORESISTOR_PIN   ADC_CHANNEL_0  // GPIO1 -> ADC1_CH0
#define RGB_R_PIN           GPIO_NUM_10
#define RGB_G_PIN           GPIO_NUM_11
#define RGB_B_PIN           GPIO_NUM_12
#define BUZZER_PIN          GPIO_NUM_19

// --- Sensor Configuration ---
#define ADC_SAMPLES         64             // Number of samples for averaging
#define SENSOR_READ_DELAY   10             // Delay between sensor readings (ms)
#define LIGHT_THRESHOLD_LOW 800            // Dark threshold (adjust based on your setup)
#define LIGHT_THRESHOLD_HIGH 2000          // Bright threshold

// --- Global Variables ---
static adc_oneshot_unit_handle_t adc1_handle;
static adc_cali_handle_t adc1_cali_handle = NULL;
static SemaphoreHandle_t sensor_mutex;

// --- Sensor Data Structures ---
typedef struct {
    float voltage;
    int raw_value;
    int samples;
    bool valid;
} sensor_reading_t;

typedef enum {
    LIGHT_DARK = 0,
    LIGHT_DIM,
    LIGHT_BRIGHT
} light_level_t;

typedef enum {
    SOUND_QUIET = 0,
    SOUND_MODERATE,
    SOUND_LOUD
} sound_level_t;

// --- ADC Calibration Setup ---
static bool adc_calibration_init(adc_unit_t unit, adc_channel_t channel, adc_atten_t atten, adc_cali_handle_t *out_handle) {
    adc_cali_handle_t handle = NULL;
    esp_err_t ret = ESP_FAIL;
    bool calibrated = false;

#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
    if (!calibrated) {
        ESP_LOGI(TAG, "calibration scheme version is %s", "Curve Fitting");
        adc_cali_curve_fitting_config_t cali_config = {
            .unit_id = unit,
            .chan = channel,
            .atten = atten,
            .bitwidth = ADC_BITWIDTH_DEFAULT,
        };
        ret = adc_cali_create_scheme_curve_fitting(&cali_config, &handle);
        if (ret == ESP_OK) {
            calibrated = true;
        }
    }
#endif

#if ADC_CALI_SCHEME_LINE_FITTING_SUPPORTED
    if (!calibrated) {
        ESP_LOGI(TAG, "calibration scheme version is %s", "Line Fitting");
        adc_cali_line_fitting_config_t cali_config = {
            .unit_id = unit,
            .atten = atten,
            .bitwidth = ADC_BITWIDTH_DEFAULT,
        };
        ret = adc_cali_create_scheme_line_fitting(&cali_config, &handle);
        if (ret == ESP_OK) {
            calibrated = true;
        }
    }
#endif

    *out_handle = handle;
    if (ret == ESP_OK) {
        ESP_LOGI(TAG, "ADC calibration Success");
    } else if (ret == ESP_ERR_NOT_SUPPORTED || !calibrated) {
        ESP_LOGW(TAG, "eFuse not burnt, skip software calibration");
    } else {
        ESP_LOGE(TAG, "Invalid arg or no memory");
    }

    return calibrated;
}

// --- Improved Sensor Reading Function ---
static esp_err_t read_sensor_averaged(adc_channel_t channel, sensor_reading_t *reading) {
    if (!reading) {
        return ESP_ERR_INVALID_ARG;
    }

    // Take mutex for thread-safe ADC access
    if (xSemaphoreTake(sensor_mutex, pdMS_TO_TICKS(100)) != pdTRUE) {
        ESP_LOGW(TAG, "Failed to take sensor mutex");
        return ESP_ERR_TIMEOUT;
    }

    int sum = 0;
    int valid_samples = 0;
    int min_val = 4096, max_val = 0;

    // Take multiple samples for averaging
    for (int i = 0; i < ADC_SAMPLES; i++) {
        int raw_value = 0;
        esp_err_t ret = adc_oneshot_read(adc1_handle, channel, &raw_value);
        
        if (ret == ESP_OK && raw_value >= 0 && raw_value <= 4095) {
            sum += raw_value;
            valid_samples++;
            
            // Track min/max for noise detection
            if (raw_value < min_val) min_val = raw_value;
            if (raw_value > max_val) max_val = raw_value;
        }
        
        vTaskDelay(pdMS_TO_TICKS(1)); // Small delay between samples
    }

    xSemaphoreGive(sensor_mutex);

    if (valid_samples == 0) {
        reading->valid = false;
        return ESP_FAIL;
    }

    // Calculate averaged values
    reading->raw_value = sum / valid_samples;
    reading->samples = valid_samples;
    reading->valid = true;

    // Convert to voltage using calibration if available
    if (adc1_cali_handle) {
        int voltage_mv = 0;
        esp_err_t ret = adc_cali_raw_to_voltage(adc1_cali_handle, reading->raw_value, &voltage_mv);
        if (ret == ESP_OK) {
            reading->voltage = voltage_mv / 1000.0f; // Convert mV to V
        } else {
            reading->voltage = (reading->raw_value * 3.3f) / 4095.0f; // Fallback calculation
        }
    } else {
        reading->voltage = (reading->raw_value * 3.3f) / 4095.0f;
    }

    // Log noise level for debugging
    int noise_level = max_val - min_val;
    if (noise_level > 100) {
        ESP_LOGW(TAG, "High noise detected on ADC channel %d: %d", channel, noise_level);
    }

    return ESP_OK;
}

// --- HW-486 Light Resistor Reading Function ---
static esp_err_t read_light_sensor(sensor_reading_t *reading, light_level_t *level) {
    esp_err_t ret = read_sensor_averaged(PHOTORESISTOR_PIN, reading);
    
    if (ret != ESP_OK || !reading->valid) {
        ESP_LOGE(TAG, "Failed to read light sensor");
        *level = LIGHT_DARK; // Default to dark on error
        return ret;
    }

    // Determine light level based on thresholds
    // Note: HW-486 typically gives lower values in bright light (photoresistor behavior)
    if (reading->raw_value < LIGHT_THRESHOLD_LOW) {
        *level = LIGHT_BRIGHT;
    } else if (reading->raw_value < LIGHT_THRESHOLD_HIGH) {
        *level = LIGHT_DIM;
    } else {
        *level = LIGHT_DARK;
    }

    ESP_LOGI(TAG, "Light Sensor - Raw: %d, Voltage: %.2fV, Level: %s", 
             reading->raw_value, reading->voltage,
             (*level == LIGHT_BRIGHT) ? "BRIGHT" : 
             (*level == LIGHT_DIM) ? "DIM" : "DARK");

    return ESP_OK;
}

// --- HW-496 Sound Detector Reading Function ---
static esp_err_t read_sound_sensor(sound_level_t *level, bool *led_on) {
    // Read the digital output pin from HW-496 chip
    bool digital_state = gpio_get_level(SOUND_DIGITAL_GPIO);
    
    // HW-496 digital output directly indicates sound detection
    *led_on = digital_state;
    
    // Set sound level based on digital state
    if (digital_state) {
        *level = SOUND_LOUD;  // Sound detected
    } else {
        *level = SOUND_QUIET; // No sound detected
    }
    
    const char* led_status = *led_on ? "YES" : "NO";
    const char* level_str = (*level == SOUND_LOUD) ? "LOUD" : "QUIET";
    
    ESP_LOGI(TAG, "HW-496 - Digital: %s, Level: %s", 
             digital_state ? "HIGH" : "LOW", level_str);
    
    // Main output for user
    ESP_LOGI(TAG, "🔊 HW-496 SOUND DETECTED: %s", led_status);

    return ESP_OK;
}

// --- HW-496 Connection Diagnostics ---
static void test_hw496_connections(void) {
    ESP_LOGI(TAG, "🔧 === HW-496 CONNECTION TEST ===");
    
    // Test digital connection
    bool digital_state = gpio_get_level(SOUND_DIGITAL_GPIO);
    ESP_LOGI(TAG, "Digital connection (GPIO%d): %s", SOUND_DIGITAL_GPIO, digital_state ? "HIGH" : "LOW");
    
    ESP_LOGI(TAG, "💡 Expected connections:");
    ESP_LOGI(TAG, "   HW-496 VCC → ESP32 3.3V");
    ESP_LOGI(TAG, "   HW-496 GND → ESP32 GND");
    ESP_LOGI(TAG, "   HW-496 DO  → ESP32 GPIO%d", SOUND_DIGITAL_GPIO);
    ESP_LOGI(TAG, "🔧 ========================");
}

// --- Improved DHT11 Reading Function ---
typedef struct {
    float humidity;
    float temperature;
    bool valid;
    uint32_t last_read_time;
} dht11_data_t;

static dht11_data_t dht11_data = {0};

// DHT11 timing constants (microseconds)
#define DHT11_START_LOW     18000   // 18ms low signal
#define DHT11_START_HIGH    40      // 40us high signal
#define DHT11_RESPONSE_LOW  80      // 80us response low
#define DHT11_RESPONSE_HIGH 80      // 80us response high
#define DHT11_BIT_THRESHOLD 50      // 50us threshold for 0/1 bit
#define DHT11_MIN_INTERVAL  2000    // Minimum 2 seconds between reads

static esp_err_t read_dht11_improved(float* humidity, float* temperature) {
    uint32_t current_time = xTaskGetTickCount() * portTICK_PERIOD_MS;
    
    // Check if enough time has passed since last read
    if (current_time - dht11_data.last_read_time < DHT11_MIN_INTERVAL) {
        if (dht11_data.valid) {
            *humidity = dht11_data.humidity;
            *temperature = dht11_data.temperature;
            return ESP_OK;
        } else {
            return ESP_ERR_INVALID_STATE;
        }
    }

    uint8_t data[5] = {0};
    uint32_t timeout_counter;
    
    // Disable interrupts during critical timing section
    portDISABLE_INTERRUPTS();
    
    // Send start signal
    gpio_set_direction(DHT_PIN, GPIO_MODE_OUTPUT);
    gpio_set_level(DHT_PIN, 0);
    esp_rom_delay_us(DHT11_START_LOW);
    gpio_set_level(DHT_PIN, 1);
    esp_rom_delay_us(DHT11_START_HIGH);
    
    // Switch to input mode
    gpio_set_direction(DHT_PIN, GPIO_MODE_INPUT);
    
    // Wait for DHT11 response - LOW pulse
    timeout_counter = 0;
    while (gpio_get_level(DHT_PIN) == 1) {
        esp_rom_delay_us(1);
        if (++timeout_counter > 100) {
            portENABLE_INTERRUPTS();
            ESP_LOGE(TAG, "DHT11 timeout waiting for response LOW");
            return ESP_ERR_TIMEOUT;
        }
    }
    
    // Wait for DHT11 response - HIGH pulse
    timeout_counter = 0;
    while (gpio_get_level(DHT_PIN) == 0) {
        esp_rom_delay_us(1);
        if (++timeout_counter > 100) {
            portENABLE_INTERRUPTS();
            ESP_LOGE(TAG, "DHT11 timeout waiting for response HIGH");
            return ESP_ERR_TIMEOUT;
        }
    }
    
    // Wait for start of data transmission
    timeout_counter = 0;
    while (gpio_get_level(DHT_PIN) == 1) {
        esp_rom_delay_us(1);
        if (++timeout_counter > 100) {
            portENABLE_INTERRUPTS();
            ESP_LOGE(TAG, "DHT11 timeout waiting for data start");
            return ESP_ERR_TIMEOUT;
        }
    }
    
    // Read 40 bits of data
    for (int i = 0; i < 40; i++) {
        // Wait for bit start (LOW to HIGH transition)
        timeout_counter = 0;
        while (gpio_get_level(DHT_PIN) == 0) {
            esp_rom_delay_us(1);
            if (++timeout_counter > 100) {
                portENABLE_INTERRUPTS();
                ESP_LOGE(TAG, "DHT11 timeout on bit %d LOW", i);
                return ESP_ERR_TIMEOUT;
            }
        }
        
        // Measure HIGH pulse duration
        uint32_t high_time = 0;
        while (gpio_get_level(DHT_PIN) == 1) {
            esp_rom_delay_us(1);
            high_time++;
            if (high_time > 100) {
                portENABLE_INTERRUPTS();
                ESP_LOGE(TAG, "DHT11 timeout on bit %d HIGH", i);
                return ESP_ERR_TIMEOUT;
            }
        }
        
        // Determine if bit is 0 or 1 based on pulse duration
        if (high_time > DHT11_BIT_THRESHOLD) {
            data[i / 8] |= (1 << (7 - (i % 8)));
        }
    }
    
    portENABLE_INTERRUPTS();
    
    // Verify checksum
    uint8_t checksum = data[0] + data[1] + data[2] + data[3];
    if (checksum != data[4]) {
        ESP_LOGE(TAG, "DHT11 checksum error: calculated=0x%02X, received=0x%02X", checksum, data[4]);
        return ESP_ERR_INVALID_CRC;
    }
    
    // Parse data
    dht11_data.humidity = (float)data[0] + (float)data[1] * 0.1f;
    dht11_data.temperature = (float)data[2] + (float)data[3] * 0.1f;
    dht11_data.valid = true;
    dht11_data.last_read_time = current_time;
    
    *humidity = dht11_data.humidity;
    *temperature = dht11_data.temperature;
    
    ESP_LOGI(TAG, "DHT11 - Humidity: %.1f%%, Temperature: %.1f°C", *humidity, *temperature);
    
    return ESP_OK;
}

// --- Buzzer Helper Functions ---
static esp_err_t buzzer_init(void) {
    ledc_timer_config_t ledc_timer = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .duty_resolution = LEDC_TIMER_8_BIT,
        .timer_num = LEDC_TIMER_0,
        .freq_hz = 2000,
        .clk_cfg = LEDC_AUTO_CLK
    };
    esp_err_t ret = ledc_timer_config(&ledc_timer);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to configure LEDC timer: %s", esp_err_to_name(ret));
        return ret;
    }

    ledc_channel_config_t ledc_channel = {
        .gpio_num = BUZZER_PIN,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel = LEDC_CHANNEL_0,
        .timer_sel = LEDC_TIMER_0,
        .duty = 0,
        .hpoint = 0
    };
    ret = ledc_channel_config(&ledc_channel);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to configure LEDC channel: %s", esp_err_to_name(ret));
        return ret;
    }

    return ESP_OK;
}

static void play_tone(int frequency, int duration_ms) {
    if (frequency == 0) {
        ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, 0);
        ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
    } else {
        ledc_set_freq(LEDC_LOW_SPEED_MODE, LEDC_TIMER_0, frequency);
        ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, 128); // 50% duty cycle
        ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
    }
    vTaskDelay(pdMS_TO_TICKS(duration_ms));
    // Stop tone after duration
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, 0);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
}

static void play_error_sound(void) {
    for (int i = 0; i < 3; i++) {
        play_tone(200, 100);
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

// --- RGB LED Helper Functions ---
typedef enum {
    LED_OFF = 0,
    LED_RED,
    LED_GREEN,
    LED_BLUE,
    LED_YELLOW,
    LED_PURPLE,
    LED_CYAN,
    LED_WHITE
} led_color_t;

static void set_rgb_color(led_color_t color) {
    // Turn off all LEDs first
    gpio_set_level(RGB_R_PIN, 0);
    gpio_set_level(RGB_G_PIN, 0);
    gpio_set_level(RGB_B_PIN, 0);
    
    switch (color) {
        case LED_RED:
            gpio_set_level(RGB_R_PIN, 1);
            break;
        case LED_GREEN:
            gpio_set_level(RGB_G_PIN, 1);
            break;
        case LED_BLUE:
            gpio_set_level(RGB_B_PIN, 1);
            break;
        case LED_YELLOW:
            gpio_set_level(RGB_R_PIN, 1);
            gpio_set_level(RGB_G_PIN, 1);
            break;
        case LED_PURPLE:
            gpio_set_level(RGB_R_PIN, 1);
            gpio_set_level(RGB_B_PIN, 1);
            break;
        case LED_CYAN:
            gpio_set_level(RGB_G_PIN, 1);
            gpio_set_level(RGB_B_PIN, 1);
            break;
        case LED_WHITE:
            gpio_set_level(RGB_R_PIN, 1);
            gpio_set_level(RGB_G_PIN, 1);
            gpio_set_level(RGB_B_PIN, 1);
            break;
        case LED_OFF:
        default:
            // Already turned off above
            break;
    }
}

// --- System Initialization Functions ---
static esp_err_t gpio_init_all(void) {
    // Configure RGB LED pins
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << RGB_R_PIN) | (1ULL << RGB_G_PIN) | (1ULL << RGB_B_PIN),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    esp_err_t ret = gpio_config(&io_conf);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to configure GPIO: %s", esp_err_to_name(ret));
        return ret;
    }

    // Configure HW-496 digital input pin
    gpio_config_t sound_digital_conf = {
        .pin_bit_mask = (1ULL << SOUND_DIGITAL_GPIO),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    ret = gpio_config(&sound_digital_conf);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to configure HW-496 digital GPIO: %s", esp_err_to_name(ret));
        return ret;
    }

    // Configure DHT11 pin as input with pull-up
    gpio_config_t dht_conf = {
        .pin_bit_mask = (1ULL << DHT_PIN),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    ret = gpio_config(&dht_conf);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to configure DHT11 GPIO: %s", esp_err_to_name(ret));
        return ret;
    }

    return ESP_OK;
}

static esp_err_t adc_init_all(void) {
    // Initialize ADC1
    adc_oneshot_unit_init_cfg_t init_config1 = {
        .unit_id = ADC_UNIT_1,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };
    esp_err_t ret = adc_oneshot_new_unit(&init_config1, &adc1_handle);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize ADC unit: %s", esp_err_to_name(ret));
        return ret;
    }

    // Configure ADC channel for light sensor only
    adc_oneshot_chan_cfg_t config = {
        .bitwidth = ADC_BITWIDTH_12,      // 12-bit resolution for better precision
        .atten = ADC_ATTEN_DB_12,         // 12dB attenuation for 0-3.3V range
    };
    
    ret = adc_oneshot_config_channel(adc1_handle, PHOTORESISTOR_PIN, &config);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to config ADC channel %d: %s", PHOTORESISTOR_PIN, esp_err_to_name(ret));
        return ret;
    }

    // Initialize ADC calibration
    bool calibrated = adc_calibration_init(ADC_UNIT_1, PHOTORESISTOR_PIN, ADC_ATTEN_DB_12, &adc1_cali_handle);
    if (calibrated) {
        ESP_LOGI(TAG, "ADC calibration initialized successfully");
    } else {
        ESP_LOGW(TAG, "ADC calibration not available, using raw conversion");
    }

    return ESP_OK;
}

// --- Main Sensor Monitoring Task ---
static void sensor_monitor_task(void *pvParameters) {
    sensor_reading_t light_reading;
    light_level_t light_level;
    sound_level_t sound_level;
    bool sound_led_on = false;
    float humidity, temperature;
    
    TickType_t last_wake_time = xTaskGetTickCount();
    const TickType_t frequency = pdMS_TO_TICKS(500); // 0.5 second intervals for continuous monitoring
    
    ESP_LOGI(TAG, "Sensor monitoring task started - Continuous streaming mode");
    
    while (1) {
        // Read DHT11 temperature and humidity (less frequently for performance)
        static int dht_counter = 0;
        if (dht_counter++ % 10 == 0) { // Read DHT11 every 5 seconds (10 * 0.5s)
            esp_err_t dht_ret = read_dht11_improved(&humidity, &temperature);
            if (dht_ret == ESP_OK) {
                ESP_LOGI(TAG, "DHT11 - Temp: %.1f°C, Humidity: %.1f%%", temperature, humidity);
            }
        }
        
        // Read light sensor
        esp_err_t light_ret = read_light_sensor(&light_reading, &light_level);
        const char* light_str = (light_level == LIGHT_BRIGHT) ? "BRIGHT" : 
                               (light_level == LIGHT_DIM) ? "DIM" : "DARK";
        
        // Read sound sensor - this is the main focus
        esp_err_t sound_ret = read_sound_sensor(&sound_level, &sound_led_on);
        
        // Streamlined output for continuous monitoring
        if (sound_ret == ESP_OK && light_ret == ESP_OK) {
            if (sound_led_on) {
                ESP_LOGI(TAG, "🔴 SOUND DETECTED | Light: %s | HW-496: ACTIVE", light_str);
                set_rgb_color(LED_RED); // Sound detected - show red for immediate visibility
                play_tone(1000, 50);    // Quick beep
            } else {
                ESP_LOGI(TAG, "⚫ Quiet | Light: %s | HW-496: Inactive", light_str);
                // Set LED color based on light level when quiet
                if (light_level == LIGHT_BRIGHT) {
                    set_rgb_color(LED_GREEN); // Bright and quiet
                } else {
                    set_rgb_color(LED_BLUE);  // Dark and quiet
                }
            }
        } else {
            ESP_LOGE(TAG, "❌ Sensor Error");
            set_rgb_color(LED_PURPLE); // Error state
        }
        
        vTaskDelayUntil(&last_wake_time, frequency);
    }
}

void app_main(void) {
    ESP_LOGI(TAG, "=== BLUELY SLEEP PEBBLE STARTING ===");
    ESP_LOGI(TAG, "ESP32-S3 with HW-486 Light Resistor & HW-496 Sound Detector");
    ESP_LOGI(TAG, "🎯 Configured for HW-496 digital detection with continuous streaming");
    
    // Create mutex for thread-safe sensor access
    sensor_mutex = xSemaphoreCreateMutex();
    if (sensor_mutex == NULL) {
        ESP_LOGE(TAG, "Failed to create sensor mutex");
        return;
    }
    
    // Initialize all GPIO pins
    esp_err_t ret = gpio_init_all();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "GPIO initialization failed: %s", esp_err_to_name(ret));
        return;
    }
    ESP_LOGI(TAG, "✓ GPIO initialized");
    
    // Initialize RGB LED (start with red to show initialization)
    set_rgb_color(LED_RED);
    
    // Initialize ADC
    ret = adc_init_all();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "ADC initialization failed: %s", esp_err_to_name(ret));
        set_rgb_color(LED_RED);
        play_error_sound();
        return;
    }
    ESP_LOGI(TAG, "✓ ADC initialized");
    
    // Initialize buzzer
    ret = buzzer_init();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Buzzer initialization failed: %s", esp_err_to_name(ret));
        set_rgb_color(LED_RED);
        return;
    }
    ESP_LOGI(TAG, "✓ Buzzer initialized");
    
    // Show successful initialization
    set_rgb_color(LED_GREEN);
    vTaskDelay(pdMS_TO_TICKS(1000));
    
    ESP_LOGI(TAG, "=== SYSTEM INITIALIZATION COMPLETE ===");
    
    // Test HW-496 connections before starting
    test_hw496_connections();
    
    // Create sensor monitoring task
    BaseType_t task_ret = xTaskCreate(
        sensor_monitor_task,
        "sensor_monitor",
        4096,                // Stack size
        NULL,                // Parameters
        5,                   // Priority
        NULL                 // Task handle
    );
    
    if (task_ret != pdPASS) {
        ESP_LOGE(TAG, "Failed to create sensor monitoring task");
        set_rgb_color(LED_RED);
        play_error_sound();
        return;
    }
    
    ESP_LOGI(TAG, "✓ Sensor monitoring task created");
    ESP_LOGI(TAG, "=== BLUELY SLEEP PEBBLE READY ===");
    
    // Main loop for periodic status updates
    while (1) {
        // Wait longer to let the monitoring task do its work
        vTaskDelay(pdMS_TO_TICKS(30000)); // 30 seconds
        
        ESP_LOGI(TAG, "System running normally - HW-496 continuous monitoring active");
    }
}