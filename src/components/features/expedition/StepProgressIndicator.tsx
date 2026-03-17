"use client";

import { useTranslations } from "next-intl";

interface StepProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Intra-phase step progress indicator.
 * Replaces PhaseProgressBar. Shows dots for step-level progress within a phase.
 *
 * Visual: dots (gold=completed, primary=current, muted=future) + "Passo {M} de {N}" text.
 * Only rendered for multi-step phases (Phase 1, 2, 4).
 *
 * Spec ref: SPEC-UX-019 Section 4.3
 */
export function StepProgressIndicator({ currentStep, totalSteps }: StepProgressIndicatorProps) {
  const t = useTranslations("expedition");

  return (
    <div className="flex flex-col items-center gap-2" data-testid="step-progress-indicator">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("progress", { current: currentStep, total: totalSteps })}
      </p>
      <div className="flex gap-2" role="group" aria-label={t("progress", { current: currentStep, total: totalSteps })}>
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          let dotClass = "h-2.5 w-2.5 rounded-full transition-colors";

          if (stepNum < currentStep) {
            dotClass += " bg-atlas-gold"; // completed
          } else if (stepNum === currentStep) {
            dotClass += " bg-primary"; // current
          } else {
            dotClass += " bg-muted"; // future
          }

          return (
            <div
              key={i}
              className={dotClass}
              aria-hidden="true"
            />
          );
        })}
      </div>
    </div>
  );
}
