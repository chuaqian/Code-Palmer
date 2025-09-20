import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;
const WS_PORT = 3002;

app.use(cors());
app.use(express.json());

class SleepSyncBridge {
    constructor() {
        this.serialPort = null;
        this.parser = null;
        this.wss = null;
        this.clients = new Set();
        this.isConnected = false;
        this.lastSensorData = null;
        this.lastDeviceStatus = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 SleepSync Bridge Server Starting...');
        
        // Start WebSocket server
        this.startWebSocketServer();
        
        // Start HTTP server for health checks
        this.startHttpServer();
        
        // Find and connect to ESP32
        await this.connectToESP32();
        
        console.log('✅ Bridge server ready!');
        console.log(`📡 WebSocket: ws://localhost:${WS_PORT}`);
        console.log(`🌐 HTTP: http://localhost:${PORT}`);
    }

    async findESP32Port() {
        const { SerialPort } = await import('serialport');
        const ports = await SerialPort.list();
        
        console.log('🔍 Scanning for ESP32...');
        
        // Common ESP32 identifiers
        const esp32Identifiers = [
            'CP210x',
            'CH340',
            'FT232', 
            'ESP32',
            'USB-SERIAL CH340',
            'Silicon Labs CP210x'
        ];
        
        for (const port of ports) {
            console.log(`  📍 Found: ${port.path} - ${port.manufacturer || 'Unknown'} (${port.vendorId}:${port.productId})`);
            
            const description = (port.manufacturer || '') + ' ' + (port.serialNumber || '');
            
            for (const identifier of esp32Identifiers) {
                if (description.toUpperCase().includes(identifier.toUpperCase())) {
                    console.log(`✅ ESP32 detected at ${port.path}`);
                    return port.path;
                }
            }
        }
        
        // Fallback: try the first available port
        if (ports.length > 0) {
            console.log(`⚠️ No ESP32-specific port found, trying: ${ports[0].path}`);
            return ports[0].path;
        }
        
        return null;
    }

    async connectToESP32() {
        const portPath = await this.findESP32Port();
        
        if (!portPath) {
            console.error('❌ No serial ports found');
            return false;
        }

        try {
            this.serialPort = new SerialPort({
                path: portPath,
                baudRate: 115200,
                autoOpen: false
            });

            this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\\n' }));

            this.serialPort.on('open', () => {
                console.log(`🔌 Connected to ESP32 at ${portPath}`);
                this.isConnected = true;
                this.broadcastToClients({
                    type: 'bridge_status',
                    connected: true,
                    port: portPath,
                    timestamp: Date.now()
                });
            });

            this.serialPort.on('error', (error) => {
                console.error('❌ Serial port error:', error.message);
                this.isConnected = false;
                this.broadcastToClients({
                    type: 'bridge_status',
                    connected: false,
                    error: error.message,
                    timestamp: Date.now()
                });
            });

            this.serialPort.on('close', () => {
                console.log('🔌 Serial port closed');
                this.isConnected = false;
                this.broadcastToClients({
                    type: 'bridge_status',
                    connected: false,
                    timestamp: Date.now()
                });
            });

            // Handle incoming data from ESP32
            this.parser.on('data', (line) => {
                this.handleESP32Data(line.trim());
            });

            // Open the port
            await new Promise((resolve, reject) => {
                this.serialPort.open((error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            return true;

        } catch (error) {
            console.error('❌ Failed to connect to ESP32:', error.message);
            return false;
        }
    }

    handleESP32Data(data) {
        if (!data || data.length === 0) return;
        
        // Skip non-JSON log messages
        if (!data.startsWith('{')) {
            if (data.includes('SLEEPSYNC_ESP32')) {
                console.log(`📟 ESP32: ${data}`);
            }
            return;
        }

        try {
            const json = JSON.parse(data);
            console.log(`📡 ESP32 → WS:`, json.type);
            
            // Store latest data for new clients
            if (json.type === 'sensor_data') {
                this.lastSensorData = json;
            } else if (json.type === 'device_status') {
                this.lastDeviceStatus = json;
            }
            
            // Broadcast to all connected WebSocket clients
            this.broadcastToClients(json);
            
        } catch (error) {
            console.warn('⚠️ Invalid JSON from ESP32:', data);
        }
    }

    startWebSocketServer() {
        this.wss = new WebSocketServer({ port: WS_PORT });

        this.wss.on('connection', (ws, req) => {
            const clientIP = req.socket.remoteAddress;
            console.log(`🔗 WebSocket client connected from ${clientIP}`);
            
            this.clients.add(ws);

            // Send current connection status
            ws.send(JSON.stringify({
                type: 'bridge_status',
                connected: this.isConnected,
                timestamp: Date.now()
            }));

            // Send latest cached data if available
            if (this.lastSensorData) {
                ws.send(JSON.stringify(this.lastSensorData));
            }
            if (this.lastDeviceStatus) {
                ws.send(JSON.stringify(this.lastDeviceStatus));
            }

            // Handle incoming messages from web client
            ws.on('message', (message) => {
                try {
                    const command = JSON.parse(message.toString());
                    console.log(`🌐 WS → ESP32:`, command.command || command.type);
                    this.sendToESP32(command);
                } catch (error) {
                    console.error('❌ Invalid JSON from WebSocket client:', error.message);
                }
            });

            ws.on('close', () => {
                console.log(`🔗 WebSocket client disconnected`);
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error.message);
                this.clients.delete(ws);
            });
        });

        console.log(`🌐 WebSocket server listening on port ${WS_PORT}`);
    }

    startHttpServer() {
        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                esp32_connected: this.isConnected,
                websocket_clients: this.clients.size,
                timestamp: new Date().toISOString()
            });
        });

        // Bridge status endpoint
        app.get('/status', (req, res) => {
            res.json({
                bridge: {
                    connected: this.isConnected,
                    clients: this.clients.size
                },
                last_sensor_data: this.lastSensorData,
                last_device_status: this.lastDeviceStatus,
                timestamp: new Date().toISOString()
            });
        });

        // Send command to ESP32 via HTTP (alternative to WebSocket)
        app.post('/command', (req, res) => {
            try {
                console.log(`🌐 HTTP → ESP32:`, req.body.command || req.body.type);
                this.sendToESP32(req.body);
                res.json({ success: true, message: 'Command sent' });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        app.listen(PORT, () => {
            console.log(`🌐 HTTP server listening on port ${PORT}`);
        });
    }

    sendToESP32(command) {
        if (!this.isConnected || !this.serialPort || !this.serialPort.isOpen) {
            console.warn('⚠️ Cannot send command: ESP32 not connected');
            return false;
        }

        try {
            const jsonCommand = JSON.stringify(command);
            this.serialPort.write(jsonCommand + '\\n');
            return true;
        } catch (error) {
            console.error('❌ Failed to send command to ESP32:', error.message);
            return false;
        }
    }

    broadcastToClients(data) {
        const message = JSON.stringify(data);
        
        this.clients.forEach((ws) => {
            if (ws.readyState === ws.OPEN) {
                ws.send(message);
            } else {
                this.clients.delete(ws);
            }
        });
    }
}

// Start the bridge
new SleepSyncBridge();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\\n🛑 Shutting down bridge server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\\n🛑 Bridge server terminated');
    process.exit(0);
});