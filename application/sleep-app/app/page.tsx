"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FireIcon from "@/src/components/icons/FireIcon";
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
} from "@heroui/react";
import { StackedBar } from "@/src/components/charts";
import StatCard from "@/src/components/dashboard/StatCard";
import MetricBlock from "@/src/components/dashboard/MetricBlock";
import { BedIcon, MoonIcon } from "@/src/components/dashboard/icons";
import SleepStagesTimelineChart from "@/src/components/sleep/SleepStagesTimelineChart";
import SleepStagesBreakdown from "@/src/components/sleep/SleepStagesBreakdown";
import HeaderBar from "@/src/components/dashboard/HeaderBar";
import TemperatureInsightCard from "@/src/components/environment/TemperatureInsightCard";
import HumidityInsightCard from "@/src/components/environment/HumidityInsightCard";
import LightInsightCard from "@/src/components/environment/LightInsightCard";
import SoundInsightCard from "@/src/components/environment/SoundInsightCard";
import { getSeptemberMock } from "@/src/data/mockSleepData";

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

  // ======== LIVE ENVIRONMENT (mock stream until IoT is connected) ========
  type EnvState = {
    labels: string[]; // mm:ss for last N seconds
    temp: number[]; // °C
    hum: number[]; // %RH
    lux: number[]; // lux
    dba: number[]; // dBA
  };
  const MAX_POINTS = 60; // last 60s window
  const [env, setEnv] = useState<EnvState>(() => {
    const seedLen = MAX_POINTS;
    const now = new Date();
    const mkLabels = Array.from({ length: seedLen }, (_, i) => {
      const d = new Date(now.getTime() - (seedLen - 1 - i) * 1000);
      return d.toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });
    });
    const seed = (base: number, jitter: number) =>
      Array.from(
        { length: seedLen },
        () => base + (Math.random() * 2 - 1) * jitter
      );
    return {
      labels: mkLabels,
      temp: seed(26.6, 0.15), // from sample log
      hum: seed(57.4, 0.6),
      lux: seed(5, 0.5), // DIM ≈ 5 lux
      dba: seed(30, 1.2), // QUIET ≈ 30 dBA
    };
  });

  useEffect(() => {
    const tick = () => {
      setEnv((prev) => {
        const ts = new Date().toLocaleTimeString([], {
          minute: "2-digit",
          second: "2-digit",
        });
        // gentle mean-reverting random walk per metric
        const step = (v: number, target: number, jitter: number) => {
          const drift = (target - v) * 0.03; // pull towards target
          return v + drift + (Math.random() * 2 - 1) * jitter;
        };
        const nextTemp = step(
          prev.temp[prev.temp.length - 1] ?? 26.6,
          26.6,
          0.08
        );
        const nextHum = step(prev.hum[prev.hum.length - 1] ?? 57.4, 55.0, 0.4);
        const nextLux = Math.max(
          0.1,
          step(prev.lux[prev.lux.length - 1] ?? 5, 4.5, 0.3)
        );
        const nextDba = Math.max(
          20,
          step(prev.dba[prev.dba.length - 1] ?? 30, 30, 0.8)
        );
        const push = (arr: number[], v: number) => [
          ...arr.slice(-(MAX_POINTS - 1)),
          Math.round(v * 10) / 10,
        ];
        const pushL = (arr: string[], l: string) => [
          ...arr.slice(-(MAX_POINTS - 1)),
          l,
        ];
        return {
          labels: pushL(prev.labels, ts),
          temp: push(prev.temp, nextTemp),
          hum: push(prev.hum, nextHum),
          lux: push(prev.lux, nextLux),
          dba: push(prev.dba, nextDba),
        };
      });
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const latestTemp = env.temp[env.temp.length - 1] ?? 0;
  const latestHum = env.hum[env.hum.length - 1] ?? 0;
  const latestLux = env.lux[env.lux.length - 1] ?? 0;
  const latestDba = env.dba[env.dba.length - 1] ?? 0;

  function classifyTemperature(t: number) {
    // Removed "Out of range" classification per design; bucket to Cool/Optimal/Warm
    if (t < 18) return { status: "Cool", color: "#60a5fa" };
    if (t <= 24) return { status: "Optimal", color: "#34d399" };
    return { status: "Warm", color: "#f59e0b" };
  }
  function classifyHumidity(h: number) {
    if (h < 30 || h > 70) return { status: "Out of range", color: "#ef4444" };
    if (h < 40) return { status: "Dry", color: "#60a5fa" };
    if (h <= 60) return { status: "Optimal", color: "#34d399" };
    if (h <= 70) return { status: "Humid", color: "#f59e0b" };
    return { status: "Out of range", color: "#ef4444" };
  }
  function classifyLight(lx: number) {
    if (lx < 1) return { status: "Optimal", color: "#34d399" };
    if (lx <= 10) return { status: "Dim", color: "#f59e0b" };
    return { status: "Bright", color: "#fbbf24" };
  }
  function classifySound(db: number) {
    if (db < 30) return { status: "Quiet", color: "#14b8a6" };
    if (db <= 40) return { status: "Moderate", color: "#f59e0b" };
    return { status: "Loud", color: "#ef4444" };
  }

  const tStat = classifyTemperature(latestTemp);
  const hStat = classifyHumidity(latestHum);
  const lStat = classifyLight(latestLux);
  const sStat = classifySound(latestDba);

  return (
    <main className="flex-1 p-4 pb-8">
      <HeaderBar
        dayName={dayName}
        dateRangeLabel={dateRangeLabel}
        weekDays={weekDays}
        onCalendar={() => router.push("/trends")}
        currentStreak={currentStreak}
      />
      {/* Sleep Score Hero Card */}
      <HCard className="mt-2 rounded-3xl border-white/10 bg-glass overflow-hidden">
        <CardBody className="relative p-5 h-[200px]">
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
                    {/* subtle gradient stops for the hero ring */}
                    <stop offset="0%" stopColor="#6B46C1" stopOpacity="0.95" />
                    <stop offset="60%" stopColor="#9333EA" stopOpacity="0.98" />
                    <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.9" />
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
      {/* LIVE Smart Environment Tracking */}
      <HCard className="mt-4 rounded-2xl bg-glass border-white/10">
        <CardHeader className="pb-2 flex items-center justify-between">
          <h3 className="text-lg font-medium">Smart Environment Tracking</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-3">
            <TemperatureInsightCard
              value={latestTemp}
              data={env.temp}
              status={tStat.status}
            />
            <HumidityInsightCard
              value={latestHum}
              data={env.hum}
              status={hStat.status}
            />
          </div>
        </CardBody>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <LightInsightCard
              value={latestLux}
              data={env.lux}
              status={lStat.status}
            />
            <SoundInsightCard
              value={latestDba}
              data={env.dba}
              status={sStat.status}
              unit="dBA"
            />
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

// Keep local utility functions used only within this file
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
