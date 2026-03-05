"use client";
import { useState, useCallback, useRef, useTransition } from "react";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ItineraryDayCard } from "./ItineraryDayCard";
import {
  reorderActivitiesAction,
  addItineraryDayAction,
} from "@/server/actions/itinerary.actions";
import type {
  Activity,
  ItineraryDayWithActivities,
} from "@/server/actions/itinerary.actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const REORDER_DEBOUNCE_MS = 800;

interface ItineraryEditorProps {
  initialDays: ItineraryDayWithActivities[];
  tripId: string;
  locale: string;
}

export function ItineraryEditor({
  initialDays,
  tripId,
  locale: _locale,
}: ItineraryEditorProps) {
  const t = useTranslations("itinerary");
  const [days, setDays] = useState<ItineraryDayWithActivities[]>(initialDays);
  const [isPending, startTransition] = useTransition();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleActivitiesChanged = useCallback(
    (dayId: string, activities: Activity[]) => {
      setDays((prev) =>
        prev.map((d) => (d.id === dayId ? { ...d, activities } : d))
      );
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Find which day contains the dragged activity
      const dayContainingDragged = days.find((d) =>
        d.activities.some((a) => a.id === active.id)
      );
      if (!dayContainingDragged) return;

      // Only allow reordering within the same day
      const dayContainingTarget = days.find((d) =>
        d.activities.some((a) => a.id === over.id)
      );
      if (
        !dayContainingTarget ||
        dayContainingDragged.id !== dayContainingTarget.id
      )
        return;

      const oldIndex = dayContainingDragged.activities.findIndex(
        (a) => a.id === active.id
      );
      const newIndex = dayContainingDragged.activities.findIndex(
        (a) => a.id === over.id
      );

      const reorderedActivities = arrayMove(
        dayContainingDragged.activities,
        oldIndex,
        newIndex
      ).map((a, index) => ({ ...a, orderIndex: index }));

      // Optimistic update
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayContainingDragged.id
            ? { ...d, activities: reorderedActivities }
            : d
        )
      );

      // Debounced server sync
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        const payload = reorderedActivities.map((a) => ({
          id: a.id,
          orderIndex: a.orderIndex,
        }));
        startTransition(() => {
          reorderActivitiesAction(tripId, payload);
        });
      }, REORDER_DEBOUNCE_MS);
    },
    [days, tripId]
  );

  function handleAddDay() {
    startTransition(async () => {
      const result = await addItineraryDayAction(tripId);
      if (result.success && result.data) {
        setDays((prev) => [...prev, result.data!]);
      }
    });
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {days.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            <p>{t("noActivities")}</p>
          </div>
        ) : (
          days.map((day) => (
            <ItineraryDayCard
              key={day.id}
              day={day}
              tripId={tripId}
              onActivitiesChanged={handleActivitiesChanged}
            />
          ))
        )}
      </DndContext>

      {/* Skeleton placeholder when adding a new day */}
      {isPending && (
        <div className="rounded-xl border border-dashed bg-card p-6 space-y-3" role="status" aria-label={t("addingDay")}>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}

      <Button
        variant="outline"
        onClick={handleAddDay}
        disabled={isPending}
        className="w-full min-h-[44px]"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {t("addingDay")}
          </>
        ) : (
          <>+ {t("addDay")}</>
        )}
      </Button>
    </div>
  );
}
