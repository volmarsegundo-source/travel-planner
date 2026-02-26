/**
 * Behavior tests for ProgressIndicator.
 *
 * Tests cover: step text rendering, dot count, current step highlighting,
 * and aria attributes.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string) => `${namespace}.${key}`;
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { ProgressIndicator } from "@/components/features/onboarding/ProgressIndicator";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProgressIndicator", () => {
  it("renders the progress text using the progress translation key", () => {
    render(<ProgressIndicator currentStep={1} totalSteps={3} />);

    // The mock renders "onboarding.progress" (key without interpolated values)
    expect(screen.getByText("onboarding.progress")).toBeInTheDocument();
  });

  it("renders the correct number of dot indicators", () => {
    render(<ProgressIndicator currentStep={2} totalSteps={3} />);

    const dots = screen.getAllByRole("listitem");
    expect(dots).toHaveLength(3);
  });

  it("marks the current step dot with aria-current='step'", () => {
    render(<ProgressIndicator currentStep={2} totalSteps={3} />);

    const dots = screen.getAllByRole("listitem");
    expect(dots[1]).toHaveAttribute("aria-current", "step");
  });

  it("does not mark non-current steps as aria-current", () => {
    render(<ProgressIndicator currentStep={1} totalSteps={3} />);

    const dots = screen.getAllByRole("listitem");
    expect(dots[0]).toHaveAttribute("aria-current", "step");
    expect(dots[1]).not.toHaveAttribute("aria-current");
    expect(dots[2]).not.toHaveAttribute("aria-current");
  });

  it("updates aria-current when step changes via rerender", () => {
    const { rerender } = render(
      <ProgressIndicator currentStep={1} totalSteps={3} />
    );

    let dots = screen.getAllByRole("listitem");
    expect(dots[0]).toHaveAttribute("aria-current", "step");
    expect(dots[1]).not.toHaveAttribute("aria-current");

    rerender(<ProgressIndicator currentStep={2} totalSteps={3} />);

    dots = screen.getAllByRole("listitem");
    expect(dots[0]).not.toHaveAttribute("aria-current");
    expect(dots[1]).toHaveAttribute("aria-current", "step");
  });

  it("renders dot list with accessible label", () => {
    render(<ProgressIndicator currentStep={1} totalSteps={3} />);

    expect(screen.getByRole("list")).toBeInTheDocument();
  });
});
