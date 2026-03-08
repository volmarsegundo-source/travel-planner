"use client";

import { useTranslations } from "next-intl";

interface ExpeditionProgressBarProps {
  currentPhase: number;
  totalPhases: number;
}

export function ExpeditionProgressBar({
  currentPhase,
  totalPhases,
}: ExpeditionProgressBarProps) {
  const t = useTranslations("expedition");

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">
        {t("phaseProgress", { current: currentPhase, total: totalPhases })}
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: totalPhases }, (_, i) => {
          const phaseNum = i + 1;
          let colorClass = "bg-muted";
          if (phaseNum < currentPhase) colorClass = "bg-atlas-teal";
          else if (phaseNum === currentPhase) colorClass = "bg-atlas-gold";

          return (
            <div
              key={i}
              className={`h-2 rounded-full transition-colors ${colorClass} ${
                phaseNum === currentPhase ? "w-10" : "w-6"
              }`}
              aria-hidden="true"
            />
          );
        })}
      </div>
    </div>
  );
}
