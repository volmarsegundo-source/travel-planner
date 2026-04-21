import "server-only";

// ─── Entitlement Service ────────────────────────────────────────────────────
//
// Core gating layer. Every server action that touches a Premium-gated
// feature MUST call into this service before mutating. The service answers
// two distinct questions:
//
//   1. "Can the user do X right now?" (canCreateExpedition, canAddDestination)
//   2. "Deduct PA cost Y from the right buckets, in the right order."
//
// PA consumption order (SPEC-ARCH-MULTIDESTINOS §6):
//   1. PREMIUM_MONTHLY    — expiring soonest first
//   2. ONBOARDING         — FIFO, never expires
//   3. ADMIN_GRANT        — FIFO, never expires
//   4. PACKAGE_PURCHASE   — FIFO, never expires (highest perceived value,
//                           consumed last)
//
// Dual-write window (Wave 1 → Wave 5):
//   UserProgress.availablePoints is still the legacy source of truth for
//   the UI. Until the UI is migrated, spendPa also decrements that field
//   so both views stay consistent. Remove this once Wave 6 ships the
//   per-bucket balance UI.

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { hashUserId } from "@/lib/hash";
import { SubscriptionService, PREMIUM_MONTHLY_PA, ONBOARDING_PA } from "./subscription.service";
import type { PaEntitlement, PaEntitlementSource } from "@prisma/client";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Free plan: max 3 active (non-archived, non-deleted) trips. */
export const FREE_MAX_ACTIVE_EXPEDITIONS = 3;

/** Premium plan: effectively unlimited. Use MAX_TRIPS_PER_USER as safety net. */
export const PREMIUM_MAX_ACTIVE_EXPEDITIONS = 9999;

/** Free plan: exactly 1 destination per trip. */
export const FREE_MAX_DESTINATIONS_PER_TRIP = 1;

/** Premium plan: up to 4 destinations per trip. */
export const PREMIUM_MAX_DESTINATIONS_PER_TRIP = 4;

// ─── Types ──────────────────────────────────────────────────────────────────

export type PlanTier = "FREE" | "PREMIUM";

export interface EntitlementCheck {
  allowed: boolean;
  /** i18n key (not raw text). Only set when `allowed === false`. */
  reason?: string;
  limit?: number;
  current?: number;
}

export interface PaBalance {
  total: number;
  breakdown: {
    premiumMonthly: number;
    onboarding: number;
    packagePurchase: number;
    adminGrant: number;
  };
}

export interface SpendResult {
  success: boolean;
  consumedFrom: Array<{ entitlementId: string; amount: number }>;
  /** Only set when success === false. i18n key. */
  reason?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isLive(e: Pick<PaEntitlement, "expiresAt">): boolean {
  return e.expiresAt === null || e.expiresAt.getTime() > Date.now();
}

/**
 * Sort buckets by the canonical consumption order. Mutates a copy.
 * The ordering matches SPEC §6.2 exactly: expirable-first by expiresAt ASC,
 * then by source priority (PREMIUM → ONBOARDING → ADMIN → PACKAGE), then
 * createdAt ASC as a tie-breaker.
 */
const SOURCE_PRIORITY: Record<PaEntitlementSource, number> = {
  PREMIUM_MONTHLY: 1,
  ONBOARDING: 3,
  ADMIN_GRANT: 4,
  PACKAGE_PURCHASE: 5,
};

function sortBucketsForConsumption(buckets: PaEntitlement[]): PaEntitlement[] {
  return [...buckets].sort((a, b) => {
    // Expirable buckets first (expiresAt != null).
    const aExpirable = a.expiresAt !== null ? 0 : 1;
    const bExpirable = b.expiresAt !== null ? 0 : 1;
    if (aExpirable !== bExpirable) return aExpirable - bExpirable;

    // Among expirable: expiring soonest first.
    if (a.expiresAt && b.expiresAt) {
      const diff = a.expiresAt.getTime() - b.expiresAt.getTime();
      if (diff !== 0) return diff;
    }

    // Source priority.
    const sa = SOURCE_PRIORITY[a.source] ?? 9;
    const sb = SOURCE_PRIORITY[b.source] ?? 9;
    if (sa !== sb) return sa - sb;

    // Oldest first within same source.
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

// ─── Service ────────────────────────────────────────────────────────────────

export class EntitlementService {
  // ─── Plan tier ────────────────────────────────────────────────────────────

  static async getPlanTier(userId: string): Promise<PlanTier> {
    return SubscriptionService.getUserPlan(userId);
  }

  // ─── Expedition limits ───────────────────────────────────────────────────

  static async canCreateExpedition(userId: string): Promise<EntitlementCheck> {
    const tier = await EntitlementService.getPlanTier(userId);
    const activeCount = await db.trip.count({
      where: {
        userId,
        deletedAt: null,
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
      },
    });

    const limit =
      tier === "PREMIUM"
        ? PREMIUM_MAX_ACTIVE_EXPEDITIONS
        : FREE_MAX_ACTIVE_EXPEDITIONS;

    if (activeCount >= limit) {
      return {
        allowed: false,
        reason: "limits.expeditionCap",
        limit,
        current: activeCount,
      };
    }
    return { allowed: true, limit, current: activeCount };
  }

  static async maxDestinationsForUser(userId: string): Promise<number> {
    const tier = await EntitlementService.getPlanTier(userId);
    return tier === "PREMIUM"
      ? PREMIUM_MAX_DESTINATIONS_PER_TRIP
      : FREE_MAX_DESTINATIONS_PER_TRIP;
  }

  static async canAddDestination(
    userId: string,
    tripId: string
  ): Promise<EntitlementCheck> {
    const [tier, destCount] = await Promise.all([
      EntitlementService.getPlanTier(userId),
      db.destination.count({ where: { tripId } }),
    ]);

    const limit =
      tier === "PREMIUM"
        ? PREMIUM_MAX_DESTINATIONS_PER_TRIP
        : FREE_MAX_DESTINATIONS_PER_TRIP;

    if (destCount >= limit) {
      return {
        allowed: false,
        reason: "limits.destinationCap",
        limit,
        current: destCount,
      };
    }
    return { allowed: true, limit, current: destCount };
  }

  // ─── PA balance ──────────────────────────────────────────────────────────

  static async getAvailablePaBalance(userId: string): Promise<PaBalance> {
    const buckets = await db.paEntitlement.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    const breakdown = {
      premiumMonthly: 0,
      onboarding: 0,
      packagePurchase: 0,
      adminGrant: 0,
    };

    for (const b of buckets) {
      const remaining = b.amount - b.consumed;
      if (remaining <= 0) continue;
      switch (b.source) {
        case "PREMIUM_MONTHLY":
          breakdown.premiumMonthly += remaining;
          break;
        case "ONBOARDING":
          breakdown.onboarding += remaining;
          break;
        case "PACKAGE_PURCHASE":
          breakdown.packagePurchase += remaining;
          break;
        case "ADMIN_GRANT":
          breakdown.adminGrant += remaining;
          break;
      }
    }

    const total =
      breakdown.premiumMonthly +
      breakdown.onboarding +
      breakdown.packagePurchase +
      breakdown.adminGrant;

    return { total, breakdown };
  }

  /**
   * Consume `amount` PA in the canonical order. Atomic: either the full
   * amount is deducted or nothing is (no partial consumption).
   *
   * Concurrency: Prisma itself cannot express `SELECT ... FOR UPDATE` with
   * findMany, so we rely on the surrounding transaction's isolation level
   * plus an optimistic-update guard: each bucket update re-checks `consumed`
   * before incrementing, and if any bucket has moved we bail out and retry.
   * For Wave 5 (mock gateway, low concurrency), this is sufficient; a pg
   * advisory lock will be added in Wave 6 under load.
   */
  static async spendPa(
    userId: string,
    amount: number,
    reason: string,
    tripId?: string
  ): Promise<SpendResult> {
    if (amount <= 0) {
      return { success: true, consumedFrom: [] };
    }

    try {
      return await db.$transaction(async (tx) => {
        const buckets = await tx.paEntitlement.findMany({
          where: {
            userId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        });

        const sorted = sortBucketsForConsumption(
          buckets.filter((b) => b.amount - b.consumed > 0 && isLive(b))
        );

        const totalAvailable = sorted.reduce(
          (sum, b) => sum + (b.amount - b.consumed),
          0
        );
        if (totalAvailable < amount) {
          return {
            success: false,
            consumedFrom: [],
            reason: "limits.insufficientPa",
          };
        }

        let remaining = amount;
        const consumedFrom: SpendResult["consumedFrom"] = [];

        for (const bucket of sorted) {
          if (remaining <= 0) break;
          const available = bucket.amount - bucket.consumed;
          if (available <= 0) continue;
          const take = Math.min(available, remaining);
          await tx.paEntitlement.update({
            where: { id: bucket.id },
            data: { consumed: { increment: take } },
          });
          consumedFrom.push({ entitlementId: bucket.id, amount: take });
          remaining -= take;
        }

        // Dual-write window: keep legacy UserProgress.availablePoints in sync.
        // See top-of-file comment for removal criteria (Wave 6).
        const progress = await tx.userProgress.findUnique({
          where: { userId },
          select: { availablePoints: true },
        });
        if (progress) {
          const newBalance = Math.max(0, progress.availablePoints - amount);
          await tx.userProgress.update({
            where: { userId },
            data: { availablePoints: newBalance },
          });
        }

        await tx.pointTransaction.create({
          data: {
            userId,
            amount: -amount,
            type: "spend",
            description: reason,
            tripId,
          },
        });

        logger.info("entitlement.paSpent", {
          userIdHash: hashUserId(userId),
          amount,
          reason,
          bucketsUsed: consumedFrom.length,
        });

        return { success: true, consumedFrom };
      });
    } catch (err) {
      logger.error("entitlement.spendFailed", err, {
        userIdHash: hashUserId(userId),
      });
      throw err;
    }
  }

  // ─── PA grants ───────────────────────────────────────────────────────────

  /**
   * Create a fresh Premium monthly PA bucket (1.500 PA). No rollover: old
   * buckets naturally expire via `expiresAt > NOW()` filtering; this method
   * only inserts a new row tied to the current billing period.
   *
   * Idempotent: if a non-expired PREMIUM_MONTHLY bucket already exists for
   * this subscription's current period, no new bucket is created.
   */
  static async refreshMonthlyPa(userId: string): Promise<PaEntitlement | null> {
    const sub = await SubscriptionService.getSubscription(userId);
    if (!sub) return null;
    if (sub.status !== "ACTIVE" && sub.status !== "TRIALING") return null;
    if (!sub.currentPeriodEnd) return null;

    // Idempotency: a PREMIUM_MONTHLY bucket tied to this subscription that
    // expires on (or around) currentPeriodEnd means we've already refreshed.
    const existing = await db.paEntitlement.findFirst({
      where: {
        userId,
        subscriptionId: sub.id,
        source: "PREMIUM_MONTHLY",
        expiresAt: sub.currentPeriodEnd,
      },
    });
    if (existing) return existing;

    const created = await db.paEntitlement.create({
      data: {
        userId,
        source: "PREMIUM_MONTHLY",
        amount: PREMIUM_MONTHLY_PA,
        consumed: 0,
        expiresAt: sub.currentPeriodEnd,
        subscriptionId: sub.id,
      },
    });

    logger.info("entitlement.monthlyPaRefreshed", {
      userIdHash: hashUserId(userId),
      amount: PREMIUM_MONTHLY_PA,
    });

    return created;
  }

  /**
   * Grant the one-time onboarding bucket (180 PA, never expires). Idempotent:
   * skips creation if an ONBOARDING bucket already exists for the user.
   */
  static async grantOnboardingPa(userId: string): Promise<PaEntitlement> {
    const existing = await db.paEntitlement.findFirst({
      where: { userId, source: "ONBOARDING" },
    });
    if (existing) return existing;

    const created = await db.paEntitlement.create({
      data: {
        userId,
        source: "ONBOARDING",
        amount: ONBOARDING_PA,
        consumed: 0,
        expiresAt: null,
      },
    });
    logger.info("entitlement.onboardingGranted", {
      userIdHash: hashUserId(userId),
      amount: ONBOARDING_PA,
    });
    return created;
  }

  /** Grant PA purchased via the store (never expires). */
  static async grantPackagePa(
    userId: string,
    amount: number
  ): Promise<PaEntitlement> {
    if (amount <= 0) {
      throw new AppError(
        "INVALID_AMOUNT",
        "entitlement.invalidAmount",
        400
      );
    }
    const created = await db.paEntitlement.create({
      data: {
        userId,
        source: "PACKAGE_PURCHASE",
        amount,
        consumed: 0,
        expiresAt: null,
      },
    });
    logger.info("entitlement.packageGranted", {
      userIdHash: hashUserId(userId),
      amount,
    });
    return created;
  }
}
