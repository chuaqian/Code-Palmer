"use client";

import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/store/settings.store";
import { useProfileStore } from "@/store/profile.store";
import { useSleepStore } from "@/store/sleep.store";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
} from "@heroui/react";

export default function SettingsPage() {
  const router = useRouter();
  const { settings, setSettings, resetSettings } = useSettingsStore();
  const { resetProfile } = useProfileStore();
  const { logs, clearLogs } = useSleepStore();

  function exportData() {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        profile: useProfileStore.getState().profile,
        settings: useSettingsStore.getState().settings,
        logs: useSleepStore.getState().logs,
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const name = `sleepsync-export-${d.getFullYear()}${String(
        d.getMonth() + 1
      ).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      // no-op
    }
  }

  return (
    <main className="flex-1 p-4 pb-8">
      <header className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-neutral-400 mt-1">Reminders and data controls.</p>
        </div>
        <Button variant="flat" onPress={() => router.back()}>
          Back
        </Button>
      </header>

      <section className="mt-6 space-y-4">
        <Card className="bg-glass border-white/10">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium">Reminder</h2>
          </CardHeader>
          <Divider />
          <CardBody>
            <Input
              type="number"
              label="Minutes before bedtime"
              labelPlacement="outside"
              min={0}
              max={180}
              value={String(settings.reminderMinutesBeforeBedtime)}
              onChange={(e) =>
                setSettings({
                  reminderMinutesBeforeBedtime: Number(e.target.value),
                })
              }
            />
          </CardBody>
        </Card>

        <Card className="bg-glass border-white/10">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium">Data</h2>
          </CardHeader>
          <Divider />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="flat" onPress={() => resetSettings()}>
                Reset Settings
              </Button>
              <Button variant="flat" onPress={() => resetProfile()}>
                Reset Profile
              </Button>
              <Button
                variant="flat"
                className="col-span-2"
                onPress={() => clearLogs()}
              >
                Clear Sleep Logs ({logs.length})
              </Button>
              <Button
                color="success"
                className="col-span-2"
                onPress={exportData}
              >
                Export Data (JSON)
              </Button>
            </div>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
