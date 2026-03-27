"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasCard } from "@/components/ui/AtlasCard";
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
import { syncPhase6CompletionAction } from "@/server/actions/expedition.actions";
import { spendPAForAIAction } from "@/server/actions/gamification.actions";
import { AI_COSTS } from "@/types/gamification.types";
import type { ItineraryDayWithActivities } from "@/server/actions/itinerary.actions";
import type { TravelStyle, ExpeditionContext } from "@/types/ai.types";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";

// ─── Inline Icons ────────────────────────────────────────────────────────────

function MapIcon() {
  return (
    <svg className="size-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Phase6ItineraryV2Props {
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
  expeditionContext?: ExpeditionContext;
  accessMode?: PhaseAccessMode;
  tripCurrentPhase?: number;
  completedPhases?: number[];
  availablePoints?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROGRESS_UPDATE_INTERVAL_MS = 1000;

function mapStatusToErrorKey(status: number): string {
  const statusMap: Record<number, string> = {
    401: "errorAuth", 400: "errorGenerate", 403: "errorAgeRestricted",
    404: "errorGenerate", 409: "errorGenerate", 429: "errorRateLimit",
  };
  return statusMap[status] ?? "errorGenerate";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Phase6ItineraryV2({
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
}: Phase6ItineraryV2Props) {
  const t = useTranslations("expedition.phase6");
  const tExpedition = useTranslations("expedition");
  const tPhases = useTranslations("gamification.phases");
  const router = useRouter();

  const [isGenerating, setIsGenerating] = useState(false);
  const [days] = useState(initialDays);
  const [error, setError] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [daysGenerated, setDaysGenerated] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasTriggeredRef = useRef(false);
  const streamStartRef = useRef<number>(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedRef = useRef("");
  const [showPAConfirm, setShowPAConfirm] = useState(false);
  const [paBalance, setPABalance] = useState(availablePoints);
  const [isSpending, setIsSpending] = useState(false);

  const itineraryCost = AI_COSTS.ai_itinerary;
  const hasItinerary = days.length > 0;
  const language = locale === "pt-BR" ? ("pt-BR" as const) : ("en" as const);

  const effectiveStartDate = startDate || new Date().toISOString().split("T")[0]!;
  const effectiveEndDate = endDate || effectiveStartDate;
  const totalDays = calculateTotalDays(effectiveStartDate, effectiveEndDate);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const startProgressTimer = useCallback(() => {
    streamStartRef.current = Date.now();
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
          tripId, destination, startDate: effectiveStartDate, endDate: effectiveEndDate,
          travelStyle, budgetTotal, budgetCurrency, travelers, language, travelNotes, expeditionContext,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        setError(t(mapStatusToErrorKey(response.status)));
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
              syncPhase6CompletionAction(tripId).catch(() => {});
              setIsGenerating(false);
              // Refresh server data so the page re-renders with persisted itinerary days.
              // The page component uses key={`phase6-v2-${itineraryDays.length}`} which
              // forces a remount when the server returns updated data.
              router.refresh();
              return;
            }
            if (data.startsWith('{"error":')) {
              try {
                const errorObj = JSON.parse(data) as { error: string };
                if (errorObj.error === "persist_failed") setError(t("errorPersistFailed"));
              } catch { /* ignore */ }
              continue;
            }
            accumulatedRef.current += data;
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
      if (err instanceof DOMException && err.name === "AbortError") { /* cancelled */ }
      else setError(t("errorTimeout"));
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [tripId, destination, effectiveStartDate, effectiveEndDate, travelStyle, budgetTotal, budgetCurrency, travelers, language, travelNotes, t, totalDays, startProgressTimer, stopProgressTimer]);

  // Auto-trigger
  useEffect(() => {
    if (initialDays.length === 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      spendPAForAIAction(tripId, "ai_itinerary")
        .then((result) => {
          if (result.success && result.data && "remainingBalance" in result.data) {
            setPABalance(result.data.remainingBalance);
          }
        })
        .catch(() => {})
        .finally(() => { handleGenerate(); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDays.length]);

  function handleRequestGenerate() { setShowPAConfirm(true); }

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

  function handleCancel() { abortControllerRef.current?.abort(); }
  function handleViewExpeditions() { router.push("/expeditions"); }

  function handleRegenerateClick() {
    if (hasItinerary) setShowRegenerateConfirm(true);
    else handleRequestGenerate();
  }

  function handleRegenerateConfirm() {
    setShowRegenerateConfirm(false);
    handleRequestGenerate();
  }

  // ─── Generating state ─────────────────────────────────────────────────────

  if (isGenerating) {
    return (
      <PhaseShell
        tripId={tripId} viewingPhase={6} tripCurrentPhase={tripCurrentPhase}
        completedPhases={completedPhases} phaseTitle={t("title")}
        showFooter={false} contentMaxWidth="4xl"
      >
        <div className="flex flex-col items-center justify-center gap-6 text-center" role="status" aria-live="polite" aria-label={t("generating")}>
          <div className="h-16 w-16 animate-spin motion-reduce:animate-none rounded-full border-4 border-atlas-secondary-container/30 border-t-atlas-secondary-container" aria-hidden="true" />
          <p className="text-lg font-atlas-headline font-bold text-atlas-on-surface">{t("generating")}</p>
          <p className="text-sm font-atlas-body text-atlas-on-surface-variant" data-testid="progress-message-v2">{progressMessage}</p>

          {/* Progress bar */}
          <div className="w-full max-w-md space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-atlas-surface-container-high">
              <div
                className="h-full rounded-full bg-atlas-secondary-container transition-all duration-500 ease-out"
                style={{ width: `${Math.max(progressPercent, 5)}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                data-testid="progress-bar-v2"
              />
            </div>
            {daysGenerated > 0 && (
              <p className="text-xs font-atlas-body text-atlas-on-surface-variant" data-testid="days-count-v2">
                {t("progressDaysPlanned", { count: daysGenerated })}
              </p>
            )}
          </div>

          {/* Skeleton cards */}
          <div className="w-full max-w-md space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <AtlasCard key={i} loading className="h-16" />
            ))}
          </div>

          <AtlasButton variant="secondary" onClick={handleCancel} leftIcon={<XIcon />}>
            {t("cancelGeneration")}
          </AtlasButton>
        </div>
      </PhaseShell>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (!hasItinerary) {
    return (
      <PhaseShell
        tripId={tripId} viewingPhase={6} tripCurrentPhase={tripCurrentPhase}
        completedPhases={completedPhases} phaseTitle={t("title")} phaseSubtitle={t("subtitle")}
        showFooter={false} contentMaxWidth="4xl"
      >
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-atlas-secondary-container/20">
            <MapIcon />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-atlas-headline font-bold text-atlas-secondary-container" data-testid="phase-6-label-v2">
              {tExpedition("phaseLabel", { number: 6, name: tPhases("theTreasure") })}
            </p>
          </div>
          <p className="max-w-sm text-sm font-atlas-body text-atlas-on-surface-variant">
            {t("generateHint")}
          </p>
          {error && (
            <p role="alert" className="text-sm font-atlas-body text-atlas-error">{error}</p>
          )}
          <PAConfirmationModal
            isOpen={showPAConfirm} onClose={() => setShowPAConfirm(false)}
            onConfirm={handlePAConfirmAndGenerate} featureName={t("title")}
            paCost={itineraryCost} currentBalance={paBalance} isLoading={isSpending}
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

  // ─── Generated state ──────────────────────────────────────────────────────

  return (
    <PhaseShell
      tripId={tripId} viewingPhase={6} tripCurrentPhase={tripCurrentPhase}
      completedPhases={completedPhases} phaseTitle={t("title")}
      isEditMode={accessMode === "revisit"} showFooter={false} contentMaxWidth="4xl"
    >
      <div className="mb-6 space-y-1">
        <p className="text-sm font-atlas-headline font-bold text-atlas-secondary-container" data-testid="phase-6-label-v2">
          {tExpedition("phaseLabel", { number: 6, name: tPhases("theTreasure") })}
        </p>
        <p className="text-sm font-atlas-body text-atlas-on-surface-variant">{destination}</p>
      </div>

      <ItineraryEditor initialDays={days} tripId={tripId} locale={locale} />

      <div className="mt-6">
        <AiDisclaimer message={t("aiDisclaimer")} />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-atlas-body text-atlas-error">{error}</p>
      )}

      {/* Regenerate confirm */}
      {showRegenerateConfirm && (
        <AtlasCard
          variant="base"
          className="mt-4 !border-atlas-warning/30 !bg-atlas-warning-container/20"
          role="alertdialog"
          aria-label={t("regenerateConfirmTitle")}
        >
          <p className="text-sm font-atlas-headline font-bold text-atlas-on-surface">{t("regenerateConfirmTitle")}</p>
          <p className="mt-1 text-sm font-atlas-body text-atlas-on-surface-variant">{t("regenerateConfirmMessage")}</p>
          <div className="mt-3 flex gap-2">
            <AtlasButton size="sm" variant="danger" onClick={handleRegenerateConfirm}>{t("regenerateConfirmYes")}</AtlasButton>
            <AtlasButton size="sm" variant="secondary" onClick={() => setShowRegenerateConfirm(false)}>{t("regenerateConfirmNo")}</AtlasButton>
          </div>
        </AtlasCard>
      )}

      <PAConfirmationModal
        isOpen={showPAConfirm} onClose={() => setShowPAConfirm(false)}
        onConfirm={handlePAConfirmAndGenerate} featureName={t("title")}
        paCost={itineraryCost} currentBalance={paBalance} isLoading={isSpending}
      />

      <div className="mt-8">
        <WizardFooter
          onBack={() => router.push(`/expedition/${tripId}/phase-5`)}
          onPrimary={handleViewExpeditions}
          primaryLabel={tExpedition("cta.viewExpeditions")}
          secondaryActions={[{ label: t("regenerateCta"), onClick: handleRegenerateClick }]}
        />
      </div>
    </PhaseShell>
  );
}
