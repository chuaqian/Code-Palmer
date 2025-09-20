'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WrenchScrewdriverIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  SpeakerWaveIcon,
  LightBulbIcon,
  SparklesIcon,
  StopIcon,
  BoltIcon,
  FireIcon,
  WifiIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { esp32Controller } from '@/lib/esp32';

interface ESP32DemoControlProps {
  className?: string;
}

export default function ESP32DemoControl({ className = '' }: ESP32DemoControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(true); // Always connected via local agent
  const [isConnecting, setIsConnecting] = useState(false);

  // No need for useEffect since we're always "connected" via local agent

  const connectToESP32 = async () => {
    // Test connection by sending a status command
    setIsConnecting(true);
    setStatus('running');
    setMessage('Testing connection to local agent...');

    try {
      const response = await esp32Controller.getStatus();
      if (response.success) {
        setIsConnected(true);
        setStatus('success');
        setMessage('Connected to ESP32 via local agent! 🎉');
        // Clear success message after 3 seconds
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 3000);
      } else {
        setStatus('error');
        setMessage('Local agent is not responding. Please check if it\'s running.');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Connection failed');
      console.error('ESP32 connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectESP32 = async () => {
    // For local agent, we don't really "disconnect"
    setIsConnected(true); // Keep as connected since local agent handles it
    setStatus('idle');
    setMessage('');
  };

  const executeDemo = async (command: string, description: string) => {
    if (!isConnected) {
      setStatus('error');
      setMessage('Please connect to ESP32 first');
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
      return;
    }

    setStatus('running');
    setMessage(`Running: ${description}...`);

    try {
      let response;
      
      switch (command) {
        case 'FAST_SUNRISE':
          response = await esp32Controller.fastSunrise();
          break;
        case 'TRIGGER_SUNSET':
          response = await esp32Controller.triggerSunset();
          break;
        case 'RED_AMBIENT':
          response = await esp32Controller.setRedAmbient();
          break;
        case 'BLUE_CALM':
          response = await esp32Controller.setBlueCalm();
          break;
        case 'BUZZER_TEST':
          response = await esp32Controller.testBuzzer();
          break;
        case 'RAINBOW':
          response = await esp32Controller.startRainbow();
          break;
        case 'NIGHT_LIGHT':
          response = await esp32Controller.nightLight();
          break;
        case 'TRIGGER_ALARM':
          response = await esp32Controller.triggerAlarm();
          break;
        case 'STOP_ALARM':
          response = await esp32Controller.stopAlarm();
          break;
        default:
          response = await esp32Controller.sendCommand(command);
      }

      if (response.success) {
        setStatus('success');
        setMessage(`✅ ${description} executed!`);
      } else {
        setStatus('error');
        setMessage(`❌ Failed to execute ${description}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Error: ${description} failed`);
      console.error('Demo execution error:', error);
    }

    // Clear status after 3 seconds
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 3000);
  };

  const demoCommands = [
    {
      id: 'FAST_SUNRISE',
      name: 'Fast Sunrise',
      description: 'Quick sunrise demo (30 sec)',
      icon: SunIcon,
      color: 'from-yellow-500 to-orange-500',
    },
    {
      id: 'TRIGGER_SUNSET',
      name: 'Sunset',
      description: 'Full sunset simulation',
      icon: MoonIcon,
      color: 'from-orange-500 to-purple-600',
    },
    {
      id: 'RED_AMBIENT',
      name: 'Red Ambient',
      description: 'Warm red sleep light',
      icon: FireIcon,
      color: 'from-red-500 to-red-600',
    },
    {
      id: 'BLUE_CALM',
      name: 'Blue Calm',
      description: 'Calming blue light',
      icon: LightBulbIcon,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'BUZZER_TEST',
      name: 'Buzzer Test',
      description: 'Test alarm tones',
      icon: SpeakerWaveIcon,
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'RAINBOW',
      name: 'Rainbow',
      description: 'Rainbow color cycle',
      icon: SparklesIcon,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'NIGHT_LIGHT',
      name: 'Night Light',
      description: 'Gentle night light',
      icon: MoonIcon,
      color: 'from-indigo-500 to-purple-600',
    },
    {
      id: 'TRIGGER_ALARM',
      name: 'Trigger Alarm',
      description: 'Progressive alarm demo',
      icon: BoltIcon,
      color: 'from-yellow-500 to-red-500',
    },
    {
      id: 'STOP_ALARM',
      name: 'Stop All',
      description: 'Stop all effects',
      icon: StopIcon,
      color: 'from-gray-500 to-gray-600',
    },
  ];

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full shadow-xl backdrop-blur-xl
          border border-white/20 transition-all duration-300
          flex items-center justify-center text-white
          ${isConnected 
            ? 'bg-gradient-to-r from-green-500/80 to-emerald-600/80 hover:from-green-600/90 hover:to-emerald-700/90' 
            : 'bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-700/90 hover:to-blue-700/90'
          }
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
            >
              <XMarkIcon className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              className="flex items-center"
            >
              {isConnected ? (
                <LinkIcon className="w-6 h-6" />
              ) : (
                <WrenchScrewdriverIcon className="w-6 h-6" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Demo Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 w-80 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">ESP32 Demo Control</h3>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <motion.button
                      onClick={disconnectESP32}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/30"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Disconnect
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={connectToESP32}
                      disabled={isConnecting}
                      className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm border border-green-500/30 disabled:opacity-50"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </motion.button>
                  )}
                </div>
              </div>
              
              {/* Status Message */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mt-2 p-2 rounded-lg text-sm ${
                      status === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      status === 'running' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}
                  >
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Demo Commands */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {demoCommands.map((cmd) => {
                  const IconComponent = cmd.icon;
                  return (
                    <motion.button
                      key={cmd.id}
                      onClick={() => executeDemo(cmd.id, cmd.description)}
                      disabled={status === 'running' || !isConnected}
                      className={`
                        p-3 rounded-xl border border-white/10 backdrop-blur-sm
                        bg-gradient-to-r ${cmd.color} bg-opacity-20
                        hover:bg-opacity-30 transition-all duration-200
                        flex items-center gap-3 text-left
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <IconComponent className="w-5 h-5 text-white flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">{cmd.name}</div>
                        <div className="text-gray-300 text-xs truncate">{cmd.description}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 bg-black/40">
              <div className="text-gray-400 text-xs text-center">
                {isConnected 
                  ? `🟢 ESP32 Local Agent - Ready for demo!`
                  : '🔵 Click Connect to test local agent'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}