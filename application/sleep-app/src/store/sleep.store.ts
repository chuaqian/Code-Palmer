import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type EnvLight = "dark" | "dim" | "bright";
export type EnvNoise = "quiet" | "moderate" | "loud";

export type SleepLog = {
  id: string;
  date: string; // ISO date representing wake date
  sleepDuration: number; // hours
  sleepQuality: number; // 1-10
  optimumSleep?: boolean; // indicates if sleep duration and quality meet optimal criteria
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
  overwriteMock: (logs: SleepLog[]) => void;
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
        try {
          // import the constant mock data for September
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { getSeptemberMock } = require("@/data/mockSleepData");
          const samples: SleepLog[] = getSeptemberMock();
          set({ logs: samples.sort((a, b) => b.date.localeCompare(a.date)) });
        } catch (e) {
          // fallback: leave logs empty
          console.warn("Failed to load September mock data", e);
        }
      },
      overwriteMock: (newLogs: SleepLog[]) =>
        set({ logs: newLogs.sort((a, b) => b.date.localeCompare(a.date)) }),
    }),
    {
      name: "ss_sleep_logs_v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
