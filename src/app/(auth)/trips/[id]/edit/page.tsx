"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { DraggableActivityList } from "@/components/features/itinerary/DraggableActivityList";
import type { ItineraryPlan } from "@/types/ai.types";

// Client component: reads plan from sessionStorage and renders the drag-and-drop editor
export default function EditItineraryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const tripId = params.id;

  const [plan, setPlan] = useState<ItineraryPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    const stored = sessionStorage.getItem(`plan:${tripId}`);
    if (!stored) {
      router.replace(`/trips/${tripId}/generate`);
      return;
    }
    try {
      setPlan(JSON.parse(stored) as ItineraryPlan);
    } catch {
      router.replace(`/trips/${tripId}/generate`);
    } finally {
      setLoading(false);
    }
  }, [tripId, router]);

  if (loading || !plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-orange-500"
          aria-label="Carregando editor"
        />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar ao itinerário
      </button>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Editar itinerário — {plan.destination}
      </h1>

      <DraggableActivityList plan={plan} />
    </main>
  );
}
