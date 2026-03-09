/**
 * Unit tests for versioned prompt templates.
 *
 * Verifies that each template:
 * - Has correct metadata (version, model, maxTokens, cacheControl)
 * - Builds user prompts with all expected dynamic fields
 * - Does not leak system instructions into user prompts
 * - Handles optional fields correctly
 */
import { describe, it, expect } from "vitest";
import { travelPlanPrompt } from "@/lib/prompts/travel-plan.prompt";
import { checklistPrompt } from "@/lib/prompts/checklist.prompt";
import { destinationGuidePrompt } from "@/lib/prompts/destination-guide.prompt";
import { PLAN_SYSTEM_PROMPT, CHECKLIST_SYSTEM_PROMPT, GUIDE_SYSTEM_PROMPT } from "@/lib/prompts/system-prompts";
import type { TravelPlanParams, ChecklistParams, GuideParams } from "@/lib/prompts/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_PLAN_PARAMS: TravelPlanParams = {
  destination: "Tokyo, Japan",
  startDate: "2026-07-01",
  endDate: "2026-07-05",
  days: 5,
  travelStyle: "CULTURE",
  budgetTotal: 3000,
  budgetCurrency: "USD",
  travelers: 2,
  language: "en",
  tokenBudget: 3500,
};

const BASE_CHECKLIST_PARAMS: ChecklistParams = {
  destination: "London, UK",
  month: "2026-08",
  travelers: 1,
  language: "pt-BR",
};

const BASE_GUIDE_PARAMS: GuideParams = {
  destination: "Rome, Italy",
  language: "pt-BR",
};

// ─── Travel Plan Template ────────────────────────────────────────────────────

describe("travelPlanPrompt", () => {
  it("has correct metadata", () => {
    expect(travelPlanPrompt.version).toBe("1.0.0");
    expect(travelPlanPrompt.model).toBe("plan");
    expect(travelPlanPrompt.cacheControl).toBe(true);
  });

  it("uses PLAN_SYSTEM_PROMPT as system field", () => {
    expect(travelPlanPrompt.system).toBe(PLAN_SYSTEM_PROMPT);
  });

  it("builds user prompt with all trip details", () => {
    const prompt = travelPlanPrompt.buildUserPrompt(BASE_PLAN_PARAMS);

    expect(prompt).toContain("Tokyo, Japan");
    expect(prompt).toContain("2026-07-01");
    expect(prompt).toContain("2026-07-05");
    expect(prompt).toContain("5 days");
    expect(prompt).toContain("CULTURE");
    expect(prompt).toContain("3000 USD");
    expect(prompt).toContain("2 person(s)");
    expect(prompt).toContain("Language: en");
    expect(prompt).toContain("Token budget: 3500");
  });

  it("does not include system instructions in user prompt", () => {
    const prompt = travelPlanPrompt.buildUserPrompt(BASE_PLAN_PARAMS);

    expect(prompt).not.toContain("professional travel planner");
    expect(prompt).not.toContain("Respond ONLY");
    expect(prompt).not.toContain("JSON SCHEMA");
  });

  it("includes travelNotes when provided", () => {
    const prompt = travelPlanPrompt.buildUserPrompt({
      ...BASE_PLAN_PARAMS,
      travelNotes: "I love sushi and temples",
    });

    expect(prompt).toContain("Additional traveler notes");
    expect(prompt).toContain("I love sushi and temples");
  });

  it("omits travelNotes section when not provided", () => {
    const prompt = travelPlanPrompt.buildUserPrompt(BASE_PLAN_PARAMS);

    expect(prompt).not.toContain("Additional traveler notes");
  });

  it("includes expedition context when provided", () => {
    const prompt = travelPlanPrompt.buildUserPrompt({
      ...BASE_PLAN_PARAMS,
      expeditionContext: {
        tripType: "international",
        travelerType: "couple",
        accommodationStyle: "luxury",
        travelPace: 5,
        budget: 5000,
        currency: "EUR",
        destinationGuideContext: "Local currency is JPY",
      },
    });

    expect(prompt).toContain("Expedition context");
    expect(prompt).toContain("Trip type: international");
    expect(prompt).toContain("Traveler type: couple");
    expect(prompt).toContain("Accommodation preference: luxury");
    expect(prompt).toContain("Travel pace: 5/10");
    expect(prompt).toContain("Traveler budget preference: 5000 EUR");
    expect(prompt).toContain("Destination insights: Local currency is JPY");
  });

  it("omits expedition context section when not provided", () => {
    const prompt = travelPlanPrompt.buildUserPrompt(BASE_PLAN_PARAMS);

    expect(prompt).not.toContain("Expedition context");
    expect(prompt).not.toContain("expedition-context");
  });

  it("uses budgetCurrency as fallback when expedition context has no currency", () => {
    const prompt = travelPlanPrompt.buildUserPrompt({
      ...BASE_PLAN_PARAMS,
      expeditionContext: {
        budget: 2000,
      },
    });

    expect(prompt).toContain("Traveler budget preference: 2000 USD");
  });

  it("omits expedition context when all fields are empty", () => {
    const prompt = travelPlanPrompt.buildUserPrompt({
      ...BASE_PLAN_PARAMS,
      expeditionContext: {},
    });

    expect(prompt).not.toContain("Expedition context");
  });
});

// ─── Checklist Template ──────────────────────────────────────────────────────

describe("checklistPrompt", () => {
  it("has correct metadata", () => {
    expect(checklistPrompt.version).toBe("1.0.0");
    expect(checklistPrompt.model).toBe("checklist");
    expect(checklistPrompt.maxTokens).toBe(2048);
    expect(checklistPrompt.cacheControl).toBe(true);
  });

  it("uses CHECKLIST_SYSTEM_PROMPT as system field", () => {
    expect(checklistPrompt.system).toBe(CHECKLIST_SYSTEM_PROMPT);
  });

  it("builds user prompt with trip details", () => {
    const prompt = checklistPrompt.buildUserPrompt(BASE_CHECKLIST_PARAMS);

    expect(prompt).toContain("London, UK");
    expect(prompt).toContain("2026-08");
    expect(prompt).toContain("1 traveler(s)");
    expect(prompt).toContain("Language: pt-BR");
  });

  it("does not include system instructions in user prompt", () => {
    const prompt = checklistPrompt.buildUserPrompt(BASE_CHECKLIST_PARAMS);

    expect(prompt).not.toContain("travel expert");
    expect(prompt).not.toContain("JSON SCHEMA");
  });
});

// ─── Destination Guide Template ──────────────────────────────────────────────

describe("destinationGuidePrompt", () => {
  it("has correct metadata", () => {
    expect(destinationGuidePrompt.version).toBe("1.0.0");
    expect(destinationGuidePrompt.model).toBe("guide");
    expect(destinationGuidePrompt.maxTokens).toBe(2048);
    expect(destinationGuidePrompt.cacheControl).toBe(true);
  });

  it("uses GUIDE_SYSTEM_PROMPT as system field", () => {
    expect(destinationGuidePrompt.system).toBe(GUIDE_SYSTEM_PROMPT);
  });

  it("builds user prompt for pt-BR language", () => {
    const prompt = destinationGuidePrompt.buildUserPrompt(BASE_GUIDE_PARAMS);

    expect(prompt).toContain("Rome, Italy");
    expect(prompt).toContain("Brazilian Portuguese");
  });

  it("builds user prompt for en language", () => {
    const prompt = destinationGuidePrompt.buildUserPrompt({
      ...BASE_GUIDE_PARAMS,
      language: "en",
    });

    expect(prompt).toContain("Rome, Italy");
    expect(prompt).toContain("English");
  });

  it("does not include system instructions in user prompt", () => {
    const prompt = destinationGuidePrompt.buildUserPrompt(BASE_GUIDE_PARAMS);

    expect(prompt).not.toContain("travel expert");
    expect(prompt).not.toContain("6 sections");
    expect(prompt).not.toContain("JSON SCHEMA");
  });
});
