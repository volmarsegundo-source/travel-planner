/**
 * Unit tests for the Sprint 43 Wave 4 multi-city guide orchestrator.
 *
 * The orchestrator fans out N guide generations in parallel, injects
 * per-call tripContext, and returns results sorted by declared order
 * even when some calls fail.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGenerateDestinationGuide } = vi.hoisted(() => ({
  mockGenerateDestinationGuide: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/services/ai.service", () => ({
  AiService: {
    generateDestinationGuide: (...args: unknown[]) =>
      mockGenerateDestinationGuide(...args),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { generateMultiCityGuides } from "@/server/services/multi-city-guide.service";

const STUB_CONTENT = { destination: { name: "stub" } } as unknown as {
  destination: { name: string };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateMultiCityGuides", () => {
  it("returns empty array when destinations list is empty", async () => {
    const result = await generateMultiCityGuides({
      userId: "u1",
      language: "pt-BR",
      destinations: [],
    });
    expect(result).toEqual([]);
    expect(mockGenerateDestinationGuide).not.toHaveBeenCalled();
  });

  it("calls generateDestinationGuide once per destination", async () => {
    mockGenerateDestinationGuide.mockResolvedValue(STUB_CONTENT);

    const result = await generateMultiCityGuides({
      userId: "u1",
      language: "pt-BR",
      destinations: [
        { city: "Lisboa", order: 0 },
        { city: "Porto", order: 1 },
      ],
    });

    expect(mockGenerateDestinationGuide).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.status === "success")).toBe(true);
  });

  it("injects tripContext with correct order and siblings into each call", async () => {
    mockGenerateDestinationGuide.mockResolvedValue(STUB_CONTENT);

    await generateMultiCityGuides({
      userId: "u1",
      language: "pt-BR",
      destinations: [
        { city: "Lisboa", order: 0 },
        { city: "Porto", order: 1 },
        { city: "Madrid", order: 2 },
      ],
    });

    expect(mockGenerateDestinationGuide).toHaveBeenCalledTimes(3);
    const calls = mockGenerateDestinationGuide.mock.calls.map((c) => c[0]);

    for (const call of calls) {
      expect(call.tripContext.totalCities).toBe(3);
      expect(call.tripContext.siblingCities).toEqual([
        "Lisboa",
        "Porto",
        "Madrid",
      ]);
    }
    const portoCall = calls.find((c: { destination: string }) => c.destination === "Porto");
    expect(portoCall.tripContext.order).toBe(1);
  });

  it("rejects more than 4 destinations", async () => {
    await expect(
      generateMultiCityGuides({
        userId: "u1",
        language: "pt-BR",
        destinations: [
          { city: "A", order: 0 },
          { city: "B", order: 1 },
          { city: "C", order: 2 },
          { city: "D", order: 3 },
          { city: "E", order: 4 },
        ],
      }),
    ).rejects.toThrow(/Too many destinations/);
  });

  it("returns partial results when one call fails without failing the whole batch", async () => {
    mockGenerateDestinationGuide
      .mockResolvedValueOnce(STUB_CONTENT)
      .mockRejectedValueOnce(new Error("AI_TIMEOUT"))
      .mockResolvedValueOnce(STUB_CONTENT);

    const result = await generateMultiCityGuides({
      userId: "u1",
      language: "pt-BR",
      destinations: [
        { city: "Lisboa", order: 0 },
        { city: "Porto", order: 1 },
        { city: "Madrid", order: 2 },
      ],
    });

    expect(result).toHaveLength(3);
    expect(result[0]!.status).toBe("success");
    expect(result[1]!.status).toBe("error");
    expect(result[1]!.error).toContain("AI_TIMEOUT");
    expect(result[2]!.status).toBe("success");
  });

  it("returns results sorted by declared order even when destinations are scrambled", async () => {
    mockGenerateDestinationGuide.mockResolvedValue(STUB_CONTENT);

    const result = await generateMultiCityGuides({
      userId: "u1",
      language: "pt-BR",
      destinations: [
        { city: "C", order: 2 },
        { city: "A", order: 0 },
        { city: "B", order: 1 },
      ],
    });

    expect(result.map((r) => r.city)).toEqual(["A", "B", "C"]);
    expect(result.map((r) => r.order)).toEqual([0, 1, 2]);
  });

  it("propagates shared traveler context into every call", async () => {
    mockGenerateDestinationGuide.mockResolvedValue(STUB_CONTENT);

    await generateMultiCityGuides({
      userId: "u1",
      language: "pt-BR",
      destinations: [
        { city: "Lisboa", order: 0 },
        { city: "Porto", order: 1 },
      ],
      travelerContext: {
        budget: 3000,
        budgetCurrency: "EUR",
        travelPace: 5,
        interests: ["culture", "food"],
      },
      extraCategories: ["historic"],
      personalNotes: "prefer vegetarian food",
    });

    const calls = mockGenerateDestinationGuide.mock.calls.map((c) => c[0]);
    for (const call of calls) {
      expect(call.travelerContext.budget).toBe(3000);
      expect(call.extraCategories).toEqual(["historic"]);
      expect(call.personalNotes).toBe("prefer vegetarian food");
    }
  });
});
