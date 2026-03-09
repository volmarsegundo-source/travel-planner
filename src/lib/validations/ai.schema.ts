import { z } from "zod";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_DESTINATION_LENGTH = 200;
const MAX_TRAVEL_NOTES_LENGTH = 500;
const MAX_TRAVELERS = 20;
const MIN_BUDGET = 1;
const MAX_BUDGET = 1_000_000;

// ─── Shared enums ───────────────────────────────────────────────────────────

const TravelStyleEnum = z.enum([
  "ADVENTURE",
  "CULTURE",
  "RELAXATION",
  "GASTRONOMY",
  "ROMANTIC",
  "FAMILY",
  "BUSINESS",
  "BACKPACKER",
  "LUXURY",
]);

const LanguageEnum = z.enum(["pt-BR", "en"]);

const BudgetCurrencyEnum = z.enum(["USD", "EUR", "BRL", "GBP", "JPY", "AUD", "CAD"]);

// ─── generateTravelPlanAction params ────────────────────────────────────────

export const GeneratePlanParamsSchema = z.object({
  destination: z
    .string()
    .min(1, "errors.validation")
    .max(MAX_DESTINATION_LENGTH, "errors.validation"),
  startDate: z.string().min(1, "errors.validation"),
  endDate: z.string().min(1, "errors.validation"),
  travelStyle: TravelStyleEnum,
  budgetTotal: z
    .number()
    .min(MIN_BUDGET, "errors.validation")
    .max(MAX_BUDGET, "errors.validation"),
  budgetCurrency: BudgetCurrencyEnum,
  travelers: z
    .number()
    .int()
    .min(1, "errors.validation")
    .max(MAX_TRAVELERS, "errors.validation"),
  language: LanguageEnum,
  travelNotes: z
    .string()
    .max(MAX_TRAVEL_NOTES_LENGTH, "errors.validation")
    .optional(),
});

export type GeneratePlanParamsInput = z.infer<typeof GeneratePlanParamsSchema>;

// ─── generateChecklistAction params ─────────────────────────────────────────

export const GenerateChecklistParamsSchema = z.object({
  destination: z
    .string()
    .min(1, "errors.validation")
    .max(MAX_DESTINATION_LENGTH, "errors.validation"),
  startDate: z.string().min(1, "errors.validation"),
  travelers: z
    .number()
    .int()
    .min(1, "errors.validation")
    .max(MAX_TRAVELERS, "errors.validation"),
  language: LanguageEnum,
});

export type GenerateChecklistParamsInput = z.infer<typeof GenerateChecklistParamsSchema>;

// ─── generateDestinationGuideAction params ──────────────────────────────────

export const GenerateGuideParamsSchema = z.object({
  locale: z
    .string()
    .min(2, "errors.validation")
    .max(10, "errors.validation"),
});

export type GenerateGuideParamsInput = z.infer<typeof GenerateGuideParamsSchema>;

// ─── tripId validation (shared) ─────────────────────────────────────────────

export const TripIdSchema = z
  .string()
  .min(1, "errors.validation")
  .max(50, "errors.validation");
