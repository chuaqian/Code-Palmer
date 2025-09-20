# SleepSync Bridge Server

USB Serial to WebSocket bridge for ESP32 communication.

## Setup

```bash
npm install
npm start
```

## Endpoints

- **WebSocket**: `ws://localhost:3002` - Real-time ESP32 communication
- **HTTP Status**: `GET http://localhost:3001/status` - Connection status
- **Send Command**: `POST http://localhost:3001/command` - Send command to ESP32
- **List Ports**: `GET http://localhost:3001/ports` - Available serial ports

## Auto-Detection

The server automatically detects ESP32 devices by scanning for:
- USB-SERIAL devices
- ESP32 keywords
- Common ESP32 chip manufacturers (CP210x, CH340, etc.)

## Protocol

**WebSocket Messages:**
```json
// Send command to ESP32
{"command": "get_status"}

// Receive from ESP32
{"type": "sensor_data", "light_level": 123, ...}
```