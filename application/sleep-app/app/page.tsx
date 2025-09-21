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
import BreathingDisturbancesChart from "@/src/components/sleep/BreathingDisturbancesChart";
import HeaderBar from "@/src/components/dashboard/HeaderBar";
import TemperatureInsightCard from "@/src/components/environment/TemperatureInsightCard";
import HumidityInsightCard from "@/src/components/environment/HumidityInsightCard";
import LightInsightCard from "@/src/components/environment/LightInsightCard";
import SoundInsightCard from "@/src/components/environment/SoundInsightCard";
import { getSeptemberMock, getSeptemberDisturbances } from "@/src/data/mockSleepData";
import { esp32Controller, type ESP32SensorDataMessage } from "@/src/lib/esp32";

export default function Dashboard() {
  const router = useRouter();
  const { onboardingComplete, profile, resetProfile } = useProfileStore();
  const { logs, seedMockIfEmpty } = useSleepStore();
  const { settings } = useSettingsStore();

  const [tips, setTips] = useState<string[] | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Loading simulation for smooth app experience
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    seedMockIfEmpty();
  }, [seedMockIfEmpty]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!isLoading && !onboardingComplete) {
      router.push('/onboarding');
      return;
    }
  }, [onboardingComplete, router, isLoading]);

  // Header date labels - moved before conditional return
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

  // Removed early return for loading state to keep hook order stable

  async function fetchRecommendations() {
    try {
      setTipsLoading(true);
      setTipsError(null);
      
      // Add timeout for better UX
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, logs: logs.slice(0, 7) }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`Failed to get recommendations (${res.status})`);
      }
      
      const data: { tips: string[] } = await res.json();
      
      if (!data.tips || !Array.isArray(data.tips)) {
        throw new Error('Invalid response format');
      }
      
      setTips(data.tips);
      
      // Success feedback (optional: could add a toast notification)
      console.log(`✅ Generated ${data.tips.length} personalized recommendations`);
      
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setTipsError("Request timed out. Please try again.");
      } else {
        setTipsError(e?.message || "Failed to get recommendations. Please check your connection.");
      }
      console.error('Recommendations error:', e);
    } finally {
      setTipsLoading(false);
    }
  }

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

  // Map raw light_level (0-4095 typical) to an approximate lux scale 0–100
  // Photoresistor: higher readings = less light, so we invert the mapping
  function mapLightRawToLux(raw: number | undefined | null): number {
    if (typeof raw !== "number" || Number.isNaN(raw)) return 0;
    const clamped = Math.max(0, Math.min(4095, raw));
    const lux = ((4095 - clamped) / 4095) * 100; // inverted: higher raw = lower lux
    return Math.round(lux * 10) / 10;
  }

  // Keep mocking ambient noise (dBA) and the time labels once per second
  useEffect(() => {
    const id = setInterval(() => {
      setEnv((prev) => {
        const ts = new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });
        const step = (v: number, target: number, jitter: number) => v + (target - v) * 0.03 + (Math.random() * 2 - 1) * jitter;
        const nextDba = Math.max(20, step(prev.dba[prev.dba.length - 1] ?? 30, 30, 0.8));
        const push = (arr: number[], v: number) => [...arr.slice(-(MAX_POINTS - 1)), Math.round(v * 10) / 10];
        const pushL = (arr: string[], l: string) => [...arr.slice(-(MAX_POINTS - 1)), l];
        return {
          ...prev,
          labels: pushL(prev.labels, ts),
          dba: push(prev.dba, nextDba),
        };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to live ESP32 SSE for temp/humidity/light
  useEffect(() => {
    const unsubscribe = esp32Controller.subscribeToStream(
      (msg: ESP32SensorDataMessage | string) => {
        let obj: ESP32SensorDataMessage | null = null;
        if (typeof msg === "string") {
          try { obj = JSON.parse(msg); } catch { obj = null; }
        } else {
          obj = msg;
        }
        if (!obj || obj.type !== "sensor_data" || !obj.data) return;
        const { temperature, humidity, light_level, timestamp } = obj.data as any;
        const lux = mapLightRawToLux(light_level);
        const ts = new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });
        setEnv((prev) => {
          const push = (arr: number[], v: number) => [...arr.slice(-(MAX_POINTS - 1)), Math.round(v * 10) / 10];
          const pushL = (arr: string[], l: string) => [...arr.slice(-(MAX_POINTS - 1)), l];
          return {
            labels: pushL(prev.labels, ts),
            temp: typeof temperature === "number" ? push(prev.temp, temperature) : prev.temp,
            hum: typeof humidity === "number" ? push(prev.hum, humidity) : prev.hum,
            lux: push(prev.lux, lux),
            dba: prev.dba,
          };
        });
      },
      undefined,
      (err) => {
        // Optional: could set a banner/toast; for now keep mocks running
        console.error("SSE error:", err);
      }
    );
    return () => unsubscribe();
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

  // NOTE: Render loading via conditional JSX instead of early-return to keep hooks order identical across renders
  return isLoading ? (
    <main className="flex-1 p-4 pb-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-white/10 rounded w-1/3"></div>
        <div className="h-48 bg-white/10 rounded-3xl"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-white/10 rounded-2xl"></div>
          <div className="h-32 bg-white/10 rounded-2xl"></div>
        </div>
        <div className="h-64 bg-white/10 rounded-2xl"></div>
      </div>
    </main>
  ) : (
    <main className="flex-1 p-4 pb-8">
      <HeaderBar
        dayName={dayName}
        dateRangeLabel={dateRangeLabel}
        weekDays={weekDays}
        onCalendar={() => router.push("/trends")}
        currentStreak={currentStreak}
      />
      {/* Sleep Score Hero Card */}
      <HCard className="mt-2 rounded-3xl border-white/10 bg-gradient-to-br from-black/40 via-purple-950/20 to-black/40 backdrop-blur-xl overflow-hidden">
        <CardBody className="relative p-6 h-[240px]">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(147,51,234,0.2), transparent), radial-gradient(ellipse 60% 80% at 70% 60%, rgba(167,139,250,0.15), transparent)",
            }}
          />

          <div className="relative h-full flex items-center justify-between">
            {/* Left side: Sleep score ring with enhanced design */}
            <div className="flex items-center gap-6">
              <div
                className="relative grid place-items-center"
                style={{ width: 180, height: 180 }}
              >
                <svg
                  width={180}
                  height={180}
                  viewBox="0 0 180 180"
                  className="transform hover:scale-105 transition-transform duration-500"
                >
                  <defs>
                    <linearGradient
                      id="scoreGradient"
                      gradientUnits="userSpaceOnUse"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="1" />
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="1" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Background circle */}
                  <circle
                    cx="90"
                    cy="90"
                    r="75"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="14"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="90"
                    cy="90"
                    r="75"
                    stroke="url(#scoreGradient)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    fill="none"
                    filter="url(#glow)"
                    strokeDasharray="471.24"
                    strokeDashoffset={471.24 * (1 - latestScore / 100)}
                    transform="rotate(-90 90 90)"
                    style={{ 
                      transition: "stroke-dashoffset 2.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </svg>
                {/* Center content with enhanced typography */}
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold bg-gradient-to-br from-white via-purple-100 to-purple-200 bg-clip-text text-transparent leading-none">
                      {Math.round(latestScore)}
                    </div>
                    <div className="text-lg font-medium text-purple-200 mt-1">
                      Quality Score
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      Last night
                    </div>
                  </div>
                </div>
              </div>

              {/* Sleep metrics with better spacing */}
              <div className="flex flex-col gap-4">
                <div className="space-y-1">
                  <div className="text-xl font-medium text-neutral-200">
                    {fmtHM(asleepHours)}
                  </div>
                  <div className="text-sm text-neutral-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2a3 3 0 0 0-3 3v1H8a1 1 0 0 0 0 2h1v1a3 3 0 1 0 6 0V8h1a1 1 0 0 0 0-2h-1V5a3 3 0 0 0-3-3z"/>
                      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                    </svg>
                    Sleep Duration
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-medium text-neutral-200">
                    {fmtHM(inBedHours)}
                  </div>
                  <div className="text-sm text-neutral-400 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 7v10" />
                      <path d="M21 16V9a2 2 0 0 0-2-2H7a4 4 0 0 0-4 4" />
                      <path d="M3 14h18" />
                    </svg>
                    Time in Bed
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Quick stats */}
            <div className="flex flex-col gap-3 text-right">
              <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                <div className="text-lg font-semibold text-green-400">
                  {goalPercent}%
                </div>
                <div className="text-xs text-neutral-400">
                  Sleep Goal
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                <div className="text-lg font-semibold text-blue-400">
                  {week.avgScore || 0}
                </div>
                <div className="text-xs text-neutral-400">
                  Week Avg
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </HCard>
      {/* LIVE Smart Environment Tracking */}
      <HCard className="mt-4 rounded-2xl bg-gradient-to-br from-slate-950/80 via-purple-950/20 to-slate-950/80 border-white/10 backdrop-blur-xl">
        <CardHeader className="pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Smart Environment — LIVE
            </h3>
            <div className="flex items-center gap-2">
              <div 
                className={`w-2 h-2 rounded-full animate-pulse ${
                  latestTemp > 0 ? 'bg-green-400' : 'bg-orange-400'
                }`}
              />
              <span className="text-xs text-neutral-400">
                {latestTemp > 0 ? 'Connected' : 'Simulated'}
              </span>
            </div>
          </div>
          <div className="text-xs text-neutral-500">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
      {/* Advanced Sleep Analytics Grid */}
      <section className="mt-6 grid grid-cols-2 gap-4">
        <StatCard
          title="Sleep Debt"
          value={computeSleepDebt(logs, profile.targetSleepHours)}
          sub={`Target: ${fmtHM(profile.targetSleepHours)}`}
          sparklineData={trend.durations.map((d, i) => {
            const debt = profile.targetSleepHours - d;
            return debt;
          })}
        />
        <StatCard
          title="Consistency"
          value={`${computeConsistency(logs)}%`}
          sub="Weekly variance"
          sparklineData={trend.durations}
        />
      </section>
      
      {/* Weekly Performance Overview */}
      <HCard className="mt-4 rounded-2xl bg-gradient-to-br from-blue-950/20 via-purple-950/10 to-indigo-950/20 border-white/10">
        <CardHeader className="pb-3">
          <h3 className="text-lg font-medium">Weekly Performance</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl font-bold text-green-400">
                {week.avgScore || 0}
              </div>
              <div className="text-xs text-neutral-400 mt-1">Avg Score</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl font-bold text-blue-400">
                {fmtHM(week.avgDuration || 0)}
              </div>
              <div className="text-xs text-neutral-400 mt-1">Avg Sleep</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl font-bold text-purple-400">
                {Math.round((week.avgQuality || 0) * 10) / 10}
              </div>
              <div className="text-xs text-neutral-400 mt-1">Avg Quality</div>
            </div>
          </div>
          
          {/* Weekly trend visualization */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-neutral-400 mb-2">
              <span>Daily Sleep Duration (This Week)</span>
              <span>Target: {fmtHM(profile.targetSleepHours)}</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {weekDays.map((day, i) => {
                const duration = trend.durations[i] || 0;
                const height = Math.max(10, (duration / (profile.targetSleepHours + 2)) * 100);
                const isAboveTarget = duration >= profile.targetSleepHours;
                
                return (
                  <div key={day.key} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className={`w-full rounded-t transition-all duration-500 ${
                        isAboveTarget 
                          ? 'bg-gradient-to-t from-green-600 to-green-400' 
                          : 'bg-gradient-to-t from-orange-600 to-orange-400'
                      } ${day.isToday ? 'ring-2 ring-white/50' : ''}`}
                      style={{ height: `${height}%` }}
                    />
                    <div className={`text-[10px] ${day.isToday ? 'text-white font-medium' : 'text-neutral-400'}`}>
                      {day.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardBody>
      </HCard>
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
      {/* Enhanced AI Insights */}
      <HCard className="mt-4 bg-gradient-to-br from-violet-950/30 via-purple-950/20 to-indigo-950/30 border-white/10 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                AI Sleep Insights
              </h3>
            </div>
            {tips && tips.length > 0 && (
              <div className="text-xs text-neutral-400">
                {tips.length} recommendation{tips.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {tipsError && (
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/20">
              <div className="text-sm text-red-200 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {tipsError}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {(tips && tips.length > 0 ? tips : [
              "🌙 Try our AI-powered sleep recommendations",
              "📊 Get personalized insights based on your sleep patterns",
              "🎯 Discover ways to improve your sleep quality"
            ]).map((tip, i) => (
              <div
                key={i}
                className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-neutral-100 leading-relaxed">
                      {tip}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-purple-300 font-medium">
                        AI Insight
                      </span>
                      <div className="w-1 h-1 rounded-full bg-neutral-500"></div>
                      <span className="text-xs text-neutral-400">
                        Personalized
                      </span>
                    </div>
                  </div>
                  <svg 
                    className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-2">
            <Button
              color="secondary"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-medium"
              onPress={fetchRecommendations}
              isDisabled={tipsLoading}
              startContent={
                tipsLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )
              }
            >
              {tipsLoading ? "Generating Insights..." : "Get AI Recommendations"}
            </Button>
          </div>
        </CardBody>
      </HCard>
      {/* Breathing disturbances reflection (Yesterday) */}
      <HCard>
      <div className="mt-4">
        <BreathingDisturbancesChart disturbances={getSeptemberDisturbances()} />
      </div>
      </HCard>
      {/* Tonight's Conditions with Smart Alarm */}
      <HCard className="mt-4 bg-gradient-to-br from-emerald-950/20 via-teal-950/10 to-cyan-950/20 border-white/10 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                Tonight's Setup
              </h3>
            </div>
            <div className="text-xs text-neutral-400">
              Ready for sleep
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Bedtime and forecast */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm text-neutral-300 mb-1">Optimal bedtime</div>
              <div className="text-2xl font-bold text-emerald-400">
                {profile.typicalBedtime}
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                Based on your schedule
              </div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm text-neutral-300 mb-1">Expected quality</div>
              <div className="text-2xl font-bold text-blue-400">
                {Math.round((week.avgQuality || 7) * 10) / 10}/10
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                Weather: Clear
              </div>
            </div>
          </div>

          {/* Smart alarm controls */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border border-emerald-500/20">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="font-medium text-emerald-100">Smart Sunrise Alarm</span>
            </div>
            <div className="text-sm text-neutral-300 mb-4">
              Wake up naturally with gradual light simulation and gentle sounds
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                color="success" 
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                onPress={() => router.push("/smart-alarm")}
                startContent={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                  </svg>
                }
              >
                Set Alarm
              </Button>
              <Button 
                variant="flat" 
                className="border-emerald-500/20 hover:bg-emerald-500/10"
                onPress={async () => {
                  try {
                    await esp32Controller.triggerSunrise();
                    // Could show a toast notification here
                  } catch (error) {
                    console.error('Failed to test sunrise:', error);
                  }
                }}
                startContent={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                  </svg>
                }
              >
                Test Sunrise
              </Button>
            </div>
          </div>

          {/* Quick settings */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="flat" 
              className="border-white/10 hover:bg-white/10"
              onPress={() => router.push("/settings")}
              startContent={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h5c.552 0 1-.448 1-1s-.448-1-1-1H4c-.552 0-1 .448-1 1s.448 1 1 1zm0-6h8c.552 0 1-.448 1-1s-.448-1-1-1H4c-.552 0-1 .448-1 1s.448 1 1 1zm0-6h8c.552 0 1-.448 1-1s-.448-1-1-1H4c-.552 0-1 .448-1 1s.448 1 1 1z" />
                </svg>
              }
            >
              Sleep Settings
            </Button>
            <Button 
              variant="flat" 
              className="border-white/10 hover:bg-white/10"
              onPress={async () => {
                try {
                  await esp32Controller.nightLight();
                  // Could show a toast notification here
                } catch (error) {
                  console.error('Failed to set night light:', error);
                }
              }}
              startContent={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              }
            >
              Night Light
            </Button>
          </div>
        </CardBody>
      </HCard>
      {/* Enhanced FAB with pulse animation and better accessibility */}
      <div className="fixed right-5 bottom-20 z-50">
        <Button
          isIconOnly
          color="secondary"
          size="lg"
          className="rounded-full shadow-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transform hover:scale-110 transition-all duration-300"
          onPress={() => router.push("/log")}
          aria-label="Log tonight's sleep"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </Button>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-ping opacity-20 -z-10" />
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
