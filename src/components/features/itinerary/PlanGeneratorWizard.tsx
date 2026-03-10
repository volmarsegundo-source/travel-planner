"use client";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { LoadingPlanAnimation } from "./LoadingPlanAnimation";
import { generateTravelPlanAction } from "@/server/actions/ai.actions";
import { updateTripAction } from "@/server/actions/trip.actions";
import type { Trip } from "@/types/trip.types";
import type { TravelStyle } from "@/types/ai.types";
import { getDefaultCurrency } from "@/lib/utils/currency";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;
const BUDGET_MIN = 0;
const BUDGET_MAX = 100_000;
const BUDGET_STEP = 500;
const DEFAULT_BUDGET = 3000;
const DEFAULT_TRAVELERS = 1;
const TRAVEL_NOTES_MAX = 500;

const CURRENCIES = ["BRL", "USD", "EUR"] as const;
type Currency = (typeof CURRENCIES)[number];

type WizardKey =
  | "styleAdventure"
  | "styleCulture"
  | "styleRelaxation"
  | "styleGastronomy"
  | "styleRomantic"
  | "styleFamily"
  | "styleBusiness"
  | "styleBackpacker"
  | "styleLuxury";

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
  { value: "ROMANTIC", emoji: "💕", labelKey: "styleRomantic" },
  { value: "FAMILY", emoji: "👨‍👩‍👧‍👦", labelKey: "styleFamily" },
  { value: "BUSINESS", emoji: "💼", labelKey: "styleBusiness" },
  { value: "BACKPACKER", emoji: "🎒", labelKey: "styleBackpacker" },
  { value: "LUXURY", emoji: "💎", labelKey: "styleLuxury" },
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
  const [currency, setCurrency] = useState<Currency>(() => getDefaultCurrency(locale) as Currency);
  const [travelers, setTravelers] = useState(DEFAULT_TRAVELERS);
  const [travelNotes, setTravelNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Editable trip fields (step 1)
  const [tripTitle, setTripTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination);
  const [startDate, setStartDate] = useState(
    trip.startDate ? trip.startDate.toISOString().split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    trip.endDate ? trip.endDate.toISOString().split("T")[0] : ""
  );

  const language = locale === "pt-BR" ? "pt-BR" : "en";

  const effectiveStartDate = startDate || new Date().toISOString().split("T")[0];
  const effectiveEndDate = endDate || effectiveStartDate;

  function handleNext() {
    if (step === 1) {
      // Persist edited trip fields before advancing
      setError(null);
      startTransition(async () => {
        const result = await updateTripAction(trip.id, {
          title: tripTitle,
          destination,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        });
        if (result.success) {
          setStep(2);
        } else {
          setError(result.error || t("errorGenerate"));
        }
      });
      return;
    }
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
        destination,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        travelStyle,
        budgetTotal: budget,
        budgetCurrency: currency,
        travelers,
        language,
        travelNotes: travelNotes.trim() || undefined,
      });

      if (result.success) {
        router.push(`/trips/${trip.id}/itinerary`);
      } else {
        const errorMap: Record<string, string> = {
          "errors.timeout": t("errorTimeout"),
          "errors.aiAuthError": t("errorAuth"),
          "errors.rateLimitExceeded": t("errorRateLimit"),
        };
        setError(
          (result.error && errorMap[result.error]) || t("errorGenerate")
        );
      }
    });
  }

  function handleBudgetInputChange(value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setBudget(BUDGET_MIN);
    } else {
      setBudget(Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, num)));
    }
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

      {/* Step 1: Edit destination + dates */}
      {step === 1 && (
        <section aria-labelledby="step1-heading" className="space-y-6">
          <h1
            id="step1-heading"
            className="text-2xl font-bold text-center"
          >
            {t("confirmDetails")}
          </h1>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="trip-title-input" className="text-sm font-medium">
                {t("tripTitle")}
              </label>
              <input
                id="trip-title-input"
                type="text"
                maxLength={100}
                value={tripTitle}
                onChange={(e) => setTripTitle(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="destination-input" className="text-sm font-medium">
                {t("editDestination")}
              </label>
              <input
                id="destination-input"
                type="text"
                maxLength={150}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="start-date-input" className="text-sm font-medium">
                  {t("editStartDate")}
                </label>
                <input
                  id="start-date-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="end-date-input" className="text-sm font-medium">
                  {t("editEndDate")}
                </label>
                <input
                  id="end-date-input"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>
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
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive text-center">
              {error}
            </p>
          )}

          <Button
            onClick={handleNext}
            disabled={!destination.trim() || !tripTitle.trim()}
            className="w-full min-h-[44px]"
          >
            {t("next")}
          </Button>
        </section>
      )}

      {/* Step 2: Travel style selector + notes */}
      {step === 2 && (
        <section aria-labelledby="step2-heading" className="space-y-6">
          <h1
            id="step2-heading"
            className="text-2xl font-bold text-center"
          >
            {t("stepStyle")}
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="radiogroup">
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
                  className={`min-h-[44px] flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                    isSelected
                      ? "border-atlas-gold bg-atlas-gold/10 text-atlas-gold"
                      : "border-border bg-card hover:bg-muted hover:border-atlas-gold/40"
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

          {/* Travel notes textarea */}
          <div className="space-y-2">
            <label htmlFor="travel-notes" className="text-sm font-medium">
              {t("travelNotes")}
            </label>
            <textarea
              id="travel-notes"
              maxLength={TRAVEL_NOTES_MAX}
              rows={3}
              value={travelNotes}
              onChange={(e) => setTravelNotes(e.target.value)}
              placeholder={t("travelNotesPlaceholder")}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {t("travelNotesCounter", { count: travelNotes.length })}
            </p>
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

      {/* Step 3: Budget slider + numeric input */}
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

            {/* Budget slider + numeric input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="budget-input" className="text-sm font-medium">
                  {t("budget")}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">{currency}</span>
                  <input
                    id="budget-input"
                    type="number"
                    min={BUDGET_MIN}
                    max={BUDGET_MAX}
                    step={BUDGET_STEP}
                    value={budget}
                    onChange={(e) => handleBudgetInputChange(e.target.value)}
                    aria-label={t("budgetInput")}
                    className="w-28 rounded-lg border bg-background px-2 py-1 text-right text-lg font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
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
