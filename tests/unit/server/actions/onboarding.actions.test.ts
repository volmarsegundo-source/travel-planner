/**
 * Tests for onboarding server actions: saveOnboardingStepAction, getOnboardingProgressAction
 *
 * Covers: happy path per step, validation failures, step skipping,
 * unauthenticated access, server error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockAuth, mockSaveStep, mockGetProgress } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSaveStep: vi.fn(),
  mockGetProgress: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/server/services/onboarding.service", () => ({
  OnboardingService: {
    saveStep: mockSaveStep,
    getProgress: mockGetProgress,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: vi.fn((id: string) => `hashed-${id}`),
}));

vi.mock("@/lib/action-utils", () => ({
  mapErrorToKey: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : "errors.generic"
  ),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import {
  saveOnboardingStepAction,
  getOnboardingProgressAction,
} from "@/server/actions/onboarding.actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-123", email: "test@test.com" } };

function mockAuthenticated() {
  mockAuth.mockResolvedValue(SESSION);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("saveOnboardingStepAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws UnauthorizedError when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(saveOnboardingStepAction(1, {})).rejects.toThrow(
      "Authentication required"
    );
  });

  it("returns error for invalid step number (0)", async () => {
    mockAuthenticated();
    const result = await saveOnboardingStepAction(0, {});
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", "onboarding.errors.invalidStep");
  });

  it("returns error for invalid step number (4)", async () => {
    mockAuthenticated();
    const result = await saveOnboardingStepAction(4, {});
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", "onboarding.errors.invalidStep");
  });

  // ─── Step 1 (welcome — no required fields) ─────────────────────────────

  it("saves step 1 successfully with empty payload", async () => {
    mockAuthenticated();
    const progress = {
      onboardingStep: 1,
      onboardingData: { step1: {} },
      onboardingCompletedAt: null,
    };
    mockSaveStep.mockResolvedValue(progress);

    const result = await saveOnboardingStepAction(1, {});
    expect(result).toEqual({ success: true, data: progress });
    expect(mockSaveStep).toHaveBeenCalledWith("user-123", 1, {});
  });

  // ─── Step 2 (trip details — required fields) ───────────────────────────

  it("saves step 2 successfully with valid trip data", async () => {
    mockAuthenticated();
    const payload = {
      destination: "Paris",
      startDate: "2026-06-01",
      endDate: "2026-06-10",
      travelers: 2,
    };
    const progress = {
      onboardingStep: 2,
      onboardingData: { step1: {}, step2: payload },
      onboardingCompletedAt: null,
    };
    mockSaveStep.mockResolvedValue(progress);

    const result = await saveOnboardingStepAction(2, payload);
    expect(result).toEqual({ success: true, data: progress });
  });

  it("returns validation error when step 2 missing destination", async () => {
    mockAuthenticated();
    const result = await saveOnboardingStepAction(2, {
      destination: "",
      startDate: "2026-06-01",
      endDate: "2026-06-10",
      travelers: 2,
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", "onboarding.errors.validationFailed");
    expect(mockSaveStep).not.toHaveBeenCalled();
  });

  it("returns validation error when step 2 travelers < 1", async () => {
    mockAuthenticated();
    const result = await saveOnboardingStepAction(2, {
      destination: "Paris",
      startDate: "2026-06-01",
      endDate: "2026-06-10",
      travelers: 0,
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", "onboarding.errors.validationFailed");
  });

  it("returns validation error when step 2 travelers > 20", async () => {
    mockAuthenticated();
    const result = await saveOnboardingStepAction(2, {
      destination: "Paris",
      startDate: "2026-06-01",
      endDate: "2026-06-10",
      travelers: 21,
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", "onboarding.errors.validationFailed");
  });

  // ─── Step 3 (style + budget) ───────────────────────────────────────────

  it("saves step 3 successfully with valid style and budget", async () => {
    mockAuthenticated();
    const payload = {
      travelStyle: "ADVENTURE",
      budget: 2000,
      currency: "USD",
    };
    const progress = {
      onboardingStep: 3,
      onboardingData: { step1: {}, step2: {}, step3: payload },
      onboardingCompletedAt: new Date("2026-04-18"),
    };
    mockSaveStep.mockResolvedValue(progress);

    const result = await saveOnboardingStepAction(3, payload);
    expect(result).toEqual({ success: true, data: progress });
  });

  it("returns validation error when step 3 has invalid travel style", async () => {
    mockAuthenticated();
    const result = await saveOnboardingStepAction(3, {
      travelStyle: "INVALID_STYLE",
      budget: 2000,
      currency: "USD",
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", "onboarding.errors.validationFailed");
  });

  it("returns validation error when step 3 budget < 1", async () => {
    mockAuthenticated();
    const result = await saveOnboardingStepAction(3, {
      travelStyle: "CULTURE",
      budget: 0,
      currency: "USD",
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", "onboarding.errors.validationFailed");
  });

  // ─── Server errors ─────────────────────────────────────────────────────

  it("returns error when service throws (step skip)", async () => {
    mockAuthenticated();
    mockSaveStep.mockRejectedValue(new Error("onboarding.errors.stepSkipped"));

    const result = await saveOnboardingStepAction(1, {});
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", "onboarding.errors.stepSkipped");
  });

  it("returns generic error when service throws unexpected error", async () => {
    mockAuthenticated();
    mockSaveStep.mockRejectedValue(new Error("DB connection failed"));

    const result = await saveOnboardingStepAction(1, {});
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", "DB connection failed");
  });
});

describe("getOnboardingProgressAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws UnauthorizedError when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getOnboardingProgressAction()).rejects.toThrow(
      "Authentication required"
    );
  });

  it("returns progress for authenticated user", async () => {
    mockAuthenticated();
    const progress = {
      onboardingStep: 2,
      onboardingData: { step1: {}, step2: { destination: "Tokyo" } },
      onboardingCompletedAt: null,
    };
    mockGetProgress.mockResolvedValue(progress);

    const result = await getOnboardingProgressAction();
    expect(result).toEqual({ success: true, data: progress });
    expect(mockGetProgress).toHaveBeenCalledWith("user-123");
  });

  it("returns error when service throws", async () => {
    mockAuthenticated();
    mockGetProgress.mockRejectedValue(new Error("DB down"));

    const result = await getOnboardingProgressAction();
    expect(result.success).toBe(false);
  });
});
