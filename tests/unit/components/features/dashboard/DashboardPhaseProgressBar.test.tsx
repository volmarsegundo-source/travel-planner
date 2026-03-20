/**
 * Unit tests for DashboardPhaseProgressBar component.
 *
 * Tests cover: interactive segments when tripId is provided, non-interactive when not,
 * completed/current/incomplete/coming-soon visual states, aria-labels.
 * Updated Sprint 31: 4-state color system (green/blue/gray/gray-dashed).
 * Updated Sprint 32: completedPhases changed from count (number) to array (number[]).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();

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

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({ children, ...props }: Record<string, unknown>) => children,
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { DashboardPhaseProgressBar } from "@/components/features/dashboard/DashboardPhaseProgressBar";

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardPhaseProgressBar", () => {
  it("renders 6 segments (only active phases, not coming-soon 7-8)", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    expect(container.children).toHaveLength(6);
  });

  // ─── Non-interactive (no tripId) ──────────────────────────────────────

  it("segments are NOT links (no anchor elements) when no tripId", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={[1, 2, 3]} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    const anchors = container.querySelectorAll("a");
    expect(anchors).toHaveLength(0);
  });

  it("all segment elements are DIV elements when no tripId", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={[1, 2, 3]} />
    );

    for (let i = 1; i <= 6; i++) {
      const seg = screen.getByTestId(`phase-segment-${i}`);
      expect(seg.tagName).toBe("DIV");
    }
  });

  it("segments do not have cursor-pointer class when no tripId", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} />
    );

    for (let i = 1; i <= 6; i++) {
      const seg = screen.getByTestId(`phase-segment-${i}`);
      expect(seg.className).not.toContain("cursor-pointer");
    }
  });

  // ─── Interactive (with tripId) ────────────────────────────────────────

  it("completed/current segments are BUTTON elements when tripId is provided", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={[1, 2, 3]} tripId="trip-123" />
    );

    // Phases 1-3 completed, phase 4 current = 4 buttons
    for (let i = 1; i <= 4; i++) {
      const seg = screen.getByTestId(`phase-segment-${i}`);
      expect(seg.tagName).toBe("BUTTON");
    }
    // Phases 5-6 not navigable = DIV (phases 7-8 no longer rendered)
    for (let i = 5; i <= 6; i++) {
      const seg = screen.getByTestId(`phase-segment-${i}`);
      expect(seg.tagName).toBe("DIV");
    }
  });

  it("completed segments have cursor-pointer class when tripId provided", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} tripId="trip-123" />
    );

    // Phase 1 (completed) should have cursor-pointer
    const seg1 = screen.getByTestId("phase-segment-1");
    expect(seg1.className).toContain("cursor-pointer");
  });

  it("clicking completed phase navigates to that phase", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={[1, 2, 3]} tripId="trip-123" />
    );

    const seg2 = screen.getByTestId("phase-segment-2");
    fireEvent.click(seg2);
    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-123/phase-2");
  });

  it("clicking current phase navigates to that phase", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} tripId="trip-123" />
    );

    const seg3 = screen.getByTestId("phase-segment-3");
    fireEvent.click(seg3);
    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-123/phase-3");
  });

  it("clicking phase 1 navigates to phase-1 (not expedition root)", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} tripId="trip-123" />
    );

    const seg1 = screen.getByTestId("phase-segment-1");
    fireEvent.click(seg1);
    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-123/phase-1");
  });

  // ─── Visual states ──────────────────────────────────────────────────────

  it("completed phases have green background", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={[1, 2, 3]} />
    );

    for (let i = 1; i <= 3; i++) {
      expect(screen.getByTestId(`phase-segment-${i}`)).toHaveClass("bg-green-500");
    }
  });

  it("current phase has blue color with pulse animation", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={[1, 2, 3]} />
    );

    const seg4 = screen.getByTestId("phase-segment-4");
    expect(seg4).toHaveClass("bg-blue-500", "motion-safe:animate-pulse");
  });

  it("incomplete (upcoming) phases have outlined border, no fill", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} />
    );

    // Phases 4-6 should be outlined (border, bg-transparent)
    for (let i = 4; i <= 6; i++) {
      const seg = screen.getByTestId(`phase-segment-${i}`);
      expect(seg).toHaveClass("border");
      expect(seg).toHaveClass("bg-transparent");
      expect(seg).not.toHaveClass("opacity-50");
    }
  });

  it("phases 7-8 are not rendered (filtered out)", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} />
    );

    expect(screen.queryByTestId("phase-segment-7")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phase-segment-8")).not.toBeInTheDocument();
  });

  it("all completed when completedPhases includes all 6 active phases", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={6} completedPhases={[1, 2, 3, 4, 5, 6]} />
    );

    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`phase-segment-${i}`)).toHaveClass("bg-green-500");
    }
  });

  it("no completed when completedPhases is empty", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={1} completedPhases={[]} />
    );

    // Phase 1 is current
    expect(screen.getByTestId("phase-segment-1")).toHaveClass("bg-blue-500");
    // Phases 2-6 are incomplete
    for (let i = 2; i <= 6; i++) {
      expect(screen.getByTestId(`phase-segment-${i}`)).toHaveClass("bg-transparent");
    }
  });

  // ─── Array-based completedPhases: non-sequential ─────────────────────

  it("marks only specific phases as completed when array is non-sequential", () => {
    // Only phases 1 and 3 are completed (skipped phase 2)
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={[1, 3]} />
    );

    // Phase 1: completed (green)
    expect(screen.getByTestId("phase-segment-1")).toHaveClass("bg-green-500");
    // Phase 2: NOT completed (transparent, since it's behind currentPhase)
    expect(screen.getByTestId("phase-segment-2")).not.toHaveClass("bg-green-500");
    // Phase 3: completed (green)
    expect(screen.getByTestId("phase-segment-3")).toHaveClass("bg-green-500");
    // Phase 4: current (blue)
    expect(screen.getByTestId("phase-segment-4")).toHaveClass("bg-blue-500");
  });

  // ─── Aria labels ────────────────────────────────────────────────────────

  it("segments have aria-labels with phase names and state", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} />
    );

    // Completed phase should say "completed"
    const completedSegment = screen.getByLabelText(/phases\.theCalling.*stateCompleted/);
    expect(completedSegment).toBeInTheDocument();

    // Current phase should say "current"
    const currentSegment = screen.getByLabelText(/phases\.thePreparation.*stateCurrent/);
    expect(currentSegment).toBeInTheDocument();

    // Upcoming phase should say "upcoming" (phases 7-8 no longer rendered)
    const upcomingSegment = screen.getByLabelText(/phases\.theDestinationGuide.*stateUpcoming/);
    expect(upcomingSegment).toBeInTheDocument();
  });

  it("has group role with progress label", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} />
    );

    const group = screen.getByRole("group");
    expect(group).toHaveAttribute(
      "aria-label",
      expect.stringContaining("phases.progressLabel")
    );
  });

  // ─── Phase name labels (UX-007) ────────────────────────────────────────

  it("renders phase name labels below each segment", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} />
    );

    for (let i = 1; i <= 6; i++) {
      const label = screen.getByTestId(`phase-name-${i}`);
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute("aria-hidden", "true");
    }
    // Phases 7-8 are not rendered
    expect(screen.queryByTestId("phase-name-7")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phase-name-8")).not.toBeInTheDocument();
  });

  // ─── Completed phases have checkmark indicators ──────────────────────────

  it("completed phases display a checkmark icon", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={[1, 2]} />
    );

    // Completed phases (1, 2) should each have a child element with the check icon
    const seg1 = screen.getByTestId("phase-segment-1");
    const seg2 = screen.getByTestId("phase-segment-2");
    // Check icon is an SVG with aria-hidden
    expect(seg1.querySelector("[aria-hidden]")).toBeInTheDocument();
    expect(seg2.querySelector("[aria-hidden]")).toBeInTheDocument();
  });
});
