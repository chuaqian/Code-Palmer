import { describe, it, expect } from "vitest";
import { extractTipsFromText, buildGeminiPrompt } from "./recommendations";

describe("extractTipsFromText", () => {
  it("parses strict JSON tips", () => {
    const text = '{"tips":["Sleep earlier.","Dim the lights."]}';
    expect(extractTipsFromText(text)).toEqual(["Sleep earlier.", "Dim the lights."]);
  });

  it("extracts from bullet-like lines", () => {
    const text = `• Maintain a consistent wake time\n- Reduce screen exposure 1h before bed\nOther line`;
    const tips = extractTipsFromText(text);
    expect(tips.length).toBeGreaterThan(0);
  });
});

describe("buildGeminiPrompt", () => {
  it("includes profile and logs", () => {
    const p = { targetSleepHours: 8, typicalBedtime: "22:30", typicalWakeTime: "06:30" };
    const logs = [
      { date: "2025-09-20", sleepDuration: 7.2, sleepQuality: 7 },
      { date: "2025-09-19", sleepDuration: 6.8, sleepQuality: 6 },
    ];
    const prompt = buildGeminiPrompt({ profile: p as any, logs: logs as any });
    expect(prompt).toContain("Profile:");
    expect(prompt).toContain("Logs:");
  });
});
