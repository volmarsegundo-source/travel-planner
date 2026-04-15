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

// ─── Sprint 44 Wave 4 — S44 context-chain & sanitization invariant ────────────
//
// These tests verify the invariant that digest output fields only contain
// benign values when the inputs are benign. The injection-guard is mocked
// to a pass-through in this file (see top), so the intent here is:
//   1. Benign inputs → benign outputs (structural invariant)
//   2. Output shape guarantees (no raw JSON, token-bounded fields)
//
// Full real-pipeline injection tests (where sanitizeForPrompt is NOT mocked)
// live in expedition-ai-context.service.test.ts and injection-resistance.eval.ts
//
// Spec ref: SPEC-QA-REORDER-PHASES §4.6, TC-AI-006

describe("Sprint 44 — digest sanitization structure invariant (TC-AI-006)", () => {
  it("buildGuideDigest: output fields are all strings (no objects or undefined leaked)", () => {
    const content: RawGuideContent = {
      quickFacts: { climate: "Sunny 25°C", plugType: "Type G", currency: "GBP", dialCode: "+44" },
      safety: { level: "safe", vaccines: "None" },
      mustSee: [{ category: "History", name: "Tower of London" }],
    };
    const digest = buildGuideDigest(content);

    // All scalar fields must be strings
    expect(typeof digest.climate).toBe("string");
    expect(typeof digest.plugType).toBe("string");
    expect(typeof digest.currencyLocal).toBe("string");
    expect(typeof digest.dialCode).toBe("string");
    expect(typeof digest.vaccinesRequired).toBe("string");
    expect(Array.isArray(digest.topCategories)).toBe(true);
    digest.topCategories.forEach((c) => expect(typeof c).toBe("string"));
  });

  it("buildGuideDigest: output fields are non-empty strings for non-empty inputs", () => {
    // Note: sanitizeForPrompt is mocked to pass-through in this file.
    // Token budget enforcement (maxLen) is validated by safeField() with the REAL guard.
    // This test confirms that non-empty inputs produce non-empty string outputs.
    const content: RawGuideContent = {
      quickFacts: { climate: "Sunny 25°C", plugType: "Type G", currency: "GBP" },
      safety: { vaccines: "None required" },
      mustSee: [{ category: "History" }],
    };
    const digest = buildGuideDigest(content);

    expect(digest.climate).toBe("Sunny 25°C");
    expect(digest.vaccinesRequired).toBe("None required");
    expect(digest.topCategories).toContain("History");
  });

  it("buildItineraryDigest: activityTypesUsed entries are all strings (no objects or nulls)", () => {
    // Note: sanitizeForPrompt is mocked to pass-through in this file.
    // The length cap (50) is enforced by safeField() only when the REAL guard runs.
    // This test confirms the type guarantee only — length is validated in integration tests.
    const days: RawItineraryDay[] = [
      {
        isTransit: false,
        activities: [{ activityType: "BEACH", title: null, notes: null }],
      },
    ];
    const digest = buildItineraryDigest(days);
    digest.activityTypesUsed.forEach((t) => {
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThan(0);
    });
  });

  it("buildItineraryDigest: activityTypesUsed has no duplicate entries", () => {
    const days: RawItineraryDay[] = [
      {
        isTransit: false,
        activities: [
          { activityType: "BEACH", title: null, notes: null },
          { activityType: "BEACH", title: null, notes: null }, // duplicate
          { activityType: "MUSEUM", title: null, notes: null },
        ],
      },
    ];
    const digest = buildItineraryDigest(days);
    const unique = new Set(digest.activityTypesUsed);
    expect(unique.size).toBe(digest.activityTypesUsed.length);
  });

  it("buildLogisticsDigest: transportModes has no duplicate entries", () => {
    const transport: RawTransportSegment[] = [
      { transportType: "flight", isReturn: false, departurePlace: null, arrivalPlace: null },
      { transportType: "flight", isReturn: true, departurePlace: null, arrivalPlace: null }, // duplicate
      { transportType: "hotel", isReturn: false, departurePlace: null, arrivalPlace: null },
    ];
    const digest = buildLogisticsDigest(transport, [], []);
    const unique = new Set(digest.transportModes);
    expect(unique.size).toBe(digest.transportModes.length);
  });

  it("buildLogisticsDigest: mobility entries are all strings (type guarantee)", () => {
    // Note: sanitizeForPrompt is mocked to pass-through in this file.
    // The 30-char cap is enforced by safeField() only when the REAL guard runs.
    // This test confirms the type guarantee — "walking" and "metro" survive as strings.
    const digest = buildLogisticsDigest([], [], ["walking", "metro", "uber"]);
    digest.mobility.forEach((m) => expect(typeof m).toBe("string"));
  });

  it("formatGuideDigest: output contains no JSON syntax characters ({}[])", () => {
    const digest = buildGuideDigest({
      quickFacts: { climate: "Sunny", plugType: "Type G", currency: "USD", dialCode: "+1" },
      safety: { level: "safe", vaccines: "None" },
      mustSee: [{ category: "Beaches" }],
    });
    const formatted = formatGuideDigest(digest);

    expect(formatted).not.toContain("{");
    expect(formatted).not.toContain("}");
    expect(formatted).not.toContain("[");
    expect(formatted).not.toContain("]");
  });

  it("digest pipeline is pure: same input → same output (deterministic)", () => {
    const content: RawGuideContent = {
      quickFacts: { climate: "Mild 20°C", plugType: "Type F", currency: "EUR", dialCode: "+49" },
      safety: { level: "safe", vaccines: "None required" },
      mustSee: [{ category: "Art", name: "Gallery" }],
    };

    const digest1 = buildGuideDigest(content);
    const digest2 = buildGuideDigest(content);
    expect(digest1).toEqual(digest2);
  });
});

// ─── Sprint 44 Wave 4 — context-chain phase dependency coverage ──────────────
//
// Verifies the "checklist consumes itinerary" chain at the digest layer:
// itinerary details that should influence checklist generation are captured.
// Spec ref: SPEC-QA-REORDER-PHASES §4.4, TC-AI-001, TC-AI-002

describe("Sprint 44 — context-chain digest captures itinerary signals (TC-AI-001, TC-AI-002)", () => {
  it("beach day → hasBeachDay flag propagates to checklist context", () => {
    const days: RawItineraryDay[] = [
      {
        isTransit: false,
        activities: [{ activityType: "BEACH", title: "Ipanema", notes: null }],
      },
    ];
    const digest = buildItineraryDigest(days);
    // This flag is what the checklist prompt uses to add sunscreen/swimwear
    expect(digest.hasBeachDay).toBe(true);
  });

  it("UK/Europe trip with no beach → hasBeachDay is false, hiking possible", () => {
    const days: RawItineraryDay[] = [
      {
        isTransit: false,
        activities: [
          { activityType: "MUSEUM", title: "British Museum", notes: null },
          { activityType: "HIKING", title: "Lake District", notes: null },
        ],
      },
    ];
    const digest = buildItineraryDigest(days);
    expect(digest.hasBeachDay).toBe(false);
    expect(digest.hasHikeDay).toBe(true);
  });

  it("guide digest for UK includes type G plug — adapter flag surfaces", () => {
    // TC-AI-002 assertion: checklist prompt receives plug type for adapter suggestion
    const content: RawGuideContent = {
      quickFacts: { plugType: "Type G, 230V", currency: "GBP", dialCode: "+44" },
      safety: { level: "safe" },
    };
    const digest = buildGuideDigest(content);
    expect(digest.plugType).toContain("Type G");
  });

  it("flight in logistics → hasInternationalFlight flag surfaces for checklist (adapter, visa, etc.)", () => {
    const transport: RawTransportSegment[] = [
      { transportType: "flight", isReturn: false, departurePlace: "GRU", arrivalPlace: "LHR" },
    ];
    const digest = buildLogisticsDigest(transport, [], []);
    expect(digest.hasInternationalFlight).toBe(true);
  });

  it("high-intensity itinerary surfaces in digest for packing context", () => {
    const days: RawItineraryDay[] = [
      {
        isTransit: false,
        activities: [
          { activityType: "HIKING", title: "Snowdon Trek", notes: null },
          { activityType: "TREKKING", title: "Brecon Beacons", notes: null },
        ],
      },
    ];
    const digest = buildItineraryDigest(days);
    expect(digest.highestIntensity).toBe("high");
    expect(digest.hasHikeDay).toBe(true);
  });
});
