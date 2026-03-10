import { z } from "zod";
import {
  MAX_TRIP_TITLE_LENGTH,
  MAX_TRIP_DESCRIPTION_LENGTH,
  MAX_TRIP_DESTINATION_LENGTH,
} from "@/lib/constants";

export const TripCreateSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(MAX_TRIP_TITLE_LENGTH, `Title must be at most ${MAX_TRIP_TITLE_LENGTH} characters`),
    destination: z
      .string()
      .min(1, "Destination is required")
      .max(MAX_TRIP_DESTINATION_LENGTH, `Destination must be at most ${MAX_TRIP_DESTINATION_LENGTH} characters`),
    description: z
      .string()
      .max(MAX_TRIP_DESCRIPTION_LENGTH, `Description must be at most ${MAX_TRIP_DESCRIPTION_LENGTH} characters`)
      .optional(),
    startDate: z.preprocess(
      (val) => (val === "" || val == null ? undefined : val),
      z.coerce.date().optional()
    ),
    endDate: z.preprocess(
      (val) => (val === "" || val == null ? undefined : val),
      z.coerce.date().optional()
    ),
    coverGradient: z.string().max(50).default("sunset"),
    coverEmoji: z.string().max(10).default("✈️"),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

export const TripUpdateSchema = z.object({
  title: z.string().min(1).max(MAX_TRIP_TITLE_LENGTH).optional(),
  destination: z.string().min(1).max(MAX_TRIP_DESTINATION_LENGTH).optional(),
  description: z.string().max(MAX_TRIP_DESCRIPTION_LENGTH).optional(),
  startDate: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.coerce.date().optional()
  ),
  endDate: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.coerce.date().optional()
  ),
  coverGradient: z.string().max(50).optional(),
  coverEmoji: z.string().max(10).optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC", "SHARED"]).optional(),
});

// ─── Passengers Schema (T-S20-009) ──────────────────────────────────────────

const MAX_CHILDREN_AGE = 17;
const MAX_PASSENGERS_PER_TYPE = 20;
const MIN_ADULTS = 1;

/** Maximum total passengers across all types (T-S21-006). */
export const MAX_TOTAL_PASSENGERS = 20;

export const PassengersSchema = z
  .object({
    adults: z
      .number()
      .int()
      .min(MIN_ADULTS, `At least ${MIN_ADULTS} adult is required`)
      .max(MAX_PASSENGERS_PER_TYPE, `Maximum ${MAX_PASSENGERS_PER_TYPE} adults`),
    children: z.object({
      count: z
        .number()
        .int()
        .min(0)
        .max(MAX_PASSENGERS_PER_TYPE, `Maximum ${MAX_PASSENGERS_PER_TYPE} children`),
      ages: z.array(
        z
          .number()
          .int()
          .min(0, "Age must be 0 or more")
          .max(MAX_CHILDREN_AGE, `Age must be at most ${MAX_CHILDREN_AGE}`)
      ),
    }),
    seniors: z
      .number()
      .int()
      .min(0)
      .max(MAX_PASSENGERS_PER_TYPE, `Maximum ${MAX_PASSENGERS_PER_TYPE} seniors`),
    infants: z
      .number()
      .int()
      .min(0)
      .max(MAX_PASSENGERS_PER_TYPE, `Maximum ${MAX_PASSENGERS_PER_TYPE} infants`),
  })
  .refine(
    (data) => data.children.ages.length === data.children.count,
    {
      message: "Number of children ages must match children count",
      path: ["children", "ages"],
    }
  )
  .refine(
    (data) =>
      data.adults + data.children.count + data.seniors + data.infants <=
      MAX_TOTAL_PASSENGERS,
    {
      message: "Total passengers cannot exceed 20",
      path: ["adults"],
    }
  );

export type Passengers = z.infer<typeof PassengersSchema>;

/** Derive total passenger count from a Passengers object. */
export function getTotalPassengers(passengers: Passengers): number {
  return (
    passengers.adults +
    passengers.children.count +
    passengers.seniors +
    passengers.infants
  );
}

export type TripCreateInput = z.infer<typeof TripCreateSchema>;
export type TripUpdateInput = z.infer<typeof TripUpdateSchema>;
