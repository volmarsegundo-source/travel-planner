import { z } from "zod";

export const feedbackSchema = z.object({
  type: z.enum(["bug", "suggestion", "praise"]),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000),
  page: z.string().max(200),
  currentPhase: z.number().int().min(1).max(6).optional(),
  screenshotData: z.string().max(2_000_000).optional(), // base64 ~1.5MB max
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
