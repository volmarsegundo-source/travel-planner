"use client";

import { useTranslations } from "next-intl";

interface PhaseProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function PhaseProgressBar({ currentStep, totalSteps }: PhaseProgressBarProps) {
  const t = useTranslations("expedition");

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-gray-500">
        {t("progress", { current: currentStep, total: totalSteps })}
      </p>
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-2 w-8 rounded-full transition-colors ${
              i < currentStep ? "bg-primary" : "bg-gray-200"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
