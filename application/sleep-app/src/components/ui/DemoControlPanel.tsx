'use client';

import { useEffect, useState } from 'react';
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
  FireIcon
} from '@heroicons/react/24/outline';
import { esp32Serial } from '@/lib/esp32-serial';

interface DemoControlPanelProps {
  onHaptic: (type: 'light' | 'medium' | 'heavy') => void;
}

interface DemoCommand {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  command: () => Promise<void>;
}

export function DemoControlPanel({ onHaptic }: DemoControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [commandStatus, setCommandStatus] = useState<'success' | 'error' | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [deviceLog, setDeviceLog] = useState<string[]>([]);

  useEffect(() => {
    // Client-only feature detection
    if (typeof window !== 'undefined') {
      setIsSupported('serial' in navigator);
      setIsSecure((window as any).isSecureContext ?? false);
    }
    // Subscribe to device messages
    const off = esp32Serial.onMessage((line) => {
      setDeviceLog(prev => (prev.length > 200 ? [...prev.slice(-199), line] : [...prev, line]));
    });
    return () => off();
  }, []);

  const connectToESP32 = async () => {
    onHaptic('medium');
    setConnectionStatus('Connecting...');
    try {
      const success = await esp32Serial.connect();
      if (success) {
        setIsConnected(true);
        setConnectionStatus('✅ Connected to ESP32!');
      } else {
        setConnectionStatus('❌ Failed to connect');
      }
    } catch (error: any) {
      setConnectionStatus(`❌ ${error?.message || 'Failed to connect'}`);
    }
  };

  const disconnectFromESP32 = async () => {
    await esp32Serial.disconnect();
    setIsConnected(false);
    setConnectionStatus('Disconnected');
  };

  const executeCommand = async (commandId: string, commandFn: () => Promise<void>) => {
    onHaptic('medium');
    setIsExecuting(commandId);
    setLastCommand(commandId);
    setCommandStatus(null);
    
    try {
      await commandFn();
      setCommandStatus('success');
      setTimeout(() => {
        setIsExecuting(null);
        setCommandStatus(null);
      }, 2000);
    } catch (error) {
      console.error(`Demo command failed:`, error);
      setCommandStatus('error');
      setTimeout(() => {
        setIsExecuting(null);
        setCommandStatus(null);
      }, 2000);
    }
  };

  const demoCommands: DemoCommand[] = [
    {
      id: 'sunrise',
      name: 'Sunrise Demo',
      description: 'Progressive sunrise simulation',
      icon: SunIcon,
      color: 'from-yellow-500 to-orange-500',
      command: async () => {
        const result = await esp32Serial.triggerSunrise();
        console.log('🌅 Sunrise Demo:', result);
      }
    },
    {
      id: 'fast-sunrise',
      name: 'Fast Sunrise',
      description: 'Quick sunrise for demo',
      icon: BoltIcon,
      color: 'from-amber-500 to-yellow-500',
      command: async () => {
        const result = await esp32Serial.sendCommand('FAST_SUNRISE');
        console.log('⚡ Fast Sunrise:', result);
      }
    },
    {
      id: 'sunset',
      name: 'Sunset Demo',
      description: 'Relaxing sunset simulation',
      icon: MoonIcon,
      color: 'from-orange-500 to-red-500',
      command: async () => {
        const result = await esp32Serial.triggerSunset();
        console.log('🌇 Sunset Demo:', result);
      }
    },
    {
      id: 'red-ambient',
      name: 'Red Ambient',
      description: 'Sleep-friendly red light',
      icon: LightBulbIcon,
      color: 'from-red-500 to-red-600',
      command: async () => {
        const result = await esp32Serial.redAmbient();
        console.log('🔴 Red Ambient:', result);
      }
    },
    {
      id: 'blue-calm',
      name: 'Blue Calm',
      description: 'Calming blue atmosphere',
      icon: LightBulbIcon,
      color: 'from-blue-500 to-blue-600',
      command: async () => {
        const result = await esp32Serial.blueCalm();
        console.log('🔵 Blue Calm:', result);
      }
    },
    {
      id: 'rainbow',
      name: 'Rainbow Show',
      description: 'Colorful light display',
      icon: SparklesIcon,
      color: 'from-pink-500 via-purple-500 to-indigo-500',
      command: async () => {
        const result = await esp32Serial.rainbow();
        console.log('🌈 Rainbow Show:', result);
      }
    },
    {
      id: 'night-light',
      name: 'Night Light',
      description: 'Gentle night illumination',
      icon: MoonIcon,
      color: 'from-indigo-500 to-purple-500',
      command: async () => {
        const result = await esp32Serial.nightLight();
        console.log('🌙 Night Light:', result);
      }
    },
    {
      id: 'buzzer-test',
      name: 'Buzzer Test',
      description: 'Test alarm sounds',
      icon: SpeakerWaveIcon,
      color: 'from-green-500 to-emerald-500',
      command: async () => {
        const result = await esp32Serial.buzzerTest();
        console.log('🔊 Buzzer Test:', result);
      }
    },
    {
      id: 'trigger-alarm',
      name: 'Full Alarm',
      description: 'Complete alarm sequence',
      icon: FireIcon,
      color: 'from-orange-500 to-red-500',
      command: async () => {
        const result = await esp32Serial.triggerAlarm();
        console.log('🚨 Full Alarm:', result);
      }
    }
  ];

  return (
    <>
      {/* Floating Demo Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          onHaptic('medium');
          setIsOpen(!isOpen);
        }}
        className={`
          fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg 
          transition-all duration-300 ${isOpen ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}
          hover:shadow-xl active:scale-95
        `}
        style={{
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <XMarkIcon className="h-6 w-6 text-white mx-auto" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <WrenchScrewdriverIcon className="h-6 w-6 text-white mx-auto" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Demo Control Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.8, 
                x: 100, 
                y: 100 
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                x: 0, 
                y: 0 
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8, 
                x: 100, 
                y: 100 
              }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300 
              }}
              className="fixed bottom-24 right-6 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl"
              style={{
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg">ESP32 Demo Controls</h3>
                    <p className="text-slate-400 text-sm">Test hardware features instantly</p>
                  </div>
                  
                  {/* Status Indicator */}
                  {(isExecuting || commandStatus) && (
                    <div className="flex items-center gap-2">
                      {commandStatus === 'success' && (
                        <div className="flex items-center gap-1 text-green-400 text-sm">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          Success
                        </div>
                      )}
                      {commandStatus === 'error' && (
                        <div className="flex items-center gap-1 text-red-400 text-sm">
                          <div className="w-2 h-2 bg-red-400 rounded-full" />
                          Error
                        </div>
                      )}
                      {isExecuting && !commandStatus && (
                        <div className="flex items-center gap-1 text-blue-400 text-sm">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                          Running
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Connection Status */}
                <div className="mt-3 p-2 bg-slate-800/50 rounded-lg">
                  {!isSupported || !isSecure ? (
                    <div className="p-2 mb-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                      <p className="text-yellow-400 text-xs">
                        {(!isSecure) ? 'This page is not in a secure context. Open the app at http://localhost (or HTTPS) in Chrome/Edge.' : 'Web Serial API not available. Use Chrome/Edge on desktop.'}
                      </p>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-sm text-slate-300">
                        {isConnected ? 'ESP32 Connected' : 'Not Connected'}
                      </span>
                    </div>
                    
                    {!isConnected ? (
                      <button
                        onClick={connectToESP32}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30 hover:bg-green-500/30 transition-colors text-sm"
                        disabled={!isSupported || !isSecure}
                      >
                        Connect
                      </button>
                    ) : (
                      <button
                        onClick={disconnectFromESP32}
                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors text-sm"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                  
                  {connectionStatus && (
                    <p className="text-xs text-slate-400 mt-1">{connectionStatus}</p>
                  )}
                </div>
                
                {lastCommand && (
                  <p className="text-slate-500 text-xs mt-1">
                    Last: {lastCommand.replace(/_/g, ' ').toLowerCase()}
                  </p>
                )}
              </div>

              {/* Commands Grid */}
              <div className="p-4 space-y-3">
                {!isConnected && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ Connect to ESP32 first to enable demo commands. Close any serial monitors (e.g., idf.py monitor, Arduino, VS Code Serial Monitor) that may be using the port.
                    </p>
                  </div>
                )}
                
                {demoCommands.map((cmd) => (
                  <motion.button
                    key={cmd.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => executeCommand(cmd.id, cmd.command)}
                    disabled={isExecuting === cmd.id || !isConnected}
                    className={`
                      w-full p-3 rounded-xl border border-slate-600/50 
                      bg-gradient-to-r ${cmd.color} bg-opacity-10
                      hover:bg-opacity-20 transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center gap-3 group
                    `}
                  >
                    <div className={`
                      p-2 rounded-lg bg-gradient-to-r ${cmd.color} 
                      ${isExecuting === cmd.id ? 'animate-pulse' : ''}
                    `}>
                      <cmd.icon className="h-4 w-4 text-white" />
                    </div>
                    
                    <div className="flex-1 text-left">
                      <h4 className="text-white font-medium text-sm">
                        {isExecuting === cmd.id ? 'Executing...' : cmd.name}
                      </h4>
                      <p className="text-slate-400 text-xs">{cmd.description}</p>
                    </div>

                    {isExecuting === cmd.id && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    )}
                  </motion.button>
                ))}

                {/* Emergency Stop */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => executeCommand('stop', async () => {
                    const result = await esp32Serial.stopAlarm();
                    console.log('🛑 Emergency Stop:', result);
                  })}
                  disabled={!isConnected}
                  className="w-full p-4 rounded-xl bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <StopIcon className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-medium">
                    {isExecuting === 'stop' ? 'Stopping...' : 'Emergency Stop'}
                  </span>
                </motion.button>

                {/* Device Console */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 text-sm">Device Console</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeviceLog([])}
                        className="px-2 py-1 text-xs rounded bg-slate-700/60 text-slate-300 border border-slate-600 hover:bg-slate-700"
                      >Clear</button>
                      <button
                        onClick={() => esp32Serial.getStatus()}
                        disabled={!isConnected}
                        className="px-2 py-1 text-xs rounded bg-slate-700/60 text-slate-300 border border-slate-600 hover:bg-slate-700 disabled:opacity-50"
                      >Ping STATUS</button>
                    </div>
                  </div>
                  <div className="h-32 overflow-auto rounded-md bg-black/40 border border-slate-700/50 p-2 text-xs font-mono text-slate-300">
                    {deviceLog.length === 0 ? (
                      <p className="text-slate-500">No messages yet. Connect and run a command.</p>
                    ) : (
                      deviceLog.map((ln, i) => (
                        <div key={i} className="whitespace-pre-wrap">{ln}</div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
                <p className="text-slate-500 text-xs text-center mb-2">
                  Commands sent via USB serial to ESP32-S3
                </p>
                <p className="text-slate-600 text-xs text-center">
                  Requires Chrome/Edge browser • Connect ESP32 via USB
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}