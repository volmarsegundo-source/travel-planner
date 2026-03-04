"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressIndicator } from "@/components/features/onboarding/ProgressIndicator";
import { LoadingPlanAnimation } from "@/components/features/itinerary/LoadingPlanAnimation";
import { createTripAction } from "@/server/actions/trip.actions";
import { generateTravelPlanAction } from "@/server/actions/ai.actions";
import type { TravelStyle } from "@/types/ai.types";

const TOTAL_STEPS = 3;

const TRAVEL_STYLES: { value: TravelStyle; labelKey: string; emoji: string }[] = [
  { value: "ADVENTURE", labelKey: "step3.styleAdventure", emoji: "🏔️" },
  { value: "CULTURE", labelKey: "step3.styleCulture", emoji: "🏛️" },
  { value: "RELAXATION", labelKey: "step3.styleRelaxation", emoji: "🏖️" },
  { value: "GASTRONOMY", labelKey: "step3.styleGastronomy", emoji: "🍷" },
];

interface TripFormData {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
}

interface OnboardingWizardProps {
  userName: string;
  locale: string;
}

export function OnboardingWizard({ userName, locale }: OnboardingWizardProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 2 form data
  const [tripForm, setTripForm] = useState<TripFormData>({
    destination: "",
    startDate: "",
    endDate: "",
    travelers: 1,
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TripFormData, string>>>({});

  // Step 3 data
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("CULTURE");
  const [budget, setBudget] = useState(1000);
  const [currency, setCurrency] = useState("USD");

  // Ref for focus management
  const stepContentRef = useRef<HTMLDivElement>(null);

  function handleSkip() {
    router.push("/trips?from=onboarding");
  }

  function validateStep2(): boolean {
    const errors: Partial<Record<keyof TripFormData, string>> = {};

    if (!tripForm.destination.trim()) {
      errors.destination = t("step2.errors.destinationRequired");
    }
    if (!tripForm.startDate) {
      errors.startDate = t("step2.errors.startDateRequired");
    }
    if (!tripForm.endDate) {
      errors.endDate = t("step2.errors.endDateRequired");
    }
    if (tripForm.startDate && tripForm.endDate && tripForm.endDate < tripForm.startDate) {
      errors.endDate = t("step2.errors.endDateBeforeStart");
    }
    if (tripForm.travelers < 1) {
      errors.travelers = t("step2.errors.travelersMin");
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goToStep(step: number) {
    setCurrentStep(step);
    setErrorMessage(null);
    // Focus first interactive element on step change
    requestAnimationFrame(() => {
      const firstInput = stepContentRef.current?.querySelector<HTMLElement>(
        "input, button[type='submit'], button:not([type='button'])"
      );
      firstInput?.focus();
    });
  }

  function handleStep1Cta() {
    goToStep(2);
  }

  function handleStep2Cta() {
    if (validateStep2()) {
      goToStep(3);
    }
  }

  async function handleStep3Cta() {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // 1. Create the trip
      const tripResult = await createTripAction({
        title: tripForm.destination,
        destination: tripForm.destination,
        startDate: new Date(tripForm.startDate),
        endDate: new Date(tripForm.endDate),
      });

      if (!tripResult.success) {
        setErrorMessage(tripResult.error ?? "errors.generic");
        setIsGenerating(false);
        return;
      }

      const tripId = tripResult.data!.id;

      // 2. Generate the AI travel plan
      const planResult = await generateTravelPlanAction(tripId, {
        destination: tripForm.destination,
        startDate: tripForm.startDate,
        endDate: tripForm.endDate,
        travelStyle,
        budgetTotal: budget,
        budgetCurrency: currency,
        travelers: tripForm.travelers,
        language: locale === "pt-BR" ? "pt-BR" : "en",
      });

      if (!planResult.success) {
        // Trip was created but plan failed — still redirect to the trip
        router.push(`/trips/${tripId}/itinerary`);
        return;
      }

      // 3. Redirect to the generated itinerary
      router.push(`/trips/${tripId}/itinerary`);
    } catch {
      setErrorMessage("errors.generic");
      setIsGenerating(false);
    }
  }

  if (isGenerating) {
    return <LoadingPlanAnimation />;
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {/* Step content */}
        <div
          ref={stepContentRef}
          key={currentStep}
          className="mt-10 flex flex-col gap-6 motion-reduce:transition-none transition-all duration-300"
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Error message */}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200"
            >
              {errorMessage}
            </div>
          )}

          {/* ─── Step 1: Welcome ─── */}
          {currentStep === 1 && (
            <div className="flex flex-col items-center gap-6 text-center">
              <h1 className="text-3xl font-bold text-gray-900">
                {t("step1.title", { name: userName })}
              </h1>
              <p className="text-lg text-gray-600">{t("step1.subtitle")}</p>
              <Button
                onClick={handleStep1Cta}
                size="lg"
                className="w-full sm:w-auto sm:min-w-48"
              >
                {t("step1.cta")}
              </Button>
            </div>
          )}

          {/* ─── Step 2: Trip Details Form ─── */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900">{t("step2.title")}</h1>
                <p className="mt-2 text-lg text-gray-600">{t("step2.subtitle")}</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStep2Cta();
                }}
                noValidate
                className="flex flex-col gap-4"
              >
                {/* Destination */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="onboarding-destination">{t("step2.destination")}</Label>
                  <Input
                    id="onboarding-destination"
                    type="text"
                    placeholder={t("step2.destinationPlaceholder")}
                    value={tripForm.destination}
                    onChange={(e) => setTripForm((prev) => ({ ...prev, destination: e.target.value }))}
                    aria-describedby={formErrors.destination ? "dest-error" : undefined}
                  />
                  {formErrors.destination && (
                    <p id="dest-error" role="alert" className="text-sm text-red-600">
                      {formErrors.destination}
                    </p>
                  )}
                </div>

                {/* Dates row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="onboarding-start-date">{t("step2.startDate")}</Label>
                    <Input
                      id="onboarding-start-date"
                      type="date"
                      value={tripForm.startDate}
                      onChange={(e) => setTripForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      aria-describedby={formErrors.startDate ? "start-error" : undefined}
                    />
                    {formErrors.startDate && (
                      <p id="start-error" role="alert" className="text-sm text-red-600">
                        {formErrors.startDate}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="onboarding-end-date">{t("step2.endDate")}</Label>
                    <Input
                      id="onboarding-end-date"
                      type="date"
                      value={tripForm.endDate}
                      onChange={(e) => setTripForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      aria-describedby={formErrors.endDate ? "end-error" : undefined}
                    />
                    {formErrors.endDate && (
                      <p id="end-error" role="alert" className="text-sm text-red-600">
                        {formErrors.endDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Travelers */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="onboarding-travelers">{t("step2.travelers")}</Label>
                  <Input
                    id="onboarding-travelers"
                    type="number"
                    min={1}
                    max={20}
                    value={tripForm.travelers}
                    onChange={(e) => setTripForm((prev) => ({ ...prev, travelers: parseInt(e.target.value) || 1 }))}
                    aria-describedby={formErrors.travelers ? "travelers-error" : undefined}
                  />
                  {formErrors.travelers && (
                    <p id="travelers-error" role="alert" className="text-sm text-red-600">
                      {formErrors.travelers}
                    </p>
                  )}
                </div>

                <Button type="submit" size="lg" className="w-full">
                  {t("step2.cta")}
                </Button>
              </form>
            </div>
          )}

          {/* ─── Step 3: Travel Style + Budget ─── */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900">{t("step3.title")}</h1>
                <p className="mt-2 text-lg text-gray-600">{t("step3.subtitle")}</p>
              </div>

              {/* Travel style cards */}
              <div>
                <Label className="mb-2 block">{t("step3.travelStyle")}</Label>
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("step3.travelStyle")}>
                  {TRAVEL_STYLES.map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      role="radio"
                      aria-checked={travelStyle === style.value}
                      onClick={() => setTravelStyle(style.value)}
                      className={[
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors",
                        travelStyle === style.value
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300",
                      ].join(" ")}
                    >
                      <span className="text-2xl" aria-hidden="true">{style.emoji}</span>
                      <span className="text-sm font-medium">{t(style.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget + Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="onboarding-budget">{t("step3.budget")}</Label>
                  <Input
                    id="onboarding-budget"
                    type="number"
                    min={100}
                    step={100}
                    value={budget}
                    onChange={(e) => setBudget(parseInt(e.target.value) || 1000)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="onboarding-currency">{t("step3.currency")}</Label>
                  <select
                    id="onboarding-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="BRL">BRL</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Back + Generate buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => goToStep(2)}
                >
                  {t("step2.cta") === t("step2.cta") ? "\u2190" : "\u2190"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="flex-[3]"
                  onClick={handleStep3Cta}
                >
                  {t("step3.cta")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Skip button — present on every step */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
          >
            {t("skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
