"use server";
import "server-only";
import { headers } from "next/headers";
import { auth, signOut, updateSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { db } from "@/server/db";
import { PointsEngine } from "@/lib/engines/points-engine";
import { PROFILE_FIELD_POINTS } from "@/types/gamification.types";
import { encrypt, decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import { hashUserId } from "@/lib/hash";
import { checkRateLimit } from "@/lib/rate-limit";
import { DateOfBirthSchema } from "@/lib/validations/user.schema";
import { z } from "zod";
import { type Prisma } from "@prisma/client";
import {
  PreferencesSchema,
  parsePreferences,
  isCategoryFilled,
  PREFERENCE_CATEGORIES,
} from "@/lib/validations/preferences.schema";
import type { ActionResult } from "@/types/trip.types";

// Fields stored encrypted in the database
const ENCRYPTED_FIELDS = ["passportNumber", "nationalId"] as const;

// Maximum lengths per field (matches Prisma @db.VarChar constraints)
const FIELD_MAX_LENGTHS: Record<string, number> = {
  phone: 20,
  country: 100,
  city: 100,
  address: 300,
  passportNumber: 50,
  nationalId: 50,
  bio: 500,
  dietaryRestrictions: 300,
  accessibility: 300,
};

// Map field keys to their database column names
function getDbKey(fieldKey: string): string {
  if (ENCRYPTED_FIELDS.includes(fieldKey as typeof ENCRYPTED_FIELDS[number])) {
    return `${fieldKey}Enc`;
  }
  return fieldKey;
}

interface ProfileData {
  birthDate: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  nationalId: string | null;
  bio: string | null;
  dietaryRestrictions: string | null;
  accessibility: string | null;
  completionScore: number;
}

export async function getProfileAction(): Promise<ActionResult<ProfileData>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  try {
    const profile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return {
        success: true,
        data: {
          birthDate: null,
          phone: null,
          country: null,
          city: null,
          address: null,
          passportNumber: null,
          passportExpiry: null,
          nationalId: null,
          bio: null,
          dietaryRestrictions: null,
          accessibility: null,
          completionScore: 0,
        },
      };
    }

    // Decrypt sensitive fields for display
    let passportNumber: string | null = null;
    let nationalId: string | null = null;

    try {
      if (profile.passportNumberEnc) {
        passportNumber = decrypt(profile.passportNumberEnc);
      }
      if (profile.nationalIdEnc) {
        nationalId = decrypt(profile.nationalIdEnc);
      }
    } catch {
      // Decryption failure — return masked values
      if (profile.passportNumberEnc) passportNumber = "••••••••";
      if (profile.nationalIdEnc) nationalId = "••••••••";
    }

    return {
      success: true,
      data: {
        birthDate: profile.birthDate?.toISOString().split("T")[0] ?? null,
        phone: profile.phone,
        country: profile.country,
        city: profile.city,
        address: profile.address,
        passportNumber,
        passportExpiry: profile.passportExpiry?.toISOString().split("T")[0] ?? null,
        nationalId,
        bio: profile.bio,
        dietaryRestrictions: profile.dietaryRestrictions,
        accessibility: profile.accessibility,
        completionScore: profile.completionScore,
      },
    };
  } catch (error) {
    logger.error("profile.getProfile.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

export async function updateProfileFieldAction(
  fieldKey: string,
  value: string
): Promise<ActionResult<{ pointsAwarded: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  // Validate field key
  if (!PROFILE_FIELD_POINTS[fieldKey]) {
    return { success: false, error: "errors.invalidField" };
  }

  // Sanitize: trim whitespace
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return { success: false, error: "errors.validation" };
  }

  // Validate length against DB constraints
  const maxLen = FIELD_MAX_LENGTHS[fieldKey];
  if (maxLen && trimmedValue.length > maxLen) {
    return { success: false, error: "errors.validation" };
  }

  try {
    const dbKey = getDbKey(fieldKey);
    let dbValue: unknown;

    if (fieldKey === "birthDate" || fieldKey === "passportExpiry") {
      dbValue = new Date(trimmedValue);
    } else if (ENCRYPTED_FIELDS.includes(fieldKey as typeof ENCRYPTED_FIELDS[number])) {
      dbValue = encrypt(trimmedValue);
    } else {
      dbValue = trimmedValue;
    }

    // Upsert profile
    await db.userProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, [dbKey]: dbValue },
      update: { [dbKey]: dbValue },
    });

    // Award points (idempotent)
    const points = PROFILE_FIELD_POINTS[fieldKey];
    await PointsEngine.awardProfileCompletion(
      session.user.id,
      fieldKey,
      points
    );

    // Recalculate completion score
    const profile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (profile) {
      const checkFields = [
        "birthDate", "phone", "country", "city", "address",
        "passportNumberEnc", "passportExpiry", "nationalIdEnc",
        "bio", "dietaryRestrictions", "accessibility",
      ];
      let filledCount = 0;
      for (const field of checkFields) {
        if (profile[field as keyof typeof profile] != null) {
          filledCount++;
        }
      }
      const score = Math.round((filledCount / 11) * 100);
      await db.userProfile.update({
        where: { userId: session.user.id },
        data: { completionScore: score },
      });
    }

    logger.info("profile.fieldUpdated", {
      userId: hashUserId(session.user.id),
      fieldKey,
      pointsAwarded: points,
    });

    return { success: true, data: { pointsAwarded: points } };
  } catch (error) {
    logger.error("profile.updateField.error", error, {
      userId: hashUserId(session.user.id),
      fieldKey,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── Preference Points Constants ──────────────────────────────────────────

const POINTS_PER_PREFERENCE_CATEGORY = 5;
const IDENTITY_EXPLORER_THRESHOLD = 5;
const IDENTITY_EXPLORER_BONUS = 25;

// ─── savePreferencesAction ────────────────────────────────────────────────

export async function savePreferencesAction(
  preferences: unknown
): Promise<ActionResult<{ pointsAwarded: number; totalFilled: number }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const parsed = PreferencesSchema.safeParse(preferences);
  if (!parsed.success) {
    return { success: false, error: "errors.validation" };
  }

  try {
    const userId = session.user.id;

    // Load existing preferences to detect newly filled categories
    const existingProfile = await db.userProfile.findUnique({
      where: { userId },
      select: { preferences: true },
    });
    const existingPrefs = parsePreferences(existingProfile?.preferences);

    // Save new preferences
    await db.userProfile.upsert({
      where: { userId },
      create: { userId, preferences: parsed.data as unknown as Prisma.InputJsonValue },
      update: { preferences: parsed.data as unknown as Prisma.InputJsonValue },
    });

    // Award points for newly filled categories (idempotent via transaction check)
    let pointsAwarded = 0;
    const newPrefs = parsed.data;

    for (const category of PREFERENCE_CATEGORIES) {
      const wasFilledBefore = isCategoryFilled(existingPrefs, category);
      const isFilledNow = isCategoryFilled(newPrefs, category);

      if (isFilledNow && !wasFilledBefore) {
        // Check if already awarded for this category (idempotent)
        const description = `Preference category: ${category}`;
        const existing = await db.pointTransaction.findFirst({
          where: { userId, type: "preference_fill", description },
        });

        if (!existing) {
          await PointsEngine.earnPoints(
            userId,
            POINTS_PER_PREFERENCE_CATEGORY,
            "preference_fill",
            description
          );
          pointsAwarded += POINTS_PER_PREFERENCE_CATEGORY;
        }
      }
    }

    // Count total filled categories
    const totalFilled = PREFERENCE_CATEGORIES.filter(
      (cat) => isCategoryFilled(newPrefs, cat)
    ).length;

    // Award detalhista badge when >= 5 categories filled
    if (totalFilled >= IDENTITY_EXPLORER_THRESHOLD) {
      const badgeAwarded = await PointsEngine.awardBadge(userId, "detalhista");
      if (badgeAwarded) {
        await PointsEngine.earnPoints(
          userId,
          IDENTITY_EXPLORER_BONUS,
          "preference_fill",
          "Badge: detalhista"
        );
        pointsAwarded += IDENTITY_EXPLORER_BONUS;
      }
    }

    logger.info("preferences.saved", {
      userId: hashUserId(userId),
      totalFilled,
      pointsAwarded,
    });

    return { success: true, data: { pointsAwarded, totalFilled } };
  } catch (error) {
    logger.error("preferences.save.error", error, {
      userId: hashUserId(session.user.id),
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}

// ─── completeProfileAction (SPEC-AUTH-AGE-002) ───────────────────────────────

const CompleteProfileSchema = z.object({
  dateOfBirth: DateOfBirthSchema,
});

export async function completeProfileAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "errors.unauthorized" };
  }

  const userId = session.user.id;

  // Rate-limit by userId — 5 attempts per 15 min.
  await headers(); // preserve server-action request scope
  const rl = await checkRateLimit(`complete-profile:${userId}`, 5, 900);
  if (!rl.allowed) {
    return { success: false, error: "errors.rateLimitExceeded" };
  }

  const raw = { dateOfBirth: formData.get("dateOfBirth") };
  const parsed = CompleteProfileSchema.safeParse(raw);

  if (!parsed.success) {
    const first = parsed.error.errors[0];
    const message = first?.message ?? "auth.errors.dateInvalid";

    // When the underage refinement fires, sign the user out.
    if (message === "auth.errors.ageUnderage") {
      logger.info("auth.oauth.dobRejected", { userIdHash: hashUserId(userId) });
      try {
        await signOut({ redirect: false });
      } catch {
        // best-effort — if signOut throws, middleware still guards access
      }
      return { success: false, error: "auth.errors.ageUnderage" };
    }

    return { success: false, error: message };
  }

  try {
    const birthDate = new Date(parsed.data.dateOfBirth);
    await db.userProfile.upsert({
      where: { userId },
      create: { userId, birthDate },
      update: { birthDate },
    });

    // SPEC-AUTH-AGE-002 §Scenario 2: refresh JWT so middleware lets the user
    // past /auth/complete-profile on the next navigation. Without this the
    // token stays profileComplete=false and middleware loops them back.
    // The auth.config.ts `session` callback reads user.profileComplete via
    // an inline cast; we mirror that pattern on the call side.
    await updateSession({
      user: { profileComplete: true } as unknown as Record<string, unknown>,
    } as Parameters<typeof updateSession>[0]);

    logger.info("auth.oauth.dobAccepted", { userIdHash: hashUserId(userId) });
    return { success: true };
  } catch (error) {
    const err = error as { name?: string; code?: string; message?: string; stack?: string };
    logger.error("auth.completeProfile.upsert.failed", error, {
      userIdHash: hashUserId(userId),
      errorName: err?.name ?? "unknown",
      errorCode: err?.code,
      errorMessage: err?.message,
      stack: err?.stack,
    });
    return { success: false, error: mapErrorToKey(error) };
  }
}
