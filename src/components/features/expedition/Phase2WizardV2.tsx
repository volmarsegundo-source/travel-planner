"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useFormDirty } from "@/hooks/useFormDirty";
import { AtlasButton, AtlasCard, AtlasChip, AtlasStepperInput } from "@/components/ui";
import { AtlasInput } from "@/components/ui";
import { PhaseShell } from "./PhaseShell";
import { PreferencesSection } from "@/components/features/profile/PreferencesSection";
import { completePhase2Action, updatePhase2Action } from "@/server/actions/expedition.actions";
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

interface Phase2WizardV2Props {
  tripId: string;
  tripContext?: TripContext;
  savedData?: SavedPhase2Data;
  savedPassengers?: SavedPassengers;
  savedPreferences?: UserPreferences;
  accessMode?: PhaseAccessMode;
  tripCurrentPhase?: number;
  completedPhases?: number[];
}

type StepKey = "travelerType" | "passengers" | "accommodation" | "budget" | "preferences" | "confirmation";

const MAX_TOTAL_PASSENGERS = 20;

export function Phase2WizardV2({
  tripId,
  tripContext,
  savedData,
  savedPassengers,
  savedPreferences,
  accessMode = "first_visit",
  tripCurrentPhase = 2,
  completedPhases = [],
}: Phase2WizardV2Props) {
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

  // Form data
  const [travelerType, setTravelerType] = useState<string | null>(savedData?.travelerType ?? null);
  const [adults, setAdults] = useState(savedPassengers?.adults ?? 1);
  const [childrenCount, setChildrenCount] = useState(savedPassengers?.children?.count ?? 0);
  const [childrenAges, setChildrenAges] = useState<number[]>(savedPassengers?.children?.ages ?? []);
  const [seniors, setSeniors] = useState(savedPassengers?.seniors ?? 0);
  const [infants, setInfants] = useState(savedPassengers?.infants ?? 0);
  const [accommodationStyle, setAccommodationStyle] = useState<string | null>(savedData?.accommodationStyle ?? null);
  const [budget, setBudget] = useState(savedData?.budget ?? 1000);
  const [currency, setCurrency] = useState(() => savedData?.currency ?? getDefaultCurrency(locale));
  const [selectedPreferences, setSelectedPreferences] = useState<UserPreferences>(
    () => savedPreferences ?? ({} as UserPreferences)
  );

  const excludedPreferenceCategories = ["travelPace", "budgetStyle", "socialPreference"] as const;

  // Dirty tracking
  const formValues = useMemo(() => ({
    travelerType: travelerType ?? "",
    accommodationStyle: accommodationStyle ?? "",
    budget: String(budget),
    currency,
    adults: String(adults),
    childrenCount: String(childrenCount),
    childrenAges: JSON.stringify(childrenAges),
    seniors: String(seniors),
    infants: String(infants),
    preferences: JSON.stringify(selectedPreferences),
  }), [travelerType, accommodationStyle, budget, currency, adults, childrenCount, childrenAges, seniors, infants, selectedPreferences]);

  const { isDirty: formDirty, markClean } = useFormDirty(formValues);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const stepContentRef = useRef<HTMLDivElement>(null);
  const totalPassengers = adults + childrenCount + seniors + infants;

  // Dynamic steps
  const steps = useMemo((): StepKey[] => {
    const base: StepKey[] = ["travelerType"];
    if (travelerType === "family" || travelerType === "group") {
      base.push("passengers");
    }
    base.push("accommodation", "budget", "preferences", "confirmation");
    return base;
  }, [travelerType]);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  async function handleSavePhase2() {
    if (!isEditMode || !travelerType || !accommodationStyle) return;
    const needsPassengers = travelerType === "family" || travelerType === "group";
    try {
      await updatePhase2Action(tripId, {
        travelerType: travelerType as "solo" | "couple" | "family" | "group" | "business" | "student",
        accommodationStyle: accommodationStyle as "budget" | "comfort" | "luxury" | "adventure",
        travelPace: 5,
        budget,
        currency: currency as "USD" | "EUR" | "BRL",
        travelers: needsPassengers ? totalPassengers : undefined,
        passengers: needsPassengers
          ? { adults, children: { count: childrenCount, ages: childrenAges }, seniors, infants }
          : undefined,
      });
      markClean();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setErrorMessage("errors.generic");
    }
  }

  function goToStep(index: number) {
    setCurrentStepIndex(index);
    setErrorMessage(null);
    requestAnimationFrame(() => {
      const firstInput = stepContentRef.current?.querySelector<HTMLElement>(
        "input, button[role='checkbox'], button[type='submit']"
      );
      firstInput?.focus();
    });
  }

  function handleNext() {
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

    if (accessMode === "revisit" && completedPhases.includes(2)) {
      const needsPassengers = travelerType === "family" || travelerType === "group";
      try {
        await updatePhase2Action(tripId, {
          travelerType: travelerType as "solo" | "couple" | "family" | "group" | "business" | "student",
          accommodationStyle: accommodationStyle as "budget" | "comfort" | "luxury" | "adventure",
          travelPace: 5,
          budget,
          currency: currency as "USD" | "EUR" | "BRL",
          travelers: needsPassengers ? totalPassengers : undefined,
          passengers: needsPassengers
            ? { adults, children: { count: childrenCount, ages: childrenAges }, seniors, infants }
            : undefined,
        });
      } catch {
        // Ignore save errors on revisit
      }
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
        travelPace: 5,
        budget,
        currency: currency as "USD" | "EUR" | "BRL",
        travelers: needsPassengers ? totalPassengers : undefined,
        passengers: needsPassengers
          ? { adults, children: { count: childrenCount, ages: childrenAges }, seniors, infants }
          : undefined,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
        return;
      }

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

  const getFooterProps = () => {
    const dirtyProps = isEditMode
      ? { onSave: handleSavePhase2, isDirty: formDirty, saveSuccess }
      : {};

    if (currentStep === "confirmation") {
      return {
        onBack: handleBack,
        onPrimary: handleSubmit,
        primaryLabel: isEditMode ? tCommon("save") : tExpedition("cta.advance"),
        isLoading: isSubmitting,
        isDisabled: isSubmitting,
        ...dirtyProps,
      };
    }
    return {
      onBack: currentStepIndex > 0
        ? handleBack
        : () => router.push(`/expedition/${tripId}/phase-1`),
      onPrimary: handleNext,
      primaryLabel: tCommon("next"),
      ...dirtyProps,
    };
  };

  // Manage children ages array
  function handleChildrenCountChange(count: number) {
    setChildrenCount(count);
    setChildrenAges((prev) => {
      if (count > prev.length) {
        return [...prev, ...Array(count - prev.length).fill(5)];
      }
      return prev.slice(0, count);
    });
  }

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
        data-testid="phase2-v2"
      >
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg bg-atlas-error-container px-4 py-3 text-sm font-atlas-body text-atlas-error border border-atlas-error/30"
          >
            {errorMessage.startsWith("errors.")
              ? tErrors(errorMessage.replace("errors.", ""))
              : errorMessage}
          </div>
        )}

        {/* Traveler Type */}
        {currentStep === "travelerType" && (
          <AtlasCard variant="base">
            <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface mb-4">
              {t("step1.title")}
            </h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("step1.title")}>
              {travelerTypeOptions.map((option) => (
                <AtlasChip
                  key={option.value}
                  mode="selectable"
                  color="primary"
                  selected={travelerType === option.value}
                  onSelectionChange={() => {
                    setTravelerType(option.value);
                    if (option.value !== "family" && option.value !== "group") {
                      setAdults(1);
                      setChildrenCount(0);
                      setChildrenAges([]);
                      setSeniors(0);
                      setInfants(0);
                    }
                  }}
                >
                  {option.emoji} {option.label}
                </AtlasChip>
              ))}
            </div>
          </AtlasCard>
        )}

        {/* Passengers */}
        {currentStep === "passengers" && (
          <AtlasCard variant="base">
            <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface mb-4">
              {t("passengers.title")}
            </h2>
            <div className="flex flex-col gap-4">
              <AtlasStepperInput
                value={adults}
                onChange={setAdults}
                min={1}
                max={MAX_TOTAL_PASSENGERS - (childrenCount + seniors + infants)}
                label={t("passengers.adults")}
                ariaValueText={`${adults} ${t("passengers.adults")}`}
                decreaseLabel={t("passengers.decrease")}
                increaseLabel={t("passengers.increase")}
              />
              <AtlasStepperInput
                value={childrenCount}
                onChange={handleChildrenCountChange}
                min={0}
                max={MAX_TOTAL_PASSENGERS - (adults + seniors + infants)}
                label={t("passengers.children")}
                ariaValueText={`${childrenCount} ${t("passengers.children")}`}
                decreaseLabel={t("passengers.decrease")}
                increaseLabel={t("passengers.increase")}
              />
              {childrenCount > 0 && (
                <div className="ml-4 flex flex-wrap gap-2">
                  {childrenAges.map((age, i) => (
                    <AtlasStepperInput
                      key={i}
                      value={age}
                      onChange={(v) => {
                        setChildrenAges((prev) => {
                          const next = [...prev];
                          next[i] = v;
                          return next;
                        });
                      }}
                      min={0}
                      max={17}
                      label={t("passengers.childAge", { number: i + 1 })}
                      ariaValueText={`${age} ${t("passengers.years")}`}
                      decreaseLabel={t("passengers.decrease")}
                      increaseLabel={t("passengers.increase")}
                    />
                  ))}
                </div>
              )}
              <AtlasStepperInput
                value={seniors}
                onChange={setSeniors}
                min={0}
                max={MAX_TOTAL_PASSENGERS - (adults + childrenCount + infants)}
                label={t("passengers.seniors")}
                ariaValueText={`${seniors} ${t("passengers.seniors")}`}
                decreaseLabel={t("passengers.decrease")}
                increaseLabel={t("passengers.increase")}
              />
              <AtlasStepperInput
                value={infants}
                onChange={setInfants}
                min={0}
                max={MAX_TOTAL_PASSENGERS - (adults + childrenCount + seniors)}
                label={t("passengers.infants")}
                ariaValueText={`${infants} ${t("passengers.infants")}`}
                decreaseLabel={t("passengers.decrease")}
                increaseLabel={t("passengers.increase")}
              />
              <p className="text-sm font-atlas-body text-atlas-on-surface-variant">
                {t("passengers.total", { count: totalPassengers })}
              </p>
              <div className="flex gap-3 mt-2">
                <AtlasButton variant="secondary" onClick={handleBack}>
                  {tCommon("back")}
                </AtlasButton>
                <AtlasButton onClick={handleNext} fullWidth>
                  {tCommon("next")}
                </AtlasButton>
              </div>
            </div>
          </AtlasCard>
        )}

        {/* Accommodation */}
        {currentStep === "accommodation" && (
          <AtlasCard variant="base">
            <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface mb-4">
              {t("step2.title")}
            </h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("step2.title")}>
              {accommodationOptions.map((option) => (
                <AtlasChip
                  key={option.value}
                  mode="selectable"
                  color="primary"
                  selected={accommodationStyle === option.value}
                  onSelectionChange={() => setAccommodationStyle(option.value)}
                >
                  {option.emoji} {option.label}
                </AtlasChip>
              ))}
            </div>
          </AtlasCard>
        )}

        {/* Budget */}
        {currentStep === "budget" && (
          <AtlasCard variant="base">
            <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface mb-4">
              {t("step4.title")}
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <AtlasInput
                  id="phase2-budget-v2"
                  label={t("step4.amount")}
                  type="text"
                  value={String(budget)}
                  onChange={(e) => setBudget(parseInt(e.target.value) || 100)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="phase2-currency-v2"
                  className="text-sm font-medium text-atlas-on-surface-variant"
                >
                  {t("step4.currency")}
                </label>
                <select
                  id="phase2-currency-v2"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex min-h-[48px] w-full rounded-lg border border-atlas-outline-variant bg-atlas-surface-container-low px-3 py-2 text-sm font-atlas-body text-atlas-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
            </div>
            <p className="mt-3 text-center text-lg font-bold font-atlas-headline text-atlas-on-surface">
              {formatCurrency(budget, currency, locale)}
            </p>
          </AtlasCard>
        )}

        {/* Preferences */}
        {currentStep === "preferences" && (
          <AtlasCard variant="base">
            <PreferencesSection
              initialPreferences={selectedPreferences}
              excludeCategories={[...excludedPreferenceCategories]}
              onPreferencesChange={setSelectedPreferences}
            />
          </AtlasCard>
        )}

        {/* Confirmation */}
        {currentStep === "confirmation" && (
          <AtlasCard variant="base">
            <h2 className="font-atlas-headline text-lg font-bold text-atlas-on-surface mb-4">
              {t("step5.title")}
            </h2>
            <div className="rounded-lg bg-atlas-surface-container-low p-4">
              <h3 className="mb-3 text-sm font-medium font-atlas-body text-atlas-on-surface-variant">
                {t("step5.summary")}
              </h3>
              <dl className="space-y-2 text-sm font-atlas-body">
                <div className="flex justify-between">
                  <dt className="text-atlas-on-surface-variant">{t("step5.destination")}</dt>
                  <dd className={tripContext?.destination ? "font-medium text-atlas-on-surface" : "text-atlas-outline-variant italic"}>
                    {tripContext?.destination || tCommon("notProvided")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-atlas-on-surface-variant">{t("step5.travelerType")}</dt>
                  <dd className={travelerType ? "font-medium text-atlas-on-surface" : "text-atlas-outline-variant italic"}>
                    {travelerType ? t(`step1.${travelerType}`) : tCommon("notProvided")}
                  </dd>
                </div>
                {(travelerType === "family" || travelerType === "group") && (
                  <div className="flex justify-between">
                    <dt className="text-atlas-on-surface-variant">{t("step5.passengers")}</dt>
                    <dd className="font-medium text-atlas-on-surface">
                      {t("passengers.total", { count: totalPassengers })}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-atlas-on-surface-variant">{t("step5.accommodation")}</dt>
                  <dd className={accommodationStyle ? "font-medium text-atlas-on-surface" : "text-atlas-outline-variant italic"}>
                    {accommodationStyle ? t(`step2.${accommodationStyle}`) : tCommon("notProvided")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-atlas-on-surface-variant">{t("step5.budget")}</dt>
                  <dd className="font-medium text-atlas-on-surface">
                    {formatCurrency(budget, currency, locale)}
                  </dd>
                </div>
              </dl>
            </div>
          </AtlasCard>
        )}
      </div>
    </PhaseShell>
  );
}
