import { useEffect, useRef, useState, useCallback } from 'react';

export interface SensorData {
  light_level: number;
  sound_detected: boolean;
  temperature: number;
  humidity: number;
  timestamp: number;
}

export interface DeviceStatus {
  alarm_enabled: boolean;
  alarm_active: boolean;
  sunrise_active: boolean;
  sunset_active: boolean;
  alarm_frequency: number;
  alarm_volume: number;
  rgb: {
    red: number;
    green: number;
    blue: number;
  };
}

export interface ESP32Message {
  type: 'sensor_data' | 'device_status' | 'command_response' | 'bridge_status' | 'sound_event' | 'device_ready';
  data?: SensorData;
  status?: DeviceStatus;
  command?: string;
  success?: boolean;
  message?: string;
  timestamp?: number;
  connected?: boolean;
  detected?: boolean;
  device?: string;
  version?: string;
  error?: string;
}

export interface ESP32Command {
  command: string;
  [key: string]: any;
}

interface UseESP32Options {
  autoReconnect?: boolean;
  reconnectDelay?: number;
  bridgeUrl?: string;
}

interface ESP32State {
  connected: boolean;
  bridgeConnected: boolean;
  sensorData: SensorData | null;
  deviceStatus: DeviceStatus | null;
  lastMessage: ESP32Message | null;
  error: string | null;
}

export function useESP32({
  autoReconnect = true,
  reconnectDelay = 3000,
  bridgeUrl = 'ws://localhost:3002'
}: UseESP32Options = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState<ESP32State>({
    connected: false,
    bridgeConnected: false,
    sensorData: null,
    deviceStatus: null,
    lastMessage: null,
    error: null
  });

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(bridgeUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔗 Connected to SleepSync bridge');
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          error: null 
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: ESP32Message = JSON.parse(event.data);
          
          setState(prev => {
            const newState = { ...prev, lastMessage: message };
            
            switch (message.type) {
              case 'sensor_data':
                if (message.data) {
                  newState.sensorData = message.data;
                }
                break;
                
              case 'device_status':
                if (message.status) {
                  newState.deviceStatus = message.status;
                }
                break;
                
              case 'bridge_status':
                newState.bridgeConnected = message.connected || false;
                if (message.connected === false && message.error) {
                  newState.error = `Bridge error: ${message.error}`;
                }
                break;
                
              case 'device_ready':
                console.log(`📱 ${message.device} v${message.version} ready`);
                break;
                
              case 'command_response':
                if (!message.success && message.message) {
                  console.warn(`⚠️ Command failed: ${message.message}`);
                }
                break;
                
              case 'sound_event':
                if (message.detected) {
                  console.log('🔊 Sound detected by ESP32');
                }
                break;
            }
            
            return newState;
          });
          
        } catch (error) {
          console.error('❌ Failed to parse message from bridge:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
          connected: false
        }));
      };

      ws.onclose = () => {
        console.log('🔌 Disconnected from bridge');
        setState(prev => ({
          ...prev,
          connected: false,
          bridgeConnected: false
        }));

        // Auto-reconnect
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, reconnectDelay);
        }
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to connect to bridge server',
        connected: false
      }));
    }
  }, [bridgeUrl, autoReconnect, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendCommand = useCallback((command: ESP32Command): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Cannot send command: WebSocket not connected');
      setState(prev => ({
        ...prev,
        error: 'Cannot send command: not connected'
      }));
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify(command));
      console.log(`📤 Sent command: ${command.command}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send command:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to send command'
      }));
      return false;
    }
  }, []);

  // Convenience command functions
  const commands = {
    // Lighting
    startSunrise: () => sendCommand({ command: 'start_sunrise' }),
    startSunset: () => sendCommand({ command: 'start_sunset' }),
    setRGB: (r: number, g: number, b: number) => sendCommand({ command: 'set_rgb', r, g, b }),
    setBrightness: (brightness: number) => sendCommand({ command: 'set_brightness', brightness }),
    
    // Alarms
    startAlarm: () => sendCommand({ command: 'start_alarm' }),
    stopAlarm: () => sendCommand({ command: 'stop_alarm' }),
    enableAlarm: () => sendCommand({ command: 'enable_alarm' }),
    disableAlarm: () => sendCommand({ command: 'disable_alarm' }),
    testBuzzer: (frequency = 1000, volume = 100, duration = 2000) => 
      sendCommand({ command: 'test_buzzer', frequency, volume, duration }),
    
    // System
    getStatus: () => sendCommand({ command: 'get_status' }),
    getSensors: () => sendCommand({ command: 'get_sensors' }),
    stopAll: () => sendCommand({ command: 'stop_all' }),
    reset: () => sendCommand({ command: 'reset' })
  };

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timeout = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [state.error]);

  return {
    ...state,
    connect,
    disconnect,
    sendCommand,
    commands
  };
}