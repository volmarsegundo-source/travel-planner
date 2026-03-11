"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { PointsAnimation } from "./PointsAnimation";
import type { ExpeditionSummary as ExpeditionSummaryData } from "@/server/services/expedition-summary.service";
import type { BadgeKey } from "@/types/gamification.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpeditionSummaryProps {
  tripId: string;
  summary: ExpeditionSummaryData;
  celebration?: {
    pointsEarned: number;
    badgeAwarded: string | null;
  } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExpeditionSummary({
  tripId,
  summary,
  celebration,
}: ExpeditionSummaryProps) {
  const t = useTranslations("expedition.summary");
  const router = useRouter();
  const locale = useLocale();

  const [showCelebration, setShowCelebration] = useState(!!celebration);

  // Auto-dismiss celebration is handled by PointsAnimation component
  useEffect(() => {
    if (!celebration) setShowCelebration(false);
  }, [celebration]);

  if (showCelebration && celebration) {
    return (
      <PointsAnimation
        points={celebration.pointsEarned}
        badge={celebration.badgeAwarded as BadgeKey | null}
        onDismiss={() => setShowCelebration(false)}
      />
    );
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      {/* Phase 1: Destination & Dates */}
      <section className="mt-6" aria-labelledby="phase1-heading">
        <div className="flex items-center justify-between">
          <h2 id="phase1-heading" className="text-lg font-semibold text-foreground">
            {t("phase1Title")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/expedition/${tripId}/phase-1`)}
            data-testid="edit-phase-1"
          >
            {t("editPhase")}
          </Button>
        </div>
        {summary.phase1 ? (
          <div className="mt-2 rounded-lg border bg-card p-4 space-y-1">
            <p className="text-sm">
              <span className="font-medium">{t("destination")}:</span>{" "}
              {summary.phase1.destination}
            </p>
            {summary.phase1.origin && (
              <p className="text-sm">
                <span className="font-medium">{t("origin")}:</span>{" "}
                {summary.phase1.origin}
              </p>
            )}
            <p className="text-sm">
              <span className="font-medium">{t("dates")}:</span>{" "}
              {formatDate(summary.phase1.startDate)} -{" "}
              {formatDate(summary.phase1.endDate)}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="phase1-not-completed">
            {t("notCompleted")}
          </p>
        )}
      </section>

      {/* Phase 2: Travel Style */}
      <section className="mt-6" aria-labelledby="phase2-heading">
        <div className="flex items-center justify-between">
          <h2 id="phase2-heading" className="text-lg font-semibold text-foreground">
            {t("phase2Title")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/expedition/${tripId}/phase-2`)}
            data-testid="edit-phase-2"
          >
            {t("editPhase")}
          </Button>
        </div>
        {summary.phase2 ? (
          <div className="mt-2 rounded-lg border bg-card p-4 space-y-1">
            <p className="text-sm">
              <span className="font-medium">{t("travelerType")}:</span>{" "}
              {summary.phase2.travelerType}
            </p>
            <p className="text-sm">
              <span className="font-medium">{t("accommodation")}:</span>{" "}
              {summary.phase2.accommodationStyle}
            </p>
            {summary.phase2.budget != null && (
              <p className="text-sm">
                <span className="font-medium">{t("budget")}:</span>{" "}
                {summary.phase2.budget} {summary.phase2.currency ?? ""}
              </p>
            )}
            {summary.phase2.passengers && (
              <p className="text-sm">
                <span className="font-medium">{t("passengers")}:</span>{" "}
                {summary.phase2.passengers.adults} adults,{" "}
                {summary.phase2.passengers.children} children,{" "}
                {summary.phase2.passengers.seniors} seniors,{" "}
                {summary.phase2.passengers.infants} infants
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="phase2-not-completed">
            {t("notCompleted")}
          </p>
        )}
      </section>

      {/* Phase 3: Checklist */}
      <section className="mt-6" aria-labelledby="phase3-heading">
        <div className="flex items-center justify-between">
          <h2 id="phase3-heading" className="text-lg font-semibold text-foreground">
            {t("phase3Title")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/expedition/${tripId}/phase-3`)}
            data-testid="edit-phase-3"
          >
            {t("editPhase")}
          </Button>
        </div>
        {summary.phase3 ? (
          <div className="mt-2 rounded-lg border bg-card p-4">
            <p className="text-sm">
              {t("checklistProgress", {
                done: summary.phase3.done,
                total: summary.phase3.total,
              })}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="phase3-not-completed">
            {t("notCompleted")}
          </p>
        )}
      </section>

      {/* Phase 4: Logistics */}
      <section className="mt-6" aria-labelledby="phase4-heading">
        <div className="flex items-center justify-between">
          <h2 id="phase4-heading" className="text-lg font-semibold text-foreground">
            {t("phase4Title")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/expedition/${tripId}/phase-4`)}
            data-testid="edit-phase-4"
          >
            {t("editPhase")}
          </Button>
        </div>
        {summary.phase4 ? (
          <div className="mt-2 rounded-lg border bg-card p-4 space-y-2">
            <p className="text-sm">
              {t("transportSegments", {
                count: summary.phase4.transportSegments.length,
              })}
            </p>
            {summary.phase4.transportSegments.map((seg, i) => (
              <div key={i} className="text-xs text-muted-foreground ml-2">
                {seg.type}: {seg.departurePlace ?? "?"} → {seg.arrivalPlace ?? "?"}
                {seg.maskedBookingCode && (
                  <span className="ml-2">
                    ({t("maskedBookingCode", { code: seg.maskedBookingCode })})
                  </span>
                )}
              </div>
            ))}
            <p className="text-sm">
              {t("accommodations", {
                count: summary.phase4.accommodations.length,
              })}
            </p>
            {summary.phase4.accommodations.map((acc, i) => (
              <div key={i} className="text-xs text-muted-foreground ml-2">
                {acc.type}: {acc.name ?? "-"}
                {acc.maskedBookingCode && (
                  <span className="ml-2">
                    ({t("maskedBookingCode", { code: acc.maskedBookingCode })})
                  </span>
                )}
              </div>
            ))}
            {summary.phase4.mobility.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">{t("mobility")}:</span>{" "}
                {summary.phase4.mobility.join(", ")}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="phase4-not-completed">
            {t("notCompleted")}
          </p>
        )}
      </section>

      {/* Phase 5: Destination Guide */}
      <section className="mt-6" aria-labelledby="phase5-heading">
        <div className="flex items-center justify-between">
          <h2 id="phase5-heading" className="text-lg font-semibold text-foreground">
            {t("phase5Title")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/expedition/${tripId}/phase-5`)}
            data-testid="edit-phase-5"
          >
            {t("editPhase")}
          </Button>
        </div>
        {summary.phase5 ? (
          <div className="mt-2 rounded-lg border bg-card p-4 space-y-1">
            <p className="text-sm">
              {t("guideGenerated", { date: formatDate(summary.phase5.generatedAt) })}
            </p>
            {summary.phase5.highlights.length > 0 && (
              <div>
                <p className="text-sm font-medium">{t("highlights")}:</p>
                <ul className="ml-2 text-sm text-muted-foreground">
                  {summary.phase5.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="phase5-not-completed">
            {t("notCompleted")}
          </p>
        )}
      </section>

      {/* Phase 6: Itinerary */}
      <section className="mt-6" aria-labelledby="phase6-heading">
        <div className="flex items-center justify-between">
          <h2 id="phase6-heading" className="text-lg font-semibold text-foreground">
            {t("phase6Title")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/expedition/${tripId}/phase-6`)}
            data-testid="edit-phase-6"
          >
            {t("editPhase")}
          </Button>
        </div>
        {summary.phase6 ? (
          <div className="mt-2 rounded-lg border bg-card p-4 space-y-1">
            <p className="text-sm">
              {t("itineraryDays", { count: summary.phase6.dayCount })}
            </p>
            <p className="text-sm">
              {t("totalActivities", {
                count: summary.phase6.totalActivities,
              })}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="phase6-not-completed">
            {t("notCompleted")}
          </p>
        )}
      </section>

      {/* Actions */}
      <div className="mt-8 flex justify-center">
        <Button
          size="lg"
          onClick={() => router.push("/dashboard")}
        >
          {t("viewDashboard")}
        </Button>
      </div>
    </div>
  );
}
