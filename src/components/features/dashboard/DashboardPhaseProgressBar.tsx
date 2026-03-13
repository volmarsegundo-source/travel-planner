"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Check } from "lucide-react";
import { PHASE_DEFINITIONS } from "@/lib/engines/phase-config";

// ─── Types ───────────────────────────────────────────────────────────────────

const PHASE_ROUTES: Record<number, string> = {
  1: "",
  2: "/phase-2",
  3: "/phase-3",
  4: "/phase-4",
  5: "/phase-5",
  6: "/phase-6",
};

interface DashboardPhaseProgressBarProps {
  currentPhase: number;
  completedPhases: number;
  tripId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPhaseProgressBar({
  currentPhase,
  completedPhases,
  tripId,
}: DashboardPhaseProgressBarProps) {
  const t = useTranslations("gamification");
  const router = useRouter();

  return (
    <div
      className="group/bar relative mt-3 flex gap-0.5"
      role="group"
      aria-label={t("phases.progressLabel", {
        completed: completedPhases,
        total: PHASE_DEFINITIONS.length,
      })}
      data-testid="dashboard-phase-progress-bar"
    >
      {PHASE_DEFINITIONS.map((phase) => {
        const phaseNum = phase.phaseNumber;
        const isCompleted = phaseNum <= completedPhases;
        const isCurrent = phaseNum === currentPhase;
        const isComingSoon = phaseNum >= 7;

        // Determine segment style — all non-interactive (read-only)
        let segmentClasses = "relative h-2 flex-1 rounded-sm transition-all";
        let indicator: React.ReactNode = null;

        if (isCompleted) {
          segmentClasses += " bg-atlas-gold";
          indicator = (
            <Check
              className="absolute -top-3 left-1/2 h-2.5 w-2.5 -translate-x-1/2 text-atlas-gold"
              aria-hidden="true"
            />
          );
        } else if (isCurrent) {
          segmentClasses += " bg-primary motion-safe:animate-pulse";
        } else if (isComingSoon) {
          segmentClasses += " border border-dashed border-muted-foreground/30 bg-transparent opacity-50";
        } else {
          // Incomplete (upcoming)
          segmentClasses += " border border-muted-foreground/20 bg-transparent";
        }

        const phaseName = t(phase.nameKey);
        const stateLabel = isCompleted
          ? t("phases.stateCompleted")
          : isCurrent
            ? t("phases.stateCurrent")
            : isComingSoon
              ? t("phases.stateComingSoon")
              : t("phases.stateUpcoming");

        const isNavigable = (isCompleted || isCurrent) && tripId && PHASE_ROUTES[phaseNum] !== undefined;

        if (isNavigable) {
          return (
            <button
              key={phaseNum}
              type="button"
              onClick={() =>
                router.push(`/expedition/${tripId}${PHASE_ROUTES[phaseNum]}`)
              }
              className={`group/segment ${segmentClasses} cursor-pointer hover:-translate-y-0.5`}
              aria-label={`${phaseName} — ${stateLabel}`}
              title={phaseName}
              data-testid={`phase-segment-${phaseNum}`}
            >
              {indicator}
            </button>
          );
        }

        return (
          <div
            key={phaseNum}
            className={`group/segment ${segmentClasses}`}
            aria-label={`${phaseName} — ${stateLabel}`}
            title={phaseName}
            data-testid={`phase-segment-${phaseNum}`}
          >
            {indicator}
          </div>
        );
      })}
    </div>
  );
}
