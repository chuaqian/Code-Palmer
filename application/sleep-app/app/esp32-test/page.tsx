'use client';

import React, { useState } from 'react';
import { esp32Serial, isWebSerialSupported } from '@/lib/esp32-serial';

export default function ESP32SerialTest() {
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [response, setResponse] = useState('');

  const connect = async () => {
    setStatus('Connecting...');
    try {
      const success = await esp32Serial.connect();
      if (success) {
        setIsConnected(true);
        setStatus('✅ Connected to ESP32!');
      } else {
        setStatus('❌ Failed to connect');
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const sendTestCommand = async (command: string) => {
    setStatus(`Sending: ${command}`);
    try {
      const success = await esp32Serial.sendCommand(command);
      if (success) {
        setStatus(`✅ Sent: ${command}`);
        
        // Try to read response
        setTimeout(async () => {
          const resp = await esp32Serial.readResponse();
          if (resp) {
            setResponse(prev => prev + `\n${resp}`);
          }
        }, 100);
      } else {
        setStatus(`❌ Failed to send: ${command}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const disconnect = async () => {
    await esp32Serial.disconnect();
    setIsConnected(false);
    setStatus('Disconnected');
    setResponse('');
  };

  if (!isWebSerialSupported()) {
    return (
      <div className="p-8 bg-red-500/20 border border-red-500/30 rounded-lg">
        <h2 className="text-xl font-bold text-red-400 mb-4">Web Serial Not Supported</h2>
        <p className="text-red-300">
          Please use Chrome or Edge browser to test Web Serial API.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">ESP32 Serial Test</h2>
      
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="p-4 bg-white/5 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Connection Status</h3>
          <p className={`text-sm ${isConnected ? 'text-green-400' : 'text-gray-400'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Not Connected'}
          </p>
          <p className="text-sm text-gray-300 mt-1">{status}</p>
        </div>

        {/* Connect/Disconnect */}
        <div className="flex gap-4">
          {!isConnected ? (
            <button
              onClick={connect}
              className="px-6 py-3 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-colors"
            >
              Connect to ESP32
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-6 py-3 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Test Commands */}
        {isConnected && (
          <div className="p-4 bg-white/5 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Test Commands</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendTestCommand('STATUS')}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
              >
                STATUS
              </button>
              <button
                onClick={() => sendTestCommand('HELP')}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
              >
                HELP
              </button>
              <button
                onClick={() => sendTestCommand('RED_AMBIENT')}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors"
              >
                RED_AMBIENT
              </button>
              <button
                onClick={() => sendTestCommand('BLUE_CALM')}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
              >
                BLUE_CALM
              </button>
              <button
                onClick={() => sendTestCommand('FAST_SUNRISE')}
                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors"
              >
                FAST_SUNRISE
              </button>
              <button
                onClick={() => sendTestCommand('BUZZER_TEST')}
                className="px-4 py-2 bg-green-500/20 text-green-400 rounded border border-green-500/30 hover:bg-green-500/30 transition-colors"
              >
                BUZZER_TEST
              </button>
              <button
                onClick={() => sendTestCommand('RAINBOW')}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
              >
                RAINBOW
              </button>
              <button
                onClick={() => sendTestCommand('STOP_ALARM')}
                className="px-4 py-2 bg-gray-500/20 text-gray-400 rounded border border-gray-500/30 hover:bg-gray-500/30 transition-colors"
              >
                STOP_ALARM
              </button>
            </div>
          </div>
        )}

        {/* Response Log */}
        {response && (
          <div className="p-4 bg-white/5 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">ESP32 Responses</h3>
            <pre className="text-xs text-gray-300 bg-black/40 p-3 rounded overflow-x-auto">
              {response}
            </pre>
            <button
              onClick={() => setResponse('')}
              className="mt-2 px-3 py-1 bg-gray-500/20 text-gray-400 rounded text-sm border border-gray-500/30"
            >
              Clear
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">Instructions</h3>
          <ol className="text-sm text-blue-300 space-y-1">
            <li>1. Make sure ESP32 is connected via USB</li>
            <li>2. Click "Connect to ESP32"</li>
            <li>3. Select your ESP32 port (usually COM3, COM4, etc.)</li>
            <li>4. Test commands and watch for LED/buzzer responses</li>
            <li>5. Check browser console for detailed logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}