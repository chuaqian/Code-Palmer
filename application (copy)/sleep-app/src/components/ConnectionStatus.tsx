'use client';

import { useESP32 } from '@/hooks/useESP32';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const { connected, bridgeConnected, error, commands } = useESP32();

  const getStatusInfo = () => {
    if (error) {
      return {
        status: 'Error',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        icon: '❌'
      };
    }
    
    if (!connected) {
      return {
        status: 'Disconnected',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
        icon: '🔌'
      };
    }
    
    if (!bridgeConnected) {
      return {
        status: 'Bridge Only',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        icon: '⚠️'
      };
    }
    
    return {
      status: 'Connected',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      icon: '✅'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`${className}`}>
      <div className={`
        flex items-center gap-3 px-4 py-2 rounded-lg border backdrop-blur-sm
        ${statusInfo.bgColor} ${statusInfo.borderColor}
      `}>
        <span className="text-lg">{statusInfo.icon}</span>
        <div className="flex-1">
          <div className={`font-medium ${statusInfo.color}`}>
            ESP32 {statusInfo.status}
          </div>
          {error && (
            <div className="text-xs text-red-300 mt-1">
              {error}
            </div>
          )}
          {connected && bridgeConnected && (
            <div className="text-xs text-green-300">
              Bridge + Device Ready
            </div>
          )}
          {connected && !bridgeConnected && (
            <div className="text-xs text-yellow-300">
              Bridge connected, waiting for ESP32...
            </div>
          )}
        </div>
        
        {connected && (
          <button
            onClick={() => commands.getStatus()}
            className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
            title="Refresh Status"
          >
            🔄
          </button>
        )}
      </div>
    </div>
  );
}