"use server";
import "server-only";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { db } from "@/server/db";
import { PointsEngine } from "@/lib/engines/points-engine";
import { PROFILE_FIELD_POINTS } from "@/types/gamification.types";
import { encrypt, decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { mapErrorToKey } from "@/lib/action-utils";
import { hashUserId } from "@/lib/hash";
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
