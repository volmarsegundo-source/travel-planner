/**
 * Unit tests for PassengersSchema and getTotalPassengers.
 *
 * Covers: valid passengers, minimum adults, children ages matching count,
 * age bounds, max limits, and total passenger calculation.
 */
import { describe, it, expect } from "vitest";
import {
  PassengersSchema,
  getTotalPassengers,
  MAX_TOTAL_PASSENGERS,
  type Passengers,
} from "@/lib/validations/trip.schema";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_SOLO: Passengers = {
  adults: 1,
  children: { count: 0, ages: [] },
  seniors: 0,
  infants: 0,
};

const VALID_FAMILY: Passengers = {
  adults: 2,
  children: { count: 2, ages: [5, 10] },
  seniors: 1,
  infants: 0,
};

const VALID_WITH_INFANT: Passengers = {
  adults: 2,
  children: { count: 0, ages: [] },
  seniors: 0,
  infants: 1,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PassengersSchema", () => {
  describe("valid inputs", () => {
    it("accepts solo traveler (1 adult, no children/seniors/infants)", () => {
      expect(PassengersSchema.parse(VALID_SOLO)).toEqual(VALID_SOLO);
    });

    it("accepts family with children and ages matching count", () => {
      expect(PassengersSchema.parse(VALID_FAMILY)).toEqual(VALID_FAMILY);
    });

    it("accepts couple with infant", () => {
      expect(PassengersSchema.parse(VALID_WITH_INFANT)).toEqual(VALID_WITH_INFANT);
    });

    it("accepts maximum children age of 17", () => {
      const data: Passengers = {
        adults: 1,
        children: { count: 1, ages: [17] },
        seniors: 0,
        infants: 0,
      };
      expect(PassengersSchema.parse(data)).toEqual(data);
    });

    it("accepts 0-year-old child", () => {
      const data: Passengers = {
        adults: 1,
        children: { count: 1, ages: [0] },
        seniors: 0,
        infants: 0,
      };
      expect(PassengersSchema.parse(data)).toEqual(data);
    });
  });

  describe("invalid inputs", () => {
    it("rejects 0 adults", () => {
      const result = PassengersSchema.safeParse({
        adults: 0,
        children: { count: 0, ages: [] },
        seniors: 0,
        infants: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative adults", () => {
      const result = PassengersSchema.safeParse({
        adults: -1,
        children: { count: 0, ages: [] },
        seniors: 0,
        infants: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects children ages array length mismatch (too few)", () => {
      const result = PassengersSchema.safeParse({
        adults: 2,
        children: { count: 2, ages: [5] },
        seniors: 0,
        infants: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const agesError = result.error.issues.find(
          (i) => i.path.includes("ages")
        );
        expect(agesError).toBeDefined();
      }
    });

    it("rejects children ages array length mismatch (too many)", () => {
      const result = PassengersSchema.safeParse({
        adults: 1,
        children: { count: 1, ages: [5, 10] },
        seniors: 0,
        infants: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects child age over 17", () => {
      const result = PassengersSchema.safeParse({
        adults: 1,
        children: { count: 1, ages: [18] },
        seniors: 0,
        infants: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative child age", () => {
      const result = PassengersSchema.safeParse({
        adults: 1,
        children: { count: 1, ages: [-1] },
        seniors: 0,
        infants: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative seniors", () => {
      const result = PassengersSchema.safeParse({
        adults: 1,
        children: { count: 0, ages: [] },
        seniors: -1,
        infants: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative infants", () => {
      const result = PassengersSchema.safeParse({
        adults: 1,
        children: { count: 0, ages: [] },
        seniors: 0,
        infants: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects adults over max (9)", () => {
      const result = PassengersSchema.safeParse({
        adults: 10,
        children: { count: 0, ages: [] },
        seniors: 0,
        infants: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects children count over max (9)", () => {
      const result = PassengersSchema.safeParse({
        adults: 1,
        children: { count: 10, ages: Array(10).fill(5) },
        seniors: 0,
        infants: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer adults", () => {
      const result = PassengersSchema.safeParse({
        adults: 1.5,
        children: { count: 0, ages: [] },
        seniors: 0,
        infants: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing required fields", () => {
      const result = PassengersSchema.safeParse({ adults: 1 });
      expect(result.success).toBe(false);
    });
  });

  // ─── Total passenger cap (T-S21-006) ────────────────────────────────────────

  describe("total passenger cap", () => {
    it("exports MAX_TOTAL_PASSENGERS as 20", () => {
      expect(MAX_TOTAL_PASSENGERS).toBe(20);
    });

    it("accepts total of 1 passenger", () => {
      const result = PassengersSchema.safeParse({
        adults: 1,
        children: { count: 0, ages: [] },
        seniors: 0,
        infants: 0,
      });
      expect(result.success).toBe(true);
    });

    it("accepts total of 10 passengers", () => {
      const result = PassengersSchema.safeParse({
        adults: 4,
        children: { count: 3, ages: [5, 8, 12] },
        seniors: 2,
        infants: 1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts exactly 20 total passengers (boundary)", () => {
      const result = PassengersSchema.safeParse({
        adults: 8,
        children: { count: 5, ages: [2, 4, 6, 8, 10] },
        seniors: 5,
        infants: 2,
      });
      expect(result.success).toBe(true);
    });

    it("rejects 21 total passengers (boundary)", () => {
      const result = PassengersSchema.safeParse({
        adults: 8,
        children: { count: 5, ages: [2, 4, 6, 8, 10] },
        seniors: 5,
        infants: 3,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain("Total passengers cannot exceed 20");
      }
    });

    it("rejects large total exceeding cap", () => {
      const result = PassengersSchema.safeParse({
        adults: 9,
        children: { count: 5, ages: [1, 2, 3, 4, 5] },
        seniors: 5,
        infants: 5,
      });
      expect(result.success).toBe(false);
    });

    it("reports error on adults path", () => {
      const result = PassengersSchema.safeParse({
        adults: 9,
        children: { count: 6, ages: [1, 2, 3, 4, 5, 6] },
        seniors: 3,
        infants: 3,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const capIssue = result.error.issues.find(
          (i) => i.message === "Total passengers cannot exceed 20"
        );
        expect(capIssue).toBeDefined();
        expect(capIssue!.path).toContain("adults");
      }
    });
  });
});

describe("getTotalPassengers", () => {
  it("returns 1 for solo traveler", () => {
    expect(getTotalPassengers(VALID_SOLO)).toBe(1);
  });

  it("returns sum of all passenger types", () => {
    // 2 adults + 2 children + 1 senior + 0 infants = 5
    expect(getTotalPassengers(VALID_FAMILY)).toBe(5);
  });

  it("includes infants in total", () => {
    // 2 adults + 0 children + 0 seniors + 1 infant = 3
    expect(getTotalPassengers(VALID_WITH_INFANT)).toBe(3);
  });

  it("handles all types populated", () => {
    const data: Passengers = {
      adults: 3,
      children: { count: 2, ages: [4, 8] },
      seniors: 2,
      infants: 1,
    };
    // 3 + 2 + 2 + 1 = 8
    expect(getTotalPassengers(data)).toBe(8);
  });
});
