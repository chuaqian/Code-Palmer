"use client";

import React from "react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import FireIcon from "@/components/icons/FireIcon";

export type WeekDayItem = { key: string; label: string; isToday: boolean };

export default function HeaderBar({
  dayName,
  dateRangeLabel,
  weekDays,
  onCalendar,
  currentStreak,
}: {
  dayName: string;
  dateRangeLabel: string;
  weekDays: WeekDayItem[];
  onCalendar: () => void;
  currentStreak: number;
}) {
  const router = useRouter();
  return (
    <header className="-mx-4 px-4">
      <div className="h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-semibold tracking-tight">{dayName}</div>
          <div className="text-xs text-neutral-400">{dateRangeLabel}</div>
        </div>
        {/* grouped actions: fire (streak) + calendar */}
        <div className="flex items-center gap-2">
          <button
            aria-label="Streaks"
            onClick={() => router.push("/streaks")}
            className="inline-flex items-center gap-2 rounded-full px-2 py-1 hover:bg-white/3"
          >
            <FireIcon className="w-6 h-6" active={currentStreak > 0} />
            <span className="text-sm font-medium text-neutral-100">
              {currentStreak}
            </span>
          </button>
        </div>
        <Button
          isIconOnly
          variant="light"
          radius="full"
          aria-label="Open calendar"
          onPress={onCalendar}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neutral-200"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </Button>
      </div>
      <div className="py-1 flex justify-center">
        <div className="flex gap-2">
          {weekDays.map((d) =>
            d.isToday ? (
              <button
                key={d.key}
                className="p-[2px] rounded-full gradient-sleep"
              >
                <span className="w-10 h-10 rounded-full grid place-items-center text-[14px] font-medium bg-card text-neutral-100">
                  {d.label}
                </span>
              </button>
            ) : (
              <button key={d.key} className="rounded-full">
                <span className="w-10 h-10 rounded-full grid place-items-center text-[14px] font-medium bg-card text-neutral-300">
                  {d.label}
                </span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
