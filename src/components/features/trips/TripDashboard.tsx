"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripCard } from "./TripCard";
import { TripCardSkeleton } from "./TripCardSkeleton";
import { CreateTripModal } from "./CreateTripModal";
import { EditTripModal } from "./EditTripModal";
import { DeleteTripDialog } from "./DeleteTripDialog";
import { listUserTripsAction } from "@/server/actions/trip.actions";
import type { PaginatedResult, Trip } from "@/types/trip.types";

const SKELETON_COUNT = 6;

interface TripDashboardProps {
  locale: string;
  initialData?: PaginatedResult<Trip>;
}

export function TripDashboard({ locale, initialData }: TripDashboardProps) {
  const t = useTranslations("trips");

  const [createOpen, setCreateOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const result = await listUserTripsAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData,
    staleTime: 60_000,
  });

  const trips = data?.items ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">{t("myTrips")}</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon aria-hidden="true" />
            {t("newTrip")}
          </Button>
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <TripCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <p role="alert" className="text-destructive text-sm text-center py-8">
            {t("errors.notFound")}
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !isError && trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <span className="text-6xl" aria-hidden="true">
              ✈️
            </span>
            <p className="text-lg font-medium">{t("noTrips")}</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t("noTripsSubtitle")}
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              {t("createFirst")}
            </Button>
          </div>
        )}

        {/* Trip grid */}
        {!isLoading && !isError && trips.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                locale={locale}
                onEdit={(t) => setTripToEdit(t)}
                onDelete={(t) => setTripToDelete(t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateTripModal open={createOpen} onOpenChange={setCreateOpen} />

      <EditTripModal
        trip={tripToEdit}
        open={tripToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setTripToEdit(null);
        }}
      />

      <DeleteTripDialog
        trip={tripToDelete}
        open={tripToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTripToDelete(null);
        }}
      />
    </div>
  );
}
