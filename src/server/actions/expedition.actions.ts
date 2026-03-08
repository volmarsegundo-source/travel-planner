"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { ExpeditionService } from "@/server/services/expedition.service";
import { ProfileService } from "@/server/services/profile.service";
import { PhaseEngine } from "@/lib/engines/phase-engine";
import { ChecklistEngine } from "@/lib/engines/checklist-engine";
import { db } from "@/server/db";
import { Phase1Schema, Phase2Schema } from "@/lib/validations/expedition.schema";
import type { Phase1Input, Phase2Input } from "@/lib/validations/expedition.schema";
import type { ActionResult } from "@/types/trip.types";
import type { PhaseCompletionResult } from "@/types/gamification.types";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";

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

  try {
    const result = await ExpeditionService.createExpedition(
      session.user.id,
      parsed.data
    );

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
          userId: session.user.id,
        });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/trips");
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.createExpedition.error", error, {
      userId: session.user.id,
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
    const result = await ExpeditionService.completePhase2(
      tripId,
      session.user.id,
      parsed.data
    );
    revalidatePath("/dashboard");
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase2.error", error, {
      userId: session.user.id,
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
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.togglePhase3Item.error", error, {
      userId: session.user.id,
      tripId,
      itemKey,
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
    const result = await PhaseEngine.completePhase(tripId, session.user.id, 3);
    revalidatePath("/dashboard");
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase3.error", error, {
      userId: session.user.id,
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
    // Save metadata on the phase BEFORE completing (prerequisite validation reads it)
    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
    });
    if (phase) {
      await db.expeditionPhase.update({
        where: { id: phase.id },
        data: {
          metadata: {
            needsCarRental: data.needsCarRental,
            cnhResolved: data.cnhResolved,
          },
        },
      });
    }

    const result = await PhaseEngine.completePhase(tripId, session.user.id, 4);
    revalidatePath("/dashboard");
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase4.error", error, {
      userId: session.user.id,
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completePhase5Action ───────────────────────────────────────────────────

export async function completePhase5Action(
  tripId: string,
  data: { connectivityChoice: string; region: string }
): Promise<ActionResult<PhaseCompletionResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    // Save metadata on the phase BEFORE completing (prerequisite validation reads it)
    const phase = await db.expeditionPhase.findUnique({
      where: { tripId_phaseNumber: { tripId, phaseNumber: 5 } },
    });
    if (phase) {
      await db.expeditionPhase.update({
        where: { id: phase.id },
        data: {
          metadata: {
            connectivityChoice: data.connectivityChoice,
            region: data.region,
          },
        },
      });
    }

    const result = await PhaseEngine.completePhase(tripId, session.user.id, 5);
    revalidatePath("/dashboard");
    revalidatePath(`/expedition/${tripId}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("expedition.completePhase5.error", error, {
      userId: session.user.id,
      tripId,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── advanceFromPhaseAction ─────────────────────────────────────────────────

export async function advanceFromPhaseAction(
  tripId: string,
  phaseNumber: number,
  metadata?: { needsCarRental?: boolean; cnhResolved?: boolean }
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
    // For phase 4, save metadata first if provided
    if (phaseNumber === 4 && metadata) {
      const phase = await db.expeditionPhase.findUnique({
        where: { tripId_phaseNumber: { tripId, phaseNumber: 4 } },
      });
      if (phase) {
        await db.expeditionPhase.update({
          where: { id: phase.id },
          data: {
            metadata: {
              needsCarRental: metadata.needsCarRental ?? false,
              cnhResolved: metadata.cnhResolved ?? false,
            },
          },
        });
      }
    }

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
      const trip = await db.trip.findFirst({
        where: { id: tripId, userId: session.user.id, deletedAt: null },
        select: { tripType: true },
      });
      const needsCinh =
        trip?.tripType === "international" || trip?.tripType === "schengen";
      if (phaseMeta?.needsCarRental === true) {
        prerequisitesMet = !needsCinh || phaseMeta?.cnhResolved === true;
      } else {
        // No car rental or hasn't decided yet
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
      revalidatePath("/dashboard");
      revalidatePath(`/expedition/${tripId}`);
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
      revalidatePath("/dashboard");
      revalidatePath(`/expedition/${tripId}`);
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
      userId: session.user.id,
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
      userId: session.user.id,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
