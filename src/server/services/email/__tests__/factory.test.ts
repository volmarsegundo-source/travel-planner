import { describe, it, expect, afterEach, vi } from "vitest";

// SPEC-AUTH-FORGOTPW-001 — factory picks the correct sender based on env.

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("getEmailSender — SPEC-AUTH-FORGOTPW-001", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns ConsoleEmailSender in development when RESEND_API_KEY is absent", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");

    const { getEmailSender } = await import("../factory");
    const { ConsoleEmailSender } = await import("../console-sender");
    const sender = getEmailSender();
    expect(sender).toBeInstanceOf(ConsoleEmailSender);
  });

  it("returns ResendEmailSender when RESEND_API_KEY and EMAIL_FROM are set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Atlas <noreply@atlas.app>");

    const { getEmailSender } = await import("../factory");
    const { ResendEmailSender } = await import("../resend-sender");
    const sender = getEmailSender();
    expect(sender).toBeInstanceOf(ResendEmailSender);
  });

  it("throws in production when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");

    const { getEmailSender } = await import("../factory");
    expect(() => getEmailSender()).toThrow(/email/i);
  });
});
