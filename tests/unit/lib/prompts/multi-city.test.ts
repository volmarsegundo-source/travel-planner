/**
 * Unit tests for Sprint 43 Wave 4 multi-city prompt support.
 *
 * Covers:
 *  - travel-plan prompt emits multi-city section when destinations.length > 1
 *  - travel-plan prompt stays backwards compatible for single-city
 *  - destination-guide prompt emits trip_context for multi-city
 *  - destination-guide prompt stays silent for single-city
 *  - PLAN_SYSTEM_PROMPT advertises the multi-city rules + schema extension
 */
import { describe, it, expect } from "vitest";
import { travelPlanPrompt } from "@/lib/prompts/travel-plan.prompt";
import { destinationGuidePrompt } from "@/lib/prompts/destination-guide.prompt";
import { PLAN_SYSTEM_PROMPT } from "@/lib/prompts/system-prompts";
import type { TravelPlanParams, GuideParams } from "@/lib/prompts/types";

const basePlanParams: TravelPlanParams = {
  destination: "Lisboa",
  startDate: "2026-06-01",
  endDate: "2026-06-07",
  days: 7,
  travelStyle: "CULTURE",
  budgetTotal: 3000,
  budgetCurrency: "EUR",
  travelers: 2,
  language: "pt-BR",
  tokenBudget: 6000,
};

describe("travel-plan prompt — multi-city", () => {
  it("omits multi-city block for single destination (backwards compat)", () => {
    const prompt = travelPlanPrompt.buildUserPrompt(basePlanParams);
    expect(prompt).not.toContain("<destinations_multi_city>");
    expect(prompt).toContain("Destination: Lisboa");
  });

  it("omits multi-city block when destinations array has only one entry", () => {
    const prompt = travelPlanPrompt.buildUserPrompt({
      ...basePlanParams,
      destinations: [{ city: "Lisboa", order: 0, nights: 7 }],
    });
    expect(prompt).not.toContain("<destinations_multi_city>");
  });

  it("emits ordered multi-city block when destinations > 1", () => {
    const prompt = travelPlanPrompt.buildUserPrompt({
      ...basePlanParams,
      destination: "Lisboa, Porto, Madrid",
      destinations: [
        { city: "Porto", country: "Portugal", order: 1, nights: 3 },
        { city: "Lisboa", country: "Portugal", order: 0, nights: 2 },
        { city: "Madrid", country: "Espanha", order: 2, nights: 2 },
      ],
    });
    expect(prompt).toContain("<destinations_multi_city>");
    // Order 0 appears first regardless of input order (sort by .order)
    const idxLisboa = prompt.indexOf("1. Lisboa");
    const idxPorto = prompt.indexOf("2. Porto");
    const idxMadrid = prompt.indexOf("3. Madrid");
    expect(idxLisboa).toBeGreaterThan(-1);
    expect(idxPorto).toBeGreaterThan(idxLisboa);
    expect(idxMadrid).toBeGreaterThan(idxPorto);
    expect(prompt).toContain("3 nights");
    expect(prompt).toContain("</destinations_multi_city>");
  });
});

describe("destination-guide prompt — trip_context", () => {
  const baseGuideParams: GuideParams = {
    destination: "Porto",
    language: "pt-BR",
  };

  it("omits trip_context when tripContext is absent", () => {
    const prompt = destinationGuidePrompt.buildUserPrompt(baseGuideParams);
    expect(prompt).not.toContain("<trip_context>");
  });

  it("omits trip_context when totalCities is 1", () => {
    const prompt = destinationGuidePrompt.buildUserPrompt({
      ...baseGuideParams,
      tripContext: { siblingCities: ["Porto"], order: 0, totalCities: 1 },
    });
    expect(prompt).not.toContain("<trip_context>");
  });

  it("emits trip_context with sibling cities for multi-city trips", () => {
    const prompt = destinationGuidePrompt.buildUserPrompt({
      ...baseGuideParams,
      tripContext: {
        siblingCities: ["Lisboa", "Porto", "Madrid"],
        order: 1,
        totalCities: 3,
      },
    });
    expect(prompt).toContain("<trip_context>");
    expect(prompt).toContain("city 2 of 3");
    expect(prompt).toContain("Lisboa");
    expect(prompt).toContain("Madrid");
    // Self is excluded from "others" list
    expect(prompt).toMatch(/Other cities.*Lisboa.*Madrid/);
    expect(prompt).toContain("Do NOT duplicate attractions");
    expect(prompt).toContain("</trip_context>");
  });
});

describe("PLAN_SYSTEM_PROMPT — multi-city rules", () => {
  it("advertises MULTI-CITY RULES section", () => {
    expect(PLAN_SYSTEM_PROMPT).toContain("MULTI-CITY RULES");
  });

  it("documents transit day invariants", () => {
    expect(PLAN_SYSTEM_PROMPT).toContain("isTransit");
    expect(PLAN_SYSTEM_PROMPT).toContain("transitFrom");
    expect(PLAN_SYSTEM_PROMPT).toContain("transitTo");
    expect(PLAN_SYSTEM_PROMPT).toContain("EXACTLY 3 activities");
  });

  it("instructs to omit multi-city fields for single-city (backwards compat)", () => {
    expect(PLAN_SYSTEM_PROMPT).toContain("omit");
    expect(PLAN_SYSTEM_PROMPT).toContain("single-city");
  });

  it("includes city field in JSON schema section", () => {
    expect(PLAN_SYSTEM_PROMPT).toContain('"city"');
    expect(PLAN_SYSTEM_PROMPT).toContain('"isTransit"');
  });
});
