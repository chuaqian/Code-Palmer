'use client';

import { useESP32 } from '@/hooks/useESP32';
import { useState } from 'react';

interface ESP32ControlPanelProps {
  className?: string;
}

export function ESP32ControlPanel({ className = '' }: ESP32ControlPanelProps) {
  const { connected, bridgeConnected, deviceStatus, commands } = useESP32();
  const [rgbValues, setRgbValues] = useState({ r: 255, g: 100, b: 50 });
  const [brightness, setBrightness] = useState(128);

  const isEnabled = connected && bridgeConnected;

  const handleRGBChange = (color: 'r' | 'g' | 'b', value: number) => {
    const newValues = { ...rgbValues, [color]: value };
    setRgbValues(newValues);
    if (isEnabled) {
      commands.setRGB(newValues.r, newValues.g, newValues.b);
    }
  };

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
    if (isEnabled) {
      commands.setBrightness(value);
    }
  };

  const ColorSlider = ({ 
    label, 
    value, 
    color, 
    onChange 
  }: { 
    label: string; 
    value: number; 
    color: 'r' | 'g' | 'b'; 
    onChange: (value: number) => void;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="text-white font-mono">{value}</span>
      </div>
      <input
        type="range"
        min="0"
        max="255"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={!isEnabled}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer
          ${color === 'r' ? 'bg-gradient-to-r from-black to-red-500' : ''}
          ${color === 'g' ? 'bg-gradient-to-r from-black to-green-500' : ''}
          ${color === 'b' ? 'bg-gradient-to-r from-black to-blue-500' : ''}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        style={{
          background: color === 'r' 
            ? `linear-gradient(to right, #000 0%, rgb(${value}, 0, 0) 100%)`
            : color === 'g'
            ? `linear-gradient(to right, #000 0%, rgb(0, ${value}, 0) 100%)`
            : `linear-gradient(to right, #000 0%, rgb(0, 0, ${value}) 100%)`
        }}
      />
    </div>
  );

  return (
    <div className={`${className} space-y-6`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Device Controls</h2>
        {deviceStatus && (
          <div className="flex gap-2">
            {deviceStatus.sunrise_active && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-200 text-xs rounded">
                🌅 Sunrise Active
              </span>
            )}
            {deviceStatus.sunset_active && (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-200 text-xs rounded">
                🌇 Sunset Active
              </span>
            )}
            {deviceStatus.alarm_active && (
              <span className="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded animate-pulse">
                🚨 Alarm Active
              </span>
            )}
          </div>
        )}
      </div>

      {!isEnabled && (
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 text-center">
          <div className="text-yellow-200 mb-2">⚠️ Device Not Connected</div>
          <div className="text-sm text-yellow-300">
            Connect your ESP32 device to use these controls
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lighting Controls */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            💡 Lighting Controls
          </h3>

          {/* RGB Color Controls */}
          <div className="space-y-4 mb-6">
            <div className="text-sm text-gray-300 mb-3">Custom RGB Color</div>
            
            <ColorSlider
              label="Red"
              value={rgbValues.r}
              color="r"
              onChange={(value) => handleRGBChange('r', value)}
            />
            
            <ColorSlider
              label="Green"
              value={rgbValues.g}
              color="g"
              onChange={(value) => handleRGBChange('g', value)}
            />
            
            <ColorSlider
              label="Blue"
              value={rgbValues.b}
              color="b"
              onChange={(value) => handleRGBChange('b', value)}
            />

            {/* Color Preview */}
            <div className="flex items-center gap-3 mt-4">
              <div 
                className="w-12 h-12 rounded-lg border-2 border-white/20"
                style={{ 
                  backgroundColor: `rgb(${rgbValues.r}, ${rgbValues.g}, ${rgbValues.b})` 
                }}
              />
              <div className="text-sm text-gray-300">
                RGB({rgbValues.r}, {rgbValues.g}, {rgbValues.b})
              </div>
            </div>
          </div>

          {/* Brightness Control */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Brightness</span>
              <span className="text-white font-mono">{Math.round((brightness / 255) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={brightness}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
              disabled={!isEnabled}
              className="w-full h-2 bg-gradient-to-r from-black to-white rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Preset Lighting */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => commands.startSunrise()}
              disabled={!isEnabled}
              className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🌅 Sunrise
            </button>
            
            <button
              onClick={() => commands.startSunset()}
              disabled={!isEnabled}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-500 hover:to-red-400 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🌇 Sunset
            </button>
          </div>
        </div>

        {/* Alarm Controls */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            ⏰ Alarm System
          </h3>

          {/* Alarm Status */}
          {deviceStatus && (
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-300 mb-2">Current Status</div>
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-1 text-xs rounded ${
                  deviceStatus.alarm_enabled 
                    ? 'bg-green-500/20 text-green-200' 
                    : 'bg-red-500/20 text-red-200'
                }`}>
                  {deviceStatus.alarm_enabled ? 'Enabled' : 'Disabled'}
                </span>
                
                <span className={`px-2 py-1 text-xs rounded ${
                  deviceStatus.alarm_active 
                    ? 'bg-red-500/20 text-red-200 animate-pulse' 
                    : 'bg-gray-500/20 text-gray-300'
                }`}>
                  {deviceStatus.alarm_active ? 'Active' : 'Standby'}
                </span>
              </div>
            </div>
          )}

          {/* Alarm Controls */}
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => commands.enableAlarm()}
                disabled={!isEnabled}
                className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                ✅ Enable
              </button>
              
              <button
                onClick={() => commands.disableAlarm()}
                disabled={!isEnabled}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                ❌ Disable
              </button>
            </div>

            <button
              onClick={() => commands.startAlarm()}
              disabled={!isEnabled}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              🚨 Test Alarm
            </button>

            <button
              onClick={() => commands.testBuzzer()}
              disabled={!isEnabled}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔊 Test Buzzer
            </button>
          </div>
        </div>
      </div>

      {/* System Controls */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          🛠️ System Controls
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => commands.getStatus()}
            disabled={!isEnabled}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            📊 Status
          </button>
          
          <button
            onClick={() => commands.getSensors()}
            disabled={!isEnabled}
            className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            📡 Sensors
          </button>
          
          <button
            onClick={() => commands.stopAll()}
            disabled={!isEnabled}
            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            ⏹️ Stop All
          </button>
          
          <button
            onClick={() => commands.reset()}
            disabled={!isEnabled}
            className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            🔄 Reset
          </button>
        </div>
      </div>
    </div>
  );
}