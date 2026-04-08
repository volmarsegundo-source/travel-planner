"use client";

import dynamic from "next/dynamic";
import type { ItineraryDayWithActivities } from "@/server/actions/itinerary.actions";

const ItineraryEditor = dynamic(
  () =>
    import("@/components/features/itinerary/ItineraryEditor").then(
      (mod) => mod.ItineraryEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse bg-muted rounded-lg"
          />
        ))}
      </div>
    ),
  },
);

interface LazyItineraryEditorProps {
  initialDays: ItineraryDayWithActivities[];
  tripId: string;
  locale: string;
}

export function LazyItineraryEditor(props: LazyItineraryEditorProps) {
  return <ItineraryEditor {...props} />;
}
