import "server-only";
import { db } from "@/server/db/client";
import type { ItineraryPlan, DayPlan, Activity as AiActivity } from "@/types/ai.types";
import type { ActivityType } from "@/generated/prisma/client";

// ── Category mapping ────────────────────────────────────────────────────────
// AI category → DB ActivityType enum

const AI_CATEGORY_TO_DB: Record<AiActivity["category"], ActivityType> = {
  SIGHTSEEING: "ATTRACTION",
  FOOD: "RESTAURANT",
  TRANSPORT: "TRANSPORT",
  LEISURE: "FREE_TIME",
  ACCOMMODATION: "ACCOMMODATION",
  OTHER: "OTHER",
} as const;

// ── Authorization ──────────────────────────────────────────────────────────

async function assertOwnership(tripId: string, userId: string): Promise<void> {
  const trip = await db.trip.findUnique({
    where: { id: tripId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!trip) {
    const error = new Error("Trip not found or not authorized");
    (error as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw error;
  }
}

// ── Save a full AI-generated plan ──────────────────────────────────────────
// Replaces all ItineraryDay + Activity rows for the trip in a single transaction.

export async function saveItineraryPlan(
  tripId: string,
  userId: string,
  plan: ItineraryPlan,
): Promise<void> {
  await assertOwnership(tripId, userId);

  await db.$transaction(async (tx) => {
    // Delete existing days (cascade deletes activities via FK)
    await tx.itineraryDay.deleteMany({ where: { tripId } });

    // Re-create each day and its activities
    for (const day of plan.days) {
      const createdDay = await tx.itineraryDay.create({
        data: {
          tripId,
          dayNumber: day.dayNumber,
          date: day.date ? new Date(day.date) : null,
          title: day.theme ?? null,
        },
        select: { id: true },
      });

      if (day.activities.length > 0) {
        await tx.activity.createMany({
          data: day.activities.map((act, idx) => ({
            dayId: createdDay.id,
            title: act.title,
            description: act.description,
            startTime: act.time ?? null,
            estimatedCost: act.estimatedCost ?? null,
            type: AI_CATEGORY_TO_DB[act.category],
            orderIndex: idx,
          })),
        });
      }
    }
  });
}

// ── Get saved itinerary plan ───────────────────────────────────────────────
// Returns null if no ItineraryDay rows exist for the trip.

export async function getItineraryPlan(
  tripId: string,
  userId: string,
): Promise<ItineraryPlan | null> {
  await assertOwnership(tripId, userId);

  const days = await db.itineraryDay.findMany({
    where: { tripId },
    orderBy: { dayNumber: "asc" },
    include: {
      activities: {
        where: { deletedAt: null },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (days.length === 0) return null;

  // Map DB rows back to AI ItineraryPlan shape
  // We reconstruct a minimal ItineraryPlan from the stored data.
  const dbCategoryToAi: Record<ActivityType, AiActivity["category"]> = {
    ATTRACTION: "SIGHTSEEING",
    RESTAURANT: "FOOD",
    TRANSPORT: "TRANSPORT",
    FREE_TIME: "LEISURE",
    ACCOMMODATION: "ACCOMMODATION",
    OTHER: "OTHER",
  };

  const mappedDays: DayPlan[] = days.map((day) => ({
    dayNumber: day.dayNumber,
    date: day.date ? day.date.toISOString().split("T")[0] : undefined,
    theme: day.title ?? undefined,
    activities: day.activities.map((act) => ({
      time: act.startTime ?? undefined,
      title: act.title,
      description: act.description ?? "",
      category: dbCategoryToAi[act.type as ActivityType],
      estimatedCost: act.estimatedCost ? Number(act.estimatedCost) : undefined,
    })),
  }));

  // Reconstruct a minimal plan — destination and other metadata are not stored
  // per-day, so we derive what we can. Callers should merge with session data if needed.
  return {
    destination: "",
    totalDays: days.length,
    travelStyle: "",
    highlights: [],
    days: mappedDays,
  };
}

// ── Add a single activity ──────────────────────────────────────────────────

export async function addActivity(
  dayId: string,
  tripId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    startTime?: string;
    category?: string;
  },
): Promise<void> {
  await assertOwnership(tripId, userId);

  // Verify the day belongs to this trip
  const day = await db.itineraryDay.findUnique({
    where: { id: dayId },
    select: { id: true, tripId: true },
  });
  if (!day || day.tripId !== tripId) {
    const error = new Error("Day not found or not authorized");
    (error as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw error;
  }

  // Determine current max orderIndex for this day
  const lastActivity = await db.activity.findFirst({
    where: { dayId, deletedAt: null },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });
  const nextIndex = lastActivity ? lastActivity.orderIndex + 1 : 0;

  const aiCategory = (data.category as AiActivity["category"]) ?? "OTHER";
  const dbType: ActivityType =
    AI_CATEGORY_TO_DB[aiCategory] ?? "OTHER";

  await db.activity.create({
    data: {
      dayId,
      title: data.title,
      description: data.description ?? null,
      startTime: data.startTime ?? null,
      type: dbType,
      orderIndex: nextIndex,
    },
  });
}

// ── Delete an activity (soft delete) ──────────────────────────────────────

export async function deleteActivity(
  activityId: string,
  tripId: string,
  userId: string,
): Promise<void> {
  await assertOwnership(tripId, userId);

  // Verify activity belongs to a day in this trip
  const activity = await db.activity.findUnique({
    where: { id: activityId, deletedAt: null },
    select: { id: true, day: { select: { tripId: true } } },
  });
  if (!activity || activity.day.tripId !== tripId) {
    const error = new Error("Activity not found or not authorized");
    (error as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw error;
  }

  await db.activity.update({
    where: { id: activityId },
    data: { deletedAt: new Date() },
  });
}

// ── Reorder activities within a day (batch update orderIndex) ──────────────

export async function reorderActivities(
  tripId: string,
  userId: string,
  updates: Array<{ id: string; orderIndex: number; dayNumber?: number }>,
): Promise<void> {
  await assertOwnership(tripId, userId);

  // Verify all activity IDs belong to this trip before updating
  const activityIds = updates.map((u) => u.id);
  const activities = await db.activity.findMany({
    where: { id: { in: activityIds }, deletedAt: null },
    select: { id: true, day: { select: { tripId: true } } },
  });

  const allBelongToTrip = activities.every((a) => a.day.tripId === tripId);
  if (activities.length !== activityIds.length || !allBelongToTrip) {
    const error = new Error("One or more activities not found or not authorized");
    (error as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw error;
  }

  await db.$transaction(
    updates.map((u) => {
      const updateData: { orderIndex: number; dayId?: string } = {
        orderIndex: u.orderIndex,
      };

      // If dayNumber is provided, resolve to dayId for cross-day moves
      // For simplicity we update orderIndex only; dayId updates require day lookup
      return db.activity.update({
        where: { id: u.id },
        data: updateData,
      });
    }),
  );
}
