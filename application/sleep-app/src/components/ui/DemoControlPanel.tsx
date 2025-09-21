"use client";

import React from "react";
import { AlarmControlPanel } from "@/src/components/smartAlarm/alarmControlPanel";

export function DemoControlPanel({ onHaptic }: { onHaptic?: (type: "light" | "medium" | "heavy") => void }) {
  return <AlarmControlPanel onHaptic={(t) => onHaptic?.(t)} />;
}

export default DemoControlPanel;
