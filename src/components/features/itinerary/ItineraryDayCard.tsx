"use client";
import { useState, useTransition } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ActivityItem } from "./ActivityItem";
import {
  addActivityAction,
} from "@/server/actions/itinerary.actions";
import type {
  Activity,
  ItineraryDayWithActivities,
} from "@/server/actions/itinerary.actions";
import type { ActivityType } from "@/types/ai.types";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: ActivityType[] = [
  "SIGHTSEEING",
  "FOOD",
  "TRANSPORT",
  "ACCOMMODATION",
  "LEISURE",
  "SHOPPING",
];

interface ItineraryDayCardProps {
  day: ItineraryDayWithActivities;
  tripId: string;
  onActivitiesChanged: (
    dayId: string,
    activities: Activity[]
  ) => void;
}

export function ItineraryDayCard({
  day,
  tripId,
  onActivitiesChanged,
}: ItineraryDayCardProps) {
  const t = useTranslations("itinerary");
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [newTitle, setNewTitle] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newType, setNewType] = useState<ActivityType>("SIGHTSEEING");

  const activityIds = day.activities.map((a) => a.id);

  function handleActivityDeleted(activityId: string) {
    onActivitiesChanged(
      day.id,
      day.activities.filter((a) => a.id !== activityId)
    );
  }

  function handleActivityUpdated(updated: Activity) {
    onActivitiesChanged(
      day.id,
      day.activities.map((a) => (a.id === updated.id ? updated : a))
    );
  }

  function handleAddActivity() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      const result = await addActivityAction(tripId, day.id, {
        title: newTitle.trim(),
        startTime: newStartTime || undefined,
        endTime: newEndTime || undefined,
        activityType: newType,
      });
      if (result.success && result.data) {
        onActivitiesChanged(day.id, [...day.activities, result.data]);
        setNewTitle("");
        setNewStartTime("");
        setNewEndTime("");
        setNewType("SIGHTSEEING");
        setShowAddForm(false);
      }
    });
  }

  const dateLabel = day.date
    ? format(new Date(day.date), "EEE, MMM d")
    : null;

  return (
    <article className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Day header */}
      <header className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
        <div>
          <h2 className="font-semibold text-sm">
            {t("day", { number: day.dayNumber })}
          </h2>
          {dateLabel && (
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          )}
          {day.notes && (
            <p className="text-xs text-muted-foreground italic">{day.notes}</p>
          )}
        </div>
      </header>

      {/* Activities list */}
      <div className="p-3 space-y-2">
        <SortableContext
          items={activityIds}
          strategy={verticalListSortingStrategy}
        >
          {day.activities.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("noActivities")}
            </p>
          ) : (
            day.activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                tripId={tripId}
                onDeleted={handleActivityDeleted}
                onUpdated={handleActivityUpdated}
              />
            ))
          )}
        </SortableContext>

        {/* Add activity form */}
        {showAddForm && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t("form.title")}
              className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddActivity();
                if (e.key === "Escape") setShowAddForm(false);
              }}
            />
            <div className="flex gap-2">
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                aria-label={t("form.startTime")}
                className="w-1/2 rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                aria-label={t("form.endTime")}
                className="w-1/2 rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as ActivityType)}
              aria-label={t("form.activityType")}
              className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`activityTypes.${type}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddActivity}
                disabled={isPending || !newTitle.trim()}
                className="min-h-[44px] flex-1"
              >
                {t("addActivity")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                disabled={isPending}
                className="min-h-[44px] flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Add activity button */}
        {!showAddForm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="w-full min-h-[44px] border border-dashed text-muted-foreground hover:text-foreground hover:border-primary"
          >
            + {t("addActivity")}
          </Button>
        )}
      </div>
    </article>
  );
}
