import { describe, it, expect } from "vitest";
import { clamp, scoreForLog, summarizeWeek } from "./score";

const sample = {
  id: "1",
  date: "2025-09-20",
  sleepDuration: 8,
  sleepQuality: 8,
  environment: { temperature: 22, lightLevel: "dark", noiseLevel: "quiet" },
  createdAt: new Date().toISOString(),
} as const;

describe("score utils", () => {
  it("clamp bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(20, 0, 10)).toBe(10);
  });

  it("scores a good night high", () => {
    const s = scoreForLog({ ...sample }, 8);
    expect(s).toBeGreaterThan(80);
  });

  it("summarizes week averages", () => {
    const arr = [
      { ...sample, id: "a" },
      { ...sample, id: "b", sleepDuration: 7.5 },
      { ...sample, id: "c", sleepQuality: 6 },
    ];
    const res = summarizeWeek(arr as any, 8);
    expect(res.avgDuration).toBeGreaterThan(7);
    expect(res.avgQuality).toBeLessThan(8);
    expect(res.avgScore).toBeGreaterThan(60);
  });
});
