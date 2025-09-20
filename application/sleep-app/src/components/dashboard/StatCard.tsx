"use client";

import React from "react";
import { Card as HCard, CardBody } from "@heroui/react";
import { Sparkline } from "@/src/components/charts";

export default function StatCard({
  title,
  value,
  sub,
  sparklineData,
}: {
  title: string;
  value: string;
  sub?: string;
  sparklineData?: number[];
}) {
  return (
    <HCard className="bg-glass border-white/10">
      <CardBody>
        <div className="text-xs text-neutral-400">{title}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="text-xl font-semibold">{value}</div>
          {sparklineData && sparklineData.length > 1 && (
            <Sparkline data={sparklineData} />
          )}
        </div>
        {sub && <div className="text-[10px] text-neutral-500 mt-1">{sub}</div>}
      </CardBody>
    </HCard>
  );
}
