/**
 * Unit tests for the Mercado Pago webhook route (Sprint 43 Wave 5 — MOCK).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const hoisted = vi.hoisted(() => ({
  mockActivate: vi.fn(),
  mockRenew: vi.fn(),
  mockCancelImmediately: vi.fn(),
  mockRecordPaymentFailure: vi.fn(),
  mockRefreshMonthlyPa: vi.fn(),
  mockFindEventFirst: vi.fn(),
  mockFindSubFirst: vi.fn(),
  mockFindSubUnique: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/server/db", () => ({
  db: {
    subscriptionEvent: {
      findFirst: hoisted.mockFindEventFirst,
    },
    subscription: {
      findFirst: hoisted.mockFindSubFirst,
      findUnique: hoisted.mockFindSubUnique,
    },
  },
}));

vi.mock("@/server/services/subscription.service", () => ({
  SubscriptionService: {
    activate: hoisted.mockActivate,
    renew: hoisted.mockRenew,
    cancelImmediately: hoisted.mockCancelImmediately,
    recordPaymentFailure: hoisted.mockRecordPaymentFailure,
  },
}));

vi.mock("@/server/services/entitlement.service", () => ({
  EntitlementService: {
    refreshMonthlyPa: hoisted.mockRefreshMonthlyPa,
  },
}));

import { POST } from "@/app/api/webhooks/mercado-pago/route";

const SECRET = "test_mp_secret";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MP_WEBHOOK_SECRET = SECRET;
  hoisted.mockFindEventFirst.mockResolvedValue(null);
  hoisted.mockFindSubFirst.mockResolvedValue({ userId: "user_1" });
  hoisted.mockFindSubUnique.mockResolvedValue(null);
  hoisted.mockActivate.mockResolvedValue({});
  hoisted.mockRenew.mockResolvedValue({});
  hoisted.mockCancelImmediately.mockResolvedValue({});
  hoisted.mockRecordPaymentFailure.mockResolvedValue({});
  hoisted.mockRefreshMonthlyPa.mockResolvedValue(null);
});

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/webhooks/mercado-pago", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/mercado-pago", () => {
  it("rejects missing secret header with 401", async () => {
    const res = await POST(makeReq({ type: "payment.approved", id: "evt_1" }));
    expect(res.status).toBe(401);
  });

  it("rejects invalid secret header with 401", async () => {
    const res = await POST(
      makeReq(
        { type: "payment.approved", id: "evt_1" },
        { "x-mp-secret": "wrong" }
      )
    );
    expect(res.status).toBe(401);
  });

  it("rejects missing event fields with 400", async () => {
    const res = await POST(makeReq({}, { "x-mp-secret": SECRET }));
    expect(res.status).toBe(400);
  });

  it("returns idempotent:true when gatewayEventId already processed", async () => {
    hoisted.mockFindEventFirst.mockResolvedValue({ id: "already" });
    const res = await POST(
      makeReq(
        { type: "payment.approved", id: "evt_dup" },
        { "x-mp-secret": SECRET }
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.idempotent).toBe(true);
    expect(hoisted.mockActivate).not.toHaveBeenCalled();
  });

  it("payment.approved activates subscription and refreshes PA", async () => {
    const res = await POST(
      makeReq(
        {
          type: "payment.approved",
          id: "evt_ok",
          data: {
            userId: "user_1",
            gatewaySubscriptionId: "mp_sub_1",
            plan: "PREMIUM_MONTHLY",
            currentPeriodStart: "2026-04-01T00:00:00.000Z",
            currentPeriodEnd: "2026-05-01T00:00:00.000Z",
          },
        },
        { "x-mp-secret": SECRET }
      )
    );
    expect(res.status).toBe(200);
    expect(hoisted.mockActivate).toHaveBeenCalledTimes(1);
    expect(hoisted.mockRefreshMonthlyPa).toHaveBeenCalledWith("user_1");
  });

  it("payment.approved renews if user is already ACTIVE on same gatewaySubscriptionId", async () => {
    hoisted.mockFindSubUnique.mockResolvedValue({
      status: "ACTIVE",
      gatewaySubscriptionId: "mp_sub_1",
    });
    const res = await POST(
      makeReq(
        {
          type: "payment.approved",
          id: "evt_renew",
          data: {
            userId: "user_1",
            gatewaySubscriptionId: "mp_sub_1",
            plan: "PREMIUM_MONTHLY",
            currentPeriodEnd: "2026-06-01T00:00:00.000Z",
          },
        },
        { "x-mp-secret": SECRET }
      )
    );
    expect(res.status).toBe(200);
    expect(hoisted.mockRenew).toHaveBeenCalledTimes(1);
    expect(hoisted.mockActivate).not.toHaveBeenCalled();
  });

  it("payment.cancelled calls cancelImmediately", async () => {
    const res = await POST(
      makeReq(
        {
          type: "payment.cancelled",
          id: "evt_cancel",
          data: { userId: "user_1", gatewaySubscriptionId: "mp_sub_1" },
        },
        { "x-mp-secret": SECRET }
      )
    );
    expect(res.status).toBe(200);
    expect(hoisted.mockCancelImmediately).toHaveBeenCalledTimes(1);
  });

  it("payment.failed calls recordPaymentFailure", async () => {
    const res = await POST(
      makeReq(
        {
          type: "payment.failed",
          id: "evt_fail",
          data: { userId: "user_1" },
        },
        { "x-mp-secret": SECRET }
      )
    );
    expect(res.status).toBe(200);
    expect(hoisted.mockRecordPaymentFailure).toHaveBeenCalledTimes(1);
  });

  it("returns 200 with ignored:unhandled_type for unknown event", async () => {
    const res = await POST(
      makeReq(
        {
          type: "totally.unknown",
          id: "evt_unknown",
          data: { userId: "user_1" },
        },
        { "x-mp-secret": SECRET }
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ignored).toBe("unhandled_type");
  });
});
