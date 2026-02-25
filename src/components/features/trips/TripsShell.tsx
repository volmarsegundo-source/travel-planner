"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TripGrid } from "./TripGrid";
import { CreateTripModal } from "./CreateTripModal";
import type { TripSummary } from "@/types/trip.types";

interface TripsShellProps {
  trips: TripSummary[];
  total: number;
}

export function TripsShell({ trips, total }: TripsShellProps) {
  const t = useTranslations("trips");
  const [modalOpen, setModalOpen] = useState(false);

  function handleOpenTrip(trip: TripSummary) {
    // Navigate to trip detail — full page nav (will be implemented in T-008)
    window.location.href = `/trips/${trip.id}`;
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      </header>

      <TripGrid
        trips={trips}
        total={total}
        onCreateTrip={() => setModalOpen(true)}
        onOpenTrip={handleOpenTrip}
      />

      <CreateTripModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
