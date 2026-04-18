"use server";
import "server-only";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { OnboardingService } from "@/server/services/onboarding.service";
import type { OnboardingProgress, OnboardingStepData } from "@/server/services/onboarding.service";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { mapErrorToKey } from "@/lib/action-utils";
import type { ActionResult } from "@/types/trip.types";
import { z } from "zod";

// ─── Per-step validation schemas ──────────────────────────────────────────────

const Step1Schema = z.object({}).passthrough();
// Step 1 is the welcome screen — no required fields

const Step2Schema = z.object({
  destination: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  travelers: z.number().int().min(1).max(20),
});

const Step3Schema = z.object({
  travelStyle: z.enum(["ADVENTURE", "CULTURE", "RELAXATION", "GASTRONOMY"]),
  budget: z.number().min(1),
  currency: z.string().min(1).max(5),
});

const STEP_SCHEMAS: Record<number, z.ZodType> = {
  1: Step1Schema,
  2: Step2Schema,
  3: Step3Schema,
};

// ─── saveOnboardingStepAction ─────────────────────────────────────────────────

export async function saveOnboardingStepAction(
  stepNumber: number,
  payload: OnboardingStepData
): Promise<ActionResult<OnboardingProgress>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // Validate step number range
  const schema = STEP_SCHEMAS[stepNumber];
  if (!schema) {
    return { success: false, error: "onboarding.errors.invalidStep" };
  }

  // Validate payload shape for this step
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    logger.warn("onboarding.validationFailed", {
      userId: hashUserId(session.user.id),
      stepNumber,
      field: firstError?.path?.join("."),
    });
    return { success: false, error: "onboarding.errors.validationFailed" };
  }

  try {
    const result = await OnboardingService.saveStep(
      session.user.id,
      stepNumber,
      parsed.data as OnboardingStepData
    );
    return { success: true, data: result };
  } catch (error) {
    logger.error("onboarding.saveStepFailed", {
      userId: hashUserId(session.user.id),
      stepNumber,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── getOnboardingProgressAction ──────────────────────────────────────────────

export async function getOnboardingProgressAction(): Promise<
  ActionResult<OnboardingProgress>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const progress = await OnboardingService.getProgress(session.user.id);
    return { success: true, data: progress };
  } catch (error) {
    logger.error("onboarding.getProgressFailed", {
      userId: hashUserId(session.user.id),
      error: error instanceof Error ? error.message : "unknown",
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
