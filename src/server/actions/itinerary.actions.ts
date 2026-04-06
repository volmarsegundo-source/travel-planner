"use server";
import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { UnauthorizedError } from "@/lib/errors";
import { TripService } from "@/server/services/trip.service";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import type { ActionResult } from "@/types/trip.types";
import type { ActivityType } from "@/types/ai.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityData {
  title: string;
  notes?: string;
  startTime?: string;
  endTime?: string;
  activityType?: ActivityType;
}

export interface Activity {
  id: string;
  dayId: string;
  title: string;
  notes: string | null;
  startTime: string | null;
  endTime: string | null;
  orderIndex: number;
  activityType: string | null;
  isManual: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItineraryDayWithActivities {
  id: string;
  tripId: string;
  dayNumber: number;
  date: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  activities: Activity[];
}

// ─── Fetch itinerary days ─────────────────────────────────────────────────────

export async function getItineraryDaysAction(
  tripId: string,
): Promise<ItineraryDayWithActivities[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: {
      itineraryDays: {
        orderBy: { dayNumber: "asc" },
        include: { activities: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });

  return (trip?.itineraryDays ?? []) as unknown as ItineraryDayWithActivities[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

const ActivityDataSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  activityType: z.enum(["SIGHTSEEING", "FOOD", "TRANSPORT", "ACCOMMODATION", "LEISURE", "SHOPPING"]).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyTripOwnership(
  tripId: string,
  userId: string
): Promise<boolean> {
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId, deletedAt: null },
    select: { id: true },
  });
  return trip !== null;
}

// ─── addActivityAction ────────────────────────────────────────────────────────

export async function addActivityAction(
  tripId: string,
  dayId: string,
  data: ActivityData
): Promise<ActionResult<Activity>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const owned = await verifyTripOwnership(tripId, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  // Verify the day belongs to the trip
  const day = await db.itineraryDay.findFirst({
    where: { id: dayId, tripId },
    select: { id: true },
  });
  if (!day) {
    return { success: false, error: "trips.errors.notFound" };
  }

  const parsedData = ActivityDataSchema.safeParse(data);
  if (!parsedData.success) {
    return { success: false, error: "errors.validation" };
  }

  try {
    // Get current max orderIndex
    const maxOrder = await db.activity.aggregate({
      where: { dayId },
      _max: { orderIndex: true },
    });
    const nextIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    const activity = await db.activity.create({
      data: {
        dayId,
        title: data.title,
        notes: data.notes ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        activityType: data.activityType ?? null,
        orderIndex: nextIndex,
        isManual: true,
      },
    });

    revalidatePath(`/trips/${tripId}/itinerary`);
    return { success: true, data: activity };
  } catch (error) {
    logger.error("itinerary.addActivityAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── updateActivityAction ─────────────────────────────────────────────────────

export async function updateActivityAction(
  activityId: string,
  tripId: string,
  data: Partial<ActivityData>
): Promise<ActionResult<Activity>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const owned = await verifyTripOwnership(tripId, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  // Verify activity belongs to a day that belongs to the trip (BOLA)
  const activity = await db.activity.findFirst({
    where: {
      id: activityId,
      day: { tripId },
    },
    select: { id: true },
  });
  if (!activity) {
    return { success: false, error: "trips.errors.notFound" };
  }

  const parsedData = ActivityDataSchema.partial().safeParse(data);
  if (!parsedData.success) {
    return { success: false, error: "errors.validation" };
  }

  try {
    const updated = await db.activity.update({
      where: { id: activityId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
        ...(data.activityType !== undefined && {
          activityType: data.activityType,
        }),
      },
    });

    revalidatePath(`/trips/${tripId}/itinerary`);
    return { success: true, data: updated };
  } catch (error) {
    logger.error("itinerary.updateActivityAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── deleteActivityAction ─────────────────────────────────────────────────────

export async function deleteActivityAction(
  activityId: string,
  tripId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const owned = await verifyTripOwnership(tripId, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  // Verify activity belongs to a day that belongs to the trip (BOLA)
  const activity = await db.activity.findFirst({
    where: {
      id: activityId,
      day: { tripId },
    },
    select: { id: true },
  });
  if (!activity) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    await db.activity.delete({ where: { id: activityId } });
    revalidatePath(`/trips/${tripId}/itinerary`);
    return { success: true };
  } catch (error) {
    logger.error("itinerary.deleteActivityAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── reorderActivitiesAction ──────────────────────────────────────────────────

export async function reorderActivitiesAction(
  tripId: string,
  activities: { id: string; orderIndex: number }[]
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    await TripService.reorderActivities(tripId, session.user.id, activities);
    revalidatePath(`/trips/${tripId}/itinerary`);
    return { success: true };
  } catch (error) {
    logger.error("itinerary.reorderActivitiesAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── addItineraryDayAction ────────────────────────────────────────────────────

export async function addItineraryDayAction(
  tripId: string
): Promise<ActionResult<ItineraryDayWithActivities>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const owned = await verifyTripOwnership(tripId, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    // Get the next day number
    const maxDay = await db.itineraryDay.aggregate({
      where: { tripId },
      _max: { dayNumber: true },
    });
    const nextDayNumber = (maxDay._max.dayNumber ?? 0) + 1;

    const day = await db.itineraryDay.create({
      data: {
        tripId,
        dayNumber: nextDayNumber,
      },
      include: { activities: true },
    });

    revalidatePath(`/trips/${tripId}/itinerary`);
    return { success: true, data: day };
  } catch (error) {
    logger.error("itinerary.addItineraryDayAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── regenerateItineraryAction ───────────────────────────────────────────────

/**
 * Prepares itinerary for regeneration. When keepManual is true,
 * only AI-generated activities are deleted; manual activities are preserved.
 * When keepManual is false, all days and activities are deleted (full regen).
 *
 * SPEC-ROTEIRO-REGEN-INTELIGENTE: Sections 5.4 and 5.5
 */
export async function regenerateItineraryAction(
  tripId: string,
  keepManual: boolean,
): Promise<ActionResult<{ manualActivities: Activity[] }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // BOLA check
  const owned = await verifyTripOwnership(tripId, session.user.id);
  if (!owned) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    if (keepManual) {
      // Collect manual activities before deleting AI ones
      const manualActivities = await db.activity.findMany({
        where: { day: { tripId }, isManual: true },
      });

      // Delete only AI-generated activities
      await db.activity.deleteMany({
        where: { day: { tripId }, isManual: false },
      });

      // Map to Activity interface
      const mapped: Activity[] = manualActivities.map((a) => ({
        id: a.id,
        dayId: a.dayId,
        title: a.title,
        notes: a.notes,
        startTime: a.startTime,
        endTime: a.endTime,
        orderIndex: a.orderIndex,
        activityType: a.activityType,
        isManual: a.isManual,
        latitude: a.latitude,
        longitude: a.longitude,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }));

      revalidatePath(`/expedition/${tripId}/phase-6`);
      return { success: true, data: { manualActivities: mapped } };
    } else {
      // Full regen: delete ALL days and activities
      await db.itineraryDay.deleteMany({ where: { tripId } });

      revalidatePath(`/expedition/${tripId}/phase-6`);
      return { success: true, data: { manualActivities: [] } };
    }
  } catch (error) {
    logger.error("itinerary.regenerateItineraryAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
