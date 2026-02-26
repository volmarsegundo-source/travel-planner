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
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
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
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  coverGradient: z.string().max(50).optional(),
  coverEmoji: z.string().max(10).optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC", "SHARED"]).optional(),
});

export type TripCreateInput = z.infer<typeof TripCreateSchema>;
export type TripUpdateInput = z.infer<typeof TripUpdateSchema>;
