'use client';

import { useState } from 'react';
import { TimePickerWheel } from '@/components/ui/TimePickerWheel';

export default function TimePickerTest() {
  const [time, setTime] = useState({ hour: 22, minute: 30 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-white text-2xl font-bold mb-8 text-center">Time Picker Test</h1>
        
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-white text-lg mb-4">Selected Time: {time.hour.toString().padStart(2, '0')}:{time.minute.toString().padStart(2, '0')}</h2>
          
          <TimePickerWheel 
            time={time}
            onChange={setTime}
          />
        </div>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => setTime({ hour: 6, minute: 30 })}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg mr-4"
          >
            Set 6:30
          </button>
          <button 
            onClick={() => setTime({ hour: 23, minute: 0 })}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg"
          >
            Set 23:00
          </button>
        </div>
      </div>
    </div>
  );
}