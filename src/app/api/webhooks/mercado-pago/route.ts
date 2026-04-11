import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { SubscriptionService } from "@/server/services/subscription.service";
import { EntitlementService } from "@/server/services/entitlement.service";

// ─── Mercado Pago webhook handler (Sprint 43 Wave 5 — MOCK) ────────────────
//
// This is a stub endpoint. In production we will verify an HMAC signature
// per SPEC-ARCH-MULTIDESTINOS §7.5; for Wave 5 we use a simple shared
// secret header (X-MP-Secret) so devs can exercise the flow locally.
//
// Idempotency is enforced two ways:
//   1. Fast path: check SubscriptionEvent.gatewayEventId before processing.
//   2. Strong path: the unique index on gatewayEventId will reject any
//      double-insert inside SubscriptionService mutations.

interface MpWebhookBody {
  type?: string;
  action?: string;
  id?: string;
  data?: {
    id?: string;
    userId?: string;
    gatewaySubscriptionId?: string;
    plan?: "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL";
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    detail?: string;
  };
}

function bad(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request: NextRequest) {
  // ─── 1. Validate shared secret ──────────────────────────────────────────
  const expected = process.env.MP_WEBHOOK_SECRET;
  const provided = request.headers.get("x-mp-secret");
  if (!expected || !provided || provided !== expected) {
    logger.info("mp.webhook.unauthorized");
    return bad(401, "unauthorized");
  }

  // ─── 2. Parse body ──────────────────────────────────────────────────────
  let body: MpWebhookBody;
  try {
    body = (await request.json()) as MpWebhookBody;
  } catch {
    return bad(400, "invalid_json");
  }

  if (!body || typeof body !== "object") {
    return bad(400, "invalid_body");
  }

  const eventType = body.type ?? body.action;
  const gatewayEventId = body.id ?? body.data?.id;

  if (!eventType || !gatewayEventId) {
    return bad(400, "missing_event_fields");
  }

  // ─── 3. Idempotency check (fast path) ──────────────────────────────────
  const existing = await db.subscriptionEvent.findFirst({
    where: { gatewayEventId },
    select: { id: true },
  });
  if (existing) {
    logger.info("mp.webhook.idempotent", { gatewayEventId, eventType });
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // ─── 4. Resolve userId ─────────────────────────────────────────────────
  // In production the subscription is looked up via gatewaySubscriptionId.
  // For Wave 5 we accept either an explicit userId in the payload or look
  // up by gatewaySubscriptionId column.
  let userId = body.data?.userId;
  if (!userId && body.data?.gatewaySubscriptionId) {
    const sub = await db.subscription.findFirst({
      where: { gatewaySubscriptionId: body.data.gatewaySubscriptionId },
      select: { userId: true },
    });
    userId = sub?.userId;
  }

  if (!userId) {
    // Unknown subscription; return 200 so MP doesn't retry forever.
    logger.info("mp.webhook.unknownSubscription", { gatewayEventId, eventType });
    return NextResponse.json({ ok: true, ignored: "unknown_subscription" });
  }

  // ─── 5. Dispatch ───────────────────────────────────────────────────────
  try {
    switch (eventType) {
      case "payment.approved":
      case "payment.created": {
        const plan = body.data?.plan ?? "PREMIUM_MONTHLY";
        const periodStart = body.data?.currentPeriodStart
          ? new Date(body.data.currentPeriodStart)
          : new Date();
        const periodEnd = body.data?.currentPeriodEnd
          ? new Date(body.data.currentPeriodEnd)
          : new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

        // If the subscription is already ACTIVE on the same gateway id,
        // this is a renewal; otherwise activate.
        const existingSub = await db.subscription.findUnique({
          where: { userId },
        });

        if (
          existingSub?.status === "ACTIVE" &&
          existingSub.gatewaySubscriptionId === body.data?.gatewaySubscriptionId
        ) {
          await SubscriptionService.renew(userId, periodEnd, gatewayEventId);
        } else {
          await SubscriptionService.activate(userId, {
            plan,
            gateway: "MERCADO_PAGO",
            gatewaySubscriptionId: body.data?.gatewaySubscriptionId ?? gatewayEventId,
            gatewayCustomerId: undefined,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            gatewayEventId,
          });
        }
        // Refresh monthly PA bucket.
        await EntitlementService.refreshMonthlyPa(userId);
        break;
      }

      case "payment.cancelled":
      case "subscription.cancelled": {
        await SubscriptionService.cancelImmediately(
          userId,
          body.data?.detail ?? "gateway_cancelled",
          gatewayEventId
        );
        break;
      }

      case "payment.failed": {
        await SubscriptionService.recordPaymentFailure(
          userId,
          gatewayEventId,
          body.data?.detail
        );
        break;
      }

      default: {
        // Unknown type — log and succeed so MP stops retrying.
        logger.info("mp.webhook.unhandledType", { eventType, gatewayEventId });
        return NextResponse.json({ ok: true, ignored: "unhandled_type" });
      }
    }

    logger.info("mp.webhook.processed", { eventType, gatewayEventId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError && err.code === "SUBSCRIPTION_CONFLICT") {
      // Known transitional conflict — still return 200 so MP does not retry.
      logger.info("mp.webhook.conflict", { eventType, gatewayEventId });
      return NextResponse.json({ ok: true, conflict: true });
    }
    logger.error("mp.webhook.error", err, { eventType, gatewayEventId });
    return bad(500, "internal_error");
  }
}
