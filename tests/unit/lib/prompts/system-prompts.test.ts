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

  it("contains the travel expert role", () => {
    expect(CHECKLIST_SYSTEM_PROMPT).toContain("travel expert");
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

describe("GUIDE_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof GUIDE_SYSTEM_PROMPT).toBe("string");
    expect(GUIDE_SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });

  it("contains the travel expert role", () => {
    expect(GUIDE_SYSTEM_PROMPT).toContain("travel expert");
  });

  it("specifies exactly 10 sections (T-S19-008)", () => {
    expect(GUIDE_SYSTEM_PROMPT).toContain("10 sections");
    expect(GUIDE_SYSTEM_PROMPT).toContain("timezone");
    expect(GUIDE_SYSTEM_PROMPT).toContain("currency");
    expect(GUIDE_SYSTEM_PROMPT).toContain("language");
    expect(GUIDE_SYSTEM_PROMPT).toContain("electricity");
    expect(GUIDE_SYSTEM_PROMPT).toContain("connectivity");
    expect(GUIDE_SYSTEM_PROMPT).toContain("cultural_tips");
    expect(GUIDE_SYSTEM_PROMPT).toContain("safety");
    expect(GUIDE_SYSTEM_PROMPT).toContain("health");
    expect(GUIDE_SYSTEM_PROMPT).toContain("transport_overview");
    expect(GUIDE_SYSTEM_PROMPT).toContain("local_customs");
  });

  it("includes type field with stat and content values", () => {
    expect(GUIDE_SYSTEM_PROMPT).toContain('"type": "stat"');
    expect(GUIDE_SYSTEM_PROMPT).toContain('"type": "content"');
  });

  it("includes details field for content sections", () => {
    expect(GUIDE_SYSTEM_PROMPT).toContain('"details"');
  });

  it("does not contain dynamic trip-specific data", () => {
    expect(GUIDE_SYSTEM_PROMPT).not.toContain("Paris");
    expect(GUIDE_SYSTEM_PROMPT).not.toContain("Portuguese");
  });
});
