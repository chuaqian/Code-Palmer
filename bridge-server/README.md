# SleepSync Bridge Server

USB Serial to WebSocket bridge for connecting ESP32 to web applications.

## Quick Start

```bash
# Install dependencies
npm install

# Start the bridge server
npm start

# For development (auto-restart)
npm run dev
```

## Endpoints

- **WebSocket**: `ws://localhost:3002` - Real-time bidirectional communication
- **HTTP Health**: `http://localhost:3001/health` - Server status
- **HTTP Status**: `http://localhost:3001/status` - Detailed bridge status
- **HTTP Command**: `POST http://localhost:3001/command` - Send commands via HTTP

## ESP32 Commands

Send JSON commands via WebSocket or HTTP:

### Lighting
```json
{"command": "start_sunrise"}
{"command": "start_sunset"}
{"command": "set_rgb", "r": 255, "g": 100, "b": 50}
{"command": "set_brightness", "brightness": 128}
```

### Alarms
```json
{"command": "start_alarm"}
{"command": "stop_alarm"}
{"command": "enable_alarm"}
{"command": "disable_alarm"}
{"command": "test_buzzer", "frequency": 1000, "volume": 100, "duration": 2000}
```

### System
```json
{"command": "get_status"}
{"command": "get_sensors"}
{"command": "stop_all"}
{"command": "reset"}
```

## ESP32 Responses

The bridge forwards JSON responses from ESP32:

### Sensor Data (every 2 seconds)
```json
{
  "type": "sensor_data",
  "data": {
    "light_level": 2048,
    "sound_detected": false,
    "temperature": 22.5,
    "humidity": 45.0,
    "timestamp": 12345678
  }
}
```

### Device Status
```json
{
  "type": "device_status",
  "status": {
    "alarm_enabled": true,
    "alarm_active": false,
    "sunrise_active": false,
    "sunset_active": false,
    "rgb": {"red": 255, "green": 100, "blue": 50}
  }
}
```

### Command Responses
```json
{
  "type": "command_response",
  "command": "start_sunrise",
  "success": true,
  "message": "Sunrise simulation started",
  "timestamp": 12345678
}
```

## Troubleshooting

1. **ESP32 not detected**: Check USB cable and driver installation
2. **Permission denied**: Run with sudo on Linux/Mac, or check Windows drivers
3. **Port busy**: Close other serial monitors (Arduino IDE, PlatformIO, etc.)
4. **WebSocket connection failed**: Check firewall and port 3002 availability