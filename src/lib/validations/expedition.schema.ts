import { z } from "zod";
import { PassengersSchema } from "./trip.schema";

// ─── Destination (Sprint 43 Wave 3 — multi-city) ────────────────────────────

/**
 * Per-destination input accepted by Phase1 when the user enables multi-city
 * mode. Free users may send at most 1 entry; Premium users up to 4. The
 * server enforces the plan cap again (defense in depth).
 */
export const DestinationInputSchema = z.object({
  city: z.string().min(1).max(150),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  nights: z.number().int().positive().max(365).optional(),
});

export type DestinationInput = z.infer<typeof DestinationInputSchema>;

// ─── Phase 1: Trip Planning Basics ──────────────────────────────────────────

export const Phase1Schema = z.object({
  destination: z
    .string()
    .min(1, "Destination is required")
    .max(150, "Destination must be at most 150 characters"),
  origin: z.string().trim().max(150).optional(),
  destinationCountryCode: z.string().length(2).toUpperCase().optional(),
  originCountryCode: z.string().length(2).toUpperCase().optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLon: z.number().min(-180).max(180).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  flexibleDates: z.boolean().default(false),
  /**
   * Sprint 43 Wave 3: optional ordered list of destinations. When omitted,
   * the legacy single-city flow is used. When provided, the server persists
   * into the new `destinations` table and mirrors `[0]` back to
   * `Trip.destination*` for backwards compatibility.
   */
  destinations: z
    .array(DestinationInputSchema)
    .min(1, "At least one destination is required")
    .max(4, "expedition.phase1.errors.tooManyDestinations")
    .optional(),
  profileFields: z.object({
    name: z.string().max(100).optional(),
    birthDate: z.string().optional(),
    phone: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    bio: z.string().max(500).optional(),
  }).optional(),
}).refine(
  (data) => {
    // Skip date validation when dates are not provided (flexible dates mode)
    if (!data.startDate) return true;
    const start = new Date(data.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // startDate must be strictly after today (tomorrow or later)
    return start > today;
  },
  { message: "expedition.phase1.errors.dateInPast", path: ["startDate"] }
).refine(
  (data) => {
    if (!data.endDate) return true;
    const end = new Date(data.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end > today;
  },
  { message: "expedition.phase1.errors.dateInPast", path: ["endDate"] }
).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate !== data.endDate;
    }
    return true;
  },
  { message: "expedition.phase1.errors.sameDates", path: ["endDate"] }
).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  },
  { message: "expedition.phase1.errors.startAfterEnd", path: ["endDate"] }
).refine(
  (data) => {
    if (data.origin && data.destination) {
      const normalizedOrigin = data.origin.trim().toLowerCase();
      const normalizedDest = data.destination.trim().toLowerCase();
      return normalizedOrigin !== normalizedDest;
    }
    return true;
  },
  { message: "Origin and destination cannot be the same city", path: ["destination"] }
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
  passengers: PassengersSchema.optional(),
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
