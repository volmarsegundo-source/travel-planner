"use server";
import "server-only";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { UnauthorizedError, AppError } from "@/lib/errors";
import { getPackage } from "@/lib/gamification/pa-packages";
import { getPaymentProvider } from "@/server/services/payment";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types/trip.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PURCHASE_RATE_LIMIT = 5;
const PURCHASE_RATE_WINDOW_SECONDS = 3600; // 1 hour

// ─── purchasePAAction ───────────────────────────────────────────────────────

export interface PurchaseResult {
  purchaseId: string;
  paAmount: number;
  newBalance: number;
}

/**
 * Purchase a PA package.
 *
 * PA purchased increments BOTH availablePoints AND totalPoints per PO decision (levels up).
 */
export async function purchasePAAction(
  packageId: string
): Promise<ActionResult<PurchaseResult>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  const userId = session.user.id;

  // Rate limit: 5 purchases per user per hour
  const rateLimit = await checkRateLimit(
    `purchase:${userId}`,
    PURCHASE_RATE_LIMIT,
    PURCHASE_RATE_WINDOW_SECONDS,
    { failClosed: true }
  );
  if (!rateLimit.allowed) {
    return { success: false, error: "gamification.purchase.rateLimited" };
  }

  // Validate package
  const pkg = getPackage(packageId);
  if (!pkg) {
    return { success: false, error: "gamification.purchase.invalidPackage" };
  }

  try {
    // Create payment intent
    const provider = getPaymentProvider();
    const intent = await provider.createIntent(pkg.amountCents, pkg.currency, {
      packageId: pkg.id,
      userId,
    });

    // Confirm payment (mock provider always succeeds)
    const confirmation = await provider.confirmIntent(intent.intentId);
    if (!confirmation.success) {
      return { success: false, error: "gamification.purchase.paymentFailed" };
    }

    // Atomic: create Purchase record + credit PA (both available and total per PO decision)
    const result = await db.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          userId,
          packageId: pkg.id,
          paAmount: pkg.pa,
          amountCents: pkg.amountCents,
          currency: pkg.currency,
          status: "confirmed",
          paymentRef: confirmation.referenceId,
        },
      });

      // PA purchased increments BOTH availablePoints AND totalPoints per PO decision (levels up)
      const progress = await tx.userProgress.update({
        where: { userId },
        data: {
          availablePoints: { increment: pkg.pa },
          totalPoints: { increment: pkg.pa },
        },
      });

      // Record the transaction for audit trail
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: pkg.pa,
          type: "purchase",
          description: `PA package: ${pkg.id} (${pkg.pa} PA)`,
        },
      });

      return {
        purchaseId: purchase.id,
        paAmount: pkg.pa,
        newBalance: progress.availablePoints,
      };
    });

    logger.info("purchase.completed", {
      userIdHash: hashUserId(userId),
      packageId: pkg.id,
      paAmount: pkg.pa,
      amountCents: pkg.amountCents,
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error("purchase.failed", {
      userIdHash: hashUserId(userId),
      packageId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof AppError) {
      return { success: false, error: "gamification.purchase.error" };
    }
    throw error;
  }
}

// ─── getPurchaseHistoryAction ───────────────────────────────────────────────

export interface PurchaseHistoryItem {
  id: string;
  packageId: string;
  paAmount: number;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: Date;
}

export async function getPurchaseHistoryAction(): Promise<
  ActionResult<PurchaseHistoryItem[]>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const purchases = await db.purchase.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      packageId: true,
      paAmount: true,
      amountCents: true,
      currency: true,
      status: true,
      createdAt: true,
    },
  });

  return { success: true, data: purchases };
}
