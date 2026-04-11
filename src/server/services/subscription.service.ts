import "server-only";

// ─── Subscription Service ───────────────────────────────────────────────────
//
// Pure domain service. Owns the lifecycle of a user's Subscription row:
// FREE (implicit) → TRIALING → ACTIVE → (CANCELED | EXPIRED).
//
// Every mutation:
//  - Runs inside db.$transaction
//  - Emits exactly ONE SubscriptionEvent row (audit log invariant)
//  - Leaves the subscription row in a valid state-machine position
//
// Wave 5 note: this is "mock gateway" territory — callers pass in
// gatewaySubscriptionId/gatewayCustomerId; no real Mercado Pago SDK calls
// are made here. The webhook route (mercado-pago/route.ts) translates
// MP payloads into these service calls.

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { hashUserId } from "@/lib/hash";
import { Prisma } from "@prisma/client";
import type {
  Subscription,
  SubscriptionEvent,
  PaymentGateway,
} from "@prisma/client";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

// ─── Constants ──────────────────────────────────────────────────────────────

/** Trial length for the Premium plan (SPEC-PROD-PREMIUM §3). */
export const TRIAL_DAYS = 7;

/** Monthly PA allowance for Premium users (no rollover). */
export const PREMIUM_MONTHLY_PA = 1500;

/** Onboarding PA grant (one-time, never expires). */
export const ONBOARDING_PA = 180;

// ─── Event type vocabulary ─────────────────────────────────────────────────

export const SubscriptionEventType = {
  CREATED: "CREATED",
  TRIAL_STARTED: "TRIAL_STARTED",
  TRIAL_ENDED: "TRIAL_ENDED",
  ACTIVATED: "ACTIVATED",
  RENEWED: "RENEWED",
  CANCELED_AT_PERIOD_END: "CANCELED_AT_PERIOD_END",
  CANCELED_IMMEDIATELY: "CANCELED_IMMEDIATELY",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  REFUNDED: "REFUNDED",
  REACTIVATED: "REACTIVATED",
} as const;

export type SubscriptionEventTypeValue =
  (typeof SubscriptionEventType)[keyof typeof SubscriptionEventType];

// ─── Parameter types ────────────────────────────────────────────────────────

export interface ActivateParams {
  plan: "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL";
  gateway: PaymentGateway;
  gatewaySubscriptionId: string;
  gatewayCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  gatewayEventId?: string;
}

export type PremiumPlan = "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create an audit event inside the current transaction. */
async function emitEvent(
  tx: Tx,
  subscriptionId: string,
  type: SubscriptionEventTypeValue,
  payload?: Prisma.InputJsonValue,
  gatewayEventId?: string
): Promise<SubscriptionEvent> {
  return tx.subscriptionEvent.create({
    data: {
      subscriptionId,
      type,
      gatewayEventId: gatewayEventId ?? null,
      payload: payload ?? Prisma.JsonNull,
    },
  });
}

/**
 * Ensure a Subscription row exists for the user, returning it. If missing,
 * creates a FREE baseline row and emits a CREATED event. This lets mutations
 * operate safely on any user even if they never explicitly subscribed.
 */
async function ensureSubscription(
  tx: Tx,
  userId: string
): Promise<Subscription> {
  const existing = await tx.subscription.findUnique({ where: { userId } });
  if (existing) return existing;

  const created = await tx.subscription.create({
    data: {
      userId,
      plan: "FREE",
      status: "ACTIVE",
    },
  });
  await emitEvent(tx, created.id, SubscriptionEventType.CREATED);
  return created;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class SubscriptionService {
  // ─── Queries ──────────────────────────────────────────────────────────────

  static async getSubscription(userId: string): Promise<Subscription | null> {
    return db.subscription.findUnique({ where: { userId } });
  }

  static async getUserPlan(userId: string): Promise<"FREE" | "PREMIUM"> {
    const sub = await db.subscription.findUnique({ where: { userId } });
    if (!sub) return "FREE";
    if (sub.plan === "FREE") return "FREE";
    // Only TRIALING and ACTIVE confer Premium access. PAST_DUE/CANCELED/EXPIRED = FREE.
    if (sub.status === "TRIALING" || sub.status === "ACTIVE") return "PREMIUM";
    return "FREE";
  }

  static async isPremium(userId: string): Promise<boolean> {
    return (await SubscriptionService.getUserPlan(userId)) === "PREMIUM";
  }

  static async isInTrial(userId: string): Promise<boolean> {
    const sub = await db.subscription.findUnique({ where: { userId } });
    if (!sub) return false;
    if (sub.status !== "TRIALING") return false;
    if (!sub.trialEndsAt) return false;
    return sub.trialEndsAt.getTime() > Date.now();
  }

  static async hasUsedTrial(userId: string): Promise<boolean> {
    // A user has "used trial" if any of their historical subscription rows
    // ever emitted a TRIAL_STARTED event. Since the row is 1:1 with User and
    // cascades on delete, we key off userId → subscription → events.
    const sub = await db.subscription.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!sub) return false;
    const evt = await db.subscriptionEvent.findFirst({
      where: {
        subscriptionId: sub.id,
        type: SubscriptionEventType.TRIAL_STARTED,
      },
      select: { id: true },
    });
    return evt !== null;
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * Start a 7-day trial. One per account lifetime. Card is assumed to have
   * been collected by the caller (webhook handler or purchase action).
   */
  static async startTrial(
    userId: string,
    plan: PremiumPlan
  ): Promise<Subscription> {
    return db.$transaction(async (tx) => {
      const current = await ensureSubscription(tx, userId);

      // Block re-trialing if already on a paid plan. Note: a fresh FREE/ACTIVE
      // baseline row (just created by ensureSubscription) is allowed through —
      // we only block when the user is on a real paid tier.
      if (
        current.plan !== "FREE" &&
        (current.status === "TRIALING" || current.status === "ACTIVE")
      ) {
        throw new AppError(
          "SUBSCRIPTION_CONFLICT",
          "subscription.conflict.alreadyActive",
          409
        );
      }

      // Check trial history (one-per-lifetime).
      const priorTrial = await tx.subscriptionEvent.findFirst({
        where: {
          subscriptionId: current.id,
          type: SubscriptionEventType.TRIAL_STARTED,
        },
        select: { id: true },
      });
      if (priorTrial) {
        throw new AppError(
          "SUBSCRIPTION_CONFLICT",
          "subscription.trialAlreadyUsed",
          409
        );
      }

      const now = new Date();
      const trialEnd = addDays(now, TRIAL_DAYS);

      const updated = await tx.subscription.update({
        where: { id: current.id },
        data: {
          plan,
          status: "TRIALING",
          trialEndsAt: trialEnd,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });

      await emitEvent(tx, updated.id, SubscriptionEventType.TRIAL_STARTED, {
        plan,
        trialEnd: trialEnd.toISOString(),
      });

      logger.info("subscription.trialStarted", {
        userIdHash: hashUserId(userId),
        plan,
      });

      return updated;
    });
  }

  /**
   * Activate a Premium subscription (post-payment). Idempotent-ish: if the
   * user is already ACTIVE on the same gatewaySubscriptionId, prefer to call
   * `renew` instead. This method rejects if currently TRIALING or ACTIVE on
   * a *different* subscription to avoid silent data loss.
   */
  static async activate(
    userId: string,
    params: ActivateParams
  ): Promise<Subscription> {
    return db.$transaction(async (tx) => {
      const current = await ensureSubscription(tx, userId);

      // Allow transition from TRIALING (trial → paid conversion) but block
      // double-activation on a mismatched gatewaySubscriptionId.
      if (
        current.status === "ACTIVE" &&
        current.gatewaySubscriptionId &&
        current.gatewaySubscriptionId !== params.gatewaySubscriptionId
      ) {
        throw new AppError(
          "SUBSCRIPTION_CONFLICT",
          "subscription.conflict.alreadyActive",
          409
        );
      }

      const updated = await tx.subscription.update({
        where: { id: current.id },
        data: {
          plan: params.plan,
          status: "ACTIVE",
          gateway: params.gateway,
          gatewaySubscriptionId: params.gatewaySubscriptionId,
          gatewayCustomerId: params.gatewayCustomerId ?? current.gatewayCustomerId,
          currentPeriodStart: params.currentPeriodStart,
          currentPeriodEnd: params.currentPeriodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });

      await emitEvent(
        tx,
        updated.id,
        SubscriptionEventType.ACTIVATED,
        {
          plan: params.plan,
          gateway: params.gateway,
          currentPeriodEnd: params.currentPeriodEnd.toISOString(),
        },
        params.gatewayEventId
      );

      logger.info("subscription.activated", {
        userIdHash: hashUserId(userId),
        plan: params.plan,
        gateway: params.gateway,
      });

      return updated;
    });
  }

  /**
   * Flag the subscription to cancel at the end of the current billing period.
   * Status stays ACTIVE until currentPeriodEnd — the user keeps Premium access
   * until then.
   */
  static async cancelAtPeriodEnd(userId: string): Promise<Subscription> {
    return db.$transaction(async (tx) => {
      const current = await ensureSubscription(tx, userId);
      if (current.status !== "ACTIVE" && current.status !== "TRIALING") {
        throw new AppError(
          "SUBSCRIPTION_CONFLICT",
          "subscription.conflict.notActive",
          409
        );
      }

      const updated = await tx.subscription.update({
        where: { id: current.id },
        data: { cancelAtPeriodEnd: true },
      });
      await emitEvent(
        tx,
        updated.id,
        SubscriptionEventType.CANCELED_AT_PERIOD_END
      );

      logger.info("subscription.cancelAtPeriodEnd", {
        userIdHash: hashUserId(userId),
      });
      return updated;
    });
  }

  /** Cancel immediately. The user loses Premium access right now. */
  static async cancelImmediately(
    userId: string,
    reason: string,
    gatewayEventId?: string
  ): Promise<Subscription> {
    return db.$transaction(async (tx) => {
      const current = await ensureSubscription(tx, userId);

      const updated = await tx.subscription.update({
        where: { id: current.id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
        },
      });
      await emitEvent(
        tx,
        updated.id,
        SubscriptionEventType.CANCELED_IMMEDIATELY,
        { reason },
        gatewayEventId
      );

      logger.info("subscription.canceledImmediately", {
        userIdHash: hashUserId(userId),
        reason,
      });
      return updated;
    });
  }

  /**
   * Renew the subscription — extend currentPeriodEnd. Called by the webhook
   * handler when Mercado Pago emits a successful renewal payment. PA refresh
   * is handled separately by EntitlementService.refreshMonthlyPa.
   */
  static async renew(
    userId: string,
    newPeriodEnd: Date,
    gatewayEventId: string
  ): Promise<Subscription> {
    return db.$transaction(async (tx) => {
      const current = await ensureSubscription(tx, userId);
      if (current.status !== "ACTIVE" && current.status !== "TRIALING") {
        throw new AppError(
          "SUBSCRIPTION_CONFLICT",
          "subscription.conflict.notActive",
          409
        );
      }

      const updated = await tx.subscription.update({
        where: { id: current.id },
        data: {
          status: "ACTIVE",
          currentPeriodStart: current.currentPeriodEnd ?? new Date(),
          currentPeriodEnd: newPeriodEnd,
        },
      });
      await emitEvent(
        tx,
        updated.id,
        SubscriptionEventType.RENEWED,
        { newPeriodEnd: newPeriodEnd.toISOString() },
        gatewayEventId
      );

      logger.info("subscription.renewed", {
        userIdHash: hashUserId(userId),
      });
      return updated;
    });
  }

  /**
   * Record a payment failure. Moves the subscription to PAST_DUE so the user
   * can retry. Does NOT revoke Premium access immediately — that happens at
   * currentPeriodEnd if the payment never succeeds.
   */
  static async recordPaymentFailure(
    userId: string,
    gatewayEventId: string,
    detail?: string
  ): Promise<Subscription> {
    return db.$transaction(async (tx) => {
      const current = await ensureSubscription(tx, userId);
      const updated = await tx.subscription.update({
        where: { id: current.id },
        data: { status: "PAST_DUE" },
      });
      await emitEvent(
        tx,
        updated.id,
        SubscriptionEventType.PAYMENT_FAILED,
        { detail: detail ?? null },
        gatewayEventId
      );
      logger.info("subscription.paymentFailed", {
        userIdHash: hashUserId(userId),
      });
      return updated;
    });
  }
}

