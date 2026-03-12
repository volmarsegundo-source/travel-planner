/**
 * EVAL-AI-001: Schema Validation grader tests.
 *
 * Validates that AI-generated itineraries, guides and checklists
 * conform to their expected Zod schemas and pass semantic consistency checks.
 *
 * The grader uses Zod schemas that mirror production schemas in ai.service.ts.
 * Valid activityType enum: SIGHTSEEING, FOOD, TRANSPORT, ACCOMMODATION, LEISURE, SHOPPING
 * Guide is a Record<GuideSectionKey, GuideSectionData> (10 required keys).
 *
 * @module tests/evals/schema-validation
 */

import { describe, it, expect } from "vitest";
import {
  gradeSchemaValidation,
  gradeItinerarySemantic,
  gradeGuideSemantic,
} from "@/lib/evals/schema-validation.grader";

// ---------------------------------------------------------------------------
// Helpers: reusable fixture builders
// ---------------------------------------------------------------------------

function makeActivity(overrides: Record<string, unknown> = {}) {
  return {
    title: "Visit Eiffel Tower",
    description: "Iconic Parisian landmark",
    startTime: "09:00",
    endTime: "11:00",
    estimatedCost: 25,
    activityType: "SIGHTSEEING",
    ...overrides,
  };
}

function makeDay(dayNumber: number, date: string, overrides: Record<string, unknown> = {}) {
  return {
    dayNumber,
    date,
    theme: `Day ${dayNumber} theme`,
    activities: [makeActivity()],
    ...overrides,
  };
}

function makeItinerary(overrides: Record<string, unknown> = {}) {
  return {
    destination: "Paris, France",
    totalDays: 2,
    estimatedBudgetUsed: 500,
    currency: "USD",
    days: [
      makeDay(1, "2026-07-15"),
      makeDay(2, "2026-07-16", {
        theme: "Cultural Day",
        activities: [
          makeActivity({
            title: "Louvre Museum",
            description: "World's largest art museum",
            startTime: "10:00",
            endTime: "14:00",
            estimatedCost: 17,
          }),
        ],
      }),
    ],
    tips: ["Buy Metro pass for savings"],
    ...overrides,
  };
}

const GUIDE_SECTION_KEYS = [
  "timezone",
  "currency",
  "language",
  "electricity",
  "connectivity",
  "cultural_tips",
  "safety",
  "health",
  "transport_overview",
  "local_customs",
] as const;

const STAT_SECTIONS = new Set(["timezone", "currency", "language", "electricity"]);

function makeGuideSectionData(key: string) {
  const type = STAT_SECTIONS.has(key) ? "stat" : "content";
  return {
    title: `${key} title`,
    value: type === "stat" ? "Short val" : "A".repeat(60),
    tips: ["Tip 1"],
    type,
    ...(type === "content" ? { details: `Detailed info about ${key}` } : {}),
  };
}

function makeGuide(): Record<string, unknown> {
  const guide: Record<string, unknown> = {};
  for (const key of GUIDE_SECTION_KEYS) {
    guide[key] = makeGuideSectionData(key);
  }
  return guide;
}

function makeChecklist() {
  return {
    items: [
      { id: "1", text: "Pack passport", category: "documents", priority: "essential", checked: false },
      { id: "2", text: "Book hotel", category: "accommodation", priority: "recommended", checked: true },
    ],
  };
}

// ---------------------------------------------------------------------------
// Itinerary schema validation
// ---------------------------------------------------------------------------

describe("EVAL-AI-001: Schema Validation", () => {
  describe("Itinerary schema", () => {
    it("passes for well-structured itinerary", () => {
      const result = gradeSchemaValidation(makeItinerary(), "itinerary");
      expect(result.pass).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.errors).toHaveLength(0);
    });

    it("reports errors for missing required field: destination", () => {
      const { destination, ...noDestination } = makeItinerary();
      const result = gradeSchemaValidation(noDestination, "itinerary");
      expect(result.score).toBeLessThan(1.0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("reports errors for missing required field: days array", () => {
      const { days, ...noDays } = makeItinerary();
      const result = gradeSchemaValidation(noDays, "itinerary");
      expect(result.score).toBeLessThan(1.0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("reports errors for invalid activityType enum", () => {
      const itinerary = makeItinerary({
        days: [
          makeDay(1, "2026-07-15", {
            activities: [makeActivity({ activityType: "BUNGEE_JUMPING" })],
          }),
        ],
        totalDays: 1,
      });
      const result = gradeSchemaValidation(itinerary, "itinerary");
      expect(result.score).toBeLessThan(1.0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("reports errors for invalid time format", () => {
      const itinerary = makeItinerary({
        days: [
          makeDay(1, "2026-07-15", {
            activities: [makeActivity({ startTime: "9AM", endTime: "11AM" })],
          }),
        ],
        totalDays: 1,
      });
      const result = gradeSchemaValidation(itinerary, "itinerary");
      expect(result.score).toBeLessThan(1.0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("fails with strict threshold for empty days array", () => {
      const result = gradeSchemaValidation(
        makeItinerary({ days: [], totalDays: 0 }),
        "itinerary",
        1.0
      );
      expect(result.pass).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("accepts all valid activityType values", () => {
      const validTypes = ["SIGHTSEEING", "FOOD", "TRANSPORT", "ACCOMMODATION", "LEISURE", "SHOPPING"];
      for (const type of validTypes) {
        const itinerary = makeItinerary({
          days: [makeDay(1, "2026-07-15", { activities: [makeActivity({ activityType: type })] })],
          totalDays: 1,
        });
        const result = gradeSchemaValidation(itinerary, "itinerary");
        expect(result.pass).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Itinerary semantic checks
  // -------------------------------------------------------------------------

  describe("Itinerary semantic checks", () => {
    it("detects non-sequential day numbers", () => {
      const itinerary = makeItinerary({
        days: [makeDay(1, "2026-07-15"), makeDay(3, "2026-07-16")],
      });
      const result = gradeItinerarySemantic(itinerary);
      expect(result.pass).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("detects totalDays mismatch", () => {
      const itinerary = makeItinerary({ totalDays: 5 }); // only 2 days in array
      const result = gradeItinerarySemantic(itinerary);
      expect(result.pass).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes("totaldays"))).toBe(true);
    });

    it("detects time ordering issues within a day", () => {
      const itinerary = makeItinerary({
        days: [
          makeDay(1, "2026-07-15", {
            activities: [
              makeActivity({ startTime: "09:00", endTime: "11:00" }),
              makeActivity({ title: "Late activity", startTime: "10:00", endTime: "12:00" }),
            ],
          }),
        ],
        totalDays: 1,
      });
      const result = gradeItinerarySemantic(itinerary);
      expect(result.pass).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("passes for semantically valid itinerary", () => {
      const result = gradeItinerarySemantic(makeItinerary());
      expect(result.pass).toBe(true);
      expect(result.score).toBe(1.0);
    });
  });

  // -------------------------------------------------------------------------
  // Guide schema validation
  // -------------------------------------------------------------------------

  describe("Guide schema", () => {
    it("passes for valid guide with all 10 sections", () => {
      const guide = makeGuide();
      const result = gradeSchemaValidation(guide, "guide");
      expect(result.pass).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("reports errors for guide missing sections", () => {
      const guide = makeGuide();
      delete (guide as Record<string, unknown>).timezone;
      delete (guide as Record<string, unknown>).currency;
      delete (guide as Record<string, unknown>).safety;
      const result = gradeSchemaValidation(guide, "guide");
      expect(result.score).toBeLessThan(1.0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("fails with strict threshold for empty guide object", () => {
      const result = gradeSchemaValidation({}, "guide", 1.0);
      expect(result.pass).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Guide semantic checks
  // -------------------------------------------------------------------------

  describe("Guide semantic checks", () => {
    it("detects stat sections with overly long values", () => {
      const guide = makeGuide();
      (guide.timezone as Record<string, unknown>).value = "A".repeat(200);
      (guide.currency as Record<string, unknown>).value = "B".repeat(200);
      const result = gradeGuideSemantic(guide);
      expect(result.pass).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("passes for semantically valid guide", () => {
      const result = gradeGuideSemantic(makeGuide());
      expect(result.pass).toBe(true);
      expect(result.score).toBe(1.0);
    });
  });

  // -------------------------------------------------------------------------
  // Checklist validation
  // -------------------------------------------------------------------------

  describe("Checklist schema", () => {
    it("passes for valid checklist", () => {
      const result = gradeSchemaValidation(makeChecklist(), "checklist");
      expect(result.pass).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("fails with strict threshold for empty checklist items", () => {
      const result = gradeSchemaValidation({ items: [] }, "checklist", 1.0);
      expect(result.pass).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
