"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { ExpeditionService } from "@/server/services/expedition.service";
import { PhaseEngine } from "@/lib/engines/phase-engine";
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
