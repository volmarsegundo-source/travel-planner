"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ChecklistView } from "@/components/features/checklist/ChecklistView";
import { generateTripChecklist } from "@/server/actions/ai.actions";
import type { ChecklistCategory } from "@/types/ai.types";

// Client component: reads checklist from sessionStorage or fetches fresh from AI
export default function ChecklistPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const tripId = params.id;

  const [categories, setCategories] = useState<ChecklistCategory[] | null>(null);
  const [destination, setDestination] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    async function load() {
      const stored = sessionStorage.getItem(`checklist:${tripId}`);
      if (stored) {
        try {
          setCategories(JSON.parse(stored) as ChecklistCategory[]);
          setLoading(false);
          return;
        } catch {
          // fall through to fetch
        }
      }

      // Fetch fresh if not in sessionStorage
      const result = await generateTripChecklist(tripId);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      sessionStorage.setItem(`checklist:${tripId}`, JSON.stringify(result.data));
      setCategories(result.data);
      setLoading(false);
    }

    // Retrieve destination label from plan in sessionStorage for header
    const planRaw = sessionStorage.getItem(`plan:${tripId}`);
    if (planRaw) {
      try {
        const plan = JSON.parse(planRaw) as { destination: string };
        setDestination(plan.destination);
      } catch { /* ignore */ }
    }

    load();
  }, [tripId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2
          className="h-8 w-8 animate-spin text-orange-500"
          aria-hidden="true"
        />
        <p className="text-sm text-gray-500">Gerando checklist com IA...</p>
      </div>
    );
  }

  if (error || !categories) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-red-600" role="alert">
          {error ?? "Erro ao carregar checklist."}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/trips/${tripId}/itinerary`)}
          className="text-sm text-orange-500 hover:underline"
        >
          Voltar ao itinerário
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <ChecklistView categories={categories} tripDestination={destination} />
    </main>
  );
}
