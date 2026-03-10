/**
 * Unit tests for PreferencesSchema — validates all 10 preference categories,
 * partial fill, invalid values, and utility functions.
 */
import { describe, it, expect } from "vitest";
import {
  PreferencesSchema,
  parsePreferences,
  isCategoryFilled,
  countFilledCategories,
  PREFERENCE_CATEGORIES,
  TOTAL_PREFERENCE_CATEGORIES,
  type UserPreferences,
} from "@/lib/validations/preferences.schema";

describe("PreferencesSchema", () => {
  it("accepts empty object and applies defaults", () => {
    const result = PreferencesSchema.parse({});
    expect(result.travelPace).toBeNull();
    expect(result.foodPreferences).toEqual([]);
    expect(result.interests).toEqual([]);
    expect(result.budgetStyle).toBeNull();
    expect(result.socialPreference).toEqual([]);
    expect(result.accommodationStyle).toEqual([]);
    expect(result.fitnessLevel).toBeNull();
    expect(result.photographyInterest).toBeNull();
    expect(result.wakePreference).toBeNull();
    expect(result.connectivityNeeds).toBeNull();
  });

  it("accepts fully filled preferences", () => {
    const full = {
      travelPace: "relaxed",
      foodPreferences: ["vegetarian", "local_cuisine"],
      interests: ["history_museums", "photography"],
      budgetStyle: "comfortable",
      socialPreference: ["solo"],
      accommodationStyle: ["hotel", "airbnb"],
      fitnessLevel: "moderate",
      photographyInterest: "enthusiast",
      wakePreference: "early_bird",
      connectivityNeeds: "occasional",
    };
    const result = PreferencesSchema.parse(full);
    expect(result.travelPace).toBe("relaxed");
    expect(result.foodPreferences).toEqual(["vegetarian", "local_cuisine"]);
    expect(result.budgetStyle).toBe("comfortable");
    expect(result.connectivityNeeds).toBe("occasional");
  });

  it("accepts partially filled preferences", () => {
    const partial = {
      travelPace: "intense",
      interests: ["beaches", "nightlife"],
    };
    const result = PreferencesSchema.parse(partial);
    expect(result.travelPace).toBe("intense");
    expect(result.interests).toEqual(["beaches", "nightlife"]);
    expect(result.budgetStyle).toBeNull();
    expect(result.foodPreferences).toEqual([]);
  });

  it("rejects invalid single-select values", () => {
    const invalid = { travelPace: "supersonic" };
    const result = PreferencesSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid multi-select values", () => {
    const invalid = { foodPreferences: ["pizza_only"] };
    const result = PreferencesSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects non-object input", () => {
    const result = PreferencesSchema.safeParse("not an object");
    expect(result.success).toBe(false);
  });

  it("accepts null for single-select categories", () => {
    const result = PreferencesSchema.parse({
      travelPace: null,
      budgetStyle: null,
    });
    expect(result.travelPace).toBeNull();
    expect(result.budgetStyle).toBeNull();
  });

  it("has exactly 10 preference categories", () => {
    expect(TOTAL_PREFERENCE_CATEGORIES).toBe(10);
    expect(PREFERENCE_CATEGORIES).toHaveLength(10);
  });
});

describe("isCategoryFilled", () => {
  const defaults = PreferencesSchema.parse({});

  it("returns false for null single-select", () => {
    expect(isCategoryFilled(defaults, "travelPace")).toBe(false);
  });

  it("returns false for empty array multi-select", () => {
    expect(isCategoryFilled(defaults, "foodPreferences")).toBe(false);
  });

  it("returns true for filled single-select", () => {
    const prefs: UserPreferences = { ...defaults, travelPace: "relaxed" };
    expect(isCategoryFilled(prefs, "travelPace")).toBe(true);
  });

  it("returns true for non-empty array multi-select", () => {
    const prefs: UserPreferences = { ...defaults, interests: ["beaches"] };
    expect(isCategoryFilled(prefs, "interests")).toBe(true);
  });
});

describe("countFilledCategories", () => {
  it("returns 0 for default preferences", () => {
    const defaults = PreferencesSchema.parse({});
    expect(countFilledCategories(defaults)).toBe(0);
  });

  it("counts correctly with partial fill", () => {
    const prefs = PreferencesSchema.parse({
      travelPace: "moderate",
      interests: ["photography"],
      budgetStyle: "luxury",
    });
    expect(countFilledCategories(prefs)).toBe(3);
  });

  it("returns 10 when all categories are filled", () => {
    const full = PreferencesSchema.parse({
      travelPace: "relaxed",
      foodPreferences: ["vegetarian"],
      interests: ["beaches"],
      budgetStyle: "budget",
      socialPreference: ["solo"],
      accommodationStyle: ["hostel"],
      fitnessLevel: "low",
      photographyInterest: "casual",
      wakePreference: "flexible",
      connectivityNeeds: "essential",
    });
    expect(countFilledCategories(full)).toBe(10);
  });
});

describe("parsePreferences", () => {
  it("returns defaults for null input", () => {
    const result = parsePreferences(null);
    expect(result.travelPace).toBeNull();
    expect(result.foodPreferences).toEqual([]);
  });

  it("returns defaults for undefined input", () => {
    const result = parsePreferences(undefined);
    expect(countFilledCategories(result)).toBe(0);
  });

  it("parses valid JSON object", () => {
    const raw = { travelPace: "intense", interests: ["wildlife"] };
    const result = parsePreferences(raw);
    expect(result.travelPace).toBe("intense");
    expect(result.interests).toEqual(["wildlife"]);
  });

  it("falls back to defaults for invalid data", () => {
    const raw = { travelPace: "warp_speed" };
    const result = parsePreferences(raw);
    expect(result.travelPace).toBeNull();
  });

  it("handles Prisma JSON output (string-like)", () => {
    // When Prisma returns JSON from DB, it's already parsed
    const raw = JSON.parse('{"budgetStyle":"luxury"}');
    const result = parsePreferences(raw);
    expect(result.budgetStyle).toBe("luxury");
  });
});
