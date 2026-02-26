/**
 * Unit tests for TripCreateSchema and TripUpdateSchema.
 *
 * These schemas have no external dependencies — no mocks required.
 * Constants are imported from @/lib/constants to keep tests aligned
 * with the real limits and prevent drift if limits change.
 */
import { describe, it, expect } from "vitest";
import { TripCreateSchema, TripUpdateSchema } from "@/lib/validations/trip.schema";
import {
  MAX_TRIP_TITLE_LENGTH,
  MAX_TRIP_DESCRIPTION_LENGTH,
  MAX_TRIP_DESTINATION_LENGTH,
} from "@/lib/constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the minimum valid create payload. */
function validCreateInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    title: "Tokyo Adventure",
    destination: "Tokyo, Japan",
    ...overrides,
  };
}

// ─── TripCreateSchema ─────────────────────────────────────────────────────────

describe("TripCreateSchema", () => {
  // ─── Happy path ─────────────────────────────────────────────────────────────

  describe("valid inputs", () => {
    it("accepts minimum valid payload (title + destination only)", () => {
      const result = TripCreateSchema.safeParse(validCreateInput());
      expect(result.success).toBe(true);
    });

    it("accepts full valid payload with all optional fields", () => {
      const result = TripCreateSchema.safeParse(
        validCreateInput({
          description: "A two-week exploration of Japan.",
          startDate: "2026-06-01",
          endDate: "2026-06-15",
          coverGradient: "ocean",
          coverEmoji: "🗾",
        })
      );
      expect(result.success).toBe(true);
    });

    it("applies default coverGradient 'sunset' when omitted", () => {
      const result = TripCreateSchema.safeParse(validCreateInput());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coverGradient).toBe("sunset");
      }
    });

    it("applies default coverEmoji '✈️' when omitted", () => {
      const result = TripCreateSchema.safeParse(validCreateInput());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coverEmoji).toBe("✈️");
      }
    });

    it("preserves provided coverGradient and coverEmoji", () => {
      const result = TripCreateSchema.safeParse(
        validCreateInput({ coverGradient: "forest", coverEmoji: "🌲" })
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coverGradient).toBe("forest");
        expect(result.data.coverEmoji).toBe("🌲");
      }
    });

    it("accepts title at exactly MAX_TRIP_TITLE_LENGTH characters", () => {
      const title = "a".repeat(MAX_TRIP_TITLE_LENGTH);
      const result = TripCreateSchema.safeParse(validCreateInput({ title }));
      expect(result.success).toBe(true);
    });

    it("accepts destination at exactly MAX_TRIP_DESTINATION_LENGTH characters", () => {
      const destination = "a".repeat(MAX_TRIP_DESTINATION_LENGTH);
      const result = TripCreateSchema.safeParse(validCreateInput({ destination }));
      expect(result.success).toBe(true);
    });

    it("accepts description at exactly MAX_TRIP_DESCRIPTION_LENGTH characters", () => {
      const description = "a".repeat(MAX_TRIP_DESCRIPTION_LENGTH);
      const result = TripCreateSchema.safeParse(validCreateInput({ description }));
      expect(result.success).toBe(true);
    });

    it("accepts same startDate and endDate (single-day trip)", () => {
      const result = TripCreateSchema.safeParse(
        validCreateInput({ startDate: "2026-07-04", endDate: "2026-07-04" })
      );
      expect(result.success).toBe(true);
    });

    it("accepts startDate without endDate", () => {
      const result = TripCreateSchema.safeParse(
        validCreateInput({ startDate: "2026-08-01" })
      );
      expect(result.success).toBe(true);
    });

    it("accepts endDate without startDate", () => {
      const result = TripCreateSchema.safeParse(
        validCreateInput({ endDate: "2026-08-31" })
      );
      expect(result.success).toBe(true);
    });

    it("coerces ISO date strings to Date objects", () => {
      const result = TripCreateSchema.safeParse(
        validCreateInput({ startDate: "2026-09-01", endDate: "2026-09-10" })
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date);
        expect(result.data.endDate).toBeInstanceOf(Date);
      }
    });
  });

  // ─── title validation ────────────────────────────────────────────────────────

  describe("title field", () => {
    it("rejects missing title", () => {
      const result = TripCreateSchema.safeParse({ destination: "Paris, France" });
      expect(result.success).toBe(false);
    });

    it("rejects empty title", () => {
      const result = TripCreateSchema.safeParse(validCreateInput({ title: "" }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain("title");
      }
    });

    it("rejects title exceeding MAX_TRIP_TITLE_LENGTH characters", () => {
      const title = "a".repeat(MAX_TRIP_TITLE_LENGTH + 1);
      const result = TripCreateSchema.safeParse(validCreateInput({ title }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain("title");
      }
    });
  });

  // ─── destination validation ──────────────────────────────────────────────────

  describe("destination field", () => {
    it("rejects missing destination", () => {
      const result = TripCreateSchema.safeParse({ title: "Rome Trip" });
      expect(result.success).toBe(false);
    });

    it("rejects empty destination", () => {
      const result = TripCreateSchema.safeParse(validCreateInput({ destination: "" }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain("destination");
      }
    });

    it("rejects destination exceeding MAX_TRIP_DESTINATION_LENGTH characters", () => {
      const destination = "a".repeat(MAX_TRIP_DESTINATION_LENGTH + 1);
      const result = TripCreateSchema.safeParse(validCreateInput({ destination }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain("destination");
      }
    });
  });

  // ─── description validation ──────────────────────────────────────────────────

  describe("description field", () => {
    it("accepts undefined description (field is optional)", () => {
      const result = TripCreateSchema.safeParse(validCreateInput());
      expect(result.success).toBe(true);
    });

    it("rejects description exceeding MAX_TRIP_DESCRIPTION_LENGTH characters", () => {
      const description = "a".repeat(MAX_TRIP_DESCRIPTION_LENGTH + 1);
      const result = TripCreateSchema.safeParse(validCreateInput({ description }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain("description");
      }
    });
  });

  // ─── date validation ─────────────────────────────────────────────────────────

  describe("date validation", () => {
    it("rejects endDate before startDate", () => {
      const result = TripCreateSchema.safeParse(
        validCreateInput({ startDate: "2026-10-15", endDate: "2026-10-10" })
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain("endDate");
      }
    });

    it("includes 'End date must be after start date' message when dates are inverted", () => {
      const result = TripCreateSchema.safeParse(
        validCreateInput({ startDate: "2026-12-31", endDate: "2026-12-01" })
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain("End date must be after start date");
      }
    });

    it("rejects non-date string for startDate", () => {
      const result = TripCreateSchema.safeParse(
        validCreateInput({ startDate: "not-a-date" })
      );
      expect(result.success).toBe(false);
    });

    it("rejects non-date string for endDate", () => {
      const result = TripCreateSchema.safeParse(
        validCreateInput({ endDate: "not-a-date" })
      );
      expect(result.success).toBe(false);
    });
  });

  // ─── optional fields ─────────────────────────────────────────────────────────

  describe("optional fields", () => {
    it("accepts payload without coverGradient (gets default)", () => {
      const { coverGradient: _cg, ...base } = validCreateInput() as { coverGradient?: string };
      const result = TripCreateSchema.safeParse(base);
      expect(result.success).toBe(true);
    });

    it("accepts payload without coverEmoji (gets default)", () => {
      const { coverEmoji: _ce, ...base } = validCreateInput() as { coverEmoji?: string };
      const result = TripCreateSchema.safeParse(base);
      expect(result.success).toBe(true);
    });
  });
});

// ─── TripUpdateSchema ─────────────────────────────────────────────────────────

describe("TripUpdateSchema", () => {
  // ─── All fields optional ─────────────────────────────────────────────────────

  describe("all fields are optional", () => {
    it("accepts empty object (no-op update)", () => {
      const result = TripUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts partial update with only title", () => {
      const result = TripUpdateSchema.safeParse({ title: "New Title" });
      expect(result.success).toBe(true);
    });

    it("accepts partial update with only status", () => {
      const result = TripUpdateSchema.safeParse({ status: "ACTIVE" });
      expect(result.success).toBe(true);
    });

    it("accepts partial update with only visibility", () => {
      const result = TripUpdateSchema.safeParse({ visibility: "PUBLIC" });
      expect(result.success).toBe(true);
    });
  });

  // ─── status enum ─────────────────────────────────────────────────────────────

  describe("status enum", () => {
    const validStatuses = ["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;

    for (const status of validStatuses) {
      it(`accepts status '${status}'`, () => {
        const result = TripUpdateSchema.safeParse({ status });
        expect(result.success).toBe(true);
      });
    }

    it("rejects invalid status value", () => {
      const result = TripUpdateSchema.safeParse({ status: "UNKNOWN" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain("status");
      }
    });

    it("rejects lowercase status value", () => {
      const result = TripUpdateSchema.safeParse({ status: "active" });
      expect(result.success).toBe(false);
    });
  });

  // ─── visibility enum ──────────────────────────────────────────────────────────

  describe("visibility enum", () => {
    const validVisibilities = ["PRIVATE", "PUBLIC", "SHARED"] as const;

    for (const visibility of validVisibilities) {
      it(`accepts visibility '${visibility}'`, () => {
        const result = TripUpdateSchema.safeParse({ visibility });
        expect(result.success).toBe(true);
      });
    }

    it("rejects invalid visibility value", () => {
      const result = TripUpdateSchema.safeParse({ visibility: "FRIENDS_ONLY" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain("visibility");
      }
    });

    it("rejects lowercase visibility value", () => {
      const result = TripUpdateSchema.safeParse({ visibility: "private" });
      expect(result.success).toBe(false);
    });
  });

  // ─── field length limits ──────────────────────────────────────────────────────

  describe("field length limits", () => {
    it("accepts title at exactly MAX_TRIP_TITLE_LENGTH characters", () => {
      const result = TripUpdateSchema.safeParse({
        title: "a".repeat(MAX_TRIP_TITLE_LENGTH),
      });
      expect(result.success).toBe(true);
    });

    it("rejects title exceeding MAX_TRIP_TITLE_LENGTH characters", () => {
      const result = TripUpdateSchema.safeParse({
        title: "a".repeat(MAX_TRIP_TITLE_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty title when title is provided (min 1)", () => {
      const result = TripUpdateSchema.safeParse({ title: "" });
      expect(result.success).toBe(false);
    });

    it("rejects destination exceeding MAX_TRIP_DESTINATION_LENGTH characters", () => {
      const result = TripUpdateSchema.safeParse({
        destination: "a".repeat(MAX_TRIP_DESTINATION_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it("rejects description exceeding MAX_TRIP_DESCRIPTION_LENGTH characters", () => {
      const result = TripUpdateSchema.safeParse({
        description: "a".repeat(MAX_TRIP_DESCRIPTION_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── date validation ──────────────────────────────────────────────────────────

  describe("date validation", () => {
    it("accepts valid startDate and endDate as ISO strings", () => {
      const result = TripUpdateSchema.safeParse({
        startDate: "2026-03-01",
        endDate: "2026-03-14",
      });
      expect(result.success).toBe(true);
    });

    it("coerces ISO date strings to Date objects in update payload", () => {
      const result = TripUpdateSchema.safeParse({
        startDate: "2026-04-01",
        endDate: "2026-04-07",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date);
        expect(result.data.endDate).toBeInstanceOf(Date);
      }
    });

    it("rejects non-date string for startDate in update", () => {
      const result = TripUpdateSchema.safeParse({ startDate: "not-a-date" });
      expect(result.success).toBe(false);
    });

    it("rejects non-date string for endDate in update", () => {
      const result = TripUpdateSchema.safeParse({ endDate: "not-a-date" });
      expect(result.success).toBe(false);
    });
  });

  // ─── full update payload ──────────────────────────────────────────────────────

  describe("full update payload", () => {
    it("accepts all fields provided simultaneously", () => {
      const result = TripUpdateSchema.safeParse({
        title: "Updated Trip",
        destination: "Barcelona, Spain",
        description: "Sun and architecture.",
        startDate: "2026-07-01",
        endDate: "2026-07-14",
        coverGradient: "sand",
        coverEmoji: "🏖️",
        status: "ACTIVE",
        visibility: "SHARED",
      });
      expect(result.success).toBe(true);
    });
  });
});
