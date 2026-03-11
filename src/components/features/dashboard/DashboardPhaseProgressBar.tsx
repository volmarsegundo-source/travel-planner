"use client";

import { useTranslations } from "next-intl";
import { Check, Construction } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PHASE_DEFINITIONS } from "@/lib/engines/phase-config";

// ─── Types ───────────────────────────────────────────────────────────────────

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
        const isClickable = tripId && (isCompleted || isCurrent);

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
            <>
              <Construction
                className="absolute -top-3.5 left-1/2 h-3 w-3 -translate-x-1/2 text-muted-foreground/50"
                aria-hidden="true"
              />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-muted-foreground/60 hidden sm:block">
                {t("phases.comingSoon")}
              </span>
            </>
          );
        } else {
          segmentClasses += " bg-muted";
        }

        if (isClickable) {
          segmentClasses += " cursor-pointer hover:opacity-80";
        }

        const phaseName = t(phase.nameKey);
        const stateLabel = isCompleted
          ? "completed"
          : isCurrent
            ? "current"
            : isComingSoon
              ? "coming soon"
              : "upcoming";

        // Phase label tooltip (T-S21-008)
        const phaseLabel = (
          <span
            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground/90 px-1.5 py-0.5 text-[10px] text-background hidden sm:block transition-opacity sm:opacity-100"
            aria-hidden="true"
            data-testid={`phase-label-${phaseNum}`}
          >
            {phaseName}
          </span>
        );

        if (isClickable) {
          const phaseHref = phaseNum === 1
            ? `/expedition/${tripId}`
            : `/expedition/${tripId}/phase-${phaseNum}`;
          return (
            <Link
              key={phaseNum}
              href={phaseHref}
              className={`group/segment ${segmentClasses}`}
              aria-label={`${phaseName} — ${stateLabel}`}
              title={phaseName}
            >
              {indicator}
              {phaseLabel}
            </Link>
          );
        }

        return (
          <div
            key={phaseNum}
            className={`group/segment ${segmentClasses}`}
            aria-label={`${phaseName} — ${stateLabel}`}
            title={phaseName}
          >
            {indicator}
            {phaseLabel}
          </div>
        );
      })}
    </div>
  );
}
