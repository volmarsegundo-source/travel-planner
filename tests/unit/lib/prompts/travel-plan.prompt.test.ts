/**
 * Unit tests for travel-plan prompt template.
 *
 * Tests cover: traveler context XML generation (TASK-S33-011),
 * legacy expedition context backward compatibility,
 * prompt structure correctness.
 *
 * [SPEC-AI-004]
 */
import { describe, it, expect } from "vitest";
import { travelPlanPrompt, buildTravelerContext } from "@/lib/prompts/travel-plan.prompt";
import type { TravelPlanParams } from "@/lib/prompts/types";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_PARAMS: TravelPlanParams = {
  destination: "Roma, Italia",
  startDate: "2026-08-01",
  endDate: "2026-08-10",
  days: 10,
  travelStyle: "CULTURE",
  budgetTotal: 5000,
  budgetCurrency: "EUR",
  travelers: 2,
  language: "en",
  tokenBudget: 6500,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("travelPlanPrompt", () => {
  it("generates basic prompt without context", () => {
    const prompt = travelPlanPrompt.buildUserPrompt(BASE_PARAMS);
    expect(prompt).toContain("Roma, Italia");
    expect(prompt).toContain("2026-08-01 to 2026-08-10");
    expect(prompt).toContain("CULTURE");
    expect(prompt).toContain("5000 EUR");
    expect(prompt).toContain("2 person(s)");
    expect(prompt).toContain("6500");
  });

  it("includes travel notes when provided", () => {
    const params: TravelPlanParams = {
      ...BASE_PARAMS,
      travelNotes: "I prefer walking tours",
    };
    const prompt = travelPlanPrompt.buildUserPrompt(params);
    expect(prompt).toContain("I prefer walking tours");
  });

  it("has correct version", () => {
    // v1.3.0: bumped in Sprint 44 Wave 2 (guide digest ground-truth rule)
    expect(travelPlanPrompt.version).toBe("1.3.0");
  });

  it("uses plan model type", () => {
    expect(travelPlanPrompt.model).toBe("plan");
  });

  // ─── Sprint 43 QA prompt fixes (PLAN_SYSTEM_PROMPT v1.2.0) ─────────────
  describe("Sprint 43 QA rules in PLAN_SYSTEM_PROMPT", () => {
    const system = travelPlanPrompt.system;

    it("binds the top-level currency to the user's budget currency (Fix #2)", () => {
      expect(system).toContain("top-level \"currency\" field MUST match");
      expect(system).toContain("\"estimatedCost\" values MUST be in that same currency");
    });

    it("requires realistic local hours and Brazil Monday closures (Fix #3)", () => {
      expect(system).toContain("lunch 12:00-14:00");
      expect(system).toContain("dinner 19:00-21:00");
      expect(system).toContain("close on Mondays");
      expect(system).toContain("30 minutes");
    });

    it("adds an anti-hallucination hedge for small-city venues (Fix #4)", () => {
      expect(system).toContain("not confident");
      expect(system).toContain("descriptive title");
      expect(system).toContain("Never fabricate addresses");
    });
  });
});

describe("buildTravelerContext", () => {
  it("returns empty string when no expedition context", () => {
    const result = buildTravelerContext(BASE_PARAMS);
    expect(result).toBe("");
  });

  it("builds legacy expedition context for backward compatibility", () => {
    const params: TravelPlanParams = {
      ...BASE_PARAMS,
      expeditionContext: {
        tripType: "international",
        travelerType: "family",
        accommodationStyle: "comfort",
        travelPace: 5,
        budget: 5000,
        currency: "EUR",
      },
    };
    const result = buildTravelerContext(params);
    expect(result).toContain("<expedition-context>");
    expect(result).toContain("Trip type: international");
    expect(result).toContain("Traveler type: family");
    expect(result).toContain("Accommodation preference: comfort");
  });

  it("builds enriched traveler_context XML with all sections", () => {
    const params: TravelPlanParams = {
      ...BASE_PARAMS,
      expeditionContext: {
        personal: {
          name: "Maria",
          ageRange: "25-34",
          origin: "Sao Paulo, Brasil",
        },
        trip: {
          destination: "Roma, Italia",
          dates: "2026-08-01 to 2026-08-10",
          type: "international",
          travelers: "2 adults",
        },
        preferences: {
          pace: "relaxed",
          budget: "moderate",
          food: "italian, local_cuisine, street_food",
          interests: "history_museums, photography",
          accommodation: "hotel",
        },
        logistics: {
          transport: ["flight, GRU -> FCO, 2026-08-01"],
          accommodation: ["hotel, Hotel Roma Centro, check-in 2026-08-01, check-out 2026-08-10"],
          mobility: ["metro", "walking", "uber"],
        },
      },
    };

    const result = buildTravelerContext(params);

    // Structure checks
    expect(result).toContain("<traveler_context>");
    expect(result).toContain("</traveler_context>");

    // Personal section
    expect(result).toContain("<personal>");
    expect(result).toContain("<name>Maria</name>");
    expect(result).toContain("<age_range>25-34</age_range>");
    expect(result).toContain("<origin>Sao Paulo, Brasil</origin>");

    // Trip section
    expect(result).toContain("<trip>");
    expect(result).toContain("<destination>Roma, Italia</destination>");
    expect(result).toContain("<dates>2026-08-01 to 2026-08-10</dates>");
    expect(result).toContain("<type>international</type>");
    expect(result).toContain("<travelers>2 adults</travelers>");

    // Preferences section
    expect(result).toContain("<preferences>");
    expect(result).toContain("<pace>relaxed</pace>");
    expect(result).toContain("<food>italian, local_cuisine, street_food</food>");
    expect(result).toContain("<interests>history_museums, photography</interests>");

    // Logistics section
    expect(result).toContain("<logistics>");
    expect(result).toContain("<transport>flight, GRU -> FCO, 2026-08-01</transport>");
    expect(result).toContain("<accommodation>hotel, Hotel Roma Centro");
    expect(result).toContain("<mobility>metro, walking, uber</mobility>");
  });

  it("handles partial enriched context gracefully", () => {
    const params: TravelPlanParams = {
      ...BASE_PARAMS,
      expeditionContext: {
        personal: {
          name: "Maria",
        },
        // No trip, preferences, or logistics
      },
    };

    const result = buildTravelerContext(params);
    expect(result).toContain("<traveler_context>");
    expect(result).toContain("<name>Maria</name>");
    expect(result).not.toContain("<trip>");
    expect(result).not.toContain("<preferences>");
    expect(result).not.toContain("<logistics>");
  });

  it("includes destination guide context when available", () => {
    const params: TravelPlanParams = {
      ...BASE_PARAMS,
      expeditionContext: {
        personal: { name: "Maria" },
        destinationGuideContext: "Cultural tips: Dress modestly when visiting churches",
      },
    };

    const result = buildTravelerContext(params);
    expect(result).toContain("<destination_insights>");
    expect(result).toContain("Dress modestly");
  });

  it("prompt includes traveler context when enriched", () => {
    const params: TravelPlanParams = {
      ...BASE_PARAMS,
      expeditionContext: {
        personal: { name: "Maria", ageRange: "25-34" },
        trip: { destination: "Roma", type: "international" },
      },
    };

    const prompt = travelPlanPrompt.buildUserPrompt(params);
    expect(prompt).toContain("<traveler_context>");
    expect(prompt).toContain("<name>Maria</name>");
  });
});
