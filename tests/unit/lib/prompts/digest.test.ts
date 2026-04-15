/**
 * Unit tests for `src/lib/prompts/digest.ts` — pure digest functions.
 *
 * All tests are deterministic and require no mocks for core logic.
 * `sanitizeForPrompt` is mocked to isolate digest logic from injection-guard
 * behaviour (covered by its own test file).
 *
 * Spec ref: SPEC-AI-REORDER-PHASES §1.5
 * @version 1.0.0
 */
import { describe, it, expect, vi } from "vitest";

// ─── Mock injection-guard (pass-through) ─────────────────────────────────────
// We mock sanitizeForPrompt to return the input unchanged so digest tests
// focus on field extraction logic, not injection detection.

vi.mock("@/lib/prompts/injection-guard", () => ({
  sanitizeForPrompt: (text: string) => text,
  checkPromptInjection: () => ({ safe: true, sanitized: "", warnings: [] }),
}));

// ─── Import SUT after mock ────────────────────────────────────────────────────

import {
  buildGuideDigest,
  formatGuideDigest,
  buildItineraryDigest,
  buildLogisticsDigest,
  type RawGuideContent,
  type RawItineraryDay,
  type RawTransportSegment,
  type RawAccommodation,
} from "@/lib/prompts/digest";

// ─── buildGuideDigest ─────────────────────────────────────────────────────────

describe("buildGuideDigest", () => {
  function makeFullGuide(): RawGuideContent {
    return {
      quickFacts: {
        climate: "Tropical, 22-30°C in April",
        plugType: "Type G, 230V",
        currency: "BRL",
        dialCode: "+55",
      },
      safety: {
        level: "moderate",
        vaccines: "None required; yellow fever recommended",
      },
      mustSee: [
        { category: "culture", name: "Historic Centre" },
        { category: "food", name: "Local Market" },
        { category: "nature", name: "National Park" },
        { category: "art", name: "Museum" }, // 4th — should be excluded
      ],
    };
  }

  it("extracts climate from quickFacts", () => {
    const digest = buildGuideDigest(makeFullGuide());
    expect(digest.climate).toBe("Tropical, 22-30°C in April");
  });

  it("extracts plugType from quickFacts", () => {
    const digest = buildGuideDigest(makeFullGuide());
    expect(digest.plugType).toBe("Type G, 230V");
  });

  it("extracts currencyLocal from quickFacts.currency", () => {
    const digest = buildGuideDigest(makeFullGuide());
    expect(digest.currencyLocal).toBe("BRL");
  });

  it("extracts dialCode from quickFacts", () => {
    const digest = buildGuideDigest(makeFullGuide());
    expect(digest.dialCode).toBe("+55");
  });

  it("extracts safetyLevel from safety.level", () => {
    const digest = buildGuideDigest(makeFullGuide());
    expect(digest.safetyLevel).toBe("moderate");
  });

  it("extracts vaccinesRequired from safety.vaccines", () => {
    const digest = buildGuideDigest(makeFullGuide());
    expect(digest.vaccinesRequired).toBe("None required; yellow fever recommended");
  });

  it("extracts at most 3 top categories from mustSee", () => {
    const digest = buildGuideDigest(makeFullGuide());
    expect(digest.topCategories).toHaveLength(3);
    expect(digest.topCategories).toEqual(["culture", "food", "nature"]);
  });

  it("defaults safetyLevel to 'moderate' when not a valid value", () => {
    const guide: RawGuideContent = {
      safety: { level: "unknown" as "safe" },
    };
    const digest = buildGuideDigest(guide);
    expect(digest.safetyLevel).toBe("moderate");
  });

  it("handles empty quickFacts gracefully", () => {
    const digest = buildGuideDigest({});
    expect(digest.climate).toBe("");
    expect(digest.currencyLocal).toBe("");
    expect(digest.topCategories).toEqual([]);
  });

  it("falls back to section keys when mustSee is empty", () => {
    const guide: RawGuideContent = {
      sections: [
        { key: "history" },
        { key: "cuisine" },
        { key: "transport_overview" },
        { key: "safety" }, // 4th — excluded
      ],
    };
    const digest = buildGuideDigest(guide);
    expect(digest.topCategories).toHaveLength(3);
    expect(digest.topCategories).toContain("history");
  });

  it("returns all three valid safetyLevel values", () => {
    for (const level of ["safe", "moderate", "caution"] as const) {
      const digest = buildGuideDigest({ safety: { level } });
      expect(digest.safetyLevel).toBe(level);
    }
  });
});

// ─── formatGuideDigest ────────────────────────────────────────────────────────

describe("formatGuideDigest", () => {
  it("includes header line", () => {
    const digest = buildGuideDigest({
      quickFacts: { climate: "Tropical", currency: "BRL" },
      safety: { level: "safe" },
    });
    const formatted = formatGuideDigest(digest);
    expect(formatted).toContain("Destination summary from Guide");
  });

  it("includes currency with usage instruction", () => {
    const digest = buildGuideDigest({
      quickFacts: { currency: "EUR" },
      safety: { level: "safe" },
    });
    const formatted = formatGuideDigest(digest);
    expect(formatted).toContain("EUR");
    expect(formatted).toContain("estimatedCost");
  });

  it("omits empty fields", () => {
    const digest = buildGuideDigest({ safety: { level: "safe" } });
    const formatted = formatGuideDigest(digest);
    expect(formatted).not.toContain("Climate");
    expect(formatted).not.toContain("Plug type");
  });

  it("includes safety level always", () => {
    const digest = buildGuideDigest({ safety: { level: "caution" } });
    const formatted = formatGuideDigest(digest);
    expect(formatted).toContain("caution");
  });
});

// ─── buildItineraryDigest ─────────────────────────────────────────────────────

describe("buildItineraryDigest", () => {
  function makeDay(types: string[], isTransit = false): RawItineraryDay {
    return {
      isTransit,
      activities: types.map((t) => ({ activityType: t, title: `Activity ${t}` })),
    };
  }

  it("counts total days including transit", () => {
    const days: RawItineraryDay[] = [
      makeDay(["SIGHTSEEING"]),
      makeDay([], true),
      makeDay(["FOOD"]),
    ];
    const digest = buildItineraryDigest(days);
    expect(digest.totalDays).toBe(3);
  });

  it("counts transit days separately", () => {
    const days: RawItineraryDay[] = [
      makeDay(["SIGHTSEEING"]),
      makeDay([], true),
      makeDay([], true),
    ];
    const digest = buildItineraryDigest(days);
    expect(digest.transitDaysCount).toBe(2);
  });

  it("detects beach day", () => {
    const days = [makeDay(["BEACH"])];
    expect(buildItineraryDigest(days).hasBeachDay).toBe(true);
  });

  it("detects hike day", () => {
    const days = [makeDay(["HIKING"])];
    expect(buildItineraryDigest(days).hasHikeDay).toBe(true);
  });

  it("detects nightlife evening", () => {
    const days = [makeDay(["NIGHTLIFE"])];
    expect(buildItineraryDigest(days).hasNightlifeEvening).toBe(true);
  });

  it("detects religious site", () => {
    const days = [makeDay(["RELIGIOUS"])];
    expect(buildItineraryDigest(days).hasReligiousSite).toBe(true);
  });

  it("detects museum day", () => {
    const days = [makeDay(["MUSEUM"])];
    expect(buildItineraryDigest(days).hasMuseumDay).toBe(true);
  });

  it("assigns high intensity when hiking is present", () => {
    const days = [makeDay(["HIKING", "FOOD"])];
    expect(buildItineraryDigest(days).highestIntensity).toBe("high");
  });

  it("assigns moderate intensity for sightseeing without high-intensity activities", () => {
    const days = [makeDay(["SIGHTSEEING", "FOOD"])];
    expect(buildItineraryDigest(days).highestIntensity).toBe("moderate");
  });

  it("assigns low intensity for days with no recognised types", () => {
    const days = [makeDay(["UNKNOWN_TYPE"])];
    expect(buildItineraryDigest(days).highestIntensity).toBe("low");
  });

  it("collects distinct activity types (up to 10)", () => {
    const types = Array.from({ length: 15 }, (_, i) => `TYPE_${i}`);
    const days = [makeDay(types)];
    const digest = buildItineraryDigest(days);
    expect(digest.activityTypesUsed.length).toBeLessThanOrEqual(10);
  });

  it("skips activities with null activityType", () => {
    const days: RawItineraryDay[] = [
      { activities: [{ activityType: null }] },
    ];
    const digest = buildItineraryDigest(days);
    expect(digest.activityTypesUsed).toHaveLength(0);
  });

  it("returns all false flags for empty days", () => {
    const digest = buildItineraryDigest([]);
    expect(digest.hasBeachDay).toBe(false);
    expect(digest.hasHikeDay).toBe(false);
    expect(digest.hasNightlifeEvening).toBe(false);
    expect(digest.hasReligiousSite).toBe(false);
    expect(digest.hasMuseumDay).toBe(false);
    expect(digest.transitDaysCount).toBe(0);
    expect(digest.totalDays).toBe(0);
  });
});

// ─── buildLogisticsDigest ─────────────────────────────────────────────────────

describe("buildLogisticsDigest", () => {
  function makeTransport(type: string): RawTransportSegment {
    return { transportType: type };
  }

  function makeAccommodation(type: string): RawAccommodation {
    return { accommodationType: type };
  }

  it("extracts transport modes", () => {
    const transport = [makeTransport("flight"), makeTransport("bus")];
    const digest = buildLogisticsDigest(transport, [], []);
    expect(digest.transportModes).toContain("flight");
    expect(digest.transportModes).toContain("bus");
  });

  it("extracts accommodation types", () => {
    const accommodations = [makeAccommodation("hotel"), makeAccommodation("airbnb")];
    const digest = buildLogisticsDigest([], accommodations, []);
    expect(digest.accommodationTypes).toContain("hotel");
    expect(digest.accommodationTypes).toContain("airbnb");
  });

  it("extracts local mobility", () => {
    const digest = buildLogisticsDigest([], [], ["metro", "walking"]);
    expect(digest.mobility).toContain("metro");
    expect(digest.mobility).toContain("walking");
  });

  it("detects international flight when transport type is 'flight'", () => {
    const digest = buildLogisticsDigest([makeTransport("flight")], [], []);
    expect(digest.hasInternationalFlight).toBe(true);
  });

  it("detects international flight when transport type is 'plane'", () => {
    const digest = buildLogisticsDigest([makeTransport("plane")], [], []);
    expect(digest.hasInternationalFlight).toBe(true);
  });

  it("detects rental car", () => {
    const digest = buildLogisticsDigest([makeTransport("car")], [], []);
    expect(digest.hasRentalCar).toBe(true);
  });

  it("does not flag hasInternationalFlight for bus transport", () => {
    const digest = buildLogisticsDigest([makeTransport("bus")], [], []);
    expect(digest.hasInternationalFlight).toBe(false);
  });

  it("caps transport modes at 6", () => {
    const transport = Array.from({ length: 10 }, (_, i) =>
      makeTransport(`mode_${i}`)
    );
    const digest = buildLogisticsDigest(transport, [], []);
    expect(digest.transportModes.length).toBeLessThanOrEqual(6);
  });

  it("returns empty arrays when no logistics data", () => {
    const digest = buildLogisticsDigest([], [], []);
    expect(digest.transportModes).toHaveLength(0);
    expect(digest.accommodationTypes).toHaveLength(0);
    expect(digest.mobility).toHaveLength(0);
    expect(digest.hasRentalCar).toBe(false);
    expect(digest.hasInternationalFlight).toBe(false);
  });
});
