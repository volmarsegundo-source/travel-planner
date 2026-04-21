/**
 * Integration-style tests for auth server actions.
 *
 * Tests cover: requestPasswordResetAction (rate limit, validation, user
 * enumeration protection) and confirmPasswordResetAction (validation,
 * success, token expired).
 *
 * All external deps (AuthService, headers, rate-limit) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const {
  mockRequestPasswordReset,
  mockConfirmPasswordReset,
  mockCheckRateLimit,
  mockHeaders,
} = vi.hoisted(() => ({
  mockRequestPasswordReset: vi.fn(),
  mockConfirmPasswordReset: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockHeaders: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("@/server/services/auth.service", () => ({
  AuthService: {
    requestPasswordReset: mockRequestPasswordReset,
    confirmPasswordReset: mockConfirmPasswordReset,
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import {
  requestPasswordResetAction,
  confirmPasswordResetAction,
} from "@/server/actions/auth.actions";
import { AppError } from "@/lib/errors";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupDefaults() {
  mockHeaders.mockResolvedValue(new Map([["x-forwarded-for", "127.0.0.1"]]));
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 2, resetAt: 0 });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("requestPasswordResetAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  it("returns success and calls service with valid email", async () => {
    mockRequestPasswordReset.mockResolvedValue(undefined);

    const result = await requestPasswordResetAction("test@example.com");

    expect(result).toEqual({ success: true });
    expect(mockRequestPasswordReset).toHaveBeenCalledWith(
      "test@example.com",
      "en"
    );
  });

  it("always returns success even when email does not exist (anti-enumeration)", async () => {
    // Service returns void for nonexistent emails
    mockRequestPasswordReset.mockResolvedValue(undefined);

    const result = await requestPasswordResetAction("nonexistent@example.com");

    expect(result).toEqual({ success: true });
  });

  it("returns rate limit error when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: 0 });

    const result = await requestPasswordResetAction("test@example.com");

    expect(result).toEqual({
      success: false,
      error: "errors.rateLimitExceeded",
    });
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it("returns email invalid error for malformed email", async () => {
    const result = await requestPasswordResetAction("not-an-email");

    expect(result).toEqual({
      success: false,
      error: "auth.errors.emailInvalid",
    });
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it("returns generic error when service throws unexpectedly", async () => {
    mockRequestPasswordReset.mockRejectedValue(new Error("Redis down"));

    const result = await requestPasswordResetAction("test@example.com");

    expect(result).toEqual({
      success: false,
      error: "errors.generic",
    });
  });

  it("uses correct rate limit key (pwd-reset:ip)", async () => {
    mockHeaders.mockResolvedValue(new Map([["x-forwarded-for", "192.168.1.1"]]));
    mockRequestPasswordReset.mockResolvedValue(undefined);

    await requestPasswordResetAction("test@example.com");

    // IP layer (first call): 5 req / 3600s, fail-closed.
    expect(mockCheckRateLimit).toHaveBeenNthCalledWith(
      1,
      "pwd-reset:ip:192.168.1.1",
      5,
      3600,
      { failClosed: true }
    );
    // Email-hash layer (second call): 3 req / 3600s, fail-closed.
    expect(mockCheckRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/^pwd-reset:email:/),
      3,
      3600,
      { failClosed: true }
    );
  });
});

describe("confirmPasswordResetAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  it("returns success when token and password are valid", async () => {
    mockConfirmPasswordReset.mockResolvedValue({ userId: "user-1" });

    const result = await confirmPasswordResetAction(
      "valid-token",
      "NewSecurePass1!"
    );

    expect(result).toEqual({ success: true });
    expect(mockConfirmPasswordReset).toHaveBeenCalledWith(
      "valid-token",
      "NewSecurePass1!"
    );
  });

  it("returns token expired error when service throws TOKEN_INVALID", async () => {
    mockConfirmPasswordReset.mockRejectedValue(
      new AppError("TOKEN_INVALID", "auth.errors.tokenExpired", 400)
    );

    const result = await confirmPasswordResetAction(
      "expired-token",
      "NewSecurePass1!"
    );

    expect(result).toEqual({
      success: false,
      error: "auth.errors.tokenExpired",
    });
  });

  it("returns validation error when token is empty", async () => {
    const result = await confirmPasswordResetAction("", "NewSecurePass1!");

    expect(result.success).toBe(false);
    expect(mockConfirmPasswordReset).not.toHaveBeenCalled();
  });

  it("returns validation error when password is too short", async () => {
    const result = await confirmPasswordResetAction("valid-token", "short");

    expect(result.success).toBe(false);
    expect(mockConfirmPasswordReset).not.toHaveBeenCalled();
  });

  it("returns generic error when service throws unexpected error", async () => {
    mockConfirmPasswordReset.mockRejectedValue(new Error("DB down"));

    const result = await confirmPasswordResetAction(
      "valid-token",
      "NewSecurePass1!"
    );

    expect(result).toEqual({
      success: false,
      error: "errors.generic",
    });
  });
});
