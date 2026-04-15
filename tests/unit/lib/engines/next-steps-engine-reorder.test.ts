/**
 * Sprint 44 Wave 4 — NextStepsEngine flag-aware tests.
 *
 * Tests TC-NAV-E07 and adjacent cases from SPEC-QA-REORDER-PHASES §3.2:
 *   - flag ON:  "currentPhase=3" means Guide → suggest "Complete Guide"
 *   - flag ON:  "currentPhase=6" means Checklist → special completeChecklist case
 *   - flag OFF: "currentPhase=3" means Checklist (legacy) → completeChecklist
 *   - flag ON:  phase 3 (Guide) not_started → startPhase label
 *   - flag ON:  phase 4 (Itinerary) partial → continuePhase label
 *   - Both flag states: max 3 suggestions still enforced
 *   - Both flag states: allDone path unchanged
 *
 * Spec ref: SPEC-QA-REORDER-PHASES §3.2, TC-NAV-E07
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock flag helper ─────────────────────────────────────────────────────────

const mockFlag = vi.hoisted(() => ({ isPhaseReorderEnabled: vi.fn(() => false) }));
vi.mock("@/lib/flags/phase-reorder", () => mockFlag);

// ─── Import SUT after mock ────────────────────────────────────────────────────

import { getNextStepsSuggestions } from "@/lib/engines/next-steps-engine";
import type { PhaseReadiness } from "@/server/services/trip-readiness.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setFlag(enabled: boolean) {
  mockFlag.isPhaseReorderEnabled.mockReturnValue(enabled);
}

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

beforeEach(() => {
  vi.clearAllMocks();
  setFlag(false);
});

// ─── TC-NAV-E07: flag ON, currentPhase=3 = Guide ─────────────────────────────

describe("TC-NAV-E07: flag ON — phase 3 = Guide (not Checklist)", () => {
  beforeEach(() => setFlag(true));

  it("phase 3 partial with flag ON recommends continuing Guide (not completeChecklist)", () => {
    const phases = [
      makePhase({
        phase: 3,
        name: "Guia do Destino",
        status: "partial",
        readinessPercent: 30,
        dataSnapshot: {},
      }),
    ];
    const result = getNextStepsSuggestions("trip-nav-e07", phases, 30);

    // With flag ON, phase 3 is Guide — the completeChecklist special case must NOT fire
    // (that requires phase 6 to be the checklist in new order)
    expect(result[0].labelKey).not.toBe("expedition.nextSteps.completeChecklist");
    expect(result[0].labelKey).toMatch(/continuePhase|startPhase/);
  });

  it("phase 3 not_started with flag ON suggests startPhase for Guide", () => {
    const phases = [
      makePhase({ phase: 3, name: "Guia do Destino", status: "not_started" }),
    ];
    const result = getNextStepsSuggestions("trip-nav-e07", phases, 0);

    expect(result[0].labelKey).toBe("expedition.nextSteps.startPhase");
    // The name passed should be Guide, not Preparo
    expect(result[0].labelValues?.phase).toBe("Guia do Destino");
  });

  // BUG DETECTED: BUG-S44-W4-002
  // getNextStepsSuggestions hardcodes the completeChecklist special case on phase === 3.
  // When flag ON, the Checklist is at phase 6. The engine does not consult the flag.
  // Current behavior: phase 6 partial returns "continuePhase" (wrong with flag ON).
  // Expected behavior: phase 6 partial returns "completeChecklist" when flag ON.
  //
  // BUG ID: BUG-S44-W4-002
  // Severity: S3-Medium (UX: user sees generic "continue" instead of specific checklist CTA)
  // Priority: P2 — Should fix before flag retirement
  // Location: src/lib/engines/next-steps-engine.ts — make checklist phase detection flag-aware
  // TODO: un-skip this test after BUG-S44-W4-002 is fixed in next-steps-engine.ts
  it("phase 6 partial with flag ON recommends completeChecklist (Checklist is at slot 6) [BUG-S44-W4-002]", () => {
    const phases = [
      makePhase({
        phase: 6,
        name: "O Preparo",
        status: "partial",
        readinessPercent: 60,
        dataSnapshot: { done: 2, total: 5 },
      }),
    ];
    const result = getNextStepsSuggestions("trip-nav-e07", phases, 60);

    expect(result[0].labelKey).toBe("expedition.nextSteps.completeChecklist");
    expect(result[0].labelValues?.done).toBe(2);
    expect(result[0].labelValues?.total).toBe(5);
  });

  it("phase 4 (Itinerary) partial with flag ON recommends continuePhase", () => {
    const phases = [
      makePhase({ phase: 4, name: "O Roteiro", status: "partial", readinessPercent: 50 }),
    ];
    const result = getNextStepsSuggestions("trip-nav-e07", phases, 50);
    expect(result[0].labelKey).toBe("expedition.nextSteps.continuePhase");
  });

  it("phase 5 (Logistics) not_started with flag ON suggests startPhase", () => {
    const phases = [
      makePhase({ phase: 5, name: "A Logística", status: "not_started" }),
    ];
    const result = getNextStepsSuggestions("trip-nav-e07", phases, 0);
    expect(result[0].labelKey).toBe("expedition.nextSteps.startPhase");
    expect(result[0].labelValues?.phase).toBe("A Logística");
  });
});

// ─── Flag OFF: phase 3 = Checklist (legacy behavior preserved) ───────────────

describe("flag OFF — phase 3 = Checklist (legacy, backward compat)", () => {
  beforeEach(() => setFlag(false));

  it("phase 3 partial with flag OFF recommends completeChecklist (old behavior)", () => {
    const phases = [
      makePhase({
        phase: 3,
        name: "The Preparation",
        status: "partial",
        readinessPercent: 60,
        dataSnapshot: { done: 3, total: 5 },
      }),
    ];
    const result = getNextStepsSuggestions("trip-flag-off", phases, 60);
    expect(result[0].labelKey).toBe("expedition.nextSteps.completeChecklist");
    expect(result[0].labelValues?.done).toBe(3);
    expect(result[0].labelValues?.total).toBe(5);
  });

  it("phase 6 with flag OFF does not trigger completeChecklist (Itinerary at slot 6)", () => {
    const phases = [
      makePhase({
        phase: 6,
        name: "O Roteiro",
        status: "partial",
        readinessPercent: 40,
        dataSnapshot: {},
      }),
    ];
    const result = getNextStepsSuggestions("trip-flag-off", phases, 40);
    expect(result[0].labelKey).not.toBe("expedition.nextSteps.completeChecklist");
  });
});

// ─── Common invariants: both flag states ─────────────────────────────────────

describe("invariants — same under both flag states", () => {
  for (const flagState of [false, true]) {
    it(`flag ${flagState ? "ON" : "OFF"}: allDone path still works when readinessPercent=100`, () => {
      setFlag(flagState);
      const phases = [makePhase({ status: "complete", readinessPercent: 100 })];
      const result = getNextStepsSuggestions("trip-invariant", phases, 100);
      expect(result[0].labelKey).toBe("expedition.nextSteps.allDone");
      expect(result[0].targetUrl).toContain("summary");
    });

    it(`flag ${flagState ? "ON" : "OFF"}: max 3 suggestions enforced`, () => {
      setFlag(flagState);
      const phases = [
        makePhase({ phase: 1, status: "not_started" }),
        makePhase({ phase: 2, status: "not_started" }),
        makePhase({ phase: 3, status: "not_started" }),
        makePhase({ phase: 4, status: "not_started" }),
        makePhase({ phase: 5, status: "not_started" }),
      ];
      const result = getNextStepsSuggestions("trip-invariant", phases, 0);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it(`flag ${flagState ? "ON" : "OFF"}: empty phases returns startPlanning`, () => {
      setFlag(flagState);
      const result = getNextStepsSuggestions("trip-invariant", [], 0);
      expect(result[0].labelKey).toBe("expedition.nextSteps.startPlanning");
    });

    it(`flag ${flagState ? "ON" : "OFF"}: phase 1 URL is /expedition/:tripId (no phase suffix)`, () => {
      setFlag(flagState);
      const phases = [makePhase({ phase: 1, status: "not_started" })];
      const result = getNextStepsSuggestions("trip-url-test", phases, 0);
      expect(result[0].targetUrl).toBe("/expedition/trip-url-test");
    });
  }
});

// ─── New order happy path: 1→2→3→4→5→6 (flag ON) ────────────────────────────

describe("TC-NAV-001 unit: flag ON — new order happy path phase sequence", () => {
  beforeEach(() => setFlag(true));

  it("phases 1–5 complete, phase 6 (Checklist) not_started → suggest completing Checklist", () => {
    const phases = [
      makePhase({ phase: 1, name: "A Inspiração", status: "complete", readinessPercent: 100 }),
      makePhase({ phase: 2, name: "O Perfil", status: "complete", readinessPercent: 100 }),
      makePhase({ phase: 3, name: "Guia do Destino", status: "complete", readinessPercent: 100 }),
      makePhase({ phase: 4, name: "O Roteiro", status: "complete", readinessPercent: 100 }),
      makePhase({ phase: 5, name: "A Logística", status: "complete", readinessPercent: 100 }),
      makePhase({
        phase: 6,
        name: "O Preparo",
        status: "not_started",
        readinessPercent: 0,
        dataSnapshot: {},
      }),
    ];
    const result = getNextStepsSuggestions("trip-happy-path", phases, 83);
    expect(result[0].labelKey).toBe("expedition.nextSteps.startPhase");
    expect(result[0].labelValues?.phase).toBe("O Preparo");
    expect(result[0].targetUrl).toContain("phase-6");
  });

  it("phase 3 (Guide) is first incomplete phase → Guide is the top suggestion", () => {
    const phases = [
      makePhase({ phase: 1, name: "A Inspiração", status: "complete", readinessPercent: 100 }),
      makePhase({ phase: 2, name: "O Perfil", status: "complete", readinessPercent: 100 }),
      makePhase({ phase: 3, name: "Guia do Destino", status: "not_started", readinessPercent: 0 }),
      makePhase({ phase: 4, name: "O Roteiro", status: "not_started", readinessPercent: 0 }),
    ];
    const result = getNextStepsSuggestions("trip-happy-path", phases, 33);
    // Top suggestion must be phase 3 (Guide), not phase 4 or any other
    expect(result[0].targetUrl).toContain("phase-3");
  });
});
