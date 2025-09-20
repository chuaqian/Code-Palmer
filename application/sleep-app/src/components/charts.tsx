"use client";

import React, { useId, useMemo } from "react";
import { motion } from "framer-motion";

type LineChartProps = {
  labels: string[];
  data: number[];
  height?: number; // px
  color?: string; // stroke color
  area?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  showDots?: boolean;
  highlightLast?: boolean;
};

export function LineChart({
  labels,
  data,
  height = 180,
  color = "#a78bfa",
  area = true,
  gradientFrom = "rgba(167,139,250,0.35)",
  gradientTo = "rgba(167,139,250,0.05)",
  showDots = true,
  highlightLast = true,
}: LineChartProps) {
  const id = useId();
  const width = 320; // responsive-ish; container can scale via CSS
  const padding = 16;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const { points, pathD, areaD } = useMemo(() => {
    const vals = data.length ? data : [0];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const stepX = innerW / Math.max(1, vals.length - 1);
    const pts = vals.map((v, i) => {
      const x = padding + i * stepX;
      const y = padding + innerH - ((v - min) / range) * innerH;
      return { x, y, v };
    });
    const d = pts
      .map((p, i, arr) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = arr[i - 1];
        const cx1 = prev.x + stepX / 2;
        const cy1 = prev.y;
        const cx2 = p.x - stepX / 2;
        const cy2 = p.y;
        return ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
      })
      .join("");
    const a = area
      ? `${d} L ${padding + (vals.length - 1) * stepX} ${
          padding + innerH
        } L ${padding} ${padding + innerH} Z`
      : undefined;
    return { points: pts, pathD: d, areaD: a };
  }, [data, innerH, innerW, padding, area]);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
          <filter
            id={`glow-${id}`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* grid lines */}
        {Array.from({ length: 4 }).map((_, i) => {
          const y = padding + (innerH / 3) * i;
          return (
            <line
              key={i}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}
        {area && areaD && (
          <motion.path
            d={areaD}
            fill={`url(#grad-${id})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
        )}
        <motion.path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2}
          filter={`url(#glow-${id})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8 }}
        />
        {showDots &&
          points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r={3} fill={color} />
              {highlightLast && idx === points.length - 1 && (
                <circle cx={p.x} cy={p.y} r={8} fill={color} opacity={0.25} />
              )}
            </g>
          ))}
      </svg>
      <div className="mt-1 grid grid-cols-7 text-[10px] text-neutral-400">
        {labels.map((l, i) => (
          <span key={i} className="text-center truncate">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

type MultiLineChartProps = {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
    area?: boolean;
    gradientFrom?: string;
    gradientTo?: string;
    showDots?: boolean;
  }>;
  height?: number;
};

export function MultiLineChart({
  labels,
  datasets,
  height = 220,
}: MultiLineChartProps) {
  const id = useId();
  const width = 340;
  const padding = 16;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const { series, min, max, stepX } = useMemo(() => {
    const allVals = datasets.flatMap((d) => d.data);
    const min = Math.min(...(allVals.length ? allVals : [0]));
    const max = Math.max(...(allVals.length ? allVals : [1]));
    const range = max - min || 1;
    const stepX = innerW / Math.max(1, labels.length - 1);
    const series = datasets.map((ds) => {
      const pts = (ds.data.length ? ds.data : [0]).map((v, i) => {
        const x = padding + i * stepX;
        const y = padding + innerH - ((v - min) / range) * innerH;
        return { x, y, v };
      });
      const d = pts
        .map((p, i, arr) => {
          if (i === 0) return `M ${p.x} ${p.y}`;
          const prev = arr[i - 1];
          const cx1 = prev.x + stepX / 2;
          const cy1 = prev.y;
          const cx2 = p.x - stepX / 2;
          const cy2 = p.y;
          return ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
        })
        .join("");
      const a = ds.area
        ? `${d} L ${padding + (labels.length - 1) * stepX} ${
            padding + innerH
          } L ${padding} ${padding + innerH} Z`
        : undefined;
      return { ds, pts, d, a };
    });
    return { series, min, max, stepX };
  }, [datasets, labels.length, innerH, innerW, padding]);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <defs>
          {datasets.map((ds, i) => (
            <linearGradient
              key={i}
              id={`ml-grad-${id}-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={ds.gradientFrom ?? "rgba(167,139,250,0.35)"}
              />
              <stop
                offset="100%"
                stopColor={ds.gradientTo ?? "rgba(167,139,250,0.05)"}
              />
            </linearGradient>
          ))}
          <filter
            id={`ml-glow-${id}`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* grid */}
        {Array.from({ length: 4 }).map((_, i) => {
          const y = padding + (innerH / 3) * i;
          return (
            <line
              key={i}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}
        {/* areas first to stay under lines */}
        {series.map((s, i) =>
          s.a ? (
            <motion.path
              key={`a-${i}`}
              d={s.a}
              fill={`url(#ml-grad-${id}-${i})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
          ) : null
        )}
        {/* lines and dots */}
        {series.map((s, i) => (
          <g key={`l-${i}`}>
            <motion.path
              d={s.d}
              fill="none"
              stroke={s.ds.color}
              strokeWidth={2}
              filter={`url(#ml-glow-${id})`}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: i * 0.05 }}
            />
            {(s.ds.showDots ?? true) &&
              s.pts.map((p, idx) => (
                <circle key={idx} cx={p.x} cy={p.y} r={3} fill={s.ds.color} />
              ))}
          </g>
        ))}
      </svg>
      <div className="mt-1 grid grid-cols-7 text-[10px] text-neutral-400">
        {labels.map((l, i) => (
          <span key={i} className="text-center truncate">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#a78bfa",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const { pathD, lastUp } = useMemo(() => {
    const vals = data.length ? data : [0];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const stepX = innerW / Math.max(1, vals.length - 1);
    const pts = vals.map((v, i) => {
      const x = padding + i * stepX;
      const y = padding + innerH - ((v - min) / range) * innerH;
      return { x, y };
    });
    const d = pts
      .map((p, i, arr) => (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`))
      .join("");
    const lastUp =
      vals.length > 1
        ? vals[vals.length - 1] - vals[vals.length - 2] >= 0
        : true;
    return { pathD: d, lastUp };
  }, [data, width, height]);

  return (
    <div className="flex items-center gap-1">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
      <span
        className={
          lastUp ? "text-green-400 text-[10px]" : "text-red-400 text-[10px]"
        }
      >
        {lastUp ? "▲" : "▼"}
      </span>
    </div>
  );
}

export function StackedBar({
  segments,
  height = 16,
  rounded = true,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  height?: number;
  rounded?: boolean;
}) {
  const total = Math.max(
    1,
    segments.reduce((s, seg) => s + seg.value, 0)
  );
  return (
    <div
      className={`w-full overflow-hidden border border-white/10 ${
        rounded ? "rounded-full" : "rounded"
      }`}
      style={{ height }}
    >
      <div className="flex w-full h-full">
        {segments.map((s, i) => (
          <motion.div
            key={i}
            title={`${s.label} ${Math.round((s.value / total) * 100)}%`}
            className="h-full"
            initial={{ width: 0 }}
            animate={{ width: `${(s.value / total) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
            style={{ backgroundColor: s.color }}
          />
        ))}
      </div>
    </div>
  );
}
