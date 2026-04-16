/**
 * Unit tests for UnsavedChangesModal component.
 * Sprint 44: Unsaved changes confirmation dialog with 3 actions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
}));

// Mock radix Dialog to render children directly when open
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

import { UnsavedChangesModal } from "@/components/features/expedition/UnsavedChangesModal";

describe("UnsavedChangesModal", () => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const onDiscard = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(
      <UnsavedChangesModal
        open={false}
        onClose={onClose}
        onSave={onSave}
        onDiscard={onDiscard}
      />
    );
    expect(screen.queryByTestId("unsaved-changes-modal")).not.toBeInTheDocument();
  });

  it("renders modal with 3 buttons when open", () => {
    render(
      <UnsavedChangesModal
        open
        onClose={onClose}
        onSave={onSave}
        onDiscard={onDiscard}
      />
    );
    expect(screen.getByTestId("unsaved-changes-modal")).toBeInTheDocument();
    expect(screen.getByTestId("unsaved-save-btn")).toBeInTheDocument();
    expect(screen.getByTestId("unsaved-discard-btn")).toBeInTheDocument();
    expect(screen.getByTestId("unsaved-cancel-btn")).toBeInTheDocument();
  });

  it("displays correct title and message", () => {
    render(
      <UnsavedChangesModal
        open
        onClose={onClose}
        onSave={onSave}
        onDiscard={onDiscard}
      />
    );
    expect(
      screen.getByText("phaseFooter.unsavedChanges.title")
    ).toBeInTheDocument();
    expect(
      screen.getByText("phaseFooter.unsavedChanges.message")
    ).toBeInTheDocument();
  });

  it("calls onDiscard when exit without saving clicked", () => {
    render(
      <UnsavedChangesModal
        open
        onClose={onClose}
        onSave={onSave}
        onDiscard={onDiscard}
      />
    );
    fireEvent.click(screen.getByTestId("unsaved-discard-btn"));
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("calls onClose when cancel clicked", () => {
    render(
      <UnsavedChangesModal
        open
        onClose={onClose}
        onSave={onSave}
        onDiscard={onDiscard}
      />
    );
    fireEvent.click(screen.getByTestId("unsaved-cancel-btn"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onSave when save and exit clicked", async () => {
    onSave.mockResolvedValue(undefined);
    render(
      <UnsavedChangesModal
        open
        onClose={onClose}
        onSave={onSave}
        onDiscard={onDiscard}
      />
    );
    fireEvent.click(screen.getByTestId("unsaved-save-btn"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
    });
  });
});
