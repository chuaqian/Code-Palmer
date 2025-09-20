idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES json driver esp_driver_gpio esp_driver_ledc esp_adc esp_timer freertos nvs_flash)