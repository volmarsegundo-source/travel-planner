"use client";

import { useTranslations } from "next-intl";
import { Check, Construction } from "lucide-react";
import { PHASE_DEFINITIONS } from "@/lib/engines/phase-config";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardPhaseProgressBarProps {
  currentPhase: number;
  completedPhases: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPhaseProgressBar({
  currentPhase,
  completedPhases,
}: DashboardPhaseProgressBarProps) {
  const t = useTranslations("gamification");

  return (
    <div
      className="mt-3 flex gap-0.5 sm:gap-1"
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

        // Determine segment style
        let segmentClasses =
          "relative h-2.5 flex-1 rounded-sm transition-all";
        let indicator: React.ReactNode = null;

        if (isCompleted) {
          segmentClasses += " bg-atlas-gold";
          indicator = (
            <Check
              className="absolute -top-3.5 left-1/2 h-3 w-3 -translate-x-1/2 text-atlas-gold"
              aria-hidden="true"
            />
          );
        } else if (isCurrent) {
          segmentClasses += " bg-primary animate-pulse";
        } else if (isComingSoon) {
          segmentClasses += " bg-muted opacity-50";
          indicator = (
            <Construction
              className="absolute -top-3.5 left-1/2 h-3 w-3 -translate-x-1/2 text-muted-foreground/50"
              aria-hidden="true"
            />
          );
        } else {
          segmentClasses += " bg-muted";
        }

        const phaseName = t(phase.nameKey);
        const stateLabel = isCompleted
          ? "completed"
          : isCurrent
            ? "current"
            : isComingSoon
              ? "coming soon"
              : "upcoming";

        return (
          <div
            key={phaseNum}
            className={segmentClasses}
            aria-label={`${phaseName} — ${stateLabel}`}
            title={phaseName}
          >
            {indicator}
          </div>
        );
      })}
    </div>
  );
}
