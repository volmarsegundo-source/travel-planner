"use server";
import "server-only";

// Allow AI generation actions up to 120s (Anthropic SDK timeout is 90s)
export const maxDuration = 120;

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { AiService } from "@/server/services/ai.service";
import { AppError, UnauthorizedError } from "@/lib/errors";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import { canUseAI } from "@/lib/guards/age-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeForPrompt } from "@/lib/prompts/injection-guard";
import { maskPII } from "@/lib/prompts/pii-masker";
import type { ActionResult } from "@/types/trip.types";
import { ItineraryPlanService } from "@/server/services/itinerary-plan.service";
import { PointsEngine } from "@/lib/engines/points-engine";
import type {
  GeneratePlanParams,
  ItineraryPlan,
  GenerateChecklistParams,
  ChecklistResult,
} from "@/types/ai.types";

// ─── persistItinerary ─────────────────────────────────────────────────────────

async function persistItinerary(
  tripId: string,
  plan: ItineraryPlan
): Promise<void> {
  await db.$transaction(async (tx) => {
    // Delete existing days and activities first (re-generation replaces everything)
    await tx.itineraryDay.deleteMany({ where: { tripId } });

    for (const day of plan.days) {
      const createdDay = await tx.itineraryDay.create({
        data: {
          tripId,
          dayNumber: day.dayNumber,
          date: day.date ? new Date(day.date) : null,
          notes: day.theme,
        },
      });

      if (day.activities.length > 0) {
        await tx.activity.createMany({
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
  });
}

// ─── persistChecklist ─────────────────────────────────────────────────────────

async function persistChecklist(
  tripId: string,
  result: ChecklistResult
): Promise<void> {
  await db.$transaction(async (tx) => {
    // Delete existing checklist items before re-generating
    await tx.checklistItem.deleteMany({ where: { tripId } });

    let globalIndex = 0;
    for (const categoryData of result.categories) {
      if (categoryData.items.length > 0) {
        await tx.checklistItem.createMany({
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
  });
}

// ─── generateTravelPlanAction ─────────────────────────────────────────────────

export async function generateTravelPlanAction(
  tripId: string,
  params: Omit<GeneratePlanParams, "userId">
): Promise<ActionResult<ItineraryPlan>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const rl = await checkRateLimit(`ai:plan:${session.user.id}`, 10, 3600);
  if (!rl.allowed) return { success: false, error: "errors.rateLimitExceeded" };

  // BOLA check: verify trip belongs to the authenticated user
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!trip) {
    return { success: false, error: "trips.errors.notFound" };
  }

  // Age guard: check if user is 18+
  const userProfile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { birthDate: true },
  });
  if (!canUseAI(userProfile?.birthDate)) {
    return { success: false, error: "errors.aiAgeRestricted" };
  }

  // Sanitize destination: injection guard + PII masking
  let sanitizedDestination: string;
  try {
    const sanitized = sanitizeForPrompt(params.destination, "destination", 200);
    const { masked } = maskPII(sanitized, "destination");
    sanitizedDestination = masked;
  } catch (error) {
    if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
      return { success: false, error: "errors.invalidInput" };
    }
    throw error;
  }

  // Sanitize travelNotes: injection guard + PII masking + truncation
  let sanitizedTravelNotes: string | undefined;
  if (params.travelNotes) {
    try {
      const sanitized = sanitizeForPrompt(params.travelNotes, "travelNotes", 500);
      const { masked } = maskPII(sanitized, "travelNotes");
      sanitizedTravelNotes = masked;
    } catch (error) {
      if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
        return { success: false, error: "errors.invalidInput" };
      }
      throw error;
    }
  }

  const sanitizedParams: GeneratePlanParams = {
    ...params,
    userId: session.user.id,
    destination: sanitizedDestination,
    travelNotes: sanitizedTravelNotes,
  };

  try {
    // Enrich with expedition context (Phase 2 preferences + Phase 5 guide)
    const expeditionContext = await ItineraryPlanService.getExpeditionContext(
      tripId,
      session.user.id
    );
    if (expeditionContext) {
      sanitizedParams.expeditionContext = expeditionContext;
    }

    const plan = await AiService.generateTravelPlan(sanitizedParams);
    await persistItinerary(tripId, plan);

    // Record generation on ItineraryPlan if it exists
    try {
      await ItineraryPlanService.recordGeneration(tripId);
    } catch {
      // ItineraryPlan may not exist yet (non-expedition trips) — ignore
    }

    // Award +50 points for generating an itinerary
    try {
      await PointsEngine.earnPoints(
        session.user.id,
        50,
        "ai_usage",
        "Itinerary generation",
        tripId
      );
    } catch {
      // Non-blocking — don't fail generation if points fail
    }

    revalidatePath(`/trips/${tripId}`);
    revalidatePath(`/trips/${tripId}/itinerary`);
    revalidatePath(`/expedition/${tripId}/phase-6`);
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

  const rl = await checkRateLimit(`ai:checklist:${session.user.id}`, 5, 3600);
  if (!rl.allowed) return { success: false, error: "errors.rateLimitExceeded" };

  // BOLA check: verify trip belongs to the authenticated user
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!trip) {
    return { success: false, error: "trips.errors.notFound" };
  }

  // Age guard: check if user is 18+
  const checklistUserProfile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { birthDate: true },
  });
  if (!canUseAI(checklistUserProfile?.birthDate)) {
    return { success: false, error: "errors.aiAgeRestricted" };
  }

  // Sanitize destination: injection guard + PII masking
  let sanitizedDestination: string;
  try {
    const sanitized = sanitizeForPrompt(params.destination, "destination", 200);
    const { masked } = maskPII(sanitized, "destination");
    sanitizedDestination = masked;
  } catch (error) {
    if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
      return { success: false, error: "errors.invalidInput" };
    }
    throw error;
  }

  try {
    const result = await AiService.generateChecklist({
      ...params,
      destination: sanitizedDestination,
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
