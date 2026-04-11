import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import type { ItineraryPlan } from "@/types/ai.types";

// ─── Zod schema for parsing AI JSON response ────────────────────────────────

const DayActivitySchema = z.object({
  title: z.string(),
  description: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  estimatedCost: z.number(),
  activityType: z.enum([
    "SIGHTSEEING",
    "FOOD",
    "TRANSPORT",
    "ACCOMMODATION",
    "LEISURE",
    "SHOPPING",
  ]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const DayPlanSchema = z.object({
  dayNumber: z.number(),
  date: z.string(),
  theme: z.string(),
  activities: z.array(DayActivitySchema),
  // Sprint 43 Wave 4: multi-city fields. All optional — single-city plans
  // omit them entirely and stay fully backwards compatible.
  city: z.string().optional(),
  isTransit: z.boolean().optional(),
  transitFrom: z.string().optional(),
  transitTo: z.string().optional(),
});

const ItineraryPlanSchema = z.object({
  destination: z.string(),
  totalDays: z.number(),
  estimatedBudgetUsed: z.number(),
  currency: z.string(),
  days: z.array(DayPlanSchema),
  tips: z.array(z.string()),
});

// ─── Constants ────────────────────────────────────────────────────────────────

const GENERATION_LOCK_TTL_SECONDS = 300;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Persists an itinerary plan to the database.
 * Replaces any existing days/activities for the trip (upsert semantics).
 * Runs inside a single transaction for atomicity.
 */
export async function persistItinerary(
  tripId: string,
  plan: ItineraryPlan
): Promise<void> {
  // Sprint 43 Wave 4: resolve city names to Destination IDs for multi-city
  // plans. Single-city plans get null and the legacy Trip↔ItineraryDay path
  // is preserved.
  const destinations = await db.destination.findMany({
    where: { tripId },
    select: { id: true, city: true, order: true },
    orderBy: { order: "asc" },
  });
  const cityToId = new Map<string, string>();
  for (const dest of destinations) {
    cityToId.set(normalizeCity(dest.city), dest.id);
  }
  // Fallback: if only one destination exists, unlabeled days belong to it.
  const fallbackDestinationId =
    destinations.length === 1 ? destinations[0]!.id : null;

  await db.$transaction(async (tx) => {
    // Delete existing days and activities first (re-generation replaces everything)
    await tx.itineraryDay.deleteMany({ where: { tripId } });

    for (const day of plan.days) {
      const isTransit = day.isTransit === true;
      let destinationId: string | null = null;
      if (!isTransit) {
        const key = day.city ? normalizeCity(day.city) : null;
        destinationId =
          (key && cityToId.get(key)) ?? fallbackDestinationId ?? null;
      }

      const createdDay = await tx.itineraryDay.create({
        data: {
          tripId,
          dayNumber: day.dayNumber,
          date: day.date ? new Date(day.date) : null,
          notes: day.theme,
          destinationId,
          isTransit,
          transitFrom: isTransit ? day.transitFrom ?? null : null,
          transitTo: isTransit ? day.transitTo ?? null : null,
        },
      });

      if (day.activities.length > 0) {
        await tx.activity.createMany({
          data: day.activities.map((activity, index) => ({
            dayId: createdDay.id,
            title: activity.title,
            notes: activity.description,
            startTime: activity.startTime,
            endTime: activity.endTime,
            orderIndex: index,
            activityType: activity.activityType,
            latitude: activity.latitude ?? null,
            longitude: activity.longitude ?? null,
          })),
        });
      }
    }
  });
}

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

/**
 * Parses a raw JSON string from the AI stream into a validated ItineraryPlan.
 * Returns the parsed plan or null if parsing/validation fails.
 */
export function parseItineraryJson(raw: string): ItineraryPlan | null {
  try {
    const parsed = JSON.parse(raw);
    const result = ItineraryPlanSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }
    return result.data as ItineraryPlan;
  } catch {
    // Try to extract JSON from markdown code fences or mixed content
    try {
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match?.[1]) {
        const parsed = JSON.parse(match[1].trim());
        const result = ItineraryPlanSchema.safeParse(parsed);
        return result.success ? (result.data as ItineraryPlan) : null;
      }
    } catch {
      // Fall through
    }

    // Try to find raw JSON object
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const parsed = JSON.parse(raw.slice(start, end + 1));
        const result = ItineraryPlanSchema.safeParse(parsed);
        return result.success ? (result.data as ItineraryPlan) : null;
      }
    } catch {
      // Fall through
    }

    return null;
  }
}

/**
 * Attempts to acquire a per-trip generation lock via Redis.
 * Returns true if the lock was acquired, false if another generation is in progress.
 */
export async function acquireGenerationLock(
  tripId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis: { set: (...args: any[]) => Promise<any> }
): Promise<boolean> {
  const lockKey = `lock:plan:${tripId}`;
  const result = await redis.set(lockKey, "1", "EX", GENERATION_LOCK_TTL_SECONDS, "NX");
  return result === "OK";
}

/**
 * Releases the per-trip generation lock.
 */
export async function releaseGenerationLock(
  tripId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis: { del: (...args: any[]) => Promise<any> }
): Promise<void> {
  const lockKey = `lock:plan:${tripId}`;
  await redis.del(lockKey);
}

/**
 * Logs itinerary persistence events using hashed userId.
 */
export function logPersistence(
  event: string,
  userId: string,
  extra?: Record<string, unknown>
): void {
  logger.info(event, { userIdHash: hashUserId(userId), ...extra });
}
