"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSleepStore } from "@/store/sleep.store";
import { Button, Card, CardBody, CardHeader, Divider } from "@heroui/react";
import { MultiLineChart } from "@/components/charts";

export default function TrendsPage() {
  const router = useRouter();
  const { logs } = useSleepStore();

  const { labels, durations, qualities } = useMemo(() => {
    const byDate = [...logs].reverse();
    return {
      labels: byDate.map((l) =>
        new Date(l.date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      ),
      durations: byDate.map((l) => l.sleepDuration),
      qualities: byDate.map((l) => l.sleepQuality),
    };
  }, [logs]);

  return (
    <main className="flex-1 p-4 pb-8">
      <header className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trends</h1>
          <p className="text-neutral-400 mt-1">
            Recent sleep duration and quality.
          </p>
        </div>
        <Button variant="flat" onPress={() => router.back()}>
          Back
        </Button>
      </header>

      <Card className="mt-6 bg-glass border-white/10">
        <CardHeader className="pb-2">
          <h2 className="text-lg font-medium">Charts</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          {logs.length === 0 ? (
            <p className="text-neutral-400 text-sm">
              No data yet. Add a log first.
            </p>
          ) : (
            <MultiLineChart
              labels={labels}
              datasets={[
                {
                  label: "Duration (h)",
                  data: durations,
                  color: "#14b8a6",
                  area: true,
                  gradientFrom: "rgba(20,184,166,0.25)",
                  gradientTo: "rgba(20,184,166,0.05)",
                },
                {
                  label: "Quality",
                  data: qualities,
                  color: "#818cf8",
                  area: false,
                },
              ]}
              height={220}
            />
          )}
        </CardBody>
      </Card>
    </main>
  );
}
