/**
 * Unit tests for the NextAuth route handler rate limiting (A7).
 *
 * Verifies: login attempts 1-5 pass, 6th is blocked with 429,
 * per-IP isolation, and correct limit/window parameters.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockCheckRateLimit, mockHeaders, mockNextAuthPOST, mockLoggerWarn } =
  vi.hoisted(() => ({
    mockCheckRateLimit: vi.fn(),
    mockHeaders: vi.fn(),
    mockNextAuthPOST: vi.fn(),
    mockLoggerWarn: vi.fn(),
  }));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("@/lib/auth", () => ({
  handlers: {
    GET: vi.fn(),
    POST: mockNextAuthPOST,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: mockLoggerWarn, info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: (v: string) => `hashed:${v}`,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from "@/app/api/auth/[...nextauth]/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOGIN_RATE_LIMIT = 5;
const LOGIN_WINDOW_SECONDS = 900;

function createRequest(path: string): Request & { nextUrl: URL } {
  const url = new URL(path, "http://localhost:3000");
  const req = new Request(url, { method: "POST" }) as Request & {
    nextUrl: URL;
  };
  req.nextUrl = url;
  return req;
}

function setupHeaders(ip: string) {
  mockHeaders.mockResolvedValue({
    get: (key: string) => {
      if (key === "x-forwarded-for") return ip;
      if (key === "x-real-ip") return ip;
      return null;
    },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/auth/[...nextauth] — rate limiting (A7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNextAuthPOST.mockResolvedValue(new Response("ok", { status: 200 }));
  });

  it("allows the 1st attempt through", async () => {
    setupHeaders("10.0.0.1");
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 900_000,
    });

    const req = createRequest(
      "http://localhost:3000/api/auth/callback/credentials"
    );
    const response = await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "login:10.0.0.1",
      LOGIN_RATE_LIMIT,
      LOGIN_WINDOW_SECONDS,
      { failClosed: true }
    );
    expect(response.status).toBe(200);
  });

  it("allows the 5th attempt through (remaining=0)", async () => {
    setupHeaders("10.0.0.2");
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 0,
      resetAt: Date.now() + 900_000,
    });

    const req = createRequest(
      "http://localhost:3000/api/auth/callback/credentials"
    );
    const response = await POST(req);

    expect(response.status).toBe(200);
  });

  it("blocks the 6th attempt with 429", async () => {
    setupHeaders("10.0.0.3");
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 900_000,
    });

    const req = createRequest(
      "http://localhost:3000/api/auth/callback/credentials"
    );
    const response = await POST(req);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe("errors.rateLimitExceeded");
  });

  it("rate limits per IP, not globally", async () => {
    // IP-A: allowed
    setupHeaders("1.1.1.1");
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 900_000,
    });

    const reqA = createRequest(
      "http://localhost:3000/api/auth/callback/credentials"
    );
    await POST(reqA);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "login:1.1.1.1",
      LOGIN_RATE_LIMIT,
      LOGIN_WINDOW_SECONDS,
      { failClosed: true }
    );

    // IP-B: also allowed with its own counter
    setupHeaders("2.2.2.2");
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 900_000,
    });

    const reqB = createRequest(
      "http://localhost:3000/api/auth/callback/credentials"
    );
    await POST(reqB);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "login:2.2.2.2",
      LOGIN_RATE_LIMIT,
      LOGIN_WINDOW_SECONDS,
      { failClosed: true }
    );
  });

  it("passes the limit as 5 and window as 900 seconds", async () => {
    setupHeaders("10.0.0.5");
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 900_000,
    });

    const req = createRequest(
      "http://localhost:3000/api/auth/callback/credentials"
    );
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "login:10.0.0.5",
      5,
      900,
      { failClosed: true }
    );
  });

  it("does not rate-limit non-credentials requests", async () => {
    const req = createRequest(
      "http://localhost:3000/api/auth/callback/google"
    );
    const response = await POST(req);

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("uses x-forwarded-for first IP when multiple are present", async () => {
    mockHeaders.mockResolvedValue({
      get: (key: string) => {
        if (key === "x-forwarded-for") return "3.3.3.3, 4.4.4.4";
        return null;
      },
    });
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 900_000,
    });

    const req = createRequest(
      "http://localhost:3000/api/auth/callback/credentials"
    );
    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "login:3.3.3.3",
      LOGIN_RATE_LIMIT,
      LOGIN_WINDOW_SECONDS,
      { failClosed: true }
    );
  });

  it("logs a warning with hashed IP when rate limit is exceeded", async () => {
    setupHeaders("10.0.0.9");
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 900_000,
    });

    const req = createRequest(
      "http://localhost:3000/api/auth/callback/credentials"
    );
    await POST(req);

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "auth.login.rateLimitExceeded",
      expect.objectContaining({
        ipHash: "hashed:10.0.0.9",
        remaining: 0,
      })
    );
  });

  it("does not log when rate limit is not exceeded", async () => {
    setupHeaders("10.0.0.10");
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 3,
      resetAt: Date.now() + 900_000,
    });

    const req = createRequest(
      "http://localhost:3000/api/auth/callback/credentials"
    );
    await POST(req);

    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });
});
