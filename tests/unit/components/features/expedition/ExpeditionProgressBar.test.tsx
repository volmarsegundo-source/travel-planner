/**
 * Unit tests for ExpeditionProgressBar component.
 *
 * Tests cover: rendering phase text, segment count, active/completed/locked colors,
 * clickable past phases, non-clickable current/future phases, hover tooltip.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!values) return fullKey;
      const suffix = Object.values(values).join(",");
      return `${fullKey}[${suffix}]`;
    },
}));

const mockPush = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <a {...props}>{children}</a>,
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { ExpeditionProgressBar } from "@/components/features/expedition/ExpeditionProgressBar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAllSegments(container: HTMLElement) {
  // Both buttons (past phases) and divs (current/future) are segments
  const nav = container.querySelector("nav");
  return nav ? Array.from(nav.children) : [];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ExpeditionProgressBar", () => {
  it("renders phase progress text", () => {
    render(<ExpeditionProgressBar currentPhase={3} totalPhases={8} />);

    expect(screen.getByText(/phaseProgress\[3,8\]/)).toBeInTheDocument();
  });

  it("renders correct number of segments", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} />
    );

    const segments = getAllSegments(container);
    expect(segments).toHaveLength(8);
  });

  it("marks completed phases with teal color", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={4} totalPhases={8} tripId="trip-1" />
    );

    const segments = getAllSegments(container);
    // Phases 1, 2, 3 should be completed (teal buttons)
    expect(segments[0].className).toContain("bg-atlas-teal");
    expect(segments[1].className).toContain("bg-atlas-teal");
    expect(segments[2].className).toContain("bg-atlas-teal");
  });

  it("marks current phase with gold color and wider width", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} />
    );

    const segments = getAllSegments(container);
    expect(segments[2].className).toContain("bg-atlas-gold");
    expect(segments[2].className).toContain("w-10");
  });

  it("marks future phases with muted color", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} />
    );

    const segments = getAllSegments(container);
    // Phase 4-8 should be muted
    expect(segments[3].className).toContain("bg-muted");
    expect(segments[7].className).toContain("bg-muted");
  });

  it("works for phase 1 (first phase, current phase is clickable)", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={1} totalPhases={8} tripId="trip-1" />
    );

    const segments = getAllSegments(container);
    expect(segments[0].className).toContain("bg-atlas-gold");
    expect(segments[1].className).toContain("bg-muted");

    // Current phase is clickable (1 button for phase 1)
    expect(screen.queryAllByRole("button")).toHaveLength(1);
  });

  // ─── Navigation tests ──────────────────────────────────────────────────

  it("renders past and current phases as clickable buttons when tripId is provided", () => {
    render(
      <ExpeditionProgressBar currentPhase={4} totalPhases={8} tripId="trip-1" />
    );

    // Phases 1, 2, 3 (past) + phase 4 (current) should be buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
  });

  it("navigates to correct route when clicking phase 1", () => {
    render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} tripId="trip-1" />
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // Phase 1

    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-1");
  });

  it("navigates to correct route when clicking phase 2", () => {
    render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} tripId="trip-1" />
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // Phase 2

    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-1/phase-2");
  });

  it("does not render past phases as buttons when tripId is not provided", () => {
    render(
      <ExpeditionProgressBar currentPhase={4} totalPhases={8} />
    );

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("current phase is clickable and navigates to itself", () => {
    render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} tripId="trip-1" />
    );

    const buttons = screen.getAllByRole("button");
    // Phase 3 is current and should be a button
    fireEvent.click(buttons[2]); // Phase 3
    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-1/phase-3");
  });

  it("future phases are not clickable", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} tripId="trip-1" />
    );

    const segments = getAllSegments(container);
    // Phases 4-8 should be divs
    for (let i = 3; i < 8; i++) {
      expect(segments[i].tagName).toBe("DIV");
    }
  });

  it("past phase buttons have phase name as title tooltip", () => {
    render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} tripId="trip-1" />
    );

    const buttons = screen.getAllByRole("button");
    // Phase 1: "gamification.phases.theCalling"
    expect(buttons[0]).toHaveAttribute("title", "gamification.phases.theCalling");
    // Phase 2: "gamification.phases.theExplorer"
    expect(buttons[1]).toHaveAttribute("title", "gamification.phases.theExplorer");
  });

  it("past phase buttons have hover translate class", () => {
    render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} tripId="trip-1" />
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons[0].className).toContain("hover:-translate-y-0.5");
  });

  it("only makes phases with defined routes clickable (phases 1-6)", () => {
    render(
      <ExpeditionProgressBar currentPhase={7} totalPhases={8} tripId="trip-1" />
    );

    const buttons = screen.getAllByRole("button");
    // Phases 1-6 have routes, phase 7 does not
    expect(buttons).toHaveLength(6);
  });

  it("renders nav element for accessibility", () => {
    render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} tripId="trip-1" />
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
