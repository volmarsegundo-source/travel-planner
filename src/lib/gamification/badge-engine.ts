import "server-only";

// ─── Badge Evaluation Engine ────────────────────────────────────────────────
//
// Evaluates badge criteria and awards badges to users.
// All badge checks are idempotent — awarding an already-owned badge is a no-op.

import { db } from "@/server/db";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { BADGE_REGISTRY, type BadgeDefinition } from "./badge-registry";
import type { BadgeKey } from "@/types/gamification.types";

export type BadgeEventType =
  | "trip_complete"
  | "phase_complete"
  | "daily_login"
  | "language_change";

export interface BadgeStatus {
  key: BadgeKey;
  nameKey: string;
  descriptionKey: string;
  category: string;
  icon: string;
  unlocked: boolean;
  earnedAt: Date | null;
  progress: { current: number; target: number; percentage: number };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check all badge criteria for a user and award any newly earned badges.
 * Called after significant user events (trip complete, phase complete, etc.).
 *
 * @returns Array of newly awarded badge keys
 */
export async function checkAndAwardBadges(
  userId: string,
  _event: BadgeEventType
): Promise<BadgeKey[]> {
  const newlyAwarded: BadgeKey[] = [];

  // Get current user badges to skip already-earned ones
  const existingBadges = await db.userBadge.findMany({
    where: { userId },
    select: { badgeKey: true },
  });
  const earnedKeys = new Set(existingBadges.map((b) => b.badgeKey));

  // Only check badges not yet earned
  const unchecked = BADGE_REGISTRY.filter((b) => !earnedKeys.has(b.key));

  for (const badge of unchecked) {
    const { current, target } = await evaluateCriteria(userId, badge);

    if (current >= target) {
      try {
        await db.userBadge.create({
          data: { userId, badgeKey: badge.key },
        });
        newlyAwarded.push(badge.key);
        logger.info("gamification.badgeAwarded", {
          userIdHash: hashUserId(userId),
          badgeKey: badge.key,
        });
      } catch (error: unknown) {
        // Unique constraint violation — already awarded (race condition safe)
        const prismaError = error as { code?: string };
        if (prismaError.code === "P2002") {
          continue;
        }
        throw error;
      }
    }
  }

  return newlyAwarded;
}

/**
 * Get all 16 badges with their locked/unlocked status and progress.
 */
export async function getUserBadgesWithStatus(
  userId: string
): Promise<BadgeStatus[]> {
  const userBadges = await db.userBadge.findMany({
    where: { userId },
    select: { badgeKey: true, earnedAt: true },
  });
  const badgeMap = new Map(
    userBadges.map((b) => [b.badgeKey, b.earnedAt])
  );

  const results: BadgeStatus[] = [];

  for (const badge of BADGE_REGISTRY) {
    const earnedAt = badgeMap.get(badge.key) ?? null;
    const unlocked = earnedAt !== null;
    const { current, target, percentage } = unlocked
      ? { current: badge.threshold, target: badge.threshold, percentage: 100 }
      : await evaluateCriteria(userId, badge);

    results.push({
      key: badge.key,
      nameKey: badge.nameKey,
      descriptionKey: badge.descriptionKey,
      category: badge.category,
      icon: badge.icon,
      unlocked,
      earnedAt,
      progress: { current, target, percentage },
    });
  }

  return results;
}

/**
 * Get progress for a single badge.
 */
export async function getBadgeProgress(
  userId: string,
  badgeKey: BadgeKey
): Promise<{ current: number; target: number; percentage: number }> {
  const badge = BADGE_REGISTRY.find((b) => b.key === badgeKey);
  if (!badge) {
    return { current: 0, target: 0, percentage: 0 };
  }

  // Check if already earned
  const existing = await db.userBadge.findUnique({
    where: { userId_badgeKey: { userId, badgeKey } },
  });
  if (existing) {
    return {
      current: badge.threshold,
      target: badge.threshold,
      percentage: 100,
    };
  }

  return evaluateCriteria(userId, badge);
}

// ─── Internal: Criteria Evaluation ──────────────────────────────────────────

async function evaluateCriteria(
  userId: string,
  badge: BadgeDefinition
): Promise<{ current: number; target: number; percentage: number }> {
  const target = badge.threshold;
  let current = 0;

  switch (badge.criteriaType) {
    case "trip_count": {
      current = await db.trip.count({
        where: { userId, deletedAt: null, status: "COMPLETED" },
      });
      break;
    }

    case "phase_complete_all_fields": {
      // Detalhista: at least 1 trip with all Phase 4 logistics fields filled
      const tripsWithFullLogistics = await db.trip.count({
        where: {
          userId,
          deletedAt: null,
          transportSegments: { some: {} },
          accommodations: { some: {} },
          localMobility: { isEmpty: false },
        },
      });
      current = tripsWithFullLogistics;
      break;
    }

    case "phase_complete_all_phases": {
      // Planejador nato: at least 1 trip with all 6 phases completed
      const completedPhases = await db.expeditionPhase.groupBy({
        by: ["tripId"],
        where: {
          status: "completed",
          trip: { userId, deletedAt: null },
        },
        _count: { phaseNumber: true },
        having: { phaseNumber: { _count: { gte: target } } },
      });
      current = completedPhases.length > 0 ? target : 0;
      break;
    }

    case "zero_pending": {
      // Zero pendencias: at least 1 trip where all required checklist items are done
      const tripsWithChecklist = await db.trip.findMany({
        where: { userId, deletedAt: null },
        select: {
          id: true,
          phaseChecklist: {
            where: { required: true },
            select: { completed: true },
          },
        },
      });
      const hasCleanTrip = tripsWithChecklist.some(
        (t) =>
          t.phaseChecklist.length > 0 &&
          t.phaseChecklist.every((item) => item.completed)
      );
      current = hasCleanTrip ? 1 : 0;
      // threshold is 0 meaning "zero pending" — we check if condition is met
      // We use current >= target where target = 0, so if hasCleanTrip we exceed
      return {
        current: hasCleanTrip ? 1 : 0,
        target: 1,
        percentage: hasCleanTrip ? 100 : 0,
      };
    }

    case "phase_revisit": {
      // Revisor: user revisited a completed phase (re-opened and saved)
      // Check if any completed phase was updated significantly after completion
      const phases = await db.expeditionPhase.findMany({
        where: {
          trip: { userId, deletedAt: null },
          status: "completed",
        },
        select: { completedAt: true, updatedAt: true },
      });
      const hasRevisit = phases.some(
        (p) =>
          p.completedAt &&
          p.updatedAt &&
          p.updatedAt.getTime() - p.completedAt.getTime() > 60000
      );
      current = hasRevisit ? 1 : 0;
      break;
    }

    case "trip_type_international": {
      current = await db.trip.count({
        where: {
          userId,
          deletedAt: null,
          tripType: { in: ["international", "schengen"] },
        },
      });
      break;
    }

    case "trip_type_family": {
      // Family trip: trip with children > 0 in passengers JSON
      const familyTrips = await db.trip.findMany({
        where: { userId, deletedAt: null, NOT: { passengers: { equals: Prisma.DbNull } } },
        select: { passengers: true },
      });
      current = familyTrips.filter((t) => {
        const p = t.passengers as { children?: number; infants?: number } | null;
        return p && ((p.children ?? 0) > 0 || (p.infants ?? 0) > 0);
      }).length;
      break;
    }

    case "trip_type_solo": {
      // Solo: trip with adults=1, children=0, infants=0
      const soloTrips = await db.trip.findMany({
        where: { userId, deletedAt: null, NOT: { passengers: { equals: Prisma.DbNull } } },
        select: { passengers: true },
      });
      current = soloTrips.filter((t) => {
        const p = t.passengers as {
          adults?: number;
          children?: number;
          infants?: number;
        } | null;
        return (
          p &&
          (p.adults ?? 1) === 1 &&
          (p.children ?? 0) === 0 &&
          (p.infants ?? 0) === 0
        );
      }).length;
      break;
    }

    case "language_count": {
      // Count distinct locales used across trips (preferredLocale + trip locale)
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { preferredLocale: true },
      });
      const guides = await db.destinationGuide.findMany({
        where: { trip: { userId, deletedAt: null } },
        select: { locale: true },
      });
      const locales = new Set<string>();
      if (user?.preferredLocale) locales.add(user.preferredLocale);
      guides.forEach((g) => locales.add(g.locale));
      current = locales.size;
      break;
    }

    case "continent_count": {
      // Simplified: count distinct first-letter-groups of destinations
      // In a real app this would use geocoding; for MVP we count distinct destinations
      const destinations = await db.trip.findMany({
        where: { userId, deletedAt: null, status: "COMPLETED" },
        select: { destination: true },
        distinct: ["destination"],
      });
      current = destinations.length;
      break;
    }

    case "login_count": {
      // Use total login transactions as proxy for login count
      const loginCount = await db.pointTransaction.count({
        where: { userId, type: "daily_login" },
      });
      current = loginCount;
      break;
    }

    case "trips_in_period": {
      // 3 completed trips in 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      current = await db.trip.count({
        where: {
          userId,
          deletedAt: null,
          status: "COMPLETED",
          updatedAt: { gte: thirtyDaysAgo },
        },
      });
      break;
    }

    case "beta_user": {
      // Beta user: account created before a cutoff date (e.g., 2026-06-01)
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      const betaCutoff = new Date("2026-06-01T00:00:00Z");
      current = user && user.createdAt < betaCutoff ? 1 : 0;
      break;
    }

    case "account_age_days": {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      if (user) {
        const ageMs = Date.now() - user.createdAt.getTime();
        current = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      }
      break;
    }
  }

  const percentage =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return { current, target, percentage };
}
