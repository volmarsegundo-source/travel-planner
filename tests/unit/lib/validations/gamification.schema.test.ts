/**
 * Unit tests for gamification Zod schemas.
 *
 * Validates CompletePhaseSchema, SpendPointsSchema, and UseAiInPhaseSchema
 * parsing and validation rules. These are pure schema tests with no
 * external dependencies — no mocks required.
 */
import { describe, it, expect } from "vitest";
import {
  CompletePhaseSchema,
  SpendPointsSchema,
  UseAiInPhaseSchema,
} from "@/lib/validations/gamification.schema";

// ─── CompletePhaseSchema ─────────────────────────────────────────────────────

describe("CompletePhaseSchema", () => {
  it("accepts a valid input with tripId and phaseNumber", () => {
    const result = CompletePhaseSchema.safeParse({
      tripId: "clx123abc",
      phaseNumber: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty tripId", () => {
    const result = CompletePhaseSchema.safeParse({
      tripId: "",
      phaseNumber: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("tripId is required");
    }
  });

  it("rejects phaseNumber less than 1", () => {
    const result = CompletePhaseSchema.safeParse({
      tripId: "clx123abc",
      phaseNumber: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects phaseNumber greater than 8", () => {
    const result = CompletePhaseSchema.safeParse({
      tripId: "clx123abc",
      phaseNumber: 9,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a floating-point phaseNumber", () => {
    const result = CompletePhaseSchema.safeParse({
      tripId: "clx123abc",
      phaseNumber: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts input without metadata (optional field)", () => {
    const result = CompletePhaseSchema.safeParse({
      tripId: "clx123abc",
      phaseNumber: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata).toBeUndefined();
    }
  });

  it("accepts input with a metadata record", () => {
    const result = CompletePhaseSchema.safeParse({
      tripId: "clx123abc",
      phaseNumber: 4,
      metadata: { aiGenerated: true, durationMs: 1200 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata).toEqual({
        aiGenerated: true,
        durationMs: 1200,
      });
    }
  });

  it("rejects metadata with more than 20 keys", () => {
    const tooManyKeys: Record<string, unknown> = {};
    for (let i = 0; i < 21; i++) {
      tooManyKeys[`key${i}`] = i;
    }
    const result = CompletePhaseSchema.safeParse({
      tripId: "clx123abc",
      phaseNumber: 1,
      metadata: tooManyKeys,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Too many metadata keys (max 20)");
    }
  });

  it("rejects metadata key longer than 100 characters", () => {
    const longKey = "a".repeat(101);
    const result = CompletePhaseSchema.safeParse({
      tripId: "clx123abc",
      phaseNumber: 1,
      metadata: { [longKey]: "value" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts metadata with exactly 20 keys", () => {
    const exactly20: Record<string, unknown> = {};
    for (let i = 0; i < 20; i++) {
      exactly20[`key${i}`] = i;
    }
    const result = CompletePhaseSchema.safeParse({
      tripId: "clx123abc",
      phaseNumber: 1,
      metadata: exactly20,
    });
    expect(result.success).toBe(true);
  });
});

// ─── SpendPointsSchema ───────────────────────────────────────────────────────

describe("SpendPointsSchema", () => {
  it("accepts a valid input with all required fields", () => {
    const result = SpendPointsSchema.safeParse({
      amount: 100,
      type: "ai_itinerary",
      description: "Generate travel itinerary",
    });
    expect(result.success).toBe(true);
  });

  it("rejects amount of 0", () => {
    const result = SpendPointsSchema.safeParse({
      amount: 0,
      type: "ai_route",
      description: "Route planning",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("amount must be positive");
    }
  });

  it("rejects a negative amount", () => {
    const result = SpendPointsSchema.safeParse({
      amount: -50,
      type: "ai_route",
      description: "Route planning",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid spend type", () => {
    const result = SpendPointsSchema.safeParse({
      amount: 100,
      type: "ai_invalid",
      description: "Invalid type test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a description longer than 255 characters", () => {
    const result = SpendPointsSchema.safeParse({
      amount: 50,
      type: "ai_accommodation",
      description: "A".repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe(
        "description must be at most 255 characters"
      );
    }
  });

  it.each([
    "ai_itinerary",
    "ai_route",
    "ai_accommodation",
  ] as const)("accepts valid spend type: %s", (type) => {
    const result = SpendPointsSchema.safeParse({
      amount: 80,
      type,
      description: `Testing ${type}`,
    });
    expect(result.success).toBe(true);
  });
});

// ─── UseAiInPhaseSchema ──────────────────────────────────────────────────────

describe("UseAiInPhaseSchema", () => {
  it("accepts a valid input with tripId and phaseNumber", () => {
    const result = UseAiInPhaseSchema.safeParse({
      tripId: "clx456def",
      phaseNumber: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty tripId", () => {
    const result = UseAiInPhaseSchema.safeParse({
      tripId: "",
      phaseNumber: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("tripId is required");
    }
  });

  it("rejects phaseNumber less than 1", () => {
    const result = UseAiInPhaseSchema.safeParse({
      tripId: "clx456def",
      phaseNumber: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects phaseNumber greater than 8", () => {
    const result = UseAiInPhaseSchema.safeParse({
      tripId: "clx456def",
      phaseNumber: 9,
    });
    expect(result.success).toBe(false);
  });
});
