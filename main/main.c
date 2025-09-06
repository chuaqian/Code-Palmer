// LED beat flash approximating "The Great Mermaid" groove (no audio playback).
// Adjust BPM or pattern arrays to better sync by ear.
// This does NOT reproduce any copyrighted audio; it's only timing logic.

#include <stdio.h>
#include <math.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"

#define LED_PIN 2   // Change if your board's LED is on another GPIO

// Approximate BPM of the track (tweak + / - to sync with external audio)
#define SONG_BPM        150.0f   // Try 148.0f or 152.0f if you notice drift
#define QUARTER_MS      (60000.0f / SONG_BPM)

// Each step: length in beats (relative to quarter note) and duty (portion ON)
typedef struct {
  float beats;  // e.g. 1.0 = quarter note, 0.5 = eighth, 0.25 = sixteenth
  float duty;   // 0..1 fraction of that step the LED stays ON
} BeatStep;

// A repeating pattern capturing a bar phrase with some syncopation.
// You can refine this by ear. The idea: accent downbeats & select off-beat hits.
static const BeatStep chorus_pattern[] = {
  {1.0f, 0.60f}, // Beat 1 strong
  {0.5f, 0.70f}, // 1& (eighth) accent
  {0.5f, 0.30f}, // Beat 2 lighter
  {1.0f, 0.60f}, // Beat 3 strong
  {1.0f, 0.60f}, // Beat 4 strong sustain
  {0.75f,0.70f}, // Pickup syncopation (three 16ths tied)
  {0.25f,0.30f}, // Final sixteenth release
  {1.0f, 0.80f}, // Resolve (next bar beat 1)
};
static const int CHORUS_PATTERN_LEN = sizeof(chorus_pattern)/sizeof(chorus_pattern[0]);

// Optional: a simpler steady quarter pattern (uncomment to use)
// static const BeatStep simple_beats[] = { {1.0f, 0.5f} }; // LED half-beat on each quarter

static void play_pattern(const BeatStep *pattern, int length, int repeats) {
  for (int r = 0; r < repeats || repeats < 0; ++r) { // repeats < 0 => infinite
    for (int i = 0; i < length; ++i) {
      float step_ms_f = pattern[i].beats * QUARTER_MS;
      if (step_ms_f < 1.0f) step_ms_f = 1.0f; // guard tiny rounding
      int step_ms = (int) (step_ms_f + 0.5f);
      float duty = pattern[i].duty;
      if (duty < 0.0f) duty = 0.0f; else if (duty > 1.0f) duty = 1.0f;
      int on_ms  = (int)(step_ms * duty + 0.5f);
      if (on_ms > step_ms) on_ms = step_ms;
      int off_ms = step_ms - on_ms;

      // ON phase
      if (on_ms > 0) {
        gpio_set_level(LED_PIN, 1);
        vTaskDelay(pdMS_TO_TICKS(on_ms));
      }
      // OFF phase
      if (off_ms > 0) {
        gpio_set_level(LED_PIN, 0);
        vTaskDelay(pdMS_TO_TICKS(off_ms));
      }
    }
  }
}

void app_main(void) {
  gpio_config_t io_conf = {
    .pin_bit_mask = 1ULL << LED_PIN,
    .mode = GPIO_MODE_OUTPUT,
    .pull_up_en = GPIO_PULLUP_DISABLE,
    .pull_down_en = GPIO_PULLDOWN_DISABLE,
    .intr_type = GPIO_INTR_DISABLE
  };
  gpio_config(&io_conf);

  // Optionally blink a quick calibration (3 beats) before starting pattern
  for (int i = 0; i < 3; ++i) {
    gpio_set_level(LED_PIN, 1);
    vTaskDelay(pdMS_TO_TICKS((int)(0.3f * QUARTER_MS)));
    gpio_set_level(LED_PIN, 0);
    vTaskDelay(pdMS_TO_TICKS((int)(0.7f * QUARTER_MS)));
  }

  // Loop chorus pattern indefinitely
  while (1) {
    play_pattern(chorus_pattern, CHORUS_PATTERN_LEN, 1);
  }
}