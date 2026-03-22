/**
 * Integration tests for WizardFooter dirty-state dialog behavior.
 * Validates the save/discard dialog state machine with isDirty prop.
 *
 * SPEC-PROD-039: WizardFooter Global — dirty state integration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
}));

import { WizardFooter } from "../WizardFooter";

describe("WizardFooterDirtyState", () => {
  const onPrimary = vi.fn();
  const onBack = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── isDirty=true shows dialog on back ────────────────────────────────────

  it("shows dialog when isDirty=true and back is clicked", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty={true}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-back"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });

  // ─── isDirty=false navigates directly ─────────────────────────────────────

  it("navigates directly when isDirty=false and back is clicked", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-back"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onBack).toHaveBeenCalledOnce();
  });

  // ─── Save+back flow ──────────────────────────────────────────────────────

  it("calls onSave then onBack when save-and-back is clicked", async () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty={true}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-back"));
    fireEvent.click(screen.getByTestId("dialog-save-back"));

    expect(onSave).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(onBack).toHaveBeenCalledOnce();
    });
    // Dialog closed
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ─── Discard+back flow ────────────────────────────────────────────────────

  it("calls onBack without onSave when discard is clicked", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty={true}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-back"));
    fireEvent.click(screen.getByTestId("dialog-discard"));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ─── ESC dismisses dialog ─────────────────────────────────────────────────

  it("dismisses dialog on Escape key press", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty={true}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-back"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // ESC on the overlay
    fireEvent.keyDown(screen.getByTestId("unsaved-dialog-overlay"), {
      key: "Escape",
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  // ─── Save+advance flow ───────────────────────────────────────────────────

  it("shows advance dialog when isDirty=true and primary is clicked", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Advance"
        onSave={onSave}
        isDirty={true}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-primary"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText("itinerary.wizard.footer.unsavedChangesTitle"),
    ).toBeInTheDocument();
    expect(onPrimary).not.toHaveBeenCalled();
  });

  it("calls onSave then onPrimary when save-and-advance is clicked", async () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Advance"
        onSave={onSave}
        isDirty={true}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-primary"));
    fireEvent.click(screen.getByTestId("dialog-save-advance"));

    expect(onSave).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(onPrimary).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("advances without saving when advance-without-saving is clicked", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Advance"
        onSave={onSave}
        isDirty={true}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-primary"));
    fireEvent.click(screen.getByTestId("dialog-advance-without-saving"));

    expect(onPrimary).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ─── No dialog without onSave ─────────────────────────────────────────────

  it("does not show dialog when isDirty=true but no onSave provided", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        isDirty={true}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-back"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onBack).toHaveBeenCalledOnce();
  });

  // ─── Overlay click dismisses ──────────────────────────────────────────────

  it("dismisses dialog on overlay click", () => {
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        onBack={onBack}
        onSave={onSave}
        isDirty={true}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-back"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("unsaved-dialog-overlay"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });
});
