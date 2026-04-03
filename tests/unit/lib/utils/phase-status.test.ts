import { describe, it, expect } from "vitest";
import {
  getPhaseStatusVisual,
  deriveCanonicalStatus,
  type PhaseStatus,
} from "@/lib/utils/phase-status";

describe("getPhaseStatusVisual", () => {
  const ALL_STATUSES: PhaseStatus[] = [
    "completed",
    "in_progress",
    "pending",
    "not_started",
    "locked",
  ];

  it.each(ALL_STATUSES)("returns a valid visual object for %s", (status) => {
    const visual = getPhaseStatusVisual(status);
    expect(visual).toBeDefined();
    expect(visual.badgeColor).toMatch(/^(success|warning|info)$/);
    expect(visual.badgeTextKey).toBeTruthy();
    expect(visual.icon).toMatch(/^(check|number|lock|outline)$/);
    expect(typeof visual.showPin).toBe("boolean");
    expect(typeof visual.showAlert).toBe("boolean");
  });

  it("completed has green success styling", () => {
    const v = getPhaseStatusVisual("completed");
    expect(v.circleBg).toBe("bg-atlas-success");
    expect(v.badgeColor).toBe("success");
    expect(v.icon).toBe("check");
    expect(v.borderClass).toContain("border-l-atlas-success");
    expect(v.showPin).toBe(true);
    expect(v.showAlert).toBe(false);
    expect(v.pinColor).toBe("#10b981");
  });

  it("in_progress has orange/primary styling", () => {
    const v = getPhaseStatusVisual("in_progress");
    expect(v.circleBg).toBe("bg-amber-500");
    expect(v.badgeColor).toBe("warning");
    expect(v.icon).toBe("number");
    expect(v.showPin).toBe(true);
    expect(v.showAlert).toBe(false);
  });

  it("pending has amber styling with alert", () => {
    const v = getPhaseStatusVisual("pending");
    expect(v.circleBg).toBe("bg-amber-500");
    expect(v.badgeColor).toBe("warning");
    expect(v.icon).toBe("number");
    expect(v.borderClass).toContain("border-l-amber-500");
    expect(v.showAlert).toBe(true);
    expect(v.alertBg).toBe("bg-amber-50");
    expect(v.alertText).toBe("text-amber-800");
  });

  it("not_started has gray outline styling", () => {
    const v = getPhaseStatusVisual("not_started");
    expect(v.circleBg).toBe("");
    expect(v.circleBorder).toContain("border-gray-300");
    expect(v.badgeColor).toBe("info");
    expect(v.icon).toBe("outline");
    expect(v.showPin).toBe(false);
    expect(v.cardOpacity).toBe("opacity-60");
  });

  it("locked has gray with lock icon", () => {
    const v = getPhaseStatusVisual("locked");
    expect(v.circleBg).toBe("bg-gray-200");
    expect(v.icon).toBe("lock");
    expect(v.showPin).toBe(false);
    expect(v.cardOpacity).toBe("opacity-50");
  });
});

describe("deriveCanonicalStatus", () => {
  it("maps complete to completed", () => {
    expect(
      deriveCanonicalStatus({
        readinessStatus: "complete",
        phaseNumber: 1,
        isCurrentPhase: false,
      })
    ).toBe("completed");
  });

  it("maps complete with pending items to pending", () => {
    expect(
      deriveCanonicalStatus({
        readinessStatus: "complete",
        phaseNumber: 3,
        isCurrentPhase: false,
        hasPendingItems: true,
      })
    ).toBe("pending");
  });

  it("maps partial + current phase to in_progress", () => {
    expect(
      deriveCanonicalStatus({
        readinessStatus: "partial",
        phaseNumber: 2,
        isCurrentPhase: true,
      })
    ).toBe("in_progress");
  });

  it("maps partial + not current to in_progress (no pending)", () => {
    expect(
      deriveCanonicalStatus({
        readinessStatus: "partial",
        phaseNumber: 4,
        isCurrentPhase: false,
      })
    ).toBe("in_progress");
  });

  it("maps partial + not current + pending items to pending", () => {
    expect(
      deriveCanonicalStatus({
        readinessStatus: "partial",
        phaseNumber: 4,
        isCurrentPhase: false,
        hasPendingItems: true,
      })
    ).toBe("pending");
  });

  it("maps not_started to not_started", () => {
    expect(
      deriveCanonicalStatus({
        readinessStatus: "not_started",
        phaseNumber: 5,
        isCurrentPhase: false,
      })
    ).toBe("not_started");
  });

  it("always returns locked for phases 7+", () => {
    expect(
      deriveCanonicalStatus({
        readinessStatus: "not_started",
        phaseNumber: 7,
        isCurrentPhase: false,
      })
    ).toBe("locked");

    expect(
      deriveCanonicalStatus({
        readinessStatus: "complete",
        phaseNumber: 8,
        isCurrentPhase: false,
      })
    ).toBe("locked");
  });

  it("Phase 3 complete with pending checklist items = pending", () => {
    expect(
      deriveCanonicalStatus({
        readinessStatus: "complete",
        phaseNumber: 3,
        isCurrentPhase: false,
        hasPendingItems: true,
      })
    ).toBe("pending");
  });

  it("Phase 4 partial with undecided items = pending", () => {
    expect(
      deriveCanonicalStatus({
        readinessStatus: "partial",
        phaseNumber: 4,
        isCurrentPhase: false,
        hasPendingItems: true,
      })
    ).toBe("pending");
  });
});
