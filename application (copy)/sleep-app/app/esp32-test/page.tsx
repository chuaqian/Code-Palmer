"use client";

import { useESP32 } from "@/hooks/useESP32";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { SensorDashboard } from "@/components/SensorDashboard";
import { ESP32ControlPanel } from "@/components/ESP32ControlPanel";

export default function ESP32TestPage() {
  const {
    connectionStatus,
    sensorData,
    deviceState,
    sendCommand,
    isConnected,
    lastError,
  } = useESP32();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            SleepSync ESP32 Control Center
          </h1>
          <p className="text-purple-200 text-lg">
            Real-time hardware monitoring and control interface
          </p>
        </div>

        <div className="mb-8">
          <ConnectionStatus
            status={connectionStatus}
            isConnected={isConnected}
            lastError={lastError}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            <SensorDashboard
              sensorData={sensorData}
              deviceState={deviceState}
              isConnected={isConnected}
            />
          </div>

          <div className="space-y-6">
            <ESP32ControlPanel
              deviceState={deviceState}
              sendCommand={sendCommand}
              isConnected={isConnected}
            />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/20 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-200">
              Bridge Status:
              <span
                className={`ml-2 font-medium ${
                  connectionStatus === "connected"
                    ? "text-green-400"
                    : connectionStatus === "connecting"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {connectionStatus.toUpperCase()}
              </span>
            </span>

            <button
              onClick={() => sendCommand("get_status")}
              disabled={!isConnected}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded-md transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </div>

        {lastError && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <h3 className="text-red-400 font-semibold mb-2">
              Connection Error
            </h3>
            <p className="text-red-300 text-sm">{lastError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
