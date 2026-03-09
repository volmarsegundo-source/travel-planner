/**
 * Unit tests for AI action Zod schemas (T-S17-005).
 *
 * Validates that GeneratePlanParamsSchema, GenerateChecklistParamsSchema,
 * and GenerateGuideParamsSchema reject invalid inputs correctly.
 */
import { describe, it, expect } from "vitest";
import {
  GeneratePlanParamsSchema,
  GenerateChecklistParamsSchema,
  GenerateGuideParamsSchema,
  TripIdSchema,
} from "@/lib/validations/ai.schema";

describe("GeneratePlanParamsSchema", () => {
  const validParams = {
    destination: "Paris, France",
    startDate: "2026-06-01",
    endDate: "2026-06-10",
    travelStyle: "CULTURE",
    budgetTotal: 5000,
    budgetCurrency: "USD",
    travelers: 2,
    language: "en",
  };

  it("accepts valid params", () => {
    const result = GeneratePlanParamsSchema.safeParse(validParams);
    expect(result.success).toBe(true);
  });

  it("accepts valid params with travelNotes", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      travelNotes: "I love museums",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty destination", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      destination: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects destination exceeding 200 chars", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      destination: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid travelStyle", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      travelStyle: "INVALID_STYLE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative budget", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      budgetTotal: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects budget exceeding 1,000,000", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      budgetTotal: 1_000_001,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero travelers", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      travelers: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects travelers exceeding 20", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      travelers: 21,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer travelers", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      travelers: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid language", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      language: "fr",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid budgetCurrency", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      budgetCurrency: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects travelNotes exceeding 500 chars", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      travelNotes: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      destination: "Paris",
    });
    expect(result.success).toBe(false);
  });

  it("strips unknown fields", () => {
    const result = GeneratePlanParamsSchema.safeParse({
      ...validParams,
      systemPrompt: "override",
      adminOverride: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("systemPrompt");
      expect(result.data).not.toHaveProperty("adminOverride");
    }
  });
});

describe("GenerateChecklistParamsSchema", () => {
  const validParams = {
    destination: "Tokyo, Japan",
    startDate: "2026-07-01",
    travelers: 3,
    language: "pt-BR",
  };

  it("accepts valid params", () => {
    const result = GenerateChecklistParamsSchema.safeParse(validParams);
    expect(result.success).toBe(true);
  });

  it("rejects empty destination", () => {
    const result = GenerateChecklistParamsSchema.safeParse({
      ...validParams,
      destination: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing startDate", () => {
    const result = GenerateChecklistParamsSchema.safeParse({
      destination: "Tokyo",
      travelers: 2,
      language: "en",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero travelers", () => {
    const result = GenerateChecklistParamsSchema.safeParse({
      ...validParams,
      travelers: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid language", () => {
    const result = GenerateChecklistParamsSchema.safeParse({
      ...validParams,
      language: "de",
    });
    expect(result.success).toBe(false);
  });

  it("strips unknown fields", () => {
    const result = GenerateChecklistParamsSchema.safeParse({
      ...validParams,
      maliciousField: "attack",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("maliciousField");
    }
  });
});

describe("GenerateGuideParamsSchema", () => {
  it("accepts valid locale", () => {
    const result = GenerateGuideParamsSchema.safeParse({ locale: "pt-BR" });
    expect(result.success).toBe(true);
  });

  it("accepts short locale", () => {
    const result = GenerateGuideParamsSchema.safeParse({ locale: "en" });
    expect(result.success).toBe(true);
  });

  it("rejects empty locale", () => {
    const result = GenerateGuideParamsSchema.safeParse({ locale: "" });
    expect(result.success).toBe(false);
  });

  it("rejects locale exceeding 10 chars", () => {
    const result = GenerateGuideParamsSchema.safeParse({
      locale: "A".repeat(11),
    });
    expect(result.success).toBe(false);
  });

  it("rejects single char locale", () => {
    const result = GenerateGuideParamsSchema.safeParse({ locale: "x" });
    expect(result.success).toBe(false);
  });
});

describe("TripIdSchema", () => {
  it("accepts valid cuid", () => {
    const result = TripIdSchema.safeParse("clxyz123abc");
    expect(result.success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = TripIdSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects string exceeding 50 chars", () => {
    const result = TripIdSchema.safeParse("A".repeat(51));
    expect(result.success).toBe(false);
  });
});
