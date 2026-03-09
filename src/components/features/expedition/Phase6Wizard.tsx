"use client";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Map, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ItineraryEditor } from "@/components/features/itinerary/ItineraryEditor";
import { generateTravelPlanAction } from "@/server/actions/ai.actions";
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
}: Phase6WizardProps) {
  const t = useTranslations("expedition.phase6");
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [days, setDays] = useState(initialDays);
  const [error, setError] = useState<string | null>(null);

  const hasItinerary = days.length > 0;
  const language = locale === "pt-BR" ? ("pt-BR" as const) : ("en" as const);

  const effectiveStartDate =
    startDate || new Date().toISOString().split("T")[0]!;
  const effectiveEndDate = endDate || effectiveStartDate;

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);

    try {
      const result = await generateTravelPlanAction(tripId, {
        destination,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        travelStyle,
        budgetTotal,
        budgetCurrency,
        travelers,
        language,
      });

      if (result.success) {
        // Reload to get fresh days from server
        router.refresh();
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        const errorMap: Record<string, string> = {
          "errors.timeout": t("errorTimeout"),
          "errors.aiAuthError": t("errorAuth"),
          "errors.rateLimitExceeded": t("errorRateLimit"),
          "errors.aiAgeRestricted": t("errorAgeRestricted"),
        };
        setError(
          (result.error && errorMap[result.error]) || t("errorGenerate")
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }

  // ─── State: Generating ────────────────────────────────────────────────────

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
          <div className="w-full space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-3/4" />
          </div>
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
