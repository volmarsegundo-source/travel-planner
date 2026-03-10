/**
 * Unit tests for POST /api/ai/plan/stream (T-S18-007).
 *
 * Tests auth, validation, rate limiting, BOLA check, age guard,
 * and successful streaming response.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  checkRateLimit: vi.fn(),
  tripFindFirst: vi.fn(),
  userProfileFindUnique: vi.fn(),
  generateStreamingResponse: vi.fn(),
}));

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/server/db", () => ({
  db: {
    trip: { findFirst: mocks.tripFindFirst },
    userProfile: { findUnique: mocks.userProfileFindUnique },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/cost-calculator", () => ({
  calculateEstimatedCost: vi.fn().mockReturnValue({ totalCost: 0.001 }),
}));

vi.mock("@/server/services/providers/claude.provider", () => {
  function MockClaudeProvider() {
    return {
      name: "claude",
      generateStreamingResponse: mocks.generateStreamingResponse,
    };
  }
  return { ClaudeProvider: MockClaudeProvider };
});

vi.mock("@/lib/prompts/injection-guard", () => ({
  sanitizeForPrompt: vi.fn((text: string) => text),
}));

vi.mock("@/lib/prompts/pii-masker", () => ({
  maskPII: vi.fn((text: string) => ({ masked: text, hasPII: false, detectedTypes: [] })),
}));

vi.mock("@/lib/prompts", () => ({
  travelPlanPrompt: {
    buildUserPrompt: vi.fn().mockReturnValue("test prompt"),
    model: "plan",
    system: "You are a planner",
  },
  PLAN_SYSTEM_PROMPT: "You are a planner",
}));

vi.mock("@/lib/guards/age-guard", () => ({
  canUseAI: vi.fn().mockReturnValue(true),
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { POST } from "@/app/api/ai/plan/stream/route";
import { canUseAI } from "@/lib/guards/age-guard";

const mockCanUseAI = canUseAI as ReturnType<typeof vi.fn>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validBody = {
  tripId: "trip-123",
  params: {
    destination: "Paris, France",
    startDate: "2026-06-01",
    endDate: "2026-06-05",
    travelStyle: "CULTURE",
    budgetTotal: 3000,
    budgetCurrency: "EUR",
    travelers: 2,
    language: "en" as const,
  },
};

function createRequest(body: unknown = validBody): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/ai/plan/stream"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createMockStream(chunks: string[]) {
  const stream = new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  return {
    stream,
    usage: Promise.resolve({
      text: chunks.join(""),
      wasTruncated: false,
      inputTokens: 100,
      outputTokens: 50,
    }),
  };
}

async function readSSEResponse(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/ai/plan/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: 0 });
    mocks.tripFindFirst.mockResolvedValue({ id: "trip-123" });
    mocks.userProfileFindUnique.mockResolvedValue({ birthDate: new Date("1990-01-01") });
    mockCanUseAI.mockReturnValue(true);
  });

  it("returns 401 when not authenticated", async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await POST(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/ai/plan/stream"), {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when params fail validation", async () => {
    const res = await POST(createRequest({ tripId: "trip-1", params: { destination: "" } }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: 0 });

    const res = await POST(createRequest());
    expect(res.status).toBe(429);
  });

  it("returns 404 when trip does not belong to user (BOLA)", async () => {
    mocks.tripFindFirst.mockResolvedValue(null);

    const res = await POST(createRequest());
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is under 18", async () => {
    mockCanUseAI.mockReturnValue(false);

    const res = await POST(createRequest());
    expect(res.status).toBe(403);
  });

  it("returns SSE stream with text chunks on success", async () => {
    mocks.generateStreamingResponse.mockResolvedValue(
      createMockStream(["Hello", " world"]),
    );

    const res = await POST(createRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");

    const sseText = await readSSEResponse(res);
    expect(sseText).toContain("data: Hello\n\n");
    expect(sseText).toContain("data:  world\n\n");
    expect(sseText).toContain("data: [DONE]\n\n");
  });

  it("calls rate limit with correct key", async () => {
    mocks.generateStreamingResponse.mockResolvedValue(
      createMockStream(["ok"]),
    );

    await POST(createRequest());

    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      "ai:plan:stream:user-1",
      10,
      3600,
    );
  });

  it("checks trip ownership with correct userId", async () => {
    mocks.generateStreamingResponse.mockResolvedValue(
      createMockStream(["ok"]),
    );

    await POST(createRequest());

    expect(mocks.tripFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          deletedAt: null,
        }),
      }),
    );
  });
});
