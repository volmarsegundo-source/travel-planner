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
    travelers: 2,
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

  it("rejects travelers less than 1", () => {
    const result = Phase1Schema.safeParse({ ...validPhase1, travelers: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects travelers greater than 10", () => {
    const result = Phase1Schema.safeParse({ ...validPhase1, travelers: 11 });
    expect(result.success).toBe(false);
  });

  it("accepts travelers of exactly 10", () => {
    const result = Phase1Schema.safeParse({ ...validPhase1, travelers: 10 });
    expect(result.success).toBe(true);
  });

  it("rejects non-integer travelers", () => {
    const result = Phase1Schema.safeParse({ ...validPhase1, travelers: 2.5 });
    expect(result.success).toBe(false);
  });

  it("defaults flexibleDates to false when omitted", () => {
    const result = Phase1Schema.safeParse({
      destination: "Tokyo",
      travelers: 1,
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

  it.each(["solo", "couple", "family", "group"] as const)(
    "accepts travelerType: %s",
    (type) => {
      const result = Phase2Schema.safeParse({ ...validPhase2, travelerType: type });
      expect(result.success).toBe(true);
    }
  );

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
