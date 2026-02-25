"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plane, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "./ProgressIndicator";

const TOTAL_STEPS = 3;

interface OnboardingWizardProps {
  userName?: string | null;
}

export function OnboardingWizard({ userName }: OnboardingWizardProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isExiting, setIsExiting] = useState(false);

  const firstName = userName?.split(" ")[0] ?? "viajante";

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      handleComplete();
    }
  }

  function handleSkip() {
    router.push("/trips");
  }

  function handleComplete() {
    setIsExiting(true);
    router.push("/trips?onboarding=done");
  }

  const steps = [
    {
      icon: <Plane className="h-12 w-12 text-orange-500" aria-hidden="true" />,
      title: t("step1.title", { name: firstName }),
      description: t("step1.description"),
      cta: t("step1.cta"),
    },
    {
      icon: <MapPin className="h-12 w-12 text-orange-500" aria-hidden="true" />,
      title: t("step2.title"),
      description: t("step2.description"),
      cta: t("step2.cta"),
    },
    {
      icon: (
        <Sparkles className="h-12 w-12 text-orange-500" aria-hidden="true" />
      ),
      title: t("step3.title"),
      description: t("step3.description"),
      cta: t("step3.cta"),
    },
  ];

  const current = steps[step - 1]!;

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50 px-4 transition-opacity duration-300 ${isExiting ? "opacity-0" : "opacity-100"}`}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Progress */}
        <ProgressIndicator current={step} total={TOTAL_STEPS} />

        {/* Step content */}
        <div
          key={step}
          className="mt-8 flex flex-col items-center text-center transition-all duration-300"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
            {current.icon}
          </div>
          <h1 className="mb-3 text-xl font-bold text-gray-900">
            {current.title}
          </h1>
          <p className="text-sm leading-relaxed text-gray-500">
            {current.description}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Button
            className="w-full bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500"
            onClick={step === TOTAL_STEPS ? handleComplete : handleNext}
          >
            {current.cta}
          </Button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full rounded-md py-2 text-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            {t("skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
