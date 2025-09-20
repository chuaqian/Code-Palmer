"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SpeakerWaveIcon,
  MusicalNoteIcon,
  CloudArrowUpIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { esp32Controller } from "@/lib/esp32";

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

interface AudioCustomizationProps {
  config: AlarmConfig;
  onChange: (config: AlarmConfig) => void;
  onHaptic: (type: "light" | "medium" | "heavy") => void;
}

const PRESET_TONES = [
  {
    id: 1,
    name: "Gentle Waves",
    description: "Ocean sounds with soft melody",
    duration: "2:30",
  },
  {
    id: 2,
    name: "Forest Dawn",
    description: "Bird songs with nature ambience",
    duration: "3:15",
  },
  {
    id: 3,
    name: "Soft Piano",
    description: "Peaceful piano progression",
    duration: "2:45",
  },
  {
    id: 4,
    name: "Wind Chimes",
    description: "Gentle chimes with breeze",
    duration: "3:00",
  },
  {
    id: 5,
    name: "Ambient Bells",
    description: "Tibetan singing bowls",
    duration: "4:00",
  },
];

export function AudioCustomization({
  config,
  onChange,
  onHaptic,
}: AudioCustomizationProps) {
  const [activeTab, setActiveTab] = useState<"presets" | "upload" | "create">(
    "presets"
  );
  const [isPlaying, setIsPlaying] = useState<number | null>(null);

  const playPreview = async (toneId: number) => {
    onHaptic("light");
    if (isPlaying === toneId) {
      setIsPlaying(null);
      await esp32Controller.stopAlarm();
    } else {
      setIsPlaying(toneId);
      const result = await esp32Controller.playPresetTone(toneId);
      if (result.success) {
        console.log(`Preview preset tone ${toneId}`);
      } else {
        console.error(`Failed to play tone ${toneId}:`, result.error);
      }
      setTimeout(() => setIsPlaying(null), 1000);
    }
  };

  const selectPreset = async (toneId: number) => {
    onHaptic("medium");
    onChange({ ...config, presetToneId: toneId });
    await esp32Controller.playPresetTone(toneId);
  };

  const handleVolumeChange = async (volume: number) => {
    onHaptic("light");
    onChange({ ...config, alarmVolume: volume });
    await esp32Controller.setVolume(volume);
  };

  return (
    <div className="space-y-6">
      {/* Volume Control */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-white font-medium">Progressive Volume</label>
          <span className="text-slate-400">{config.alarmVolume}%</span>
        </div>
        <div className="space-y-2">
          <input
            type="range"
            min="10"
            max="100"
            value={config.alarmVolume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>Gentle</span>
            <span>Full</span>
          </div>
        </div>
      </div>

      {/* Snooze Duration */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-white font-medium">Snooze Duration</label>
          <span className="text-slate-400">{config.snoozeDuration} min</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[5, 9, 15].map((duration) => (
            <motion.button
              key={duration}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onHaptic("light");
                onChange({ ...config, snoozeDuration: duration });
              }}
              className={`
                p-3 rounded-xl text-center transition-all
                ${
                  config.snoozeDuration === duration
                    ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                    : "bg-slate-700/30 text-slate-400 border border-slate-600 hover:bg-slate-700/50"
                }
              `}
            >
              <div className="text-lg font-medium">{duration}</div>
              <div className="text-xs">
                {duration === 9 ? "Recommended" : "minutes"}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Audio Selection Tabs */}
      <div className="space-y-4">
        <div className="flex space-x-1 p-1 bg-slate-800/50 rounded-xl">
          {[
            { id: "presets", label: "Presets", icon: MusicalNoteIcon },
            { id: "upload", label: "Upload", icon: CloudArrowUpIcon },
            { id: "create", label: "Create", icon: PlusIcon },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onHaptic("light");
                setActiveTab(tab.id as any);
              }}
              className={`
                flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-all
                ${
                  activeTab === tab.id
                    ? "bg-purple-500/30 text-purple-300"
                    : "text-slate-400 hover:text-slate-300"
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              <span className="font-medium">{tab.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "presets" && (
            <motion.div
              key="presets"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {PRESET_TONES.map((tone) => (
                <motion.div
                  key={tone.id}
                  className={`
                    p-4 rounded-xl border transition-all
                    ${
                      config.presetToneId === tone.id
                        ? "bg-purple-500/20 border-purple-500/50"
                        : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectPreset(tone.id)}
                      className="flex-1 text-left"
                    >
                      <h4 className="text-white font-medium">{tone.name}</h4>
                      <p className="text-slate-400 text-sm">
                        {tone.description}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {tone.duration}
                      </p>
                    </motion.button>

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => playPreview(tone.id)}
                        className="p-2 rounded-lg bg-slate-600/50 hover:bg-slate-600 transition-colors"
                      >
                        {isPlaying === tone.id ? (
                          <PauseIcon className="h-4 w-4 text-white" />
                        ) : (
                          <PlayIcon className="h-4 w-4 text-white" />
                        )}
                      </motion.button>

                      {config.presetToneId === tone.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 bg-purple-400 rounded-full"
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center">
                <CloudArrowUpIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-white font-medium mb-2">
                  Upload Custom Audio
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Drag & drop your audio file or click to browse
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onHaptic("medium");
                    // Placeholder
                  }}
                  className="px-4 py-2 bg-purple-500/30 text-purple-300 rounded-lg border border-purple-500/50 hover:bg-purple-500/40 transition-colors"
                >
                  Choose File
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="text-center py-8">
                <MusicalNoteIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-white font-medium mb-2">
                  Create Custom Tone
                </h3>
                <p className="text-slate-400 text-sm">
                  Mix and layer sounds to create your perfect wake-up tone
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onHaptic("medium");
                    // Placeholder
                  }}
                  className="mt-4 px-4 py-2 bg-slate-600/50 text-slate-300 rounded-lg border border-slate-500 hover:bg-slate-600 transition-colors"
                >
                  Coming Soon
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
