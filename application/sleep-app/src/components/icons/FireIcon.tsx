"use client";

import React from "react";

export default function FireIcon({
  className = "w-6 h-6",
  // modern API
  active = false,
  activeOuter = "#ef4444",
  activeInner = "#f97316",
  inactiveOuter = "#6b7280",
  inactiveInner = "#94a3b8",
  // backward-compatible aliases
  color, // when callers pass `color` we treat it as active color
  filled, // when callers pass `filled` we treat it as active boolean
}: {
  className?: string;
  active?: boolean;
  activeOuter?: string;
  activeInner?: string;
  inactiveOuter?: string;
  inactiveInner?: string;
  // backwards compat
  color?: string;
  filled?: boolean;
}) {
  // If caller used the old `filled` prop, respect it as active=true
  const resolvedActive = !!(active || filled);
  // If caller provided a `color` prop, use it as the active flame color
  const resolvedActiveOuter = color ?? activeOuter;
  const resolvedActiveInner = color ?? activeInner;
  const outerColor = resolvedActive ? resolvedActiveOuter : inactiveOuter;
  const innerColor = resolvedActive ? resolvedActiveInner : inactiveInner;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${className} transition-colors`}
      aria-hidden
    >
      {/* Outer flame filled with outerColor */}
      <path
        d="M12 2c4 3 8 8 8 14 0 4-4 6-8 6s-8-2-8-6c0-6 4-11 8-14z"
        fill={outerColor}
      />
      {/* Inner flame filled with innerColor */}
      <path
        d="M9 14c0-2 3-4 3-7 0 3 3 5 3 7s-1.5 4-3 4-3-2-3-4z"
        fill={innerColor}
      />
    </svg>
  );
}
