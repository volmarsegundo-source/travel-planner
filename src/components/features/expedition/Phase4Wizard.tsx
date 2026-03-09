"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PointsAnimation } from "./PointsAnimation";
import { PhaseTransition } from "./PhaseTransition";
import { ExpeditionProgressBar } from "./ExpeditionProgressBar";
import { advanceFromPhaseAction } from "@/server/actions/expedition.actions";
import type { BadgeKey, Rank } from "@/types/gamification.types";

interface Phase4WizardProps {
  tripId: string;
  tripType: string;
  destination: string;
  startDate: string | null;
}

export function Phase4Wizard({
  tripId,
  tripType,
  destination,
  startDate,
}: Phase4WizardProps) {
  const t = useTranslations("expedition.phase4");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [needsCarRental, setNeedsCarRental] = useState<boolean | null>(null);
  const [cnhConfirmed, setCnhConfirmed] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [animationData, setAnimationData] = useState<{
    points: number;
    badge?: BadgeKey | null;
    rank?: Rank | null;
  }>({ points: 0 });

  const needsCinh = tripType === "international" || tripType === "schengen";
  const isMercosul = tripType === "mercosul";

  // Calculate CINH deadline (45 days before trip)
  const cinhDeadline = startDate ? formatDeadlineFromDays(startDate, 45) : null;

  const canComplete =
    needsCarRental === false ||
    (needsCarRental === true && !needsCinh) ||
    (needsCarRental === true && needsCinh && cnhConfirmed);

  async function handleAdvance() {
    setIsCompleting(true);
    setErrorMessage(null);

    try {
      const result = await advanceFromPhaseAction(tripId, 4, {
        needsCarRental: needsCarRental ?? false,
        cnhResolved: needsCarRental ? (needsCinh ? cnhConfirmed : true) : true,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setIsCompleting(false);
        return;
      }

      if (result.data!.completed && result.data!.phaseResult) {
        // All prerequisites met — show points animation first
        setAnimationData({
          points: result.data!.phaseResult.pointsEarned,
          badge: result.data!.phaseResult.badgeAwarded as BadgeKey | null,
          rank: result.data!.phaseResult.newRank as Rank | null,
        });
        setShowAnimation(true);
      } else {
        // Skipped ahead — go straight to phase transition
        setShowTransition(true);
      }
    } catch {
      setErrorMessage("errors.generic");
      setIsCompleting(false);
    }
  }

  function handleAnimationDismiss() {
    setShowAnimation(false);
    setShowTransition(true);
  }

  function handleTransitionContinue() {
    setShowTransition(false);
    router.push(`/expedition/${tripId}/phase-5`);
  }

  if (showAnimation) {
    return (
      <PointsAnimation
        points={animationData.points}
        badge={animationData.badge}
        rank={animationData.rank}
        onDismiss={handleAnimationDismiss}
      />
    );
  }

  if (showTransition) {
    return (
      <PhaseTransition
        fromPhase={4}
        toPhase={5}
        onContinue={handleTransitionContinue}
      />
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <ExpeditionProgressBar currentPhase={4} totalPhases={8} tripId={tripId} />

        {/* Header */}
        <div className="mt-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          <p className="mt-2 text-sm text-atlas-teal-light">
            {destination} — {t(`tripTypes.${tripType}`)}
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30"
          >
            {errorMessage}
          </div>
        )}

        {/* Car rental question */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">
            {t("carRentalQuestion")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("carRentalHint")}
          </p>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setNeedsCarRental(true);
                setCnhConfirmed(false);
                setErrorMessage(null);
              }}
              className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                needsCarRental === true
                  ? "border-atlas-gold bg-atlas-gold/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-atlas-gold/30"
              }`}
              aria-pressed={needsCarRental === true}
            >
              <span className="block text-2xl" aria-hidden="true">
                🚗
              </span>
              <span className="mt-1 block text-sm font-medium">
                {t("carRentalYes")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNeedsCarRental(false);
                setCnhConfirmed(false);
                setErrorMessage(null);
              }}
              className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                needsCarRental === false
                  ? "border-atlas-gold bg-atlas-gold/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-atlas-gold/30"
              }`}
              aria-pressed={needsCarRental === false}
            >
              <span className="block text-2xl" aria-hidden="true">
                🚌
              </span>
              <span className="mt-1 block text-sm font-medium">
                {t("carRentalNo")}
              </span>
            </button>
          </div>
        </div>

        {/* CNH Alert Section */}
        {needsCarRental === true && (
          <div className="mt-6">
            {needsCinh && (
              <div className="rounded-lg border-2 border-atlas-rust/30 bg-atlas-rust/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl" aria-hidden="true">
                    ⚠️
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {t("cinhRequired")}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("cinhDescription")}
                    </p>
                    {cinhDeadline && (
                      <p className="mt-2 text-sm font-medium text-atlas-rust">
                        {t("cinhDeadline", { date: cinhDeadline })}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("cinhLeadTime", { days: 45 })}
                    </p>
                    <label className="mt-4 flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={cnhConfirmed}
                        onChange={(e) => setCnhConfirmed(e.target.checked)}
                        className="mt-0.5 h-5 w-5 rounded border-border accent-atlas-gold"
                      />
                      <span className="text-sm text-foreground">
                        {t("cinhConfirm")}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {isMercosul && (
              <div className="rounded-lg border border-atlas-teal/30 bg-atlas-teal/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl" aria-hidden="true">
                    ✅
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {t("cnhBrasileiraValid")}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("cnhBrasileiraDescription")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tripType === "domestic" && (
              <div className="rounded-lg border border-atlas-teal/30 bg-atlas-teal/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl" aria-hidden="true">
                    ✅
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {t("cnhRegularValid")}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("cnhRegularDescription")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {needsCarRental === false && (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-center">
            <span className="text-2xl" aria-hidden="true">
              👍
            </span>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("noCarRental")}
            </p>
          </div>
        )}

        {/* Advance button — always visible */}
        <div className="mt-8">
          <Button
            onClick={handleAdvance}
            disabled={isCompleting}
            size="lg"
            className={`w-full ${
              canComplete
                ? ""
                : "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
            }`}
          >
            {isCompleting
              ? tCommon("loading")
              : canComplete
                ? t("advanceComplete")
                : needsCarRental === null
                  ? t("advancePending")
                  : t("advancePartial", { count: 1 })}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadlineFromDays(
  startDateIso: string,
  daysBefore: number
): string | null {
  try {
    const start = new Date(startDateIso);
    const deadline = new Date(start.getTime() - daysBefore * 86400000);
    return deadline.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}
