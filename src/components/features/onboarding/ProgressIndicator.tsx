"use client";

import { useTranslations } from "next-intl";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
}: ProgressIndicatorProps) {
  const t = useTranslations("onboarding");

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Text indicator */}
      <p className="text-sm text-gray-500" aria-live="polite" aria-atomic="true">
        {t("progress", { current: currentStep, total: totalSteps })}
      </p>

      {/* Visual dot indicators */}
      <div
        className="flex items-center gap-2"
        role="list"
        aria-label={t("progress", { current: currentStep, total: totalSteps })}
      >
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div
              key={stepNumber}
              role="listitem"
              aria-current={isCurrent ? "step" : undefined}
              className={[
                "h-2.5 rounded-full transition-all duration-300",
                isCompleted
                  ? "w-6 bg-gray-700"
                  : isCurrent
                    ? "w-6 bg-gray-900 ring-2 ring-gray-900 ring-offset-2"
                    : "w-2.5 bg-gray-300",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
