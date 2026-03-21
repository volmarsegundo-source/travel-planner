"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItineraryEditor } from "@/components/features/itinerary/ItineraryEditor";
import { PhaseShell } from "./PhaseShell";
import { AiDisclaimer } from "./AiDisclaimer";
import { WizardFooter } from "./WizardFooter";
import { PAConfirmationModal } from "@/components/features/gamification/PAConfirmationModal";
import {
  getProgressPhase,
  getProgressMessageKey,
  countDaysInStream,
  calculateTotalDays,
  calculateProgressPercent,
} from "@/lib/utils/stream-progress";
// completeExpeditionAction removed -- expedition completion is now automatic (SPEC-PROD-023)
import { syncPhase6CompletionAction } from "@/server/actions/expedition.actions";
import { spendPAForAIAction } from "@/server/actions/gamification.actions";
import { AI_COSTS } from "@/types/gamification.types";
import type { ItineraryDayWithActivities } from "@/server/actions/itinerary.actions";
import type { TravelStyle, ExpeditionContext } from "@/types/ai.types";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Phase6WizardProps {
  tripId: string;
  destination: string;
  locale: string;
  startDate: string | null;
  endDate: string | null;
  initialDays: ItineraryDayWithActivities[];
  travelStyle?: TravelStyle;
  budgetTotal?: number;
  budgetCurrency?: string;
  travelers?: number;
  travelNotes?: string;
  /** Enriched expedition context from phases 1-5 (TASK-S33-011) */
  expeditionContext?: ExpeditionContext;
  /** Access mode from navigation engine */
  accessMode?: PhaseAccessMode;
  /** Trip's current phase from DB */
  tripCurrentPhase?: number;
  /** Completed phase numbers from DB */
  completedPhases?: number[];
  /** User's available PA balance for cost gate */
  availablePoints?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROGRESS_UPDATE_INTERVAL_MS = 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapStatusToErrorKey(status: number): string {
  const statusMap: Record<number, string> = {
    401: "errorAuth",
    400: "errorGenerate",
    403: "errorAgeRestricted",
    404: "errorGenerate",
    409: "errorGenerate",
    429: "errorRateLimit",
  };
  return statusMap[status] ?? "errorGenerate";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Phase6Wizard({
  tripId,
  destination,
  locale,
  startDate,
  endDate,
  initialDays,
  travelStyle = "CULTURE",
  budgetTotal = 3000,
  budgetCurrency = "USD",
  travelers = 1,
  travelNotes,
  expeditionContext,
  accessMode = "first_visit",
  tripCurrentPhase = 6,
  completedPhases = [],
  availablePoints = 0,
}: Phase6WizardProps) {
  const t = useTranslations("expedition.phase6");
  const tExpedition = useTranslations("expedition");
  const tPhases = useTranslations("gamification.phases");
  // tCommon removed -- no longer needed after complete button removal
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [days] = useState(initialDays);
  const [error, setError] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  // Complete expedition state removed (SPEC-PROD-024 REQ-006)
  const [progressMessage, setProgressMessage] = useState("");
  const [daysGenerated, setDaysGenerated] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasTriggeredRef = useRef(false);
  const streamStartRef = useRef<number>(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Accumulated text kept for persistence tracking but NOT displayed to user
  const accumulatedRef = useRef("");
  const [showPAConfirm, setShowPAConfirm] = useState(false);
  const [paBalance, setPABalance] = useState(availablePoints);
  const [isSpending, setIsSpending] = useState(false);

  const itineraryCost = AI_COSTS.ai_itinerary; // 80 PA

  const hasItinerary = days.length > 0;
  const language = locale === "pt-BR" ? ("pt-BR" as const) : ("en" as const);

  const effectiveStartDate =
    startDate || new Date().toISOString().split("T")[0]!;
  const effectiveEndDate = endDate || effectiveStartDate;
  const totalDays = calculateTotalDays(effectiveStartDate, effectiveEndDate);

  // Cleanup progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  const startProgressTimer = useCallback(() => {
    streamStartRef.current = Date.now();
    // Set initial message
    const phase = getProgressPhase(0);
    const key = getProgressMessageKey(phase);
    setProgressMessage(t(key));

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - streamStartRef.current;
      const currentPhase = getProgressPhase(elapsed);
      const messageKey = getProgressMessageKey(currentPhase);
      setProgressMessage(t(messageKey));
    }, PROGRESS_UPDATE_INTERVAL_MS);
  }, [t]);

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setIsGenerating(true);
    setShowRegenerateConfirm(false);
    setDaysGenerated(0);
    setProgressPercent(0);
    accumulatedRef.current = "";

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    startProgressTimer();

    try {
      const response = await fetch("/api/ai/plan/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          destination,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          travelStyle,
          budgetTotal,
          budgetCurrency,
          travelers,
          language,
          travelNotes,
          expeditionContext,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorKey = mapStatusToErrorKey(response.status);
        setError(t(errorKey));
        setIsGenerating(false);
        stopProgressTimer();
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError(t("errorGenerate"));
        setIsGenerating(false);
        stopProgressTimer();
        return;
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              stopProgressTimer();
              // Fire-and-forget: sync Phase 6 completion after itinerary persisted
              // Do NOT call router.refresh() here — it causes server re-render
              // that flips accessMode from "first_visit" to "revisit" mid-session
              syncPhase6CompletionAction(tripId).catch(() => {
                // Non-blocking -- completion sync failure is not user-visible
              });
              setIsGenerating(false);
              return;
            }

            // Check for error events from server
            if (data.startsWith('{"error":')) {
              try {
                const errorObj = JSON.parse(data) as { error: string };
                if (errorObj.error === "persist_failed") {
                  setError(t("errorPersistFailed"));
                }
              } catch {
                // Not a valid error JSON, ignore
              }
              continue;
            }

            accumulatedRef.current += data;

            // Update day count from partial JSON
            const dayCount = countDaysInStream(accumulatedRef.current);
            if (dayCount > 0) {
              setDaysGenerated(dayCount);
              setProgressPercent(calculateProgressPercent(dayCount, totalDays));
            }
          }
        }
      }

      stopProgressTimer();
    } catch (err) {
      stopProgressTimer();
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — no error to show
      } else {
        setError(t("errorTimeout"));
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [
    tripId, destination, effectiveStartDate, effectiveEndDate,
    travelStyle, budgetTotal, budgetCurrency, travelers,
    language, travelNotes, t, totalDays,
    startProgressTimer, stopProgressTimer,
  ]);

  // Auto-trigger: on first visit when no itinerary, auto-spend PA then generate
  // (no modal on auto-trigger -- the user navigated here intentionally)
  useEffect(() => {
    if (initialDays.length === 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      spendPAForAIAction(tripId, "ai_itinerary")
        .then((result) => {
          if (result.success && result.data && "remainingBalance" in result.data) {
            setPABalance(result.data.remainingBalance);
          }
        })
        .catch(() => {
          // Non-blocking: proceed with generation
        })
        .finally(() => {
          handleGenerate();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDays.length]);

  function handleRequestGenerate() {
    setShowPAConfirm(true);
  }

  async function handlePAConfirmAndGenerate() {
    setIsSpending(true);
    setError(null);

    try {
      const spendResult = await spendPAForAIAction(tripId, "ai_itinerary");
      if (!spendResult.success) {
        setError(spendResult.error ?? t("errorGenerate"));
        setIsSpending(false);
        return;
      }

      if (spendResult.data && "remainingBalance" in spendResult.data) {
        setPABalance(spendResult.data.remainingBalance);
      }

      setShowPAConfirm(false);
      setIsSpending(false);
      handleGenerate();
    } catch {
      setError(t("errorGenerate"));
      setIsSpending(false);
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  function handleViewExpeditions() {
    router.push("/expeditions");
  }

  function handleRegenerateClick() {
    if (hasItinerary) {
      setShowRegenerateConfirm(true);
    } else {
      handleRequestGenerate();
    }
  }

  function handleRegenerateConfirm() {
    setShowRegenerateConfirm(false);
    handleRequestGenerate();
  }

  function handleRegenerateCancel() {
    setShowRegenerateConfirm(false);
  }

  // ─── State: Generating (streaming) ────────────────────────────────────────

  if (isGenerating) {
    return (
      <PhaseShell
        tripId={tripId}
        viewingPhase={6}
        tripCurrentPhase={tripCurrentPhase}
        completedPhases={completedPhases}
        phaseTitle={t("title")}
        showFooter={false}
        contentMaxWidth="4xl"
      >
        <div
          className="flex flex-col items-center justify-center gap-6 text-center"
          role="status"
          aria-live="polite"
          aria-label={t("generating")}
        >
          <div
            className="h-16 w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary"
            aria-hidden="true"
          />
          <p className="text-lg font-medium">{t("generating")}</p>

          {/* Progress message */}
          <p
            className="text-sm text-muted-foreground"
            data-testid="progress-message"
          >
            {progressMessage}
          </p>

          {/* Progress bar */}
          <div className="w-full space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${Math.max(progressPercent, 5)}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                data-testid="progress-bar"
              />
            </div>
            {daysGenerated > 0 && (
              <p className="text-xs text-muted-foreground" data-testid="days-count">
                {t("progressDaysPlanned", { count: daysGenerated })}
              </p>
            )}
          </div>

          {/* Skeleton loaders */}
          <div className="w-full space-y-3">
            <div className="h-16 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-16 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-16 w-3/4 animate-pulse rounded-md bg-muted" />
          </div>

          <Button
            variant="outline"
            onClick={handleCancel}
            className="min-h-[44px] gap-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t("cancelGeneration")}
          </Button>
        </div>
      </PhaseShell>
    );
  }

  // ─── State: Empty (no itinerary yet) ──────────────────────────────────────
  // Note: auto-generation triggers immediately, so this state is brief.
  // It shows if the user cancelled or if an error occurred.

  if (!hasItinerary) {
    return (
      <PhaseShell
        tripId={tripId}
        viewingPhase={6}
        tripCurrentPhase={tripCurrentPhase}
        completedPhases={completedPhases}
        phaseTitle={t("title")}
        phaseSubtitle={t("subtitle")}
        showFooter={false}
        contentMaxWidth="4xl"
      >
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-atlas-gold/10">
            <Map className="h-10 w-10 text-atlas-gold" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-atlas-gold" data-testid="phase-6-label">
              {tExpedition("phaseLabel", { number: 6, name: tPhases("theTreasure") })}
            </p>
          </div>

          <p className="max-w-sm text-sm text-muted-foreground">
            {t("generateHint")}
          </p>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <PAConfirmationModal
            isOpen={showPAConfirm}
            onClose={() => setShowPAConfirm(false)}
            onConfirm={handlePAConfirmAndGenerate}
            featureName={t("title")}
            paCost={itineraryCost}
            currentBalance={paBalance}
            isLoading={isSpending}
          />

          <WizardFooter
            onBack={() => router.push(`/expedition/${tripId}/phase-5`)}
            onPrimary={handleRequestGenerate}
            primaryLabel={t("generateCta")}
          />
        </div>
      </PhaseShell>
    );
  }

  // ─── State: Generated (show ItineraryEditor) ─────────────────────────────

  return (
    <PhaseShell
      tripId={tripId}
      viewingPhase={6}
      tripCurrentPhase={tripCurrentPhase}
      completedPhases={completedPhases}
      phaseTitle={t("title")}
      isEditMode={accessMode === "revisit"}
      showFooter={false}
      contentMaxWidth="4xl"
    >
      <div className="mb-6 space-y-1">
        <p className="text-sm font-medium text-atlas-gold" data-testid="phase-6-label">
          {tExpedition("phaseLabel", { number: 6, name: tPhases("theTreasure") })}
        </p>
        <p className="text-sm text-muted-foreground">{destination}</p>
      </div>

      <ItineraryEditor initialDays={days} tripId={tripId} locale={locale} />

      {/* AI Disclaimer — standardized component */}
      <div className="mt-6">
        <AiDisclaimer message={t("aiDisclaimer")} />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Regenerate confirm dialog */}
      {showRegenerateConfirm && (
        <div
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/30"
          role="alertdialog"
          aria-label={t("regenerateConfirmTitle")}
        >
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {t("regenerateConfirmTitle")}
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {t("regenerateConfirmMessage")}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRegenerateConfirm}
            >
              {t("regenerateConfirmYes")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerateCancel}
            >
              {t("regenerateConfirmNo")}
            </Button>
          </div>
        </div>
      )}

      <PAConfirmationModal
        isOpen={showPAConfirm}
        onClose={() => setShowPAConfirm(false)}
        onConfirm={handlePAConfirmAndGenerate}
        featureName={t("title")}
        paCost={itineraryCost}
        currentBalance={paBalance}
        isLoading={isSpending}
      />

      <div className="mt-8">
        <WizardFooter
          onBack={() => router.push(`/expedition/${tripId}/phase-5`)}
          onPrimary={handleViewExpeditions}
          primaryLabel={tExpedition("cta.viewExpeditions")}
          secondaryActions={[
            {
              label: t("regenerateCta"),
              onClick: handleRegenerateClick,
            },
          ]}
        />
      </div>
    </PhaseShell>
  );
}
