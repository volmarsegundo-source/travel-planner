"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/features/onboarding/ProgressIndicator";

const TOTAL_STEPS = 3;

interface OnboardingWizardProps {
  userName: string;
}

export function OnboardingWizard({ userName }: OnboardingWizardProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);

  function handleSkip() {
    router.push("/trips");
  }

  function handleStepCta() {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      router.push("/trips/new");
    } else {
      router.push("/trips");
    }
  }

  // step1.title uses {name} interpolation; others do not.
  function getTitle(): string {
    if (currentStep === 1) {
      return t("step1.title", { name: userName });
    }
    if (currentStep === 2) {
      return t("step2.title");
    }
    return t("step3.title");
  }

  function getSubtitle(): string {
    if (currentStep === 1) return t("step1.subtitle");
    if (currentStep === 2) return t("step2.subtitle");
    return t("step3.subtitle");
  }

  function getCtaLabel(): string {
    if (currentStep === 1) return t("step1.cta");
    if (currentStep === 2) return t("step2.cta");
    return t("step3.cta");
  }

  const ctaLabel = getCtaLabel();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {/* Step content — Tailwind transition between steps */}
        <div
          key={currentStep}
          className="mt-10 flex flex-col items-center gap-6 text-center transition-all duration-300"
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900">
            {getTitle()}
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-600">{getSubtitle()}</p>

          {/* CTA button — aria-label matches visible text */}
          <Button
            onClick={handleStepCta}
            size="lg"
            className="w-full sm:w-auto sm:min-w-48"
          >
            {ctaLabel}
          </Button>
        </div>

        {/* Skip button — present on every step */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
          >
            {t("skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
