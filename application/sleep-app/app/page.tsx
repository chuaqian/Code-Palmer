"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/src/store/profile.store";
import { useSleepStore } from "@/src/store/sleep.store";
import { scoreForLog, summarizeWeek } from "@/src/lib/score";
import { useSettingsStore } from "@/src/store/settings.store";
import {
  Button,
  Card as HCard,
  CardBody,
  CardHeader,
  Divider,
  Chip,
  CircularProgress,
  Progress,
} from "@heroui/react";
import { LineChart, Sparkline, StackedBar } from "@/src/components/charts";

export default function Dashboard() {
  const router = useRouter();
  const { onboardingComplete, profile, resetProfile } = useProfileStore();
  const { logs, seedMockIfEmpty } = useSleepStore();
  const { settings } = useSettingsStore();

  const [tips, setTips] = useState<string[] | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState<string | null>(null);

  useEffect(() => {
    seedMockIfEmpty();
  }, [seedMockIfEmpty]);

  const latest = logs[0];
  const latestScore = useMemo(
    () => (latest ? scoreForLog(latest, profile.targetSleepHours) : 0),
    [latest, profile.targetSleepHours]
  );
  const week = useMemo(
    () => summarizeWeek(logs, profile.targetSleepHours),
    [logs, profile.targetSleepHours]
  );

  const goalPercent = useMemo(() => {
    if (!latest) return 0;
    const pct = (latest.sleepDuration / profile.targetSleepHours) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }, [latest, profile.targetSleepHours]);

  // Reminder logic
  const reminder = useMemo(() => {
    const [hh, mm] = profile.typicalBedtime.split(":").map((v) => Number(v));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const now = new Date();
    const bedtime = new Date();
    bedtime.setHours(hh, mm, 0, 0);
    // If bedtime already passed by more than 1h, consider next day
    if (now.getTime() - bedtime.getTime() > 60 * 60 * 1000) {
      bedtime.setDate(bedtime.getDate() + 1);
    }
    const msUntil = bedtime.getTime() - now.getTime();
    const windowMs = (settings.reminderMinutesBeforeBedtime ?? 30) * 60 * 1000;
    const show = msUntil <= windowMs && msUntil > -30 * 60 * 1000; // show from reminder window until 30m after
    return show
      ? {
          minutesUntil: Math.max(0, Math.round(msUntil / 60000)),
          bedtime: `${String(hh).padStart(2, "0")}:${String(mm).padStart(
            2,
            "0"
          )}`,
        }
      : null;
  }, [profile.typicalBedtime, settings.reminderMinutesBeforeBedtime]);

  async function fetchRecommendations() {
    try {
      setTipsLoading(true);
      setTipsError(null);
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, logs: logs.slice(0, 7) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { tips: string[] } = await res.json();
      setTips(data.tips);
    } catch (e: any) {
      setTipsError(e?.message || "Failed to get recommendations");
    } finally {
      setTipsLoading(false);
    }
  }

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

  // Derive mock sleep stages distribution from latest log
  const stages = useMemo(() => {
    if (!latest) return null;
    // Simple heuristic based on quality and duration
    const q = Math.max(1, Math.min(10, latest.sleepQuality));
    const dur = latest.sleepDuration;
    let deep = 0.25 + (q - 5) * 0.02; // 15-35%
    let rem = 0.2 + (q - 5) * 0.015; // 12-30%
    let awake = 0.07 - (q - 5) * 0.01; // 2-12%
    let light = 1 - deep - rem - awake;
    const clamp = (n: number) => Math.max(0.02, Math.min(0.8, n));
    deep = clamp(deep);
    rem = clamp(rem);
    awake = clamp(awake);
    light = clamp(light);
    // Normalize
    const sum = deep + rem + light + awake;
    deep /= sum;
    rem /= sum;
    light /= sum;
    awake /= sum;
    const toPct = (v: number) => Math.round(v * 100);
    return {
      deep: toPct(deep),
      light: toPct(light),
      rem: toPct(rem),
      awake: toPct(awake),
      hours: dur,
    };
  }, [latest]);

  return (
    <main className="flex-1 p-4 pb-8">
      <header className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-neutral-300 mt-1">
            Glanceable overview of your sleep.
          </p>
        </div>
        <Button
          color="primary"
          size="sm"
          onPress={() => router.push("/onboarding")}
        >
          {onboardingComplete ? "Edit Profile" : "Start Onboarding"}
        </Button>
      </header>

      {/* Hero: Sleep Score Ring */}
      <section className="mt-6 flex flex-col items-center">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-50 gradient-sleep animate-[glow_3s_ease-in-out_infinite]"
            aria-hidden
          />
          <div className="relative rounded-full p-3 bg-glass border border-white/10">
            <CircularProgress
              aria-label="Sleep score"
              value={latestScore}
              size="lg"
              showValueLabel
              classNames={{
                svg: "w-[240px] h-[240px]",
                value: "text-[var(--text-display)] font-semibold",
                label: "text-neutral-300",
                track: "stroke-white/10",
                indicator: "text-transparent",
              }}
              className="[&_.nextui-circular-progress__indicatorPath]:stroke-[url(#sleep-grad)]"
            />
            {/* Gradient definition */}
            <svg width="0" height="0">
              <defs>
                <linearGradient id="sleep-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--sleep-gradient-start)" />
                  <stop offset="100%" stopColor="var(--sleep-gradient-end)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <p className="mt-3 text-neutral-400 text-sm">Last night</p>
      </section>

      {!onboardingComplete && (
        <HCard className="mt-4 bg-yellow-500/10 border-yellow-500/20">
          <CardBody>
            <p className="text-sm text-yellow-200">
              You haven’t completed onboarding yet. Set your sleep goal and
              schedule to personalize your insights.
            </p>
            <Button
              color="primary"
              className="mt-3"
              fullWidth
              onPress={() => router.push("/onboarding")}
            >
              Start Onboarding
            </Button>
          </CardBody>
        </HCard>
      )}

      {reminder && (
        <div className="mt-4 rounded-xl border border-white/10 bg-glass text-teal-200 p-4">
          <p className="text-sm">
            Bedtime at {reminder.bedtime}.{" "}
            {reminder.minutesUntil > 0 ? `${reminder.minutesUntil} min` : "Now"}{" "}
            until wind down.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Button color="success" onPress={() => router.push("/log")}>
              Log Sleep
            </Button>
            <Button variant="flat" onPress={() => router.push("/settings")}>
              Reminder Settings
            </Button>
          </div>
        </div>
      )}

      {/* Quick Stats Grid (2x2) */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <StatCard
          title="Avg Sleep"
          value={`${week.avgDuration || 0}h`}
          sub={week.avgScore ? `Score ${week.avgScore}` : undefined}
          sparklineData={trend.durations}
        />
        <StatCard
          title="Sleep Debt"
          value={computeSleepDebt(logs, profile.targetSleepHours)}
          sub="vs goal"
        />
        <StatCard
          title="Consistency"
          value={`${computeConsistency(logs)}%`}
          sub="variance"
        />
        <StatCard title="Quality (7d)" value={`${week.avgQuality || 0}/10`} />
      </section>

      {/* Sleep Stages Bar Chart */}
      {stages && (
        <HCard className="mt-4 bg-glass border-white/10">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-medium">Sleep Stages</h3>
          </CardHeader>
          <Divider />
          <CardBody>
            <div className="text-xs text-neutral-400 mb-2">
              Last night • {stages.hours}h
            </div>
            <StackedBar
              height={24}
              segments={[
                { label: "Deep", value: stages.deep, color: "#4C1D95" },
                { label: "Light", value: stages.light, color: "#7C3AED" },
                { label: "REM", value: stages.rem, color: "#A78BFA" },
                { label: "Awake", value: stages.awake, color: "#FB923C" },
              ]}
            />
            <div className="flex justify-between text-[10px] text-neutral-400 mt-2">
              <span>Deep</span>
              <span>Light</span>
              <span>REM</span>
              <span>Awake</span>
            </div>
          </CardBody>
        </HCard>
      )}

      {/* Weekly Sleep Trend */}
      {trend.labels.length > 0 && (
        <HCard className="mt-4 bg-glass border-white/10">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-medium">Weekly Sleep Trend</h3>
          </CardHeader>
          <Divider />
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

      {/* Insights Carousel */}
      <HCard className="mt-4 bg-glass border-white/10">
        <CardHeader className="pb-2">
          <h3 className="text-lg font-medium">AI Insights</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2">
            {(tips && tips.length
              ? tips
              : ["Tap Get Recommendations to generate insights."]
            ).map((t, i) => (
              <div
                key={i}
                className="min-w-[80%] snap-center rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#a78bfa]" />{" "}
                  Insight
                </div>
                <p className="mt-2 text-neutral-100 text-sm">{t}</p>
                <Button size="sm" variant="flat" className="mt-3">
                  Learn more
                </Button>
              </div>
            ))}
          </div>
          <Button
            color="primary"
            className="mt-3"
            fullWidth
            onPress={fetchRecommendations}
            isDisabled={tipsLoading}
          >
            {tipsLoading ? "Generating…" : "Get Recommendations"}
          </Button>
        </CardBody>
      </HCard>

      {/* Tonight's Conditions Preview */}
      <HCard className="mt-4 bg-glass border-white/10">
        <CardHeader className="pb-2">
          <h3 className="text-lg font-medium">Tonight</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="text-sm text-neutral-300">Optimal bedtime</div>
          <div className="text-2xl font-semibold mt-1">
            {profile.typicalBedtime}
          </div>
          <div className="text-xs text-neutral-500 mt-2">
            Expected quality: {week.avgQuality || 0}/10 • Weather: clear
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Button color="success" onPress={() => router.push("/log")}>
              Set Smart Alarm
            </Button>
            <Button variant="flat" onPress={() => router.push("/settings")}>
              Reminder Settings
            </Button>
          </div>
        </CardBody>
      </HCard>

      {/* FAB Quick Entry */}
      <div className="fixed right-5 bottom-20">
        <Button
          isIconOnly
          color="secondary"
          className="rounded-full shadow-lg animate-[pulse_2s_infinite]"
          onPress={() => router.push("/log")}
        >
          +
        </Button>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <HCard>
      <CardBody>{children}</CardBody>
    </HCard>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between mt-2 first:mt-0">
      <span className="text-neutral-300">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function EnvMini({
  title,
  value,
}: {
  title: string;
  value: string;
  accent?: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5">
      <div className="text-xs text-neutral-400">{title}</div>
      <div className="text-base font-semibold mt-1">{value}</div>
    </div>
  );
}

// Helpers for quick stats
function StatCard({
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

function computeSleepDebt(logs: any[], target: number) {
  const last7 = logs.slice(0, 7);
  if (last7.length === 0) return "0h";
  const total = last7.reduce((s, l) => s + (l.sleepDuration || 0), 0);
  const goal = target * last7.length;
  const diff = Math.round((total - goal) * 10) / 10;
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff}h`;
}

function computeConsistency(logs: any[]) {
  const last7 = logs.slice(0, 7);
  if (last7.length <= 1) return 100;
  const durations = last7.map((l) => l.sleepDuration || 0);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance =
    durations.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / durations.length;
  const std = Math.sqrt(variance);
  const maxStd = 2; // cap for UI
  const consistency = Math.max(
    0,
    Math.min(100, Math.round(100 - (std / maxStd) * 100))
  );
  return consistency;
}
