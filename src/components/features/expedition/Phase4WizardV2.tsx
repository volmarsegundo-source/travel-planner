"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useFormDirty } from "@/hooks/useFormDirty";
import { AtlasCard } from "@/components/ui/AtlasCard";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasChip } from "@/components/ui/AtlasChip";
import { PhaseShell } from "./PhaseShell";
import { WizardFooter } from "./WizardFooter";
import { TransportStep } from "./TransportStep";
import { AccommodationStep } from "./AccommodationStep";
import { MobilityStep } from "./MobilityStep";
import { advanceFromPhaseAction } from "@/server/actions/expedition.actions";
import {
  saveTransportSegmentsAction,
  getTransportSegmentsAction,
  saveAccommodationsAction,
  getAccommodationsAction,
  saveLocalMobilityAction,
  getLocalMobilityAction,
} from "@/server/actions/transport.actions";
import type { TransportSegmentInput, AccommodationInput } from "@/lib/validations/transport.schema";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";
import { PhaseFooter } from "./PhaseFooter";

// ─── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;
const SAVE_SUCCESS_TIMEOUT_MS = 2000;

// ─── Inline Icons ──────────────────────────────────────────────────────────────

function PlaneIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Phase4WizardV2Props {
  tripId: string;
  tripType: string;
  origin: string | null;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  currentPhase?: number;
  accessMode?: PhaseAccessMode;
  tripCurrentPhase?: number;
  completedPhases?: number[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Phase4WizardV2({
  tripId,
  tripType,
  origin,
  destination,
  startDate,
  endDate,
  currentPhase,
  accessMode = "first_visit",
  tripCurrentPhase = 4,
  completedPhases = [],
}: Phase4WizardV2Props) {
  const t = useTranslations("expedition.phase4");
  const tExpedition = useTranslations("expedition");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("expedition.phase4.validation");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  // Prerequisites state (car rental / CNH)
  const [needsCarRental, setNeedsCarRental] = useState<boolean | null>(null);
  const [cnhConfirmed, setCnhConfirmed] = useState(false);

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Data states
  const [transportSegments, setTransportSegments] = useState<TransportSegmentInput[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationInput[]>([]);
  const [mobility, setMobility] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Dirty tracking
  const stepFormValues = useMemo(() => {
    if (currentStep === 1) {
      return { transportSegments: JSON.stringify(transportSegments) };
    }
    if (currentStep === 2) {
      return { accommodations: JSON.stringify(accommodations) };
    }
    return { mobility: JSON.stringify(mobility) };
  }, [currentStep, transportSegments, accommodations, mobility]);

  const { isDirty: rawDirty, markClean } = useFormDirty(stepFormValues);
  const [userEdited, setUserEdited] = useState(false);
  const isDirty = userEdited && rawDirty;

  // Save states
  const [savingTransport, setSavingTransport] = useState(false);
  const [savingAccommodation, setSavingAccommodation] = useState(false);
  const [savingMobility, setSavingMobility] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Completion flow states
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const isRevisiting = accessMode === "revisit" || (currentPhase !== undefined && currentPhase > 4);
  const needsCinh = tripType === "international" || tripType === "schengen";
  const isMercosul = tripType === "mercosul";

  const cinhDeadline = startDate ? formatDeadlineFromDays(startDate, 45) : null;

  // Reset dirty baseline
  useEffect(() => {
    markClean();
    setUserEdited(false);
  }, [currentStep, loadingData, markClean]);

  // onChange handlers
  const handleTransportChange = useCallback((segments: TransportSegmentInput[]) => {
    setTransportSegments(segments);
    if (!loadingData) setUserEdited(true);
  }, [loadingData]);

  const handleAccommodationChange = useCallback((accs: AccommodationInput[]) => {
    setAccommodations(accs);
    if (!loadingData) setUserEdited(true);
  }, [loadingData]);

  const handleMobilityChange = useCallback((selected: string[]) => {
    setMobility(selected);
    if (!loadingData) setUserEdited(true);
  }, [loadingData]);

  function goToStep(step: number) {
    setCurrentStep(step);
    setErrorMessage(null);
    setValidationErrors([]);
  }

  /** Validate the current step before navigating forward */
  function validateCurrentStep(): string[] {
    const errors: string[] = [];
    if (currentStep === 1) {
      const hasValid = transportSegments.some(
        (s) => s.transportType && s.departurePlace && s.arrivalPlace && s.departureAt && s.arrivalAt,
      );
      if (!hasValid) errors.push(tValidation("transportRequired"));
    }
    if (currentStep === 2) {
      const hasValid = accommodations.some(
        (a) => a.accommodationType && a.checkIn && a.checkOut,
      );
      if (!hasValid) errors.push(tValidation("accommodationRequired"));
    }
    if (currentStep === 3 && mobility.length === 0) {
      errors.push(tValidation("mobilityRequired"));
    }
    return errors;
  }

  function handleStepNext(nextStep: number) {
    const errors = validateCurrentStep();
    setValidationErrors(errors);
    if (errors.length > 0) return;
    goToStep(nextStep);
  }

  // Load existing data
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [transportResult, accommodationResult, mobilityResult] =
        await Promise.all([
          getTransportSegmentsAction(tripId),
          getAccommodationsAction(tripId),
          getLocalMobilityAction(tripId),
        ]);

      if (transportResult.success && transportResult.data) {
        setTransportSegments(transportResult.data.segments as TransportSegmentInput[]);
      }
      if (accommodationResult.success && accommodationResult.data) {
        setAccommodations(accommodationResult.data.accommodations as AccommodationInput[]);
      }
      if (mobilityResult.success && mobilityResult.data) {
        setMobility(mobilityResult.data.mobility);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingData(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Save handlers ──────────────────────────────────────────────────────

  async function handleSaveTransport(segments: TransportSegmentInput[]) {
    setSavingTransport(true);
    setErrorMessage(null);
    try {
      const result = await saveTransportSegmentsAction(tripId, segments);
      if (!result.success) {
        setErrorMessage(result.error);
      } else {
        setSaveSuccess("transport");
        markClean();
        setUserEdited(false);
        setTimeout(() => setSaveSuccess(null), SAVE_SUCCESS_TIMEOUT_MS);
      }
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setSavingTransport(false);
    }
  }

  async function handleSaveAccommodation(accs: AccommodationInput[]) {
    setSavingAccommodation(true);
    setErrorMessage(null);
    try {
      const result = await saveAccommodationsAction(tripId, accs);
      if (!result.success) {
        setErrorMessage(result.error);
      } else {
        setSaveSuccess("accommodation");
        markClean();
        setUserEdited(false);
        setTimeout(() => setSaveSuccess(null), SAVE_SUCCESS_TIMEOUT_MS);
      }
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setSavingAccommodation(false);
    }
  }

  async function handleSaveMobility(selected: string[]) {
    setSavingMobility(true);
    setErrorMessage(null);
    setMobility(selected);
    try {
      const result = await saveLocalMobilityAction(tripId, selected);
      if (!result.success) {
        setErrorMessage(result.error);
      } else {
        setSaveSuccess("mobility");
        markClean();
        setUserEdited(false);
        setTimeout(() => setSaveSuccess(null), SAVE_SUCCESS_TIMEOUT_MS);
      }
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setSavingMobility(false);
    }
  }

  async function handleSaveCurrentStep() {
    if (currentStep === 1) await handleSaveTransport(transportSegments);
    else if (currentStep === 2) await handleSaveAccommodation(accommodations);
    else if (currentStep === 3) await handleSaveMobility(mobility);
  }

  // ─── Validation ──────────────────────────────────────────────────────────

  function validatePhase4(): string[] {
    const errors: string[] = [];
    const hasValidTransport = transportSegments.some(
      (s) => s.transportType && s.departurePlace && s.arrivalPlace && s.departureAt && s.arrivalAt,
    );
    if (!hasValidTransport) errors.push(tValidation("transportRequired"));

    const hasValidAccommodation = accommodations.some(
      (a) => a.accommodationType && a.checkIn && a.checkOut,
    );
    if (!hasValidAccommodation) errors.push(tValidation("accommodationRequired"));

    if (mobility.length === 0) {
      errors.push(tValidation("mobilityRequired"));
    }
    return errors;
  }

  async function handleAdvance() {
    const errors = validatePhase4();
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setIsCompleting(true);
    setErrorMessage(null);

    try {
      const result = await advanceFromPhaseAction(tripId, 4, {
        needsCarRental: needsCarRental ?? false,
        cnhResolved: needsCarRental ? (needsCinh ? cnhConfirmed : true) : true,
        transportUndecided: false,
        accommodationUndecided: false,
        mobilityUndecided: false,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setIsCompleting(false);
        return;
      }

      router.push(`/expedition/${tripId}/${logisticsNextPath}`);
    } catch {
      setErrorMessage("errors.generic");
      setIsCompleting(false);
    }
  }

  const isSaving = savingTransport || savingAccommodation || savingMobility;

  // Flag-aware navigation paths (SPEC-UX-REORDER-PHASES §5.2)
  // Flag OFF: Logistics is phase-4. Back = Checklist (phase-3), Next = Guide (phase-5)
  // Flag ON:  Logistics is phase-5. Back = Itinerary (phase-4), Next = Checklist (phase-6)
  const logisticsBackPath = isPhaseReorderEnabled() ? "phase-4" : "phase-3";
  const logisticsNextPath = isPhaseReorderEnabled() ? "phase-6" : "phase-5";
  const logisticsAdvanceLabel = isPhaseReorderEnabled()
    ? t("ctaNextReordered")
    : tExpedition("cta.advance");

  // Step indicator items
  const stepItems = [
    { label: t("steps.transport.title"), icon: <PlaneIcon /> },
    { label: t("steps.accommodation.title"), icon: <HomeIcon /> },
    { label: t("steps.mobility.title"), icon: <CarIcon /> },
  ];

  return (
    <PhaseShell
      tripId={tripId}
      viewingPhase={4}
      tripCurrentPhase={tripCurrentPhase}
      completedPhases={completedPhases}
      phaseTitle={t("title")}
      phaseSubtitle={isPhaseReorderEnabled() ? t("subtitleReordered") : t("subtitle")}
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      isEditMode={isRevisiting}
      showFooter={false}
      contentMaxWidth="2xl"
    >
      {/* V2 Step indicator */}
      <div className="mt-4 flex items-center justify-center gap-2" data-testid="phase4-v2-steps">
        {stepItems.map((item, i) => (
          <AtlasChip
            key={i}
            mode="selectable"
            selected={currentStep === i + 1}
            onSelectionChange={() => goToStep(i + 1)}
            size="sm"
            color={currentStep === i + 1 ? "primary" : "default"}
          >
            {item.label}
          </AtlasChip>
        ))}
      </div>

      <p className="mt-2 text-center text-sm font-atlas-body text-atlas-on-surface-variant">
        {destination} — {t(`tripTypes.${tripType}`)}
      </p>

      {errorMessage && (
        <AtlasCard variant="base" className="mt-4 !bg-atlas-error-container !border-atlas-error/30" role="alert">
          <p className="text-sm font-atlas-body text-atlas-error">
            {errorMessage.startsWith("errors.")
              ? tErrors(errorMessage.replace("errors.", ""))
              : errorMessage}
          </p>
        </AtlasCard>
      )}

      {saveSuccess && (
        <AtlasCard variant="base" className="mt-2 !bg-atlas-success-container/30 !border-atlas-success-container">
          <p className="text-sm font-atlas-body text-atlas-success">
            {t(`steps.${saveSuccess}.saved`)}
          </p>
        </AtlasCard>
      )}

      {validationErrors.length > 0 && (
        <AtlasCard
          variant="base"
          className="mt-4 !bg-atlas-warning-container/20 !border-atlas-warning/30"
          role="alert"
          data-testid="phase4-v2-validation-banner"
        >
          <p className="font-medium font-atlas-body text-sm text-atlas-on-surface">{tValidation("banner")}</p>
          <ul className="mt-2 list-inside list-disc text-atlas-on-surface-variant text-sm">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </AtlasCard>
      )}

      {loadingData ? (
        <div className="mt-8 flex flex-col gap-4">
          <AtlasCard loading />
          <AtlasCard loading />
        </div>
      ) : (
        <>
          {/* Step 1: Transport */}
          {currentStep === 1 && (
            <div className="mt-8 flex flex-col gap-6">
              <TransportStep
                tripId={tripId}
                initialSegments={transportSegments}
                onSave={handleSaveTransport}
                saving={savingTransport}
                prefillOrigin={origin}
                prefillDestination={destination}
                prefillStartDate={startDate}
                onChange={handleTransportChange}
              />
              <WizardFooter
                onBack={() => router.push(`/expedition/${tripId}/${logisticsBackPath}`)}
                onPrimary={() => handleStepNext(2)}
                primaryLabel={tCommon("next")}
                onSave={handleSaveCurrentStep}
                isDirty={isDirty}
                saveSuccess={!!saveSuccess}
                isLoading={isSaving}
              />
            </div>
          )}

          {/* Step 2: Accommodation */}
          {currentStep === 2 && (
            <div className="mt-8 flex flex-col gap-6">
              <AccommodationStep
                tripId={tripId}
                initialAccommodations={accommodations}
                onSave={handleSaveAccommodation}
                saving={savingAccommodation}
                onChange={handleAccommodationChange}
                tripStartDate={startDate}
                tripEndDate={endDate}
              />
              <WizardFooter
                onBack={() => goToStep(1)}
                onPrimary={() => handleStepNext(3)}
                primaryLabel={tCommon("next")}
                onSave={handleSaveCurrentStep}
                isDirty={isDirty}
                saveSuccess={!!saveSuccess}
                isLoading={isSaving}
              />
            </div>
          )}

          {/* Step 3: Mobility + Car Rental + Advance */}
          {currentStep === 3 && (
            <div className="mt-8 flex flex-col gap-6">
              <MobilityStep
                tripId={tripId}
                initialMobility={mobility}
                onSave={handleSaveMobility}
                saving={savingMobility}
                onChange={handleMobilityChange}
              />

              {/* Car rental prerequisites */}
              {mobility.includes("car_rental") && (
                <>
                  <AtlasCard variant="base">
                    <h2 className="text-lg font-atlas-headline font-bold text-atlas-on-surface">
                      {t("carRentalQuestion")}
                    </h2>
                    <p className="mt-1 text-sm font-atlas-body text-atlas-on-surface-variant">
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
                        className={`flex-1 rounded-atlas-lg border-2 p-4 text-center transition-all min-h-[44px] ${
                          needsCarRental === true
                            ? "border-atlas-secondary-container bg-atlas-secondary-container/10 text-atlas-on-surface"
                            : "border-atlas-outline-variant/20 bg-atlas-surface-container-lowest text-atlas-on-surface-variant hover:border-atlas-secondary-container/30"
                        }`}
                        aria-pressed={needsCarRental === true}
                      >
                        <span className="block text-2xl" aria-hidden="true">{"\uD83D\uDE97"}</span>
                        <span className="mt-1 block text-sm font-medium font-atlas-body">{t("carRentalYes")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNeedsCarRental(false);
                          setCnhConfirmed(false);
                          setErrorMessage(null);
                        }}
                        className={`flex-1 rounded-atlas-lg border-2 p-4 text-center transition-all min-h-[44px] ${
                          needsCarRental === false
                            ? "border-atlas-secondary-container bg-atlas-secondary-container/10 text-atlas-on-surface"
                            : "border-atlas-outline-variant/20 bg-atlas-surface-container-lowest text-atlas-on-surface-variant hover:border-atlas-secondary-container/30"
                        }`}
                        aria-pressed={needsCarRental === false}
                      >
                        <span className="block text-2xl" aria-hidden="true">{"\uD83D\uDE8C"}</span>
                        <span className="mt-1 block text-sm font-medium font-atlas-body">{t("carRentalNo")}</span>
                      </button>
                    </div>
                  </AtlasCard>

                  {/* CNH Alert Section */}
                  {needsCarRental === true && needsCinh && (
                    <AtlasCard variant="base" className="!border-atlas-error/30 !bg-atlas-error-container/10">
                      <div className="flex items-start gap-3">
                        <span className="text-xl" aria-hidden="true">{"\u26A0\uFE0F"}</span>
                        <div className="flex-1">
                          <h3 className="font-atlas-headline font-bold text-atlas-on-surface">{t("cinhRequired")}</h3>
                          <p className="mt-1 text-sm font-atlas-body text-atlas-on-surface-variant">{t("cinhDescription")}</p>
                          {cinhDeadline && (
                            <p className="mt-2 text-sm font-medium font-atlas-body text-atlas-error">{t("cinhDeadline", { date: cinhDeadline })}</p>
                          )}
                          <p className="mt-2 text-sm font-atlas-body text-atlas-on-surface-variant">{t("cinhLeadTime", { days: 45 })}</p>
                          <label className="mt-4 flex cursor-pointer items-start gap-3 min-h-[44px]">
                            <input
                              type="checkbox"
                              checked={cnhConfirmed}
                              onChange={(e) => setCnhConfirmed(e.target.checked)}
                              className="mt-0.5 h-5 w-5 rounded border-atlas-outline-variant accent-atlas-secondary-container"
                            />
                            <span className="text-sm font-atlas-body text-atlas-on-surface">{t("cinhConfirm")}</span>
                          </label>
                        </div>
                      </div>
                    </AtlasCard>
                  )}

                  {needsCarRental === true && isMercosul && (
                    <AtlasCard variant="base" className="!border-atlas-success-container !bg-atlas-success-container/10">
                      <div className="flex items-start gap-3">
                        <span className="text-xl" aria-hidden="true">{"\u2705"}</span>
                        <div className="flex-1">
                          <h3 className="font-atlas-headline font-bold text-atlas-on-surface">{t("cnhBrasileiraValid")}</h3>
                          <p className="mt-1 text-sm font-atlas-body text-atlas-on-surface-variant">{t("cnhBrasileiraDescription")}</p>
                        </div>
                      </div>
                    </AtlasCard>
                  )}

                  {needsCarRental === true && tripType === "domestic" && (
                    <AtlasCard variant="base" className="!border-atlas-success-container !bg-atlas-success-container/10">
                      <div className="flex items-start gap-3">
                        <span className="text-xl" aria-hidden="true">{"\u2705"}</span>
                        <div className="flex-1">
                          <h3 className="font-atlas-headline font-bold text-atlas-on-surface">{t("cnhRegularValid")}</h3>
                          <p className="mt-1 text-sm font-atlas-body text-atlas-on-surface-variant">{t("cnhRegularDescription")}</p>
                        </div>
                      </div>
                    </AtlasCard>
                  )}

                  {needsCarRental === false && (
                    <AtlasCard variant="base" className="text-center">
                      <span className="text-2xl" aria-hidden="true">{"\uD83D\uDC4D"}</span>
                      <p className="mt-2 text-sm font-atlas-body text-atlas-on-surface-variant">{t("noCarRental")}</p>
                    </AtlasCard>
                  )}
                </>
              )}

              <PhaseFooter
                onNext={isRevisiting ? () => router.push(`/expedition/${tripId}/${logisticsNextPath}`) : handleAdvance}
                onBack={() => goToStep(2)}
                isSubmitting={isCompleting}
                canAdvance={!isCompleting}
                isDirty={isDirty}
                onSave={handleSaveCurrentStep}
              />
            </div>
          )}
        </>
      )}
    </PhaseShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadlineFromDays(startDateIso: string, daysBefore: number): string | null {
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
