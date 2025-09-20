"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface Time {
  hour: number;
  minute: number;
}

interface TimePickerWheelProps {
  time: Time;
  onChange: (time: Time) => void;
}

export function TimePickerWheel({ time, onChange }: TimePickerWheelProps) {
  const [selectedHour, setSelectedHour] = useState(time.hour);
  const [selectedMinute, setSelectedMinute] = useState(time.minute);

  useEffect(() => {
    onChange({ hour: selectedHour, minute: selectedMinute });
  }, [selectedHour, selectedMinute, onChange]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const WheelColumn = ({
    values,
    selected,
    onSelect,
    formatter = (v: number) => v.toString().padStart(2, "0"),
  }: {
    values: number[];
    selected: number;
    onSelect: (value: number) => void;
    formatter?: (value: number) => string;
  }) => {
    return (
      <div className="relative h-48 w-20 overflow-hidden">
        {/* Selection highlight */}
        <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-12 bg-purple-500/20 rounded-lg border border-purple-500/30 z-10" />

        {/* Scrollable items */}
        <div className="absolute inset-0 flex flex-col items-center justify-start pt-16">
          {values.map((value, index) => {
            const isSelected = value === selected;
            const selectedIndex = values.indexOf(selected);
            const distance = Math.abs(selectedIndex - index);
            const opacity = Math.max(0.3, 1 - distance * 0.2);
            const scale = Math.max(0.7, 1 - distance * 0.1);
            const translateY = (index - selectedIndex) * 48; // 48px spacing between items

            return (
              <motion.button
                key={value}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(value)}
                className={`
                  absolute flex items-center justify-center w-16 h-12 text-2xl font-mono
                  transition-all duration-200 z-20
                  ${isSelected ? "text-white font-semibold" : "text-slate-400"}
                  hover:text-slate-200
                `}
                style={{
                  opacity,
                  transform: `translateY(${translateY}px) scale(${scale})`,
                }}
              >
                {formatter(value)}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center gap-8">
      {/* Hours */}
      <div className="flex flex-col items-center">
        <span className="text-slate-400 text-sm mb-2">Hour</span>

        {/* Up button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setSelectedHour((prev) => (prev + 1) % 24)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronUpIcon className="h-5 w-5" />
        </motion.button>

        <WheelColumn
          values={hours}
          selected={selectedHour}
          onSelect={setSelectedHour}
        />

        {/* Down button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setSelectedHour((prev) => (prev - 1 + 24) % 24)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronDownIcon className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Separator */}
      <div className="text-3xl text-slate-400 font-light">:</div>

      {/* Minutes */}
      <div className="flex flex-col items-center">
        <span className="text-slate-400 text-sm mb-2">Minute</span>

        {/* Up button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            const currentIndex = minutes
              .filter((m) => m % 5 === 0)
              .indexOf(selectedMinute);
            const nextIndex =
              (currentIndex + 1) % minutes.filter((m) => m % 5 === 0).length;
            setSelectedMinute(minutes.filter((m) => m % 5 === 0)[nextIndex]);
          }}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronUpIcon className="h-5 w-5" />
        </motion.button>

        <WheelColumn
          values={minutes.filter((m) => m % 5 === 0)} // Only show 5-minute intervals
          selected={selectedMinute}
          onSelect={setSelectedMinute}
        />

        {/* Down button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            const currentIndex = minutes
              .filter((m) => m % 5 === 0)
              .indexOf(selectedMinute);
            const prevIndex =
              (currentIndex - 1 + minutes.filter((m) => m % 5 === 0).length) %
              minutes.filter((m) => m % 5 === 0).length;
            setSelectedMinute(minutes.filter((m) => m % 5 === 0)[prevIndex]);
          }}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronDownIcon className="h-5 w-5" />
        </motion.button>
      </div>
    </div>
  );
}
