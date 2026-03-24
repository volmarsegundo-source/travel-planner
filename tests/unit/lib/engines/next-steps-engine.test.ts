/**
 * Unit tests for NextStepsEngine.
 * SPEC-PROD-011: Next step suggestions.
 */
import { describe, it, expect } from "vitest";
import { getNextStepsSuggestions } from "@/lib/engines/next-steps-engine";
import type { PhaseReadiness } from "@/server/services/trip-readiness.service";

function makePhase(overrides: Partial<PhaseReadiness> = {}): PhaseReadiness {
  return {
    phase: 1,
    name: "The Inspiration",
    weight: 0.4,
    status: "not_started",
    readinessPercent: 0,
    dataSnapshot: {},
    ...overrides,
  };
}

describe("getNextStepsSuggestions", () => {
  const tripId = "trip-123";

  it("returns allDone when readinessPercent is 100", () => {
    const phases = [makePhase({ status: "complete", readinessPercent: 100 })];
    const result = getNextStepsSuggestions(tripId, phases, 100);
    expect(result).toHaveLength(1);
    expect(result[0].labelKey).toBe("expedition.nextSteps.allDone");
    expect(result[0].targetUrl).toContain("summary");
  });

  it("suggests starting not_started phases", () => {
    const phases = [
      makePhase({ phase: 1, name: "The Inspiration", status: "not_started" }),
      makePhase({ phase: 2, name: "The Profile", status: "not_started" }),
    ];
    const result = getNextStepsSuggestions(tripId, phases, 0);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].labelKey).toBe("expedition.nextSteps.startPhase");
    expect(result[0].labelValues?.phase).toBe("The Inspiration");
  });

  it("suggests continuing partial phases", () => {
    const phases = [
      makePhase({ phase: 1, status: "partial", readinessPercent: 50 }),
    ];
    const result = getNextStepsSuggestions(tripId, phases, 50);
    expect(result[0].labelKey).toBe("expedition.nextSteps.continuePhase");
  });

  it("special case: checklist phase 3 with counts", () => {
    const phases = [
      makePhase({
        phase: 3,
        name: "The Preparation",
        status: "partial",
        readinessPercent: 60,
        dataSnapshot: { done: 3, total: 5 },
      }),
    ];
    const result = getNextStepsSuggestions(tripId, phases, 60);
    expect(result[0].labelKey).toBe("expedition.nextSteps.completeChecklist");
    expect(result[0].labelValues?.done).toBe(3);
    expect(result[0].labelValues?.total).toBe(5);
  });

  it("limits to max 3 suggestions", () => {
    const phases = [
      makePhase({ phase: 1, status: "not_started" }),
      makePhase({ phase: 2, status: "not_started" }),
      makePhase({ phase: 3, status: "not_started" }),
      makePhase({ phase: 4, status: "not_started" }),
    ];
    const result = getNextStepsSuggestions(tripId, phases, 0);
    expect(result).toHaveLength(3);
  });

  it("returns startPlanning if no suggestions found", () => {
    const result = getNextStepsSuggestions(tripId, [], 0);
    expect(result).toHaveLength(1);
    expect(result[0].labelKey).toBe("expedition.nextSteps.startPlanning");
  });

  it("sorts by priority (phase number)", () => {
    const phases = [
      makePhase({ phase: 3, status: "not_started" }),
      makePhase({ phase: 1, status: "not_started" }),
      makePhase({ phase: 2, status: "not_started" }),
    ];
    const result = getNextStepsSuggestions(tripId, phases, 0);
    expect(result[0].priority).toBeLessThanOrEqual(result[1].priority);
  });

  it("generates correct URLs for phase 1", () => {
    const phases = [makePhase({ phase: 1, status: "not_started" })];
    const result = getNextStepsSuggestions(tripId, phases, 0);
    expect(result[0].targetUrl).toBe(`/expedition/${tripId}`);
  });

  it("generates correct URLs for other phases", () => {
    const phases = [makePhase({ phase: 4, status: "not_started" })];
    const result = getNextStepsSuggestions(tripId, phases, 0);
    expect(result[0].targetUrl).toBe(`/expedition/${tripId}/phase-4`);
  });

  it("skips complete phases", () => {
    const phases = [
      makePhase({ phase: 1, name: "The Inspiration", status: "complete", readinessPercent: 100 }),
      makePhase({ phase: 2, name: "The Profile", status: "not_started" }),
    ];
    const result = getNextStepsSuggestions(tripId, phases, 50);
    expect(result[0].labelKey).toBe("expedition.nextSteps.startPhase");
    expect(result[0].labelValues?.phase).toBe("The Profile");
  });
});
