"use client";

import React from "react";
import { Chip } from "@heroui/react";
import { Sparkline } from "@/src/components/charts";

export default function EnvCard({
  title,
  unit,
  value,
  status,
  color,
  data,
}: {
  title: string;
  unit: string;
  value: number;
  status: string;
  color: string;
  data: number[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-400">{title}</div>
        <Chip
          size="sm"
          className="bg-white/10 text-white border border-white/10"
        >
          {status}
        </Chip>
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-2xl font-semibold text-neutral-100">
          {Math.round(value * 10) / 10}
          <span className="ml-1 text-xs text-neutral-400">{unit}</span>
        </div>
        <Sparkline data={data} width={90} height={28} color={color} />
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden bg-white/10">
        <div
          className="h-full"
          style={{
            width: "100%",
            background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
          }}
        />
      </div>
    </div>
  );
}
