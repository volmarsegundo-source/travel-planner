"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ItineraryView } from "@/components/features/itinerary/ItineraryView";
import { getItineraryPlan } from "@/server/actions/itinerary.actions";
import type { ItineraryPlan } from "@/types/ai.types";

// Client component: tries DB first, falls back to sessionStorage.
// DB result has empty destination/highlights fields — we merge with
// sessionStorage metadata when available to preserve the full plan header.
export default function ItineraryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const tripId = params.id;

  const [plan, setPlan] = useState<ItineraryPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;

    async function load() {
      // 1. Try DB (Server Action)
      const result = await getItineraryPlan(tripId);
      if (result.success && result.data) {
        const dbPlan = result.data;

        // Merge DB days with sessionStorage metadata (destination, highlights, etc.)
        // so the plan header is complete when session data is still available.
        const stored = sessionStorage.getItem(`plan:${tripId}`);
        if (stored) {
          try {
            const sessionPlan = JSON.parse(stored) as ItineraryPlan;
            setPlan({
              ...sessionPlan,
              days: dbPlan.days,
              totalDays: dbPlan.totalDays,
            });
          } catch {
            setPlan(dbPlan);
          }
        } else {
          setPlan(dbPlan);
        }
        setLoading(false);
        return;
      }

      // 2. Fall back to sessionStorage
      const stored = sessionStorage.getItem(`plan:${tripId}`);
      if (!stored) {
        router.replace(`/trips/${tripId}/generate`);
        return;
      }
      try {
        setPlan(JSON.parse(stored) as ItineraryPlan);
      } catch {
        router.replace(`/trips/${tripId}/generate`);
        return;
      }
      setLoading(false);
    }

    load();
  }, [tripId, router]);

  if (loading || !plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" aria-label="Carregando itinerário" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <ItineraryView tripId={tripId} plan={plan} />
    </main>
  );
}
