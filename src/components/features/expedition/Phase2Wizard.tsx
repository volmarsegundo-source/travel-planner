"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PhaseProgressBar } from "./PhaseProgressBar";
import { PointsAnimation } from "./PointsAnimation";
import { PhaseTransition } from "./PhaseTransition";
import { VisualCardSelector } from "./VisualCardSelector";
import { completePhase2Action } from "@/server/actions/expedition.actions";
import type { BadgeKey, Rank } from "@/types/gamification.types";

const TOTAL_STEPS = 5;

interface Phase2WizardProps {
  tripId: string;
  travelers?: number;
}

export function Phase2Wizard({ tripId, travelers = 1 }: Phase2WizardProps) {
  const t = useTranslations("expedition.phase2");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [animationData, setAnimationData] = useState<{
    points: number;
    badge?: BadgeKey | null;
    rank?: Rank | null;
  }>({ points: 0 });

  // Form data
  const [travelerType, setTravelerType] = useState<string | null>(null);
  const [accommodationStyle, setAccommodationStyle] = useState<string | null>(null);
  const [travelPace, setTravelPace] = useState(5);
  const [budget, setBudget] = useState(1000);
  const [currency, setCurrency] = useState("USD");

  const stepContentRef = useRef<HTMLDivElement>(null);

  function goToStep(step: number) {
    setCurrentStep(step);
    setErrorMessage(null);
    requestAnimationFrame(() => {
      const firstInput = stepContentRef.current?.querySelector<HTMLElement>(
        "input, button[role='radio'], button[type='submit']"
      );
      firstInput?.focus();
    });
  }

  function handleStep1Next() {
    if (!travelerType) {
      setErrorMessage(t("errors.travelerTypeRequired"));
      return;
    }
    goToStep(2);
  }

  function handleStep2Next() {
    if (!accommodationStyle) {
      setErrorMessage(t("errors.accommodationRequired"));
      return;
    }
    goToStep(3);
  }

  function handleStep3Next() {
    goToStep(4);
  }

  function handleStep4Next() {
    if (budget < 100) {
      setErrorMessage(t("errors.budgetMin"));
      return;
    }
    if (budget > 100000) {
      setErrorMessage(t("errors.budgetMax"));
      return;
    }
    goToStep(5);
  }

  async function handleSubmit() {
    if (!travelerType || !accommodationStyle) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await completePhase2Action(tripId, {
        travelerType: travelerType as "solo" | "couple" | "family" | "group",
        accommodationStyle: accommodationStyle as "budget" | "comfort" | "luxury" | "adventure",
        travelPace,
        budget,
        currency: currency as "USD" | "EUR" | "BRL",
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
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
      setIsSubmitting(false);
    }
  }

  function handleAnimationDismiss() {
    setShowAnimation(false);
    setShowTransition(true);
  }

  function handleTransitionContinue() {
    setShowTransition(false);
    router.push("/dashboard");
  }

  const travelerTypeOptions = [
    {
      value: "solo",
      label: t("step1.solo"),
      emoji: t("step1.soloEmoji"),
      disabled: travelers > 1,
      disabledReason: travelers > 1 ? t("errors.soloRequiresOne") : undefined,
    },
    {
      value: "couple",
      label: t("step1.couple"),
      emoji: t("step1.coupleEmoji"),
      disabled: travelers !== 2,
      disabledReason: travelers !== 2 ? t("errors.coupleRequiresTwo") : undefined,
    },
    { value: "family", label: t("step1.family"), emoji: t("step1.familyEmoji") },
    { value: "group", label: t("step1.group"), emoji: t("step1.groupEmoji") },
  ];

  const accommodationOptions = [
    { value: "budget", label: t("step2.budget"), emoji: t("step2.budgetEmoji") },
    { value: "comfort", label: t("step2.comfort"), emoji: t("step2.comfortEmoji") },
    { value: "luxury", label: t("step2.luxury"), emoji: t("step2.luxuryEmoji") },
    { value: "adventure", label: t("step2.adventure"), emoji: t("step2.adventureEmoji") },
  ];

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
        fromPhase={2}
        toPhase={3}
        onContinue={handleTransitionContinue}
      />
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <PhaseProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        <div className="mt-2 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-1 text-gray-500">{t("subtitle")}</p>
        </div>

        <div
          ref={stepContentRef}
          key={currentStep}
          className="mt-8 flex flex-col gap-6"
          aria-live="polite"
          aria-atomic="true"
        >
          {errorMessage && (
            <div
              role="alert"
              className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200"
            >
              {errorMessage}
            </div>
          )}

          {/* Step 1: Traveler Type */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step1.title")}</h2>
              <VisualCardSelector
                options={travelerTypeOptions}
                value={travelerType}
                onChange={setTravelerType}
                label={t("step1.title")}
              />
              <Button onClick={handleStep1Next} size="lg" className="w-full">
                {tCommon("next")}
              </Button>
            </div>
          )}

          {/* Step 2: Accommodation */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step2.title")}</h2>
              <VisualCardSelector
                options={accommodationOptions}
                value={accommodationStyle}
                onChange={setAccommodationStyle}
                label={t("step2.title")}
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep(1)} className="flex-1">
                  ←
                </Button>
                <Button onClick={handleStep2Next} className="flex-[3]">
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Travel Pace */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step3.title")}</h2>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{t("step3.intense")}</span>
                <span>{t("step3.relaxed")}</span>
              </div>
              <Slider
                value={[travelPace]}
                onValueChange={(v) => setTravelPace(v[0])}
                min={1}
                max={10}
                step={1}
              />
              <p className="text-center text-lg font-semibold">{travelPace}/10</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep(2)} className="flex-1">
                  ←
                </Button>
                <Button onClick={handleStep3Next} className="flex-[3]">
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Budget */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step4.title")}</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="phase2-budget">{t("step4.amount")}</Label>
                  <Input
                    id="phase2-budget"
                    type="number"
                    min={100}
                    max={100000}
                    step={100}
                    value={budget}
                    onChange={(e) => setBudget(parseInt(e.target.value) || 100)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phase2-currency">{t("step4.currency")}</Label>
                  <select
                    id="phase2-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="BRL">BRL</option>
                  </select>
                </div>
              </div>
              <Slider
                value={[budget]}
                onValueChange={(v) => setBudget(v[0])}
                min={100}
                max={100000}
                step={100}
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep(3)} className="flex-1">
                  ←
                </Button>
                <Button onClick={handleStep4Next} className="flex-[3]">
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {currentStep === 5 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step5.title")}</h2>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-medium text-gray-500">
                  {t("step5.summary")}
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t("step5.travelerType")}</dt>
                    <dd className="font-medium capitalize">{travelerType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t("step5.accommodation")}</dt>
                    <dd className="font-medium capitalize">{accommodationStyle}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t("step5.pace")}</dt>
                    <dd className="font-medium">{travelPace}/10</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t("step5.budget")}</dt>
                    <dd className="font-medium">
                      {budget.toLocaleString()} {currency}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep(4)} className="flex-1">
                  ←
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-[3]"
                  size="lg"
                >
                  {isSubmitting ? tCommon("loading") : t("step5.cta")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
