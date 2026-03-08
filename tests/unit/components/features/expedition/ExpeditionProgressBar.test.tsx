/**
 * Unit tests for ExpeditionProgressBar component.
 *
 * Tests cover: rendering phase text, segment count, active/completed/locked colors.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { ExpeditionProgressBar } from "@/components/features/expedition/ExpeditionProgressBar";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ExpeditionProgressBar", () => {
  it("renders phase progress text", () => {
    render(<ExpeditionProgressBar currentPhase={3} totalPhases={8} />);

    expect(screen.getByText(/phaseProgress\[3,8\]/)).toBeInTheDocument();
  });

  it("renders correct number of segments", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} />
    );

    const segments = container.querySelectorAll("[aria-hidden='true']");
    expect(segments).toHaveLength(8);
  });

  it("marks completed phases with teal color", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={4} totalPhases={8} />
    );

    const segments = container.querySelectorAll("[aria-hidden='true']");
    // Phases 1, 2, 3 should be completed (teal)
    expect(segments[0].className).toContain("bg-atlas-teal");
    expect(segments[1].className).toContain("bg-atlas-teal");
    expect(segments[2].className).toContain("bg-atlas-teal");
  });

  it("marks current phase with gold color and wider width", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} />
    );

    const segments = container.querySelectorAll("[aria-hidden='true']");
    expect(segments[2].className).toContain("bg-atlas-gold");
    expect(segments[2].className).toContain("w-10");
  });

  it("marks future phases with muted color", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={3} totalPhases={8} />
    );

    const segments = container.querySelectorAll("[aria-hidden='true']");
    // Phase 4-8 should be muted
    expect(segments[3].className).toContain("bg-muted");
    expect(segments[7].className).toContain("bg-muted");
  });

  it("works for phase 1 (first phase)", () => {
    const { container } = render(
      <ExpeditionProgressBar currentPhase={1} totalPhases={8} />
    );

    const segments = container.querySelectorAll("[aria-hidden='true']");
    expect(segments[0].className).toContain("bg-atlas-gold");
    expect(segments[1].className).toContain("bg-muted");
  });
});
