import { z } from "zod";

export const COVER_GRADIENTS = [
  "sunset",
  "ocean",
  "forest",
  "desert",
  "aurora",
  "city",
  "sakura",
  "alpine",
] as const;

export type CoverGradient = (typeof COVER_GRADIENTS)[number];

export const TravelStyleEnum = z.enum([
  "ADVENTURE",
  "CULTURE",
  "RELAXATION",
  "GASTRONOMY",
]);

// Base schema without refinements so .partial() works in TripUpdateSchema (Zod v4)
const TripCreateBaseSchema = z.object({
  title: z
    .string()
    .min(1, "Nome da viagem é obrigatório")
    .max(255, "Nome muito longo"),
  destinationName: z
    .string()
    .min(1, "Destino é obrigatório")
    .max(255, "Destino muito longo"),
  destinationPlaceId: z.string().max(500).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  travelers: z.number().int().min(1).max(50).default(1),
  travelStyle: TravelStyleEnum.optional(),
  budgetTotal: z.number().positive().optional(),
  budgetCurrency: z.string().length(3).default("BRL"),
  coverGradient: z.enum(COVER_GRADIENTS).default("sunset"),
  coverEmoji: z
    .string()
    .max(10)
    .regex(/^\p{Emoji}/u, "Deve ser um emoji válido")
    .optional(),
});

export const TripCreateSchema = TripCreateBaseSchema.refine(
  (d) => {
    if (d.startDate && d.endDate) return d.startDate <= d.endDate;
    return true;
  },
  { message: "Data de volta deve ser após a data de ida", path: ["endDate"] },
);

export const TripUpdateSchema = TripCreateBaseSchema.partial().extend({
  status: z
    .enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"])
    .optional(),
});

export const TripDeleteSchema = z.object({
  confirmTitle: z.string().min(1),
});

export type TripCreateInput = z.infer<typeof TripCreateSchema>;
export type TripUpdateInput = z.infer<typeof TripUpdateSchema>;
