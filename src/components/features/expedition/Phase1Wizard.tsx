"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhaseProgressBar } from "./PhaseProgressBar";
import { PointsAnimation } from "./PointsAnimation";
import { PhaseTransition } from "./PhaseTransition";
import { createExpeditionAction } from "@/server/actions/expedition.actions";

const TOTAL_STEPS = 4;

export function Phase1Wizard() {
  const t = useTranslations("expedition.phase1");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [animationData, setAnimationData] = useState<{
    points: number;
    badge?: string | null;
  }>({ points: 0 });

  // Form data
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [travelers, setTravelers] = useState(1);

  const stepContentRef = useRef<HTMLDivElement>(null);
  const tripIdRef = useRef<string>("");

  function goToStep(step: number) {
    setCurrentStep(step);
    setErrorMessage(null);
    requestAnimationFrame(() => {
      const firstInput = stepContentRef.current?.querySelector<HTMLElement>(
        "input, button[type='submit']"
      );
      firstInput?.focus();
    });
  }

  function handleStep1Next() {
    if (!destination.trim()) {
      setErrorMessage(t("errors.destinationRequired"));
      return;
    }
    goToStep(2);
  }

  function handleStep2Next() {
    goToStep(3);
  }

  function handleStep3Next() {
    if (travelers < 1) {
      setErrorMessage(t("errors.travelersMin"));
      return;
    }
    goToStep(4);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createExpeditionAction({
        destination: destination.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        travelers,
        flexibleDates,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
        return;
      }

      tripIdRef.current = result.data!.tripId;
      setAnimationData({
        points: result.data!.phaseResult.pointsEarned,
        badge: result.data!.phaseResult.badgeAwarded,
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
    router.push(`/expedition/${tripIdRef.current}/phase-2`);
  }

  if (showAnimation) {
    return (
      <PointsAnimation
        points={animationData.points}
        badge={animationData.badge as "first_step" | null}
        onDismiss={handleAnimationDismiss}
      />
    );
  }

  if (showTransition) {
    return (
      <PhaseTransition
        fromPhase={1}
        toPhase={2}
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

          {/* Step 1: Destination */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-4">
              <Label htmlFor="expedition-destination">{t("step1.title")}</Label>
              <Input
                id="expedition-destination"
                type="text"
                placeholder={t("step1.placeholder")}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                maxLength={150}
              />
              <Button onClick={handleStep1Next} size="lg" className="w-full">
                {tCommon("next")}
              </Button>
            </div>
          )}

          {/* Step 2: Dates */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step2.title")}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="expedition-start-date">{t("step2.startDate")}</Label>
                  <Input
                    id="expedition-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="expedition-end-date">{t("step2.endDate")}</Label>
                  <Input
                    id="expedition-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={flexibleDates}
                  onChange={(e) => setFlexibleDates(e.target.checked)}
                  className="rounded border-gray-300"
                />
                {t("step2.flexibleDates")}
              </label>
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

          {/* Step 3: Travelers */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step3.title")}</h2>
              <Label htmlFor="expedition-travelers">{t("step3.travelers")}</Label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setTravelers(Math.max(1, travelers - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 text-lg font-bold hover:border-gray-400"
                  aria-label="Decrease travelers"
                >
                  −
                </button>
                <span className="min-w-[3rem] text-center text-2xl font-bold">
                  {travelers}
                </span>
                <button
                  type="button"
                  onClick={() => setTravelers(Math.min(10, travelers + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 text-lg font-bold hover:border-gray-400"
                  aria-label="Increase travelers"
                >
                  +
                </button>
              </div>
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

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step4.title")}</h2>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-medium text-gray-500">
                  {t("step4.summary")}
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t("step4.destination")}</dt>
                    <dd className="font-medium">{destination}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t("step4.dates")}</dt>
                    <dd className="font-medium">
                      {startDate && endDate
                        ? `${startDate} → ${endDate}`
                        : flexibleDates
                          ? t("step4.yes")
                          : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t("step4.travelers")}</dt>
                    <dd className="font-medium">{travelers}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t("step4.flexibleDates")}</dt>
                    <dd className="font-medium">
                      {flexibleDates ? t("step4.yes") : t("step4.no")}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => goToStep(3)} className="flex-1">
                  ←
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-[3]"
                  size="lg"
                >
                  {isSubmitting ? tCommon("loading") : t("step4.cta")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
