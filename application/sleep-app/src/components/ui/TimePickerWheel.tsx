"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export interface ClockTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

interface TimePickerWheelProps {
  time: ClockTime;
  onChange: (time: ClockTime) => void;
}

export function TimePickerWheel({ time, onChange }: TimePickerWheelProps) {
  // 12-hour display with AM/PM, keep emitting 24h to parent
  const initialAmPm = time.hour >= 12 ? "PM" : "AM";
  const to12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);
  const to24 = (h12: number, ampm: "AM" | "PM") => {
    const base = h12 % 12;
    return ampm === "PM" ? base + 12 : base === 12 ? 0 : base;
  };

  const [selectedHour12, setSelectedHour12] = useState<number>(to12(time.hour));
  const [selectedMinute, setSelectedMinute] = useState(time.minute);
  const [amPm, setAmPm] = useState<"AM" | "PM">(initialAmPm);

  useEffect(() => {
    onChange({ hour: to24(selectedHour12, amPm), minute: selectedMinute });
  }, [selectedHour12, selectedMinute, amPm, onChange]);

  const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // simple wheel interactions
  const useWheel = (onDelta: (dir: 1 | -1) => void) => {
    const touchStartY = useRef<number | null>(null);
    return {
      onWheel: (e: React.WheelEvent) => {
        e.preventDefault();
        onDelta(e.deltaY > 0 ? 1 : -1);
      },
      onTouchStart: (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
      },
      onTouchEnd: (e: React.TouchEvent) => {
        if (touchStartY.current == null) return;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(dy) > 12) onDelta(dy > 0 ? 1 : -1);
        touchStartY.current = null;
      },
    };
  };

  const WheelColumn = <T extends number | string>({
    values,
    selected,
    onSelect,
    formatter = (v: T) =>
      (typeof v === "number" ? v.toString() : String(v)).padStart(2, "0"),
    handlers,
  }: {
    values: T[];
    selected: T;
    onSelect: (value: T) => void;
    formatter?: (value: T) => string;
    handlers?: {
      onWheel?: (e: React.WheelEvent) => void;
      onTouchStart?: (e: React.TouchEvent) => void;
      onTouchEnd?: (e: React.TouchEvent) => void;
      onKeyDown?: (e: React.KeyboardEvent) => void;
    };
  }) => {
    return (
      <div
        className="relative h-48 w-20 overflow-hidden"
        {...handlers}
        role="listbox"
        aria-orientation="vertical"
        tabIndex={0}
      >
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
                key={value.toString()}
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
          onClick={() => setSelectedHour12((prev) => (prev % 12) + 1)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Increment hour"
        >
          <ChevronUpIcon className="h-5 w-5" />
        </motion.button>

        <WheelColumn
          values={hours12}
          selected={selectedHour12}
          onSelect={setSelectedHour12}
          handlers={{
            ...useWheel((dir) =>
              setSelectedHour12((prev) => {
                const next = ((prev - 1 + dir + 12) % 12) + 1; // 1..12
                return next;
              })
            ),
            onKeyDown: (e) => {
              if (e.key === "ArrowUp" || e.key === "PageUp") {
                e.preventDefault();
                setSelectedHour12((prev) => (prev % 12) + 1);
              } else if (e.key === "ArrowDown" || e.key === "PageDown") {
                e.preventDefault();
                setSelectedHour12((prev) => ((prev + 10) % 12) + 1);
              } else if (e.key === "Home") {
                e.preventDefault();
                setSelectedHour12(1);
              } else if (e.key === "End") {
                e.preventDefault();
                setSelectedHour12(12);
              }
            },
          }}
        />

        {/* Down button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setSelectedHour12((prev) => ((prev + 10) % 12) + 1)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Decrement hour"
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
            const opts = minutes.filter((m) => m % 5 === 0);
            const currentIndex = opts.indexOf(selectedMinute);
            const nextIndex = (currentIndex + 1) % opts.length;
            setSelectedMinute(opts[nextIndex]);
          }}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Increment minute"
        >
          <ChevronUpIcon className="h-5 w-5" />
        </motion.button>

        <WheelColumn
          values={minutes.filter((m) => m % 5 === 0)} // Only show 5-minute intervals
          selected={selectedMinute}
          onSelect={setSelectedMinute}
          handlers={{
            ...useWheel((dir) => {
              const opts = minutes.filter((m) => m % 5 === 0);
              const idx = opts.indexOf(selectedMinute);
              const next =
                opts[(idx + (dir > 0 ? 1 : -1) + opts.length) % opts.length];
              setSelectedMinute(next);
            }),
            onKeyDown: (e) => {
              const opts = minutes.filter((m) => m % 5 === 0);
              if (e.key === "ArrowUp" || e.key === "PageUp") {
                e.preventDefault();
                const i = opts.indexOf(selectedMinute);
                setSelectedMinute(opts[(i + 1) % opts.length]);
              } else if (e.key === "ArrowDown" || e.key === "PageDown") {
                e.preventDefault();
                const i = opts.indexOf(selectedMinute);
                setSelectedMinute(opts[(i - 1 + opts.length) % opts.length]);
              } else if (e.key === "Home") {
                e.preventDefault();
                setSelectedMinute(0);
              } else if (e.key === "End") {
                e.preventDefault();
                setSelectedMinute(55);
              }
            },
          }}
        />

        {/* Down button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            const opts = minutes.filter((m) => m % 5 === 0);
            const currentIndex = opts.indexOf(selectedMinute);
            const prevIndex = (currentIndex - 1 + opts.length) % opts.length;
            setSelectedMinute(opts[prevIndex]);
          }}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Decrement minute"
        >
          <ChevronDownIcon className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Separator */}
      <div className="text-3xl text-slate-400 font-light"> </div>

      {/* AM/PM */}
      <div className="flex flex-col items-center">
        <span className="text-slate-400 text-sm mb-2">AM/PM</span>

        {/* Up button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setAmPm((prev) => (prev === "AM" ? "PM" : "AM"))}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Toggle AM/PM"
        >
          <ChevronUpIcon className="h-5 w-5" />
        </motion.button>

        <WheelColumn
          values={["AM", "PM"]}
          selected={amPm}
          onSelect={(v) => setAmPm(v as "AM" | "PM")}
          formatter={(v) => String(v)}
          handlers={{
            ...useWheel(() => setAmPm((p) => (p === "AM" ? "PM" : "AM"))),
            onKeyDown: (e) => {
              if (
                e.key === "ArrowUp" ||
                e.key === "ArrowDown" ||
                e.key === "PageUp" ||
                e.key === "PageDown"
              ) {
                e.preventDefault();
                setAmPm((p) => (p === "AM" ? "PM" : "AM"));
              } else if (e.key === "Home") {
                e.preventDefault();
                setAmPm("AM");
              } else if (e.key === "End") {
                e.preventDefault();
                setAmPm("PM");
              }
            },
          }}
        />

        {/* Down button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setAmPm((prev) => (prev === "AM" ? "PM" : "AM"))}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Toggle AM/PM"
        >
          <ChevronDownIcon className="h-5 w-5" />
        </motion.button>
      </div>
    </div>
  );
}

export default TimePickerWheel;
