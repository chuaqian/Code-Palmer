import { NextRequest, NextResponse } from "next/server";
import { extractTipsFromText, buildGeminiPrompt } from "@/src/lib/recommendations";

export const dynamic = "force-dynamic"; // ensure server execution
export const runtime = "nodejs"; // ensure Node.js runtime (not edge)

// POST /api/recommendations — generate sleep insights via Gemini with safe fallback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile, logs } = body ?? {};

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // If no API key, return heuristic fallback tips
    if (!apiKey) {
      console.warn("/api/recommendations: Missing GOOGLE_GENERATIVE_AI_API_KEY; using heuristic tips");
      const tips = computeHeuristicTips(profile, logs);
      return NextResponse.json({ tips, provider: "heuristic" }, { status: 200 });
    }

    // Attempt Gemini call with tight output contract
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = buildGeminiPrompt({ profile, logs });

    // 10s timeout via Promise.race
    let text = "";
    try {
      const result = await Promise.race([
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
          safetySettings: [],
        } as any),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000)),
      ] as any);
      text = result.response?.text?.() ?? "";
    } catch (err: any) {
      // Fallback to heuristic on timeout or API error
      console.error("/api/recommendations: Gemini call failed — falling back", err?.message || err);
      const tips = computeHeuristicTips(profile, logs);
      return NextResponse.json(
        { tips, provider: "fallback", note: err?.message || "gemini error" },
        { status: 200 }
      );
    }

    const tips = extractTipsFromText(text);
    if (!tips.length) {
      // last-resort heuristic
      const hTips = computeHeuristicTips(profile, logs);
      return NextResponse.json({ tips: hTips, provider: "fallback-empty" }, { status: 200 });
    }

    console.info(`/api/recommendations: Returning ${tips.length} Gemini tips`);
    return NextResponse.json({ tips, provider: "gemini" }, { status: 200 });
  } catch (e: any) {
    console.error("/api/recommendations: Bad request", e);
    return NextResponse.json(
      { error: e?.message || "bad request" },
      { status: 400 }
    );
  }
}

// Simple local heuristics as a safe baseline
function computeHeuristicTips(profile: any, logs: any[]): string[] {
  const tips: string[] = [];
  const target = profile?.targetSleepHours ?? 8;
  if (Array.isArray(logs) && logs.length > 0) {
    const avgDuration = logs.reduce((a: number, l: any) => a + (l.sleepDuration || 0), 0) / logs.length;
    if (avgDuration < target - 0.5)
      tips.push(
        `You're averaging ${avgDuration.toFixed(1)}h vs target ${target}h. Try advancing bedtime by 15–30 minutes.`
      );
    if (avgDuration > target + 0.5)
      tips.push(
        `You're sleeping longer (${avgDuration.toFixed(1)}h). Keep consistency by waking up at a steady time.`
      );

    const avgQuality = logs.reduce((a: number, l: any) => a + (l.sleepQuality || 0), 0) / logs.length;
    if (avgQuality < 7)
      tips.push("Quality is below 7/10. Reduce evening screen time and keep room dark/quiet.");

    const envBright = logs.some((l: any) => l.environment?.lightLevel === "bright");
    if (envBright) tips.push("Consider dimming lights or using blackout curtains before sleep.");
    const envLoud = logs.some((l: any) => l.environment?.noiseLevel === "loud");
    if (envLoud) tips.push("Use earplugs or white noise to mask loud sounds.");
  }

  if (tips.length === 0)
    tips.push("Great job staying consistent. Keep your sleep window steady and avoid caffeine late.");

  return tips;
}
