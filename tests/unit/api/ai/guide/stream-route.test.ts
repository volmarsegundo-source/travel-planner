/**
 * Unit tests for POST /api/ai/guide/stream (Sprint 42).
 *
 * Tests auth, validation, and the happy-path streaming flow with mocked
 * provider, persistence, and points engine.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  checkRateLimit: vi.fn(),
  tripFindFirst: vi.fn(),
  userProfileFindUnique: vi.fn(),
  destinationGuideFindUnique: vi.fn(),
  destinationGuideUpsert: vi.fn(),
  aiInteractionLogCreate: vi.fn(),
  userProgressFindUnique: vi.fn(),
  generateStreamingResponse: vi.fn(),
  earnPoints: vi.fn(),
}));

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("@/server/db", () => ({
  db: {
    trip: { findFirst: mocks.tripFindFirst },
    userProfile: { findUnique: mocks.userProfileFindUnique },
    userProgress: { findUnique: mocks.userProgressFindUnique },
    destinationGuide: {
      findUnique: mocks.destinationGuideFindUnique,
      upsert: mocks.destinationGuideUpsert,
    },
    aiInteractionLog: { create: mocks.aiInteractionLogCreate },
  },
}));

vi.mock("@/server/cache/redis", () => ({
  redis: { set: vi.fn(), del: vi.fn(), get: vi.fn() },
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

vi.mock("@/lib/guards/age-guard", () => ({
  canUseAI: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: { earnPoints: mocks.earnPoints },
}));

// ─── Import SUT ─────────────────────────────────────────────────────────────

import { POST } from "@/app/api/ai/guide/stream/route";
import { canUseAI } from "@/lib/guards/age-guard";

const mockCanUseAI = canUseAI as ReturnType<typeof vi.fn>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_GUIDE_JSON = JSON.stringify({
  destination: {
    name: "Paris",
    nickname: "City of Light",
    subtitle: "Romance capital",
    overview: ["Iconic city of art and history."],
  },
  quickFacts: {
    climate: { label: "Climate", value: "Temperate" },
    currency: { label: "Currency", value: "EUR" },
    language: { label: "Language", value: "French" },
    timezone: { label: "Timezone", value: "CET" },
  },
  safety: {
    level: "safe",
    tips: ["Watch for pickpockets"],
  },
  mustSee: [
    {
      name: "Eiffel Tower",
      category: "culture",
    },
  ],
  culturalTips: ["Greet with bonjour"],
});

const validBody = {
  tripId: "trip-123",
  destination: "Paris, France",
  language: "en" as const,
  locale: "en",
};

function createRequest(body: unknown = validBody): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/ai/guide/stream"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createMockStream(chunks: string[]) {
  const stream = new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
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

async function readSSE(response: Response): Promise<string> {
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

describe("POST /api/ai/guide/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: 0 });
    mocks.tripFindFirst.mockResolvedValue({ id: "trip-123", destination: "Paris, France" });
    mocks.userProfileFindUnique.mockResolvedValue({ birthDate: new Date("1990-01-01") });
    mocks.destinationGuideFindUnique.mockResolvedValue(null);
    mocks.destinationGuideUpsert.mockResolvedValue({
      id: "g-1",
      tripId: "trip-123",
      generationCount: 1,
      regenCount: 0,
    });
    mocks.userProgressFindUnique.mockResolvedValue({ availablePoints: 100 });
    mocks.aiInteractionLogCreate.mockResolvedValue(undefined);
    mocks.earnPoints.mockResolvedValue(undefined);
    mockCanUseAI.mockReturnValue(true);
  });

  it("returns 401 when not authenticated", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await POST(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/ai/guide/stream"), {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(createRequest({ tripId: "trip-1" }));
    expect(res.status).toBe(400);
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

  it("streams SSE events and persists guide on success", async () => {
    mocks.generateStreamingResponse.mockResolvedValue(createMockStream([VALID_GUIDE_JSON]));

    const res = await POST(createRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const sseText = await readSSE(res);
    expect(sseText).toContain("event: start");
    expect(sseText).toContain("event: complete");
    expect(mocks.destinationGuideUpsert).toHaveBeenCalledTimes(1);
  });

  it("returns rate limit error when exceeded", async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: 0 });
    const res = await POST(createRequest());
    expect(res.status).toBe(429);
  });
});
