"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TripGeoFeature } from "@/lib/map/types";

interface TripMarkerPopupProps {
  feature: TripGeoFeature["properties"];
}

const TOTAL_PHASES = 6;

export function TripMarkerPopup({ feature }: TripMarkerPopupProps) {
  const t = useTranslations("atlas");

  const progressPercent = Math.round(
    (feature.currentPhase / TOTAL_PHASES) * 100
  );

  const statusKey =
    feature.status === "COMPLETED"
      ? "pinStatus.completed"
      : feature.status === "IN_PROGRESS"
        ? "pinStatus.active"
        : "pinStatus.planned";

  const dates =
    feature.startDate && feature.endDate
      ? `${feature.startDate} - ${feature.endDate}`
      : null;

  const isCompleted = feature.status === "COMPLETED";
  const ctaKey = isCompleted ? "viewSummary" : "continueExpedition";
  const ctaHref = isCompleted
    ? `/expedition/${feature.tripId}/summary`
    : `/expedition/${feature.tripId}`;

  return (
    <div
      className="min-w-[220px] max-w-[280px]"
      aria-live="polite"
      data-testid="atlas-popup"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg" aria-hidden="true">
          {feature.coverEmoji}
        </span>
        <h3 className="text-sm font-semibold leading-tight">
          {feature.destination}
        </h3>
      </div>

      {dates && (
        <p className="text-xs text-muted-foreground mb-2">{dates}</p>
      )}

      <p className="text-xs text-muted-foreground mb-2">
        {t(statusKey)} — Phase {feature.currentPhase} / {TOTAL_PHASES}
      </p>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted mb-3">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={feature.currentPhase}
          aria-valuemin={0}
          aria-valuemax={TOTAL_PHASES}
        />
      </div>

      <Link
        href={ctaHref}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline min-h-[44px]"
        data-testid="atlas-popup-cta"
      >
        {t(ctaKey)}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </div>
  );
}
