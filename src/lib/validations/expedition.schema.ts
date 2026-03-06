import { z } from "zod";

// ─── Phase 1: Trip Planning Basics ──────────────────────────────────────────

export const Phase1Schema = z.object({
  destination: z
    .string()
    .min(1, "Destination is required")
    .max(150, "Destination must be at most 150 characters"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  travelers: z
    .number()
    .int()
    .min(1, "At least 1 traveler")
    .max(10, "Maximum 10 travelers"),
  flexibleDates: z.boolean().default(false),
});

export type Phase1Input = z.infer<typeof Phase1Schema>;

// ─── Phase 2: Travel Preferences ────────────────────────────────────────────

export const TravelerTypeEnum = z.enum([
  "solo",
  "couple",
  "family",
  "group",
]);

export const AccommodationStyleEnum = z.enum([
  "budget",
  "comfort",
  "luxury",
  "adventure",
]);

export const CurrencyEnum = z.enum(["USD", "EUR", "BRL"]);

export const Phase2Schema = z.object({
  travelerType: TravelerTypeEnum,
  accommodationStyle: AccommodationStyleEnum,
  travelPace: z
    .number()
    .int()
    .min(1, "Pace must be at least 1")
    .max(10, "Pace must be at most 10"),
  budget: z
    .number()
    .int()
    .min(100, "Budget must be at least 100")
    .max(100000, "Budget must be at most 100,000"),
  currency: CurrencyEnum,
});

export type Phase2Input = z.infer<typeof Phase2Schema>;
