/**
 * Unit tests for savePreferencesAction — gamification logic.
 *
 * Tests: points per category fill, no duplicate awards, badge at >= 5 categories.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mock functions ─────────────────────────────────────────────────────

const {
  mockAuth,
  mockFindUnique,
  mockUpsert,
  mockFindFirst,
  mockEarnPoints,
  mockAwardBadge,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpsert: vi.fn(),
  mockFindFirst: vi.fn(),
  mockEarnPoints: vi.fn(),
  mockAwardBadge: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/server/db", () => ({
  db: {
    userProfile: {
      findUnique: mockFindUnique,
      upsert: mockUpsert,
    },
    pointTransaction: {
      findFirst: mockFindFirst,
    },
  },
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    earnPoints: mockEarnPoints,
    awardBadge: mockAwardBadge,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/hash", () => ({
  hashUserId: vi.fn().mockReturnValue("hashed-user"),
}));

vi.mock("@/lib/action-utils", () => ({
  mapErrorToKey: vi.fn().mockReturnValue("errors.generic"),
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn().mockReturnValue("encrypted"),
  decrypt: vi.fn().mockReturnValue("decrypted"),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { savePreferencesAction } from "@/server/actions/profile.actions";

// ─── Test helpers ─────────────────────────────────────────────────────────────

const USER_ID = "user-123";

function authenticateUser() {
  mockAuth.mockResolvedValue({ user: { id: USER_ID } });
}

function setExistingPreferences(preferences: Record<string, unknown> | null) {
  mockFindUnique.mockResolvedValue(
    preferences !== null ? { preferences } : null
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  authenticateUser();
  mockUpsert.mockResolvedValue({});
  mockFindFirst.mockResolvedValue(null); // No existing point transactions
  mockEarnPoints.mockResolvedValue(undefined);
  mockAwardBadge.mockResolvedValue(false);
});

describe("savePreferencesAction", () => {
  it("returns validation error for invalid preferences", async () => {
    setExistingPreferences(null);

    const result = await savePreferencesAction({ travelPace: "warp_speed" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("errors.validation");
  });

  it("saves valid preferences and returns success", async () => {
    setExistingPreferences(null);

    const result = await savePreferencesAction({ travelPace: "relaxed" });
    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("awards 5 points for first fill of a category", async () => {
    setExistingPreferences({}); // No previous preferences

    const result = await savePreferencesAction({
      travelPace: "moderate",
      budgetStyle: "luxury",
    });

    expect(result.success).toBe(true);
    expect(result.data?.pointsAwarded).toBe(10); // 2 categories x 5 points
    expect(mockEarnPoints).toHaveBeenCalledTimes(2);
    expect(mockEarnPoints).toHaveBeenCalledWith(
      USER_ID,
      5,
      "preference_fill",
      "Preference category: travelPace"
    );
    expect(mockEarnPoints).toHaveBeenCalledWith(
      USER_ID,
      5,
      "preference_fill",
      "Preference category: budgetStyle"
    );
  });

  it("does not award duplicate points for already-filled categories", async () => {
    // User already had travelPace filled
    setExistingPreferences({ travelPace: "relaxed" });

    const result = await savePreferencesAction({
      travelPace: "intense", // Changed but already was filled
      budgetStyle: "luxury", // New fill
    });

    expect(result.success).toBe(true);
    // Only budgetStyle is new — travelPace was already filled
    expect(result.data?.pointsAwarded).toBe(5);
    expect(mockEarnPoints).toHaveBeenCalledTimes(1);
    expect(mockEarnPoints).toHaveBeenCalledWith(
      USER_ID,
      5,
      "preference_fill",
      "Preference category: budgetStyle"
    );
  });

  it("does not re-award points if transaction already exists", async () => {
    setExistingPreferences({}); // No previous preferences
    // Simulate already-awarded point transaction
    mockFindFirst.mockResolvedValue({ id: "txn-existing" });

    const result = await savePreferencesAction({ travelPace: "relaxed" });

    expect(result.success).toBe(true);
    expect(result.data?.pointsAwarded).toBe(0); // Already awarded
    expect(mockEarnPoints).not.toHaveBeenCalled();
  });

  it("awards identity_explorer badge when >= 5 categories filled", async () => {
    setExistingPreferences({}); // No previous preferences
    mockAwardBadge.mockResolvedValue(true); // Badge newly awarded

    const result = await savePreferencesAction({
      travelPace: "relaxed",
      foodPreferences: ["vegetarian"],
      interests: ["beaches"],
      budgetStyle: "budget",
      socialPreference: ["solo"],
    });

    expect(result.success).toBe(true);
    expect(mockAwardBadge).toHaveBeenCalledWith(USER_ID, "detalhista");
    // 5 categories x 5 + 25 badge bonus = 50
    expect(result.data?.pointsAwarded).toBe(50);
  });

  it("does not re-award identity_explorer badge", async () => {
    setExistingPreferences({
      travelPace: "relaxed",
      foodPreferences: ["vegetarian"],
      interests: ["beaches"],
      budgetStyle: "budget",
    });
    mockAwardBadge.mockResolvedValue(false); // Badge already owned

    const result = await savePreferencesAction({
      travelPace: "relaxed",
      foodPreferences: ["vegetarian"],
      interests: ["beaches"],
      budgetStyle: "budget",
      socialPreference: ["solo"], // New — triggers threshold
    });

    expect(result.success).toBe(true);
    expect(mockAwardBadge).toHaveBeenCalledWith(USER_ID, "detalhista");
    // Only 5 points for new category, no badge bonus (already owned)
    expect(result.data?.pointsAwarded).toBe(5);
  });

  it("returns totalFilled count", async () => {
    setExistingPreferences({});

    const result = await savePreferencesAction({
      travelPace: "moderate",
      interests: ["photography"],
      connectivityNeeds: "essential",
    });

    expect(result.success).toBe(true);
    expect(result.data?.totalFilled).toBe(3);
  });

  it("throws UnauthorizedError when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(savePreferencesAction({ travelPace: "relaxed" })).rejects.toThrow();
  });
});
