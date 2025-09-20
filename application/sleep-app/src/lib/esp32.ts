// ESP32 Communication Utility
// This utility provides functions to send commands to the ESP32-S3 Smart Alarm

interface ESP32Response {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
}

// Types for incoming sensor messages (as broadcast by the bridge)
export interface ESP32SensorDataMessage {
  type: string; // e.g., 'sensor_data', 'connection_status', etc.
  data?: {
    light_level?: number;
    sound_detected?: boolean;
    temperature?: number;
    humidity?: number;
    timestamp?: number | string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
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
    return this.sendCommand('night_light');
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
    return this.sendCommand('set_bedtime', { hour, minute });
  }

  async enableAlarm(): Promise<ESP32Response> {
    return this.sendCommand('enable_alarm');
  }

  async disableAlarm(): Promise<ESP32Response> {
    return this.sendCommand('disable_alarm');
  }

  // Live stream of incoming ESP32 data via SSE (GET /api/esp32)
  // Usage:
  //   const unsubscribe = esp32Controller.subscribeToStream(
  //     (msg) => console.log(msg),
  //     () => console.log('open'),
  //     (err) => console.error(err)
  //   );
  //   ... later ...
  //   unsubscribe();
  subscribeToStream(
    onMessage: (msg: ESP32SensorDataMessage | string) => void,
    onOpen?: () => void,
    onError?: (err: any) => void
  ): () => void {
    const es = new EventSource(this.baseUrl);

    es.onopen = () => {
      onOpen?.();
    };

    es.onmessage = (ev) => {
      const text = ev.data;
      try {
        const parsed = JSON.parse(text);
        onMessage(parsed);
      } catch {
        onMessage(text);
      }
    };

    es.onerror = (err) => {
      onError?.(err);
      // Let browser retry per EventSource semantics
    };

    return () => es.close();
  }
}

// Create a singleton instance
export const esp32Controller = new ESP32Controller();
