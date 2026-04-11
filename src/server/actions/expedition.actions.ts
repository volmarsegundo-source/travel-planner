"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { auth, updateSession } from "@/lib/auth";
import { AppError, UnauthorizedError } from "@/lib/errors";
import { ExpeditionService } from "@/server/services/expedition.service";
import { ProfileService } from "@/server/services/profile.service";
import { PhaseEngine } from "@/lib/engines/phase-engine";
import { ChecklistEngine } from "@/lib/engines/checklist-engine";
import { db } from "@/server/db";
import { Phase1Schema, Phase2Schema } from "@/lib/validations/expedition.schema";
import type { Phase1Input, Phase2Input } from "@/lib/validations/expedition.schema";
import type { ActionResult } from "@/types/trip.types";
import type { PhaseCompletionResult } from "@/types/gamification.types";
import type { DestinationGuideContent, GuideSectionKey } from "@/types/ai.types";
import { PointsEngine } from "@/lib/engines/points-engine";
import { AiGatewayService } from "@/server/services/ai-gateway.service";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import { hashUserId } from "@/lib/hash";
import { sanitizeForPrompt } from "@/lib/prompts/injection-guard";
import { maskPII } from "@/lib/prompts/pii-masker";
import { classifyTrip } from "@/lib/travel/trip-classifier";

import { ExpeditionSummaryService } from "@/server/services/expedition-summary.service";
import type { ExpeditionSummary } from "@/server/services/expedition-summary.service";
import { PhaseCompletionService } from "@/server/services/phase-completion.service";
import { EntitlementService } from "@/server/services/entitlement.service";
import type { DestinationInput } from "@/lib/validations/expedition.schema";

// Sprint 43 Wave 3: multi-city plan caps. Free users may only persist a
// single destination per expedition; Premium users up to 4. Zod also caps
// at 4 in Phase1Schema (defense in depth).
const FREE_MAX_DESTINATIONS = 1;
const PREMIUM_MAX_DESTINATIONS = 4;

/**
 * Replace the destinations for a trip and mirror `destinations[0]` back to
 * the legacy `Trip.destination*` scalars. Runs inside a transaction so the
 * denormalized fields never drift from the authoritative table.
 *
 * Callers MUST enforce the per-user cap BEFORE calling this helper.
 */
async function persistDestinations(
  tripId: string,
  list: DestinationInput[]
): Promise<void> {
  const primary = list[0];
  if (!primary) return;
  await db.$transaction(async (tx) => {
    await tx.destination.deleteMany({ where: { tripId } });
    await tx.destination.createMany({
      data: list.map((d, idx) => ({
        tripId,
        order: idx,
        city: d.city,
        country: d.country ?? null,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        startDate: d.startDate ? new Date(d.startDate) : null,
        endDate: d.endDate ? new Date(d.endDate) : null,
        nights: d.nights ?? null,
      })),
    });
    // Mirror first destination back to legacy Trip scalars for BC.
    await tx.trip.update({
      where: { id: tripId },
      data: {
        destination: primary.city,
        destinationLat: primary.latitude ?? null,
        destinationLon: primary.longitude ?? null,
        ...(primary.startDate
          ? { startDate: new Date(primary.startDate) }
          : {}),
        ...(primary.endDate ? { endDate: new Date(primary.endDate) } : {}),
      },
    });
  });
}

/**
 * Upsert a single `Destination` row (order=0) derived from the legacy
 * single-city payload. Used when a legacy caller does NOT send a
 * `destinations` array — we still keep the new table in sync so Phase 5/6
 * readers always find at least one row per trip.
 */
async function upsertLegacyDestination(
  tripId: string,
  payload: {
    destination: string;
    destinationLat?: number;
    destinationLon?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<void> {
  const existing = await db.destination.findFirst({
    where: { tripId, order: 0 },
    select: { id: true },
  });
  const data = {
    city: payload.destination,
    latitude: payload.destinationLat ?? null,
    longitude: payload.destinationLon ?? null,
    startDate: payload.startDate ? new Date(payload.startDate) : null,
    endDate: payload.endDate ? new Date(payload.endDate) : null,
  };
  if (existing) {
    await db.destination.update({ where: { id: existing.id }, data });
  } else {
    await db.destination.create({
      data: { ...data, tripId, order: 0 },
    });
  }
}

// ─── Ownership helper ────────────────────────────────────────────────────────

/** Verify that the trip belongs to the user. Returns null if not found or not owned. */
async function assertTripOwnership(tripId: string, userId: string) {
  return db.trip.findFirst({
    where: { id: tripId, userId, deletedAt: null },
    select: { id: true },
  });
}

// ─── createExpeditionAction ──────────────────────────────────────────────────

export async function createExpeditionAction(
  data: Phase1Input
): Promise<ActionResult<{ tripId: string; phaseResult: PhaseCompletionResult }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = Phase1Schema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: firstError?.message ?? "errors.generic",
    };
  }

  // Sprint 43 Wave 5: entitlement gate for active-trip cap (FREE = 3).
  const entitlement = await EntitlementService.canCreateExpedition(session.user.id);
  if (!entitlement.allowed) {
    return {
      success: false,
      error: entitlement.reason ?? "limits.expeditionCap",
    };
  }

  // Sprint 43 Wave 3: enforce destinations-per-expedition cap BEFORE mutating
  // state. Zod already caps at 4 in Phase1Schema; here we only need to gate
  // Free users to 1.
  if (parsed.data.destinations && parsed.data.destinations.length > 1) {
    const tier = await EntitlementService.getPlanTier(session.user.id);
    const cap = tier === "PREMIUM" ? PREMIUM_MAX_DESTINATIONS : FREE_MAX_DESTINATIONS;
    if (parsed.data.destinations.length > cap) {
      return { success: false, error: "limits.destinationCap" };
    }
  }

  try {
    const result = await ExpeditionService.createExpedition(
      session.user.id,
      parsed.data
    );

    // Sprint 43 Wave 3: persist the destinations array (if provided) or
    // upsert a single Destination row from the legacy fields. Either way,
    // the new `destinations` table stays in sync with Trip.destination*.
    if (parsed.data.destinations && parsed.data.destinations.length > 0) {
      await persistDestinations(result.tripId, parsed.data.destinations);
    } else {
      await upsertLegacyDestination(result.tripId, {
        destination: parsed.data.destination,
        destinationLat: parsed.data.destinationLat,
        destinationLon: parsed.data.destinationLon,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      });
    }

    // Save profile fields if provided
    if (parsed.data.profileFields) {
      try {
        await ProfileService.saveAndAwardProfileFields(
          session.user.id,
          parsed.data.profileFields as Record<string, string | undefined>
        );
        await ProfileService.recalculateCompletionScore(session.user.id);
      } catch (profileError) {
        // Profile save failure should not block expedition creation
        logger.error("expedition.profileFields.error", profileError, {
          userId: hashUserId(session.user.id),
        });
      }
    }

    // Save name to User model if provided in profile fields
    if (parsed.data.profileFields?.name) {
      try {
        await db.user.update({
          where: { id: session.user.id },
          data: { name: parsed.data.profileFields.name },
        });
        // Refresh the JWT session so the navbar displays the updated name
        await updateSession({ user: { name: parsed.data.profileFields.name } });
      } catch (nameError) {
        logger.error("expedition.name.error", nameError, {
          userId: hashUserId(session.user.id),
        });
      }
    }

    revalidatePath("/");
    revalidatePath("/expeditions");
    revalidatePath("/trips");

    // Fire-and-forget: check if expedition is now fully complete
    PhaseCompletionService.checkAndCompleteTrip(result.tripId, session.user.id).catch((err) => {
      logger.warn("trip.auto-complete.failed", { tripId: result.tripId, error: (err as Error).message });
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.createExpedition.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── updatePhase1Action ──────────────────────────────────────────────────────

/**
 * Updates Phase 1 trip data when revisiting a completed phase.
 * Does NOT re-create expedition phases or award points again.
 */
export async function updatePhase1Action(
  tripId: string,
  data: Phase1Input
): Promise<ActionResult<{ tripId: string }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = Phase1Schema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: firstError?.message ?? "errors.generic",
    };
  }

  // Sprint 43 Wave 3: destinations-per-expedition cap (Free=1, Premium=4).
  if (parsed.data.destinations && parsed.data.destinations.length > 1) {
    const tier = await EntitlementService.getPlanTier(session.user.id);
    const cap = tier === "PREMIUM" ? PREMIUM_MAX_DESTINATIONS : FREE_MAX_DESTINATIONS;
    if (parsed.data.destinations.length > cap) {
      return { success: false, error: "limits.destinationCap" };
    }
  }

  try {
    // BOLA: verify trip belongs to user
    const ownedTrip = await assertTripOwnership(tripId, session.user.id);
    if (!ownedTrip) {
      return { success: false, error: "errors.tripNotFound" };
    }

    // Classify trip type server-side from country codes
    let tripType: string | null = null;
    if (parsed.data.destinationCountryCode && parsed.data.originCountryCode) {
      tripType = classifyTrip(
        parsed.data.originCountryCode,
        parsed.data.destinationCountryCode
      );
    }

    // Update trip data (no expedition re-creation, no point awards)
    await db.trip.update({
      where: { id: tripId },
      data: {
        title: parsed.data.destination,
        destination: parsed.data.destination,
        origin: parsed.data.origin ?? null,
        destinationLat: parsed.data.destinationLat ?? null,
        destinationLon: parsed.data.destinationLon ?? null,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        ...(tripType ? { tripType } : {}),
      },
    });

    // Sprint 43 Wave 3: keep the new destinations table in sync.
    if (parsed.data.destinations && parsed.data.destinations.length > 0) {
      await persistDestinations(tripId, parsed.data.destinations);
    } else {
      await upsertLegacyDestination(tripId, {
        destination: parsed.data.destination,
        destinationLat: parsed.data.destinationLat,
        destinationLon: parsed.data.destinationLon,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      });
    }

    // Save profile fields if provided
    if (parsed.data.profileFields) {
      try {
        await ProfileService.saveAndAwardProfileFields(
          session.user.id,
          parsed.data.profileFields as Record<string, string | undefined>
        );
        await ProfileService.recalculateCompletionScore(session.user.id);
      } catch (profileError) {
        logger.error("expedition.updatePhase1.profileFields.error", profileError, {
          userId: hashUserId(session.user.id),
        });
      }
    }

    // Save name to User model if provided
    if (parsed.data.profileFields?.name) {
      try {
        await db.user.update({
          where: { id: session.user.id },
          data: { name: parsed.data.profileFields.name },
        });
        await updateSession({ user: { name: parsed.data.profileFields.name } });
      } catch (nameError) {
        logger.error("expedition.updatePhase1.name.error", nameError, {
          userId: hashUserId(session.user.id),
        });
      }
    }

    // Update phase 1 metadata
    await db.expeditionPhase.updateMany({
      where: { tripId, phaseNumber: 1 },
      data: {
        metadata: {
          destination: parsed.data.destination,
          flexibleDates: parsed.data.flexibleDates,
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/expeditions");
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: { tripId } };
  } catch (error) {
    logger.error("expedition.updatePhase1.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completePhase2Action ────────────────────────────────────────────────────

export async function completePhase2Action(
  tripId: string,
  data: Phase2Input
): Promise<ActionResult<PhaseCompletionResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = Phase2Schema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: firstError?.message ?? "errors.generic",
    };
  }

  try {
    let result: PhaseCompletionResult;
    try {
      result = await ExpeditionService.completePhase2(
        tripId,
        session.user.id,
        parsed.data
      );
    } catch (phaseError) {
      // Graceful handling: if phase is already completed or order has advanced,
      // treat as success — the phase work is already done, just navigate forward.
      if (
        phaseError instanceof AppError &&
        (phaseError.code === "PHASE_ORDER_VIOLATION" ||
         phaseError.code === "PHASE_ALREADY_COMPLETED")
      ) {
        logger.info("expedition.completePhase2.alreadyAdvanced", {
          tripId,
          userIdHash: hashUserId(session.user.id),
          code: phaseError.code,
        });
        revalidatePath("/expeditions");
        revalidatePath(`/expedition/${tripId}`);
        return {
          success: true,
          data: {
            phaseNumber: 2,
            pointsEarned: 0,
            badgeAwarded: null,
            newRank: null,
            nextPhaseUnlocked: 3,
          } as PhaseCompletionResult,
        };
      }
      throw phaseError;
    }

    // Persist preference fields to UserProfile (like Phase 1 does for profile fields)
    const profileFields: Record<string, string | undefined> = {};
    if (parsed.data.dietaryRestrictions) {
      profileFields.dietaryRestrictions = parsed.data.dietaryRestrictions;
    }
    if (parsed.data.accessibility) {
      profileFields.accessibility = parsed.data.accessibility;
    }
    if (Object.keys(profileFields).length > 0) {
      try {
        await ProfileService.saveAndAwardProfileFields(
          session.user.id,
          profileFields
        );
        await ProfileService.recalculateCompletionScore(session.user.id);
      } catch (profileError) {
        logger.error("expedition.phase2.profileFields.error", profileError, {
          userId: hashUserId(session.user.id),
        });
      }
    }

    revalidatePath("/expeditions");
    revalidatePath(`/expedition/${tripId}`);

    // Fire-and-forget: check if expedition is now fully complete
    PhaseCompletionService.checkAndCompleteTrip(tripId, session.user.id).catch((err) => {
      logger.warn("trip.auto-complete.failed", { tripId, error: (err as Error).message });
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase2.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── updatePhase2Action ──────────────────────────────────────────────────────

/**
 * Updates Phase 2 trip data when revisiting a completed phase.
 * Does NOT call PhaseEngine.completePhase — no points/badges awarded.
 */
export async function updatePhase2Action(
  tripId: string,
  data: Phase2Input
): Promise<ActionResult<{ tripId: string }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // BOLA: verify trip belongs to user
  const ownedTrip = await assertTripOwnership(tripId, session.user.id);
  if (!ownedTrip) {
    return { success: false, error: "errors.tripNotFound" };
  }

  const parsed = Phase2Schema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: firstError?.message ?? "errors.generic",
    };
  }

  try {
    // Save passengers breakdown to Trip if provided
    if (parsed.data.passengers) {
      await db.trip.update({
        where: { id: tripId },
        data: { passengers: parsed.data.passengers as unknown as import("@prisma/client").Prisma.InputJsonValue },
      });
    }

    // Update phase 2 metadata on ExpeditionPhase (no completion, no points)
    await db.expeditionPhase.updateMany({
      where: { tripId, phaseNumber: 2 },
      data: {
        metadata: {
          travelerType: parsed.data.travelerType,
          accommodationStyle: parsed.data.accommodationStyle,
          travelPace: parsed.data.travelPace,
          budget: parsed.data.budget,
          currency: parsed.data.currency,
        },
      },
    });

    revalidatePath("/expeditions");
    revalidatePath(`/expedition/${tripId}`);

    return { success: true, data: { tripId } };
  } catch (error) {
    logger.error("expedition.updatePhase2.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── togglePhase3ItemAction ──────────────────────────────────────────────────

export async function togglePhase3ItemAction(
  tripId: string,
  itemKey: string
): Promise<ActionResult<{ completed: boolean; pointsAwarded: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const result = await ChecklistEngine.toggleItem(
      tripId,
      session.user.id,
      3,
      itemKey
    );

    // Sync Phase 3 completion status based on current checklist state
    PhaseCompletionService.syncPhaseStatus(tripId, session.user.id, 3).catch((err) => {
      logger.warn("phase3.sync.failed", { tripId, error: (err as Error).message });
    });

    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.togglePhase3Item.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
      itemKey,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── addCustomChecklistItemAction ───────────────────────────────────────────

export async function addCustomChecklistItemAction(
  tripId: string,
  itemName: string,
  required: boolean
): Promise<ActionResult<{ id: string; itemKey: string; required: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const trimmed = itemName.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {
    return { success: false, error: "expedition.phase3.invalidItemName" };
  }

  try {
    // Use a readable key with custom_ prefix (for identification) + sanitized name
    const sanitized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 35);
    const itemKey = `custom_${sanitized}`;

    const item = await db.phaseChecklistItem.create({
      data: {
        tripId,
        phaseNumber: 3,
        itemKey,
        required,
        completed: false,
        pointsValue: 0,
      },
    });

    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: { id: item.id, itemKey: item.itemKey, required: item.required } };
  } catch (error) {
    logger.error("expedition.addCustomChecklistItem.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── removeCustomChecklistItemAction ────────────────────────────────────────

export async function removeCustomChecklistItemAction(
  tripId: string,
  itemKey: string
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // Only allow removing custom items (prefixed with custom_)
  if (!itemKey.startsWith("custom_")) {
    return { success: false, error: "expedition.phase3.cannotRemoveSystemItem" };
  }

  try {
    await db.phaseChecklistItem.deleteMany({
      where: { tripId, phaseNumber: 3, itemKey },
    });

    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: undefined };
  } catch (error) {
    logger.error("expedition.removeCustomChecklistItem.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completePhase3Action ───────────────────────────────────────────────────

export async function completePhase3Action(
  tripId: string
): Promise<ActionResult<PhaseCompletionResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    let result: PhaseCompletionResult;
    try {
      result = await PhaseEngine.completePhase(tripId, session.user.id, 3);
    } catch (phaseError) {
      if (
        phaseError instanceof AppError &&
        (phaseError.code === "PHASE_ORDER_VIOLATION" ||
         phaseError.code === "PHASE_ALREADY_COMPLETED")
      ) {
        logger.info("expedition.completePhase3.alreadyAdvanced", {
          tripId,
          userIdHash: hashUserId(session.user.id),
          code: phaseError.code,
        });
        revalidatePath("/expeditions");
        revalidatePath(`/expedition/${tripId}`);
        return {
          success: true,
          data: {
            phaseNumber: 3,
            pointsEarned: 0,
            badgeAwarded: null,
            newRank: null,
            nextPhaseUnlocked: 4,
          } as PhaseCompletionResult,
        };
      }
      throw phaseError;
    }

    revalidatePath("/expeditions");
    revalidatePath(`/expedition/${tripId}`);

    // Fire-and-forget: check if expedition is now fully complete
    PhaseCompletionService.checkAndCompleteTrip(tripId, session.user.id).catch((err) => {
      logger.warn("trip.auto-complete.failed", { tripId, error: (err as Error).message });
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase3.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completePhase4Action ───────────────────────────────────────────────────

export async function completePhase4Action(
  tripId: string,
  data: { needsCarRental: boolean; cnhResolved: boolean }
): Promise<ActionResult<PhaseCompletionResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    // BOLA: verify trip belongs to user
    const ownedTrip = await assertTripOwnership(tripId, session.user.id);
    if (!ownedTrip) {
      return { success: false, error: "errors.tripNotFound" };
    }

    // Mass assignment safe: explicit fields only
    const needsCarRental = Boolean(data.needsCarRental);
    const cnhResolved = Boolean(data.cnhResolved);

    // Save metadata on the phase BEFORE completing (prerequisite validation reads it)
    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
    });
    if (phase) {
      await db.expeditionPhase.update({
        where: { id: phase.id },
        data: {
          metadata: {
            needsCarRental,
            cnhResolved,
          },
        },
      });
    }

    let result: PhaseCompletionResult;
    try {
      result = await PhaseEngine.completePhase(tripId, session.user.id, 4);
    } catch (phaseError) {
      if (
        phaseError instanceof AppError &&
        (phaseError.code === "PHASE_ORDER_VIOLATION" ||
         phaseError.code === "PHASE_ALREADY_COMPLETED")
      ) {
        logger.info("expedition.completePhase4.alreadyAdvanced", {
          tripId,
          userIdHash: hashUserId(session.user.id),
          code: phaseError.code,
        });
        revalidatePath("/expeditions");
        revalidatePath(`/expedition/${tripId}`);
        return {
          success: true,
          data: {
            phaseNumber: 4,
            pointsEarned: 0,
            badgeAwarded: null,
            newRank: null,
            nextPhaseUnlocked: 5,
          } as PhaseCompletionResult,
        };
      }
      throw phaseError;
    }

    revalidatePath("/expeditions");
    revalidatePath(`/expedition/${tripId}`);

    // Fire-and-forget: check if expedition is now fully complete
    PhaseCompletionService.checkAndCompleteTrip(tripId, session.user.id).catch((err) => {
      logger.warn("trip.auto-complete.failed", { tripId, error: (err as Error).message });
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase4.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completePhase5Action ───────────────────────────────────────────────────

export async function completePhase5Action(
  tripId: string
): Promise<ActionResult<PhaseCompletionResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    let result: PhaseCompletionResult;
    try {
      result = await PhaseEngine.completePhase(tripId, session.user.id, 5);
    } catch (phaseError) {
      // Graceful handling: if phase is already completed or order has advanced,
      // treat as success — the phase work is already done.
      if (
        phaseError instanceof AppError &&
        (phaseError.code === "PHASE_ORDER_VIOLATION" ||
         phaseError.code === "PHASE_ALREADY_COMPLETED")
      ) {
        logger.info("expedition.completePhase5.alreadyAdvanced", {
          tripId,
          userIdHash: hashUserId(session.user.id),
          code: phaseError.code,
        });
        revalidatePath("/");
        revalidatePath("/expeditions");
        revalidatePath(`/expedition/${tripId}`);
        return {
          success: true,
          data: {
            phaseNumber: 5,
            pointsEarned: 0,
            badgeAwarded: null,
            newRank: null,
            nextPhaseUnlocked: 6,
          } as PhaseCompletionResult,
        };
      }
      throw phaseError;
    }

    revalidatePath("/");
    revalidatePath("/expeditions");
    revalidatePath(`/expedition/${tripId}`);

    // Fire-and-forget: check if expedition is now fully complete
    PhaseCompletionService.checkAndCompleteTrip(tripId, session.user.id).catch((err) => {
      logger.warn("trip.auto-complete.failed", { tripId, error: (err as Error).message });
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase5.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── generateDestinationGuideAction ─────────────────────────────────────────

const MAX_GUIDE_GENERATIONS = 3;

export async function generateDestinationGuideAction(
  tripId: string,
  locale: string
): Promise<ActionResult<{ content: DestinationGuideContent; generationCount: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    // Fetch trip with Phase 1-4 context for personalized guide
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId: session.user.id, deletedAt: null },
      select: {
        id: true,
        destination: true,
        startDate: true,
        endDate: true,
        tripType: true,
        passengers: true,
        localMobility: true,
        phases: {
          where: { phaseNumber: { in: [2] } },
          select: { metadata: true, phaseNumber: true },
        },
        transportSegments: {
          select: { transportType: true },
          distinct: ["transportType"],
        },
      },
    });

    if (!trip) {
      return { success: false, error: "errors.notFound" };
    }

    // Sanitize destination: injection guard + PII masking
    let sanitizedDestination: string;
    try {
      const sanitized = sanitizeForPrompt(trip.destination, "destination", 200);
      const { masked } = maskPII(sanitized, "destination");
      sanitizedDestination = masked;
    } catch (error) {
      if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
        return { success: false, error: "errors.invalidInput" };
      }
      throw error;
    }

    // Check generation count
    const existing = await db.destinationGuide.findUnique({
      where: { tripId },
    });

    if (existing && existing.generationCount >= MAX_GUIDE_GENERATIONS) {
      return { success: false, error: "errors.guideGenerationLimit" };
    }

    // Build traveler context from Phases 1-4 data
    const phase2Meta = trip.phases?.find((p) => p.phaseNumber === 2)?.metadata as Record<string, unknown> | null;
    const passengers = trip.passengers as Record<string, unknown> | null;
    const totalTravelers = passengers
      ? ((passengers.adults as number) ?? 1) +
        ((passengers.children as { count: number })?.count ?? 0) +
        ((passengers.seniors as number) ?? 0) +
        ((passengers.infants as number) ?? 0)
      : undefined;

    // Fetch user profile for dietary restrictions and preferences
    let dietaryRestrictions: string | undefined;
    let interests: string[] | undefined;
    let fitnessLevel: string | undefined;
    try {
      const profile = await db.userProfile.findUnique({
        where: { userId: session.user.id },
        select: { dietaryRestrictions: true, preferences: true },
      });
      if (profile?.dietaryRestrictions) {
        dietaryRestrictions = profile.dietaryRestrictions;
      }
      const prefs = profile?.preferences as Record<string, unknown> | null;
      if (prefs) {
        if (Array.isArray(prefs.interests) && prefs.interests.length > 0) {
          interests = prefs.interests as string[];
        }
        if (typeof prefs.fitnessLevel === "string") {
          fitnessLevel = prefs.fitnessLevel;
        }
      }
    } catch {
      // Non-critical — continue without profile data
    }

    const travelerContext: import("@/lib/prompts/types").GuideTravelerContext = {
      startDate: trip.startDate?.toISOString().split("T")[0],
      endDate: trip.endDate?.toISOString().split("T")[0],
      travelers: totalTravelers,
      travelerType: phase2Meta?.travelerType as string | undefined,
      accommodationStyle: phase2Meta?.accommodationStyle as string | undefined,
      travelPace: phase2Meta?.travelPace as number | undefined,
      budget: phase2Meta?.budget as number | undefined,
      budgetCurrency: phase2Meta?.currency as string | undefined,
      dietaryRestrictions,
      interests,
      fitnessLevel,
      transportTypes: trip.transportSegments?.map((s) => s.transportType),
      tripType: trip.tripType,
    };

    // Generate guide via AI with full traveler context
    const { data: content } = await AiGatewayService.generateGuide({
      userId: session.user.id,
      destination: sanitizedDestination,
      language: locale.startsWith("pt") ? "pt-BR" : "en",
      travelerContext,
    });

    // All sections are auto-viewed on generation
    const allSections: GuideSectionKey[] = [
      "timezone", "currency", "language", "electricity", "connectivity", "cultural_tips",
      "safety", "health", "transport_overview", "local_customs",
    ];

    // Upsert guide with all sections marked as viewed
    const guide = await db.destinationGuide.upsert({
      where: { tripId },
      create: {
        tripId,
        content: JSON.parse(JSON.stringify(content)),
        destination: trip.destination,
        locale,
        generationCount: 1,
        viewedSections: allSections,
      },
      update: {
        content: JSON.parse(JSON.stringify(content)),
        locale,
        generationCount: (existing?.generationCount ?? 0) + 1,
        viewedSections: allSections,
        generatedAt: new Date(),
      },
    });

    // Award points on first generation: 30 (guide) + 30 (6 sections × 5)
    if (!existing) {
      await PointsEngine.earnPoints(
        session.user.id,
        30,
        "phase_connectivity",
        "Generated destination guide for phase 5",
        tripId
      );
      // Auto-award section viewing points (5 per section × 6 sections = 30)
      for (const section of allSections) {
        await PointsEngine.earnPoints(
          session.user.id,
          5,
          "phase_connectivity",
          `Auto-viewed guide section: ${section}`,
          tripId
        );
      }
    }

    revalidatePath(`/expedition/${tripId}`);
    revalidatePath(`/expedition/${tripId}/summary`);

    // Fire-and-forget: check if expedition is now fully complete
    PhaseCompletionService.checkAndCompleteTrip(tripId, session.user.id).catch((err) => {
      logger.warn("trip.auto-complete.failed", { tripId, error: (err as Error).message });
    });

    return {
      success: true,
      data: {
        content,
        generationCount: guide.generationCount,
      },
    };
  } catch (error) {
    logger.error("expedition.generateGuide.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── regenerateGuideAction (SPEC-GUIA-PERSONALIZACAO) ──────────────────────

const MAX_GUIDE_REGENS = 5;
const REGEN_PA_COST = 50;

export async function regenerateGuideAction(
  tripId: string,
  locale: string,
  extraCategories: string[],
  personalNotes: string,
): Promise<ActionResult<{ content: DestinationGuideContent; regenCount: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    // BOLA: verify trip belongs to user
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId: session.user.id, deletedAt: null },
      select: {
        id: true,
        destination: true,
        startDate: true,
        endDate: true,
        tripType: true,
        passengers: true,
        localMobility: true,
        phases: {
          where: { phaseNumber: { in: [2] } },
          select: { metadata: true, phaseNumber: true },
        },
        transportSegments: {
          select: { transportType: true },
          distinct: ["transportType"],
        },
      },
    });

    if (!trip) {
      return { success: false, error: "errors.notFound" };
    }

    // Check existing guide and regen limit (BR-003)
    const guide = await db.destinationGuide.findUnique({ where: { tripId } });
    if (!guide) {
      return { success: false, error: "errors.notFound" };
    }
    if (guide.regenCount >= MAX_GUIDE_REGENS) {
      return { success: false, error: "expedition.phase5.regenLimitReached" };
    }

    // Server-side PA balance check (AC-014)
    const progress = await db.userProgress.findUnique({
      where: { userId: session.user.id },
      select: { availablePoints: true },
    });
    if (!progress || progress.availablePoints < REGEN_PA_COST) {
      return { success: false, error: "expedition.phase5.insufficientPA" };
    }

    // Sanitize destination
    let sanitizedDestination: string;
    try {
      const sanitized = sanitizeForPrompt(trip.destination, "destination", 200);
      const { masked } = maskPII(sanitized, "destination");
      sanitizedDestination = masked;
    } catch (error) {
      if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
        return { success: false, error: "errors.invalidInput" };
      }
      throw error;
    }

    // Sanitize personal notes (prompt injection guard)
    let sanitizedNotes = "";
    if (personalNotes && personalNotes.trim().length > 0) {
      try {
        sanitizedNotes = sanitizeForPrompt(personalNotes.slice(0, 500), "personalNotes", 500);
      } catch (error) {
        if (error instanceof AppError && error.code === "PROMPT_INJECTION_DETECTED") {
          return { success: false, error: "errors.invalidInput" };
        }
        throw error;
      }
    }

    // Build traveler context (same logic as generateDestinationGuideAction)
    const phase2Meta = trip.phases?.find((p) => p.phaseNumber === 2)?.metadata as Record<string, unknown> | null;
    const passengers = trip.passengers as Record<string, unknown> | null;
    const totalTravelers = passengers
      ? ((passengers.adults as number) ?? 1) +
        ((passengers.children as { count: number })?.count ?? 0) +
        ((passengers.seniors as number) ?? 0) +
        ((passengers.infants as number) ?? 0)
      : undefined;

    let dietaryRestrictions: string | undefined;
    let interests: string[] | undefined;
    let fitnessLevel: string | undefined;
    try {
      const profile = await db.userProfile.findUnique({
        where: { userId: session.user.id },
        select: { dietaryRestrictions: true, preferences: true },
      });
      if (profile?.dietaryRestrictions) {
        dietaryRestrictions = profile.dietaryRestrictions;
      }
      const prefs = profile?.preferences as Record<string, unknown> | null;
      if (prefs) {
        if (Array.isArray(prefs.interests) && prefs.interests.length > 0) {
          interests = prefs.interests as string[];
        }
        if (typeof prefs.fitnessLevel === "string") {
          fitnessLevel = prefs.fitnessLevel;
        }
      }
    } catch {
      // Non-critical — continue without profile data
    }

    const travelerContext: import("@/lib/prompts/types").GuideTravelerContext = {
      startDate: trip.startDate?.toISOString().split("T")[0],
      endDate: trip.endDate?.toISOString().split("T")[0],
      travelers: totalTravelers,
      travelerType: phase2Meta?.travelerType as string | undefined,
      accommodationStyle: phase2Meta?.accommodationStyle as string | undefined,
      travelPace: phase2Meta?.travelPace as number | undefined,
      budget: phase2Meta?.budget as number | undefined,
      budgetCurrency: phase2Meta?.currency as string | undefined,
      dietaryRestrictions,
      interests,
      fitnessLevel,
      transportTypes: trip.transportSegments?.map((s) => s.transportType),
      tripType: trip.tripType,
    };

    // Generate guide via AI with extra categories + personal notes
    const { data: content } = await AiGatewayService.generateGuide({
      userId: session.user.id,
      destination: sanitizedDestination,
      language: locale.startsWith("pt") ? "pt-BR" : "en",
      travelerContext,
      extraCategories,
      personalNotes: sanitizedNotes,
    });

    // Update guide + increment regenCount (BR-003, BR-004)
    const updatedGuide = await db.destinationGuide.update({
      where: { tripId },
      data: {
        content: JSON.parse(JSON.stringify(content)),
        extraCategories,
        personalNotes: sanitizedNotes || null,
        regenCount: { increment: 1 },
        generationCount: { increment: 1 },
        generatedAt: new Date(),
      },
    });

    // Debit PA AFTER success (BR-002)
    await PointsEngine.earnPoints(
      session.user.id,
      -REGEN_PA_COST,
      "ai_usage",
      "Guide re-generation (personalization)",
      tripId
    );

    revalidatePath(`/expedition/${tripId}`);
    revalidatePath(`/expedition/${tripId}/summary`);

    return {
      success: true,
      data: {
        content,
        regenCount: updatedGuide.regenCount,
      },
    };
  } catch (error) {
    logger.error("expedition.regenerateGuide.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getDestinationGuideAction ──────────────────────────────────────────────

export async function getDestinationGuideAction(
  tripId: string
): Promise<ActionResult<{
  content: DestinationGuideContent;
  generationCount: number;
  viewedSections: string[];
} | null>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!trip) {
      return { success: false, error: "errors.notFound" };
    }

    const guide = await db.destinationGuide.findUnique({
      where: { tripId },
    });

    if (!guide) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        content: guide.content as unknown as DestinationGuideContent,
        generationCount: guide.generationCount,
        viewedSections: (guide.viewedSections as string[]) ?? [],
      },
    };
  } catch (error) {
    logger.error("expedition.getGuide.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── bulkViewGuideSectionsAction ─────────────────────────────────────────────

const GUIDE_SECTION_KEYS: GuideSectionKey[] = [
  "timezone", "currency", "language", "electricity", "connectivity", "cultural_tips",
  "safety", "health", "transport_overview", "local_customs",
];

const POINTS_PER_SECTION = 5;

export async function bulkViewGuideSectionsAction(
  tripId: string
): Promise<ActionResult<{ totalPointsAwarded: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // BOLA: verify trip belongs to user
  const ownedTrip = await assertTripOwnership(tripId, session.user.id);
  if (!ownedTrip) {
    return { success: false, error: "errors.tripNotFound" };
  }

  try {
    const guide = await db.destinationGuide.findUnique({
      where: { tripId },
    });

    if (!guide) {
      return { success: false, error: "errors.notFound" };
    }

    const viewed = (guide.viewedSections as string[]) ?? [];
    const unviewed = GUIDE_SECTION_KEYS.filter((k) => !viewed.includes(k));

    if (unviewed.length === 0) {
      return { success: true, data: { totalPointsAwarded: 0 } };
    }

    // Mark all sections as viewed at once
    await db.destinationGuide.update({
      where: { tripId },
      data: { viewedSections: [...viewed, ...unviewed] },
    });

    // Award points in bulk (one transaction per section for audit trail)
    const totalPoints = unviewed.length * POINTS_PER_SECTION;
    await PointsEngine.earnPoints(
      session.user.id,
      totalPoints,
      "phase_connectivity",
      `Bulk viewed ${unviewed.length} guide sections`,
      tripId
    );

    return { success: true, data: { totalPointsAwarded: totalPoints } };
  } catch (error) {
    logger.error("expedition.bulkViewGuideSections.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── viewGuideSectionAction ─────────────────────────────────────────────────

export async function viewGuideSectionAction(
  tripId: string,
  sectionKey: string
): Promise<ActionResult<{ pointsAwarded: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  if (!GUIDE_SECTION_KEYS.includes(sectionKey as GuideSectionKey)) {
    return { success: false, error: "errors.invalidSection" };
  }

  // BOLA: verify trip belongs to user
  const ownedTrip = await assertTripOwnership(tripId, session.user.id);
  if (!ownedTrip) {
    return { success: false, error: "errors.tripNotFound" };
  }

  try {
    const guide = await db.destinationGuide.findUnique({
      where: { tripId },
    });

    if (!guide) {
      return { success: false, error: "errors.notFound" };
    }

    const viewed = (guide.viewedSections as string[]) ?? [];
    if (viewed.includes(sectionKey)) {
      return { success: true, data: { pointsAwarded: 0 } };
    }

    // Mark section as viewed and award 5 points
    await db.destinationGuide.update({
      where: { tripId },
      data: { viewedSections: [...viewed, sectionKey] },
    });

    await PointsEngine.earnPoints(
      session.user.id,
      5,
      "phase_connectivity",
      `Viewed guide section: ${sectionKey}`,
      tripId
    );

    return { success: true, data: { pointsAwarded: 5 } };
  } catch (error) {
    logger.error("expedition.viewGuideSection.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── advanceFromPhaseAction ─────────────────────────────────────────────────

export async function advanceFromPhaseAction(
  tripId: string,
  phaseNumber: number,
  metadata?: {
    needsCarRental?: boolean;
    cnhResolved?: boolean;
    transportUndecided?: boolean;
    accommodationUndecided?: boolean;
    mobilityUndecided?: boolean;
  }
): Promise<
  ActionResult<{
    nextPhase: number;
    completed: boolean;
    phaseResult?: PhaseCompletionResult;
  }>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    // BOLA: verify trip belongs to user
    const ownedTrip = await assertTripOwnership(tripId, session.user.id);
    if (!ownedTrip) {
      return { success: false, error: "errors.tripNotFound" };
    }

    // Mass assignment safe: explicit fields only for phase 4 metadata
    if (phaseNumber === 4 && metadata) {
      const phase = await db.expeditionPhase.findUnique({
        where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
      });
      if (phase) {
        await db.expeditionPhase.update({
          where: { id: phase.id },
          data: {
            metadata: {
              needsCarRental: Boolean(metadata.needsCarRental ?? false),
              cnhResolved: Boolean(metadata.cnhResolved ?? false),
              transportUndecided: Boolean(metadata.transportUndecided ?? false),
              accommodationUndecided: Boolean(metadata.accommodationUndecided ?? false),
              mobilityUndecided: Boolean(metadata.mobilityUndecided ?? false),
            },
          },
        });
      }
    }

    // Sync phase completion status in DB based on actual data
    // This ensures Phase 4 status reflects transport/accommodation presence
    await PhaseCompletionService.syncPhaseStatus(tripId, session.user.id, phaseNumber).catch((err) => {
      logger.warn("phase.sync.pre-advance.failed", { tripId, phaseNumber, error: (err as Error).message });
    });

    // Check if prerequisites are met
    let prerequisitesMet = false;

    if (phaseNumber === 3) {
      const requiredIncomplete = await db.phaseChecklistItem.count({
        where: { tripId, phaseNumber: 3, required: true, completed: false },
      });
      prerequisitesMet = requiredIncomplete === 0;
    } else if (phaseNumber === 4) {
      const phase = await db.expeditionPhase.findUnique({
        where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
      });
      const phaseMeta = phase?.metadata as Record<string, unknown> | null;

      // If ANY step is undecided, do NOT award points (SPEC-FASE4-AND-001 RN-06)
      const anyUndecided = Boolean(
        phaseMeta?.transportUndecided ||
        phaseMeta?.accommodationUndecided ||
        phaseMeta?.mobilityUndecided
      );

      if (anyUndecided) {
        prerequisitesMet = false;
      } else if (phaseMeta?.needsCarRental === true) {
        // CNH is required for any trip with car rental
        prerequisitesMet = phaseMeta?.cnhResolved === true;
      } else {
        // No car rental needed — all steps filled
        prerequisitesMet = phaseMeta?.needsCarRental === false;
      }
    }

    if (prerequisitesMet) {
      // Full completion: awards points, badge, rank
      const phaseResult = await PhaseEngine.completePhase(
        tripId,
        session.user.id,
        phaseNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
      );
      revalidatePath("/");
      revalidatePath("/expeditions");
      revalidatePath(`/expedition/${tripId}`);

      // Fire-and-forget: check if expedition is now fully complete
      PhaseCompletionService.checkAndCompleteTrip(tripId, session.user.id).catch((err) => {
        logger.warn("trip.auto-complete.failed", { tripId, error: (err as Error).message });
      });

      return {
        success: true,
        data: {
          nextPhase: phaseResult.nextPhaseUnlocked ?? phaseNumber,
          completed: true,
          phaseResult,
        },
      };
    } else {
      // Non-blocking advance: skip without points
      const result = await PhaseEngine.advanceFromPhase(
        tripId,
        session.user.id,
        phaseNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
      );
      revalidatePath("/");
      revalidatePath("/expeditions");
      revalidatePath(`/expedition/${tripId}`);

      // Fire-and-forget: check if expedition is now fully complete
      PhaseCompletionService.checkAndCompleteTrip(tripId, session.user.id).catch((err) => {
        logger.warn("trip.auto-complete.failed", { tripId, error: (err as Error).message });
      });

      return {
        success: true,
        data: {
          nextPhase: result.nextPhase,
          completed: false,
        },
      };
    }
  } catch (error) {
    logger.error("expedition.advanceFromPhase.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
      phaseNumber,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getExpeditionPhasesAction ───────────────────────────────────────────────

export async function getExpeditionPhasesAction(
  tripId: string
): Promise<ActionResult<Awaited<ReturnType<typeof PhaseEngine.getPhases>>>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const phases = await PhaseEngine.getPhases(tripId, session.user.id);
    return { success: true, data: phases };
  } catch (error) {
    logger.error("expedition.getPhases.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getPhaseMetadataAction ─────────────────────────────────────────────────

export async function getPhaseMetadataAction(
  tripId: string,
  phaseNumber: number
): Promise<ActionResult<Record<string, unknown>>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const phase = await db.expeditionPhase.findFirst({
      where: {
        tripId,
        phaseNumber,
        trip: { userId: session.user.id, deletedAt: null },
      },
      select: { metadata: true },
    });

    return {
      success: true,
      data: (phase?.metadata as Record<string, unknown>) ?? {},
    };
  } catch (error) {
    logger.error("expedition.getPhaseMetadata.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completeExpeditionAction ───────────────────────────────────────────────

const EXPEDITION_COMPLETION_POINTS = 500;

export async function completeExpeditionAction(
  tripId: string
): Promise<ActionResult<{ pointsEarned: number; badgeAwarded: string | null }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    // BOLA: verify trip belongs to user
    const trip = await db.trip.findFirst({
      where: { id: tripId, userId: session.user.id, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!trip) {
      return { success: false, error: "errors.tripNotFound" };
    }

    // Idempotent: if already completed, return zero points
    if (trip.status === "COMPLETED") {
      return { success: true, data: { pointsEarned: 0, badgeAwarded: null } };
    }

    // Mark trip as completed
    await db.trip.update({
      where: { id: tripId },
      data: { status: "COMPLETED" },
    });

    // Award expedition completion points
    await PointsEngine.earnPoints(
      session.user.id,
      EXPEDITION_COMPLETION_POINTS,
      "phase_complete",
      "Completed expedition",
      tripId
    );

    // Award primeira_viagem badge (first expedition completion)
    let badgeAwarded: string | null = null;
    try {
      await PointsEngine.awardBadge(session.user.id, "primeira_viagem");
      badgeAwarded = "primeira_viagem";
    } catch {
      // Badge may already exist — non-blocking
    }

    revalidatePath("/");
    revalidatePath("/expeditions");
    revalidatePath(`/expedition/${tripId}`);

    return {
      success: true,
      data: {
        pointsEarned: EXPEDITION_COMPLETION_POINTS,
        badgeAwarded,
      },
    };
  } catch (error) {
    logger.error("expedition.completeExpedition.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── syncPhase6CompletionAction ──────────────────────────────────────────────

/**
 * Syncs Phase 6 completion based on itinerary presence.
 * If itinerary days exist and Phase 6 is not completed, completes it via PhaseEngine.
 * Then checks if all 6 phases are complete and marks trip as COMPLETED.
 */
export async function syncPhase6CompletionAction(
  tripId: string
): Promise<ActionResult<{ completed: boolean; tripCompleted: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // BOLA: verify trip belongs to user
  const ownedTrip = await assertTripOwnership(tripId, session.user.id);
  if (!ownedTrip) {
    return { success: false, error: "errors.tripNotFound" };
  }

  try {
    // Check if itinerary days exist
    const itineraryDayCount = await db.itineraryDay.count({ where: { tripId } });

    if (itineraryDayCount === 0) {
      return { success: true, data: { completed: false, tripCompleted: false } };
    }

    // Check if Phase 6 is already completed
    const phase6 = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber: 6 } },
    });

    let phase6Completed = false;
    if (phase6 && phase6.status !== "completed") {
      try {
        await PhaseEngine.completePhase(tripId, session.user.id, 6);
        phase6Completed = true;
      } catch (error) {
        // Phase may not be active yet or other constraint -- log and continue
        logger.warn("phase6.auto-complete.failed", {
          tripId,
          error: (error as Error).message,
        });
      }
    } else if (phase6?.status === "completed") {
      phase6Completed = true;
    }

    // Check if expedition is fully complete
    const tripCompleted = await PhaseCompletionService.checkAndCompleteTrip(
      tripId,
      session.user.id
    );

    revalidatePath("/expeditions");
    revalidatePath(`/expedition/${tripId}`);

    return {
      success: true,
      data: { completed: phase6Completed, tripCompleted },
    };
  } catch (error) {
    logger.error("expedition.syncPhase6.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getExpeditionSummaryAction ─────────────────────────────────────────────

export async function getExpeditionSummaryAction(
  tripId: string
): Promise<ActionResult<ExpeditionSummary>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const summary = await ExpeditionSummaryService.getExpeditionSummary(
      tripId,
      session.user.id
    );
    return { success: true, data: summary };
  } catch (error) {
    logger.error("expedition.getSummary.error", error, {
      userId: hashUserId(session.user.id),
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
