/**
 * Unit tests for PhaseFooter component.
 * Sprint 44: Shared phase navigation footer with unsaved changes modal.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
}));

// Mock the Dialog from radix to render children directly
vi.mock("radix-ui", () => {
  const React = require("react");
  return {
    Dialog: {
      Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
        open ? React.createElement("div", { "data-testid": "dialog-root" }, children) : null,
      Portal: ({ children }: { children: React.ReactNode }) =>
        React.createElement("div", null, children),
      Overlay: ({ children, ...props }: Record<string, unknown>) =>
        React.createElement("div", props, children as React.ReactNode),
      Content: ({ children, ...props }: Record<string, unknown>) =>
        React.createElement("div", props, children as React.ReactNode),
      Title: ({ children, ...props }: Record<string, unknown>) =>
        React.createElement("h2", props, children as React.ReactNode),
      Description: ({ children, ...props }: Record<string, unknown>) =>
        React.createElement("p", props, children as React.ReactNode),
      Close: ({ children, ...props }: Record<string, unknown>) =>
        React.createElement("button", props, children as React.ReactNode),
      Trigger: ({ children, ...props }: Record<string, unknown>) =>
        React.createElement("button", props, children as React.ReactNode),
    },
  };
});

import { PhaseFooter } from "@/components/features/expedition/PhaseFooter";

describe("PhaseFooter", () => {
  const onNext = vi.fn();
  const onBack = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders next button with correct label", () => {
    render(<PhaseFooter onNext={onNext} />);
    expect(screen.getByTestId("phase-footer-next")).toHaveTextContent(
      "phaseFooter.next"
    );
  });

  it("renders finish label when isLastPhase", () => {
    render(<PhaseFooter onNext={onNext} isLastPhase />);
    expect(screen.getByTestId("phase-footer-next")).toHaveTextContent(
      "phaseFooter.finish"
    );
  });

  it("calls onNext when next button clicked", () => {
    render(<PhaseFooter onNext={onNext} />);
    fireEvent.click(screen.getByTestId("phase-footer-next"));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("renders back button when onBack provided and showBackButton is true", () => {
    render(<PhaseFooter onNext={onNext} onBack={onBack} />);
    expect(screen.getByTestId("phase-footer-back")).toBeInTheDocument();
  });

  it("hides back button when showBackButton is false", () => {
    render(
      <PhaseFooter onNext={onNext} onBack={onBack} showBackButton={false} />
    );
    expect(screen.queryByTestId("phase-footer-back")).not.toBeInTheDocument();
  });

  it("calls onBack directly when not dirty", () => {
    render(<PhaseFooter onNext={onNext} onBack={onBack} />);
    fireEvent.click(screen.getByTestId("phase-footer-back"));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows unsaved changes modal when dirty and back clicked", () => {
    render(
      <PhaseFooter
        onNext={onNext}
        onBack={onBack}
        isDirty
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByTestId("phase-footer-back"));
    expect(screen.getByTestId("unsaved-changes-modal")).toBeInTheDocument();
  });

  it("disables next button when canAdvance is false", () => {
    render(<PhaseFooter onNext={onNext} canAdvance={false} />);
    expect(screen.getByTestId("phase-footer-next")).toBeDisabled();
  });

  it("disables next button when isSubmitting", () => {
    render(<PhaseFooter onNext={onNext} isSubmitting />);
    expect(screen.getByTestId("phase-footer-next")).toBeDisabled();
  });

  it("shows loading state when isSubmitting", () => {
    render(<PhaseFooter onNext={onNext} isSubmitting />);
    expect(screen.getByTestId("phase-footer-next")).toHaveTextContent(
      "phaseFooter.saving"
    );
  });

  it("calls onDiscard in modal to exit without saving", async () => {
    render(
      <PhaseFooter
        onNext={onNext}
        onBack={onBack}
        isDirty
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByTestId("phase-footer-back"));
    fireEvent.click(screen.getByTestId("unsaved-discard-btn"));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave then onBack when save and exit clicked", async () => {
    onSave.mockResolvedValue(undefined);
    render(
      <PhaseFooter
        onNext={onNext}
        onBack={onBack}
        isDirty
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByTestId("phase-footer-back"));
    fireEvent.click(screen.getByTestId("unsaved-save-btn"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
      expect(onBack).toHaveBeenCalledOnce();
    });
  });
});
