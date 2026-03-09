"use server";
import "server-only";
import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashUserId as hashForLog } from "@/lib/hash";
import { mapErrorToKey } from "@/lib/action-utils";
import {
  UpdateUserProfileSchema,
  DeleteUserAccountSchema,
} from "@/lib/validations/account.schema";
import type { UpdateUserProfileInput } from "@/lib/validations/account.schema";
import type { ActionResult } from "@/types/trip.types";

// ─── Constants ──────────────────────────────────────────────────────────────

const ANONYMIZED_NAME = "Deleted User";
const ANONYMIZED_EMAIL_DOMAIN = "anonymous.local";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a one-way SHA-256 hash of the user ID.
 * Used for audit logs and anonymized email — never stores PII.
 */
function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  preferredLocale: string | null;
}

// ─── updateUserProfileAction ────────────────────────────────────────────────

export async function updateUserProfileAction(
  data: UpdateUserProfileInput
): Promise<ActionResult<UserProfile>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = UpdateUserProfileSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: firstError?.message ?? "errors.generic",
    };
  }

  // ⚠️ IMPORTANT: Do NOT place redirect() inside this try/catch block.
  // Next.js redirect() throws a NEXT_REDIRECT error internally — catching it
  // will swallow the redirect and break navigation. Keep redirect() outside try/catch.
  try {
    const updateData: { name: string; preferredLocale?: string } = {
      name: parsed.data.name,
    };

    if (parsed.data.preferredLocale) {
      updateData.preferredLocale = parsed.data.preferredLocale;
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id, deletedAt: null },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        preferredLocale: true,
      },
    });

    logger.info("account.profileUpdated", { userId: hashForLog(session.user.id) });

    revalidatePath("/account");

    return { success: true, data: updatedUser };
  } catch (error) {
    logger.error("account.updateProfile.error", error, {
      userId: hashForLog(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── deleteUserAccountAction ────────────────────────────────────────────────

export async function deleteUserAccountAction(
  data: { confirmEmail: string }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = DeleteUserAccountSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: firstError?.message ?? "errors.generic",
    };
  }

  // ⚠️ IMPORTANT: Do NOT place redirect() inside this try/catch block.
  // Next.js redirect() throws a NEXT_REDIRECT error internally — catching it
  // will swallow the redirect and break navigation. Keep redirect() outside try/catch.
  try {
    // Fetch user to verify email match (BOLA-safe: only own record)
    const user = await db.user.findFirst({
      where: { id: session.user.id, deletedAt: null },
      select: { id: true, email: true },
    });

    if (!user) {
      return { success: false, error: "account.errors.accountNotFound" };
    }

    // Verify the confirmation email matches the user's actual email
    if (parsed.data.confirmEmail !== user.email.toLowerCase()) {
      return { success: false, error: "account.errors.emailMismatch" };
    }

    const now = new Date();
    const userIdHash = hashUserId(user.id);
    const anonymizedEmail = `deleted_${userIdHash}@${ANONYMIZED_EMAIL_DOMAIN}`;

    // Execute soft delete + PII anonymization + cascade in a transaction
    await db.$transaction(async (tx) => {
      // 1. Soft delete and anonymize the user record
      await tx.user.update({
        where: { id: user.id },
        data: {
          deletedAt: now,
          name: ANONYMIZED_NAME,
          email: anonymizedEmail,
          image: null,
          passwordHash: null,
        },
      });

      // 2. Cascade soft delete: mark all user's trips as deleted
      await tx.trip.updateMany({
        where: { userId: user.id, deletedAt: null },
        data: { deletedAt: now },
      });
    });

    // 3. Audit log — only hash of user ID and timestamp, no PII
    logger.info("account.deleted", {
      userIdHash,
      deletedAt: now.toISOString(),
    });

    // 4. Dispatch analytics event (console.log for now per spec)
    console.log(
      JSON.stringify({
        event: "account.deleted",
        userIdHash,
        timestamp: now.toISOString(),
      })
    );

    return { success: true };
  } catch (error) {
    logger.error("account.deleteAccount.error", error, {
      userId: hashForLog(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
