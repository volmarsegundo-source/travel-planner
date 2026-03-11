/**
 * Unit tests for DashboardPhaseProgressBar component.
 *
 * Tests cover: non-interactive segments, completed/current/incomplete/coming-soon visual states,
 * aria-labels, and absence of Link components.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) => {
      if (!values) return key;
      const suffix = Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
      return `${key}[${suffix}]`;
    },
}));

// No Link mock needed — component no longer uses Link

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { DashboardPhaseProgressBar } from "@/components/features/dashboard/DashboardPhaseProgressBar";

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardPhaseProgressBar", () => {
  it("renders 8 segments", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    expect(container.children).toHaveLength(8);
  });

  // ─── Non-interactive segments ───────────────────────────────────────────

  it("segments are NOT links (no anchor elements)", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={3} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    const anchors = container.querySelectorAll("a");
    expect(anchors).toHaveLength(0);
  });

  it("all segments are DIV elements", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={3} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    for (let i = 0; i < 8; i++) {
      expect(container.children[i].tagName).toBe("DIV");
    }
  });

  it("segments do not have cursor-pointer class", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    for (let i = 0; i < 8; i++) {
      expect(container.children[i].className).not.toContain("cursor-pointer");
    }
  });

  // ─── Visual states ──────────────────────────────────────────────────────

  it("completed phases have gold background", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={3} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    for (let i = 0; i < 3; i++) {
      expect(container.children[i]).toHaveClass("bg-atlas-gold");
    }
  });

  it("current phase has primary color with pulse animation", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={3} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    expect(container.children[3]).toHaveClass("bg-primary", "motion-safe:animate-pulse");
  });

  it("incomplete (upcoming) phases have outlined border, no fill", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    // Phases 4-6 (indices 3-5) should be outlined (border, bg-transparent)
    for (let i = 3; i < 6; i++) {
      expect(container.children[i]).toHaveClass("border");
      expect(container.children[i]).toHaveClass("bg-transparent");
      expect(container.children[i]).not.toHaveClass("opacity-50");
    }
  });

  it("coming-soon phases (7-8) have dashed border and 50% opacity", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    // Phases 7-8 (indices 6-7)
    expect(container.children[6]).toHaveClass("border-dashed", "opacity-50");
    expect(container.children[7]).toHaveClass("border-dashed", "opacity-50");
  });

  it("all completed when completedPhases equals 8", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={8} completedPhases={8} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    for (let i = 0; i < 8; i++) {
      expect(container.children[i]).toHaveClass("bg-atlas-gold");
    }
  });

  it("no completed when completedPhases is 0", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={1} completedPhases={0} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    // Phase 1 (index 0) is current
    expect(container.children[0]).toHaveClass("bg-primary");
    // Phases 2-6 are incomplete
    for (let i = 1; i < 6; i++) {
      expect(container.children[i]).toHaveClass("bg-transparent");
    }
  });

  // ─── Aria labels ────────────────────────────────────────────────────────

  it("segments have aria-labels with phase names and state", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    // Completed phase should say "completed"
    const completedSegment = screen.getByLabelText(/phases\.theCalling.*stateCompleted/);
    expect(completedSegment).toBeInTheDocument();

    // Current phase should say "current"
    const currentSegment = screen.getByLabelText(/phases\.thePreparation.*stateCurrent/);
    expect(currentSegment).toBeInTheDocument();

    // Coming soon phase
    const comingSoonSegment = screen.getByLabelText(/phases\.theExpedition.*stateComingSoon/);
    expect(comingSoonSegment).toBeInTheDocument();
  });

  it("has group role with progress label", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    const group = screen.getByRole("group");
    expect(group).toHaveAttribute(
      "aria-label",
      expect.stringContaining("phases.progressLabel")
    );
  });

  // ─── No visible phase labels ────────────────────────────────────────────

  it("does not render visible phase label text elements", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    // The old phase-label test-ids should NOT exist
    for (let i = 1; i <= 8; i++) {
      expect(screen.queryByTestId(`phase-label-${i}`)).not.toBeInTheDocument();
    }
  });

  // ─── Completed phases have checkmark indicators ──────────────────────────

  it("completed phases display a checkmark icon", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    // Completed phases (1, 2) should each have a child element with the check icon
    const seg1 = screen.getByTestId("phase-segment-1");
    const seg2 = screen.getByTestId("phase-segment-2");
    // Check icon is an SVG with aria-hidden
    expect(seg1.querySelector("[aria-hidden]")).toBeInTheDocument();
    expect(seg2.querySelector("[aria-hidden]")).toBeInTheDocument();
  });
});
