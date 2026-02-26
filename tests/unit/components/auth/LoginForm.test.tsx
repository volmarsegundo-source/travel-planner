/**
 * Behavior tests for LoginForm.
 *
 * Tests cover: rendering, credential submission, Google OAuth trigger,
 * error display, loading state, and navigation on success.
 *
 * All external dependencies are mocked at the module level.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks so factories can reference them ──────────────────────────────

const { mockSignIn, mockRouterPush } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockRouterPush: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// next-intl navigation: stub Link + useRouter (LoginForm imports both from here)
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  Link: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => <a href={href} className={className}>{children}</a>,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { LoginForm } from "@/components/features/auth/LoginForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Submits the login form by clicking the submit button. */
async function submitLoginForm() {
  const submitButton = screen.getByRole("button", { name: "auth.signIn" });
  fireEvent.click(submitButton);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email field with accessible label", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("auth.email")).toBeInTheDocument();
  });

  it("renders password field with accessible label", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("auth.password")).toBeInTheDocument();
  });

  it("renders sign-in submit button", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("button", { name: "auth.signIn" })
    ).toBeInTheDocument();
  });

  it("renders Google sign-in button", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("button", { name: "auth.continueWithGoogle" })
    ).toBeInTheDocument();
  });

  it("renders link to register page", () => {
    render(<LoginForm />);

    const registerLink = screen.getByRole("link", { name: "auth.signUp" });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/auth/register");
  });

  it("renders forgot password link", () => {
    render(<LoginForm />);

    const forgotLink = screen.getByRole("link", {
      name: "auth.forgotPassword",
    });
    expect(forgotLink).toHaveAttribute("href", "/auth/forgot-password");
  });

  it("calls signIn with credentials and redirects to /trips on success", async () => {
    mockSignIn.mockResolvedValueOnce({ ok: true, error: null });

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("auth.email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("auth.password"), "password123");
    await submitLoginForm();

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "password123",
        redirect: false,
      });
      expect(mockRouterPush).toHaveBeenCalledWith("/trips");
    });
  });

  it("shows error alert when credentials are invalid", async () => {
    mockSignIn.mockResolvedValueOnce({ ok: false, error: "CredentialsSignin" });

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("auth.email"), "bad@example.com");
    await userEvent.type(screen.getByLabelText("auth.password"), "wrongpass");
    await submitLoginForm();

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("disables submit button while submitting", async () => {
    // signIn never resolves — keeps the component in loading state
    mockSignIn.mockImplementation(() => new Promise(() => {}));

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("auth.email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("auth.password"), "password123");
    fireEvent.click(screen.getByRole("button", { name: "auth.signIn" }));

    await waitFor(() => {
      const submitButton = screen.getByRole("button", {
        name: "auth.signIn",
      });
      expect(submitButton).toBeDisabled();
    });
  });

  it("calls signIn('google') with callbackUrl when Google button is clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(<LoginForm />);

    const googleButton = screen.getByRole("button", {
      name: "auth.continueWithGoogle",
    });
    await userEvent.click(googleButton);

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/trips",
    });
  });
});
