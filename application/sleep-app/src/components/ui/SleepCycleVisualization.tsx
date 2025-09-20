'use client';

import { motion } from 'framer-motion';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Time {
  hour: number;
  minute: number;
}

interface SleepRecommendation {
  hour: number;
  minute: number;
  cycles: number;
  totalSleep: number;
}

interface SleepCycleVisualizationProps {
  currentWakeTime: Time;
  onSelectTime: (time: Time) => void;
  onClose: () => void;
}

export function SleepCycleVisualization({ 
  currentWakeTime, 
  onSelectTime, 
  onClose 
}: SleepCycleVisualizationProps) {
  // Calculate optimal bedtimes for the current wake time
  const calculateOptimalBedtimes = (): SleepRecommendation[] => {
    const sleepCycleDuration = 90; // minutes
    const fallAsleepTime = 15; // minutes to fall asleep
    
    const wakeTimeMinutes = currentWakeTime.hour * 60 + currentWakeTime.minute;
    const recommendations: SleepRecommendation[] = [];
    
    for (let cycles = 4; cycles <= 6; cycles++) {
      let bedtimeMinutes = wakeTimeMinutes - (cycles * sleepCycleDuration + fallAsleepTime);
      if (bedtimeMinutes < 0) bedtimeMinutes += 24 * 60; // Handle day wrap
      
      recommendations.push({
        hour: Math.floor(bedtimeMinutes / 60),
        minute: bedtimeMinutes % 60,
        cycles,
        totalSleep: cycles * 1.5
      });
    }
    
    return recommendations.reverse(); // Show longer sleep first
  };

  const recommendations = calculateOptimalBedtimes();

  const getSleepQuality = (cycles: number) => {
    if (cycles >= 5) return { label: 'Optimal', color: 'green' };
    if (cycles >= 4) return { label: 'Good', color: 'yellow' };
    return { label: 'Short', color: 'red' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Sleep Cycle Recommendations</h3>
          <p className="text-slate-400 text-sm mt-1">
            For wake time {String(currentWakeTime.hour).padStart(2, '0')}:
            {String(currentWakeTime.minute).padStart(2, '0')}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-700 transition-colors"
        >
          <XMarkIcon className="h-5 w-5 text-slate-400" />
        </motion.button>
      </div>

      {/* Info Card */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
        <h4 className="text-purple-400 font-medium mb-2">💡 Sleep Science</h4>
        <p className="text-slate-300 text-sm leading-relaxed">
          Sleep occurs in 90-minute cycles. Waking up at the end of a cycle helps you feel more refreshed and less groggy.
        </p>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        <h4 className="text-white font-medium">Recommended Bedtimes</h4>
        
        {recommendations.map((rec, index) => {
          const quality = getSleepQuality(rec.cycles);
          const isRecommended = index === 1; // Middle option (5 cycles) is usually best
          
          return (
            <motion.button
              key={index}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectTime({ hour: rec.hour, minute: rec.minute })}
              className={`
                w-full p-4 rounded-xl border transition-all
                ${isRecommended 
                  ? 'bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20' 
                  : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <div className="text-2xl font-light text-white">
                      {String(rec.hour).padStart(2, '0')}:{String(rec.minute).padStart(2, '0')}
                    </div>
                    <div className="text-sm text-slate-400">
                      {rec.cycles} cycles • {rec.totalSleep}h sleep
                    </div>
                  </div>
                  
                  {isRecommended && (
                    <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
                      Recommended
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`
                    text-sm font-medium
                    ${quality.color === 'green' ? 'text-green-400' : 
                      quality.color === 'yellow' ? 'text-yellow-400' : 'text-red-400'}
                  `}>
                    {quality.label}
                  </span>
                  <CheckIcon className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Sleep Cycle Visualization */}
      <div className="space-y-3">
        <h4 className="text-white font-medium">Sleep Cycle Timeline</h4>
        <div className="bg-slate-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`
                  flex-1 h-8 rounded-md flex items-center justify-center text-xs font-medium
                  ${i < recommendations[1]?.cycles 
                    ? 'bg-purple-500/30 text-purple-300' 
                    : 'bg-slate-600/30 text-slate-500'
                  }
                `}
              >
                Cycle {i + 1}
              </div>
            ))}
          </div>
          <div className="text-center text-slate-400 text-sm">
            90 minutes per cycle • Ideal wake time at cycle end
          </div>
        </div>
      </div>
    </div>
  );
}