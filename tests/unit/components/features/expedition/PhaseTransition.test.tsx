/**
 * Unit tests for PhaseTransition component.
 *
 * Tests cover: auto-advance behavior (T-S19-004), manual continue,
 * timer cleanup, and countdown indicator.
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PhaseTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

  it("auto-advances by calling onContinue after 2 seconds in advancing state", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={2} toPhase={3} onContinue={onContinue} />
    );

    // Advance past initial animation (1.2s)
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(onContinue).not.toHaveBeenCalled();

    // Advance past auto-advance delay (2s)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("shows auto-advance indicator in advancing state", () => {
    const onContinue = vi.fn();
    render(
      <PhaseTransition fromPhase={1} toPhase={2} onContinue={onContinue} />
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(
      screen.getByText("expedition.transition.autoAdvance")
    ).toBeInTheDocument();
  });

  it("manual click calls onContinue immediately and cancels auto-advance", () => {
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

    // Advance past auto-advance timer — should NOT call again
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("hides auto-advance indicator after manual click", () => {
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
      screen.queryByText("expedition.transition.autoAdvance")
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
      vi.advanceTimersByTime(3000);
    });

    // onContinue should NOT have been called
    expect(onContinue).not.toHaveBeenCalled();
  });
});
