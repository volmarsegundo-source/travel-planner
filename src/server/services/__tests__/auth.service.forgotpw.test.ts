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
