/**
 * Sprint 44 Wave 2 — Checklist prompt v2.0.0 tests.
 *
 * Tests cover:
 * - buildChecklistV2UserPrompt: trip basics always present
 * - Optional sections emitted only when upstream data is present
 * - Graceful degradation: no upstream data → only trip_basics block
 * - All optional upstream fields render correctly when provided
 *
 * Spec ref: SPEC-AI-REORDER-PHASES §5 (checklist v2 prompt design)
 */
import { describe, it, expect } from "vitest";
import { checklistPrompt, checklistPromptV1 } from "@/lib/prompts/checklist.prompt";
import type { ChecklistV2Params, ChecklistParams } from "@/lib/prompts/types";

// ─── Base fixture ─────────────────────────────────────────────────────────────

const BASE_V2: ChecklistV2Params = {
  destination: "Tokyo, Japan",
  tripType: "international",
  dates: "2026-09-01 to 2026-09-10",
  travelers: "2 adults",
  language: "en",
};

// ─── Trip basics ──────────────────────────────────────────────────────────────

describe("checklistPrompt v2.0.0 — trip basics", () => {
  it("always emits <trip_basics> block", () => {
    const prompt = checklistPrompt.buildUserPrompt(BASE_V2);
    expect(prompt).toContain("<trip_basics>");
    expect(prompt).toContain("</trip_basics>");
  });

  it("includes destination, tripType, dates, travelers, language in trip_basics", () => {
    const prompt = checklistPrompt.buildUserPrompt(BASE_V2);
    expect(prompt).toContain("<destination>Tokyo, Japan</destination>");
    expect(prompt).toContain("<trip_type>international</trip_type>");
    expect(prompt).toContain("<dates>2026-09-01 to 2026-09-10</dates>");
    expect(prompt).toContain("<travelers>2 adults</travelers>");
    expect(prompt).toContain("<language>en</language>");
  });

  it("renders pt-BR language tag correctly", () => {
    const prompt = checklistPrompt.buildUserPrompt({ ...BASE_V2, language: "pt-BR" });
    expect(prompt).toContain("<language>pt-BR</language>");
  });
});

// ─── Graceful degradation — no upstream data ─────────────────────────────────

describe("checklistPrompt v2.0.0 — graceful degradation (no upstream data)", () => {
  it("omits destination_facts_from_guide when not provided", () => {
    const prompt = checklistPrompt.buildUserPrompt(BASE_V2);
    expect(prompt).not.toContain("<destination_facts_from_guide>");
  });

  it("omits itinerary_highlights_from_roteiro when not provided", () => {
    const prompt = checklistPrompt.buildUserPrompt(BASE_V2);
    expect(prompt).not.toContain("<itinerary_highlights_from_roteiro>");
  });

  it("omits logistics_from_phase5 when not provided", () => {
    const prompt = checklistPrompt.buildUserPrompt(BASE_V2);
    expect(prompt).not.toContain("<logistics_from_phase5>");
  });

  it("omits user_prefs when not provided", () => {
    const prompt = checklistPrompt.buildUserPrompt(BASE_V2);
    expect(prompt).not.toContain("<user_prefs>");
  });

  it("prompt with only trip_basics does not exceed reasonable length (no bloat)", () => {
    const prompt = checklistPrompt.buildUserPrompt(BASE_V2);
    expect(prompt.length).toBeLessThan(300);
  });
});

// ─── Destination facts from Guide ─────────────────────────────────────────────

describe("checklistPrompt v2.0.0 — destinationFactsFromGuide", () => {
  it("emits block when guide data is present", () => {
    const prompt = checklistPrompt.buildUserPrompt({
      ...BASE_V2,
      destinationFactsFromGuide: {
        climate: "Humid subtropical, hot in September",
        plugType: "Type A/B (100V)",
        currencyLocal: "JPY — ¥",
        safetyLevel: "safe",
        vaccines: "No mandatory vaccines",
      },
    });
    expect(prompt).toContain("<destination_facts_from_guide>");
    expect(prompt).toContain("<climate>Humid subtropical, hot in September</climate>");
    expect(prompt).toContain("<plug_type>Type A/B (100V)</plug_type>");
    expect(prompt).toContain("<currency_local>JPY — ¥</currency_local>");
    expect(prompt).toContain("<safety_level>safe</safety_level>");
    expect(prompt).toContain("<vaccines>No mandatory vaccines</vaccines>");
    expect(prompt).toContain("</destination_facts_from_guide>");
  });

  it("omits block when guide object has no truthy values", () => {
    const prompt = checklistPrompt.buildUserPrompt({
      ...BASE_V2,
      destinationFactsFromGuide: {},
    });
    expect(prompt).not.toContain("<destination_facts_from_guide>");
  });

  it("renders only provided fields — omits missing ones", () => {
    const prompt = checklistPrompt.buildUserPrompt({
      ...BASE_V2,
      destinationFactsFromGuide: {
        climate: "Tropical",
        // plugType intentionally absent
      },
    });
    expect(prompt).toContain("<climate>Tropical</climate>");
    expect(prompt).not.toContain("<plug_type>");
  });
});

// ─── Itinerary highlights from Roteiro ───────────────────────────────────────

describe("checklistPrompt v2.0.0 — itineraryHighlightsFromRoteiro", () => {
  it("emits block when itinerary data is present", () => {
    const prompt = checklistPrompt.buildUserPrompt({
      ...BASE_V2,
      itineraryHighlightsFromRoteiro: {
        totalDays: 9,
        activityTypes: ["SIGHTSEEING", "FOOD", "CULTURE"],
        hasBeachDay: false,
        hasHikeDay: true,
        intensity: "moderate",
      },
    });
    expect(prompt).toContain("<itinerary_highlights_from_roteiro>");
    expect(prompt).toContain("<total_days>9</total_days>");
    expect(prompt).toContain("<activity_types>SIGHTSEEING, FOOD, CULTURE</activity_types>");
    expect(prompt).toContain("<has_beach_day>false</has_beach_day>");
    expect(prompt).toContain("<has_hike_day>true</has_hike_day>");
    expect(prompt).toContain("<intensity>moderate</intensity>");
    expect(prompt).toContain("</itinerary_highlights_from_roteiro>");
  });

  it("omits block when itinerary object has only undefined values", () => {
    const prompt = checklistPrompt.buildUserPrompt({
      ...BASE_V2,
      itineraryHighlightsFromRoteiro: {},
    });
    expect(prompt).not.toContain("<itinerary_highlights_from_roteiro>");
  });
});

// ─── Logistics from Phase 5 ───────────────────────────────────────────────────

describe("checklistPrompt v2.0.0 — logisticsFromPhase5", () => {
  it("emits block when logistics data is present", () => {
    const prompt = checklistPrompt.buildUserPrompt({
      ...BASE_V2,
      logisticsFromPhase5: {
        transportModes: ["flight", "train"],
        accommodationTypes: ["hotel"],
        hasRentalCar: false,
        hasInternationalFlight: true,
      },
    });
    expect(prompt).toContain("<logistics_from_phase5>");
    expect(prompt).toContain("<transport_modes>flight, train</transport_modes>");
    expect(prompt).toContain("<accommodation_types>hotel</accommodation_types>");
    expect(prompt).toContain("<has_rental_car>false</has_rental_car>");
    expect(prompt).toContain("<has_international_flight>true</has_international_flight>");
    expect(prompt).toContain("</logistics_from_phase5>");
  });

  it("omits block when logistics has only empty arrays", () => {
    // Empty arrays are falsy for block inclusion
    const prompt = checklistPrompt.buildUserPrompt({
      ...BASE_V2,
      logisticsFromPhase5: {
        transportModes: [],
        accommodationTypes: [],
        mobility: [],
      },
    });
    expect(prompt).not.toContain("<logistics_from_phase5>");
  });
});

// ─── User preferences ────────────────────────────────────────────────────────

describe("checklistPrompt v2.0.0 — userPrefs", () => {
  it("emits user_prefs block when provided", () => {
    const prompt = checklistPrompt.buildUserPrompt({
      ...BASE_V2,
      userPrefs: {
        dietary: "vegetarian",
        allergies: "nuts",
        regularMedication: true,
      },
    });
    expect(prompt).toContain("<user_prefs>");
    expect(prompt).toContain("<dietary>vegetarian</dietary>");
    expect(prompt).toContain("<allergies>nuts</allergies>");
    expect(prompt).toContain("<regular_medication>true</regular_medication>");
    expect(prompt).toContain("</user_prefs>");
  });

  it("uses 'none' and false defaults for missing pref sub-fields", () => {
    const prompt = checklistPrompt.buildUserPrompt({
      ...BASE_V2,
      userPrefs: {},
    });
    expect(prompt).toContain("<dietary>none</dietary>");
    expect(prompt).toContain("<allergies>none</allergies>");
    expect(prompt).toContain("<regular_medication>false</regular_medication>");
  });
});

// ─── Full enriched prompt ─────────────────────────────────────────────────────

describe("checklistPrompt v2.0.0 — fully enriched prompt", () => {
  it("emits all sections when all upstream data is provided", () => {
    const prompt = checklistPrompt.buildUserPrompt({
      ...BASE_V2,
      destinationFactsFromGuide: { climate: "Tropical", plugType: "Type A" },
      itineraryHighlightsFromRoteiro: { totalDays: 9, hasBeachDay: true },
      logisticsFromPhase5: { transportModes: ["flight"], hasInternationalFlight: true },
      userPrefs: { dietary: "vegan", regularMedication: false },
    });

    expect(prompt).toContain("<trip_basics>");
    expect(prompt).toContain("<destination_facts_from_guide>");
    expect(prompt).toContain("<itinerary_highlights_from_roteiro>");
    expect(prompt).toContain("<logistics_from_phase5>");
    expect(prompt).toContain("<user_prefs>");
  });
});

// ─── System prompt content ────────────────────────────────────────────────────

describe("checklistPrompt v2.0.0 — system prompt", () => {
  it("contains HARD RULES section", () => {
    expect(checklistPrompt.system).toContain("HARD RULES");
  });

  it("includes all 8 categories in the system prompt", () => {
    const sys = checklistPrompt.system;
    expect(sys).toContain("DOCUMENTS");
    expect(sys).toContain("HEALTH");
    expect(sys).toContain("CURRENCY");
    expect(sys).toContain("WEATHER");
    expect(sys).toContain("TECHNOLOGY");
    expect(sys).toContain("CLOTHING");
    expect(sys).toContain("ACTIVITIES");
    expect(sys).toContain("LOGISTICS");
  });

  it("requires reason and sourcePhase fields in output schema", () => {
    const sys = checklistPrompt.system;
    expect(sys).toContain("reason");
    expect(sys).toContain("sourcePhase");
  });
});

// ─── checklistPromptV1 backward compatibility ─────────────────────────────────

describe("checklistPromptV1 (legacy) — backward compatibility", () => {
  it("still works with minimal ChecklistParams", () => {
    const params: ChecklistParams = {
      destination: "Paris",
      month: "2026-07",
      travelers: 2,
      language: "en",
    };
    const prompt = checklistPromptV1.buildUserPrompt(params);
    expect(prompt).toContain("Paris");
    expect(prompt).toContain("2026-07");
    expect(prompt).toContain("2 traveler(s)");
    expect(prompt).toContain("Language: en");
  });

  it("v1 prompt does NOT contain XML block structure", () => {
    const params: ChecklistParams = {
      destination: "Paris",
      month: "2026-07",
      travelers: 1,
      language: "en",
    };
    const prompt = checklistPromptV1.buildUserPrompt(params);
    expect(prompt).not.toContain("<trip_basics>");
    expect(prompt).not.toContain("<destination>");
  });
});
