"use client";

import { useTranslations } from "next-intl";
import { Plus, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripCard } from "./TripCard";
import type { TripSummary } from "@/types/trip.types";
import { MAX_ACTIVE_TRIPS } from "@/types/trip.types";

interface TripGridProps {
  trips: TripSummary[];
  total: number;
  onCreateTrip: () => void;
  onOpenTrip: (trip: TripSummary) => void;
}

export function TripGrid({
  trips,
  total,
  onCreateTrip,
  onOpenTrip,
}: TripGridProps) {
  const t = useTranslations("trips");

  const activeCount = trips.filter(
    (tr) => tr.status !== "ARCHIVED",
  ).length;

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
          <Plane className="h-10 w-10 text-orange-500" aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          {t("empty.title")}
        </h2>
        <p className="mb-6 max-w-xs text-sm text-gray-500">
          {t("empty.description")}
        </p>
        <Button
          onClick={onCreateTrip}
          className="bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("empty.cta")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {t("counter", { count: activeCount, max: MAX_ACTIVE_TRIPS })}
        </p>
        <Button
          onClick={onCreateTrip}
          size="sm"
          className="bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500"
          disabled={activeCount >= MAX_ACTIVE_TRIPS}
          aria-label={t("create.title")}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t("create.title")}
        </Button>
      </div>

      {/* Grid */}
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label={t("title")}
        role="list"
      >
        {trips.map((trip) => (
          <div key={trip.id} role="listitem">
            <TripCard trip={trip} onClick={() => onOpenTrip(trip)} />
          </div>
        ))}
      </div>
    </div>
  );
}
