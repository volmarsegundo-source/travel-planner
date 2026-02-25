import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockAuth, mockCheckRateLimit, mockGetUserTripById, mockGenerateTravelPlan, mockGenerateChecklist } =
  vi.hoisted(() => {
    const mockAuth = vi.fn();
    const mockCheckRateLimit = vi.fn();
    const mockGetUserTripById = vi.fn();
    const mockGenerateTravelPlan = vi.fn();
    const mockGenerateChecklist = vi.fn();
    return {
      mockAuth,
      mockCheckRateLimit,
      mockGetUserTripById,
      mockGenerateTravelPlan,
      mockGenerateChecklist,
    };
  });

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/server/lib/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));
// Mock the whole trip.actions module so we control getUserTripById
vi.mock("@/server/actions/trip.actions", () => ({
  getUserTripById: mockGetUserTripById,
}));
vi.mock("@/server/services/ai.service", () => ({
  generateTravelPlan: mockGenerateTravelPlan,
  generateChecklist: mockGenerateChecklist,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { generateTripPlan, generateTripChecklist } from "../ai.actions";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-123", email: "alice@example.com" } };

const TRIP_SUMMARY = {
  id: "trip-abc",
  destinationName: "Lisboa, Portugal",
  startDate: "2025-07-01",
  endDate: "2025-07-05",
  travelStyle: "CULTURE",
  budgetTotal: 5000,
  budgetCurrency: "BRL",
  travelers: 2,
};

const RL_ALLOWED = { allowed: true, remaining: 9, resetInSeconds: 3600 };
const RL_DENIED = { allowed: false, remaining: 0, resetInSeconds: 1800 };

// ── generateTripPlan ──────────────────────────────────────────────────────────

describe("generateTripPlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns RATE_LIMITED when rate limit is exceeded", async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockCheckRateLimit.mockResolvedValue(RL_DENIED);

    const result = await generateTripPlan("trip-abc");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("RATE_LIMITED");
      expect(result.error).toContain("Limite de geração");
    }
    // Must not call the AI service or trip lookup when rate-limited
    expect(mockGetUserTripById).not.toHaveBeenCalled();
    expect(mockGenerateTravelPlan).not.toHaveBeenCalled();
  });

  it("proceeds to generate plan when rate limit is not exceeded", async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockCheckRateLimit.mockResolvedValue(RL_ALLOWED);
    mockGetUserTripById.mockResolvedValue({ success: true, data: TRIP_SUMMARY });
    mockGenerateTravelPlan.mockResolvedValue({
      destination: "Lisboa, Portugal",
      totalDays: 4,
      days: [],
      travelStyle: "CULTURE",
      highlights: [],
      tips: [],
    });

    const result = await generateTripPlan("trip-abc");

    expect(result.success).toBe(true);
    expect(mockGenerateTravelPlan).toHaveBeenCalledOnce();
  });

  it("returns UNAUTHORIZED when session is missing", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await generateTripPlan("trip-abc");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("uses userId from session (never from client) for rate limit key", async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockCheckRateLimit.mockResolvedValue(RL_ALLOWED);
    mockGetUserTripById.mockResolvedValue({ success: true, data: TRIP_SUMMARY });
    mockGenerateTravelPlan.mockResolvedValue({
      destination: "Lisboa, Portugal",
      totalDays: 1,
      days: [],
      travelStyle: null,
      highlights: [],
      tips: [],
    });

    await generateTripPlan("trip-abc");

    // The rate limit key must be keyed by the session userId
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("user-123"),
      expect.any(Number),
      expect.any(Number),
    );
  });
});

// ── generateTripChecklist ─────────────────────────────────────────────────────

describe("generateTripChecklist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns RATE_LIMITED when checklist rate limit is exceeded", async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockCheckRateLimit.mockResolvedValue(RL_DENIED);

    const result = await generateTripChecklist("trip-abc");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("RATE_LIMITED");
      expect(result.error).toContain("Limite de geração");
    }
    expect(mockGetUserTripById).not.toHaveBeenCalled();
    expect(mockGenerateChecklist).not.toHaveBeenCalled();
  });

  it("proceeds to generate checklist when rate limit is not exceeded", async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockCheckRateLimit.mockResolvedValue(RL_ALLOWED);
    mockGetUserTripById.mockResolvedValue({ success: true, data: TRIP_SUMMARY });
    mockGenerateChecklist.mockResolvedValue([
      { id: "DOCUMENTS", items: [{ text: "Passaporte", required: true }] },
    ]);

    const result = await generateTripChecklist("trip-abc");

    expect(result.success).toBe(true);
    expect(mockGenerateChecklist).toHaveBeenCalledOnce();
  });

  it("returns UNAUTHORIZED when session is missing", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await generateTripChecklist("trip-abc");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});
