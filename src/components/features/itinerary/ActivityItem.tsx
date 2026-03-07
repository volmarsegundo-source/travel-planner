"use client";
import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  updateActivityAction,
  deleteActivityAction,
} from "@/server/actions/itinerary.actions";
import type { Activity } from "@/server/actions/itinerary.actions";
import type { ActivityType } from "@/types/ai.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: ActivityType[] = [
  "SIGHTSEEING",
  "FOOD",
  "TRANSPORT",
  "ACCOMMODATION",
  "LEISURE",
  "SHOPPING",
];

const TYPE_COLORS: Record<ActivityType, string> = {
  SIGHTSEEING: "bg-accent text-accent-foreground",
  FOOD: "bg-atlas-gold/15 text-atlas-gold",
  TRANSPORT: "bg-muted text-muted-foreground",
  ACCOMMODATION: "bg-atlas-teal/15 text-atlas-teal-light",
  LEISURE: "bg-atlas-teal/10 text-atlas-teal-light",
  SHOPPING: "bg-atlas-gold/10 text-atlas-gold-light",
};

interface ActivityItemProps {
  activity: Activity;
  tripId: string;
  onDeleted: (activityId: string) => void;
  onUpdated: (activity: Activity) => void;
}

export function ActivityItem({
  activity,
  tripId,
  onDeleted,
  onUpdated,
}: ActivityItemProps) {
  const t = useTranslations("itinerary");
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Editable fields
  const [editTitle, setEditTitle] = useState(activity.title);
  const [editStartTime, setEditStartTime] = useState(activity.startTime ?? "");
  const [editEndTime, setEditEndTime] = useState(activity.endTime ?? "");
  const [editType, setEditType] = useState<ActivityType>(
    (activity.activityType as ActivityType) ?? "SIGHTSEEING"
  );
  const [editNotes, setEditNotes] = useState(activity.notes ?? "");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteActivityAction(activity.id, tripId);
      if (result.success) {
        onDeleted(activity.id);
      }
    });
  }

  function handleSave() {
    if (!editTitle.trim()) return;
    startTransition(async () => {
      const result = await updateActivityAction(activity.id, tripId, {
        title: editTitle.trim(),
        startTime: editStartTime || undefined,
        endTime: editEndTime || undefined,
        activityType: editType,
        notes: editNotes || undefined,
      });
      if (result.success && result.data) {
        onUpdated(result.data);
        setIsEditing(false);
      }
    });
  }

  function handleCancelEdit() {
    setEditTitle(activity.title);
    setEditStartTime(activity.startTime ?? "");
    setEditEndTime(activity.endTime ?? "");
    setEditType((activity.activityType as ActivityType) ?? "SIGHTSEEING");
    setEditNotes(activity.notes ?? "");
    setIsEditing(false);
  }

  const typeColor =
    TYPE_COLORS[(activity.activityType as ActivityType) ?? "SIGHTSEEING"] ??
    "bg-muted text-muted-foreground";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-3 rounded-lg border bg-card p-3 transition-shadow ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      {/* Drag handle — 44×44px touch target */}
      <button
        {...attributes}
        {...listeners}
        aria-label={t("dragHandle")}
        className="flex min-h-[44px] min-w-[44px] cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary active:cursor-grabbing"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-5 w-5"
          fill="currentColor"
        >
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </button>

      {isEditing ? (
        /* Inline edit form */
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder={t("form.title")}
            className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="time"
              value={editStartTime}
              onChange={(e) => setEditStartTime(e.target.value)}
              aria-label={t("form.startTime")}
              className="w-1/2 rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="time"
              value={editEndTime}
              onChange={(e) => setEditEndTime(e.target.value)}
              aria-label={t("form.endTime")}
              className="w-1/2 rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={editType}
            onChange={(e) => setEditType(e.target.value as ActivityType)}
            aria-label={t("form.activityType")}
            className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`activityTypes.${type}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder={t("form.notes")}
            rows={2}
            className="w-full rounded border bg-background px-2 py-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || !editTitle.trim()}
              className="min-h-[44px] flex-1"
            >
              {t("saved")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isPending}
              className="min-h-[44px] flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Read-only display */
        <div className="flex-1 min-w-0">
          {/* Time + type badge */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {(activity.startTime || activity.endTime) && (
              <span className="text-xs text-muted-foreground">
                {activity.startTime ?? ""}
                {activity.startTime && activity.endTime ? " – " : ""}
                {activity.endTime ?? ""}
              </span>
            )}
            {activity.activityType && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}
              >
                {t(`activityTypes.${activity.activityType}` as Parameters<typeof t>[0])}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-medium truncate">{activity.title}</p>

          {/* Notes preview */}
          {activity.notes && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {activity.notes}
            </p>
          )}
        </div>
      )}

      {/* Edit / Delete actions — only shown when not editing */}
      {!isEditing && (
        <div className="flex gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            aria-label={t("editActivity")}
            className="min-h-[44px] min-w-[44px] p-0"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 019 15v-2z"
              />
            </svg>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            aria-label={t("deleteActivity")}
            className="min-h-[44px] min-w-[44px] p-0 text-destructive hover:text-destructive"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18"
              />
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
}
