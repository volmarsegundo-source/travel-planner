"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { AiService } from "@/server/services/ai.service";
import { UnauthorizedError } from "@/lib/errors";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/trip.types";
import type {
  GeneratePlanParams,
  ItineraryPlan,
  GenerateChecklistParams,
  ChecklistResult,
} from "@/types/ai.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapErrorToKey(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "errors.generic";
}

// ─── persistItinerary ─────────────────────────────────────────────────────────

async function persistItinerary(
  tripId: string,
  plan: ItineraryPlan
): Promise<void> {
  // Delete existing days and activities first (re-generation replaces everything)
  await db.itineraryDay.deleteMany({ where: { tripId } });

  for (const day of plan.days) {
    const createdDay = await db.itineraryDay.create({
      data: {
        tripId,
        dayNumber: day.dayNumber,
        date: day.date ? new Date(day.date) : null,
        notes: day.theme,
      },
    });

    if (day.activities.length > 0) {
      await db.activity.createMany({
        data: day.activities.map((activity, index) => ({
          dayId: createdDay.id,
          title: activity.title,
          notes: activity.description,
          startTime: activity.startTime,
          endTime: activity.endTime,
          orderIndex: index,
          activityType: activity.activityType,
        })),
      });
    }
  }
}

// ─── persistChecklist ─────────────────────────────────────────────────────────

async function persistChecklist(
  tripId: string,
  result: ChecklistResult
): Promise<void> {
  // Delete existing checklist items before re-generating
  await db.checklistItem.deleteMany({ where: { tripId } });

  let globalIndex = 0;
  for (const categoryData of result.categories) {
    if (categoryData.items.length > 0) {
      await db.checklistItem.createMany({
        data: categoryData.items.map((item) => ({
          tripId,
          category: categoryData.category,
          label: item.label,
          checked: false,
          orderIndex: globalIndex++,
        })),
      });
    }
  }
}

// ─── generateTravelPlanAction ─────────────────────────────────────────────────

export async function generateTravelPlanAction(
  tripId: string,
  params: Omit<GeneratePlanParams, "userId">
): Promise<ActionResult<ItineraryPlan>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // BOLA check: verify trip belongs to the authenticated user
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!trip) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    const plan = await AiService.generateTravelPlan({
      ...params,
      userId: session.user.id,
    });
    await persistItinerary(tripId, plan);
    revalidatePath(`/trips/${tripId}`);
    revalidatePath(`/trips/${tripId}/itinerary`);
    return { success: true, data: plan };
  } catch (error) {
    logger.error("ai.generateTravelPlanAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── generateChecklistAction ──────────────────────────────────────────────────

export async function generateChecklistAction(
  tripId: string,
  params: Omit<GenerateChecklistParams, "userId">
): Promise<ActionResult<ChecklistResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // BOLA check: verify trip belongs to the authenticated user
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!trip) {
    return { success: false, error: "trips.errors.notFound" };
  }

  try {
    const result = await AiService.generateChecklist({
      ...params,
      userId: session.user.id,
    });
    await persistChecklist(tripId, result);
    revalidatePath(`/trips/${tripId}`);
    revalidatePath(`/trips/${tripId}/checklist`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("ai.generateChecklistAction.error", error, {
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
