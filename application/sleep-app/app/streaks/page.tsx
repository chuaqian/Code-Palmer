"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSleepStore } from "@/store/sleep.store";
import { getSeptemberMock } from "@/data/mockSleepData";
import {
  Button,
  Card as HCard,
  CardBody,
  CardHeader,
  Divider,
  Card,
} from "@heroui/react";
import { LineChart } from "@/components/charts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FireIcon from "@/components/icons/FireIcon";

type DayCell = null | {
  date: Date;
  hasOptimumSleep: boolean;
  sleepDuration?: number;
  sleepQuality?: number;
};

export default function StreaksPage() {
  const router = useRouter();
  const { logs, seedMockIfEmpty } = useSleepStore();

  useEffect(() => {
    seedMockIfEmpty();
  }, [seedMockIfEmpty]);

  // Use editable mock as authoritative for the streak summary and calendar
  // while ignoring future entries (treat them as no-data). This lets
  // designers toggle `optimumSleep` in `src/data/mockSleepData.ts` and see
  // immediate results without changing persisted user data.
  const currentStreak = useMemo(() => {
    const mock = getSeptemberMock();
    const today = new Date();
    const todayStr = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    )
      .toISOString()
      .slice(0, 10);
    // keep only entries up to today
    const visible = mock.filter((m) => m.date <= todayStr);
    const source =
      visible.length > 0 ? visible : logs.filter((l) => l.date <= todayStr);
    const sorted = [...source].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    for (const log of sorted) {
      if (!log.optimumSleep) break;
      streak++;
    }
    return streak;
  }, [logs]);

  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    .toISOString()
    .slice(0, 10);

  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [selected, setSelected] = useState<null | {
    date: string;
    sleepDuration?: number;
    sleepQuality?: number;
    optimum?: boolean;
  }>(null);
  // Weekly trend data
  const trend = useMemo(() => {
    const byDate = [...logs].slice(0, 7).reverse();
    const labels = byDate.map((l) =>
      new Date(l.date).toLocaleDateString(undefined, { weekday: "short" })
    );
    const durations = byDate.map((l) => l.sleepDuration);
    return { labels, durations };
  }, [logs]);

  const trendData = useMemo(() => {
    return {
      labels: trend.labels,
      datasets: [
        {
          label: "Hours",
          data: trend.durations,
          borderColor: "#a78bfa",
          backgroundColor: undefined,
          fill: true,
          pointBackgroundColor: "#c084fc",
          pointRadius: 3,
          tension: 0.35,
        },
      ],
    };
  }, [trend.labels, trend.durations]);
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: DayCell[] = [];

    // padding blanks for week alignment (Sunday start)
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);

    const mock = getSeptemberMock();
    const visibleMock = mock.filter((m) => m.date <= todayStr);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().slice(0, 10);
      // future — show as no-data cell instead of an empty placeholder
      if (dateStr > todayStr) {
        days.push({ date, hasOptimumSleep: false });
        continue;
      }
      // prefer mock data (visible up to today) then persisted logs
      const log =
        visibleMock.find((l) => l.date === dateStr) ||
        logs.find((l) => l.date === dateStr);
      days.push({
        date,
        hasOptimumSleep: !!log?.optimumSleep,
        sleepDuration: log?.sleepDuration,
        sleepQuality: log?.sleepQuality,
      });
    }

    return days;
  }, [currentMonth, logs]);

  return (
    <main className="flex-1 p-4 pb-8">
      <header className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sleep Streaks</h1>
          <p className="text-neutral-400 mt-1">
            Track your optimal sleep consistency
          </p>
        </div>
        <Button variant="flat" onPress={() => router.back()}>
          Back
        </Button>
      </header>

      <div className="grid gap-6 mt-6">
        <Card className="bg-glass border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Current Streak</h2>
              <div className="flex items-center gap-2">
                <FireIcon className="w-6 h-6" active={currentStreak > 0} />
                <span className="text-2xl font-bold">{currentStreak}</span>
              </div>
            </div>
          </CardHeader>
          <Divider />
          <CardBody>
            <p className="text-neutral-400 text-sm">
              {currentStreak === 0
                ? "Start your streak by getting optimal sleep tonight!"
                : `You've had ${currentStreak} days of optimal sleep in a row!`}
            </p>
          </CardBody>
        </Card>

        <Card className="bg-glass border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">
                {currentMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  size="sm"
                  onPress={() =>
                    setCurrentMonth(
                      (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
                    )
                  }
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="flat"
                  size="sm"
                  onPress={() =>
                    setCurrentMonth(
                      (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
                    )
                  }
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <Divider />
          <CardBody>
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="text-center text-sm text-neutral-400 py-2"
                >
                  {d}
                </div>
              ))}

              {daysInMonth.map((cell, i) =>
                cell ? (
                  <button
                    key={i}
                    onClick={() =>
                      setSelected({
                        date: cell.date.toISOString().slice(0, 10),
                        sleepDuration: cell.sleepDuration,
                        sleepQuality: cell.sleepQuality,
                        optimum: cell.hasOptimumSleep,
                      })
                    }
                    className={`aspect-square p-2 rounded-lg relative ${
                      cell.hasOptimumSleep
                        ? "bg-teal-500/20 hover:bg-teal-500/30"
                        : cell.sleepDuration
                        ? "bg-red-500/20 hover:bg-red-500/30"
                        : "bg-neutral-800/50 hover:bg-neutral-700/50"
                    }`}
                    title={
                      cell.sleepDuration
                        ? `Sleep: ${cell.sleepDuration}h, Quality: ${
                            cell.sleepQuality
                          }/10${
                            cell.hasOptimumSleep
                              ? " (Optimal)"
                              : " (Sub-optimal)"
                          }`
                        : "No data"
                    }
                  >
                    <span
                      className={`text-sm ${
                        cell.date.toISOString().slice(0, 10) === todayStr
                          ? "font-bold"
                          : ""
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                  </button>
                ) : (
                  <div key={i} className="aspect-square" />
                )
              )}
            </div>
            {/* Weekly Sleep Trend */}
            {trend.labels.length > 0 && (
              <HCard className="mt-4 bg-glass border-white/10">
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-medium">Weekly Sleep Trend</h3>
                </CardHeader>
                <CardBody>
                  <LineChart
                    labels={trendData.labels}
                    data={trendData.datasets[0].data}
                    height={200}
                    color="#a78bfa"
                    area
                    gradientFrom="rgba(167,139,250,0.35)"
                    gradientTo="rgba(167,139,250,0.05)"
                  />
                </CardBody>
              </HCard>
            )}
            {selected && (
              <div className="mt-4 p-3 bg-neutral-900 rounded-lg border border-white/6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-400">
                      {selected.date}
                    </div>
                    <div className="text-lg font-medium">
                      {selected.sleepDuration
                        ? `${selected.sleepDuration}h`
                        : "No data"}
                    </div>
                    <div className="text-sm text-neutral-400">
                      {selected.sleepQuality
                        ? `Quality: ${selected.sleepQuality}/10`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FireIcon className="w-6 h-6" active={!!selected.optimum} />
                    <Button variant="ghost" onPress={() => setSelected(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
