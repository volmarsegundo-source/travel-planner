/**
 * Behavior tests for ResetPasswordForm.
 *
 * Covers: missing token state, form rendering, successful reset,
 * token expired error, password mismatch, password too short,
 * and links to login/forgot-password.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockConfirmPasswordResetAction } = vi.hoisted(() => ({
  mockConfirmPasswordResetAction: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/server/actions/auth.actions", () => ({
  confirmPasswordResetAction: mockConfirmPasswordResetAction,
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock BrandPanel from LoginFormV2 to avoid complex deps
vi.mock("@/components/features/auth/LoginFormV2", () => ({
  BrandPanel: () => <div data-testid="brand-panel" />,
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { ResetPasswordForm } from "@/components/features/auth/ResetPasswordForm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get password input by its stable DOM id. */
function getPasswordInput() {
  return document.getElementById("reset-password-new") as HTMLInputElement;
}

/** Get confirm password input by its stable DOM id. */
function getConfirmPasswordInput() {
  return document.getElementById("reset-password-confirm") as HTMLInputElement;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Missing token ──────────────────────────────────────────────────────

  describe("when token is null", () => {
    it("renders invalid token message", () => {
      render(<ResetPasswordForm token={null} />);

      expect(
        screen.getByText("authV2.resetPasswordPage.invalidToken")
      ).toBeInTheDocument();
    });

    it("renders request new link", () => {
      render(<ResetPasswordForm token={null} />);

      const link = screen.getByText(
        "authV2.resetPasswordPage.requestNewLink"
      );
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "/auth/forgot-password"
      );
    });

    it("renders back to login link", () => {
      render(<ResetPasswordForm token={null} />);

      const link = screen.getByText(
        "authV2.resetPasswordPage.backToLogin"
      );
      expect(link.closest("a")).toHaveAttribute("href", "/auth/login");
    });
  });

  // ─── With valid token ─────────────────────────────────────────────────────

  describe("when token is provided", () => {
    const VALID_TOKEN = "valid-reset-token-abc";

    it("renders password and confirm password fields", () => {
      render(<ResetPasswordForm token={VALID_TOKEN} />);

      expect(getPasswordInput()).toBeInTheDocument();
      expect(getConfirmPasswordInput()).toBeInTheDocument();
    });

    it("renders heading and subtitle", () => {
      render(<ResetPasswordForm token={VALID_TOKEN} />);

      expect(
        screen.getByText("authV2.resetPasswordPage.heading")
      ).toBeInTheDocument();
      expect(
        screen.getByText("authV2.resetPasswordPage.subtitle")
      ).toBeInTheDocument();
    });

    it("submit button is disabled when fields are empty", () => {
      render(<ResetPasswordForm token={VALID_TOKEN} />);

      const button = screen.getByRole("button", {
        name: "authV2.resetPasswordPage.submit",
      });
      expect(button).toBeDisabled();
    });

    it("shows password mismatch error when passwords do not match", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token={VALID_TOKEN} />);

      await user.type(
        getPasswordInput(),
        "NewPassword1!"
      );
      await user.type(
        getConfirmPasswordInput(),
        "DifferentPassword1!"
      );

      const button = screen.getByRole("button", {
        name: "authV2.resetPasswordPage.submit",
      });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      expect(screen.getByRole("alert")).toHaveTextContent(
        "auth.errors.passwordsDoNotMatch"
      );

      // Should NOT call the server action
      expect(mockConfirmPasswordResetAction).not.toHaveBeenCalled();
    });

    it("shows passwordWeak error when password does not meet strength requirements", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token={VALID_TOKEN} />);

      await user.type(
        getPasswordInput(),
        "short"
      );
      await user.type(
        getConfirmPasswordInput(),
        "short"
      );

      const button = screen.getByRole("button", {
        name: "authV2.resetPasswordPage.submit",
      });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      expect(screen.getByRole("alert")).toHaveTextContent(
        "auth.errors.passwordWeak"
      );
      expect(mockConfirmPasswordResetAction).not.toHaveBeenCalled();
    });

    it("shows success state after successful password reset", async () => {
      mockConfirmPasswordResetAction.mockResolvedValue({ success: true });
      const user = userEvent.setup();

      render(<ResetPasswordForm token={VALID_TOKEN} />);

      await user.type(
        getPasswordInput(),
        "NewSecurePass1!"
      );
      await user.type(
        getConfirmPasswordInput(),
        "NewSecurePass1!"
      );

      const button = screen.getByRole("button", {
        name: "authV2.resetPasswordPage.submit",
      });
      await user.click(button);

      await waitFor(() => {
        expect(
          screen.getByText("authV2.resetPasswordPage.successHeading")
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText("authV2.resetPasswordPage.successMessage")
      ).toBeInTheDocument();
    });

    it("calls confirmPasswordResetAction with token and password", async () => {
      mockConfirmPasswordResetAction.mockResolvedValue({ success: true });
      const user = userEvent.setup();

      render(<ResetPasswordForm token={VALID_TOKEN} />);

      await user.type(
        getPasswordInput(),
        "NewSecurePass1!"
      );
      await user.type(
        getConfirmPasswordInput(),
        "NewSecurePass1!"
      );

      const button = screen.getByRole("button", {
        name: "authV2.resetPasswordPage.submit",
      });
      await user.click(button);

      await waitFor(() => {
        expect(mockConfirmPasswordResetAction).toHaveBeenCalledWith(
          VALID_TOKEN,
          "NewSecurePass1!"
        );
      });
    });

    it("shows token expired error when action returns token expired", async () => {
      mockConfirmPasswordResetAction.mockResolvedValue({
        success: false,
        error: "auth.errors.tokenExpired",
      });
      const user = userEvent.setup();

      render(<ResetPasswordForm token={VALID_TOKEN} />);

      await user.type(
        getPasswordInput(),
        "NewSecurePass1!"
      );
      await user.type(
        getConfirmPasswordInput(),
        "NewSecurePass1!"
      );

      const button = screen.getByRole("button", {
        name: "authV2.resetPasswordPage.submit",
      });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      expect(screen.getByRole("alert")).toHaveTextContent(
        "auth.errors.tokenExpired"
      );
    });

    it("shows generic error when action throws unexpectedly", async () => {
      mockConfirmPasswordResetAction.mockRejectedValue(
        new Error("Network error")
      );
      const user = userEvent.setup();

      render(<ResetPasswordForm token={VALID_TOKEN} />);

      await user.type(
        getPasswordInput(),
        "NewSecurePass1!"
      );
      await user.type(
        getConfirmPasswordInput(),
        "NewSecurePass1!"
      );

      const button = screen.getByRole("button", {
        name: "authV2.resetPasswordPage.submit",
      });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      expect(screen.getByRole("alert")).toHaveTextContent(
        "auth.errors.generic"
      );
    });

    it("shows go-to-login link after successful reset", async () => {
      mockConfirmPasswordResetAction.mockResolvedValue({ success: true });
      const user = userEvent.setup();

      render(<ResetPasswordForm token={VALID_TOKEN} />);

      await user.type(
        getPasswordInput(),
        "NewSecurePass1!"
      );
      await user.type(
        getConfirmPasswordInput(),
        "NewSecurePass1!"
      );

      const button = screen.getByRole("button", {
        name: "authV2.resetPasswordPage.submit",
      });
      await user.click(button);

      await waitFor(() => {
        const link = screen.getByText(
          "authV2.resetPasswordPage.goToLogin"
        );
        expect(link.closest("a")).toHaveAttribute("href", "/auth/login");
      });
    });
  });
});
