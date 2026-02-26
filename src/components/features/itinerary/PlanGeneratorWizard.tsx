"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { LoadingPlanAnimation } from "./LoadingPlanAnimation";
import { generateTravelPlanAction } from "@/server/actions/ai.actions";
import type { Trip } from "@/types/trip.types";
import type { TravelStyle } from "@/types/ai.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;
const BUDGET_MIN = 0;
const BUDGET_MAX = 10000;
const BUDGET_STEP = 500;
const DEFAULT_BUDGET = 3000;
const DEFAULT_TRAVELERS = 1;

const CURRENCIES = ["BRL", "USD", "EUR"] as const;
type Currency = (typeof CURRENCIES)[number];

type WizardKey =
  | "styleAdventure"
  | "styleCulture"
  | "styleRelaxation"
  | "styleGastronomy";

interface StyleOption {
  value: TravelStyle;
  emoji: string;
  labelKey: WizardKey;
}

const STYLE_OPTIONS: StyleOption[] = [
  { value: "ADVENTURE", emoji: "🏔️", labelKey: "styleAdventure" },
  { value: "CULTURE", emoji: "🏛️", labelKey: "styleCulture" },
  { value: "RELAXATION", emoji: "🏖️", labelKey: "styleRelaxation" },
  { value: "GASTRONOMY", emoji: "🍽️", labelKey: "styleGastronomy" },
];

interface PlanGeneratorWizardProps {
  trip: Trip;
  locale: string;
}

export function PlanGeneratorWizard({ trip, locale }: PlanGeneratorWizardProps) {
  const t = useTranslations("itinerary.wizard");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(1);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("CULTURE");
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [travelers, setTravelers] = useState(DEFAULT_TRAVELERS);
  const [error, setError] = useState<string | null>(null);

  const language = locale === "pt-BR" ? "pt-BR" : "en";

  const startDate = trip.startDate
    ? trip.startDate.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const endDate = trip.endDate
    ? trip.endDate.toISOString().split("T")[0]
    : startDate;

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateTravelPlanAction(trip.id, {
        destination: trip.destination,
        startDate,
        endDate,
        travelStyle,
        budgetTotal: budget,
        budgetCurrency: currency,
        travelers,
        language,
      });

      if (result.success) {
        router.push(`/${locale}/trips/${trip.id}/itinerary`);
      } else {
        setError(t("errorGenerate"));
      }
    });
  }

  if (isPending) {
    return <LoadingPlanAnimation />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Progress indicator */}
      <p className="mb-6 text-center text-sm text-muted-foreground">
        {t("step", { current: step, total: TOTAL_STEPS })}
      </p>

      {/* Step 1: Confirm destination + dates */}
      {step === 1 && (
        <section aria-labelledby="step1-heading" className="space-y-6">
          <h1
            id="step1-heading"
            className="text-2xl font-bold text-center"
          >
            {t("confirmDetails")}
          </h1>

          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("destination")}
              </p>
              <p className="mt-1 text-lg font-semibold">{trip.destination}</p>
            </div>

            {trip.startDate && trip.endDate && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("dates")}
                </p>
                <p className="mt-1 text-base">
                  {startDate} &rarr; {endDate}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="travelers-input"
              className="text-sm font-medium"
            >
              {t("travelers")}
            </label>
            <input
              id="travelers-input"
              type="number"
              min={1}
              max={20}
              value={travelers}
              onChange={(e) =>
                setTravelers(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Button
            onClick={handleNext}
            className="w-full min-h-[44px]"
          >
            {t("next")}
          </Button>
        </section>
      )}

      {/* Step 2: Travel style selector */}
      {step === 2 && (
        <section aria-labelledby="step2-heading" className="space-y-6">
          <h1
            id="step2-heading"
            className="text-2xl font-bold text-center"
          >
            {t("stepStyle")}
          </h1>

          <div className="grid grid-cols-2 gap-3" role="radiogroup">
            {STYLE_OPTIONS.map((option) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const label = t(option.labelKey as any);
              const isSelected = travelStyle === option.value;
              return (
                <button
                  key={option.value}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setTravelStyle(option.value)}
                  className={`min-h-[44px] flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <span className="text-3xl" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 min-h-[44px]"
            >
              {t("back")}
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 min-h-[44px]"
            >
              {t("next")}
            </Button>
          </div>
        </section>
      )}

      {/* Step 3: Budget slider */}
      {step === 3 && (
        <section aria-labelledby="step3-heading" className="space-y-6">
          <h1
            id="step3-heading"
            className="text-2xl font-bold text-center"
          >
            {t("stepBudget")}
          </h1>

          <div className="space-y-4">
            {/* Currency selector */}
            <div className="space-y-2">
              <label htmlFor="currency-select" className="text-sm font-medium">
                {t("currency")}
              </label>
              <select
                id="currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t("budget")}</label>
                <span className="text-lg font-bold text-primary">
                  {currency} {budget.toLocaleString()}
                </span>
              </div>
              <Slider
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                value={[budget]}
                onValueChange={(values) => setBudget(values[0] ?? DEFAULT_BUDGET)}
                aria-label={t("budget")}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{BUDGET_MIN}</span>
                <span>{BUDGET_MAX.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive text-center">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 min-h-[44px]"
            >
              {t("back")}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isPending}
              className="flex-1 min-h-[44px]"
            >
              {t("generatePlan")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
