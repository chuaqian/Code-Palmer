const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const HTTP_PORT = 3001;
const WS_PORT = 3002;

// Express server for HTTP endpoints
const app = express();
app.use(cors());
app.use(express.json());

// WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

let esp32Port = null;
let esp32Parser = null;
let connectedClients = new Set();

// Command aliases to match ESP32 firmware expectations
// Firmware expects JSON like { "command": "start_sunrise", ... }
const COMMAND_ALIAS = {
    FAST_SUNRISE: { command: 'start_sunrise', fast: true },
    FAST_SUNSET: { command: 'start_sunset', fast: true },
    START_SUNRISE: { command: 'start_sunrise' },
    START_SUNSET: { command: 'start_sunset' },
};

function normalizeToJsonMessage(input, payload) {
    // If already an object, merge and stringify
    if (typeof input === 'object' && input !== null) {
        const obj = { ...input, ...(payload && typeof payload === 'object' ? payload : {}) };
        return JSON.stringify(obj);
    }

    // If a JSON string is provided, pass through
    if (typeof input === 'string' && input.trim().startsWith('{')) {
        return input.trim();
    }

    // Map aliases (e.g., FAST_SUNRISE) to firmware JSON commands
    if (typeof input === 'string') {
        const key = input.trim().toUpperCase();
        const mapped = COMMAND_ALIAS[key];
        if (mapped) {
            const obj = { ...mapped, ...(payload && typeof payload === 'object' ? payload : {}) };
            return JSON.stringify(obj);
        }

        // Fallback: convert to lowercase command name
        // e.g., 'START_SUNRISE' -> { command: 'start_sunrise' }
        const fallback = input.trim().toLowerCase();
        return JSON.stringify({ command: fallback, ...(payload && typeof payload === 'object' ? payload : {}) });
    }

    // Last resort
    return JSON.stringify({ command: 'noop' });
}

// Auto-detect ESP32 device
async function findESP32() {
    try {
        const ports = await SerialPort.list();
        console.log('📡 Scanning for ESP32 devices...');
        
        // Look for ESP32 patterns in port descriptions
        const esp32Patterns = [
            /USB-SERIAL/i,
            /ESP32/i,
            /CP210/i,
            /CH340/i,
            /FTDI/i,
            /Silicon Labs/i
        ];
        
        for (const port of ports) {
            const description = port.manufacturer || port.friendlyName || '';
            const isESP32 = esp32Patterns.some(pattern => pattern.test(description));
            
            if (isESP32) {
                console.log(`🎯 Found potential ESP32 at ${port.path}: ${description}`);
                return port.path;
            }
        }
        
        // Fallback: try common ESP32 ports
        const commonPorts = ['COM3', 'COM4', 'COM5', '/dev/ttyUSB0', '/dev/ttyACM0'];
        for (const portPath of commonPorts) {
            const exists = ports.find(p => p.path === portPath);
            if (exists) {
                console.log(`🔄 Trying fallback port: ${portPath}`);
                return portPath;
            }
        }
        
        throw new Error('No ESP32 device found');
    } catch (error) {
        console.error('❌ Error finding ESP32:', error.message);
        return null;
    }
}

// Connect to ESP32
async function connectESP32() {
    try {
        const portPath = await findESP32();
        if (!portPath) return false;

        esp32Port = new SerialPort({
            path: portPath,
            baudRate: 115200,
            autoOpen: false
        });

    esp32Parser = esp32Port.pipe(new ReadlineParser({ delimiter: '\n' }));

        return new Promise((resolve) => {
            esp32Port.open((err) => {
                if (err) {
                    console.error('❌ Failed to open ESP32 port:', err.message);
                    resolve(false);
                    return;
                }

                console.log(`✅ ESP32 connected on ${portPath}`);

                // Handle incoming data from ESP32
                // Accumulate pretty-printed JSON from multiple lines
                let jsonBuffer = '';
                let braceDepth = 0;
                esp32Parser.on('data', (data) => {
                    const line = data.toString();
                    const trimmed = line.trimEnd();

                    // Naive brace depth tracking to reconstruct multi-line JSON
                    const opens = (trimmed.match(/[\{\[]/g) || []).length;
                    const closes = (trimmed.match(/[\}\]]/g) || []).length;

                    if (braceDepth > 0 || trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        if (!jsonBuffer) jsonBuffer = '';
                        jsonBuffer += (jsonBuffer ? '\n' : '') + trimmed;
                        braceDepth += opens - closes;

                        if (braceDepth <= 0) {
                            const full = jsonBuffer.trim();
                            jsonBuffer = '';
                            braceDepth = 0;
                            try {
                                const obj = JSON.parse(full);
                                console.log('📨 ESP32 →', JSON.stringify(obj));
                                broadcastToClients(JSON.stringify(obj));
                            } catch (e) {
                                console.log('📨 ESP32 →', full);
                                broadcastToClients(full);
                            }
                        }
                        return;
                    }

                    if (trimmed) {
                        console.log('📨 ESP32 →', trimmed);
                        broadcastToClients(trimmed);
                    }
                });

                esp32Port.on('error', (err) => {
                    console.error('❌ ESP32 port error:', err.message);
                    reconnectESP32();
                });

                esp32Port.on('close', () => {
                    console.log('🔌 ESP32 disconnected');
                    reconnectESP32();
                });

                resolve(true);
            });
        });
    } catch (error) {
        console.error('❌ ESP32 connection error:', error.message);
        return false;
    }
}

// Reconnect with delay
function reconnectESP32() {
    if (esp32Port) {
        esp32Port = null;
        esp32Parser = null;
    }
    
    console.log('🔄 Reconnecting in 3 seconds...');
    setTimeout(connectESP32, 3000);
}

// Send command to ESP32
async function ensureESP32Connected() {
    if (esp32Port && esp32Port.isOpen) return true;
    console.log('ℹ️ Ensuring ESP32 connection...');
    return await connectESP32();
}

async function sendToESP32(command, payload) {
    const connected = await ensureESP32Connected();
    if (!connected) {
        console.log('⚠️ ESP32 not connected');
        return false;
    }

    const jsonMessage = normalizeToJsonMessage(command, payload);
    const message = jsonMessage + '\n';

    return new Promise((resolve) => {
        esp32Port.write(message, (err) => {
            if (err) {
                console.error('❌ Write failed:', err.message);
                resolve(false);
                return;
            }
            esp32Port.drain((drainErr) => {
                if (drainErr) {
                    console.error('❌ Drain failed:', drainErr.message);
                    resolve(false);
                    return;
                }
                console.log('📤 → ESP32:', jsonMessage);
                resolve(true);
            });
        });
    });
}

// Broadcast to all WebSocket clients
function broadcastToClients(message) {
    connectedClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🌐 New WebSocket client connected');
    connectedClients.add(ws);

    // Send connection status
    ws.send(JSON.stringify({
        type: 'connection_status',
        esp32_connected: esp32Port && esp32Port.isOpen,
        timestamp: new Date().toISOString()
    }));

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📥 WebSocket →', data);
            
            // Accept either { command, payload } or { type, payload }
            const command = data.command || data.type;
            if (command) {
                const success = await sendToESP32(command, data.payload);
                ws.send(JSON.stringify({
                    type: 'command_response',
                    success,
                    command,
                    timestamp: new Date().toISOString()
                }));
            }
        } catch (error) {
            console.error('❌ Invalid WebSocket message:', error.message);
        }
    });

    ws.on('close', () => {
        console.log('🌐 WebSocket client disconnected');
        connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        connectedClients.delete(ws);
    });
});

// HTTP Endpoints
app.get('/status', (req, res) => {
    res.json({
        esp32_connected: esp32Port && esp32Port.isOpen,
        websocket_clients: connectedClients.size,
        timestamp: new Date().toISOString()
    });
});

app.post('/command', async (req, res) => {
    const { command, payload } = req.body || {};
    if (!command) {
        return res.status(400).json({ error: 'Command required' });
    }

    const success = await sendToESP32(command, payload);
    res.json({
        success,
        command,
        timestamp: new Date().toISOString()
    });
});

// Compatibility endpoint seen in client logs: POST /api/esp32
// Accepts { type: 'FAST_SUNRISE' | 'START_SUNRISE' | ... , payload?: {} }
app.post('/api/esp32', async (req, res) => {
    const { type, command, payload } = req.body || {};
    const cmd = command || type;
    if (!cmd) return res.status(400).json({ error: 'type or command is required' });

    const success = await sendToESP32(cmd, payload);
    res.json({ success, command: cmd, timestamp: new Date().toISOString() });
});

app.get('/ports', async (req, res) => {
    try {
        const ports = await SerialPort.list();
        res.json(ports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start servers
app.listen(HTTP_PORT, () => {
    console.log(`🌐 HTTP server running on http://localhost:${HTTP_PORT}`);
});

console.log(`🔌 WebSocket server running on ws://localhost:${WS_PORT}`);
console.log('🚀 SleepSync Bridge Server Started');

// Initial ESP32 connection
connectESP32();