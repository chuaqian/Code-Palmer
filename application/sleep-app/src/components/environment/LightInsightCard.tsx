"use client";

import React, { useMemo } from "react";
import { Card as HCard, CardBody, Chip } from "@heroui/react";
import { LightIcon } from "./icons";

export default function LightInsightCard({
  value,
  unit = "lux",
  data,
  status,
}: {
  value: number;
  unit?: string;
  data: number[];
  status: string;
}) {
  const pill = useMemo(() => {
    const s = status.toLowerCase();
    if (s.includes("optimal"))
      return {
        label: "OPTIMAL",
        className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      };
    if (s.includes("dim"))
      return {
        label: "DIM",
        className: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      };
    if (s.includes("bright"))
      return {
        label: "BRIGHT",
        className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      };
    return {
      label: status.toUpperCase(),
      className: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    };
  }, [status]);

  // mirrored gray bars to emulate breathing waveform aesthetics
  return (
    <HCard
      className="rounded-2xl border-white/10"
      style={{ background: "#13141A", height: 180 }}
    >
      <CardBody className="h-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <LightIcon color="#60A5FA" />
            <span>Light</span>
          </div>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <div className="text-white font-bold" style={{ fontSize: 36 }}>
              {Math.round(value * 10) / 10}
              <span className="ml-1 text-neutral-400 text-base">{unit}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 h-[92px] w-full flex items-center gap-[4px]">
          {data.slice(-46).map((v, i) => {
            const mag = Math.min(1, v / 20); // normalize to 0..1 for visualization
            const h = 40 + mag * 40; // total half height per side
            return (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{ width: 6 }}
              >
                <div
                  className="w-full rounded-sm bg-neutral-500/40"
                  style={{ height: h }}
                />
                <div
                  className="w-full rounded-sm bg-neutral-500/25 mt-[2px]"
                  style={{ height: h }}
                />
              </div>
            );
          })}
        </div>
      </CardBody>
    </HCard>
  );
}
