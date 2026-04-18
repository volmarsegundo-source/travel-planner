import "server-only";

import { db } from "@/server/db";
import { AppError } from "@/lib/errors";

/**
 * Asserts that the given user has explicitly consented to AI data processing.
 * Throws AppError with code AI_CONSENT_REQUIRED if consent is missing.
 *
 * Must be called in every server action that triggers an AI model call,
 * after auth check and before any rate-limit or AI invocation.
 *
 * @see SPEC-ARCH-056 Section 4.2
 */
export async function assertAiConsent(userId: string): Promise<void> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { aiConsentGiven: true },
  });

  if (!profile || profile.aiConsentGiven !== true) {
    throw new AppError(
      "AI_CONSENT_REQUIRED",
      "AI_CONSENT_REQUIRED",
      403
    );
  }
}
