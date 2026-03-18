/**
 * Unit tests for expedition Zod schemas (Phase1Schema, Phase2Schema).
 * Pure schema tests — no external dependencies.
 */
import { describe, it, expect } from "vitest";
import {
  Phase1Schema,
  Phase2Schema,
} from "@/lib/validations/expedition.schema";

// ─── Phase1Schema ─────────────────────────────────────────────────────────────

describe("Phase1Schema", () => {
  const validPhase1 = {
    destination: "Paris",
    flexibleDates: false,
  };

  it("accepts a valid input with required fields only", () => {
    const result = Phase1Schema.safeParse(validPhase1);
    expect(result.success).toBe(true);
  });

  it("accepts a valid input with all optional fields", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      startDate: "2026-06-01",
      endDate: "2026-06-10",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty destination", () => {
    const result = Phase1Schema.safeParse({ ...validPhase1, destination: "" });
    expect(result.success).toBe(false);
  });

  it("rejects destination longer than 150 characters", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      destination: "A".repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it("accepts destination of exactly 150 characters", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      destination: "A".repeat(150),
    });
    expect(result.success).toBe(true);
  });

  it("defaults flexibleDates to false when omitted", () => {
    const result = Phase1Schema.safeParse({
      destination: "Tokyo",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flexibleDates).toBe(false);
    }
  });

  it("accepts flexibleDates as true", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      flexibleDates: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flexibleDates).toBe(true);
    }
  });

  it("makes startDate optional", () => {
    const result = Phase1Schema.safeParse(validPhase1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBeUndefined();
    }
  });

  // endDate must be strictly after startDate (same dates rejected per SPEC-PROD-024)
  it("rejects endDate equal to startDate (same dates)", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      startDate: "2026-06-01",
      endDate: "2026-06-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("expedition.phase1.errors.sameDates");
    }
  });

  it("accepts endDate after startDate", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      startDate: "2026-06-01",
      endDate: "2026-06-10",
    });
    expect(result.success).toBe(true);
  });

  it("rejects endDate before startDate", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      startDate: "2026-06-10",
      endDate: "2026-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("allows no dates (both optional)", () => {
    const result = Phase1Schema.safeParse(validPhase1);
    expect(result.success).toBe(true);
  });

  // profileFields
  it("accepts profileFields with all fields", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      profileFields: {
        birthDate: "2000-01-01",
        phone: "+5511999999999",
        country: "Brazil",
        city: "São Paulo",
        bio: "I love traveling!",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts profileFields with partial fields", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      profileFields: { country: "Brazil" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts without profileFields (optional)", () => {
    const result = Phase1Schema.safeParse(validPhase1);
    expect(result.success).toBe(true);
  });

  it("rejects profileFields.bio longer than 500 chars", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      profileFields: { bio: "A".repeat(501) },
    });
    expect(result.success).toBe(false);
  });

  // destinationLat / destinationLon
  it("accepts valid coordinates", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      destinationLat: 48.8566,
      destinationLon: 2.3522,
    });
    expect(result.success).toBe(true);
  });

  it("accepts coordinates at boundary values", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      destinationLat: -90,
      destinationLon: 180,
    });
    expect(result.success).toBe(true);
  });

  it("rejects latitude out of range", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      destinationLat: 91,
      destinationLon: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects longitude out of range", () => {
    const result = Phase1Schema.safeParse({
      ...validPhase1,
      destinationLat: 0,
      destinationLon: -181,
    });
    expect(result.success).toBe(false);
  });

  it("allows omitting coordinates (optional)", () => {
    const result = Phase1Schema.safeParse(validPhase1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.destinationLat).toBeUndefined();
      expect(result.data.destinationLon).toBeUndefined();
    }
  });
});

// ─── Phase2Schema ─────────────────────────────────────────────────────────────

describe("Phase2Schema", () => {
  const validPhase2 = {
    travelerType: "solo" as const,
    accommodationStyle: "comfort" as const,
    travelPace: 5,
    budget: 3000,
    currency: "USD" as const,
  };

  it("accepts a valid input with all required fields", () => {
    const result = Phase2Schema.safeParse(validPhase2);
    expect(result.success).toBe(true);
  });

  it.each(["solo", "couple"] as const)(
    "accepts travelerType: %s",
    (type) => {
      const result = Phase2Schema.safeParse({ ...validPhase2, travelerType: type });
      expect(result.success).toBe(true);
    }
  );

  it.each(["business", "student"] as const)(
    "accepts travelerType: %s",
    (type) => {
      const result = Phase2Schema.safeParse({ ...validPhase2, travelerType: type });
      expect(result.success).toBe(true);
    }
  );

  it("accepts travelers for family type", () => {
    const result = Phase2Schema.safeParse({
      ...validPhase2,
      travelerType: "family",
      travelers: 4,
    });
    expect(result.success).toBe(true);
  });

  it("accepts travelers for group type", () => {
    const result = Phase2Schema.safeParse({
      ...validPhase2,
      travelerType: "group",
      travelers: 8,
    });
    expect(result.success).toBe(true);
  });

  it("rejects family type without travelers", () => {
    const result = Phase2Schema.safeParse({
      ...validPhase2,
      travelerType: "family",
    });
    expect(result.success).toBe(false);
  });

  it("rejects group type without travelers", () => {
    const result = Phase2Schema.safeParse({
      ...validPhase2,
      travelerType: "group",
    });
    expect(result.success).toBe(false);
  });

  it("allows solo without travelers field", () => {
    const result = Phase2Schema.safeParse({
      ...validPhase2,
      travelerType: "solo",
    });
    expect(result.success).toBe(true);
  });

  it("accepts dietaryRestrictions", () => {
    const result = Phase2Schema.safeParse({
      ...validPhase2,
      dietaryRestrictions: "vegetarian",
    });
    expect(result.success).toBe(true);
  });

  it("accepts accessibility", () => {
    const result = Phase2Schema.safeParse({
      ...validPhase2,
      accessibility: "wheelchair access",
    });
    expect(result.success).toBe(true);
  });

  it("rejects travelers greater than 20", () => {
    const result = Phase2Schema.safeParse({
      ...validPhase2,
      travelerType: "group",
      travelers: 21,
    });
    expect(result.success).toBe(false);
  });

  it("rejects dietaryRestrictions longer than 300 chars", () => {
    const result = Phase2Schema.safeParse({
      ...validPhase2,
      dietaryRestrictions: "A".repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid travelerType", () => {
    const result = Phase2Schema.safeParse({ ...validPhase2, travelerType: "unknown" });
    expect(result.success).toBe(false);
  });

  it.each(["budget", "comfort", "luxury", "adventure"] as const)(
    "accepts accommodationStyle: %s",
    (style) => {
      const result = Phase2Schema.safeParse({ ...validPhase2, accommodationStyle: style });
      expect(result.success).toBe(true);
    }
  );

  it("rejects invalid accommodationStyle", () => {
    const result = Phase2Schema.safeParse({ ...validPhase2, accommodationStyle: "hostel" });
    expect(result.success).toBe(false);
  });

  it("rejects travelPace less than 1", () => {
    const result = Phase2Schema.safeParse({ ...validPhase2, travelPace: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects travelPace greater than 10", () => {
    const result = Phase2Schema.safeParse({ ...validPhase2, travelPace: 11 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer travelPace", () => {
    const result = Phase2Schema.safeParse({ ...validPhase2, travelPace: 5.5 });
    expect(result.success).toBe(false);
  });

  it("rejects budget less than 100", () => {
    const result = Phase2Schema.safeParse({ ...validPhase2, budget: 99 });
    expect(result.success).toBe(false);
  });

  it("rejects budget greater than 100000", () => {
    const result = Phase2Schema.safeParse({ ...validPhase2, budget: 100001 });
    expect(result.success).toBe(false);
  });

  it("accepts budget of exactly 100", () => {
    const result = Phase2Schema.safeParse({ ...validPhase2, budget: 100 });
    expect(result.success).toBe(true);
  });

  it("accepts budget of exactly 100000", () => {
    const result = Phase2Schema.safeParse({ ...validPhase2, budget: 100000 });
    expect(result.success).toBe(true);
  });

  it.each(["USD", "EUR", "BRL"] as const)(
    "accepts currency: %s",
    (cur) => {
      const result = Phase2Schema.safeParse({ ...validPhase2, currency: cur });
      expect(result.success).toBe(true);
    }
  );

  it("rejects invalid currency", () => {
    const result = Phase2Schema.safeParse({ ...validPhase2, currency: "GBP" });
    expect(result.success).toBe(false);
  });
});
