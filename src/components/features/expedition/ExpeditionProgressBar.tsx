"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { PHASE_DEFINITIONS } from "@/lib/engines/phase-config";

interface ExpeditionProgressBarProps {
  currentPhase: number;
  totalPhases: number;
  tripId?: string;
}

const PHASE_ROUTES: Record<number, string> = {
  1: "",
  2: "/phase-2",
  3: "/phase-3",
  4: "/phase-4",
  5: "/phase-5",
};

export function ExpeditionProgressBar({
  currentPhase,
  totalPhases,
  tripId,
}: ExpeditionProgressBarProps) {
  const t = useTranslations("expedition");
  const tPhases = useTranslations("gamification");
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">
        {t("phaseProgress", { current: currentPhase, total: totalPhases })}
      </p>
      <nav className="flex gap-1.5" aria-label={t("phaseProgress", { current: currentPhase, total: totalPhases })}>
        {Array.from({ length: totalPhases }, (_, i) => {
          const phaseNum = i + 1;
          const definition = PHASE_DEFINITIONS[i];
          const phaseName = definition
            ? tPhases(definition.nameKey)
            : `Phase ${phaseNum}`;

          const isPast = phaseNum < currentPhase;
          const isCurrent = phaseNum === currentPhase;
          const isNavigable = isPast && tripId && PHASE_ROUTES[phaseNum] !== undefined;

          let colorClass = "bg-muted";
          if (isPast) colorClass = "bg-atlas-teal";
          else if (isCurrent) colorClass = "bg-atlas-gold";

          if (isNavigable) {
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  router.push(
                    `/expedition/${tripId}${PHASE_ROUTES[phaseNum]}`
                  )
                }
                className={`h-2 rounded-full transition-all ${colorClass} w-6 cursor-pointer hover:-translate-y-0.5`}
                title={phaseName}
                aria-label={phaseName}
              />
            );
          }

          return (
            <div
              key={i}
              className={`h-2 rounded-full transition-colors ${colorClass} ${
                isCurrent ? "w-10" : "w-6"
              }`}
              title={isCurrent ? phaseName : undefined}
              aria-hidden="true"
            />
          );
        })}
      </nav>
    </div>
  );
}
