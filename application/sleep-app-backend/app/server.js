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

// Utility functions
function logError(context, error) {
    console.error(`❌ ${context}:`, error.message);
}

function logInfo(message) {
    console.log(`ℹ️ ${message}`);
}

function logSuccess(message) {
    console.log(`✅ ${message}`);
}

function createTimestamp() {
    return new Date().toISOString();
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
        
        throw new Error('No ESP32 device found');
    } catch (error) {
        logError('Error finding ESP32', error);
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
                    logError('Failed to open ESP32 port', err);
                    resolve(false);
                    return;
                }

                logSuccess(`ESP32 connected on ${portPath}`);

                // Handle incoming data from ESP32
                setupESP32DataHandlers();

                esp32Port.on('error', (err) => {
                    logError('ESP32 port error', err);
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
        logError('ESP32 connection error', error);
        return false;
    }
}

// Setup ESP32 data parsing handlers
function setupESP32DataHandlers() {
    let jsonBuffer = '';
    let braceDepth = 0;
    
    esp32Parser.on('data', (data) => {
        const line = data.toString();
        const trimmed = line.trimEnd();

        // Track brace depth to reconstruct multi-line JSON
        const opens = (trimmed.match(/[\{\[]/g) || []).length;
        const closes = (trimmed.match(/[\}\]]/g) || []).length;

        if (braceDepth > 0 || trimmed.startsWith('{') || trimmed.startsWith('[')) {
            jsonBuffer += (jsonBuffer ? '\n' : '') + trimmed;
            braceDepth += opens - closes;

            if (braceDepth <= 0) {
                processESP32Message(jsonBuffer.trim());
                jsonBuffer = '';
                braceDepth = 0;
            }
            return;
        }

        if (trimmed) {
            processESP32Message(trimmed);
        }
    });
}

// Process and broadcast ESP32 messages
function processESP32Message(message) {
    try {
        const obj = JSON.parse(message);
        console.log('📨 ESP32 →', JSON.stringify(obj));
        broadcastToClients(JSON.stringify(obj));
    } catch (e) {
        console.log('📨 ESP32 →', message);
        broadcastToClients(message);
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

// Normalize command and payload to JSON message format
// IMPORTANT: The ESP32 firmware expects a JSON object with a `command` field
// Optionally include a `data` field for arguments. Do NOT rename to `type`/`payload`.
function normalizeToJsonMessage(command, data) {
    const msg = { command };
    if (data !== undefined) msg.data = data;
    return JSON.stringify(msg);
}

// Send command to ESP32
async function ensureESP32Connected() {
    if (esp32Port && esp32Port.isOpen) return true;
    logInfo('Ensuring ESP32 connection...');
    return await connectESP32();
}

async function sendToESP32(command, data) {
    const connected = await ensureESP32Connected();
    if (!connected) {
        console.log('⚠️ ESP32 not connected');
        return false;
    }

    const jsonMessage = normalizeToJsonMessage(command, data);
    const message = jsonMessage + '\n';

    return new Promise((resolve) => {
        esp32Port.write(message, (err) => {
            if (err) {
                logError('Write failed', err);
                resolve(false);
                return;
            }
            esp32Port.drain((drainErr) => {
                if (drainErr) {
                    logError('Drain failed', drainErr);
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
        timestamp: createTimestamp()
    }));

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📥 WebSocket →', data);
            
            // Accept either { command, payload } or { type, payload }
            const command = data.command || data.type;
            const payloadOrData = (data.payload !== undefined) ? data.payload : data.data;
            if (command) {
                const success = await sendToESP32(command, payloadOrData);
                ws.send(JSON.stringify({
                    type: 'command_response',
                    success,
                    command,
                    timestamp: createTimestamp()
                }));
            }
        } catch (error) {
            logError('Invalid WebSocket message', error);
        }
    });

    ws.on('close', () => {
        console.log('🌐 WebSocket client disconnected');
        connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
        logError('WebSocket error', error);
        connectedClients.delete(ws);
    });
});

// Shared handler for ESP32 commands
async function handleESP32Command(req, res) {
    const { command, type, payload, data } = req.body || {};
    const cmd = command || type;
    const payloadOrData = (payload !== undefined) ? payload : data;
    
    if (!cmd) {
        return res.status(400).json({ 
            error: 'Command or type is required' 
        });
    }

    const success = await sendToESP32(cmd, payloadOrData);
    res.json({
        success,
        command: cmd,
        timestamp: createTimestamp()
    });
}

// HTTP Endpoints
app.get('/status', (req, res) => {
    res.json({
        esp32_connected: esp32Port && esp32Port.isOpen,
        websocket_clients: connectedClients.size,
        timestamp: createTimestamp()
    });
});

// Unified ESP32 command endpoints
app.post('/command', handleESP32Command);
app.post('/api/esp32', handleESP32Command);

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