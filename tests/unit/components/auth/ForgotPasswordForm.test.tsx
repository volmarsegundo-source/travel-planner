/**
 * Behavior tests for ForgotPasswordForm.
 *
 * Covers: field rendering, successful submission (generic message),
 * rate limit error, email validation error, and back-to-login link.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockRequestPasswordResetAction } = vi.hoisted(() => ({
  mockRequestPasswordResetAction: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/server/actions/auth.actions", () => ({
  requestPasswordResetAction: mockRequestPasswordResetAction,
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

// Mock BrandPanel and ExploreIcon from LoginFormV2 to avoid complex deps
vi.mock("@/components/features/auth/LoginFormV2", () => ({
  BrandPanel: () => <div data-testid="brand-panel" />,
  ExploreIcon: () => <svg data-testid="explore-icon" aria-hidden="true" />,
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get email input by its stable DOM id. */
function getEmailInput() {
  return document.getElementById("forgot-password-email") as HTMLInputElement;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email field and submit button", () => {
    render(<ForgotPasswordForm />);

    expect(getEmailInput()).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "authV2.forgotPasswordPage.submit",
      })
    ).toBeInTheDocument();
  });

  it("renders heading and subtitle", () => {
    render(<ForgotPasswordForm />);

    expect(
      screen.getByText("authV2.forgotPasswordPage.heading")
    ).toBeInTheDocument();
    expect(
      screen.getByText("authV2.forgotPasswordPage.subtitle")
    ).toBeInTheDocument();
  });

  it("renders back-to-login link", () => {
    render(<ForgotPasswordForm />);

    const backLink = screen.getByText(
      "authV2.forgotPasswordPage.backToLogin"
    );
    expect(backLink.closest("a")).toHaveAttribute("href", "/auth/login");
  });

  it("submit button is disabled when email is empty", () => {
    render(<ForgotPasswordForm />);

    const button = screen.getByRole("button", {
      name: "authV2.forgotPasswordPage.submit",
    });
    expect(button).toBeDisabled();
  });

  it("shows generic success message after successful submission (anti-enumeration)", async () => {
    mockRequestPasswordResetAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<ForgotPasswordForm />);

    const emailInput = getEmailInput();
    await user.type(emailInput, "test@example.com");

    const button = screen.getByRole("button", {
      name: "authV2.forgotPasswordPage.submit",
    });
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("authV2.forgotPasswordPage.successHeading")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("authV2.forgotPasswordPage.successMessage")
    ).toBeInTheDocument();
  });

  it("shows rate limit error when action returns rate limit exceeded", async () => {
    mockRequestPasswordResetAction.mockResolvedValue({
      success: false,
      error: "errors.rateLimitExceeded",
    });
    const user = userEvent.setup();

    render(<ForgotPasswordForm />);

    const emailInput = getEmailInput();
    await user.type(emailInput, "test@example.com");

    const button = screen.getByRole("button", {
      name: "authV2.forgotPasswordPage.submit",
    });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "auth.errors.rateLimitExceeded"
    );
  });

  it("shows email invalid error when action returns email invalid", async () => {
    mockRequestPasswordResetAction.mockResolvedValue({
      success: false,
      error: "auth.errors.emailInvalid",
    });
    const user = userEvent.setup();

    render(<ForgotPasswordForm />);

    const emailInput = getEmailInput();
    await user.type(emailInput, "not-an-email");

    const button = screen.getByRole("button", {
      name: "authV2.forgotPasswordPage.submit",
    });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "auth.errors.emailInvalid"
    );
  });

  it("shows generic error when action throws unexpectedly", async () => {
    mockRequestPasswordResetAction.mockRejectedValue(
      new Error("Network error")
    );
    const user = userEvent.setup();

    render(<ForgotPasswordForm />);

    const emailInput = getEmailInput();
    await user.type(emailInput, "test@example.com");

    const button = screen.getByRole("button", {
      name: "authV2.forgotPasswordPage.submit",
    });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "auth.errors.generic"
    );
  });

  it("shows success back-to-login link after success", async () => {
    mockRequestPasswordResetAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<ForgotPasswordForm />);

    const emailInput = getEmailInput();
    await user.type(emailInput, "test@example.com");

    const button = screen.getByRole("button", {
      name: "authV2.forgotPasswordPage.submit",
    });
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("authV2.forgotPasswordPage.backToLogin")
      ).toBeInTheDocument();
    });

    const link = screen.getByText("authV2.forgotPasswordPage.backToLogin");
    expect(link.closest("a")).toHaveAttribute("href", "/auth/login");
  });

  it("calls requestPasswordResetAction with the entered email", async () => {
    mockRequestPasswordResetAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<ForgotPasswordForm />);

    const emailInput = getEmailInput();
    await user.type(emailInput, "user@test.com");

    const button = screen.getByRole("button", {
      name: "authV2.forgotPasswordPage.submit",
    });
    await user.click(button);

    await waitFor(() => {
      expect(mockRequestPasswordResetAction).toHaveBeenCalledWith(
        "user@test.com"
      );
    });
  });
});
