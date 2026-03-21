"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
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

// ─── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;
const SAVE_SUCCESS_TIMEOUT_MS = 2000;

// ─── Props ──────────────────────────────────────────────────────────────────

interface Phase4WizardProps {
  tripId: string;
  tripType: string;
  origin: string | null;
  destination: string;
  startDate: string | null;
  currentPhase?: number;
  /** Access mode from navigation engine */
  accessMode?: PhaseAccessMode;
  /** Trip's current phase from DB */
  tripCurrentPhase?: number;
  /** Completed phase numbers from DB */
  completedPhases?: number[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Phase4Wizard({
  tripId,
  tripType,
  origin,
  destination,
  startDate,
  currentPhase,
  accessMode = "first_visit",
  tripCurrentPhase = 4,
  completedPhases = [],
}: Phase4WizardProps) {
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

  // Undecided states per step
  const [transportUndecided, setTransportUndecided] = useState(false);
  const [accommodationUndecided, setAccommodationUndecided] = useState(false);
  const [mobilityUndecided, setMobilityUndecided] = useState(false);

  // Dirty tracking per step
  const [isDirty, setIsDirty] = useState(false);

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

  // Calculate CINH deadline (45 days before trip)
  const cinhDeadline = startDate ? formatDeadlineFromDays(startDate, 45) : null;

  const _canComplete =
    needsCarRental === false ||
    (needsCarRental === true && !needsCinh) ||
    (needsCarRental === true && needsCinh && cnhConfirmed);

  // Reset dirty when step changes
  useEffect(() => {
    setIsDirty(false);
  }, [currentStep]);

  // ─── onChange handlers — sync child state to parent + mark dirty ────────

  const handleTransportChange = useCallback((segments: TransportSegmentInput[]) => {
    setTransportSegments(segments);
    if (!loadingData) setIsDirty(true);
  }, [loadingData]);

  const handleAccommodationChange = useCallback((accs: AccommodationInput[]) => {
    setAccommodations(accs);
    if (!loadingData) setIsDirty(true);
  }, [loadingData]);

  const handleMobilityChange = useCallback((selected: string[]) => {
    setMobility(selected);
    if (!loadingData) setIsDirty(true);
  }, [loadingData]);

  // ─── Step navigation ─────────────────────────────────────────────────────

  function goToStep(step: number) {
    setCurrentStep(step);
    setErrorMessage(null);
  }

  // Load existing data on mount
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
        setTransportSegments(
          transportResult.data.segments as TransportSegmentInput[]
        );
      }
      if (accommodationResult.success && accommodationResult.data) {
        setAccommodations(
          accommodationResult.data.accommodations as AccommodationInput[]
        );
      }
      if (mobilityResult.success && mobilityResult.data) {
        setMobility(mobilityResult.data.mobility);
      }
    } catch {
      // Silently fail — user can still fill in data
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
        setIsDirty(false);
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
        setIsDirty(false);
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
        setIsDirty(false);
        setTimeout(() => setSaveSuccess(null), SAVE_SUCCESS_TIMEOUT_MS);
      }
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setSavingMobility(false);
    }
  }

  // ─── Generic save for current step (used by WizardFooter) ─────────────

  async function handleSaveCurrentStep() {
    if (currentStep === 1) {
      await handleSaveTransport(transportSegments);
    } else if (currentStep === 2) {
      await handleSaveAccommodation(accommodations);
    } else if (currentStep === 3) {
      await handleSaveMobility(mobility);
    }
  }

  // ─── Validation ──────────────────────────────────────────────────────────

  function validatePhase4(): string[] {
    const errors: string[] = [];

    // Transport: skip validation if undecided
    if (!transportUndecided) {
      const hasValidTransport = transportSegments.some(
        (s) => s.transportType && s.departurePlace && s.arrivalPlace && s.departureAt && s.arrivalAt,
      );
      if (!hasValidTransport) {
        errors.push(tValidation("transportRequired"));
      }
    }

    // Accommodation: skip validation if undecided
    if (!accommodationUndecided) {
      const hasValidAccommodation = accommodations.some(
        (a) => a.accommodationType && a.checkIn && a.checkOut,
      );
      if (!hasValidAccommodation) {
        errors.push(tValidation("accommodationRequired"));
      }
    }

    // Mobility: skip validation if undecided
    if (!mobilityUndecided) {
      if (mobility.length === 0) {
        errors.push(tValidation("mobilityRequired"));
      }
    }

    return errors;
  }

  const allSectionsEmpty =
    transportSegments.length === 0 &&
    accommodations.length === 0 &&
    mobility.length === 0;

  const allUndecided = transportUndecided && accommodationUndecided && mobilityUndecided;

  // ─── Advance handler ─────────────────────────────────────────────────────

  async function handleAdvance() {
    // Run validation first (skip if all undecided)
    if (!allUndecided) {
      const errors = validatePhase4();
      setValidationErrors(errors);
      if (errors.length > 0) return;
    } else {
      setValidationErrors([]);
    }

    setIsCompleting(true);
    setErrorMessage(null);

    try {
      const result = await advanceFromPhaseAction(tripId, 4, {
        needsCarRental: needsCarRental ?? false,
        cnhResolved: needsCarRental ? (needsCinh ? cnhConfirmed : true) : true,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setIsCompleting(false);
        return;
      }

      // Navigate directly to phase 5 (no animation/transition)
      router.push(`/expedition/${tripId}/phase-5`);
    } catch {
      setErrorMessage("errors.generic");
      setIsCompleting(false);
    }
  }

  const isSaving = savingTransport || savingAccommodation || savingMobility;

  return (
    <PhaseShell
      tripId={tripId}
      viewingPhase={4}
      tripCurrentPhase={tripCurrentPhase}
      completedPhases={completedPhases}
      phaseTitle={t("title")}
      phaseSubtitle={t("subtitle")}
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      isEditMode={isRevisiting}
      showFooter={false}
      contentMaxWidth="2xl"
    >
      <p className="mt-2 text-center text-sm text-atlas-teal-light">
        {destination} — {t(`tripTypes.${tripType}`)}
      </p>

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30"
        >
          {errorMessage.startsWith("errors.")
            ? tErrors(errorMessage.replace("errors.", ""))
            : errorMessage}
        </div>
      )}

      {saveSuccess && (
        <div className="mt-2 rounded-md bg-atlas-teal/10 px-3 py-2 text-sm text-atlas-teal border border-atlas-teal/30">
          {t(`steps.${saveSuccess}.saved`)}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div
          data-testid="phase4-validation-banner"
          role="alert"
          className="mt-4 rounded-md border border-atlas-rust/30 bg-atlas-rust/5 px-4 py-3 text-sm text-foreground"
        >
          <p className="font-medium">{tValidation("banner")}</p>
          <ul className="mt-2 list-inside list-disc text-muted-foreground">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {loadingData ? (
        <div className="mt-8 flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-3/4" />
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
                onUndecidedChange={setTransportUndecided}
                initialUndecided={transportUndecided}
                onChange={handleTransportChange}
              />

              {/* Navigation */}
              <WizardFooter
                onBack={() => router.push(`/expedition/${tripId}/phase-3`)}
                onPrimary={() => goToStep(2)}
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
                onUndecidedChange={setAccommodationUndecided}
                initialUndecided={accommodationUndecided}
                onChange={handleAccommodationChange}
              />

              {/* Navigation */}
              <WizardFooter
                onBack={() => goToStep(1)}
                onPrimary={() => goToStep(3)}
                primaryLabel={tCommon("next")}
                onSave={handleSaveCurrentStep}
                isDirty={isDirty}
                saveSuccess={!!saveSuccess}
                isLoading={isSaving}
              />
            </div>
          )}

          {/* Step 3: Mobility + Car Rental (conditional) + Advance */}
          {currentStep === 3 && (
            <div className="mt-8 flex flex-col gap-6">
              <MobilityStep
                tripId={tripId}
                initialMobility={mobility}
                onSave={handleSaveMobility}
                saving={savingMobility}
                onUndecidedChange={setMobilityUndecided}
                initialUndecided={mobilityUndecided}
                onChange={handleMobilityChange}
              />

              {/* Car rental prerequisites — only shown when car_rental is selected */}
              {mobility.includes("car_rental") && (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {t("carRentalQuestion")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
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
                        className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                          needsCarRental === true
                            ? "border-atlas-gold bg-atlas-gold/10 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-atlas-gold/30"
                        }`}
                        aria-pressed={needsCarRental === true}
                      >
                        <span className="block text-2xl" aria-hidden="true">
                          {"\uD83D\uDE97"}
                        </span>
                        <span className="mt-1 block text-sm font-medium">
                          {t("carRentalYes")}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNeedsCarRental(false);
                          setCnhConfirmed(false);
                          setErrorMessage(null);
                        }}
                        className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                          needsCarRental === false
                            ? "border-atlas-gold bg-atlas-gold/10 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-atlas-gold/30"
                        }`}
                        aria-pressed={needsCarRental === false}
                      >
                        <span className="block text-2xl" aria-hidden="true">
                          {"\uD83D\uDE8C"}
                        </span>
                        <span className="mt-1 block text-sm font-medium">
                          {t("carRentalNo")}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* CNH Alert Section */}
                  {needsCarRental === true && (
                    <div>
                      {needsCinh && (
                        <div className="rounded-lg border-2 border-atlas-rust/30 bg-atlas-rust/5 p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xl" aria-hidden="true">
                              {"\u26A0\uFE0F"}
                            </span>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">
                                {t("cinhRequired")}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {t("cinhDescription")}
                              </p>
                              {cinhDeadline && (
                                <p className="mt-2 text-sm font-medium text-atlas-rust">
                                  {t("cinhDeadline", { date: cinhDeadline })}
                                </p>
                              )}
                              <p className="mt-2 text-sm text-muted-foreground">
                                {t("cinhLeadTime", { days: 45 })}
                              </p>
                              <label className="mt-4 flex cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={cnhConfirmed}
                                  onChange={(e) => setCnhConfirmed(e.target.checked)}
                                  className="mt-0.5 h-5 w-5 rounded border-border accent-atlas-gold"
                                />
                                <span className="text-sm text-foreground">
                                  {t("cinhConfirm")}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {isMercosul && (
                        <div className="rounded-lg border border-atlas-teal/30 bg-atlas-teal/5 p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xl" aria-hidden="true">
                              {"\u2705"}
                            </span>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">
                                {t("cnhBrasileiraValid")}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {t("cnhBrasileiraDescription")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {tripType === "domestic" && (
                        <div className="rounded-lg border border-atlas-teal/30 bg-atlas-teal/5 p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xl" aria-hidden="true">
                              {"\u2705"}
                            </span>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">
                                {t("cnhRegularValid")}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {t("cnhRegularDescription")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {needsCarRental === false && (
                    <div className="rounded-lg border border-border bg-muted p-4 text-center">
                      <span className="text-2xl" aria-hidden="true">
                        {"\uD83D\uDC4D"}
                      </span>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t("noCarRental")}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Navigation + Advance */}
              <WizardFooter
                onBack={() => goToStep(2)}
                onPrimary={
                  isRevisiting
                    ? () => router.push(`/expedition/${tripId}/phase-5`)
                    : handleAdvance
                }
                primaryLabel={tExpedition("cta.advance")}
                isLoading={isCompleting}
                isDisabled={isCompleting || (allSectionsEmpty && !allUndecided)}
                onSave={handleSaveCurrentStep}
                isDirty={isDirty}
                saveSuccess={!!saveSuccess}
              />
            </div>
          )}
        </>
      )}
    </PhaseShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadlineFromDays(
  startDateIso: string,
  daysBefore: number
): string | null {
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
