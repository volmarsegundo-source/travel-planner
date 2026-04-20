/**
 * SPEC-TEST-FORGOTPW-RATE-LIMIT-001
 *
 * Smoke test for the dual-layer rate limit in requestPasswordResetAction:
 *   Layer 1 — 5 requests / hour per IP        (SPEC-AUTH-FORGOTPW-003)
 *   Layer 2 — 3 requests / hour per email     (keyed by SHA-256 of normalized email)
 *
 * Context: PO reported on 2026-04-20 that manual Test 11a (IP layer) did NOT
 * block the 6th attempt on Staging. This smoke test validates the SERVER
 * ACTION logic against a deterministic in-memory Redis stub that simulates
 * the Lua INCR+EXPIRE atomically. It therefore exercises every line of
 * `requestPasswordResetAction` except the Redis round-trip itself.
 *
 * What this test proves:
 *   - The action's logic tracks IP and email counters correctly.
 *   - The anti-enumeration branch returns success=true when the email layer
 *     triggers.
 *   - Distinct windows behave independently (Cenário 4).
 *   - A diagnostic probe demonstrates whether the RAW x-forwarded-for string
 *     creates distinct rate-limit keys when the Vercel edge rotates proxy IPs
 *     in the header suffix — the leading hypothesis for the PO's Test 11a bug.
 *
 * What this test does NOT prove:
 *   - Real Redis behavior in Staging (network, cluster failover, TTL drift).
 *   - Vercel header propagation — must be validated with a true HTTP smoke
 *     against travel-planner-eight-navy.vercel.app (Phase 2 of this SPEC).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted state shared between mocks ──────────────────────────────────────

type RedisEntry = { count: number; expiresAt: number };

const hoisted = vi.hoisted(() => {
  const store = new Map<string, RedisEntry>();
  const clock = { now: 1_700_000_000_000 }; // frozen baseline

  const mockEval = vi.fn(
    async (
      _script: string,
      _numKeys: number,
      key: string,
      ttlArg: string | number
    ) => {
      const ttlSeconds =
        typeof ttlArg === "string" ? parseInt(ttlArg, 10) : ttlArg;
      const entry = store.get(key);
      if (!entry || entry.expiresAt <= clock.now) {
        store.set(key, {
          count: 1,
          expiresAt: clock.now + ttlSeconds * 1000,
        });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    }
  );

  const headerBag = new Map<string, string>();
  const mockHeadersGet = vi.fn((name: string) =>
    headerBag.get(name.toLowerCase()) ?? null
  );

  return { store, clock, mockEval, headerBag, mockHeadersGet };
});

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: hoisted.mockHeadersGet }),
}));

vi.mock("@/server/cache/redis", () => ({
  redis: { eval: hoisted.mockEval },
}));

// Keep the action's Date.now() in sync with the simulated clock so TTLs and
// bucket keys match. Restored implicitly by vi.restoreAllMocks() in beforeEach.
vi.spyOn(Date, "now").mockImplementation(() => hoisted.clock.now);

// Silence the downstream mailer + DB — focus is the rate-limit logic.
const mockAuthService = vi.hoisted(() => ({
  requestPasswordReset: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/server/services/auth.service", () => ({
  AuthService: mockAuthService,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Import SUT after mocks are registered ───────────────────────────────────

import { requestPasswordResetAction } from "@/server/actions/auth.actions";

// ─── Test helpers ────────────────────────────────────────────────────────────

function setXff(xff: string) {
  hoisted.headerBag.set("x-forwarded-for", xff);
}

function setAcceptLanguage(lang: string) {
  hoisted.headerBag.set("accept-language", lang);
}

function advanceTimeSeconds(seconds: number) {
  hoisted.clock.now += seconds * 1000;
}

function resetRateLimitState() {
  hoisted.store.clear();
  hoisted.headerBag.clear();
  hoisted.mockEval.mockClear();
  mockAuthService.requestPasswordReset.mockClear();
  hoisted.clock.now = 1_700_000_000_000;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SPEC-TEST-FORGOTPW-RATE-LIMIT-001 — forgot-password dual-layer rate limit", () => {
  beforeEach(() => {
    resetRateLimitState();
    setAcceptLanguage("pt-BR");
  });

  // Cenário 1 ───────────────────────────────────────────────────────────────
  it("Cenário 1 — IP layer blocks the 6th request from the same IP", async () => {
    setXff("1.2.3.4");
    const emails = [
      "a1@example.com",
      "b2@example.com",
      "c3@example.com",
      "d4@example.com",
      "e5@example.com",
    ];

    // 5 requests from distinct emails — all should succeed.
    for (const email of emails) {
      const r = await requestPasswordResetAction(email);
      expect(r.success, `expected ${email} to succeed`).toBe(true);
    }

    // 6th request — same IP, a fresh email — MUST be blocked by IP layer.
    const blocked = await requestPasswordResetAction("f6@example.com");
    expect(blocked).toEqual({
      success: false,
      error: "errors.rateLimitExceeded",
    });

    // Sanity: exactly 6 Redis eval calls for the IP key (one per request),
    // plus up to 5 more for the email key (each distinct email opens its own
    // window, and the 6th never reached the email check because the IP layer
    // short-circuited).
    const ipKeyCalls = hoisted.mockEval.mock.calls.filter(([, , key]) =>
      String(key).includes("pwd-reset:ip:")
    );
    expect(ipKeyCalls).toHaveLength(6);
  });

  // Cenário 2 ───────────────────────────────────────────────────────────────
  it("Cenário 2 — email layer caps the 4th request to the same email (anti-enum: returns success=true)", async () => {
    const email = "target@example.com";

    // 3 requests for the same email from distinct IPs → all succeed AND
    // the downstream mailer is invoked.
    for (const ip of ["10.0.0.1", "10.0.0.2", "10.0.0.3"]) {
      setXff(ip);
      const r = await requestPasswordResetAction(email);
      expect(r).toEqual({ success: true });
    }
    expect(mockAuthService.requestPasswordReset).toHaveBeenCalledTimes(3);

    // 4th request from a 4th IP → email layer trips, response is SUCCESS
    // (anti-enumeration) but the mailer MUST NOT be called again.
    setXff("10.0.0.4");
    const blocked = await requestPasswordResetAction(email);
    expect(blocked).toEqual({ success: true });
    expect(mockAuthService.requestPasswordReset).toHaveBeenCalledTimes(3);
  });

  // Cenário 3 ───────────────────────────────────────────────────────────────
  it("Cenário 3 — the two layers are independent", async () => {
    // Fill IP layer on 1.1.1.1 with 5 distinct emails.
    setXff("1.1.1.1");
    for (const i of [1, 2, 3, 4, 5]) {
      const r = await requestPasswordResetAction(`fill${i}@example.com`);
      expect(r.success).toBe(true);
    }

    // Same IP, never-used email → blocked by IP layer (not email layer).
    const fromBlockedIp = await requestPasswordResetAction(
      "brand-new@example.com"
    );
    expect(fromBlockedIp).toEqual({
      success: false,
      error: "errors.rateLimitExceeded",
    });

    // Fresh IP + fresh email → passes (both counters start at 1).
    setXff("2.2.2.2");
    const fromFreshIp = await requestPasswordResetAction(
      "untouched@example.com"
    );
    expect(fromFreshIp).toEqual({ success: true });
  });

  // Cenário 4 ───────────────────────────────────────────────────────────────
  it("Cenário 4 — the tumbling window resets after the TTL elapses", async () => {
    setXff("3.3.3.3");

    // Saturate the IP bucket.
    for (const i of [1, 2, 3, 4, 5]) {
      await requestPasswordResetAction(`seed${i}@example.com`);
    }
    const sixthInSameWindow = await requestPasswordResetAction(
      "sixth@example.com"
    );
    expect(sixthInSameWindow.success).toBe(false);

    // Advance past the 3600-second window so Math.floor(now/window) moves to
    // the next bucket. The stub evicts the expired entry on the next INCR.
    advanceTimeSeconds(3601);

    const afterReset = await requestPasswordResetAction(
      "seventh@example.com"
    );
    expect(afterReset.success).toBe(true);
  });

  // DIAGNÓSTICO — IP parsing hypothesis for the PO's Test 11a failure ───────
  it("DIAGNÓSTICO — rotating x-forwarded-for tail BYPASSES the IP layer under the current raw-header implementation", async () => {
    // On Vercel, x-forwarded-for is of the form
    //    "<real_client_ip>, <vercel_edge_ip>"
    // where the edge IP can change per request. The action reads the RAW
    // header string as the rate-limit key, so the same client can reach the
    // origin with distinct XFF strings and get counted under distinct buckets.
    //
    // If this expectation FAILS (i.e. the 6th gets blocked), the code has
    // been hardened to parse the first IP — in that case, update the
    // diagnostic note in docs/qa/forgotpw-rate-limit-smoke-2026-04-20.md.
    const clientIp = "200.150.100.50";
    const edgeRotation = ["76.76.21.9", "76.76.21.10", "76.76.21.11", "76.76.21.12", "76.76.21.13", "76.76.21.14"];

    let successes = 0;
    for (let i = 0; i < 6; i++) {
      setXff(`${clientIp}, ${edgeRotation[i]}`);
      const r = await requestPasswordResetAction(`probe${i}@example.com`);
      if (r.success) successes += 1;
    }

    // Current behavior: all 6 succeed → bug reproduced.
    expect(successes).toBe(6);

    // Corroborate: 6 distinct IP-layer Redis keys were created (one per XFF).
    const ipKeys = new Set(
      hoisted.mockEval.mock.calls
        .map(([, , key]) => String(key))
        .filter((k) => k.includes("pwd-reset:ip:"))
    );
    expect(ipKeys.size).toBe(6);
  });
});
