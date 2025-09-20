// ESP32 Serial Communication using Web Serial API
// This enables direct USB serial communication from the browser

// Web Serial API types
interface SerialPort {
  open(options: any): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream | null;
  writable: WritableStream | null;
}

interface Navigator {
  serial: {
    requestPort(options?: any): Promise<SerialPort>;
  };
}

class ESP32SerialController {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private writer: WritableStreamDefaultWriter | null = null;
  private connected = false;
  private lineBuffer = '';
  private listeners: Array<(line: string) => void> = [];
  private logs: string[] = [];

  async connect(): Promise<boolean> {
    try {
      // Check if Web Serial API is supported and in a secure context
      const isSecure = (globalThis as any).isSecureContext ?? false;
      if (!isSecure) {
        throw new Error('Web Serial requires a secure context (https or http://localhost). Open the app at http://localhost:<port>.');
      }
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not available. Use Chrome/Edge on desktop.');
      }

      // Request a port
      // Try with common vendor filters first; if none selected, fallback to no filters
      const filters = [
        { usbVendorId: 0x303a }, // Espressif (ESP32/ESP32-S3)
        { usbVendorId: 0x10c4 }, // Silicon Labs CP210x
        { usbVendorId: 0x1a86 }, // QinHeng CH340/CH341
        { usbVendorId: 0x0403 }, // FTDI FT232/FT2232
        { usbVendorId: 0x067b }, // Prolific PL2303
      ];

      try {
        this.port = await (navigator as any).serial.requestPort({ filters });
      } catch (e: any) {
        // If user canceled, rethrow
        if (e?.name === 'NotFoundError' || e?.name === 'AbortError') throw e;
        // Fallback: let user pick from all serial devices
        this.port = await (navigator as any).serial.requestPort();
      }

      if (!this.port) {
        throw new Error('No port selected');
      }

      // Open the port
      await this.port.open({ 
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        bufferSize: 255
      });

      // Set up reader and writer
      if (this.port.readable) {
        this.reader = this.port.readable.getReader();
        this.startReadLoop();
      }
      
      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }

      this.connected = true;
      console.log('✅ ESP32 connected via USB serial');
      
      // Send a test command to verify connection
      await this.sendCommand('STATUS');
      
      return true;

    } catch (error: any) {
      const msg = mapSerialError(error);
      console.error('❌ Failed to connect to ESP32:', error);
      this.connected = false;
      // Re-throw to let UI show detailed message when needed
      throw new Error(msg);
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.connected = false;
      
      if (this.reader) {
        try { await this.reader.cancel(); } catch {}
        this.reader.releaseLock();
        this.reader = null;
      }

      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      console.log('ESP32 disconnected');
    } catch (error) {
      console.error('Error disconnecting ESP32:', error);
    }
  }

  async sendCommand(command: string): Promise<boolean> {
    if (!this.connected || !this.writer) {
      console.error('ESP32 not connected');
      return false;
    }

    try {
      const data = new TextEncoder().encode(command + '\r\n');
      await this.writer.write(data);
      console.log(`📤 Sent to ESP32: ${command}`);
      
      // Small delay to ensure command is processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Error sending command:', error);
      return false;
    }
  }

  async readResponse(): Promise<string | null> {
    if (!this.connected || !this.reader) {
      return null;
    }

    try {
      const { value, done } = await this.reader.read();
      if (done) return null;
      
      const response = new TextDecoder().decode(value);
      console.log(`📥 ESP32 response: ${response}`);
      return response;
    } catch (error) {
      console.error('Error reading from ESP32:', error);
      return null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Demo command shortcuts
  async triggerSunrise(): Promise<boolean> {
    return await this.sendCommand('FAST_SUNRISE');
  }

  async triggerSunset(): Promise<boolean> {
    return await this.sendCommand('TRIGGER_SUNSET');
  }

  async redAmbient(): Promise<boolean> {
    return await this.sendCommand('RED_AMBIENT');
  }

  async blueCalm(): Promise<boolean> {
    return await this.sendCommand('BLUE_CALM');
  }

  async buzzerTest(): Promise<boolean> {
    return await this.sendCommand('BUZZER_TEST');
  }

  async rainbow(): Promise<boolean> {
    return await this.sendCommand('RAINBOW');
  }

  async nightLight(): Promise<boolean> {
    return await this.sendCommand('NIGHT_LIGHT');
  }

  async triggerAlarm(): Promise<boolean> {
    return await this.sendCommand('TRIGGER_ALARM');
  }

  async stopAlarm(): Promise<boolean> {
    return await this.sendCommand('STOP_ALARM');
  }

  async getStatus(): Promise<boolean> {
    return await this.sendCommand('STATUS');
  }

  // Subscribe to line-based messages from device
  onMessage(cb: (line: string) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(fn => fn !== cb);
    };
  }

  getLogs(): string[] {
    return this.logs.slice(-200);
  }

  private emit(line: string) {
    this.logs.push(line);
    if (this.logs.length > 500) this.logs.splice(0, this.logs.length - 500);
    for (const fn of this.listeners) {
      try { fn(line); } catch {}
    }
  }

  private async startReadLoop() {
    if (!this.reader) return;
    const decoder = new TextDecoder();
    try {
      while (this.connected && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (!value) continue;
        const chunk = decoder.decode(value);
        this.lineBuffer += chunk;
        let idx: number;
        while ((idx = this.lineBuffer.search(/\r?\n/)) >= 0) {
          const line = this.lineBuffer.slice(0, idx).trimEnd();
          this.lineBuffer = this.lineBuffer.slice(idx + (this.lineBuffer[idx] === '\r' && this.lineBuffer[idx+1] === '\n' ? 2 : 1));
          if (line.length) {
            console.log('📥', line);
            this.emit(line);
          }
        }
      }
    } catch (e) {
      if (this.connected) {
        console.warn('Read loop ended:', e);
      }
    }
  }
}

// Create singleton instance
export const esp32Serial = new ESP32SerialController();

// Helper function to check Web Serial support
export function isWebSerialSupported(): boolean {
  return 'serial' in navigator;
}

// Map low-level DOMExceptions to friendly guidance
function mapSerialError(error: any): string {
  const name = error?.name || '';
  const msg = String(error?.message || error || '');
  if (!((globalThis as any).isSecureContext ?? false)) {
    return 'Web Serial requires HTTPS or http://localhost. Please open the app on http://localhost and try again.';
  }
  if (name === 'NetworkError' || /Access denied|The device is already in use/i.test(msg)) {
    return 'The serial port is busy. Close other apps using the port (e.g., idf.py monitor, Arduino/VS Code Serial Monitor) and retry.';
  }
  if (name === 'NotFoundError') {
    return 'No serial device was selected. Please choose your ESP32 COM port in the dialog.';
  }
  if (name === 'SecurityError') {
    return 'Permission to access the serial device was denied.';
  }
  if (!('serial' in navigator)) {
    return 'Web Serial API not available. Use Chrome/Edge on desktop.';
  }
  return msg || 'Failed to open serial port.';
}