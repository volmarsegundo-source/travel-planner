"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PhaseShell } from "./PhaseShell";
import { VisualCardSelector } from "./VisualCardSelector";
import { PassengersStep } from "./PassengersStep";
import { PreferencesSection } from "@/components/features/profile/PreferencesSection";
import { completePhase2Action } from "@/server/actions/expedition.actions";
import { getDefaultCurrency, formatCurrency } from "@/lib/utils/currency";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";
import type { UserPreferences } from "@/lib/validations/preferences.schema";

interface TripContext {
  destination?: string;
  origin?: string;
  startDate?: string;
  endDate?: string;
}

interface SavedPhase2Data {
  travelerType?: string;
  accommodationStyle?: string;
  travelPace?: number;
  budget?: number;
  currency?: string;
}

interface SavedPassengers {
  adults: number;
  children?: { count: number; ages: number[] };
  seniors: number;
  infants: number;
}

interface Phase2WizardProps {
  tripId: string;
  tripContext?: TripContext;
  /** Previously saved Phase 2 data for revisit pre-population */
  savedData?: SavedPhase2Data;
  /** Previously saved passengers breakdown */
  savedPassengers?: SavedPassengers;
  /** Access mode from navigation engine */
  accessMode?: PhaseAccessMode;
  /** Trip's current phase from DB */
  tripCurrentPhase?: number;
  /** Completed phase numbers from DB */
  completedPhases?: number[];
}

// Step definitions (order matters)
type StepKey = "travelerType" | "passengers" | "accommodation" | "pace" | "budget" | "preferences" | "confirmation";

export function Phase2Wizard({
  tripId,
  tripContext,
  savedData,
  savedPassengers,
  accessMode = "first_visit",
  tripCurrentPhase = 2,
  completedPhases = [],
}: Phase2WizardProps) {
  const t = useTranslations("expedition.phase2");
  const tExpedition = useTranslations("expedition");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();

  const isEditMode = accessMode === "revisit";

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form data -- pre-populate from saved expedition data when revisiting
  const [travelerType, setTravelerType] = useState<string | null>(savedData?.travelerType ?? null);
  const [adults, setAdults] = useState(savedPassengers?.adults ?? 1);
  const [childrenCount, setChildrenCount] = useState(savedPassengers?.children?.count ?? 0);
  const [childrenAges, setChildrenAges] = useState<number[]>(savedPassengers?.children?.ages ?? []);
  const [seniors, setSeniors] = useState(savedPassengers?.seniors ?? 0);
  const [infants, setInfants] = useState(savedPassengers?.infants ?? 0);
  const [accommodationStyle, setAccommodationStyle] = useState<string | null>(savedData?.accommodationStyle ?? null);
  const [travelPace, setTravelPace] = useState(savedData?.travelPace ?? 5);
  const [budget, setBudget] = useState(savedData?.budget ?? 1000);
  const [currency, setCurrency] = useState(() => savedData?.currency ?? getDefaultCurrency(locale));
  const [selectedPreferences, setSelectedPreferences] = useState<UserPreferences>({} as UserPreferences);

  // Categories already collected in earlier wizard steps
  const excludedPreferenceCategories = ["travelPace", "budgetStyle", "socialPreference"] as const;

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

    // Revisit guard: if revisiting a completed phase, just navigate without re-completing
    if (accessMode === "revisit" && completedPhases.includes(2)) {
      router.push(`/expedition/${tripId}/phase-3`);
      return;
    }

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
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
        return;
      }

      // Navigate directly to phase-3
      router.push(`/expedition/${tripId}/phase-3`);
    } catch {
      setErrorMessage("errors.generic");
      setIsSubmitting(false);
    }
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

  // Determine footer props based on current step
  const getFooterProps = () => {
    if (currentStep === "confirmation") {
      return {
        onBack: handleBack,
        onPrimary: handleSubmit,
        primaryLabel: isEditMode
          ? tCommon("save")
          : tExpedition("cta.advance"),
        isLoading: isSubmitting,
        isDisabled: isSubmitting,
      };
    }
    return {
      onBack: currentStepIndex > 0
        ? handleBack
        : () => router.push(`/expedition/${tripId}/phase-1`),
      onPrimary: handleNext,
      primaryLabel: tCommon("next"),
    };
  };

  return (
    <PhaseShell
      tripId={tripId}
      viewingPhase={2}
      tripCurrentPhase={tripCurrentPhase}
      completedPhases={completedPhases}
      phaseTitle={t("title")}
      phaseSubtitle={t("subtitle")}
      currentStep={currentStepIndex + 1}
      totalSteps={totalSteps}
      isEditMode={isEditMode}
      showFooter={currentStep !== "passengers"}
      footerProps={currentStep !== "passengers" ? getFooterProps() : undefined}
    >
      <div
        ref={stepContentRef}
        key={currentStep}
        className="flex flex-col gap-6"
        aria-live="polite"
        aria-atomic="true"
      >
        {errorMessage && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30"
          >
            {errorMessage.startsWith("errors.")
              ? tErrors(errorMessage.replace("errors.", ""))
              : errorMessage}
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
          </div>
        )}

        {/* Passengers (conditional -- family/group only) */}
        {currentStep === "passengers" && (
          <PassengersStep
            adults={adults}
            setAdults={setAdults}
            childrenCount={childrenCount}
            setChildrenCount={setChildrenCount}
            childrenAges={childrenAges}
            setChildrenAges={setChildrenAges}
            seniors={seniors}
            setSeniors={setSeniors}
            infants={infants}
            setInfants={setInfants}
            totalPassengers={totalPassengers}
            onNext={handleNext}
            onBack={handleBack}
          />
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
          </div>
        )}

        {/* Preferences */}
        {currentStep === "preferences" && (
          <div className="flex flex-col gap-4">
            <PreferencesSection
              initialPreferences={selectedPreferences}
              excludeCategories={[...excludedPreferenceCategories]}
              onPreferencesChange={setSelectedPreferences}
            />
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
                  <dt className="text-muted-foreground">{t("step5.destination")}</dt>
                  <dd className={tripContext?.destination ? "font-medium" : "text-muted-foreground/60 italic"}>
                    {tripContext?.destination || tCommon("notProvided")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step5.origin")}</dt>
                  <dd className={tripContext?.origin ? "font-medium" : "text-muted-foreground/60 italic"}>
                    {tripContext?.origin || tCommon("notProvided")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step5.dates")}</dt>
                  <dd className={(tripContext?.startDate || tripContext?.endDate) ? "font-medium" : "text-muted-foreground/60 italic"}>
                    {tripContext?.startDate && tripContext?.endDate
                      ? `${tripContext.startDate} \u2192 ${tripContext.endDate}`
                      : tripContext?.startDate || tripContext?.endDate || tCommon("notProvided")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step5.travelerType")}</dt>
                  <dd className={travelerType ? "font-medium" : "text-muted-foreground/60 italic"}>
                    {travelerType ? t(`step1.${travelerType}`) : tCommon("notProvided")}
                  </dd>
                </div>
                {(travelerType === "family" || travelerType === "group") && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("step5.passengers")}</dt>
                      <dd className="font-medium">
                        {t("passengers.total", { count: totalPassengers })}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground" />
                      <dd className="text-xs text-muted-foreground">
                        {t("step5.passengersDetail", {
                          adults,
                          children: childrenCount,
                          seniors,
                          infants,
                        })}
                      </dd>
                    </div>
                    {childrenCount > 0 && childrenAges.length > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground" />
                        <dd className="text-xs text-muted-foreground">
                          {t("step5.childrenAges", { ages: childrenAges.join(", ") })}
                        </dd>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("step5.accommodation")}</dt>
                  <dd className={accommodationStyle ? "font-medium" : "text-muted-foreground/60 italic"}>
                    {accommodationStyle ? t(`step2.${accommodationStyle}`) : tCommon("notProvided")}
                  </dd>
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
                {(() => {
                  const filledPrefs = Object.entries(selectedPreferences).filter(
                    ([, v]) => v !== null && v !== undefined && (!Array.isArray(v) || v.length > 0)
                  );
                  if (filledPrefs.length === 0) return null;
                  return (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("step5.preferences")}</dt>
                        <dd className="font-medium">
                          {t("step5.preferencesCount", { count: filledPrefs.length })}
                        </dd>
                      </div>
                      {filledPrefs.map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <dt className="text-muted-foreground text-xs pl-2">
                            {t(`step5.prefLabel.${key}` as Parameters<typeof t>[0])}
                          </dt>
                          <dd className="text-xs font-medium text-right max-w-[60%] truncate">
                            {Array.isArray(val)
                              ? val.map((v) => t(`step5.prefValue.${v}` as Parameters<typeof t>[0])).join(", ")
                              : t(`step5.prefValue.${val}` as Parameters<typeof t>[0])}
                          </dd>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </dl>
            </div>
          </div>
        )}
      </div>
    </PhaseShell>
  );
}
