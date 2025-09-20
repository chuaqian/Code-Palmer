"use client";

import React, { useId, useMemo, useState } from "react";

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getComputedCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v?.trim() || fallback;
}

function hexWithAlpha(hex: string, alpha: number) {
  if (!hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4))
    return hex;
  const to255 = (h: string) => parseInt(h.length === 1 ? h + h : h, 16);
  const r = to255(hex.length === 4 ? hex[1] : hex.slice(1, 3));
  const g = to255(hex.length === 4 ? hex[2] : hex.slice(3, 5));
  const b = to255(hex.length === 4 ? hex[3] : hex.slice(5, 7));
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function SleepStagesTimelineChart({
  bedtime,
  waketime,
  durationHours,
  disturbances,
}: {
  bedtime: string; // "HH:mm"
  waketime: string; // "HH:mm"
  durationHours: number;
  disturbances?: Array<{
    Time: string;
    "Sleep Stage": string;
    "Snore Count": number;
    "Disturbance Risk": string;
  }>;
}) {
  const parseHM = (hm: string, base: Date) => {
    const [h, m] = hm.split(":").map((n) => parseInt(n, 10));
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const base = new Date();
  let start = parseHM(bedtime, base);
  let end = parseHM(waketime, base);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  const totalMs = end.getTime() - start.getTime();

  const points = useMemo(() => {
    const N = 64;
    const cycles = Math.max(3, Math.round(durationHours / 1.5));
    return Array.from({ length: N }, (_, i) => {
      const t = i / (N - 1);
      const wave = 0.5 + 0.45 * Math.sin(2 * Math.PI * cycles * t);
      const drift = -0.15 * t;
      const v = Math.min(1, Math.max(0, wave + drift));
      const ts = new Date(start.getTime() + t * totalMs);
      return { t, v, ts };
    });
  }, [durationHours, totalMs, start]);

  const width = 340;
  const height = 200;
  const pad = 16;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const stepX = innerW / (points.length - 1);
  const pathD = useMemo(() => {
    return points
      .map((p, i, arr) => {
        const x = pad + i * stepX;
        const y = pad + innerH - p.v * innerH;
        if (i === 0) return `M ${x} ${y}`;
        const px = pad + (i - 1) * stepX;
        const py = pad + innerH - arr[i - 1].v * innerH;
        const cx1 = px + stepX / 2;
        const cy1 = py;
        const cx2 = x - stepX / 2;
        const cy2 = y;
        return ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x} ${y}`;
      })
      .join("");
  }, [points, innerH, innerW]);
  const areaD = `${pathD} L ${pad + (points.length - 1) * stepX} ${
    pad + innerH
  } L ${pad} ${pad + innerH} Z`;

  // Map disturbances (hourly snore counts) to x positions and heights
  const disturbancePoints = useMemo(() => {
    if (!disturbances || disturbances.length === 0) return [] as any[];
    const maxSnore = Math.max(...disturbances.map((d) => d["Snore Count"] || 0));
    const parseTime = (t: string) => {
      // expected formats like "11:00 PM" or "01:00 AM"
      const parts = t.trim().split(" ");
      const time = parts[0];
      const ampm = parts[1] ? parts[1].toUpperCase() : undefined;
      const [hhStr, mmStr] = time.split(":");
      let hh = Number(hhStr) % 12;
      const mm = Number(mmStr || 0);
      if (ampm === "PM") hh += 12;
      return { hh, mm };
    };

    return disturbances.map((d) => {
      const { hh, mm } = parseTime(d.Time);
      const dt = new Date(start);
      dt.setHours(hh, mm, 0, 0);
      let diff = dt.getTime() - start.getTime();
      if (diff < 0) diff += 24 * 60 * 60 * 1000; // wrap to next day
      const perc = Math.max(0, Math.min(1, diff / totalMs));
      const x = pad + perc * innerW;
      const h = maxSnore > 0 ? (d["Snore Count"] / maxSnore) * (innerH * 0.6) : 0;
      return { x, h, raw: d["Snore Count"], risk: d["Disturbance Risk"], time: d.Time };
    });
  }, [disturbances, start, totalMs, pad, innerW, innerH]);

  const remColor = getComputedCssVar("--rem-accent", "#a78bfa");
  const lightColor = getComputedCssVar("--light-accent", "#fbbf24");
  const deepColor = getComputedCssVar("--sleep-gradient-start", "#6b46c1");

  const twoHourMs = 2 * 60 * 60 * 1000;
  const tickDates: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime() + 1; t += twoHourMs) {
    tickDates.push(new Date(t));
  }

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const onMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    const target = e.currentTarget as SVGSVGElement;
    const rect = target.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX : (e as any).clientX;
    if (clientX == null) return;
    const x = clientX - rect.left;
    const clamped = Math.max(pad, Math.min(width - pad, x));
    const perc = (clamped - pad) / innerW;
    const idx = Math.round(perc * (points.length - 1));
    setHoverIdx(idx);
  };
  const stageFor = (v: number) => {
    if (v < 0.2) return "Awake";
    if (v < 0.5) return "Light";
    if (v < 0.75) return "REM";
    return "Deep";
  };

  const id = useId();
  const [activeDisturbance, setActiveDisturbance] = useState<null | {
    x: number;
    y: number;
    time: string;
    stage: string;
    raw: number;
    risk: string;
  }>(null);

  return (
    <div className="relative">
      <div className="mb-2 text-xs text-neutral-400">
        {formatTime(start)} — {formatTime(end)}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        onMouseMove={onMove as any}
        onTouchMove={onMove as any}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient
            id={`stageLine-${id}`}
            gradientUnits="userSpaceOnUse"
            x1={pad}
            y1={0}
            x2={width - pad}
            y2={0}
          >
            <stop offset="0%" stopColor={remColor} />
            <stop offset="50%" stopColor={lightColor} />
            <stop offset="100%" stopColor={deepColor} />
          </linearGradient>
          <linearGradient
            id={`stageArea-${id}`}
            gradientUnits="userSpaceOnUse"
            x1={pad}
            y1={0}
            x2={width - pad}
            y2={0}
          >
            <stop offset="0%" stopColor={hexWithAlpha(remColor, 0.2)} />
            <stop offset="50%" stopColor={hexWithAlpha(lightColor, 0.2)} />
            <stop offset="100%" stopColor={hexWithAlpha(deepColor, 0.2)} />
          </linearGradient>
        </defs>
        {Array.from({ length: 3 }).map((_, i) => {
          const y = pad + (innerH / 2) * i;
          return (
            <line
              key={i}
              x1={pad}
              x2={width - pad}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}
        <path d={areaD} fill={`url(#stageArea-${id})`} />
        <path
          d={pathD}
          fill="none"
          stroke={`url(#stageLine-${id})`}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Disturbance bars (snore counts) */}
        <g>
          {disturbancePoints.map((dp, i) => (
            <rect
              key={i}
              x={dp.x - 4}
              y={pad + innerH - dp.h}
              width={8}
              height={dp.h}
              fill={dp.raw >= 15 ? "#ef4444" : "#f59e0b"}
              opacity={0.95}
              tabIndex={0}
              role="button"
              onMouseEnter={() =>
                setActiveDisturbance({
                  x: dp.x,
                  y: pad + innerH - dp.h,
                  time: dp.time,
                  stage: dp.risk ? dp.risk : "",
                  raw: dp.raw,
                  risk: dp.risk,
                })
              }
              onMouseLeave={() => setActiveDisturbance(null)}
              onFocus={() =>
                setActiveDisturbance({
                  x: dp.x,
                  y: pad + innerH - dp.h,
                  time: dp.time,
                  stage: dp.risk ? dp.risk : "",
                  raw: dp.raw,
                  risk: dp.risk,
                })
              }
              onBlur={() => setActiveDisturbance(null)}
              onClick={() =>
                setActiveDisturbance({
                  x: dp.x,
                  y: pad + innerH - dp.h,
                  time: dp.time,
                  stage: dp.risk ? dp.risk : "",
                  raw: dp.raw,
                  risk: dp.risk,
                })
              }
            />
          ))}
        </g>
        {hoverIdx != null &&
          (() => {
            const p = points[hoverIdx]!;
            const x = pad + hoverIdx * stepX;
            const y = pad + innerH - p.v * innerH;
            return (
              <g>
                <line
                  x1={x}
                  x2={x}
                  y1={pad}
                  y2={height - pad}
                  stroke="rgba(255,255,255,0.15)"
                  strokeDasharray="4 4"
                />
                <circle cx={x} cy={y} r={5} fill="#fff" />
              </g>
            );
          })()}
      </svg>
      {/* Disturbance tooltip */}
      {activeDisturbance && (
        (() => {
          // clamp tooltip position within chart bounds
          const left = Math.max(8, Math.min(width - 160, activeDisturbance.x - 80));
          const top = Math.max(8, Math.min(height - 60, activeDisturbance.y - 40));
          return (
            <div
              className="absolute z-10 rounded-md bg-black/80 text-white text-xs px-3 py-2"
              style={{ left, top }}
            >
              <div className="font-semibold">{activeDisturbance.time}</div>
              <div className="text-neutral-300 text-[12px]">Stage: {activeDisturbance.stage}</div>
              <div className="text-[12px]">Snore count: {activeDisturbance.raw}</div>
              <div className="text-[12px]">Risk: {activeDisturbance.risk}</div>
            </div>
          );
        })()
      )}
      <div className="mt-1 flex justify-between text-[12px] text-neutral-400">
        {tickDates.map((d, i) => (
          <span key={i}>{formatTime(d)}</span>
        ))}
      </div>
      {hoverIdx != null &&
        (() => {
          const p = points[hoverIdx]!;
          const tms = start.getTime() + p.t * totalMs;
          const tdate = new Date(tms);
          return (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-black/70 px-3 py-1 text-xs text-white">
              {stageFor(p.v)} • {formatTime(tdate)}
            </div>
          );
        })()}
    </div>
  );
}
