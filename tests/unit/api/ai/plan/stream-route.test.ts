/**
 * Unit tests for POST /api/ai/plan/stream (T-S18-007, T-S19-001b).
 *
 * Tests auth, validation, rate limiting, BOLA check, age guard,
 * successful streaming response, and itinerary persistence after stream.
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
  persistItinerary: vi.fn(),
  parseItineraryJson: vi.fn(),
  acquireGenerationLock: vi.fn(),
  releaseGenerationLock: vi.fn(),
  recordGeneration: vi.fn(),
  earnPoints: vi.fn(),
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

vi.mock("@/server/cache/redis", () => ({
  redis: { set: vi.fn(), del: vi.fn() },
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

vi.mock("@/server/services/itinerary-persistence.service", () => ({
  persistItinerary: mocks.persistItinerary,
  parseItineraryJson: mocks.parseItineraryJson,
  acquireGenerationLock: mocks.acquireGenerationLock,
  releaseGenerationLock: mocks.releaseGenerationLock,
}));

vi.mock("@/server/services/itinerary-plan.service", () => ({
  ItineraryPlanService: {
    recordGeneration: mocks.recordGeneration,
  },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    earnPoints: mocks.earnPoints,
  },
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { POST } from "@/app/api/ai/plan/stream/route";
import { canUseAI } from "@/lib/guards/age-guard";

const mockCanUseAI = canUseAI as ReturnType<typeof vi.fn>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_PLAN_JSON = JSON.stringify({
  destination: "Paris, France",
  totalDays: 5,
  estimatedBudgetUsed: 2500,
  currency: "EUR",
  days: [
    {
      dayNumber: 1,
      date: "2026-06-01",
      theme: "Arrival",
      activities: [
        {
          title: "Eiffel Tower",
          description: "Visit the Eiffel Tower",
          startTime: "10:00",
          endTime: "12:00",
          estimatedCost: 30,
          activityType: "SIGHTSEEING",
        },
      ],
    },
  ],
  tips: ["Pack light"],
});

const validBody = {
  tripId: "trip-123",
  destination: "Paris, France",
  startDate: "2026-06-01",
  endDate: "2026-06-05",
  travelStyle: "CULTURE",
  budgetTotal: 3000,
  budgetCurrency: "EUR",
  travelers: 2,
  language: "en" as const,
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
    mocks.acquireGenerationLock.mockResolvedValue(true);
    mocks.releaseGenerationLock.mockResolvedValue(undefined);
    mocks.persistItinerary.mockResolvedValue(undefined);
    mocks.parseItineraryJson.mockReturnValue(null);
    mocks.recordGeneration.mockResolvedValue(undefined);
    mocks.earnPoints.mockResolvedValue(undefined);
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
    const res = await POST(createRequest({ tripId: "trip-1", destination: "" }));
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

  it("includes X-Content-Type-Options: nosniff header (SEC-S18-003)", async () => {
    mocks.generateStreamingResponse.mockResolvedValue(
      createMockStream(["ok"]),
    );

    const res = await POST(createRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("accepts flat request body matching Phase6Wizard format", async () => {
    mocks.generateStreamingResponse.mockResolvedValue(
      createMockStream(["ok"]),
    );

    const flatBody = {
      tripId: "trip-123",
      destination: "Tokyo, Japan",
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      travelStyle: "ADVENTURE",
      budgetTotal: 5000,
      budgetCurrency: "USD",
      travelers: 1,
      language: "en",
    };

    const res = await POST(createRequest(flatBody));
    expect(res.status).toBe(200);
  });

  it("calls rate limit with correct key", async () => {
    mocks.generateStreamingResponse.mockResolvedValue(
      createMockStream(["ok"]),
    );

    await POST(createRequest());

    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      "ai:plan:user-1",
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

  // ─── Persistence tests (T-S19-001b) ─────────────────────────────────────

  describe("Itinerary persistence after stream", () => {
    it("parses accumulated JSON and calls persistItinerary on valid plan", async () => {
      const planData = JSON.parse(VALID_PLAN_JSON);
      mocks.parseItineraryJson.mockReturnValue(planData);
      mocks.generateStreamingResponse.mockResolvedValue(
        createMockStream([VALID_PLAN_JSON]),
      );

      const res = await POST(createRequest());
      expect(res.status).toBe(200);

      const sseText = await readSSEResponse(res);
      expect(sseText).toContain("data: [DONE]\n\n");

      expect(mocks.parseItineraryJson).toHaveBeenCalledWith(VALID_PLAN_JSON);
      expect(mocks.persistItinerary).toHaveBeenCalledWith("trip-123", planData);
    });

    it("sends parse_failed error when JSON is invalid", async () => {
      mocks.parseItineraryJson.mockReturnValue(null);
      mocks.generateStreamingResponse.mockResolvedValue(
        createMockStream(["invalid json"]),
      );

      const res = await POST(createRequest());
      const sseText = await readSSEResponse(res);

      expect(sseText).toContain('data: {"error":"parse_failed"}\n\n');
      expect(sseText).toContain("data: [DONE]\n\n");
      expect(mocks.persistItinerary).not.toHaveBeenCalled();
    });

    it("sends persist_failed error when DB persistence fails", async () => {
      const planData = JSON.parse(VALID_PLAN_JSON);
      mocks.parseItineraryJson.mockReturnValue(planData);
      mocks.persistItinerary.mockRejectedValue(new Error("DB error"));
      mocks.generateStreamingResponse.mockResolvedValue(
        createMockStream([VALID_PLAN_JSON]),
      );

      const res = await POST(createRequest());
      const sseText = await readSSEResponse(res);

      expect(sseText).toContain('data: {"error":"persist_failed"}\n\n');
      expect(sseText).toContain("data: [DONE]\n\n");
    });

    it("records generation and awards points after successful persistence", async () => {
      const planData = JSON.parse(VALID_PLAN_JSON);
      mocks.parseItineraryJson.mockReturnValue(planData);
      mocks.generateStreamingResponse.mockResolvedValue(
        createMockStream([VALID_PLAN_JSON]),
      );

      const res = await POST(createRequest());
      await readSSEResponse(res);

      expect(mocks.recordGeneration).toHaveBeenCalledWith("trip-123");
      expect(mocks.earnPoints).toHaveBeenCalledWith(
        "user-1",
        50,
        "ai_usage",
        "Itinerary generation (streaming)",
        "trip-123",
      );
    });
  });

  // ─── Generation lock tests ─────────────────────────────────────────────

  describe("Generation lock", () => {
    it("returns 409 when generation is already in progress", async () => {
      mocks.acquireGenerationLock.mockResolvedValue(false);

      const res = await POST(createRequest());
      expect(res.status).toBe(409);
    });

    it("acquires lock before streaming and releases after", async () => {
      mocks.generateStreamingResponse.mockResolvedValue(
        createMockStream(["ok"]),
      );

      const res = await POST(createRequest());
      await readSSEResponse(res);

      expect(mocks.acquireGenerationLock).toHaveBeenCalledWith("trip-123", expect.anything());
      expect(mocks.releaseGenerationLock).toHaveBeenCalledWith("trip-123", expect.anything());
    });

    it("releases lock even if streaming fails", async () => {
      mocks.generateStreamingResponse.mockRejectedValue(new Error("stream error"));

      const res = await POST(createRequest());
      expect(res.status).toBe(500);

      expect(mocks.releaseGenerationLock).toHaveBeenCalled();
    });
  });
});
