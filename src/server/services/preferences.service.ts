import "server-only";
import { type Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import {
  PreferencesSchema,
  parsePreferences,
  type UserPreferences,
} from "@/lib/validations/preferences.schema";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export class PreferencesService {
  /**
   * Save preferences to the UserProfile.preferences JSON field.
   * Validates with Zod before saving.
   */
  static async savePreferences(
    userId: string,
    preferences: unknown,
    tx?: Tx
  ): Promise<{ success: boolean; preferences: UserPreferences }> {
    const client = tx ?? db;

    const parsed = PreferencesSchema.safeParse(preferences);
    if (!parsed.success) {
      logger.warn("preferences.invalidData", {
        userIdHash: hashUserId(userId),
        errors: parsed.error.errors.map((e) => e.message),
      });
      throw new Error("Invalid preferences data");
    }

    await client.userProfile.upsert({
      where: { userId },
      create: { userId, preferences: parsed.data as unknown as Prisma.InputJsonValue },
      update: { preferences: parsed.data as unknown as Prisma.InputJsonValue },
    });

    logger.info("preferences.saved", { userIdHash: hashUserId(userId) });

    return { success: true, preferences: parsed.data };
  }

  /**
   * Fetch and parse preferences for a user.
   * Returns default empty preferences if none exist.
   */
  static async getPreferences(userId: string): Promise<UserPreferences> {
    const profile = await db.userProfile.findUnique({
      where: { userId },
      select: { preferences: true },
    });

    return parsePreferences(profile?.preferences);
  }
}
