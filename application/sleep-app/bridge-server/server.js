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
                esp32Parser.on('data', (data) => {
                    const message = data.trim();
                    if (message) {
                        console.log('📨 ESP32 →', message);
                        broadcastToClients(message);
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
function sendToESP32(command) {
    if (esp32Port && esp32Port.isOpen) {
        const message = command + '\n';
        esp32Port.write(message);
        console.log('📤 → ESP32:', command);
        return true;
    } else {
        console.log('⚠️ ESP32 not connected');
        return false;
    }
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

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📥 WebSocket →', data);
            
            if (data.command) {
                const success = sendToESP32(data.command);
                ws.send(JSON.stringify({
                    type: 'command_response',
                    success,
                    command: data.command,
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

app.post('/command', (req, res) => {
    const { command } = req.body;
    if (!command) {
        return res.status(400).json({ error: 'Command required' });
    }

    const success = sendToESP32(command);
    res.json({
        success,
        command,
        timestamp: new Date().toISOString()
    });
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