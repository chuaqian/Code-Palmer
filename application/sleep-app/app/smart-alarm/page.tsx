"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Sun,
  Moon,
  Volume2,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { TimePickerWheel, type ClockTime } from "@/src/components/ui/TimePickerWheel";
import { SleepCycleVisualization } from "@/src/components/ui/SleepCycleVisualization";
import { AudioCustomization } from "@/src/components/ui/AudioCustomization";
import { SmartAlarmCard } from "@/src/components/ui/SmartAlarmCard";
import { DemoControlPanel } from "@/src/components/ui/DemoControlPanel";
import { esp32Controller } from "@/src/lib/esp32";

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
  customToneName: "",
  alarmEnabled: false,
};

export default function SmartAlarmPage() {
  const [config, setConfig] = useState<AlarmConfig>(defaultConfig);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showCycleRecommendation, setShowCycleRecommendation] = useState(false);
  const router = useRouter();

  const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30],
      } as const;
      // @ts-ignore
      navigator.vibrate?.(patterns[type] as any);
    }
  };

  const toggleAlarm = async () => {
    triggerHaptic("medium");
    setConfig((prev) => ({ ...prev, alarmEnabled: !prev.alarmEnabled }));
    try {
      const res = config.alarmEnabled
        ? await esp32Controller.disableAlarm()
        : await esp32Controller.enableAlarm();
      console.log("Alarm toggle:", res);
    } catch (e) {
      console.error(e);
    }
  };

  const fmt12 = ({ hour, minute }: { hour: number; minute: number }) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const mm = String(minute).padStart(2, "0");
    return `${h12}:${mm} ${ampm}`;
  };

  return (
    <main className="flex-1 p-4 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/")}
          aria-label="Back to home"
          className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </motion.button>
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <h1 className="text-2xl font-light">Smart Alarm</h1>
          </div>
          <p className="text-slate-300 text-sm">Gentle wake-up with natural light</p>
        </div>
        <div className="w-9" />
      </div>

      {/* Master Switch */}
      <SmartAlarmCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${config.alarmEnabled ? "bg-green-500/20" : "bg-slate-500/20"}`}>
              <Clock className={`h-6 w-6 ${config.alarmEnabled ? "text-green-400" : "text-slate-400"}`} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Smart Alarm</h3>
              <p className="text-slate-400 text-sm">{config.alarmEnabled ? "Active" : "Disabled"}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleAlarm}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${config.alarmEnabled ? "bg-green-500" : "bg-slate-600"}`}
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
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Bedtime */}
            <SmartAlarmCard>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(activeSection === "bedtime" ? null : "bedtime")}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-orange-500/20">
                    <Moon className="h-6 w-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Bedtime</h3>
                    <p className="text-slate-400 text-sm">{fmt12(config.bedtime)}</p>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${activeSection === "bedtime" ? "rotate-90" : ""}`} />
              </motion.button>
              <AnimatePresence>
                {activeSection === "bedtime" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 pt-6 border-t border-slate-700"
                  >
                    <TimePickerWheel
                      time={config.bedtime}
                      onChange={async (time: ClockTime) => {
                        triggerHaptic("light");
                        setConfig((prev) => ({ ...prev, bedtime: time }));
                        await esp32Controller.setBedtime(time.hour, time.minute);
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
                onClick={() => setActiveSection(activeSection === "wake" ? null : "wake")}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-yellow-500/20">
                    <Sun className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Wake Time</h3>
                    <p className="text-slate-400 text-sm">{fmt12(config.wakeTime)}</p>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${activeSection === "wake" ? "rotate-90" : ""}`} />
              </motion.button>
              <AnimatePresence>
                {activeSection === "wake" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 pt-6 border-t border-slate-700"
                  >
                    <TimePickerWheel
                      time={config.wakeTime}
                      onChange={(time: ClockTime) => {
                        triggerHaptic("light");
                        setConfig((prev) => ({ ...prev, wakeTime: time }));
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
                onClick={() => setActiveSection(activeSection === "audio" ? null : "audio")}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500/20">
                    <Volume2 className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Alarm Sound</h3>
                    <p className="text-slate-400 text-sm">Progressive • Volume {config.alarmVolume}%</p>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${activeSection === "audio" ? "rotate-90" : ""}`} />
              </motion.button>
              <AnimatePresence>
                {activeSection === "audio" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 pt-6 border-t border-slate-700"
                  >
                    <AudioCustomization
                      config={config}
                      onChange={(newConfig: any) => setConfig(newConfig)}
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
                onClick={() => setActiveSection(activeSection === "advanced" ? null : "advanced")}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/20">
                    <SlidersHorizontal className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Advanced</h3>
                    <p className="text-slate-400 text-sm">Light simulation • Smart wake</p>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${activeSection === "advanced" ? "rotate-90" : ""}`} />
              </motion.button>
              <AnimatePresence>
                {activeSection === "advanced" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
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
                            triggerHaptic("light");
                            setConfig((prev) => ({
                              ...prev,
                              adaptiveWakeEnabled: !prev.adaptiveWakeEnabled,
                            }));
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors ${config.adaptiveWakeEnabled ? "bg-green-500" : "bg-slate-600"}`}
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
                          onClick={async () => {
                            triggerHaptic("light");
                            setConfig((prev) => ({ ...prev, sunriseEnabled: !prev.sunriseEnabled }));
                            if (!config.sunriseEnabled) {
                              // Trigger a quick sunrise preview when enabling
                              await esp32Controller.triggerSunrise();
                            }
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors ${config.sunriseEnabled ? "bg-orange-500" : "bg-slate-600"}`}
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
                          onClick={async () => {
                            triggerHaptic("light");
                            setConfig((prev) => ({ ...prev, sunsetEnabled: !prev.sunsetEnabled }));
                            if (!config.sunsetEnabled) {
                              await esp32Controller.triggerSunset();
                            }
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors ${config.sunsetEnabled ? "bg-purple-500" : "bg-slate-600"}`}
                        >
                          <motion.div
                            animate={{ x: config.sunsetEnabled ? 24 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full"
                          />
                        </motion.button>
                      </div>
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
                            triggerHaptic("light");
                            setConfig((prev) => ({ ...prev, lightIntensity: parseInt(e.target.value) }));
                          }}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
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

      {/* Sleep Cycle Recommendation Modal */}
      <AnimatePresence>
        {showCycleRecommendation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCycleRecommendation(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[90vh] rounded-3xl bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl flex flex-col overflow-hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="overflow-y-auto flex-1 p-6" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                <SleepCycleVisualization
                  currentWakeTime={config.wakeTime}
                  onSelectTime={(time: ClockTime) => {
                    setConfig((prev) => ({ ...prev, bedtime: time }));
                    setShowCycleRecommendation(false);
                    triggerHaptic("medium");
                  }}
                  onClose={() => setShowCycleRecommendation(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo Control Panel (ESP32) */}
      <DemoControlPanel onHaptic={triggerHaptic} />
    </main>
  );
}
