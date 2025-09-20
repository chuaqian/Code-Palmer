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
    return this.sendCommand('test_buzzer');
  }

  // Light simulation commands
  async triggerSunrise(): Promise<ESP32Response> {
    return this.sendCommand('start_sunrise');
  }

  async triggerSunset(): Promise<ESP32Response> {
    return this.sendCommand('start_sunset');
  }

  async startRainbow(): Promise<ESP32Response> {
    return this.sendCommand('set_rgb');
  }

  async nightLight(): Promise<ESP32Response> {
    return this.sendCommand('NIGHT_LIGHT');
  }

  // Control commands
  async stopAlarm(): Promise<ESP32Response> {
    return this.sendCommand('stop_alarm');
  }

  async triggerAlarm(): Promise<ESP32Response> {
    return this.sendCommand('start_alarm');
  }

  async getStatus(): Promise<ESP32Response> {
    return this.sendCommand('get_status');
  }

  // Advanced alarm commands
  async setBedtime(hour: number, minute: number): Promise<ESP32Response> {
    return this.sendCommand('SET_BEDTIME', { hour, minute });
  }

  async enableAlarm(): Promise<ESP32Response> {
    return this.sendCommand('enable_alarm');
  }

  async disableAlarm(): Promise<ESP32Response> {
    return this.sendCommand('disable_alarm');
  }
}

// Create a singleton instance
export const esp32Controller = new ESP32Controller();
