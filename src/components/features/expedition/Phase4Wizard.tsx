"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PointsAnimation } from "./PointsAnimation";
import { PhaseTransition } from "./PhaseTransition";
import { PhaseProgressBar } from "./PhaseProgressBar";
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
import type { BadgeKey, Rank } from "@/types/gamification.types";
import type { TransportSegmentInput, AccommodationInput } from "@/lib/validations/transport.schema";

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
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Phase4Wizard({
  tripId,
  tripType,
  origin,
  destination,
  startDate,
  currentPhase,
}: Phase4WizardProps) {
  const t = useTranslations("expedition.phase4");
  const tExpedition = useTranslations("expedition");
  const tPhases = useTranslations("gamification.phases");
  const tCommon = useTranslations("common");
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

  // Save states
  const [savingTransport, setSavingTransport] = useState(false);
  const [savingAccommodation, setSavingAccommodation] = useState(false);
  const [savingMobility, setSavingMobility] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Completion flow states
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [animationData, setAnimationData] = useState<{
    points: number;
    badge?: BadgeKey | null;
    rank?: Rank | null;
  }>({ points: 0 });

  const isRevisiting = currentPhase !== undefined && currentPhase > 4;
  const needsCinh = tripType === "international" || tripType === "schengen";
  const isMercosul = tripType === "mercosul";

  // Calculate CINH deadline (45 days before trip)
  const cinhDeadline = startDate ? formatDeadlineFromDays(startDate, 45) : null;

  const canComplete =
    needsCarRental === false ||
    (needsCarRental === true && !needsCinh) ||
    (needsCarRental === true && needsCinh && cnhConfirmed);

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
    try {
      const result = await saveLocalMobilityAction(tripId, selected);
      if (!result.success) {
        setErrorMessage(result.error);
      } else {
        setSaveSuccess("mobility");
        setTimeout(() => setSaveSuccess(null), SAVE_SUCCESS_TIMEOUT_MS);
      }
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setSavingMobility(false);
    }
  }

  // ─── Advance handler ─────────────────────────────────────────────────────

  async function handleAdvance() {
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

      if (result.data!.completed && result.data!.phaseResult) {
        setAnimationData({
          points: result.data!.phaseResult.pointsEarned,
          badge: result.data!.phaseResult.badgeAwarded as BadgeKey | null,
          rank: result.data!.phaseResult.newRank as Rank | null,
        });
        setShowAnimation(true);
      } else {
        setShowTransition(true);
      }
    } catch {
      setErrorMessage("errors.generic");
      setIsCompleting(false);
    }
  }

  function handleAnimationDismiss() {
    setShowAnimation(false);
    setShowTransition(true);
  }

  function handleTransitionContinue() {
    setShowTransition(false);
    router.push(`/expedition/${tripId}/phase-5`);
  }

  // ─── Animation / Transition overlays ──────────────────────────────────────

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
        fromPhase={4}
        toPhase={5}
        onContinue={handleTransitionContinue}
      />
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <PhaseProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {/* Header */}
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-atlas-gold" data-testid="phase-label">
            {tExpedition("phaseLabel", { number: 4, name: tPhases("theLogistics") })}
          </p>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          <p className="mt-2 text-sm text-atlas-teal-light">
            {destination} — {t(`tripTypes.${tripType}`)}
          </p>
        </div>

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
                />

                {/* Navigation */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/expedition/${tripId}/phase-3`)}
                    className="flex-1"
                    aria-label={tCommon("back")}
                    data-testid="back-to-phase-3"
                  >
                    {"\u2190"}
                  </Button>
                  <Button onClick={() => goToStep(2)} className="flex-[3]">
                    {tCommon("next")}
                  </Button>
                </div>
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
                />

                {/* Navigation */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => goToStep(1)} className="flex-1" aria-label={tCommon("back")}>
                    {"\u2190"}
                  </Button>
                  <Button onClick={() => goToStep(3)} className="flex-[3]">
                    {tCommon("next")}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Car Rental + Mobility + Advance */}
            {currentStep === 3 && (
              <div className="mt-8 flex flex-col gap-6">
                {/* Car rental prerequisites */}
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

                <MobilityStep
                  tripId={tripId}
                  initialMobility={mobility}
                  onSave={handleSaveMobility}
                  saving={savingMobility}
                />

                {/* Navigation */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => goToStep(2)} className="flex-1" aria-label={tCommon("back")}>
                    {"\u2190"}
                  </Button>
                </div>

                {/* Advance button — or "Go to current phase" when revisiting */}
                <div>
                  {isRevisiting ? (
                    <Button
                      onClick={() => router.push(`/expedition/${tripId}/phase-${currentPhase}`)}
                      size="lg"
                      className="w-full"
                    >
                      {t("goToCurrentPhase", { phase: currentPhase })}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleAdvance}
                      disabled={isCompleting}
                      size="lg"
                      className={`w-full ${
                        canComplete
                          ? ""
                          : "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                      }`}
                    >
                      {isCompleting
                        ? tCommon("loading")
                        : canComplete
                          ? t("advanceComplete")
                          : needsCarRental === null
                            ? t("advancePending")
                            : t("advancePartial", { count: 1 })}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
