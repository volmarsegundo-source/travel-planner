import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AtlasPhaseProgress, type PhaseSegment } from "../AtlasPhaseProgress";

const mockSegments: PhaseSegment[] = [
  { phase: 1, label: "The Calling", state: "completed", href: "/phase/1" },
  { phase: 2, label: "The Explorer", state: "completed", href: "/phase/2" },
  { phase: 3, label: "The Preparation", state: "active" },
  { phase: 4, label: "The Logistics", state: "pending" },
  { phase: 5, label: "Destination Guide", state: "locked" },
  { phase: 6, label: "The Itinerary", state: "locked" },
];

const mockSegmentsWithComingSoon: PhaseSegment[] = [
  { phase: 1, label: "The Calling", state: "completed", href: "/phase/1" },
  { phase: 2, label: "The Explorer", state: "completed", href: "/phase/2" },
  { phase: 3, label: "The Preparation", state: "active" },
  { phase: 4, label: "The Logistics", state: "pending" },
  { phase: 5, label: "Destination Guide", state: "pending" },
  { phase: 6, label: "The Itinerary", state: "pending" },
  { phase: 7, label: "The Treasure", state: "coming_soon", tooltip: "Coming Soon" },
  { phase: 8, label: "The Legacy", state: "coming_soon", tooltip: "Coming Soon" },
];

describe("AtlasPhaseProgress", () => {
  // ─── Wizard layout renders ─────────────────────────────────────────────────
  it("renders wizard layout with all 6 segments", () => {
    render(<AtlasPhaseProgress segments={mockSegments} layout="wizard" />);
    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(6);
  });

  // ─── Dashboard layout renders ──────────────────────────────────────────────
  it("renders dashboard layout with progressbar role", () => {
    render(<AtlasPhaseProgress segments={mockSegments} layout="dashboard" />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "2");
    expect(progressbar).toHaveAttribute("aria-valuemax", "6");
  });

  // ─── Completed segments are clickable in wizard ────────────────────────────
  it("renders non-locked segments as buttons in wizard layout", () => {
    const onClick = vi.fn();
    render(
      <AtlasPhaseProgress
        segments={mockSegments}
        layout="wizard"
        onSegmentClick={onClick}
      />,
    );
    const buttons = screen.getAllByRole("button");
    // Only completed + active are clickable (2 completed + 1 active).
    expect(buttons).toHaveLength(3);

    fireEvent.click(buttons[0]);
    expect(onClick).toHaveBeenCalledWith(1);

    fireEvent.click(buttons[1]);
    expect(onClick).toHaveBeenCalledWith(2);
  });

  // ─── Pending/locked segments are NOT clickable ────────────────────────────
  it("does not render buttons for locked segments in wizard", () => {
    render(
      <AtlasPhaseProgress
        segments={mockSegments}
        layout="wizard"
        onSegmentClick={vi.fn()}
      />,
    );
    // Only completed + active are buttons (pending and locked are not).
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  // ─── Screen reader labels ──────────────────────────────────────────────────
  it("provides screen reader text for each segment state", () => {
    render(<AtlasPhaseProgress segments={mockSegments} layout="wizard" />);
    expect(screen.getByText(/Phase 1: The Calling - completed/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 3: The Preparation - current/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 4: The Logistics - pending/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 5: Destination Guide - locked/)).toBeInTheDocument();
  });

  // ─── Progress label on wizard ──────────────────────────────────────────────
  it("sets aria-label with progress count on wizard list", () => {
    render(<AtlasPhaseProgress segments={mockSegments} layout="wizard" />);
    expect(screen.getByRole("list")).toHaveAttribute(
      "aria-label",
      "Phase progress: 2 of 6 completed",
    );
  });

  // ─── Dashboard clickable non-locked segments ───────────────────────────────
  it("renders clickable bars for non-locked phases in dashboard", () => {
    const onClick = vi.fn();
    render(
      <AtlasPhaseProgress
        segments={mockSegments}
        layout="dashboard"
        onSegmentClick={onClick}
      />,
    );
    const buttons = screen.getAllByRole("button");
    // Only completed + active are clickable (2 completed + 1 active).
    expect(buttons).toHaveLength(3);

    fireEvent.click(buttons[0]);
    expect(onClick).toHaveBeenCalledWith(1);
  });

  // ─── All segments same state (edge case) ───────────────────────────────────
  it("handles all-completed segments", () => {
    const allCompleted = mockSegments.map((s) => ({ ...s, state: "completed" as const }));
    render(<AtlasPhaseProgress segments={allCompleted} layout="dashboard" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "6");
  });

  // ─── Empty segments (edge case) ────────────────────────────────────────────
  it("renders empty state without crash", () => {
    render(<AtlasPhaseProgress segments={[]} layout="wizard" />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  // ─── Button accessibility labels ───────────────────────────────────────────
  it("completed buttons have descriptive aria-labels", () => {
    render(
      <AtlasPhaseProgress
        segments={mockSegments}
        layout="wizard"
        onSegmentClick={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Go to phase 1: The Calling/ }),
    ).toBeInTheDocument();
  });

  // ─── Coming soon segments show clock icon, not lock ───────────────────────
  it("renders coming_soon segments with clock icon and tooltip in wizard", () => {
    render(
      <AtlasPhaseProgress
        segments={mockSegmentsWithComingSoon}
        layout="wizard"
        onSegmentClick={vi.fn()}
      />,
    );
    // 8 segments total
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(8);

    // Only completed + active are clickable (2 completed + 1 active).
    // pending and coming_soon are not clickable.
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);

    // SR text says "coming soon"
    expect(screen.getByText(/Phase 7: The Treasure - coming soon/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 8: The Legacy - coming soon/)).toBeInTheDocument();
  });

  it("renders coming_soon segments with tooltip in dashboard", () => {
    render(
      <AtlasPhaseProgress
        segments={mockSegmentsWithComingSoon}
        layout="dashboard"
        onSegmentClick={vi.fn()}
      />,
    );
    // coming_soon segments should have tooltip title
    const comingSoonDivs = document.querySelectorAll('[title="Coming Soon"]');
    expect(comingSoonDivs.length).toBe(2);
  });
});
