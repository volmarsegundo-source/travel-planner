/**
 * Unit tests for DashboardPhaseProgressBar component.
 *
 * Tests cover: completed/current/future/coming-soon segment states,
 * aria-labels, and indicator icons.
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

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children?: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

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
    // Each phase definition = 1 segment
    expect(container.children).toHaveLength(8);
  });

  it("marks completed phases with gold background", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={3} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    // Phases 1-3 should be completed (gold)
    for (let i = 0; i < 3; i++) {
      expect(container.children[i]).toHaveClass("bg-atlas-gold");
    }
  });

  it("marks current phase with primary color and pulse animation", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={4} completedPhases={3} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    // Phase 4 (index 3) is current
    expect(container.children[3]).toHaveClass("bg-primary", "animate-pulse");
  });

  it("marks future phases (not 7-8) with muted background", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    // Phases 4-6 (indices 3-5) should be muted (not completed, not current, not 7-8)
    for (let i = 3; i < 6; i++) {
      expect(container.children[i]).toHaveClass("bg-muted");
      expect(container.children[i]).not.toHaveClass("opacity-50");
    }
  });

  it("marks phases 7-8 as coming soon with reduced opacity", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    const container = screen.getByTestId("dashboard-phase-progress-bar");
    // Phases 7-8 (indices 6-7) should have opacity-50
    expect(container.children[6]).toHaveClass("opacity-50");
    expect(container.children[7]).toHaveClass("opacity-50");
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
    // Rest are muted or coming soon
    for (let i = 1; i < 6; i++) {
      expect(container.children[i]).toHaveClass("bg-muted");
    }
  });

  it("segments have aria-labels with phase names and state", () => {
    render(
      <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
    );

    // Completed phase should say "completed"
    const completedSegment = screen.getByLabelText(/phases\.theCalling.*completed/);
    expect(completedSegment).toBeInTheDocument();

    // Current phase should say "current"
    const currentSegment = screen.getByLabelText(/phases\.theRoute.*current/);
    expect(currentSegment).toBeInTheDocument();

    // Coming soon phase
    const comingSoonSegment = screen.getByLabelText(/phases\.theExpedition.*coming soon/);
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

  // ─── Clickable segments (T-S21-007) ────────────────────────────────────────

  describe("clickable segments", () => {
    it("completed phases are links when tripId is provided", () => {
      render(
        <DashboardPhaseProgressBar
          currentPhase={3}
          completedPhases={2}
          tripId="trip-abc"
        />
      );

      // Phase 1 (completed) should be a link
      const phase1Link = screen.getByLabelText(/phases\.theCalling.*completed/);
      expect(phase1Link.tagName).toBe("A");
      expect(phase1Link).toHaveAttribute(
        "href",
        "/expedition/trip-abc/phase-1"
      );
    });

    it("current phase is a link when tripId is provided", () => {
      render(
        <DashboardPhaseProgressBar
          currentPhase={3}
          completedPhases={2}
          tripId="trip-abc"
        />
      );

      const currentLink = screen.getByLabelText(/phases\.theRoute.*current/);
      expect(currentLink.tagName).toBe("A");
      expect(currentLink).toHaveAttribute(
        "href",
        "/expedition/trip-abc/phase-3"
      );
    });

    it("future phases are not links", () => {
      render(
        <DashboardPhaseProgressBar
          currentPhase={3}
          completedPhases={2}
          tripId="trip-abc"
        />
      );

      // Phase 4 (upcoming, not completed, not current) should be a div
      const phase4 = screen.getByLabelText(/phases\.theLogistics.*upcoming/);
      expect(phase4.tagName).toBe("DIV");
    });

    it("coming-soon phases are not links", () => {
      render(
        <DashboardPhaseProgressBar
          currentPhase={3}
          completedPhases={2}
          tripId="trip-abc"
        />
      );

      const phase7 = screen.getByLabelText(/phases\.theExpedition.*coming soon/);
      expect(phase7.tagName).toBe("DIV");
    });

    it("segments are not links when tripId is not provided", () => {
      render(
        <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
      );

      // Even completed phases should be divs
      const phase1 = screen.getByLabelText(/phases\.theCalling.*completed/);
      expect(phase1.tagName).toBe("DIV");
    });

    it("clickable segments have cursor-pointer class", () => {
      render(
        <DashboardPhaseProgressBar
          currentPhase={3}
          completedPhases={2}
          tripId="trip-abc"
        />
      );

      const phase1 = screen.getByLabelText(/phases\.theCalling.*completed/);
      expect(phase1.className).toContain("cursor-pointer");
      expect(phase1.className).toContain("hover:opacity-80");
    });
  });

  // ─── Phase labels / tooltips (T-S21-008) ──────────────────────────────────

  describe("phase labels", () => {
    it("renders phase label elements for each segment", () => {
      render(
        <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
      );

      // Each phase should have a label element
      for (let i = 1; i <= 8; i++) {
        expect(screen.getByTestId(`phase-label-${i}`)).toBeInTheDocument();
      }
    });

    it("phase label contains the phase name", () => {
      render(
        <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
      );

      const label1 = screen.getByTestId("phase-label-1");
      expect(label1.textContent).toBe("phases.theCalling");
    });

    it("phase labels are hidden from screen readers (aria-hidden)", () => {
      render(
        <DashboardPhaseProgressBar currentPhase={3} completedPhases={2} />
      );

      const label1 = screen.getByTestId("phase-label-1");
      expect(label1).toHaveAttribute("aria-hidden", "true");
    });
  });
});
