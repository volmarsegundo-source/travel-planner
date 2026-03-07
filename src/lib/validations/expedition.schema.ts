import { z } from "zod";

// ─── Phase 1: Trip Planning Basics ──────────────────────────────────────────

export const Phase1Schema = z.object({
  destination: z
    .string()
    .min(1, "Destination is required")
    .max(150, "Destination must be at most 150 characters"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  flexibleDates: z.boolean().default(false),
  profileFields: z.object({
    birthDate: z.string().optional(),
    phone: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    bio: z.string().max(500).optional(),
  }).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  { message: "End date must be after start date", path: ["endDate"] }
);

export type Phase1Input = z.infer<typeof Phase1Schema>;

// ─── Phase 2: Travel Preferences ────────────────────────────────────────────

export const TravelerTypeEnum = z.enum([
  "solo",
  "couple",
  "family",
  "group",
  "business",
  "student",
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
  travelers: z
    .number()
    .int()
    .min(2, "At least 2 travelers for group/family")
    .max(20, "Maximum 20 travelers")
    .optional(),
  dietaryRestrictions: z.string().max(300).optional(),
  accessibility: z.string().max(300).optional(),
}).refine(
  (data) => {
    if (data.travelerType === "family" || data.travelerType === "group") {
      return data.travelers !== undefined && data.travelers >= 2;
    }
    return true;
  },
  { message: "Number of travelers is required for family/group trips", path: ["travelers"] }
);

export type Phase2Input = z.infer<typeof Phase2Schema>;
