import type { SleepLog } from "@/src/store/sleep.store";

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function scoreForLog(log: SleepLog, targetSleepHours: number) {
  const durationScore = clamp(
    (log.sleepDuration / targetSleepHours) * 70,
    0,
    70
  );
  const qualityScore = clamp((log.sleepQuality / 10) * 20, 0, 20);
  let envPenalty = 0;
  const t = log.environment?.temperature;
  if (typeof t === "number" && (t < 18 || t > 24)) envPenalty -= 4;
  const light = log.environment?.lightLevel;
  if (light === "dim") envPenalty -= 2;
  if (light === "bright") envPenalty -= 6;
  const noise = log.environment?.noiseLevel;
  if (noise === "moderate") envPenalty -= 2;
  if (noise === "loud") envPenalty -= 6;
  envPenalty = Math.max(-20, envPenalty);
  return clamp(durationScore + qualityScore + envPenalty, 0, 100);
}

export function summarizeWeek(logs: SleepLog[], target: number) {
  const last7 = logs.slice(0, 7);
  if (last7.length === 0) {
    return { avgDuration: 0, avgQuality: 0, avgScore: 0 };
  }
  const sums = last7.reduce(
    (acc, l) => {
      acc.d += l.sleepDuration;
      acc.q += l.sleepQuality;
      acc.s += scoreForLog(l, target);
      return acc;
    },
    { d: 0, q: 0, s: 0 }
  );
  const n = last7.length;
  return {
    avgDuration: Math.round((sums.d / n) * 10) / 10,
    avgQuality: Math.round((sums.q / n) * 10) / 10,
    avgScore: Math.round((sums.s / n) * 1) / 1,
  };
}
