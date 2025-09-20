import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Settings = {
  reminderMinutesBeforeBedtime: number; // e.g., 30
};

type SettingsState = {
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  resetSettings: () => void;
};

const defaultSettings: Settings = {
  reminderMinutesBeforeBedtime: 30,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: "ss_settings_v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
