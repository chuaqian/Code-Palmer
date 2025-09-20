"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProfileStore } from "@/store/profile.store";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Slider,
  Input,
} from "@heroui/react";

const ProfileSchema = z.object({
  targetSleepHours: z.number().min(5).max(12),
  typicalBedtime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  typicalWakeTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
});

type ProfileForm = z.infer<typeof ProfileSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, setProfile, setOnboardingComplete } = useProfileStore();
  const [step, setStep] = useState(0);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      targetSleepHours: profile.targetSleepHours,
      typicalBedtime: profile.typicalBedtime,
      typicalWakeTime: profile.typicalWakeTime,
    },
    mode: "onChange",
  });

  const onNext = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    if (step < 1) setStep(step + 1);
  };

  const onBack = () => setStep(Math.max(0, step - 1));

  const onFinish = async (data: ProfileForm) => {
    setProfile({
      targetSleepHours: data.targetSleepHours,
      typicalBedtime: data.typicalBedtime,
      typicalWakeTime: data.typicalWakeTime,
    });
    setOnboardingComplete(true);
    router.push("/"); // Later: /dashboard
  };

  return (
    <main className="flex-1 p-4 pb-8">
      <header className="mt-4">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="text-neutral-400 mt-1">Set your goals and schedule.</p>
      </header>

      <div className="mt-6">
        <Progress step={step} />
      </div>

      <form
        className="mt-6 space-y-8"
        onSubmit={form.handleSubmit(onFinish)}
        noValidate
      >
        {step === 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Sleep goal</h2>
            <Card>
              <CardBody>
                <label className="block text-sm text-neutral-300 mb-2">
                  Target hours:{" "}
                  <span className="font-medium text-white">
                    {form.watch("targetSleepHours")} h
                  </span>
                </label>
                <Slider
                  minValue={6}
                  maxValue={10}
                  step={0.5}
                  value={form.watch("targetSleepHours")}
                  onChange={(val) =>
                    form.setValue("targetSleepHours", Number(val), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  color="primary"
                />
                {form.formState.errors.targetSleepHours && (
                  <p className="text-xs text-red-400 mt-2">
                    {form.formState.errors.targetSleepHours.message}
                  </p>
                )}
              </CardBody>
            </Card>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Typical schedule</h2>
            <Card>
              <CardBody className="space-y-4">
                <Input
                  type="time"
                  label="Bedtime"
                  labelPlacement="outside"
                  value={form.watch("typicalBedtime")}
                  onChange={(e) =>
                    form.setValue("typicalBedtime", e.target.value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                {form.formState.errors.typicalBedtime && (
                  <p className="text-xs text-red-400 mt-1">
                    {form.formState.errors.typicalBedtime.message}
                  </p>
                )}
                <Input
                  type="time"
                  label="Wake time"
                  labelPlacement="outside"
                  value={form.watch("typicalWakeTime")}
                  onChange={(e) =>
                    form.setValue("typicalWakeTime", e.target.value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                {form.formState.errors.typicalWakeTime && (
                  <p className="text-xs text-red-400 mt-1">
                    {form.formState.errors.typicalWakeTime.message}
                  </p>
                )}
              </CardBody>
            </Card>
          </section>
        )}

        <nav className="grid grid-cols-2 gap-3">
          <Button variant="flat" onPress={onBack} isDisabled={step === 0}>
            Back
          </Button>
          {step < 1 ? (
            <Button color="primary" onPress={onNext}>
              Next
            </Button>
          ) : (
            <Button color="success" type="submit">
              Finish
            </Button>
          )}
        </nav>
      </form>
    </main>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 flex-1 rounded-full ${
          step >= 0 ? "bg-indigo-500" : "bg-neutral-800"
        }`}
        aria-hidden
      />
      <span
        className={`h-2 flex-1 rounded-full ${
          step >= 1 ? "bg-indigo-500" : "bg-neutral-800"
        }`}
        aria-hidden
      />
    </div>
  );
}
