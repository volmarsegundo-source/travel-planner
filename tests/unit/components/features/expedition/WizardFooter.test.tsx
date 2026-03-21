/**
 * Unit tests for WizardFooter component.
 * SPEC-UX-014: Standardized CTA pattern.
 * TASK-S33-005: 3-button layout, dirty state, unsaved changes dialog.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
}));

import { WizardFooter } from "@/components/features/expedition/WizardFooter";

describe("WizardFooter", () => {
  const onPrimary = vi.fn();
  const onBack = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders primary button with label", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Continue" />);
    expect(screen.getByTestId("wizard-primary")).toHaveTextContent("Continue");
  });

  it("calls onPrimary when clicked", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" />);
    fireEvent.click(screen.getByTestId("wizard-primary"));
    expect(onPrimary).toHaveBeenCalledOnce();
  });

  it("renders back button when onBack provided", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" onBack={onBack} />);
    expect(screen.getByTestId("wizard-back")).toBeInTheDocument();
  });

  it("does not render back button when onBack not provided", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" />);
    expect(screen.queryByTestId("wizard-back")).not.toBeInTheDocument();
  });

  it("calls onBack when back clicked", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" onBack={onBack} />);
    fireEvent.click(screen.getByTestId("wizard-back"));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("disables buttons when isLoading", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" onBack={onBack} isLoading />);
    expect(screen.getByTestId("wizard-primary")).toBeDisabled();
    expect(screen.getByTestId("wizard-back")).toBeDisabled();
  });

  it("shows saving text when loading", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" isLoading />);
    expect(screen.getByTestId("wizard-primary")).toHaveTextContent("common.saving");
  });

  it("disables primary when isDisabled", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" isDisabled />);
    expect(screen.getByTestId("wizard-primary")).toBeDisabled();
  });

  it("renders secondary actions", () => {
    const secondaryAction = { label: "Skip", onClick: vi.fn() };
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        secondaryActions={[secondaryAction]}
      />
    );
    const skipBtn = screen.getByText("Skip");
    fireEvent.click(skipBtn);
    expect(secondaryAction.onClick).toHaveBeenCalledOnce();
  });

  it("has atlas-teal styling on primary button", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" />);
    expect(screen.getByTestId("wizard-primary").className).toContain("atlas-teal");
  });

  it("renders spinner svg when loading", () => {
    const { container } = render(
      <WizardFooter onPrimary={onPrimary} primaryLabel="Next" isLoading />
    );
    const spinner = container.querySelector("svg");
    expect(spinner).toBeInTheDocument();
  });

  // ─── TASK-S33-005: 3-button layout + dirty state dialog ──────────────────

  it("renders save button when onSave is provided", () => {
    render(
      <WizardFooter onPrimary={onPrimary} primaryLabel="Next" onSave={onSave} />
    );
    expect(screen.getByTestId("wizard-save")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-save")).toHaveTextContent(
      "itinerary.wizard.footer.save"
    );
  });

  it("does not render save button when onSave is not provided", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" />);
    expect(screen.queryByTestId("wizard-save")).not.toBeInTheDocument();
  });

  it("calls onSave when save button is clicked", () => {
    render(
      <WizardFooter onPrimary={onPrimary} primaryLabel="Next" onSave={onSave} />
    );
    fireEvent.click(screen.getByTestId("wizard-save"));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("renders 3-button layout: back + save + primary", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Advance"
        onBack={onBack}
        onSave={onSave}
      />
    );
    expect(screen.getByTestId("wizard-back")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-save")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-primary")).toBeInTheDocument();
  });

  it("shows unsaved changes dialog when isDirty and back is clicked", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty
      />
    );
    fireEvent.click(screen.getByTestId("wizard-back"));

    // Dialog should appear
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("itinerary.wizard.footer.unsavedChangesTitle")).toBeInTheDocument();
    expect(screen.getByText("itinerary.wizard.footer.unsavedChangesMessage")).toBeInTheDocument();

    // onBack should NOT have been called yet
    expect(onBack).not.toHaveBeenCalled();
  });

  it("does not show dialog when isDirty is false and back is clicked", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty={false}
      />
    );
    fireEvent.click(screen.getByTestId("wizard-back"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("calls onBack (discard) when discard button is clicked in dialog", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty
      />
    );
    fireEvent.click(screen.getByTestId("wizard-back"));
    fireEvent.click(screen.getByTestId("dialog-discard"));

    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onSave and onBack when save-and-exit is clicked in dialog", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty
      />
    );
    fireEvent.click(screen.getByTestId("wizard-back"));
    fireEvent.click(screen.getByTestId("dialog-save-exit"));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes dialog when clicking overlay", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty
      />
    );
    fireEvent.click(screen.getByTestId("wizard-back"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click the overlay (parent of dialog)
    fireEvent.click(screen.getByTestId("unsaved-dialog-overlay"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });

  it("dialog has correct ARIA attributes", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty
      />
    );
    fireEvent.click(screen.getByTestId("wizard-back"));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "unsaved-dialog-title");
  });
});
