/**
 * Unit tests for PhaseShell component.
 *
 * Tests cover: layout rendering, phase progress presence,
 * StepProgressIndicator conditional rendering, edit mode banner,
 * WizardFooter conditional rendering, contentMaxWidth variants.
 *
 * Spec ref: SPEC-UX-019 Section 4.2
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (values && "fallback" in values) return fullKey;
      if (!values) return fullKey;
      const suffix = Object.values(values).join(",");
      return `${fullKey}[${suffix}]`;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <a {...props}>{children as React.ReactNode}</a>,
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { PhaseShell } from "@/components/features/expedition/PhaseShell";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PhaseShell", () => {
  const baseProps = {
    tripId: "trip-1",
    viewingPhase: 4,
    tripCurrentPhase: 4,
    completedPhases: [1, 2, 3],
    phaseTitle: "Test Phase Title",
  };

  it("renders the phase-shell wrapper", () => {
    render(
      <PhaseShell {...baseProps}>
        <div>Child content</div>
      </PhaseShell>
    );

    expect(screen.getByTestId("phase-shell-v2")).toBeInTheDocument();
  });

  it("renders phase title as h1", () => {
    render(
      <PhaseShell {...baseProps}>
        <div>Child content</div>
      </PhaseShell>
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Test Phase Title"
    );
  });

  it("renders phase subtitle when provided", () => {
    render(
      <PhaseShell {...baseProps} phaseSubtitle="Test subtitle">
        <div>Child content</div>
      </PhaseShell>
    );

    expect(screen.getByText("Test subtitle")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    render(
      <PhaseShell {...baseProps}>
        <div>Child content</div>
      </PhaseShell>
    );

    // Only h1 text should exist, no <p> subtitle
    const heading = screen.getByRole("heading", { level: 1 });
    const nextSibling = heading.nextElementSibling;
    // Subtitle would be a <p> right after h1 within same div
    expect(nextSibling).toBeNull();
  });

  it("renders children content", () => {
    render(
      <PhaseShell {...baseProps}>
        <div data-testid="child-content">Hello from child</div>
      </PhaseShell>
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello from child")).toBeInTheDocument();
  });

  it("renders StepProgressIndicator when currentStep and totalSteps provided", () => {
    render(
      <PhaseShell {...baseProps} currentStep={2} totalSteps={3}>
        <div>Child</div>
      </PhaseShell>
    );

    expect(screen.getByTestId("step-progress-indicator")).toBeInTheDocument();
  });

  it("does not render StepProgressIndicator when totalSteps is 1", () => {
    render(
      <PhaseShell {...baseProps} currentStep={1} totalSteps={1}>
        <div>Child</div>
      </PhaseShell>
    );

    expect(screen.queryByTestId("step-progress-indicator")).not.toBeInTheDocument();
  });

  it("does not render StepProgressIndicator when no steps provided", () => {
    render(
      <PhaseShell {...baseProps}>
        <div>Child</div>
      </PhaseShell>
    );

    expect(screen.queryByTestId("step-progress-indicator")).not.toBeInTheDocument();
  });

  it("renders edit mode banner when isEditMode is true", () => {
    render(
      <PhaseShell {...baseProps} isEditMode={true}>
        <div>Child</div>
      </PhaseShell>
    );

    expect(screen.getByTestId("edit-mode-banner")).toBeInTheDocument();
  });

  it("does not render edit mode banner by default", () => {
    render(
      <PhaseShell {...baseProps}>
        <div>Child</div>
      </PhaseShell>
    );

    expect(screen.queryByTestId("edit-mode-banner")).not.toBeInTheDocument();
  });

  it("renders WizardFooter when showFooter is true and footerProps provided", () => {
    render(
      <PhaseShell
        {...baseProps}
        showFooter={true}
        footerProps={{
          onPrimary: vi.fn(),
          primaryLabel: "Next",
        }}
      >
        <div>Child</div>
      </PhaseShell>
    );

    expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
  });

  it("does not render WizardFooter when showFooter is false", () => {
    render(
      <PhaseShell {...baseProps} showFooter={false}>
        <div>Child</div>
      </PhaseShell>
    );

    expect(screen.queryByTestId("wizard-footer")).not.toBeInTheDocument();
  });

  it("uses max-w-2xl by default", () => {
    const { container } = render(
      <PhaseShell {...baseProps}>
        <div>Child</div>
      </PhaseShell>
    );

    const contentDiv = container.querySelector(".max-w-2xl");
    expect(contentDiv).toBeTruthy();
  });

  it("uses max-w-4xl when contentMaxWidth is 4xl", () => {
    const { container } = render(
      <PhaseShell {...baseProps} contentMaxWidth="4xl">
        <div>Child</div>
      </PhaseShell>
    );

    const contentDiv = container.querySelector(".max-w-4xl");
    expect(contentDiv).toBeTruthy();
  });

  it("renders breadcrumb navigation in both layouts", () => {
    render(
      <PhaseShell {...baseProps}>
        <div>Child</div>
      </PhaseShell>
    );

    // Breadcrumb renders in desktop sidebar AND mobile top bar
    const breadcrumbs = screen.getAllByLabelText("phaseShellV2.breadcrumb.label");
    expect(breadcrumbs.length).toBe(2);
  });
});
