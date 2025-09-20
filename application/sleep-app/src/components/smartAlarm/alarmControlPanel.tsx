'use client';

import { useState, type ComponentType, type SVGProps } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, X, Sun, Moon, Volume2, Sparkles, StopCircle, Flame } from 'lucide-react';
import { esp32Controller } from '@/src/lib/esp32';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '@/src/components/ui/card';

interface AlarmControlPanelProps {
  onHaptic: (type: 'light' | 'medium' | 'heavy') => void;
}

interface AlarmCommand {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  command: () => Promise<void>;
}

export function AlarmControlPanel({ onHaptic }: AlarmControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [commandStatus, setCommandStatus] = useState<'success' | 'error' | null>(null);
  const [isConnected, setIsConnected] = useState(true); // Assume local agent available by default
  const [connectionStatus, setConnectionStatus] = useState('Local Agent Ready');
  const [deviceLog, setDeviceLog] = useState<string[]>([]);

  const connectToESP32 = async () => {
    onHaptic('medium');
    setConnectionStatus('Testing local agent...');
    try {
      const result = await esp32Controller.getStatus();
      if (result.success) {
        setIsConnected(true);
        setConnectionStatus('✅ Connected via Local Agent!');
        setDeviceLog(prev => [...prev, `✅ Local agent connection verified`]);
      } else {
        setConnectionStatus('❌ Local agent not responding');
        setDeviceLog(prev => [...prev, `❌ Local agent error: ${result.error}`]);
      }
    } catch (error: any) {
      setConnectionStatus(`❌ ${error?.message || 'Local agent unavailable'}`);
      setDeviceLog(prev => [...prev, `❌ Connection error: ${error?.message}`]);
    }
  };

  const disconnectFromESP32 = async () => {
    // For local agent, we don't really disconnect
    setIsConnected(true);
    setConnectionStatus('Local Agent Ready');
    setDeviceLog(prev => [...prev, `ℹ️ Local agent always available`]);
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
      console.error(`alarm command failed:`, error);
      setCommandStatus('error');
      setTimeout(() => {
        setIsExecuting(null);
        setCommandStatus(null);
      }, 2000);
    }
  };

  const alarmCommands: AlarmCommand[] = [
    {
      id: 'sunrise',
      name: 'Sunrise alarm',
      description: 'Progressive sunrise simulation',
      icon: Sun,
      color: 'from-yellow-500 to-orange-500',
      command: async () => {
        const result = await esp32Controller.triggerSunrise();
        console.log('🌅 Sunrise Demo:', result);
        setDeviceLog(prev => [...prev, `🌅 Sunrise: ${result.success ? 'Started' : result.error}`]);
      }
    },
    {
      id: 'sunset',
      name: 'Sunset Demo',
      description: 'Relaxing sunset simulation',
      icon: Moon,
      color: 'from-orange-500 to-red-500',
      command: async () => {
        const result = await esp32Controller.triggerSunset();
        console.log('🌇 Sunset Demo:', result);
        setDeviceLog(prev => [...prev, `🌇 Sunset: ${result.success ? 'Started' : result.error}`]);
      }
    },
    {
      id: 'rainbow',
      name: 'Rainbow Show',
      description: 'Colorful light display',
      icon: Sparkles,
      color: 'from-pink-500 via-purple-500 to-indigo-500',
      command: async () => {
        const result = await esp32Controller.startRainbow();
        console.log('🌈 Rainbow Show:', result);
        setDeviceLog(prev => [...prev, `🌈 Rainbow: ${result.success ? 'Started' : result.error}`]);
      }
    },
    {
      id: 'night-light',
      name: 'Night Light',
      description: 'Gentle night illumination',
      icon: Moon,
      color: 'from-indigo-500 to-purple-500',
      command: async () => {
        const result = await esp32Controller.nightLight();
        console.log('🌙 Night Light:', result);
        setDeviceLog(prev => [...prev, `🌙 Night Light: ${result.success ? 'Activated' : result.error}`]);
      }
    },
    {
      id: 'buzzer-test',
      name: 'Buzzer Test',
      description: 'Test alarm sounds',
      icon: Volume2,
      color: 'from-green-500 to-emerald-500',
      command: async () => {
        const result = await esp32Controller.testBuzzer();
        console.log('🔊 Buzzer Test:', result);
        setDeviceLog(prev => [...prev, `🔊 Buzzer: ${result.success ? 'Testing' : result.error}`]);
      }
    },
    {
      id: 'trigger-alarm',
      name: 'Full Alarm',
      description: 'Complete alarm sequence',
      icon: Flame,
      color: 'from-orange-500 to-red-500',
      command: async () => {
        const result = await esp32Controller.triggerAlarm();
        console.log('🚨 Full Alarm:', result);
        setDeviceLog(prev => [...prev, `🚨 Alarm: ${result.success ? 'Triggered' : result.error}`]);
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
              <X className="h-6 w-6 text-white mx-auto" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Wrench className="h-6 w-6 text-white mx-auto" />
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
              initial={{ opacity: 0, scale: 0.9, x: 80, y: 80 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 80, y: 80 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-24 right-6 z-50 w-80 max-h-[70vh] overflow-y-auto"
            >
              <Card className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white text-lg">ESP32 Alarm Controls</CardTitle>
                  <CardDescription>Test hardware features instantly</CardDescription>
                  {(isExecuting || commandStatus) && (
                    <CardAction>
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
                    </CardAction>
                  )}
                </CardHeader>

                <CardContent>
                  {/* Connection Status */}
                  <div className="mt-3 p-2 bg-slate-800/50 rounded-lg">
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
                    <p className="text-slate-500 text-xs mt-2">
                      Last: {lastCommand.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  )}

                  {/* Commands Grid */}
                  <div className="mt-4 space-y-3">
                    {!isConnected && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-yellow-400 text-sm">
                          ⚠️ Connect to ESP32 first to enable demo commands. Close any serial monitors (e.g., idf.py monitor, Arduino, VS Code Serial Monitor) that may be using the port.
                        </p>
                      </div>
                    )}

                    {alarmCommands.map((cmd) => (
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
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                        )}
                      </motion.button>
                    ))}

                    {/* Emergency Stop */}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => executeCommand('stop', async () => {
                        const result = await esp32Controller.stopAlarm();
                        console.log('🛑 Emergency Stop:', result);
                        setDeviceLog(prev => [...prev, `🛑 Stop: ${result.success ? 'All stopped' : result.error}`]);
                      })}
                      disabled={!isConnected}
                      className="w-full p-4 rounded-xl bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <StopCircle className="h-5 w-5 text-red-400" />
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
                            onClick={async () => {
                              const result = await esp32Controller.getStatus();
                              setDeviceLog(prev => [...prev, `📊 Status: ${result.success ? (result.message || 'OK') : result.error}`]);
                            }}
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
                </CardContent>

                <CardFooter className="border-t border-slate-700/50 bg-slate-800/30">
                  <div className="w-full py-3">
                    <p className="text-slate-500 text-xs text-center mb-1">
                      Commands sent via USB serial to ESP32-S3
                    </p>
                    <p className="text-slate-600 text-xs text-center">
                      Requires Chrome/Edge browser • Connect ESP32 via USB
                    </p>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Backwards-compatible export name (if referenced elsewhere)
export { AlarmControlPanel as alarmControlPanel };
