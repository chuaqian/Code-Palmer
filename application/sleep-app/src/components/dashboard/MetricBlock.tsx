"use client";

import React from "react";

export default function MetricBlock({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-2xl font-semibold text-neutral-100">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-[13px] text-neutral-300">
        <span className="shrink-0">{icon}</span>
        <span className="inline-flex items-center gap-1">
          {label}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
