"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Compass,
  Utensils,
  Sunset,
  Backpack,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTripPlan } from "@/server/actions/ai.actions";
import { saveItineraryPlan } from "@/server/actions/itinerary.actions";
import type { TripSummary } from "@/types/trip.types";

type TravelStyle = "ADVENTURE" | "CULTURE" | "RELAXATION" | "GASTRONOMY";

const STYLE_OPTIONS: {
  id: TravelStyle;
  icon: React.ReactNode;
  labelKey: string;
}[] = [
  {
    id: "ADVENTURE",
    icon: <Backpack className="h-7 w-7" />,
    labelKey: "adventure",
  },
  {
    id: "CULTURE",
    icon: <Compass className="h-7 w-7" />,
    labelKey: "culture",
  },
  {
    id: "RELAXATION",
    icon: <Sunset className="h-7 w-7" />,
    labelKey: "relaxation",
  },
  {
    id: "GASTRONOMY",
    icon: <Utensils className="h-7 w-7" />,
    labelKey: "gastronomy",
  },
];

const LOADING_MESSAGE_KEYS = ["1", "2", "3", "4"] as const;

interface PlanGeneratorWizardProps {
  trip: TripSummary;
}

export function PlanGeneratorWizard({ trip }: PlanGeneratorWizardProps) {
  const t = useTranslations("trips");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [step, setStep] = useState<"confirm" | "style" | "generating">("confirm");
  const [selectedStyle, setSelectedStyle] = useState<TravelStyle | null>(
    (trip.travelStyle as TravelStyle | null) ?? null,
  );
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    if (step === "confirm") setStep("style");
  }

  async function handleGenerate() {
    setStep("generating");
    setError(null);

    // Rotate loading messages
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGE_KEYS.length);
    }, 4000);

    try {
      const result = await generateTripPlan(trip.id);
      clearInterval(interval);

      if (!result.success) {
        setError(result.error);
        setStep("style");
        return;
      }

      // Store plan in sessionStorage so itinerary page can read it immediately
      sessionStorage.setItem(
        `plan:${trip.id}`,
        JSON.stringify(result.data),
      );

      // Persist plan to DB (fire-and-forget; sessionStorage is the immediate fallback)
      saveItineraryPlan(trip.id, result.data).catch((err: unknown) => {
        console.error("[PlanGeneratorWizard] Failed to persist plan to DB:", err);
      });

      router.push(`/trips/${trip.id}/itinerary`);
    } catch {
      clearInterval(interval);
      setError(t("errors.aiConnectionError"));
      setStep("style");
    }
  }

  if (step === "generating") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
          <Loader2
            className="h-10 w-10 animate-spin text-orange-500"
            aria-hidden="true"
          />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          {t("generatingPlan")}
        </h2>
        <p
          className="text-sm text-gray-500 transition-opacity duration-500"
          aria-live="polite"
          aria-atomic="true"
        >
          {t(`loadingMessages.${LOADING_MESSAGE_KEYS[loadingMsgIdx]}` as Parameters<typeof t>[0])}
        </p>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h2 className="mb-1 text-xl font-bold text-gray-900">
            {t("confirmTrip")}
          </h2>
          <p className="text-sm text-gray-500">
            {t("reviewDetails")}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <Detail label={t("destination")} value={trip.destinationName} />
          {trip.startDate && (
            <Detail
              label={t("period")}
              value={formatDateRange(trip.startDate, trip.endDate)}
            />
          )}
          <Detail
            label={t("travelers")}
            value={`${trip.travelers} ${t(trip.travelers === 1 ? "travelerSingular" : "travelerPlural")}`}
          />
          {trip.budgetTotal && (
            <Detail
              label={t("budget")}
              value={`${trip.budgetCurrency} ${Number(trip.budgetTotal).toLocaleString()}`}
            />
          )}
        </div>

        <Button
          onClick={handleNext}
          className="w-full bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500"
        >
          {tCommon("continue")}
          <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  // Style selection step
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h2 className="mb-1 text-xl font-bold text-gray-900">
          {t("selectTravelStyle")}
        </h2>
        <p className="text-sm text-gray-500">
          {t("aiPersonalizes")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("styleAriaLabel")}>
        {STYLE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selectedStyle === opt.id}
            onClick={() => setSelectedStyle(opt.id)}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
              selectedStyle === opt.id
                ? "border-orange-500 bg-orange-50 text-orange-600"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span aria-hidden="true">{opt.icon}</span>
            <span className="text-sm font-medium">
              {t(`style.${opt.labelKey}` as Parameters<typeof t>[0])}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button
        onClick={handleGenerate}
        disabled={!selectedStyle}
        className="w-full bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500 disabled:opacity-50"
      >
        <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
        {t("generatePlanWithAI")}
      </Button>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

function formatDateRange(
  start?: Date | string | null,
  end?: Date | string | null,
): string {
  if (!start) return "";
  const s = new Date(start).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (!end) return s;
  const e = new Date(end).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${s} → ${e}`;
}
