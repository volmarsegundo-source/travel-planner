"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Info, Loader2, Map, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItineraryEditor } from "@/components/features/itinerary/ItineraryEditor";
import type { ItineraryDayWithActivities } from "@/server/actions/itinerary.actions";
import type { TravelStyle } from "@/types/ai.types";

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapStatusToErrorKey(status: number): string {
  const statusMap: Record<number, string> = {
    401: "errorAuth",
    400: "errorGenerate",
    403: "errorAgeRestricted",
    404: "errorGenerate",
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
}: Phase6WizardProps) {
  const t = useTranslations("expedition.phase6");
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [days] = useState(initialDays);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasTriggeredRef = useRef(false);

  const hasItinerary = days.length > 0;
  const language = locale === "pt-BR" ? ("pt-BR" as const) : ("en" as const);

  const effectiveStartDate =
    startDate || new Date().toISOString().split("T")[0]!;
  const effectiveEndDate = endDate || effectiveStartDate;

  const handleGenerate = useCallback(async () => {
    setError(null);
    setStreamingText("");
    setIsGenerating(true);
    setShowRegenerateConfirm(false);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

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
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorKey = mapStatusToErrorKey(response.status);
        setError(t(errorKey));
        setIsGenerating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError(t("errorGenerate"));
        setIsGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              router.refresh();
              setIsGenerating(false);
              return;
            }
            accumulated += data;
            setStreamingText(accumulated);
          }
        }
      }

      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStreamingText("");
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
    language, travelNotes, t, router,
  ]);

  // Auto-trigger generation on first visit when no itinerary exists
  useEffect(() => {
    if (initialDays.length === 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      handleGenerate();
    }
  }, [initialDays.length, handleGenerate]);

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  function handleRegenerateClick() {
    if (hasItinerary) {
      setShowRegenerateConfirm(true);
    } else {
      handleGenerate();
    }
  }

  function handleRegenerateConfirm() {
    setShowRegenerateConfirm(false);
    handleGenerate();
  }

  function handleRegenerateCancel() {
    setShowRegenerateConfirm(false);
  }

  // ─── State: Generating (streaming) ────────────────────────────────────────

  if (isGenerating) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
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

          {streamingText ? (
            <div className="w-full rounded-lg border border-border bg-muted/30 p-4 text-left">
              <pre className="whitespace-pre-wrap text-sm text-foreground">
                {streamingText}
              </pre>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <div className="h-20 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-20 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-20 w-3/4 animate-pulse rounded-md bg-muted" />
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleCancel}
            className="min-h-[44px] gap-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t("cancelGeneration")}
          </Button>
        </div>
      </div>
    );
  }

  // ─── State: Empty (no itinerary yet) ──────────────────────────────────────
  // Note: auto-generation triggers immediately, so this state is brief.
  // It shows if the user cancelled or if an error occurred.

  if (!hasItinerary) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-atlas-gold/10">
            <Map className="h-10 w-10 text-atlas-gold" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>

          <p className="max-w-sm text-sm text-muted-foreground">
            {t("generateHint")}
          </p>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            onClick={handleGenerate}
            className="min-h-[44px] gap-2"
            size="lg"
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            {t("generateCta")}
          </Button>
        </div>
      </div>
    );
  }

  // ─── State: Generated (show ItineraryEditor) ─────────────────────────────

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{destination}</p>
      </div>

      <ItineraryEditor initialDays={days} tripId={tripId} locale={locale} />

      {/* AI Disclaimer */}
      <div
        className="mt-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-200"
        role="note"
        data-testid="ai-disclaimer"
      >
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <p>{t("aiDisclaimer")}</p>
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

      <div className="mt-8 flex justify-center">
        <Button
          variant="outline"
          onClick={handleRegenerateClick}
          disabled={isGenerating}
          className="min-h-[44px] gap-2"
        >
          <Loader2
            className={`h-4 w-4 ${isGenerating ? "animate-spin" : "hidden"}`}
            aria-hidden="true"
          />
          <RefreshCw
            className={`h-4 w-4 ${isGenerating ? "hidden" : ""}`}
            aria-hidden="true"
          />
          {t("regenerateCta")}
        </Button>
      </div>
    </div>
  );
}
