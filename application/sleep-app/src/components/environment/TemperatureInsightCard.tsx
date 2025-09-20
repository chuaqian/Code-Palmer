"use client";

import React, { useMemo } from "react";
import { Card as HCard, CardBody } from "@heroui/react";
import { ThermometerIcon } from "./icons";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

export default function TemperatureInsightCard({
  value,
  unit = "°C",
  data,
  status,
  min = 15,
  max = 30,
  optimalMin = 18,
  optimalMax = 24,
}: {
  value: number;
  unit?: string;
  data: number[];
  status: string;
  min?: number;
  max?: number;
  optimalMin?: number;
  optimalMax?: number;
}) {
  const avg = useMemo(() => {
    if (!data?.length) return value;
    const s = data.reduce((a, b) => a + b, 0);
    return Math.round((s / data.length) * 10) / 10;
  }, [data, value]);

  const clamped = useMemo(
    () => Math.max(min, Math.min(max, value)),
    [value, min, max]
  );
  const range = Math.max(1, max - min);

  // Segment lengths for ranges
  const coldLenAll = Math.max(0, optimalMin - min);
  const optimalLenAll = Math.max(0, optimalMax - optimalMin);
  const hotLenAll = Math.max(0, max - optimalMax);

  // Filled portion up to current value, split across segments
  const filled = Math.max(0, clamped - min);
  const filledCold = Math.min(filled, coldLenAll);
  const filledOptimal = Math.max(
    0,
    Math.min(filled - coldLenAll, optimalLenAll)
  );
  const filledHot = Math.max(
    0,
    Math.min(filled - coldLenAll - optimalLenAll, hotLenAll)
  );
  const remainder = Math.max(
    0,
    range - (filledCold + filledOptimal + filledHot)
  );

  const chartData = useMemo(() => {
    return [
      {
        label: "temperature",
        cold: Number(filledCold.toFixed(4)),
        optimal: Number(filledOptimal.toFixed(4)),
        hot: Number(filledHot.toFixed(4)),
        rest: Number(remainder.toFixed(4)),
      },
    ];
  }, [filledCold, filledOptimal, filledHot, remainder]);

  const chartConfig: ChartConfig = {
    cold: { label: "Cold", color: "#60A5FA" },
    optimal: { label: "Optimal", color: "#34D399" },
    hot: { label: "Warm/Hot", color: "#F59E0B" },
    rest: { label: "Remaining", color: "rgba(255,255,255,0.12)" },
  };

  return (
    <HCard
      className="rounded-2xl border-white/10"
      style={{ background: "#13141A", height: 180 }}
    >
      <CardBody className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <ThermometerIcon color="#60A5FA" />
            <span>Temperature</span>
          </div>
        </div>

        <div>
          {/* Radial stacked bar gauge (semicircle), small to fit card */}
          <div className="relative mx-auto">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square"
            >
              <RadialBarChart
                data={chartData}
                startAngle={180}
                endAngle={0}
                cx="50%"
                cy="62%"
                innerRadius={60}
                outerRadius={90}
              >
                {/* Center readout */}
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 6}
                              className="fill-white text-xl font-bold"
                            >
                              {Math.round(clamped * 10) / 10}
                              <tspan className="ml-1 fill-neutral-400 text-base">
                                {unit}
                              </tspan>
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 25}
                              className="fill-neutral-400 text-sm"
                            >
                              Optimal {optimalMin}–{optimalMax}
                              {unit}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </PolarRadiusAxis>

                {/* Filled segments up to current value */}
                <RadialBar
                  dataKey="cold"
                  stackId="a"
                  cornerRadius={5}
                  fill="var(--color-cold)"
                  className="stroke-transparent stroke-2"
                />
                <RadialBar
                  dataKey="optimal"
                  stackId="a"
                  cornerRadius={5}
                  fill="var(--color-optimal)"
                  className="stroke-transparent stroke-2"
                />
                <RadialBar
                  dataKey="hot"
                  stackId="a"
                  cornerRadius={5}
                  fill="var(--color-hot)"
                  className="stroke-transparent stroke-2"
                />
                {/* Remainder track */}
                <RadialBar
                  dataKey="rest"
                  stackId="a"
                  cornerRadius={5}
                  fill="var(--color-rest)"
                  className="stroke-transparent stroke-2"
                />
              </RadialBarChart>
            </ChartContainer>
          </div>
        </div>
      </CardBody>
    </HCard>
  );
}
