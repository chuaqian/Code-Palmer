'use client';

import React from 'react';
import { AlarmControlPanel } from '@/src/components/smartAlarm/alarmControlPanel';

export default function SmartAlarmPage() {
	const haptic = (type: 'light' | 'medium' | 'heavy') => {
		if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
			const duration = type === 'light' ? 10 : type === 'medium' ? 30 : 60;
			// @ts-ignore - vibrate exists on Navigator in browsers
			navigator.vibrate?.(duration);
		}
	};

	return (
		<main className="relative min-h-[60vh] p-4">
			<h1 className="text-2xl font-semibold text-white">Smart Alarm</h1>
			<p className="text-slate-400 mt-1">Control your ESP32 alarm hardware from here.</p>

			{/* Floating control lives globally; button appears bottom-right */}
			<AlarmControlPanel onHaptic={haptic} />
		</main>
	);
}