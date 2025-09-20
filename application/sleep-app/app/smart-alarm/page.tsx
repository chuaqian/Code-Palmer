'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClockIcon, 
  SunIcon, 
  MoonIcon, 
  SpeakerWaveIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon,
  ChevronRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { TimePickerWheel } from '@/components/ui/TimePickerWheel';
import { SleepCycleVisualization } from '@/components/ui/SleepCycleVisualization';
import { AudioCustomization } from '@/components/ui/AudioCustomization';
import { SmartAlarmCard } from '@/components/ui/SmartAlarmCard';
import { DemoControlPanel } from '@/components/ui/DemoControlPanel';

interface AlarmConfig {
  bedtime: { hour: number; minute: number };
  wakeTime: { hour: number; minute: number };
  snoozeDuration: number;
  adaptiveWakeEnabled: boolean;
  adaptiveWindowMinutes: number;
  alarmVolume: number;
  lightIntensity: number;
  sunriseEnabled: boolean;
  sunsetEnabled: boolean;
  presetToneId: number;
  customToneName: string;
  alarmEnabled: boolean;
}

const defaultConfig: AlarmConfig = {
  bedtime: { hour: 22, minute: 30 },
  wakeTime: { hour: 7, minute: 0 },
  snoozeDuration: 9,
  adaptiveWakeEnabled: true,
  adaptiveWindowMinutes: 30,
  alarmVolume: 70,
  lightIntensity: 80,
  sunriseEnabled: true,
  sunsetEnabled: true,
  presetToneId: 1,
  customToneName: '',
  alarmEnabled: false
};

export default function SmartAlarmPage() {
  const [config, setConfig] = useState<AlarmConfig>(defaultConfig);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showCycleRecommendation, setShowCycleRecommendation] = useState(false);

  // Apple-style haptic feedback simulation
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      };
      navigator.vibrate(patterns[type]);
    }
  };

  // Calculate sleep cycles (90-minute intervals)
  const calculateOptimalTimes = (time: { hour: number; minute: number }, isWakeTime: boolean) => {
    const sleepCycleDuration = 90; // minutes
    const fallAsleepTime = 15; // minutes to fall asleep
    
    let totalMinutes = time.hour * 60 + time.minute;
    
    if (isWakeTime) {
      // Calculate optimal bedtimes for this wake time
      const optimalBedtimes = [];
      for (let cycles = 4; cycles <= 6; cycles++) {
        let bedtime = totalMinutes - (cycles * sleepCycleDuration + fallAsleepTime);
        if (bedtime < 0) bedtime += 24 * 60; // Handle day wrap
        
        optimalBedtimes.push({
          hour: Math.floor(bedtime / 60),
          minute: bedtime % 60,
          cycles,
          totalSleep: cycles * 1.5
        });
      }
      return optimalBedtimes;
    } else {
      // Calculate optimal wake times for this bedtime
      const optimalWakeTimes = [];
      for (let cycles = 4; cycles <= 6; cycles++) {
        let wakeTime = totalMinutes + fallAsleepTime + (cycles * sleepCycleDuration);
        if (wakeTime >= 24 * 60) wakeTime -= 24 * 60; // Handle day wrap
        
        optimalWakeTimes.push({
          hour: Math.floor(wakeTime / 60),
          minute: wakeTime % 60,
          cycles,
          totalSleep: cycles * 1.5
        });
      }
      return optimalWakeTimes;
    }
  };

  const connectToDevice = async () => {
    setIsConnecting(true);
    triggerHaptic('medium');
    
    try {
      // Demo mode simulation - no actual network connection needed
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful demo connection
      setIsConnected(true);
      triggerHaptic('heavy');
      
      // In demo mode, settings are just for UI demonstration
      console.log('Demo mode: Configuration would be sent via USB serial:', config);
      
    } catch (error) {
      console.error('Demo connection simulation failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleAlarm = () => {
    triggerHaptic('medium');
    setConfig(prev => ({ ...prev, alarmEnabled: !prev.alarmEnabled }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl"></div>
        <div className="relative px-6 pt-16 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <SparklesIcon className="h-8 w-8 text-purple-400" />
              <h1 className="text-3xl font-light text-white">Smart Alarm</h1>
            </div>
            <p className="text-slate-300 text-lg font-light">
              Gentle wake-up experience with natural light simulation
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-8 space-y-6">
        {/* Master Switch */}
        <SmartAlarmCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${config.alarmEnabled ? 'bg-green-500/20' : 'bg-slate-500/20'}`}>
                <ClockIcon className={`h-6 w-6 ${config.alarmEnabled ? 'text-green-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Smart Alarm</h3>
                <p className="text-slate-400 text-sm">
                  {config.alarmEnabled ? 'Active' : 'Disabled'}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleAlarm}
              className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${
                config.alarmEnabled ? 'bg-green-500' : 'bg-slate-600'
              }`}
            >
              <motion.div
                animate={{ x: config.alarmEnabled ? 32 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
              />
            </motion.button>
          </div>
        </SmartAlarmCard>

        {/* Time Settings */}
        <AnimatePresence>
          {config.alarmEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Bedtime */}
              <SmartAlarmCard>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveSection(activeSection === 'bedtime' ? null : 'bedtime')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-orange-500/20">
                      <MoonIcon className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Bedtime</h3>
                      <p className="text-slate-400 text-sm">
                        {String(config.bedtime.hour).padStart(2, '0')}:
                        {String(config.bedtime.minute).padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon 
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      activeSection === 'bedtime' ? 'rotate-90' : ''
                    }`} 
                  />
                </motion.button>
                
                <AnimatePresence>
                  {activeSection === 'bedtime' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-6 border-t border-slate-700"
                    >
                      <TimePickerWheel
                        time={config.bedtime}
                        onChange={(time) => {
                          triggerHaptic('light');
                          setConfig(prev => ({ ...prev, bedtime: time }));
                        }}
                      />
                      <button
                        onClick={() => setShowCycleRecommendation(true)}
                        className="mt-4 w-full text-center text-purple-400 text-sm font-medium"
                      >
                        💡 Show sleep cycle recommendations
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SmartAlarmCard>

              {/* Wake Time */}
              <SmartAlarmCard>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveSection(activeSection === 'wake' ? null : 'wake')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-yellow-500/20">
                      <SunIcon className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Wake Time</h3>
                      <p className="text-slate-400 text-sm">
                        {String(config.wakeTime.hour).padStart(2, '0')}:
                        {String(config.wakeTime.minute).padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon 
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      activeSection === 'wake' ? 'rotate-90' : ''
                    }`} 
                  />
                </motion.button>
                
                <AnimatePresence>
                  {activeSection === 'wake' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-6 border-t border-slate-700"
                    >
                      <TimePickerWheel
                        time={config.wakeTime}
                        onChange={(time) => {
                          triggerHaptic('light');
                          setConfig(prev => ({ ...prev, wakeTime: time }));
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </SmartAlarmCard>

              {/* Audio Customization */}
              <SmartAlarmCard>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveSection(activeSection === 'audio' ? null : 'audio')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-500/20">
                      <SpeakerWaveIcon className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Alarm Sound</h3>
                      <p className="text-slate-400 text-sm">
                        Progressive • Volume {config.alarmVolume}%
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon 
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      activeSection === 'audio' ? 'rotate-90' : ''
                    }`} 
                  />
                </motion.button>
                
                <AnimatePresence>
                  {activeSection === 'audio' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-6 border-t border-slate-700"
                    >
                      <AudioCustomization
                        config={config}
                        onChange={(newConfig) => setConfig(newConfig)}
                        onHaptic={triggerHaptic}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </SmartAlarmCard>

              {/* Advanced Settings */}
              <SmartAlarmCard>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveSection(activeSection === 'advanced' ? null : 'advanced')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/20">
                      <AdjustmentsHorizontalIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Advanced</h3>
                      <p className="text-slate-400 text-sm">
                        Light simulation • Smart wake
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon 
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      activeSection === 'advanced' ? 'rotate-90' : ''
                    }`} 
                  />
                </motion.button>
                
                <AnimatePresence>
                  {activeSection === 'advanced' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-6 border-t border-slate-700 space-y-6"
                    >
                      {/* Smart Wake */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-white font-medium">Smart Wake Window</label>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              triggerHaptic('light');
                              setConfig(prev => ({ 
                                ...prev, 
                                adaptiveWakeEnabled: !prev.adaptiveWakeEnabled 
                              }));
                            }}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              config.adaptiveWakeEnabled ? 'bg-green-500' : 'bg-slate-600'
                            }`}
                          >
                            <motion.div
                              animate={{ x: config.adaptiveWakeEnabled ? 24 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="absolute top-1 w-4 h-4 bg-white rounded-full"
                            />
                          </motion.button>
                        </div>
                        <p className="text-sm text-slate-400">
                          Wake you during light sleep up to {config.adaptiveWindowMinutes} minutes before your alarm
                        </p>
                      </div>

                      {/* Light Controls */}
                      <div className="space-y-4">
                        <h4 className="text-white font-medium">Light Simulation</h4>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Sunrise</span>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              triggerHaptic('light');
                              setConfig(prev => ({ ...prev, sunriseEnabled: !prev.sunriseEnabled }));
                            }}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              config.sunriseEnabled ? 'bg-orange-500' : 'bg-slate-600'
                            }`}
                          >
                            <motion.div
                              animate={{ x: config.sunriseEnabled ? 24 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="absolute top-1 w-4 h-4 bg-white rounded-full"
                            />
                          </motion.button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Sunset</span>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              triggerHaptic('light');
                              setConfig(prev => ({ ...prev, sunsetEnabled: !prev.sunsetEnabled }));
                            }}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              config.sunsetEnabled ? 'bg-purple-500' : 'bg-slate-600'
                            }`}
                          >
                            <motion.div
                              animate={{ x: config.sunsetEnabled ? 24 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="absolute top-1 w-4 h-4 bg-white rounded-full"
                            />
                          </motion.button>
                        </div>

                        {/* Light Intensity Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-300">Light Intensity</span>
                            <span className="text-slate-400">{config.lightIntensity}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={config.lightIntensity}
                            onChange={(e) => {
                              triggerHaptic('light');
                              setConfig(prev => ({ 
                                ...prev, 
                                lightIntensity: parseInt(e.target.value) 
                              }));
                            }}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SmartAlarmCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Device Connection - Demo Mode */}
        <SmartAlarmCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${isConnected ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-orange-400'}`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Demo Mode</h3>
                <p className="text-slate-400 text-sm">
                  {isConnected ? 'USB Serial Connected' : 'Hardware via USB'}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={connectToDevice}
              disabled={isConnecting || isConnected}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                isConnected 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect'}
            </motion.button>
          </div>
          {isConnected && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-300 text-sm">
                💻 <strong>Demo Mode:</strong> Use ESP-IDF monitor terminal commands for real-time control. 
                Try: <code className="bg-slate-700 px-1 rounded">TRIGGER_SUNRISE</code>
              </p>
            </div>
          )}
        </SmartAlarmCard>
      </div>

      {/* Sleep Cycle Recommendation Modal */}
      <AnimatePresence>
        {showCycleRecommendation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCycleRecommendation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-2xl p-6 m-6 max-w-md w-full"
            >
              <SleepCycleVisualization
                currentWakeTime={config.wakeTime}
                onSelectTime={(time) => {
                  setConfig(prev => ({ ...prev, bedtime: time }));
                  setShowCycleRecommendation(false);
                  triggerHaptic('medium');
                }}
                onClose={() => setShowCycleRecommendation(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo Control Panel */}
      <DemoControlPanel onHaptic={triggerHaptic} />
    </div>
  );
}