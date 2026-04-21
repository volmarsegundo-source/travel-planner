import { describe, it, expect, vi, beforeEach } from "vitest";

// SPEC-AUTH-FORGOTPW-001 — AuthService.requestPasswordReset must dispatch the
// reset link through the EmailSender abstraction.

const {
  mockFindUnique,
  mockRedisSet,
  mockSendPasswordReset,
  mockLoggerInfo,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockRedisSet: vi.fn(),
  mockSendPasswordReset: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: {
    user: { findUnique: mockFindUnique, update: vi.fn() },
    userProfile: { create: vi.fn() },
  },
}));

vi.mock("@/server/cache/redis", () => ({
  redis: {
    set: mockRedisSet,
    get: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: mockLoggerInfo, error: mockLoggerError, warn: vi.fn() },
}));

vi.mock("@/lib/hash", () => ({ hashUserId: (id: string) => `hash_${id}` }));

vi.mock("@paralleldrive/cuid2", () => ({ createId: () => "test_token_abc" }));

vi.mock("@/server/services/email/factory", () => ({
  getEmailSender: () => ({ sendPasswordReset: mockSendPasswordReset }),
}));

vi.stubEnv("AUTH_URL", "https://atlas.app");

import { AuthService } from "../auth.service";

describe("AuthService.requestPasswordReset — SPEC-AUTH-FORGOTPW-001", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisSet.mockResolvedValue("OK");
    mockSendPasswordReset.mockResolvedValue(undefined);
  });

  it("sends the reset email via the active sender when user is found", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "user_1" });

    await AuthService.requestPasswordReset("alice@example.com", "en");

    expect(mockRedisSet).toHaveBeenCalledWith(
      "cache:pwd-reset:test_token_abc",
      "user_1",
      "EX",
      3600
    );
    expect(mockSendPasswordReset).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordReset).toHaveBeenCalledWith({
      to: "alice@example.com",
      resetUrl: "https://atlas.app/auth/reset-password?token=test_token_abc",
      locale: "en",
    });
  });

  it("does NOT send an email when the user is not found (anti-enumeration)", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await AuthService.requestPasswordReset("ghost@example.com", "en");

    expect(mockRedisSet).not.toHaveBeenCalled();
    expect(mockSendPasswordReset).not.toHaveBeenCalled();
  });

  it("forwards pt-BR locale to the sender", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "user_2" });

    await AuthService.requestPasswordReset("bob@example.com", "pt-BR");

    expect(mockSendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "pt-BR" })
    );
  });

  it("still resolves successfully when the sender throws (anti-enumeration)", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "user_3" });
    mockSendPasswordReset.mockRejectedValueOnce(new Error("smtp down"));

    await expect(
      AuthService.requestPasswordReset("alice@example.com", "en")
    ).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      "auth.passwordReset.emailDispatchFailed",
      expect.any(Object)
    );
  });
});

// ─── SPEC-SEC-AUTH-TIMING-001 ────────────────────────────────────────────────
// Anti-enumeration: the "user exists" and "user not found" paths must return
// with indistinguishable latency. We exercise both paths under fake timers,
// then assert the min-duration floor was honored.

describe("AuthService.requestPasswordReset — constant-time (SPEC-SEC-AUTH-TIMING-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisSet.mockResolvedValue("OK");
    mockSendPasswordReset.mockResolvedValue(undefined);
  });

  /**
   * Helper: run the service to completion under fake timers. `runAllTimersAsync`
   * flushes pending setTimeouts (including the padding setTimeout scheduled
   * after the DB work), then chains into any new timers scheduled during the
   * flush, so both the simulated downstream work AND the pad are consumed.
   */
  async function runServiceToCompletion(work: Promise<void>): Promise<void> {
    await vi.runAllTimersAsync();
    await work;
  }

  it("pads the 'email not found' path to at least ~400ms floor", async () => {
    vi.useFakeTimers();
    try {
      mockFindUnique.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 20));
        return null;
      });

      const start = Date.now();
      await runServiceToCompletion(
        AuthService.requestPasswordReset("ghost@example.com", "en")
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(400);
      expect(mockSendPasswordReset).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("pads the 'email exists' path to the same floor even when downstream is fast", async () => {
    vi.useFakeTimers();
    try {
      mockFindUnique.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return { id: "user_1" };
      });
      mockRedisSet.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return "OK";
      });
      mockSendPasswordReset.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 40));
      });

      const start = Date.now();
      await runServiceToCompletion(
        AuthService.requestPasswordReset("alice@example.com", "en")
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(400);
      expect(mockSendPasswordReset).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps both paths within a ≤50ms delta from each other", async () => {
    vi.useFakeTimers();
    try {
      // Not-found path: ~20 ms of downstream work → pad fills the rest.
      mockFindUnique.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 20));
        return null;
      });
      const startNotFound = Date.now();
      await runServiceToCompletion(
        AuthService.requestPasswordReset("ghost@example.com", "en")
      );
      const elapsedNotFound = Date.now() - startNotFound;

      // Found path: ~100 ms of downstream work → pad still fills to 400 ms.
      mockFindUnique.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return { id: "user_2" };
      });
      mockRedisSet.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return "OK";
      });
      mockSendPasswordReset.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 40));
      });
      const startFound = Date.now();
      await runServiceToCompletion(
        AuthService.requestPasswordReset("alice@example.com", "en")
      );
      const elapsedFound = Date.now() - startFound;

      const delta = Math.abs(elapsedFound - elapsedNotFound);
      expect(delta).toBeLessThanOrEqual(50);
    } finally {
      vi.useRealTimers();
    }
  });

  it("still honors the floor when the sender throws", async () => {
    vi.useFakeTimers();
    try {
      mockFindUnique.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 30));
        return { id: "user_3" };
      });
      mockSendPasswordReset.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 20));
        throw new Error("smtp down");
      });

      const start = Date.now();
      await runServiceToCompletion(
        AuthService.requestPasswordReset("alice@example.com", "en")
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(400);
      expect(mockLoggerError).toHaveBeenCalledWith(
        "auth.passwordReset.emailDispatchFailed",
        expect.any(Object)
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
