// ESP32 Mock Controller for main application (no backend)
export interface ESP32Response {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

class ESP32ControllerMock {
  async sendCommand(command: string, data?: any): Promise<ESP32Response> {
    await delay(200);
    return {
      success: true,
      message: `Mocked ${command}${
        data ? " with " + JSON.stringify(data) : ""
      }`,
      timestamp: new Date().toISOString(),
    };
  }

  // Audio-related commands
  async testBuzzer(): Promise<ESP32Response> {
    return this.sendCommand("BUZZER_TEST");
  }
  async playPresetTone(toneId: number): Promise<ESP32Response> {
    return this.sendCommand("PRESET_TONE", { toneId });
  }
  async setVolume(volume: number): Promise<ESP32Response> {
    return this.sendCommand("SET_VOLUME", { volume });
  }

  // Light simulation commands
  async triggerSunrise(): Promise<ESP32Response> {
    return this.sendCommand("TRIGGER_SUNRISE");
  }
  async triggerSunset(): Promise<ESP32Response> {
    return this.sendCommand("TRIGGER_SUNSET");
  }
  async setRedAmbient(): Promise<ESP32Response> {
    return this.sendCommand("RED_AMBIENT");
  }
  async setBlueCalm(): Promise<ESP32Response> {
    return this.sendCommand("BLUE_CALM");
  }
  async startRainbow(): Promise<ESP32Response> {
    return this.sendCommand("RAINBOW");
  }
  async fastSunrise(): Promise<ESP32Response> {
    return this.sendCommand("FAST_SUNRISE");
  }
  async nightLight(): Promise<ESP32Response> {
    return this.sendCommand("NIGHT_LIGHT");
  }

  // Control commands
  async stopAlarm(): Promise<ESP32Response> {
    return this.sendCommand("STOP_ALARM");
  }
  async triggerAlarm(): Promise<ESP32Response> {
    return this.sendCommand("TRIGGER_ALARM");
  }
  async getStatus(): Promise<ESP32Response> {
    return this.sendCommand("STATUS");
  }

  // Alarm config
  async setAlarmTime(hour: number, minute: number): Promise<ESP32Response> {
    return this.sendCommand("SET_ALARM_TIME", { hour, minute });
  }
  async setBedtime(hour: number, minute: number): Promise<ESP32Response> {
    return this.sendCommand("SET_BEDTIME", { hour, minute });
  }
  async setSnoozeTime(minutes: number): Promise<ESP32Response> {
    return this.sendCommand("SET_SNOOZE_TIME", { minutes });
  }
  async enableAlarm(): Promise<ESP32Response> {
    return this.sendCommand("ENABLE_ALARM");
  }
  async disableAlarm(): Promise<ESP32Response> {
    return this.sendCommand("DISABLE_ALARM");
  }
}

export const esp32Controller = new ESP32ControllerMock();

export const TONE_MAPPING = {
  1: "TONE_GENTLE",
  2: "TONE_FOREST",
  3: "TONE_PIANO",
  4: "TONE_CHIMES",
  5: "TONE_BELLS",
} as const;

export function getESP32ToneCommand(presetId: number): string {
  return TONE_MAPPING[presetId as keyof typeof TONE_MAPPING] || "BUZZER_TEST";
}
