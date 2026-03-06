/**
 * Behavior tests for DeleteAccountModal.
 *
 * Tests cover: 2-step flow (warning → confirmation), email confirmation,
 * error handling, loading state, close/escape behavior, accessibility,
 * and successful deletion with sign-out redirect.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockSignOut, mockDeleteAccount, mockOnClose } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockDeleteAccount: vi.fn(),
  mockOnClose: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-auth/react", () => ({
  signOut: mockSignOut,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string, params?: Record<string, string | number>) => {
      let result = `${namespace}.${key}`;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
      }
      return result;
    };
  },
}));

vi.mock("@/server/actions/account.actions", () => ({
  deleteUserAccountAction: mockDeleteAccount,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { DeleteAccountModal } from "@/components/features/account/DeleteAccountModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_EMAIL = "alice@example.com";

function renderModal(props = {}) {
  return render(
    <DeleteAccountModal
      userEmail={USER_EMAIL}
      onClose={mockOnClose}
      {...props}
    />
  );
}

async function proceedToConfirmation() {
  const confirmButton = screen.getByRole("button", {
    name: "common.confirm",
  });
  await userEvent.click(confirmButton);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeleteAccountModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteAccount.mockResolvedValue({ success: true });
  });

  // ─── Step 1: Warning ──────────────────────────────────────────────────────

  it("renders the warning step with title and warning text", () => {
    renderModal();

    expect(
      screen.getByRole("heading", { name: "account.deleteConfirmTitle" })
    ).toBeInTheDocument();
    expect(screen.getByText("account.deleteWarning")).toBeInTheDocument();
  });

  it("renders Cancel and Confirm buttons on warning step", () => {
    renderModal();

    expect(
      screen.getByRole("button", { name: "common.cancel" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "common.confirm" })
    ).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked on warning step", async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole("button", { name: "common.cancel" })
    );

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking the overlay background", () => {
    renderModal();

    // fireEvent.click dispatches the event on the element itself, so
    // e.target === overlayRef.current evaluates to true.
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", async () => {
    renderModal();

    await userEvent.keyboard("{Escape}");

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // ─── Step 2: Confirmation ────────────────────────────────────────────────

  it("advances to confirmation step when Confirm is clicked", async () => {
    renderModal();

    await proceedToConfirmation();

    expect(
      screen.getByText("account.deleteConfirmMessage")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("account.email")
    ).toBeInTheDocument();
  });

  it("shows email mismatch error when wrong email is entered", async () => {
    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, "wrong@example.com");

    const deleteButton = screen.getByRole("button", {
      name: "account.deleteAccount",
    });
    await userEvent.click(deleteButton);

    expect(
      screen.getByText("account.errors.emailMismatch")
    ).toBeInTheDocument();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("clears error when user starts typing after mismatch", async () => {
    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, "wrong@example.com");

    await userEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    expect(
      screen.getByText("account.errors.emailMismatch")
    ).toBeInTheDocument();

    await userEvent.type(emailInput, "x");

    expect(
      screen.queryByText("account.errors.emailMismatch")
    ).not.toBeInTheDocument();
  });

  // ─── Successful deletion ─────────────────────────────────────────────────

  it("calls deleteUserAccountAction with the confirmed email", async () => {
    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, USER_EMAIL);

    await userEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith({
        confirmEmail: USER_EMAIL,
      });
    });
  });

  it("calls signOut with redirect to landing after successful deletion", async () => {
    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, USER_EMAIL);

    await userEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  it("shows server error message when deletion fails", async () => {
    mockDeleteAccount.mockResolvedValue({
      success: false,
      error: "account.errors.deleteFailed",
    });

    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, USER_EMAIL);

    await userEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("account.errors.deleteFailed")
      ).toBeInTheDocument();
    });
  });

  it("shows generic error when action throws", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("Server error"));

    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, USER_EMAIL);

    await userEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    await waitFor(() => {
      expect(screen.getByText("common.error")).toBeInTheDocument();
    });
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it("disables buttons and shows loading text while deleting", async () => {
    mockDeleteAccount.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, USER_EMAIL);

    const deleteButton = screen.getByRole("button", {
      name: "account.deleteAccount",
    });
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteButton).toBeDisabled();
      expect(deleteButton).toHaveTextContent("common.loading");
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────────

  it("has role=dialog and aria-modal=true", () => {
    renderModal();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("has aria-labelledby pointing to the title", () => {
    renderModal();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "delete-modal-title");

    const title = document.getElementById("delete-modal-title");
    expect(title).toBeInTheDocument();
  });

  it("sets aria-invalid on email input when there is an error", async () => {
    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, "wrong@example.com");

    await userEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    expect(emailInput).toHaveAttribute("aria-invalid", "true");
  });

  it("links error message to input via aria-describedby", async () => {
    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, "wrong@example.com");

    await userEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    expect(emailInput).toHaveAttribute("aria-describedby", "delete-error");
    expect(
      screen.getByText("account.errors.emailMismatch")
    ).toHaveAttribute("id", "delete-error");
  });

  it("shows error message with role=alert for screen readers", async () => {
    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, "wrong@example.com");

    await userEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("account.errors.emailMismatch");
  });

  // ─── Email case insensitivity ─────────────────────────────────────────────

  it("accepts email in different case", async () => {
    renderModal();
    await proceedToConfirmation();

    const emailInput = screen.getByLabelText("account.email");
    await userEvent.type(emailInput, "ALICE@EXAMPLE.COM");

    await userEvent.click(
      screen.getByRole("button", { name: "account.deleteAccount" })
    );

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalled();
    });
  });
});
