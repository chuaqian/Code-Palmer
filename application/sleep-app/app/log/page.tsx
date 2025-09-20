"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useSleepStore,
  type EnvLight,
  type EnvNoise,
} from "@/store/sleep.store";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Slider,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";

const LogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleepDuration: z
    .number({ required_error: "Required" })
    .min(0.5, "Too short")
    .max(16, "Too long"),
  sleepQuality: z
    .number({ required_error: "Required" })
    .min(1, "Min 1")
    .max(10, "Max 10"),
  temperature: z
    .union([z.string().length(0), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v))),
  lightLevel: z.enum(["dark", "dim", "bright"]).optional(),
  noiseLevel: z.enum(["quiet", "moderate", "loud"]).optional(),
  notes: z.string().max(400).optional(),
});

type LogForm = z.infer<typeof LogSchema>;

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function LogPage() {
  const router = useRouter();
  const addLog = useSleepStore((s) => s.addLog);

  const today = new Date();
  const isoDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
    .toISOString()
    .slice(0, 10);

  const { handleSubmit, formState, setValue, watch } = useForm<LogForm>({
    resolver: zodResolver(LogSchema),
    defaultValues: {
      date: isoDate,
      sleepDuration: 8,
      sleepQuality: 7,
      lightLevel: "dark",
      noiseLevel: "quiet",
      notes: "",
    },
    mode: "onChange",
  });

  const onSubmit = (data: LogForm) => {
    // Build SleepLog
    addLog({
      id: uuid(),
      date: data.date,
      sleepDuration: data.sleepDuration,
      sleepQuality: data.sleepQuality,
      environment:
        data.temperature || data.lightLevel || data.noiseLevel
          ? {
              temperature: data.temperature ?? undefined,
              lightLevel:
                (data.lightLevel as EnvLight | undefined) ?? undefined,
              noiseLevel:
                (data.noiseLevel as EnvNoise | undefined) ?? undefined,
            }
          : undefined,
      notes: data.notes && data.notes.length > 0 ? data.notes : undefined,
      createdAt: new Date().toISOString(),
    });
    router.push("/");
  };

  return (
    <main className="flex-1 p-4 pb-8">
      <header className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Log Sleep</h1>
          <p className="text-neutral-400 mt-1">Quickly add a sleep entry.</p>
        </div>
        <Button variant="flat" onPress={() => router.back()}>
          Cancel
        </Button>
      </header>

      <form
        className="mt-6 space-y-5"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Card className="bg-glass border-white/10">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium">Entry</h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <div>
              <Input
                type="date"
                label="Date"
                labelPlacement="outside"
                value={watch("date")}
                onChange={(e) =>
                  setValue("date", e.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              {formState.errors.date && (
                <p className="text-xs text-red-400 mt-1">
                  {formState.errors.date.message as string}
                </p>
              )}
            </div>

            <div>
              <Input
                type="number"
                label="Duration (hours)"
                labelPlacement="outside"
                min={0.5}
                max={16}
                step={0.1}
                value={String(watch("sleepDuration"))}
                onChange={(e) =>
                  setValue("sleepDuration", Number(e.target.value), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              {formState.errors.sleepDuration && (
                <p className="text-xs text-red-400 mt-1">
                  {formState.errors.sleepDuration.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-neutral-300 mb-2">
                Quality (1-10):{" "}
                <span className="font-medium text-white">
                  {watch("sleepQuality")}/10
                </span>
              </label>
              <Slider
                minValue={1}
                maxValue={10}
                step={1}
                value={watch("sleepQuality")}
                onChange={(val) =>
                  setValue("sleepQuality", Number(val), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                color="primary"
              />
              {formState.errors.sleepQuality && (
                <p className="text-xs text-red-400 mt-2">
                  {formState.errors.sleepQuality.message as string}
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="bg-glass border-white/10">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium">Environment (optional)</h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <div>
              <Input
                type="number"
                label="Temperature (°C)"
                labelPlacement="outside"
                step={0.1}
                value={
                  watch("temperature") === undefined
                    ? ""
                    : String(watch("temperature"))
                }
                onChange={(e) =>
                  setValue(
                    "temperature",
                    e.target.value === ""
                      ? (undefined as any)
                      : Number(e.target.value),
                    { shouldDirty: true, shouldValidate: true }
                  )
                }
              />
              {formState.errors.temperature && (
                <p className="text-xs text-red-400 mt-1">
                  {formState.errors.temperature.message as string}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Light"
                labelPlacement="outside"
                selectedKeys={
                  watch("lightLevel")
                    ? new Set([watch("lightLevel") as string])
                    : new Set([])
                }
                onSelectionChange={(keys) => {
                  const set = keys as Set<string> | any;
                  const val =
                    set && typeof set.size === "number" && set.size > 0
                      ? (Array.from(set)[0] as string)
                      : undefined;
                  setValue("lightLevel", (val as any) ?? undefined, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                selectionMode="single"
                placeholder="Select light level"
              >
                <SelectItem key="dark">Dark</SelectItem>
                <SelectItem key="dim">Dim</SelectItem>
                <SelectItem key="bright">Bright</SelectItem>
              </Select>

              <Select
                label="Noise"
                labelPlacement="outside"
                selectedKeys={
                  watch("noiseLevel")
                    ? new Set([watch("noiseLevel") as string])
                    : new Set([])
                }
                onSelectionChange={(keys) => {
                  const set = keys as Set<string> | any;
                  const val =
                    set && typeof set.size === "number" && set.size > 0
                      ? (Array.from(set)[0] as string)
                      : undefined;
                  setValue("noiseLevel", (val as any) ?? undefined, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                selectionMode="single"
                placeholder="Select noise level"
              >
                <SelectItem key="quiet">Quiet</SelectItem>
                <SelectItem key="moderate">Moderate</SelectItem>
                <SelectItem key="loud">Loud</SelectItem>
              </Select>
            </div>

            <div>
              <Textarea
                label="Notes"
                labelPlacement="outside"
                placeholder="Anything notable about your sleep?"
                value={watch("notes") ?? ""}
                onChange={(e) =>
                  setValue("notes", e.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                minRows={3}
              />
            </div>
          </CardBody>
        </Card>

        <Button
          type="submit"
          color="success"
          fullWidth
          isDisabled={!formState.isValid}
        >
          Save Log
        </Button>
      </form>
    </main>
  );
}
