/**
 * Unit tests for PhaseTransition component (Sprint 26 redesign).
 *
 * Tests cover: 3s auto-advance timer, countdown display, "Continue" button
 * dismisses, backdrop click cancels auto-advance (does NOT dismiss),
 * focus management, reduced-motion behavior, aria attributes.
 *
 * [SPEC-UX-003]
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { PhaseTransition } from "@/components/features/expedition/PhaseTransition";

// ─── Setup ────────────────────────────────────────────────────────────────────

function mockMatchMedia(prefersReducedMotion = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersReducedMotion && query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PhaseTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows phase completed state initially", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    expect(
      screen.getByText("expedition.transition.phaseCompleted[2]")
    ).toBeInTheDocument();
  });

  it("transitions to advancing state after 1.2 seconds", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(
      screen.getByText("expedition.transition.advancingTo[3]")
    ).toBeInTheDocument();
  });

  it("shows 3s auto-advance countdown in advancing state", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Should show countdown starting at 3
    const countdownText = screen.getByTestId("countdown-text");
    expect(countdownText).toBeInTheDocument();
    expect(countdownText).toHaveTextContent("expedition.transition.autoAdvance[3]");
  });

  it("countdown decrements each second", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    // Advance to advancing state
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // After 1 second, countdown should be at 2
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const countdownText = screen.getByTestId("countdown-text");
    expect(countdownText).toHaveTextContent("expedition.transition.autoAdvance[2]");

    // After another second, countdown should be at 1
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(countdownText).toHaveTextContent("expedition.transition.autoAdvance[1]");
  });

  it("auto-advances by calling onContinue after 3 seconds in advancing state", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    // Advance past initial animation (1.2s)
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(onContinue).not.toHaveBeenCalled();

    // Advance past auto-advance delay (3s)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("'Continue' button dismisses and calls onContinue", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    // Advance to advancing state
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Click continue manually
    fireEvent.click(
      screen.getByText("expedition.transition.continue")
    );

    expect(onContinue).toHaveBeenCalledTimes(1);

    // Auto-advance timer should NOT fire
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("backdrop click cancels auto-advance but does NOT dismiss", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    // Advance to advancing state
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Click the backdrop
    const backdrop = screen.getByTestId("phase-transition-backdrop");
    fireEvent.click(backdrop);

    // Should NOT have called onContinue
    expect(onContinue).not.toHaveBeenCalled();

    // Auto-advance should be cancelled — verify by waiting past the timer
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onContinue).not.toHaveBeenCalled();

    // Should show cancelled message
    expect(
      screen.getByText("expedition.transition.autoAdvanceCancelled")
    ).toBeInTheDocument();

    // Continue button should still be visible for manual dismissal
    expect(
      screen.getByText("expedition.transition.continue")
    ).toBeInTheDocument();
  });

  it("has correct aria attributes for dialog role", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label");
  });

  it("manages focus to new phase heading after transition", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // The heading should be focusable (tabIndex=-1 for programmatic focus)
    const heading = screen.getByText("expedition.transition.advancingTo[3]");
    expect(heading.tagName).toBe("H2");
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("uses instant swap (no animation) when prefers-reduced-motion is set", () => {
    mockMatchMedia(true);

    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    // With reduced motion, the advancing state should appear immediately (0ms delay)
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(
      screen.getByText("expedition.transition.advancingTo[3]")
    ).toBeInTheDocument();
  });

  it("hides countdown indicator after manual click", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Click continue
    fireEvent.click(
      screen.getByText("expedition.transition.continue")
    );

    expect(
      screen.queryByTestId("countdown-text")
    ).not.toBeInTheDocument();
  });

  it("cleans up timers on unmount (no memory leak)", () => {
    const onContinue = vi.fn();
    const { unmount } = render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    // Advance to show advancing state
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Unmount before auto-advance fires
    unmount();

    // Advance past auto-advance timer
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // onContinue should NOT have been called
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("provides screen reader announcement via aria-live region", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // There should be an assertive aria-live region with the phase announcement
    const srRegion = document.querySelector('[aria-live="assertive"]');
    expect(srRegion).toBeInTheDocument();
    expect(srRegion).toHaveTextContent("expedition.transition.nowOnPhase[3]");
  });
});
