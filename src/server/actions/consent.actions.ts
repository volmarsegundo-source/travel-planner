"use server";
import "server-only";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import type { ActionResult } from "@/types/trip.types";

// ─── Schema ──────────────────────────────────────────────────────────────────

const ConsentDecisionSchema = z.enum(["accepted", "refused"]);

const CURRENT_CONSENT_VERSION = "v1";

// ─── recordAiConsentAction ───────────────────────────────────────────────────

/**
 * Records the user's AI consent decision (accept or refuse).
 * Upserts UserProfile to handle users without a profile row.
 *
 * @see SPEC-ARCH-056 Section 4.1
 */
export async function recordAiConsentAction(
  decision: "accepted" | "refused"
): Promise<ActionResult<{ ok: true }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = ConsentDecisionSchema.safeParse(decision);
  if (!parsed.success) {
    return { success: false, error: "errors.validation" };
  }

  const consentGiven = parsed.data === "accepted";
  const now = new Date();

  await db.userProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      aiConsentGiven: consentGiven,
      aiConsentAt: now,
      aiConsentVersion: CURRENT_CONSENT_VERSION,
    },
    update: {
      aiConsentGiven: consentGiven,
      aiConsentAt: now,
      aiConsentVersion: CURRENT_CONSENT_VERSION,
    },
  });

  logger.info("consent.recorded", {
    userId: hashUserId(session.user.id),
    decision: parsed.data,
    version: CURRENT_CONSENT_VERSION,
    timestamp: now.toISOString(),
  });

  revalidatePath("/expedition", "layout");

  return { success: true, data: { ok: true } };
}

// ─── getAiConsentStatusAction ────────────────────────────────────────────────

/**
 * Returns the current AI consent status for the authenticated user.
 *
 * @see SPEC-ARCH-056 Section 4.1
 */
export async function getAiConsentStatusAction(): Promise<
  ActionResult<{ status: "consented" | "refused" | "unknown" }>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { aiConsentGiven: true },
  });

  let status: "consented" | "refused" | "unknown";
  if (profile?.aiConsentGiven === true) {
    status = "consented";
  } else if (profile?.aiConsentGiven === false) {
    status = "refused";
  } else {
    status = "unknown";
  }

  return { success: true, data: { status } };
}
