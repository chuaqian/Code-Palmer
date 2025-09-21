"use client";

import React, { PropsWithChildren } from "react";

export function SmartAlarmCard({ children }: PropsWithChildren) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-md p-4">
      {children}
    </div>
  );
}

export default SmartAlarmCard;
