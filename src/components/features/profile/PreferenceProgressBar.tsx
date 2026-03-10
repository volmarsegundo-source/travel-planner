"use client";

import { TOTAL_PREFERENCE_CATEGORIES } from "@/lib/validations/preferences.schema";

interface PreferenceProgressBarProps {
  filledCount: number;
  /** Translate function */
  progressText: string;
}

export function PreferenceProgressBar({
  filledCount,
  progressText,
}: PreferenceProgressBarProps) {
  const total = TOTAL_PREFERENCE_CATEGORIES;
  const isComplete = filledCount >= total;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{progressText}</span>
        <span className={`font-semibold ${isComplete ? "text-atlas-teal" : "text-foreground/70"}`}>
          {filledCount}/{total}
        </span>
      </div>
      <div
        className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={filledCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={progressText}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors duration-300 ${
              i < filledCount
                ? isComplete
                  ? "bg-atlas-teal"
                  : "bg-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
