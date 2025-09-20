import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Profile = {
  name?: string;
  targetSleepHours: number; // default 8
  typicalBedtime: string; // "HH:mm"
  typicalWakeTime: string; // "HH:mm"
};

type ProfileState = {
  profile: Profile;
  onboardingComplete: boolean;
  setProfile: (p: Partial<Profile>) => void;
  setOnboardingComplete: (v: boolean) => void;
  resetProfile: () => void;
};

const defaultProfile: Profile = {
  targetSleepHours: 8,
  typicalBedtime: "23:00",
  typicalWakeTime: "07:00",
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      onboardingComplete: false,
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),
      resetProfile: () =>
        set({ profile: defaultProfile, onboardingComplete: false }),
    }),
    {
      name: "ss_profile_v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
