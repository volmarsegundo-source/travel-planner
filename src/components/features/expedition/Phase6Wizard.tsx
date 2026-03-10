"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Map, Sparkles, X } from "lucide-react";
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasItinerary = days.length > 0;
  const language = locale === "pt-BR" ? ("pt-BR" as const) : ("en" as const);

  const effectiveStartDate =
    startDate || new Date().toISOString().split("T")[0]!;
  const effectiveEndDate = endDate || effectiveStartDate;

  const handleGenerate = useCallback(async () => {
    setError(null);
    setStreamingText("");
    setIsGenerating(true);

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
              // Generation complete, refresh page to load persisted data
              router.refresh();
              setIsGenerating(false);
              return;
            }
            accumulated += data;
            setStreamingText(accumulated);
          }
        }
      }

      // If we exit the loop without [DONE], refresh anyway
      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — not an error
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

  function handleCancel() {
    abortControllerRef.current?.abort();
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

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 flex justify-center">
        <Button
          variant="outline"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="min-h-[44px] gap-2"
        >
          <Loader2
            className={`h-4 w-4 ${isGenerating ? "animate-spin" : "hidden"}`}
            aria-hidden="true"
          />
          <Sparkles
            className={`h-4 w-4 ${isGenerating ? "hidden" : ""}`}
            aria-hidden="true"
          />
          {t("regenerateCta")}
        </Button>
      </div>
    </div>
  );
}
