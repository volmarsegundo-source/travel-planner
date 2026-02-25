"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ItineraryView } from "@/components/features/itinerary/ItineraryView";
import type { ItineraryPlan } from "@/types/ai.types";

// Client component: reads the plan from sessionStorage (set by PlanGeneratorWizard)
export default function ItineraryPage() {
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
