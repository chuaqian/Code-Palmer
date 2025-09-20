"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { getSeptemberDisturbances } from "@/src/data/mockSleepData";

function fmtTimeLabel(t: string) {
  // Expect strings like "11:00 PM" or "01:00 AM"
  return t;
}

export default function BreathingDisturbancesChart({
  disturbances,
}: {
  disturbances?: Array<Record<string, any>>;
}) {
  const data = disturbances ?? getSeptemberDisturbances();
  const maxSnore = useMemo(
    () => Math.max(1, ...data.map((d) => Number(d["Snore Count"] || 0))),
    [data]
  );

  // map risk strings to numeric 0..1 (Low=0, Medium=0.5, High=1)
  const riskToNum = (r: string) => {
    if (!r) return 0;
    const s = String(r).toLowerCase();
    if (s.includes("high")) return 1;
    if (s.includes("med")) return 0.5;
    return 0;
  };

  const riskPoints = useMemo(() => data.map((d) => riskToNum(d["Disturbance Risk"])), [data]);

  // measure available container width so we can compute spacing without scrolling
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const w = containerRef.current?.getBoundingClientRect().width ?? 0;
      setContainerW(w);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const height = 160;
  const left = 40;
  const rightMargin = 20;
  const cw = containerW ?? 640; // fallback
  const right = Math.max(left + 60, cw - rightMargin);
  const plotW = Math.max(120, right - left);

  // spacing is determined by available plot width; do NOT make the chart scrollable
  const spacing = plotW / Math.max(1, data.length);
  const minLabelSpacing = 60; // minimum px between labels
  const labelStep = Math.max(1, Math.ceil(minLabelSpacing / Math.max(1, spacing)));

  const points = data.map((d, i) => {
    const x = left + i * spacing + spacing / 2;
    const snore = Number(d["Snore Count"] || 0);
    const h = Math.max(4, (snore / maxSnore) * 90);
    const y = 120 - h;
    const risk = riskToNum(d["Disturbance Risk"]);
    const ry = 20 + (1 - risk) * 100; // risk line y
    return { x, y, h, snore, risk, ry };
  });

  // build smooth path for risk line
  const riskPath = useMemo(() => {
    if (points.length === 0) return "";
    const d = points
      .map((p, i) => {
        const x = p.x;
        const y = p.ry;
        if (i === 0) return `M ${x} ${y}`;
        const px = points[i - 1].x;
        const py = points[i - 1].ry;
        const cx1 = px + (x - px) / 2;
        const cx2 = x - (x - px) / 2;
        return `C ${cx1} ${py}, ${cx2} ${y}, ${x} ${y}`;
      })
      .join(" ");
    return d;
  }, [points]);

  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-400">Yesterday night</div>
          <h4 className="text-lg font-medium">Breathing disturbances</h4>
        </div>
        <div className="text-sm text-neutral-400">Snore counts</div>
      </div>

      <div className="mt-3 rounded-lg border border-white/6 bg-white/2 p-3">
        {/* responsive chart: measure available width and fit SVG to it (no horizontal scrolling) */}
        <div ref={containerRef} className="relative w-full h-40">
          <svg viewBox={`0 0 ${cw} ${height}`} width="100%" height="100%">
            <defs>
              <linearGradient id="bdg" x1="0" x2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="riskArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* horizontal grid */}
            {Array.from({ length: 4 }).map((_, i) => {
              const y = 20 + i * 30;
              return (
                <line key={i} x1={left} x2={right} y1={y} y2={y} stroke="rgba(255,255,255,0.04)" />
              );
            })}

            {/* risk area (closed path) */}
            {points.length > 0 && (
              <path
                d={`${riskPath} L ${points[points.length - 1].x} ${height - 18} L ${points[0].x} ${height - 18} Z`}
                fill="url(#riskArea)"
              />
            )}

            {/* risk line */}
            <path d={riskPath} fill="none" stroke="#f87171" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

            {/* bars */}
            {points.map((p, i) => {
              const isActive = i === activeIdx;
              return (
                <g key={i}>
                  <rect
                    x={p.x - 8}
                    y={p.y}
                    width={16}
                    height={p.h}
                    rx={3}
                    fill={isActive ? "url(#bdg)" : "#ffb07a"}
                    opacity={isActive ? 1 : 0.95}
                    tabIndex={0}
                    onMouseEnter={() => setActiveIdx(i)}
                    onFocus={() => setActiveIdx(i)}
                    onMouseLeave={() => setActiveIdx(null)}
                    onBlur={() => setActiveIdx(null)}
                  />
                  <circle cx={p.x} cy={p.ry} r={3} fill="#f87171" opacity={Math.max(0.35, p.risk)} />
                  {i % labelStep === 0 && (
                    <text
                      x={p.x}
                      y={148}
                      textAnchor="middle"
                      fontSize={9}
                      fill="rgba(255,255,255,0.6)"
                      style={{ transform: 'translateY(0px)', writingMode: 'horizontal-tb' }}
                    >
                      {fmtTimeLabel(data[i].Time)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {activeIdx != null && (
            <div className="absolute left-4 top-2 w-[calc(100%-4rem)]">
              <div className="rounded-md bg-black/75 p-2 text-sm text-white">
                <div className="font-medium">
                  {data[activeIdx]["Time"]} — {data[activeIdx]["Sleep Stage"]}
                </div>
                <div className="text-xs mt-1">
                  Snore count: {data[activeIdx]["Snore Count"]} • Risk: {data[activeIdx]["Disturbance Risk"]}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
