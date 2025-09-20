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
      className="rounded-2xl border-white/10"
      style={{ background: "#13141A", height: 180 }}
    >
      <CardBody className="h-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <DropletIcon color="#60A5FA" />
            <span>Humidity</span>
          </div>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <div className="text-white font-bold" style={{ fontSize: 36 }}>
              {Math.round(value * 10) / 10}
              <span className="ml-1 text-neutral-400 text-base">{unit}</span>
            </div>
            <div className="text-sm" style={{ color: "#9CA3AF" }}>
              Median {median}
              {unit}
            </div>
          </div>
        </div>
        {/* Bars */}
        <div className="mt-3 h-[72px] w-full flex items-end gap-[3px]">
          {data.slice(-48).map((v, i) => {
            const h = Math.min(72, Math.max(4, (v / 100) * 72));
            return (
              <div
                key={i}
                title={`${v.toFixed(1)}${unit}`}
                className="rounded-sm bg-[#FB923C]/80 hover:bg-[#FB923C] transition-colors"
                style={{ height: h, width: 6 }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
          <span>11:59 PM</span>
          <span>7:15 AM</span>
        </div>
      </CardBody>
    </HCard>
  );
}
