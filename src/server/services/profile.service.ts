import "server-only";
import { db } from "@/server/db";
import { PointsEngine } from "@/lib/engines/points-engine";
import { PROFILE_FIELD_POINTS } from "@/types/gamification.types";
import { encrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

const ENCRYPTED_FIELDS = ["passportNumber", "nationalId"] as const;
const TOTAL_PROFILE_FIELDS = Object.keys(PROFILE_FIELD_POINTS).length;

// Mass assignment safe: only these field keys are allowed in profile updates
const ALLOWED_PROFILE_FIELDS = new Set(Object.keys(PROFILE_FIELD_POINTS));

export class ProfileService {
  /**
   * Save profile fields and award points for each new field.
   * Idempotent: does not re-award points for fields already saved.
   */
  static async saveAndAwardProfileFields(
    userId: string,
    fields: Record<string, string | undefined>,
    tx?: Tx
  ): Promise<{ pointsAwarded: number; fieldsUpdated: string[] }> {
    const client = tx ?? db;
    let pointsAwarded = 0;
    const fieldsUpdated: string[] = [];

    // Mass assignment safe: only accept fields in ALLOWED_PROFILE_FIELDS
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === "") continue;
      if (!ALLOWED_PROFILE_FIELDS.has(key)) continue;

      const isEncryptedField = ENCRYPTED_FIELDS.includes(key as typeof ENCRYPTED_FIELDS[number]);
      const dbKey = isEncryptedField ? `${key}Enc` : key;

      if (key === "birthDate") {
        updateData[dbKey] = new Date(value);
      } else if (isEncryptedField) {
        updateData[dbKey] = encrypt(value);
      } else {
        updateData[dbKey] = value;
      }

      fieldsUpdated.push(key);
    }

    if (fieldsUpdated.length === 0) return { pointsAwarded: 0, fieldsUpdated: [] };

    // Upsert profile
    await client.userProfile.upsert({
      where: { userId },
      create: { userId, ...updateData },
      update: updateData,
    });

    // Award points for each field
    for (const fieldKey of fieldsUpdated) {
      const points = PROFILE_FIELD_POINTS[fieldKey];
      if (points) {
        await PointsEngine.awardProfileCompletion(userId, fieldKey, points, tx);
        pointsAwarded += points;
      }
    }

    logger.info("profile.fieldsUpdated", { userIdHash: hashUserId(userId), fieldsUpdated, pointsAwarded });

    return { pointsAwarded, fieldsUpdated };
  }

  /**
   * Recalculate profile completion score (0-100).
   * Score = (filled fields / total fields) * 100, rounded.
   */
  static async recalculateCompletionScore(userId: string, tx?: Tx): Promise<number> {
    const client = tx ?? db;

    const profile = await client.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) return 0;

    let filledCount = 0;
    const checkFields = [
      "birthDate", "phone", "country", "city", "address",
      "passportNumberEnc", "passportExpiry", "nationalIdEnc",
      "bio", "dietaryRestrictions", "accessibility",
    ];

    for (const field of checkFields) {
      if (profile[field as keyof typeof profile] != null) {
        filledCount++;
      }
    }

    const score = Math.round((filledCount / TOTAL_PROFILE_FIELDS) * 100);

    await client.userProfile.update({
      where: { userId },
      data: { completionScore: score },
    });

    return score;
  }
}
