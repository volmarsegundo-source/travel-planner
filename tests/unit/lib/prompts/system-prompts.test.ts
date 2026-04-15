/**
 * Unit tests for system prompt templates.
 *
 * Verifies that system prompts contain expected structural content
 * and are non-empty strings ready for use with cache_control.
 */
import { describe, it, expect } from "vitest";
import {
  PLAN_SYSTEM_PROMPT,
  CHECKLIST_SYSTEM_PROMPT,
  GUIDE_SYSTEM_PROMPT,
} from "@/lib/prompts/system-prompts";

describe("PLAN_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof PLAN_SYSTEM_PROMPT).toBe("string");
    expect(PLAN_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("contains the travel planner role", () => {
    expect(PLAN_SYSTEM_PROMPT).toContain("professional travel planner");
  });

  it("contains JSON schema for the itinerary", () => {
    expect(PLAN_SYSTEM_PROMPT).toContain('"destination"');
    expect(PLAN_SYSTEM_PROMPT).toContain('"totalDays"');
    expect(PLAN_SYSTEM_PROMPT).toContain('"activities"');
    expect(PLAN_SYSTEM_PROMPT).toContain('"activityType"');
  });

  it("contains output constraints", () => {
    expect(PLAN_SYSTEM_PROMPT).toContain("max 15 words");
    expect(PLAN_SYSTEM_PROMPT).toContain("3-5 activities");
  });

  it("does not contain dynamic trip-specific data", () => {
    expect(PLAN_SYSTEM_PROMPT).not.toContain("Paris");
    expect(PLAN_SYSTEM_PROMPT).not.toContain("2026");
    expect(PLAN_SYSTEM_PROMPT).not.toContain("USD");
  });
});

describe("CHECKLIST_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof CHECKLIST_SYSTEM_PROMPT).toBe("string");
    expect(CHECKLIST_SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });

  it("contains the travel preparation expert role (v2.0.0)", () => {
    // v2.0.0 redesigned the role from "travel expert" to "professional travel preparation expert"
    expect(CHECKLIST_SYSTEM_PROMPT).toContain("travel preparation expert");
  });

  it("contains JSON schema for checklist categories", () => {
    expect(CHECKLIST_SYSTEM_PROMPT).toContain("DOCUMENTS");
    expect(CHECKLIST_SYSTEM_PROMPT).toContain("HEALTH");
    expect(CHECKLIST_SYSTEM_PROMPT).toContain("priority");
  });

  it("does not contain dynamic trip-specific data", () => {
    expect(CHECKLIST_SYSTEM_PROMPT).not.toContain("Paris");
    expect(CHECKLIST_SYSTEM_PROMPT).not.toContain("2026");
  });
});

describe("GUIDE_SYSTEM_PROMPT (v2)", () => {
  it("is a non-empty string", () => {
    expect(typeof GUIDE_SYSTEM_PROMPT).toBe("string");
    expect(GUIDE_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("contains the travel guide writer role", () => {
    expect(GUIDE_SYSTEM_PROMPT).toContain("professional travel guide writer");
  });

  it("specifies v2 structured JSON keys", () => {
    expect(GUIDE_SYSTEM_PROMPT).toContain('"destination"');
    expect(GUIDE_SYSTEM_PROMPT).toContain('"quickFacts"');
    expect(GUIDE_SYSTEM_PROMPT).toContain('"safety"');
    expect(GUIDE_SYSTEM_PROMPT).toContain('"dailyCosts"');
    expect(GUIDE_SYSTEM_PROMPT).toContain('"mustSee"');
    expect(GUIDE_SYSTEM_PROMPT).toContain('"documentation"');
    expect(GUIDE_SYSTEM_PROMPT).toContain('"localTransport"');
    expect(GUIDE_SYSTEM_PROMPT).toContain('"culturalTips"');
  });

  it("includes safety level enum values", () => {
    expect(GUIDE_SYSTEM_PROMPT).toContain("safe|moderate|caution");
  });

  it("includes mustSee category enum values", () => {
    expect(GUIDE_SYSTEM_PROMPT).toContain("nature|culture|food|nightlife|sport|adventure");
  });

  it("includes hard rules and personalization rules", () => {
    expect(GUIDE_SYSTEM_PROMPT).toContain("HARD RULES:");
    expect(GUIDE_SYSTEM_PROMPT).toContain("PERSONALIZATION RULES:");
  });

  it("includes quickFacts subkeys", () => {
    expect(GUIDE_SYSTEM_PROMPT).toContain('"climate"');
    expect(GUIDE_SYSTEM_PROMPT).toContain('"plugType"');
    expect(GUIDE_SYSTEM_PROMPT).toContain('"dialCode"');
  });

  it("does not contain dynamic trip-specific data", () => {
    expect(GUIDE_SYSTEM_PROMPT).not.toContain("Paris");
    expect(GUIDE_SYSTEM_PROMPT).not.toContain("Portuguese");
  });
});
