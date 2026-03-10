"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PhaseProgressBar } from "./PhaseProgressBar";
import { PointsAnimation } from "./PointsAnimation";
import { PhaseTransition } from "./PhaseTransition";
import { VisualCardSelector } from "./VisualCardSelector";
import { completePhase2Action } from "@/server/actions/expedition.actions";
import { getDefaultCurrency, formatCurrency } from "@/lib/utils/currency";
import type { BadgeKey, Rank } from "@/types/gamification.types";
import { getTotalPassengers, type Passengers } from "@/lib/validations/trip.schema";

interface Phase2WizardProps {
  tripId: string;
}

// Step definitions (order matters)
type StepKey = "travelerType" | "passengers" | "accommodation" | "pace" | "budget" | "preferences" | "confirmation";

const MIN_PASSENGER_STEPPER = 0;
const MAX_PASSENGER_STEPPER = 20;
const MAX_CHILD_AGE = 17;

export function Phase2Wizard({ tripId }: Phase2WizardProps) {
  const t = useTranslations("expedition.phase2");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
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
  const [adults, setAdults] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [seniors, setSeniors] = useState(0);
  const [infants, setInfants] = useState(0);
  const [accommodationStyle, setAccommodationStyle] = useState<string | null>(null);
  const [travelPace, setTravelPace] = useState(5);
  const [budget, setBudget] = useState(1000);
  const [currency, setCurrency] = useState(() => getDefaultCurrency(locale));
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [accessibility, setAccessibility] = useState("");

  const stepContentRef = useRef<HTMLDivElement>(null);

  // Total passengers derived value
  const totalPassengers = adults + childrenCount + seniors + infants;

  // Dynamic step array based on traveler type
  const steps = useMemo((): StepKey[] => {
    const base: StepKey[] = ["travelerType"];
    if (travelerType === "family" || travelerType === "group") {
      base.push("passengers");
    }
    base.push("accommodation", "pace", "budget", "preferences", "confirmation");
    return base;
  }, [travelerType]);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  function goToStep(index: number) {
    setCurrentStepIndex(index);
    setErrorMessage(null);
    requestAnimationFrame(() => {
      const firstInput = stepContentRef.current?.querySelector<HTMLElement>(
        "input, button[role='radio'], button[type='submit']"
      );
      firstInput?.focus();
    });
  }

  function handleNext() {
    // Validate current step
    if (currentStep === "travelerType" && !travelerType) {
      setErrorMessage(t("errors.travelerTypeRequired"));
      return;
    }
    if (currentStep === "passengers" && totalPassengers < 2) {
      setErrorMessage(t("errors.groupSizeMin"));
      return;
    }
    if (currentStep === "accommodation" && !accommodationStyle) {
      setErrorMessage(t("errors.accommodationRequired"));
      return;
    }
    if (currentStep === "budget") {
      if (budget < 100) { setErrorMessage(t("errors.budgetMin")); return; }
      if (budget > 100000) { setErrorMessage(t("errors.budgetMax")); return; }
    }
    goToStep(currentStepIndex + 1);
  }

  function handleBack() {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  }

  async function handleSubmit() {
    if (!travelerType || !accommodationStyle) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const needsPassengers = travelerType === "family" || travelerType === "group";

    try {
      const result = await completePhase2Action(tripId, {
        travelerType: travelerType as "solo" | "couple" | "family" | "group" | "business" | "student",
        accommodationStyle: accommodationStyle as "budget" | "comfort" | "luxury" | "adventure",
        travelPace,
        budget,
        currency: currency as "USD" | "EUR" | "BRL",
        travelers: needsPassengers ? totalPassengers : undefined,
        passengers: needsPassengers
          ? {
              adults,
              children: { count: childrenCount, ages: childrenAges },
              seniors,
              infants,
            }
          : undefined,
        dietaryRestrictions: dietaryRestrictions.trim() || undefined,
        accessibility: accessibility.trim() || undefined,
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
    router.push(`/expedition/${tripId}/phase-3`);
  }

  const travelerTypeOptions = [
    { value: "solo", label: t("step1.solo"), emoji: t("step1.soloEmoji") },
    { value: "couple", label: t("step1.couple"), emoji: t("step1.coupleEmoji") },
    { value: "family", label: t("step1.family"), emoji: t("step1.familyEmoji") },
    { value: "group", label: t("step1.group"), emoji: t("step1.groupEmoji") },
    { value: "business", label: t("step1.business"), emoji: t("step1.businessEmoji") },
    { value: "student", label: t("step1.student"), emoji: t("step1.studentEmoji") },
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
        <PhaseProgressBar currentStep={currentStepIndex + 1} totalSteps={totalSteps} />

        <div className="mt-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
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
              className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30"
            >
              {errorMessage}
            </div>
          )}

          {/* Traveler Type */}
          {currentStep === "travelerType" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step1.title")}</h2>
              <VisualCardSelector
                options={travelerTypeOptions}
                value={travelerType}
                onChange={(val) => {
                  setTravelerType(val);
                  // Reset passengers when switching away from group/family
                  if (val !== "family" && val !== "group") {
                    setAdults(1);
                    setChildrenCount(0);
                    setChildrenAges([]);
                    setSeniors(0);
                    setInfants(0);
                  }
                }}
                label={t("step1.title")}
              />
              <Button onClick={handleNext} size="lg" className="w-full">
                {tCommon("next")}
              </Button>
            </div>
          )}

          {/* Passengers (conditional — family/group only) */}
          {currentStep === "passengers" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("passengers.title")}</h2>

              {/* Adults */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{t("passengers.adults")}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{t("passengers.adultsHint")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
                    aria-label={t("passengers.decrease", { type: t("passengers.adults") })}
                  >
                    -
                  </button>
                  <span className="min-w-[2rem] text-center text-xl font-bold">{adults}</span>
                  <button
                    type="button"
                    onClick={() => setAdults(Math.min(MAX_PASSENGER_STEPPER, adults + 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
                    aria-label={t("passengers.increase", { type: t("passengers.adults") })}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{t("passengers.children")}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{t("passengers.childrenHint")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const newCount = Math.max(MIN_PASSENGER_STEPPER, childrenCount - 1);
                      setChildrenCount(newCount);
                      setChildrenAges((prev) => prev.slice(0, newCount));
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
                    aria-label={t("passengers.decrease", { type: t("passengers.children") })}
                  >
                    -
                  </button>
                  <span className="min-w-[2rem] text-center text-xl font-bold">{childrenCount}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newCount = Math.min(MAX_PASSENGER_STEPPER, childrenCount + 1);
                      setChildrenCount(newCount);
                      setChildrenAges((prev) => [...prev, 5]); // default age 5
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
                    aria-label={t("passengers.increase", { type: t("passengers.children") })}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Children ages */}
              {childrenCount > 0 && (
                <div className="flex flex-wrap gap-2 pl-2">
                  {childrenAges.map((age, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <Label htmlFor={`child-age-${idx}`} className="text-xs">
                        {t("passengers.childAge", { number: idx + 1 })}
                      </Label>
                      <select
                        id={`child-age-${idx}`}
                        value={age}
                        onChange={(e) => {
                          const newAges = [...childrenAges];
                          newAges[idx] = parseInt(e.target.value);
                          setChildrenAges(newAges);
                        }}
                        className="flex h-9 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      >
                        {Array.from({ length: MAX_CHILD_AGE + 1 }, (_, i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Seniors */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{t("passengers.seniors")}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{t("passengers.seniorsHint")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSeniors(Math.max(MIN_PASSENGER_STEPPER, seniors - 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
                    aria-label={t("passengers.decrease", { type: t("passengers.seniors") })}
                  >
                    -
                  </button>
                  <span className="min-w-[2rem] text-center text-xl font-bold">{seniors}</span>
                  <button
                    type="button"
                    onClick={() => setSeniors(Math.min(MAX_PASSENGER_STEPPER, seniors + 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
                    aria-label={t("passengers.increase", { type: t("passengers.seniors") })}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Infants */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{t("passengers.infants")}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{t("passengers.infantsHint")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setInfants(Math.max(MIN_PASSENGER_STEPPER, infants - 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
                    aria-label={t("passengers.decrease", { type: t("passengers.infants") })}
                  >
                    -
                  </button>
                  <span className="min-w-[2rem] text-center text-xl font-bold">{infants}</span>
                  <button
                    type="button"
                    onClick={() => setInfants(Math.min(MAX_PASSENGER_STEPPER, infants + 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border text-lg font-bold hover:border-atlas-gold/40"
                    aria-label={t("passengers.increase", { type: t("passengers.infants") })}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total */}
              <p className="text-center text-sm font-medium text-muted-foreground">
                {t("passengers.total", { count: totalPassengers })}
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  &larr;
                </Button>
                <Button onClick={handleNext} className="flex-[3]">
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Accommodation */}
          {currentStep === "accommodation" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step2.title")}</h2>
              <VisualCardSelector
                options={accommodationOptions}
                value={accommodationStyle}
                onChange={setAccommodationStyle}
                label={t("step2.title")}
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  &larr;
                </Button>
                <Button onClick={handleNext} className="flex-[3]">
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Travel Pace */}
          {currentStep === "pace" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step3.title")}</h2>
              <div className="flex justify-between text-sm text-muted-foreground">
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
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  &larr;
                </Button>
                <Button onClick={handleNext} className="flex-[3]">
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Budget */}
          {currentStep === "budget" && (
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
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  &larr;
                </Button>
                <Button onClick={handleNext} className="flex-[3]">
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Preferences */}
          {currentStep === "preferences" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("preferences.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("preferences.subtitle")}</p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phase2-dietary">{t("preferences.dietary")}</Label>
                <Input
                  id="phase2-dietary"
                  type="text"
                  value={dietaryRestrictions}
                  onChange={(e) => setDietaryRestrictions(e.target.value)}
                  maxLength={300}
                  placeholder={t("preferences.dietaryPlaceholder")}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phase2-accessibility">{t("preferences.accessibility")}</Label>
                <Input
                  id="phase2-accessibility"
                  type="text"
                  value={accessibility}
                  onChange={(e) => setAccessibility(e.target.value)}
                  maxLength={300}
                  placeholder={t("preferences.accessibilityPlaceholder")}
                />
              </div>

              <p className="text-xs text-muted-foreground/70">{t("preferences.optional")}</p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  &larr;
                </Button>
                <Button onClick={handleNext} className="flex-[3]">
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {currentStep === "confirmation" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("step5.title")}</h2>
              <div className="rounded-xl border border-border bg-muted p-4">
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  {t("step5.summary")}
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("step5.travelerType")}</dt>
                    <dd className="font-medium capitalize">{travelerType}</dd>
                  </div>
                  {(travelerType === "family" || travelerType === "group") && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("step5.passengers")}</dt>
                      <dd className="font-medium">
                        {t("passengers.total", { count: totalPassengers })}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("step5.accommodation")}</dt>
                    <dd className="font-medium capitalize">{accommodationStyle}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("step5.pace")}</dt>
                    <dd className="font-medium">{travelPace}/10</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("step5.budget")}</dt>
                    <dd className="font-medium">
                      {formatCurrency(budget, currency, locale)}
                    </dd>
                  </div>
                  {dietaryRestrictions && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("step5.dietaryRestrictions")}</dt>
                      <dd className="font-medium">{dietaryRestrictions}</dd>
                    </div>
                  )}
                  {accessibility && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("step5.accessibility")}</dt>
                      <dd className="font-medium">{accessibility}</dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  &larr;
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
