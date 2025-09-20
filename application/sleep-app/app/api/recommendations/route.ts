import { NextRequest, NextResponse } from "next/server";

// MVP: mock AI recommendations serverless route
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile, logs } = body ?? {};

    const tips: string[] = [];
    const target = profile?.targetSleepHours ?? 8;
    if (Array.isArray(logs) && logs.length > 0) {
      const avgDuration =
        logs.reduce((a: number, l: any) => a + (l.sleepDuration || 0), 0) /
        logs.length;
      if (avgDuration < target - 0.5)
        tips.push(
          `You're averaging ${avgDuration.toFixed(
            1
          )}h vs target ${target}h. Try advancing bedtime by 15–30 minutes.`
        );
      if (avgDuration > target + 0.5)
        tips.push(
          `You're sleeping longer (${avgDuration.toFixed(
            1
          )}h). Keep consistency by waking up at a steady time.`
        );

      const avgQuality =
        logs.reduce((a: number, l: any) => a + (l.sleepQuality || 0), 0) /
        logs.length;
      if (avgQuality < 7)
        tips.push(
          "Quality is below 7/10. Reduce evening screen time and keep room dark/quiet."
        );

      const envBright = logs.some(
        (l: any) => l.environment?.lightLevel === "bright"
      );
      if (envBright)
        tips.push(
          "Consider dimming lights or using blackout curtains before sleep."
        );
      const envLoud = logs.some(
        (l: any) => l.environment?.noiseLevel === "loud"
      );
      if (envLoud)
        tips.push("Use earplugs or white noise to mask loud sounds.");
    }

    if (tips.length === 0)
      tips.push(
        "Great job staying consistent. Keep your sleep window steady and avoid caffeine late."
      );

    return NextResponse.json({ tips }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "bad request" },
      { status: 400 }
    );
  }
}
