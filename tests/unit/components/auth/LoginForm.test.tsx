/**
 * Behavior tests for LoginForm.
 *
 * Tests cover: rendering, credential submission, Google/Apple OAuth trigger,
 * error display, loading state, navigation on success, conditional OAuth
 * button rendering, and OAuth error handling from URL params.
 *
 * All external dependencies are mocked at the module level.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks so factories can reference them ──────────────────────────────

const { mockSignIn, mockRouterPush, mockUseSearchParams } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockRouterPush: vi.fn(),
  mockUseSearchParams: vi.fn(() => new URLSearchParams()),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: mockUseSearchParams,
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

const ALL_PROVIDERS = ["google", "apple"] as const;

/** Submits the login form by clicking the submit button. */
async function submitLoginForm() {
  const submitButton = screen.getByRole("button", { name: "auth.signIn" });
  fireEvent.click(submitButton);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("renders email field with accessible label", () => {
    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(screen.getByLabelText("auth.email")).toBeInTheDocument();
  });

  it("renders password field with accessible label", () => {
    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(screen.getByLabelText("auth.password")).toBeInTheDocument();
  });

  it("renders sign-in submit button", () => {
    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(
      screen.getByRole("button", { name: "auth.signIn" })
    ).toBeInTheDocument();
  });

  it("renders Google sign-in button when google provider is available", () => {
    render(<LoginForm availableProviders={["google"]} />);

    expect(
      screen.getByRole("button", { name: "auth.continueWithGoogle" })
    ).toBeInTheDocument();
  });

  it("renders link to register page", () => {
    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    const registerLink = screen.getByRole("link", { name: "auth.signUp" });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/auth/register");
  });

  it("renders forgot password link", () => {
    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    const forgotLink = screen.getByRole("link", {
      name: "auth.forgotPassword",
    });
    expect(forgotLink).toHaveAttribute("href", "/auth/forgot-password");
  });

  it("calls signIn with credentials and redirects to /expeditions on success", async () => {
    mockSignIn.mockResolvedValueOnce({ ok: true, error: null });

    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    await userEvent.type(screen.getByLabelText("auth.email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("auth.password"), "password123");
    await submitLoginForm();

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "password123",
        redirect: false,
      });
      expect(mockRouterPush).toHaveBeenCalledWith("/expeditions");
    });
  });

  it("shows error alert when credentials are invalid", async () => {
    mockSignIn.mockResolvedValueOnce({ ok: false, error: "CredentialsSignin" });

    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

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

    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

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

  it("shows error alert when signIn throws an exception", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("CredentialsSignin"));

    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    await userEvent.type(screen.getByLabelText("auth.email"), "bad@example.com");
    await userEvent.type(screen.getByLabelText("auth.password"), "wrongpass");
    await submitLoginForm();

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("clears error on re-submit", async () => {
    mockSignIn.mockResolvedValueOnce({ ok: false, error: "CredentialsSignin" });

    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    await userEvent.type(screen.getByLabelText("auth.email"), "bad@example.com");
    await userEvent.type(screen.getByLabelText("auth.password"), "wrongpass");
    await submitLoginForm();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Mock success for second submit
    mockSignIn.mockResolvedValueOnce({ ok: true, error: null });
    await submitLoginForm();

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("calls signIn('google') with callbackUrl when Google button is clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(<LoginForm availableProviders={["google"]} />);

    const googleButton = screen.getByRole("button", {
      name: "auth.continueWithGoogle",
    });
    await userEvent.click(googleButton);

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/expeditions",
    });
  });

  it("shows registration success banner when ?registered=true", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("registered=true"));

    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(screen.getByRole("status")).toHaveTextContent("auth.registrationSuccess");
  });

  it("hides success banner when there is a login error", async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("registered=true"));
    mockSignIn.mockResolvedValueOnce({ ok: false, error: "CredentialsSignin" });

    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    // Banner should be visible initially
    expect(screen.getByRole("status")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("auth.email"), "bad@example.com");
    await userEvent.type(screen.getByLabelText("auth.password"), "wrongpass");
    await submitLoginForm();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Success banner should be hidden when error is showing
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not show success banner without registered query param", () => {
    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders TrustSignals component", () => {
    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    // TrustSignals renders text with trustSignals.badge key
    expect(screen.getByText("trustSignals.badge")).toBeInTheDocument();
  });

  it("renders delete account link from TrustSignals", () => {
    render(<LoginForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(screen.getByText("trustSignals.deleteAccount")).toBeInTheDocument();
  });

  // ─── TASK-S34-006: Conditional OAuth button rendering ──────────────────────

  describe("conditional OAuth rendering", () => {
    it("hides Google button when google is not in availableProviders", () => {
      render(<LoginForm availableProviders={["apple"]} />);

      expect(screen.queryByTestId("google-signin")).not.toBeInTheDocument();
    });

    it("hides Apple button when apple is not in availableProviders", () => {
      render(<LoginForm availableProviders={["google"]} />);

      expect(screen.queryByTestId("apple-signin")).not.toBeInTheDocument();
    });

    it("hides all social buttons and divider when no providers are available", () => {
      render(<LoginForm availableProviders={[]} />);

      expect(screen.queryByTestId("google-signin")).not.toBeInTheDocument();
      expect(screen.queryByTestId("apple-signin")).not.toBeInTheDocument();
      expect(screen.queryByText("auth.orContinueWith")).not.toBeInTheDocument();
    });

    it("renders only credentials form when availableProviders is empty", () => {
      render(<LoginForm availableProviders={[]} />);

      // Credentials form should still work
      expect(screen.getByLabelText("auth.email")).toBeInTheDocument();
      expect(screen.getByLabelText("auth.password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "auth.signIn" })).toBeInTheDocument();
    });

    it("renders both social buttons when both providers are available", () => {
      render(<LoginForm availableProviders={["google", "apple"]} />);

      expect(screen.getByTestId("google-signin")).toBeInTheDocument();
      expect(screen.getByTestId("apple-signin")).toBeInTheDocument();
      expect(screen.getByText("auth.orContinueWith")).toBeInTheDocument();
    });

    it("defaults to empty providers when prop is omitted", () => {
      render(<LoginForm />);

      expect(screen.queryByTestId("google-signin")).not.toBeInTheDocument();
      expect(screen.queryByTestId("apple-signin")).not.toBeInTheDocument();
    });
  });

  // ─── TASK-S34-006: OAuth error handling ─────────────────────────────────────

  describe("OAuth error handling", () => {
    it("shows error banner when ?error=OAuthError is in URL", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams("error=OAuthSignin"));

      render(<LoginForm availableProviders={["google"]} />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("shows error banner for any error query param value", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams("error=AccessDenied"));

      render(<LoginForm availableProviders={["google"]} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  // ─── TASK-S33-013/014/015: Social login buttons ───────────────────────────

  it("renders Apple sign-in button when apple provider is available", () => {
    render(<LoginForm availableProviders={["apple"]} />);

    const appleButton = screen.getByTestId("apple-signin");
    expect(appleButton).toBeInTheDocument();
    expect(appleButton).toHaveTextContent("auth.continueWithApple");
  });

  it("calls signIn('apple') when Apple button is clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(<LoginForm availableProviders={["apple"]} />);

    const appleButton = screen.getByTestId("apple-signin");
    fireEvent.click(appleButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("apple", {
        callbackUrl: "/expeditions",
      });
    });
  });

  it("renders social buttons before credentials form when both are available", () => {
    const { container } = render(<LoginForm availableProviders={["google", "apple"]} />);

    const googleBtn = screen.getByTestId("google-signin");
    const appleBtn = screen.getByTestId("apple-signin");
    const form = container.querySelector("form");

    // Both social buttons should exist and form should exist
    expect(googleBtn).toBeInTheDocument();
    expect(appleBtn).toBeInTheDocument();
    expect(form).toBeInTheDocument();

    // Social buttons should appear before the form in DOM order
    expect(
      googleBtn.compareDocumentPosition(form!)
        & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      appleBtn.compareDocumentPosition(form!)
        & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
