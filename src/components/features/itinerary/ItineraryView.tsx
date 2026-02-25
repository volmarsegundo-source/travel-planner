"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItineraryDayCard } from "./ItineraryDayCard";
import { generateTripChecklist } from "@/server/actions/ai.actions";
import type { ItineraryPlan } from "@/types/ai.types";

interface ItineraryViewProps {
  tripId: string;
  plan: ItineraryPlan;
}

export function ItineraryView({ tripId, plan }: ItineraryViewProps) {
  const router = useRouter();
  const [generatingChecklist, setGeneratingChecklist] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);

  async function handleGenerateChecklist() {
    setGeneratingChecklist(true);
    setChecklistError(null);
    const result = await generateTripChecklist(tripId);
    setGeneratingChecklist(false);

    if (!result.success) {
      setChecklistError(result.error);
      return;
    }

    sessionStorage.setItem(`checklist:${tripId}`, JSON.stringify(result.data));
    router.push(`/trips/${tripId}/checklist`);
  }

  return (
    <div>
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push("/trips")}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Minhas viagens
      </button>

      {/* Plan header */}
      <div className="mb-8">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          {plan.destination}
        </h1>
        {plan.highlights.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {plan.highlights.map((h, i) => (
              <li
                key={i}
                className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700"
              >
                {h}
              </li>
            ))}
          </ul>
        )}
        {plan.budgetSummary && (
          <p className="mt-3 text-sm text-gray-500">{plan.budgetSummary}</p>
        )}
      </div>

      {/* Day cards */}
      <div className="space-y-4">
        {plan.days.map((day) => (
          <ItineraryDayCard key={day.dayNumber} day={day} />
        ))}
      </div>

      {/* Tips */}
      {plan.tips && plan.tips.length > 0 && (
        <div className="mt-6 rounded-xl bg-blue-50 p-5">
          <h2 className="mb-3 text-sm font-semibold text-blue-800">
            Dicas práticas
          </h2>
          <ul className="space-y-1.5">
            {plan.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                <span aria-hidden="true">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Generate checklist CTA */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {checklistError && (
          <p className="text-sm text-red-600" role="alert">
            {checklistError}
          </p>
        )}
        <Button
          onClick={handleGenerateChecklist}
          disabled={generatingChecklist}
          className="bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500"
        >
          {generatingChecklist ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Gerar checklist de viagem
        </Button>
      </div>
    </div>
  );
}
