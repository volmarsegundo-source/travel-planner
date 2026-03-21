import { z } from "zod";

// ─── Gamification Zod Schemas ───────────────────────────────────────────────

export const CompletePhaseSchema = z.object({
  tripId: z.string().min(1, "tripId is required"),
  phaseNumber: z.number().int().min(1).max(8),
  metadata: z.record(z.string().max(100), z.unknown())
    .refine(
      (obj) => Object.keys(obj).length <= 20,
      { message: "Too many metadata keys (max 20)" }
    )
    .optional(),
});

export type CompletePhaseInput = z.infer<typeof CompletePhaseSchema>;

export const SpendPointsSchema = z.object({
  amount: z.number().int().positive("amount must be positive"),
  type: z.enum([
    "ai_itinerary",
    "ai_route",
    "ai_accommodation",
  ]),
  description: z.string().max(255, "description must be at most 255 characters"),
});

export type SpendPointsInput = z.infer<typeof SpendPointsSchema>;

export const UseAiInPhaseSchema = z.object({
  tripId: z.string().min(1, "tripId is required"),
  phaseNumber: z.number().int().min(1).max(8),
});

export type UseAiInPhaseInput = z.infer<typeof UseAiInPhaseSchema>;
