// ESP32 Communication Utility
// This utility provides functions to send commands to the ESP32-S3 Smart Alarm

interface ESP32Response {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
}

class ESP32Controller {
  private baseUrl = '/api/esp32';

  async sendCommand(command: string, data?: any): Promise<ESP32Response> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, data }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send command');
      }

      return result;
    } catch (error) {
      console.error(`ESP32 Command Error (${command}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Audio-related commands
  async testBuzzer(): Promise<ESP32Response> {
    return this.sendCommand('BUZZER_TEST');
  }

  async playPresetTone(toneId: number): Promise<ESP32Response> {
    return this.sendCommand('PRESET_TONE', { toneId });
  }

  async setVolume(volume: number): Promise<ESP32Response> {
    return this.sendCommand('SET_VOLUME', { volume });
  }

  // Light simulation commands
  async triggerSunrise(): Promise<ESP32Response> {
    return this.sendCommand('TRIGGER_SUNRISE');
  }

  async triggerSunset(): Promise<ESP32Response> {
    return this.sendCommand('TRIGGER_SUNSET');
  }

  async setRedAmbient(): Promise<ESP32Response> {
    return this.sendCommand('RED_AMBIENT');
  }

  async setBlueCalm(): Promise<ESP32Response> {
    return this.sendCommand('BLUE_CALM');
  }

  async startRainbow(): Promise<ESP32Response> {
    return this.sendCommand('RAINBOW');
  }

  async fastSunrise(): Promise<ESP32Response> {
    return this.sendCommand('FAST_SUNRISE');
  }

  async nightLight(): Promise<ESP32Response> {
    return this.sendCommand('NIGHT_LIGHT');
  }

  // Control commands
  async stopAlarm(): Promise<ESP32Response> {
    return this.sendCommand('STOP_ALARM');
  }

  async triggerAlarm(): Promise<ESP32Response> {
    return this.sendCommand('TRIGGER_ALARM');
  }

  async getStatus(): Promise<ESP32Response> {
    return this.sendCommand('STATUS');
  }

  // Advanced alarm commands
  async setAlarmTime(hour: number, minute: number): Promise<ESP32Response> {
    return this.sendCommand('SET_ALARM_TIME', { hour, minute });
  }

  async setBedtime(hour: number, minute: number): Promise<ESP32Response> {
    return this.sendCommand('SET_BEDTIME', { hour, minute });
  }

  async setSnoozeTime(minutes: number): Promise<ESP32Response> {
    return this.sendCommand('SET_SNOOZE_TIME', { minutes });
  }

  async enableAlarm(): Promise<ESP32Response> {
    return this.sendCommand('ENABLE_ALARM');
  }

  async disableAlarm(): Promise<ESP32Response> {
    return this.sendCommand('DISABLE_ALARM');
  }
}

// Create a singleton instance
export const esp32Controller = new ESP32Controller();

// Tone mapping for preset tones
export const TONE_MAPPING = {
  1: 'TONE_GENTLE', // Gentle Waves
  2: 'TONE_FOREST', // Forest Dawn  
  3: 'TONE_PIANO',  // Soft Piano
  4: 'TONE_CHIMES', // Wind Chimes
  5: 'TONE_BELLS',  // Ambient Bells
};

// Helper function to get ESP32 tone command from preset ID
export function getESP32ToneCommand(presetId: number): string {
  return TONE_MAPPING[presetId as keyof typeof TONE_MAPPING] || 'BUZZER_TEST';
}