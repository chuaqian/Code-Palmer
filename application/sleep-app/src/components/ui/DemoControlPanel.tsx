"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "@heroicons/react/24/outline";
import { esp32Controller } from "@/lib/esp32";

interface DemoControlPanelProps {
  onHaptic: (type: "light" | "medium" | "heavy") => void;
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
  const [lastCommand, setLastCommand] = useState<string>("");
  const [commandStatus, setCommandStatus] = useState<
    "success" | "error" | null
  >(null);
  const [isConnected, setIsConnected] = useState(true); // Always connected to mock
  const [connectionStatus, setConnectionStatus] = useState("Mock Ready");
  const [deviceLog, setDeviceLog] = useState<string[]>([]);

  useEffect(() => {
    setIsConnected(true);
    setConnectionStatus("Mock Ready");
  }, []);

  const executeCommand = async (
    commandId: string,
    commandFn: () => Promise<void>
  ) => {
    onHaptic("medium");
    setIsExecuting(commandId);
    setLastCommand(commandId);
    setCommandStatus(null);

    try {
      await commandFn();
      setCommandStatus("success");
      setTimeout(() => {
        setIsExecuting(null);
        setCommandStatus(null);
      }, 1000);
    } catch (error) {
      setCommandStatus("error");
      setTimeout(() => {
        setIsExecuting(null);
        setCommandStatus(null);
      }, 1000);
    }
  };

  const demoCommands: DemoCommand[] = [
    {
      id: "sunrise",
      name: "Sunrise Demo",
      description: "Progressive sunrise simulation",
      icon: SunIcon,
      color: "from-yellow-500 to-orange-500",
      command: async () => {
        await esp32Controller.fastSunrise();
      },
    },
    {
      id: "sunset",
      name: "Sunset Demo",
      description: "Relaxing sunset simulation",
      icon: MoonIcon,
      color: "from-orange-500 to-red-500",
      command: async () => {
        await esp32Controller.triggerSunset();
      },
    },
    {
      id: "red-ambient",
      name: "Red Ambient",
      description: "Sleep-friendly red light",
      icon: LightBulbIcon,
      color: "from-red-500 to-red-600",
      command: async () => {
        await esp32Controller.setRedAmbient();
      },
    },
    {
      id: "blue-calm",
      name: "Blue Calm",
      description: "Calming blue atmosphere",
      icon: LightBulbIcon,
      color: "from-blue-500 to-blue-600",
      command: async () => {
        await esp32Controller.setBlueCalm();
      },
    },
    {
      id: "rainbow",
      name: "Rainbow Show",
      description: "Colorful light display",
      icon: SparklesIcon,
      color: "from-pink-500 via-purple-500 to-indigo-500",
      command: async () => {
        await esp32Controller.startRainbow();
      },
    },
    {
      id: "night-light",
      name: "Night Light",
      description: "Gentle night illumination",
      icon: MoonIcon,
      color: "from-indigo-500 to-purple-500",
      command: async () => {
        await esp32Controller.nightLight();
      },
    },
    {
      id: "buzzer-test",
      name: "Buzzer Test",
      description: "Test alarm sounds",
      icon: SpeakerWaveIcon,
      color: "from-green-500 to-emerald-500",
      command: async () => {
        await esp32Controller.testBuzzer();
      },
    },
    {
      id: "trigger-alarm",
      name: "Full Alarm",
      description: "Complete alarm sequence",
      icon: FireIcon,
      color: "from-orange-500 to-red-500",
      command: async () => {
        await esp32Controller.triggerAlarm();
      },
    },
  ];

  return (
    <>
      {/* Floating Demo Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          onHaptic("medium");
          setIsOpen(!isOpen);
        }}
        className={`
          fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg 
          transition-all duration-300 ${
            isOpen
              ? "bg-red-500"
              : "bg-gradient-to-r from-purple-500 to-pink-500"
          }
          hover:shadow-xl active:scale-95
        `}
        style={{
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
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
              initial={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-24 right-6 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl"
              style={{ backdropFilter: "blur(20px)" }}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      ESP32 Demo Controls
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Test hardware features instantly
                    </p>
                  </div>
                  {(isExecuting || commandStatus) && (
                    <div className="flex items-center gap-2">
                      {commandStatus === "success" && (
                        <div className="flex items-center gap-1 text-green-400 text-sm">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          Success
                        </div>
                      )}
                      {commandStatus === "error" && (
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isConnected ? "bg-green-400" : "bg-red-400"
                        }`}
                      />
                      <span className="text-sm text-slate-300">
                        {isConnected ? "Mock Connected" : "Not Connected"}
                      </span>
                    </div>
                  </div>
                  {connectionStatus && (
                    <p className="text-xs text-slate-400 mt-1">
                      {connectionStatus}
                    </p>
                  )}
                </div>

                {lastCommand && (
                  <p className="text-slate-500 text-xs mt-1">
                    Last: {lastCommand.replace(/_/g, " ").toLowerCase()}
                  </p>
                )}
              </div>

              {/* Commands Grid */}
              <div className="p-4 space-y-3">
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
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-r ${
                        cmd.color
                      } ${isExecuting === cmd.id ? "animate-pulse" : ""}`}
                    >
                      <cmd.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="text-white font-medium text-sm">
                        {isExecuting === cmd.id ? "Executing..." : cmd.name}
                      </h4>
                      <p className="text-slate-400 text-xs">
                        {cmd.description}
                      </p>
                    </div>
                    {isExecuting === cmd.id && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    )}
                  </motion.button>
                ))}

                {/* Emergency Stop */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    executeCommand("stop", async () => {
                      await esp32Controller.stopAlarm();
                    })
                  }
                  disabled={!isConnected}
                  className="w-full p-4 rounded-xl bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <StopIcon className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-medium">
                    {isExecuting === "stop" ? "Stopping..." : "Emergency Stop"}
                  </span>
                </motion.button>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
                <p className="text-slate-500 text-xs text-center mb-2">
                  Mock commands – no hardware required
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
