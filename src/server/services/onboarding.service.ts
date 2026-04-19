import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";

const TOTAL_ONBOARDING_STEPS = 3;

export interface OnboardingStepData {
  [key: string]: unknown;
}

export interface OnboardingProgress {
  onboardingStep: number;
  onboardingData: OnboardingStepData | null;
  onboardingCompletedAt: Date | null;
}

export class OnboardingService {
  /**
   * Get the current onboarding progress for a user.
   * Returns step 0 with null data if the user has no profile yet.
   */
  static async getProgress(userId: string): Promise<OnboardingProgress> {
    const profile = await db.userProfile.findUnique({
      where: { userId },
      select: {
        onboardingStep: true,
        onboardingData: true,
        onboardingCompletedAt: true,
      },
    });

    if (!profile) {
      return {
        onboardingStep: 0,
        onboardingData: null,
        onboardingCompletedAt: null,
      };
    }

    return {
      onboardingStep: profile.onboardingStep,
      onboardingData: profile.onboardingData as OnboardingStepData | null,
      onboardingCompletedAt: profile.onboardingCompletedAt,
    };
  }

  /**
   * Save a single onboarding step's data and advance the step counter.
   *
   * - Steps 1 and 2: merge payload into onboardingData, advance step
   * - Step 3 (final): merge payload, set onboardingCompletedAt
   *
   * Validates that the step number is sequential (cannot skip steps).
   */
  static async saveStep(
    userId: string,
    stepNumber: number,
    payload: OnboardingStepData
  ): Promise<OnboardingProgress> {
    if (stepNumber < 1 || stepNumber > TOTAL_ONBOARDING_STEPS) {
      throw new Error("onboarding.errors.invalidStep");
    }

    const profile = await db.userProfile.findUnique({
      where: { userId },
      select: {
        onboardingStep: true,
        onboardingData: true,
        onboardingCompletedAt: true,
      },
    });

    const currentStep = profile?.onboardingStep ?? 0;

    // Cannot skip steps: the submitted step must be exactly currentStep + 1
    // (or re-submit the current step for idempotency)
    if (stepNumber > currentStep + 1) {
      throw new Error("onboarding.errors.stepSkipped");
    }

    const existingData = (profile?.onboardingData as OnboardingStepData) ?? {};
    const mergedData = {
      ...existingData,
      [`step${stepNumber}`]: payload,
    };

    const isFinalStep = stepNumber === TOTAL_ONBOARDING_STEPS;
    const nextStep = isFinalStep ? stepNumber : stepNumber;

    const mergedDataJson = mergedData as unknown as Prisma.InputJsonValue;

    const updated = await db.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        onboardingStep: nextStep,
        onboardingData: mergedDataJson,
        onboardingCompletedAt: isFinalStep ? new Date() : null,
      },
      update: {
        onboardingStep: nextStep,
        onboardingData: mergedDataJson,
        ...(isFinalStep ? { onboardingCompletedAt: new Date() } : {}),
      },
      select: {
        onboardingStep: true,
        onboardingData: true,
        onboardingCompletedAt: true,
      },
    });

    logger.info("onboarding.stepSaved", {
      userId: hashUserId(userId),
      stepNumber,
      isFinalStep,
    });

    return {
      onboardingStep: updated.onboardingStep,
      onboardingData: updated.onboardingData as OnboardingStepData | null,
      onboardingCompletedAt: updated.onboardingCompletedAt,
    };
  }
}
