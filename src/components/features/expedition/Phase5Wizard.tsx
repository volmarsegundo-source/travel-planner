"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PointsAnimation } from "./PointsAnimation";
import { PhaseTransition } from "./PhaseTransition";
import { ExpeditionProgressBar } from "./ExpeditionProgressBar";
import { completePhase5Action } from "@/server/actions/expedition.actions";
import type { BadgeKey, Rank, ConnectivityOption } from "@/types/gamification.types";

interface ConnectivityPlanData {
  option: ConnectivityOption;
  costPerWeekUSD: number;
  recommended: boolean;
}

interface Phase5WizardProps {
  tripId: string;
  region: string;
  destination: string;
  plans: ConnectivityPlanData[];
}

const OPTION_EMOJIS: Record<ConnectivityOption, string> = {
  chip_local: "📱",
  esim: "📶",
  roaming: "🌐",
  wifi_only: "📡",
};

export function Phase5Wizard({
  tripId,
  region,
  destination,
  plans,
}: Phase5WizardProps) {
  const t = useTranslations("expedition.phase5");
  const tExpedition = useTranslations("expedition");
  const tPhases = useTranslations("gamification.phases");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [selectedOption, setSelectedOption] =
    useState<ConnectivityOption | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [animationData, setAnimationData] = useState<{
    points: number;
    badge?: BadgeKey | null;
    rank?: Rank | null;
  }>({ points: 0 });

  async function handleComplete() {
    if (!selectedOption) return;

    setIsCompleting(true);
    setErrorMessage(null);

    try {
      const result = await completePhase5Action(tripId);

      if (!result.success) {
        setErrorMessage(result.error);
        setIsCompleting(false);
        return;
      }

      setAnimationData({
        points: result.data!.pointsEarned,
        badge: result.data!.badgeAwarded as BadgeKey | null,
        rank: result.data!.newRank as Rank | null,
      });
      setShowAnimation(true);
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
    router.push(`/expedition/${tripId}/phase-6`);
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
        fromPhase={5}
        toPhase={6}
        onContinue={handleTransitionContinue}
      />
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <ExpeditionProgressBar currentPhase={5} totalPhases={8} tripId={tripId} />

        {/* Header */}
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-atlas-gold" data-testid="phase-label">
            {tExpedition("phaseLabel", { number: 5, name: tPhases("theDayMap") })}
          </p>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          <p className="mt-2 text-sm text-atlas-teal-light">
            {destination} — {t(`regions.${region}`)}
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

        {/* Connectivity options */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">
            {t("selectPlan")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("selectPlanHint")}
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {plans.map((plan) => (
              <button
                key={plan.option}
                type="button"
                onClick={() => {
                  setSelectedOption(plan.option);
                  setErrorMessage(null);
                }}
                className={`relative flex w-full items-center gap-4 rounded-lg border-2 p-4 text-left transition-all ${
                  selectedOption === plan.option
                    ? "border-atlas-gold bg-atlas-gold/10"
                    : "border-border bg-card hover:border-atlas-gold/30"
                }`}
                aria-pressed={selectedOption === plan.option}
              >
                {/* Emoji */}
                <span className="text-2xl" aria-hidden="true">
                  {OPTION_EMOJIS[plan.option]}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {t(`options.${plan.option}`)}
                    </span>
                    {plan.recommended && (
                      <span className="rounded-full bg-atlas-teal/10 px-2 py-0.5 text-xs font-medium text-atlas-teal">
                        {t("recommended")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t(`descriptions.${plan.option}`)}
                  </p>
                </div>

                {/* Cost */}
                <div className="shrink-0 text-right">
                  <span className="text-sm font-bold text-foreground">
                    {plan.costPerWeekUSD === 0
                      ? t("free")
                      : `$${plan.costPerWeekUSD}`}
                  </span>
                  {plan.costPerWeekUSD > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("perWeek")}
                    </p>
                  )}
                </div>

                {/* Selection indicator */}
                {selectedOption === plan.option && (
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-atlas-gold text-atlas-ink">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/expedition/${tripId}/phase-4`)}
            className="flex-1"
            aria-label={tCommon("back")}
            data-testid="back-to-phase-4"
          >
            {"\u2190"}
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!selectedOption || isCompleting}
            size="lg"
            className="flex-[3]"
            aria-busy={isCompleting}
          >
            {isCompleting
              ? tExpedition("cta.advancing")
              : selectedOption
                ? tExpedition("cta.advance")
                : t("ctaDisabled")}
          </Button>
        </div>
      </div>
    </div>
  );
}
