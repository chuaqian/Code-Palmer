"use client";

import React from "react";

export default function SleepStagesBreakdown({
  awakeH,
  remH,
  lightH,
  deepH,
}: {
  awakeH: number;
  remH: number;
  lightH: number;
  deepH: number;
}) {
  const fmt = (hours: number) => {
    const h = Math.max(0, Math.floor(hours));
    const m = Math.round((hours - h) * 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  return (
    <div className="relative">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: "#fb923c" }}
              />
              <span className="text-[12px] text-neutral-400">Awake</span>
            </div>
            <div className="text-[16px] font-semibold text-white">
              {fmt(awakeH)}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: "#a78bfa" }}
              />
              <span className="text-[12px] text-neutral-400">REM</span>
            </div>
            <div className="text-[16px] font-semibold text-white">
              {fmt(remH)}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: "#fbbf24" }}
              />
              <span className="text-[12px] text-neutral-400">Light</span>
            </div>
            <div className="text-[16px] font-semibold text-white">
              {fmt(lightH)}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: "#6b46c1" }}
              />
              <span className="text-[12px] text-neutral-400">Deep</span>
            </div>
            <div className="text-[16px] font-semibold text-white">
              {fmt(deepH)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
