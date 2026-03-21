/**
 * Behavior tests for RegisterForm.
 *
 * Tests cover: field rendering, validation errors, successful submission,
 * server-side error display, Google/Apple OAuth, conditional provider rendering,
 * optional name field toggle, and link to login page.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockRegisterAction, mockSignIn, mockRouterPush } = vi.hoisted(() => ({
  mockRegisterAction: vi.fn(),
  mockSignIn: vi.fn(),
  mockRouterPush: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/server/actions/auth.actions", () => ({
  registerAction: mockRegisterAction,
}));

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
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

// next-intl navigation: replace Link and useRouter with test doubles
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

import { RegisterForm } from "@/components/features/auth/RegisterForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_PROVIDERS = ["google", "apple"] as const;

/** Fills in form fields and submits the form via fireEvent.submit. */
async function fillAndSubmitForm(email: string, password: string, confirmPassword?: string) {
  await userEvent.type(screen.getByLabelText("auth.email"), email);
  await userEvent.type(screen.getByLabelText("auth.password"), password);
  await userEvent.type(
    screen.getByLabelText("auth.confirmPassword"),
    confirmPassword ?? password
  );
  // Submit the form element directly — works reliably with react-hook-form
  const form = screen.getByLabelText("auth.email").closest("form")!;
  fireEvent.submit(form);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email field with accessible label", () => {
    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(screen.getByLabelText("auth.email")).toBeInTheDocument();
  });

  it("renders password field with accessible label", () => {
    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(screen.getByLabelText("auth.password")).toBeInTheDocument();
  });

  it("renders create account submit button", () => {
    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(
      screen.getByRole("button", { name: "auth.signUp" })
    ).toBeInTheDocument();
  });

  it("renders Google sign-in button when google provider is available", () => {
    render(<RegisterForm availableProviders={["google"]} />);

    expect(
      screen.getByRole("button", { name: "auth.continueWithGoogle" })
    ).toBeInTheDocument();
  });

  it("renders link to login page", () => {
    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    const loginLink = screen.getByRole("link", { name: "auth.signIn" });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/auth/login");
  });

  it("renders trust signals section with badge text", () => {
    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(screen.getByText("trustSignals.badge")).toBeInTheDocument();
  });

  it("hides name input section initially", () => {
    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(document.getElementById("register-name-section")).toBeNull();
  });

  it("reveals optional name field when toggle is clicked", async () => {
    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    // The toggle is a button with aria-expanded and aria-controls
    const toggleButton = screen.getByRole("button", { expanded: false });
    await userEvent.click(toggleButton);

    const nameSection = document.getElementById("register-name-section");
    expect(nameSection).toBeInTheDocument();
    expect(nameSection?.querySelector("input[type='text']")).toBeInTheDocument();
  });

  it("renders confirm password field with accessible label", () => {
    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    expect(screen.getByLabelText("auth.confirmPassword")).toBeInTheDocument();
  });

  it("calls registerAction and redirects to login on success", async () => {
    mockRegisterAction.mockResolvedValueOnce({
      success: true,
      data: { userId: "user-123" },
    });

    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    await fillAndSubmitForm("new@example.com", "SecurePass1!");

    await waitFor(() => {
      expect(mockRegisterAction).toHaveBeenCalledOnce();
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/auth/login?registered=true");
    });
  });

  it("shows validation error when passwords do not match", async () => {
    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    await fillAndSubmitForm("new@example.com", "SecurePass1!", "DifferentPass!");

    await waitFor(() => {
      const errorMessages = screen.getAllByRole("alert");
      expect(errorMessages.length).toBeGreaterThanOrEqual(1);
    });

    expect(mockRegisterAction).not.toHaveBeenCalled();
  });

  it("shows server error alert when registerAction returns failure", async () => {
    mockRegisterAction.mockResolvedValueOnce({
      success: false,
      error: "auth.errors.emailAlreadyExists",
    });

    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    await fillAndSubmitForm("taken@example.com", "SecurePass1!");

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("calls signIn('google') with /expeditions callbackUrl when Google button is clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(<RegisterForm availableProviders={["google"]} />);

    await userEvent.click(
      screen.getByRole("button", { name: "auth.continueWithGoogle" })
    );

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/expeditions",
    });
  });

  // ─── Conditional OAuth rendering ──────────────────────────────────────────

  describe("conditional OAuth rendering", () => {
    it("hides Google button when google is not in availableProviders", () => {
      render(<RegisterForm availableProviders={["apple"]} />);

      expect(screen.queryByTestId("google-signin")).not.toBeInTheDocument();
    });

    it("hides Apple button when apple is not in availableProviders", () => {
      render(<RegisterForm availableProviders={["google"]} />);

      expect(screen.queryByTestId("apple-signin")).not.toBeInTheDocument();
    });

    it("hides all social buttons and divider when no providers are available", () => {
      render(<RegisterForm availableProviders={[]} />);

      expect(screen.queryByTestId("google-signin")).not.toBeInTheDocument();
      expect(screen.queryByTestId("apple-signin")).not.toBeInTheDocument();
      expect(screen.queryByText("auth.orContinueWith")).not.toBeInTheDocument();
    });

    it("defaults to empty providers when prop is omitted", () => {
      render(<RegisterForm />);

      expect(screen.queryByTestId("google-signin")).not.toBeInTheDocument();
      expect(screen.queryByTestId("apple-signin")).not.toBeInTheDocument();
    });
  });

  // ─── Social login buttons ────────────────────────────────────────────────

  it("renders Apple sign-in button when apple provider is available", () => {
    render(<RegisterForm availableProviders={["apple"]} />);

    const appleButton = screen.getByTestId("apple-signin");
    expect(appleButton).toBeInTheDocument();
    expect(appleButton).toHaveTextContent("auth.continueWithApple");
  });

  it("calls signIn('apple') when Apple button is clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(<RegisterForm availableProviders={["apple"]} />);

    const appleButton = screen.getByTestId("apple-signin");
    fireEvent.click(appleButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("apple", {
        callbackUrl: "/expeditions",
      });
    });
  });

  it("renders social buttons before credentials form when both are available", () => {
    const { container } = render(<RegisterForm availableProviders={["google", "apple"]} />);

    const googleBtn = screen.getByTestId("google-signin");
    const appleBtn = screen.getByTestId("apple-signin");
    const form = container.querySelector("form");

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

  it("disables submit button while server action is in progress", async () => {
    mockRegisterAction.mockImplementation(() => new Promise(() => {}));

    render(<RegisterForm availableProviders={[...ALL_PROVIDERS]} />);

    await userEvent.type(screen.getByLabelText("auth.email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("auth.password"), "SecurePass1!");
    await userEvent.type(screen.getByLabelText("auth.confirmPassword"), "SecurePass1!");

    const form = screen.getByLabelText("auth.email").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockRegisterAction).toHaveBeenCalled();
    });

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: "auth.signUp" });
      expect(submitButton).toBeDisabled();
    });
  });
});
