"use client";

import React, { useMemo } from "react";
import { Card as HCard, CardBody, Chip } from "@heroui/react";
import { DropletIcon } from "./icons";

export default function HumidityInsightCard({
  value,
  unit = "%RH",
  data,
  status,
}: {
  value: number;
  unit?: string;
  data: number[];
  status: string;
}) {
  const median = useMemo(() => {
    if (!data?.length) return value;
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const m =
      sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return Math.round(m * 10) / 10;
  }, [data, value]);

  const pill = useMemo(() => {
    const s = status.toLowerCase();
    if (s.includes("optimal"))
      return {
        label: "OPTIMAL",
        className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      };
    if (s.includes("dry"))
      return {
        label: "DRY",
        className: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      };
    if (s.includes("humid"))
      return {
        label: "HUMID",
        className: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      };
    return {
      label: status.toUpperCase(),
      className: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    };
  }, [status]);
  // simple vertical bar series like a gentle Grafana but softer
  return (
    <HCard
      className="rounded-2xl border-white/10 overflow-hidden"
      style={{ background: "#13141A", height: 180 }}
    >
      <CardBody className="h-full p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <DropletIcon color="#60A5FA" />
            <span>Humidity</span>
          </div>
        </div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-white font-bold" style={{ fontSize: 28 }}>
              {Math.round(value * 10) / 10}
              <span className="ml-1 text-neutral-400 text-sm">{unit}</span>
            </div>
            <div className="text-xs" style={{ color: "#9CA3AF" }}>
              Median {median}
              {unit}
            </div>
          </div>
        </div>
        {/* Bars */}
        <div className="flex-1 flex items-end justify-center">
          <div className="h-[55px] w-full flex items-end gap-[2px] overflow-hidden">
            {data.slice(-32).map((v, i) => {
              const h = Math.min(55, Math.max(3, (v / 100) * 55));
              return (
                <div
                  key={i}
                  title={`${v.toFixed(1)}${unit}`}
                  className="rounded-sm bg-[#FB923C]/80 hover:bg-[#FB923C] transition-colors flex-1 min-w-[1px] max-w-[4px]"
                  style={{ height: h }}
                />
              );
            })}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-neutral-500 mt-2">
          <span>11:59 PM</span>
          <span>7:15 AM</span>
        </div>
      </CardBody>
    </HCard>
  );
}
