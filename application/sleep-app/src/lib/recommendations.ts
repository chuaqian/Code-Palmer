export type SleepProfile = {
  targetSleepHours: number;
  typicalBedtime: string; // HH:mm
  typicalWakeTime: string; // HH:mm
  name?: string;
};

export type SleepLog = {
  date: string; // ISO date
  sleepDuration: number; // hours
  sleepQuality: number; // 1-10
  environment?: {
    temperature?: number;
    lightLevel?: "dark" | "dim" | "bright";
    noiseLevel?: "quiet" | "moderate" | "loud";
  };
};

export function buildGeminiPrompt({
  profile,
  logs,
}: {
  profile: SleepProfile;
  logs: SleepLog[];
}): string {
  const last7 = (logs ?? []).slice(0, 7);
  const compact = last7.map((l) => ({
    date: l.date,
    hours: l.sleepDuration,
    quality: l.sleepQuality,
    env: {
      t: l.environment?.temperature ?? null,
      light: l.environment?.lightLevel ?? null,
      noise: l.environment?.noiseLevel ?? null,
    },
  }));

  return [
    "You are SleepSync, a concise sleep coach.",
    "Given the user profile and the last 7 nights, generate 3-5 short, specific, evidence-based recommendations to improve sleep quality.",
    "Focus on bedtime routine, schedule consistency, environment (light, noise, temperature), and lifestyle levers.",
    "Constraints:",
    "- Keep each tip to a single sentence, max ~160 characters.",
    "- Be actionable and specific to the data; avoid generic platitudes.",
    "- No medical diagnoses or sensitive claims.",
    "Return ONLY minified JSON in this exact shape: {\"tips\":[\"...\"]}",
    "Input:",
    `Profile: ${JSON.stringify({
      targetSleepHours: profile?.targetSleepHours ?? 8,
      typicalBedtime: profile?.typicalBedtime ?? "22:30",
      typicalWakeTime: profile?.typicalWakeTime ?? "06:30",
    })}`,
    `Logs: ${JSON.stringify(compact)}`,
  ].join("\n");
}

// Robust parser that accepts strict JSON or falls back to extracting bullet lines
export function extractTipsFromText(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  // Try to find a JSON object with a tips array
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      if (obj && Array.isArray(obj.tips)) {
        return obj.tips
          .map((t: unknown) => (typeof t === "string" ? t.trim() : ""))
          .filter(Boolean);
      }
    } catch {
      // continue to fallback
    }
  }

  // Fallback: split lines and take bullet-like lines
  const lines = text
    .split(/\r?\n+/)
    .map((l) => l.replace(/^[-*•\d)\s]+/, "").trim())
    .filter(Boolean);
  // Take up to 5 reasonable-length lines
  const tips = lines.filter((l) => /sleep|bed|wake|light|noise|caffeine|screen|routine|consistent|temperature/i.test(l));
  return (tips.length ? tips : lines).slice(0, 5);
}
