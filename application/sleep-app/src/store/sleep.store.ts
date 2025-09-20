import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type EnvLight = "dark" | "dim" | "bright";
export type EnvNoise = "quiet" | "moderate" | "loud";

export type SleepLog = {
  id: string;
  date: string; // ISO date representing wake date
  sleepDuration: number; // hours
  sleepQuality: number; // 1-10
  environment?: {
    temperature?: number; // °C
    lightLevel?: EnvLight;
    noiseLevel?: EnvNoise;
  };
  notes?: string;
  createdAt: string; // ISO
};

type SleepState = {
  logs: SleepLog[];
  addLog: (log: SleepLog) => void;
  removeLog: (id: string) => void;
  clearLogs: () => void;
  seedMockIfEmpty: () => void;
};

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addDays(d: Date, days: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt;
}

export const useSleepStore = create<SleepState>()(
  persist(
    (set, get) => ({
      logs: [],
      addLog: (log) =>
        set((s) => ({
          logs: [log, ...s.logs].sort((a, b) => b.date.localeCompare(a.date)),
        })),
      removeLog: (id) =>
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
      clearLogs: () => set({ logs: [] }),
      seedMockIfEmpty: () => {
        const { logs } = get();
        if (logs.length > 0) return;
        const base = new Date();
        const samples: SleepLog[] = Array.from({ length: 7 }).map((_, i) => {
          const wake = addDays(
            new Date(base.getFullYear(), base.getMonth(), base.getDate()),
            -i
          );
          const duration =
            6.5 + Math.max(0, 1.2 - i * 0.05) + (Math.random() - 0.5) * 0.6; // ~6.2-7.8h
          const quality = Math.max(
            4,
            Math.min(9, Math.round(7 + (Math.random() - 0.5) * 3))
          );
          const temp = 22 + (Math.random() - 0.5) * 3;
          const light: EnvLight =
            Math.random() > 0.7
              ? "bright"
              : Math.random() > 0.5
              ? "dim"
              : "dark";
          const noise: EnvNoise =
            Math.random() > 0.75
              ? "loud"
              : Math.random() > 0.5
              ? "moderate"
              : "quiet";
          return {
            id: uuid(),
            date: wake.toISOString().slice(0, 10),
            sleepDuration: Math.round(duration * 10) / 10,
            sleepQuality: quality,
            environment: {
              temperature: Math.round(temp * 10) / 10,
              lightLevel: light,
              noiseLevel: noise,
            },
            notes: undefined,
            createdAt: new Date().toISOString(),
          } as SleepLog;
        });
        set({ logs: samples.sort((a, b) => b.date.localeCompare(a.date)) });
      },
    }),
    {
      name: "ss_sleep_logs_v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
