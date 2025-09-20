"use client";

import { useEffect, useMemo, useState, useId } from "react";
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

  // Header date labels
  const today = useMemo(() => new Date(), []);
  const dayName = useMemo(
    () => today.toLocaleDateString(undefined, { weekday: "long" }),
    [today]
  );
  const dateRangeLabel = useMemo(() => {
    const t = today;
    const y = new Date(t);
    y.setDate(t.getDate() - 1);
    const dT = t.getDate();
    const dY = y.getDate();
    const mT = t.toLocaleDateString(undefined, { month: "short" });
    const mY = y.toLocaleDateString(undefined, { month: "short" });
    return mT === mY ? `${dY}-${dT} ${mT}` : `${dY} ${mY} - ${dT} ${mT}`;
  }, [today]);
  const weekDays = useMemo(() => {
    const now = today;
    // Sunday as first day of week (S M T W T F S)
    const sundayIdx = now.getDay(); // 0=Sunday, 1=Monday, etc.
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - sundayIdx);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const label = d
        .toLocaleDateString(undefined, { weekday: "short" })
        .slice(0, 1);
      return {
        key: d.toISOString().slice(0, 10),
        label,
        isToday: d.toDateString() === now.toDateString(),
      } as { key: string; label: string; isToday: boolean };
    });
  }, [today]);

  const latest = logs[0];
  const latestScore = useMemo(
    () => (latest ? scoreForLog(latest, profile.targetSleepHours) : 0),
    [latest, profile.targetSleepHours]
  );

  // Progress ring config for hero card (denser)
  const heroRing = useMemo(() => {
    const size = 140; // smaller ring for denser layout
    const stroke = 12; // thinner stroke
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, Math.round(latestScore)));
    const offset = c * (1 - pct / 100);
    const cx = size / 2;
    const cy = size / 2;
    return { size, stroke, r, c, pct, offset, cx, cy };
  }, [latestScore]);
  const [dashOffset, setDashOffset] = useState(heroRing.c);
  useEffect(() => {
    // animate to target on score changes
    requestAnimationFrame(() => setDashOffset(heroRing.offset));
  }, [heroRing.offset]);

  // Helpers for hero metrics
  const fmtHM = (hours: number) => {
    const h = Math.max(0, Math.floor(hours));
    const m = Math.round((hours - h) * 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };
  const asleepHours = latest?.sleepDuration ?? 0;
  const inBedHours = asleepHours
    ? Math.min(24, Math.round((asleepHours + 0.5) * 100) / 100)
    : 0; // +~30m buffer

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
      {" "}
      {/* Regular header bar with date + calendar */}
      <header className="-mx-4 px-4">
        <div className="h-[60px] flex items-center justify-between">
          <div className="leading-tight">
            <div className="text-2xl font-semibold tracking-tight">
              {dayName}
            </div>
            <div className="text-xs text-neutral-400">{dateRangeLabel}</div>
          </div>
          <Button
            isIconOnly
            variant="light"
            radius="full"
            aria-label="Open calendar"
            onPress={() => router.push("/trends")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-200"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </Button>
        </div>
        {/* Week day selector */}
        <div className="py-1 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {weekDays.map((d) =>
              d.isToday ? (
                <button
                  key={d.key}
                  className="p-[2px] rounded-full gradient-sleep"
                >
                  <span className="w-10 h-10 rounded-full grid place-items-center text-[14px] font-medium bg-card text-neutral-100">
                    {d.label}
                  </span>
                </button>
              ) : (
                <button key={d.key} className="rounded-full">
                  <span className="w-10 h-10 rounded-full grid place-items-center text-[14px] font-medium bg-card text-neutral-300">
                    {d.label}
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      </header>
      {/* Sleep Score Hero Card */}
      <HCard className="mt-2 rounded-3xl border-white/10 bg-glass overflow-hidden">
        {/* reduced top margin */}
        <CardBody className="relative p-5 h-[200px]">
          {/* denser height */}
          {/* subtle radial glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(167,139,250,0.15), transparent 55%)",
            }}
          />

          <div className="relative h-full flex items-center gap-5">
            {/* Central progress ring */}
            <div
              className="relative grid place-items-center"
              style={{ width: heroRing.size, height: heroRing.size }}
            >
              <svg
                width={heroRing.size}
                height={heroRing.size}
                viewBox={`0 0 ${heroRing.size} ${heroRing.size}`}
              >
                <defs>
                  {/* gradient aligned from arc start to arc end to brighten at the tip */}
                  <linearGradient
                    id="scoreGrad"
                    gradientUnits="userSpaceOnUse"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--sleep-gradient-start)"
                      stopOpacity="0.8"
                    />
                    <stop
                      offset="80%"
                      stopColor="var(--sleep-gradient-end)"
                      stopOpacity="0.95"
                    />
                    <stop
                      offset="100%"
                      stopColor="#ffffff"
                      stopOpacity="0.98"
                    />
                  </linearGradient>
                  {/* subtle end glow */}
                  <radialGradient id="endGlow" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                    <stop offset="70%" stopColor="#ffffff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* background ring */}
                <circle
                  cx={heroRing.size / 2}
                  cy={heroRing.size / 2}
                  r={heroRing.r}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={heroRing.stroke}
                  fill="none"
                />
                {/* progress ring */}
                <g
                  transform={`rotate(-90 ${heroRing.size / 2} ${
                    heroRing.size / 2
                  })`}
                >
                  <circle
                    cx={heroRing.size / 2}
                    cy={heroRing.size / 2}
                    r={heroRing.r}
                    stroke="url(#scoreGrad)"
                    strokeWidth={heroRing.stroke}
                    strokeLinecap="round"
                    strokeDasharray={heroRing.c}
                    strokeDashoffset={dashOffset}
                    fill="none"
                    style={{ transition: "stroke-dashoffset 2s ease-out" }}
                  />
                </g>
              </svg>
              {/* center text */}
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-[36px] leading-none font-bold">
                    {/* slightly smaller for density */}
                    {heroRing.pct}%
                  </div>
                  <button className="mt-1.5 text-[13px] text-neutral-300 hover:text-neutral-100 transition-colors inline-flex items-center gap-1">
                    Quality
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Right side metrics */}
            <div className="flex-1 flex justify-center">
              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                {/* a bit more width for metrics */}
                <MetricBlock
                  value={fmtHM(inBedHours)}
                  label="In bed"
                  icon={<BedIcon />}
                />
                <MetricBlock
                  value={fmtHM(asleepHours)}
                  label="Asleep"
                  icon={<MoonIcon />}
                />
              </div>
            </div>
          </div>
        </CardBody>
      </HCard>
      {/* Quick Stats Grid (1x2) */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <StatCard
          title="Avg Sleep"
          value={fmtHM(inBedHours)}
          sub={week.avgScore ? `Score ${week.avgScore}` : undefined}
          sparklineData={trend.durations}
        />
        <StatCard
          title="Consistency"
          value={`${computeConsistency(logs)}%`}
          sub="variance"
        />
      </section>
      {/* Sleep Stages Timeline Chart */}
      <HCard className="mt-3 rounded-2xl bg-glass border-white/10">
        <CardHeader className="pb-2">
          <h3 className="text-lg font-medium">Sleep Stages</h3>
        </CardHeader>
        <CardBody className="p-5">
          <SleepStagesTimelineChart
            bedtime={profile.typicalBedtime}
            waketime={profile.typicalWakeTime}
            durationHours={latest?.sleepDuration ?? 7.5}
          />
          {/* consolidated breakdown below timeline */}
          <div className="mt-4">
            <SleepStagesBreakdown
              awakeH={stages ? (stages.awake / 100) * stages.hours : 0.4}
              remH={stages ? (stages.rem / 100) * stages.hours : 1.4}
              lightH={stages ? (stages.light / 100) * stages.hours : 3.8}
              deepH={stages ? (stages.deep / 100) * stages.hours : 1.3}
            />
          </div>{" "}
        </CardBody>
      </HCard>
      {/* Sleep Stages Bar Chart */}
      {stages && (
        <HCard className="mt-4 rounded-2xl bg-glass border-white/10">
          <CardBody className="p-5">
            <div className="text-xs text-neutral-400 mb-2">
              Last night • {stages.hours}h
            </div>
            <StackedBar
              height={24}
              segments={[
                { label: "Deep", value: stages.deep, color: "#6b46c1" },
                { label: "Light", value: stages.light, color: "#fbbf24" },
                { label: "REM", value: stages.rem, color: "#a78bfa" },
                { label: "Awake", value: stages.awake, color: "#fb923c" },
              ]}
            />
            <div className="flex justify-between text-[12px] text-neutral-400 mt-2">
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

// UI bits for hero metrics
function MetricBlock({
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

function BedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7v10" />
      <path d="M21 16V9a2 2 0 0 0-2-2H7a4 4 0 0 0-4 4" />
      <path d="M3 14h18" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 A7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// Sleep Stages Timeline Chart component
function SleepStagesTimelineChart({
  bedtime,
  waketime,
  durationHours,
}: {
  bedtime: string; // "HH:mm"
  waketime: string; // "HH:mm"
  durationHours: number;
}) {
  // Parse HH:mm into Date instances spanning midnight if needed
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

  // Generate smooth synthetic depth values across the night (0..1)
  const points = useMemo(() => {
    const N = 64; // resolution
    const cycles = Math.max(3, Math.round(durationHours / 1.5)); // ~90m cycles
    return Array.from({ length: N }, (_, i) => {
      const t = i / (N - 1);
      // deeper earlier, lighter later, more REM towards morning
      const wave = 0.5 + 0.45 * Math.sin(2 * Math.PI * cycles * t);
      const drift = -0.15 * t; // lighten towards morning
      const v = Math.min(1, Math.max(0, wave + drift));
      const ts = new Date(start.getTime() + t * totalMs);
      return { t, v, ts };
    });
  }, [durationHours, totalMs, start]);

  // Build bezier path
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

  // Gradient colors
  const remColor = getComputedCssVar("--rem-accent", "#a78bfa");
  const lightColor = getComputedCssVar("--light-accent", "#fbbf24");
  const deepColor = getComputedCssVar("--sleep-gradient-start", "#6b46c1");

  // Axis labels every 2h
  const twoHourMs = 2 * 60 * 60 * 1000;
  const tickDates: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime() + 1; t += twoHourMs) {
    tickDates.push(new Date(t));
  }

  // Interaction state
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
        {/* grid background */}
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
        {/* area */}
        <path d={areaD} fill={`url(#stageArea-${id})`} />
        {/* line */}
        <path
          d={pathD}
          fill="none"
          stroke={`url(#stageLine-${id})`}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* hover indicator */}
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
      {/* x-axis ticks every 2h */}
      <div className="mt-1 flex justify-between text-[12px] text-neutral-400">
        {tickDates.map((d, i) => (
          <span key={i}>{formatTime(d)}</span>
        ))}
      </div>
      {/* tooltip */}
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

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getComputedCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v?.trim() || fallback;
}

function hexWithAlpha(hex: string, alpha: number) {
  // supports #rrggbb
  if (!hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4))
    return hex;
  const to255 = (h: string) => parseInt(h.length === 1 ? h + h : h, 16);
  const r = to255(hex.length === 4 ? hex[1] : hex.slice(1, 3));
  const g = to255(hex.length === 4 ? hex[2] : hex.slice(3, 5));
  const b = to255(hex.length === 4 ? hex[3] : hex.slice(5, 7));
  return `rgba(${r},${g},${b},${alpha})`;
}

// Sleep Stages Breakdown components
function StagePill({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-[12px] text-neutral-400">{label}</span>
      </div>
      <div className="mt-1 text-[16px] font-semibold text-white">{value}</div>
    </div>
  );
}

function SleepStagesBreakdown({
  awakeH,
  remH,
  lightH,
  deepH,
}: {
  awakeH: number;
  remH: number;
  lightH: number;
  deepH: number;
}) {
  const fmt = (hours: number) => {
    const h = Math.max(0, Math.floor(hours));
    const m = Math.round((hours - h) * 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  return (
    <div className="relative">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: "#fb923c" }}
              />
              <span className="text-[12px] text-neutral-400">Awake</span>
            </div>
            <div className="text-[16px] font-semibold text-white">
              {fmt(awakeH)}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: "#a78bfa" }}
              />
              <span className="text-[12px] text-neutral-400">REM</span>
            </div>
            <div className="text-[16px] font-semibold text-white">
              {fmt(remH)}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: "#fbbf24" }}
              />
              <span className="text-[12px] text-neutral-400">Light</span>
            </div>
            <div className="text-[16px] font-semibold text-white">
              {fmt(lightH)}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: "#6b46c1" }}
              />
              <span className="text-[12px] text-neutral-400">Deep</span>
            </div>
            <div className="text-[16px] font-semibold text-white">
              {fmt(deepH)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
