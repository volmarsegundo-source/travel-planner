"use server";
import "server-only";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashUserId } from "@/lib/hash";
import type { ActionResult } from "@/types/trip.types";

// ─── Types ─────────────────────────────────────────────────────────────────

export type PremiumPlan = "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL";

export interface SubscriptionStatusView {
  plan: "FREE" | "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL";
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isPremium: boolean;
}

export interface CheckoutMockSession {
  redirectUrl: string;
  sessionId: string;
}

const TRIAL_DAYS = 7;
const MONTHLY_DAYS = 30;
const ANNUAL_DAYS = 365;

// ─── Internal helpers ───────────────────────────────────────────────────────

function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function emptyFreeStatus(): SubscriptionStatusView {
  return {
    plan: "FREE",
    status: "ACTIVE",
    trialEndsAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    isPremium: false,
  };
}

function toView(sub: {
  plan: string;
  status: string;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}): SubscriptionStatusView {
  const isPremium =
    sub.plan !== "FREE" &&
    (sub.status === "ACTIVE" || sub.status === "TRIALING");
  return {
    plan: sub.plan as SubscriptionStatusView["plan"],
    status: sub.status as SubscriptionStatusView["status"],
    trialEndsAt: sub.trialEndsAt,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    isPremium,
  };
}

async function hasUsedTrial(userId: string): Promise<boolean> {
  const count = await db.subscriptionEvent.count({
    where: {
      type: "TRIAL_STARTED",
      subscription: { userId },
    },
  });
  return count > 0;
}

// ─── startTrialAction ──────────────────────────────────────────────────────

export async function startTrialAction(
  plan: PremiumPlan
): Promise<ActionResult<{ trialEndsAt: Date }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  const userId = session.user.id;

  try {
    const alreadyUsed = await hasUsedTrial(userId);
    if (alreadyUsed) {
      return { success: false, error: "subscription.trialAlreadyUsed" };
    }

    const now = new Date();
    const trialEndsAt = addDays(now, TRIAL_DAYS);

    const result = await db.$transaction(async (tx) => {
      // Upsert the subscription row to TRIALING
      const sub = await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan,
          status: "TRIALING",
          gateway: "MERCADO_PAGO",
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
          cancelAtPeriodEnd: false,
        },
        update: {
          plan,
          status: "TRIALING",
          gateway: "MERCADO_PAGO",
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: "TRIAL_STARTED",
          payload: { plan },
        },
      });

      return sub;
    });

    logger.info("subscription.trial.started", {
      userIdHash: hashUserId(userId),
      plan,
    });

    return { success: true, data: { trialEndsAt: result.trialEndsAt ?? trialEndsAt } };
  } catch (error) {
    logger.error("subscription.trial.failed", {
      userIdHash: hashUserId(userId),
      error: error instanceof Error ? error.message : "unknown",
    });
    return { success: false, error: "subscription.trialFailed" };
  }
}

// ─── createCheckoutMockAction ──────────────────────────────────────────────

export async function createCheckoutMockAction(
  plan: PremiumPlan
): Promise<ActionResult<CheckoutMockSession>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  const userId = session.user.id;

  try {
    const alreadyUsedTrial = await hasUsedTrial(userId);
    const now = new Date();

    // Determine initial state: if trial has not been used, start as TRIALING;
    // otherwise create a pending row that confirmCheckoutMock will activate.
    const sub = await db.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({ where: { userId } });
      const initialStatus: "TRIALING" | "PAST_DUE" = alreadyUsedTrial
        ? "PAST_DUE"
        : "TRIALING";
      const trialEndsAt = alreadyUsedTrial ? null : addDays(now, TRIAL_DAYS);

      if (existing) {
        return tx.subscription.update({
          where: { userId },
          data: {
            plan,
            status: initialStatus,
            gateway: "MERCADO_PAGO",
            trialEndsAt,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          },
        });
      }

      const created = await tx.subscription.create({
        data: {
          userId,
          plan,
          status: initialStatus,
          gateway: "MERCADO_PAGO",
          trialEndsAt,
          cancelAtPeriodEnd: false,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: created.id,
          type: "CREATED",
          payload: { plan, mock: true },
        },
      });

      return created;
    });

    const redirectUrl = `/loja/checkout-mock?plan=${plan}&session=${sub.id}`;

    logger.info("subscription.checkout.mock.created", {
      userIdHash: hashUserId(userId),
      plan,
      sessionId: sub.id,
    });

    return { success: true, data: { redirectUrl, sessionId: sub.id } };
  } catch (error) {
    logger.error("subscription.checkout.mock.failed", {
      userIdHash: hashUserId(userId),
      error: error instanceof Error ? error.message : "unknown",
    });
    return { success: false, error: "subscription.checkoutFailed" };
  }
}

// ─── confirmCheckoutMockAction ─────────────────────────────────────────────

export async function confirmCheckoutMockAction(
  sessionId: string
): Promise<ActionResult<{ activated: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  const userId = session.user.id;

  try {
    const sub = await db.subscription.findUnique({ where: { id: sessionId } });
    if (!sub || sub.userId !== userId) {
      return { success: false, error: "subscription.sessionNotFound" };
    }

    const now = new Date();
    const periodDays = sub.plan === "PREMIUM_ANNUAL" ? ANNUAL_DAYS : MONTHLY_DAYS;
    const currentPeriodEnd = addDays(now, periodDays);

    await db.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd,
          cancelAtPeriodEnd: false,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: "RENEWED",
          payload: { plan: sub.plan, mock: true, firstActivation: true },
        },
      });
    });

    logger.info("subscription.checkout.mock.activated", {
      userIdHash: hashUserId(userId),
      sessionId,
    });

    return { success: true, data: { activated: true } };
  } catch (error) {
    logger.error("subscription.checkout.mock.confirmFailed", {
      userIdHash: hashUserId(userId),
      error: error instanceof Error ? error.message : "unknown",
    });
    return { success: false, error: "subscription.confirmFailed" };
  }
}

// ─── cancelSubscriptionAction ──────────────────────────────────────────────

export async function cancelSubscriptionAction(): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  const userId = session.user.id;

  try {
    const sub = await db.subscription.findUnique({ where: { userId } });
    if (!sub) {
      return { success: false, error: "subscription.notFound" };
    }

    await db.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: new Date(),
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          type: "CANCELED",
          payload: { plan: sub.plan },
        },
      });
    });

    logger.info("subscription.canceled.atPeriodEnd", {
      userIdHash: hashUserId(userId),
    });

    return { success: true };
  } catch (error) {
    logger.error("subscription.cancel.failed", {
      userIdHash: hashUserId(userId),
      error: error instanceof Error ? error.message : "unknown",
    });
    return { success: false, error: "subscription.cancelFailed" };
  }
}

// ─── getSubscriptionStatusAction ───────────────────────────────────────────

export async function getSubscriptionStatusAction(): Promise<
  ActionResult<SubscriptionStatusView>
> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  const userId = session.user.id;

  try {
    const sub = await db.subscription.findUnique({ where: { userId } });
    if (!sub) {
      return { success: true, data: emptyFreeStatus() };
    }
    return { success: true, data: toView(sub) };
  } catch (error) {
    logger.error("subscription.status.failed", {
      userIdHash: hashUserId(userId),
      error: error instanceof Error ? error.message : "unknown",
    });
    return { success: false, error: "subscription.statusFailed" };
  }
}
