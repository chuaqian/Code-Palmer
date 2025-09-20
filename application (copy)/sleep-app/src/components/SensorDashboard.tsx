'use client';

import { useESP32 } from '@/hooks/useESP32';
import { useEffect, useState } from 'react';

interface SensorDashboardProps {
  className?: string;
}

export function SensorDashboard({ className = '' }: SensorDashboardProps) {
  const { sensorData, bridgeConnected } = useESP32();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (sensorData) {
      setLastUpdate(new Date());
    }
  }, [sensorData]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp / 1000).toLocaleTimeString();
  };

  const getLightLevel = () => {
    if (!sensorData) return { level: 'Unknown', percentage: 0, description: 'No data' };
    
    const percentage = (sensorData.light_level / 4095) * 100;
    let level = 'Dark';
    let description = 'Very dark environment';
    
    if (percentage > 80) {
      level = 'Bright';
      description = 'Very bright environment';
    } else if (percentage > 50) {
      level = 'Moderate';
      description = 'Moderately lit environment';
    } else if (percentage > 20) {
      level = 'Dim';
      description = 'Dimly lit environment';
    }
    
    return { level, percentage, description };
  };

  const lightInfo = getLightLevel();

  if (!bridgeConnected) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📡</div>
          <div className="text-lg font-medium">Waiting for ESP32...</div>
          <div className="text-sm">Connect your device to see sensor data</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Environmental Sensors</h2>
        {lastUpdate && (
          <div className="text-xs text-gray-400">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Light Sensor */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              💡
            </div>
            <div>
              <div className="text-sm text-yellow-200">Light Level</div>
              <div className="text-lg font-bold text-yellow-100">{lightInfo.level}</div>
            </div>
          </div>
          
          <div className="w-full bg-yellow-900/30 rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${lightInfo.percentage}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-yellow-300">
            <span>{lightInfo.description}</span>
            <span>{Math.round(lightInfo.percentage)}%</span>
          </div>
          
          {sensorData && (
            <div className="text-xs text-yellow-400 mt-2">
              Raw: {sensorData.light_level}/4095
            </div>
          )}
        </div>

        {/* Sound Sensor */}
        <div className={`
          border rounded-xl p-4 transition-all duration-300
          ${sensorData?.sound_detected 
            ? 'bg-gradient-to-br from-red-500/30 to-pink-500/30 border-red-500/50' 
            : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30'
          }
        `}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${sensorData?.sound_detected 
                ? 'bg-red-500/30 animate-pulse' 
                : 'bg-green-500/20'
              }
            `}>
              {sensorData?.sound_detected ? '🔊' : '🔇'}
            </div>
            <div>
              <div className={`text-sm ${sensorData?.sound_detected ? 'text-red-200' : 'text-green-200'}`}>
                Sound Level
              </div>
              <div className={`text-lg font-bold ${sensorData?.sound_detected ? 'text-red-100' : 'text-green-100'}`}>
                {sensorData?.sound_detected ? 'Detected' : 'Quiet'}
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-300">
            {sensorData?.sound_detected 
              ? 'Sound activity detected' 
              : 'Environment is quiet'
            }
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              🌡️
            </div>
            <div>
              <div className="text-sm text-blue-200">Temperature</div>
              <div className="text-lg font-bold text-blue-100">
                {sensorData ? `${sensorData.temperature.toFixed(1)}°C` : '--°C'}
              </div>
            </div>
          </div>
          
          <div className="text-xs text-blue-300">
            {sensorData && sensorData.temperature < 20 && 'Cool environment'}
            {sensorData && sensorData.temperature >= 20 && sensorData.temperature < 25 && 'Comfortable temperature'}
            {sensorData && sensorData.temperature >= 25 && 'Warm environment'}
            {!sensorData && 'No data available'}
          </div>
        </div>

        {/* Humidity */}
        <div className="bg-gradient-to-br from-teal-500/20 to-blue-500/20 border border-teal-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
              💧
            </div>
            <div>
              <div className="text-sm text-teal-200">Humidity</div>
              <div className="text-lg font-bold text-teal-100">
                {sensorData ? `${sensorData.humidity.toFixed(1)}%` : '--%'}
              </div>
            </div>
          </div>
          
          <div className="text-xs text-teal-300">
            {sensorData && sensorData.humidity < 40 && 'Low humidity'}
            {sensorData && sensorData.humidity >= 40 && sensorData.humidity < 60 && 'Optimal humidity'}
            {sensorData && sensorData.humidity >= 60 && 'High humidity'}
            {!sensorData && 'No data available'}
          </div>
        </div>
      </div>

      {sensorData && (
        <div className="text-xs text-gray-400 text-center">
          Data timestamp: {formatTimestamp(sensorData.timestamp)}
        </div>
      )}
    </div>
  );
}