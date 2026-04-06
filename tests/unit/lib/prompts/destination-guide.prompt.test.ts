import { describe, it, expect } from "vitest";
import { destinationGuidePrompt } from "@/lib/prompts/destination-guide.prompt";

describe("destinationGuidePrompt", () => {
  it("builds basic prompt with destination and language", () => {
    const result = destinationGuidePrompt.buildUserPrompt({
      destination: "Paris",
      language: "en",
    });
    expect(result).toContain("<destination>Paris</destination>");
    expect(result).toContain("<language>English</language>");
  });

  it("builds prompt with pt-BR language", () => {
    const result = destinationGuidePrompt.buildUserPrompt({
      destination: "Lisboa",
      language: "pt-BR",
    });
    expect(result).toContain("<language>Brazilian Portuguese</language>");
  });

  it("includes traveler context when provided", () => {
    const result = destinationGuidePrompt.buildUserPrompt({
      destination: "Tokyo",
      language: "en",
      travelerContext: {
        startDate: "2026-06-01",
        endDate: "2026-06-10",
        travelers: 2,
        travelerType: "couple",
        tripType: "international",
      },
    });
    expect(result).toContain("<traveler_context>");
    expect(result).toContain("<dates>2026-06-01 to 2026-06-10</dates>");
    expect(result).toContain("<group_size>2</group_size>");
    expect(result).toContain("<traveler_type>couple</traveler_type>");
    expect(result).toContain("<trip_type>international</trip_type>");
    expect(result).toContain("</traveler_context>");
  });

  // ─── Personalization (SPEC-GUIA-PERSONALIZACAO) ──────────────────────

  it("includes extra_categories when provided", () => {
    const result = destinationGuidePrompt.buildUserPrompt({
      destination: "Amsterdam",
      language: "en",
      extraCategories: ["beaches", "nightlife_clubs"],
    });
    expect(result).toContain("<extra_categories>");
    expect(result).toContain("beaches, nightlife_clubs");
    expect(result).toContain("Prioritize detailed information");
    expect(result).toContain("</extra_categories>");
  });

  it("does NOT include extra_categories when array is empty", () => {
    const result = destinationGuidePrompt.buildUserPrompt({
      destination: "Amsterdam",
      language: "en",
      extraCategories: [],
    });
    expect(result).not.toContain("<extra_categories>");
  });

  it("includes personal_notes when provided", () => {
    const result = destinationGuidePrompt.buildUserPrompt({
      destination: "Barcelona",
      language: "pt-BR",
      personalNotes: "I want to avoid touristy areas",
    });
    expect(result).toContain("<personal_notes>");
    expect(result).toContain("I want to avoid touristy areas");
    expect(result).toContain("</personal_notes>");
  });

  it("does NOT include personal_notes when undefined", () => {
    const result = destinationGuidePrompt.buildUserPrompt({
      destination: "Barcelona",
      language: "en",
    });
    expect(result).not.toContain("<personal_notes>");
  });

  it("does NOT include personal_notes when empty string", () => {
    const result = destinationGuidePrompt.buildUserPrompt({
      destination: "Barcelona",
      language: "en",
      personalNotes: "",
    });
    expect(result).not.toContain("<personal_notes>");
  });

  it("includes both extra_categories and personal_notes together", () => {
    const result = destinationGuidePrompt.buildUserPrompt({
      destination: "Rome",
      language: "en",
      extraCategories: ["museums_galleries", "parks_nature"],
      personalNotes: "Traveling with a toddler, need stroller-friendly places",
      travelerContext: {
        travelers: 3,
        travelerType: "family",
      },
    });
    expect(result).toContain("<traveler_context>");
    expect(result).toContain("<extra_categories>");
    expect(result).toContain("museums_galleries, parks_nature");
    expect(result).toContain("<personal_notes>");
    expect(result).toContain("stroller-friendly places");
  });

  it("has version 2.0.0", () => {
    expect(destinationGuidePrompt.version).toBe("2.0.0");
  });

  it("has maxTokens 4096", () => {
    expect(destinationGuidePrompt.maxTokens).toBe(4096);
  });

  it("has cacheControl enabled", () => {
    expect(destinationGuidePrompt.cacheControl).toBe(true);
  });
});
