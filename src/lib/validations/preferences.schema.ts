import { z } from "zod";

// ─── Single-select enums ─────────────────────────────────────────────────────

export const TRAVEL_PACE_OPTIONS = ["relaxed", "moderate", "intense"] as const;
export const BUDGET_STYLE_OPTIONS = ["budget", "moderate", "comfortable", "luxury"] as const;
export const FITNESS_LEVEL_OPTIONS = ["low", "moderate", "high"] as const;
export const PHOTOGRAPHY_INTEREST_OPTIONS = ["casual", "enthusiast", "professional"] as const;
export const WAKE_PREFERENCE_OPTIONS = ["early_bird", "flexible", "night_owl"] as const;
export const CONNECTIVITY_NEEDS_OPTIONS = ["essential", "occasional", "digital_detox"] as const;

// ─── Multi-select enums ──────────────────────────────────────────────────────

export const FOOD_PREFERENCE_OPTIONS = [
  "vegetarian", "vegan", "halal", "kosher",
  "gluten_free", "lactose_free", "local_cuisine",
  "street_food", "fine_dining", "no_restrictions",
] as const;

export const INTEREST_OPTIONS = [
  "history_museums", "art_galleries", "nature_hiking",
  "nightlife", "shopping", "photography",
  "sports_adventure", "wellness_spa", "gastronomy",
  "beaches", "architecture", "wildlife",
] as const;

export const SOCIAL_PREFERENCE_OPTIONS = [
  "solo", "meet_travelers", "group_activities",
  "family", "romantic_couple",
] as const;

export const ACCOMMODATION_STYLE_OPTIONS = [
  "hostel", "hotel", "airbnb", "glamping",
  "resort", "bed_and_breakfast",
] as const;

// ─── Preferences Schema ──────────────────────────────────────────────────────

export const PreferencesSchema = z.object({
  travelPace: z.enum(TRAVEL_PACE_OPTIONS).nullable().optional().default(null),
  foodPreferences: z.array(z.enum(FOOD_PREFERENCE_OPTIONS)).optional().default([]),
  interests: z.array(z.enum(INTEREST_OPTIONS)).optional().default([]),
  budgetStyle: z.enum(BUDGET_STYLE_OPTIONS).nullable().optional().default(null),
  socialPreference: z.array(z.enum(SOCIAL_PREFERENCE_OPTIONS)).optional().default([]),
  accommodationStyle: z.array(z.enum(ACCOMMODATION_STYLE_OPTIONS)).optional().default([]),
  fitnessLevel: z.enum(FITNESS_LEVEL_OPTIONS).nullable().optional().default(null),
  photographyInterest: z.enum(PHOTOGRAPHY_INTEREST_OPTIONS).nullable().optional().default(null),
  wakePreference: z.enum(WAKE_PREFERENCE_OPTIONS).nullable().optional().default(null),
  connectivityNeeds: z.enum(CONNECTIVITY_NEEDS_OPTIONS).nullable().optional().default(null),
}).default({});

export type UserPreferences = z.infer<typeof PreferencesSchema>;

// ─── Category metadata ──────────────────────────────────────────────────────

export type PreferenceCategoryKey = keyof UserPreferences;

export const PREFERENCE_CATEGORIES: readonly PreferenceCategoryKey[] = [
  "travelPace",
  "foodPreferences",
  "interests",
  "budgetStyle",
  "socialPreference",
  "accommodationStyle",
  "fitnessLevel",
  "photographyInterest",
  "wakePreference",
  "connectivityNeeds",
] as const;

export const TOTAL_PREFERENCE_CATEGORIES = PREFERENCE_CATEGORIES.length;

/**
 * Determine if a category is "filled" (has at least one selection).
 */
export function isCategoryFilled(preferences: UserPreferences, category: PreferenceCategoryKey): boolean {
  const value = preferences[category];
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Count how many preference categories are filled.
 */
export function countFilledCategories(preferences: UserPreferences): number {
  return PREFERENCE_CATEGORIES.filter((cat) => isCategoryFilled(preferences, cat)).length;
}

/**
 * Parse preferences from a JSON value (e.g., from database).
 * Returns a validated UserPreferences object, falling back to defaults on invalid data.
 */
export function parsePreferences(raw: unknown): UserPreferences {
  if (raw === null || raw === undefined) {
    return PreferencesSchema.parse({});
  }
  const result = PreferencesSchema.safeParse(raw);
  if (result.success) return result.data;
  // If stored data has invalid fields, return defaults
  return PreferencesSchema.parse({});
}
