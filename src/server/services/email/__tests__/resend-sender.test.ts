import { describe, it, expect, vi, beforeEach } from "vitest";

// SPEC-AUTH-FORGOTPW-001 — ResendEmailSender calls Resend HTTP API via fetch.

const { mockLoggerError, mockLoggerInfo } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
  mockLoggerInfo: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: mockLoggerInfo, error: mockLoggerError, warn: vi.fn() },
}));

vi.mock("server-only", () => ({}));

import { ResendEmailSender } from "../resend-sender";

describe("ResendEmailSender — SPEC-AUTH-FORGOTPW-001", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("POSTs to https://api.resend.com/emails with the API key and subject/body", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ id: "msg_123" }), { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const sender = new ResendEmailSender({
      apiKey: "re_test_key",
      from: "Atlas <noreply@atlas.app>",
    });

    await sender.sendPasswordReset({
      to: "alice@example.com",
      resetUrl: "https://atlas.app/auth/reset-password?token=abc123",
      locale: "en",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer re_test_key");
    expect(headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init?.body as string);
    expect(body.from).toBe("Atlas <noreply@atlas.app>");
    expect(body.to).toEqual(["alice@example.com"]);
    expect(body.subject).toMatch(/password/i);
    expect(body.text).toContain("https://atlas.app/auth/reset-password?token=abc123");
    expect(body.html).toContain("https://atlas.app/auth/reset-password?token=abc123");
  });

  it("localizes the subject and body when locale=pt-BR", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ id: "msg_456" }), { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const sender = new ResendEmailSender({
      apiKey: "re_test_key",
      from: "Atlas <noreply@atlas.app>",
    });

    await sender.sendPasswordReset({
      to: "bob@example.com",
      resetUrl: "https://atlas.app/auth/reset-password?token=xyz",
      locale: "pt-BR",
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init?.body as string);
    expect(body.subject).toMatch(/senha|recupera/i);
  });

  it("logs error but does NOT throw when Resend returns 5xx (anti-enumeration)", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Internal" }), { status: 502 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const sender = new ResendEmailSender({
      apiKey: "re_test_key",
      from: "Atlas <noreply@atlas.app>",
    });

    await expect(
      sender.sendPasswordReset({
        to: "alice@example.com",
        resetUrl: "https://atlas.app/auth/reset-password?token=abc",
        locale: "en",
      })
    ).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      "auth.email.sendFailed",
      expect.objectContaining({ status: 502 })
    );
  });

  it("logs error but does NOT throw when fetch itself rejects", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const sender = new ResendEmailSender({
      apiKey: "re_test_key",
      from: "Atlas <noreply@atlas.app>",
    });

    await expect(
      sender.sendPasswordReset({
        to: "alice@example.com",
        resetUrl: "https://atlas.app/auth/reset-password?token=abc",
        locale: "en",
      })
    ).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      "auth.email.sendFailed",
      expect.any(Object)
    );
  });
});
