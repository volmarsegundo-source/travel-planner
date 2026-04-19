import { describe, it, expect, vi, beforeEach } from "vitest";

// SPEC-AUTH-FORGOTPW-001 — ConsoleEmailSender logs the reset URL at info level.
// Used as the default fallback in dev/test when no real provider is configured.

const { mockLoggerInfo } = vi.hoisted(() => ({
  mockLoggerInfo: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: mockLoggerInfo, error: vi.fn(), warn: vi.fn() },
}));

vi.mock("server-only", () => ({}));

import { ConsoleEmailSender } from "../console-sender";

describe("ConsoleEmailSender — SPEC-AUTH-FORGOTPW-001", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs an info event tagged auth.email.passwordReset.consoleFallback with the full URL", async () => {
    const sender = new ConsoleEmailSender();
    await sender.sendPasswordReset({
      to: "alice@example.com",
      resetUrl: "https://atlas.app/auth/reset-password?token=abc123",
      locale: "en",
    });

    expect(mockLoggerInfo).toHaveBeenCalledTimes(1);
    const [event, payload] = mockLoggerInfo.mock.calls[0]!;
    expect(event).toBe("auth.email.passwordReset.consoleFallback");
    expect(payload).toMatchObject({
      to: "alice@example.com",
      resetUrl: "https://atlas.app/auth/reset-password?token=abc123",
      locale: "en",
    });
  });

  it("never throws", async () => {
    const sender = new ConsoleEmailSender();
    await expect(
      sender.sendPasswordReset({
        to: "x@y.z",
        resetUrl: "https://x/reset?token=t",
        locale: "pt-BR",
      })
    ).resolves.toBeUndefined();
  });
});
