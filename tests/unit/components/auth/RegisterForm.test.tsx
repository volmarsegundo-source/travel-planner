/**
 * Behavior tests for RegisterForm.
 *
 * Tests cover: field rendering, validation errors, successful submission,
 * server-side error display, Google OAuth, optional name field toggle,
 * and link to login page.
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

// ─── Import after mocks ───────────────────────────────────────────────────────

import { RegisterForm } from "@/components/features/auth/RegisterForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fills in form fields and submits the form via fireEvent.submit. */
async function fillAndSubmitForm(email: string, password: string) {
  await userEvent.type(screen.getByLabelText("auth.email"), email);
  await userEvent.type(screen.getByLabelText("auth.password"), password);
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
    render(<RegisterForm />);

    expect(screen.getByLabelText("auth.email")).toBeInTheDocument();
  });

  it("renders password field with accessible label", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("auth.password")).toBeInTheDocument();
  });

  it("renders create account submit button", () => {
    render(<RegisterForm />);

    expect(
      screen.getByRole("button", { name: "auth.signUp" })
    ).toBeInTheDocument();
  });

  it("renders Google sign-in button", () => {
    render(<RegisterForm />);

    expect(
      screen.getByRole("button", { name: "auth.continueWithGoogle" })
    ).toBeInTheDocument();
  });

  it("renders link to login page", () => {
    render(<RegisterForm />);

    const loginLink = screen.getByRole("link", { name: "auth.signIn" });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/auth/login");
  });

  it("renders trust signals section with badge text", () => {
    render(<RegisterForm />);

    expect(screen.getByText("trustSignals.badge")).toBeInTheDocument();
  });

  it("hides name input section initially", () => {
    render(<RegisterForm />);

    expect(document.getElementById("register-name-section")).toBeNull();
  });

  it("reveals optional name field when toggle is clicked", async () => {
    render(<RegisterForm />);

    // The toggle is a button with aria-expanded and aria-controls
    const toggleButton = screen.getByRole("button", { expanded: false });
    await userEvent.click(toggleButton);

    const nameSection = document.getElementById("register-name-section");
    expect(nameSection).toBeInTheDocument();
    expect(nameSection?.querySelector("input[type='text']")).toBeInTheDocument();
  });

  it("calls registerAction and redirects to verify-email on success", async () => {
    mockRegisterAction.mockResolvedValueOnce({
      success: true,
      data: { userId: "user-123" },
    });

    render(<RegisterForm />);

    await fillAndSubmitForm("new@example.com", "SecurePass1!");

    await waitFor(() => {
      expect(mockRegisterAction).toHaveBeenCalledOnce();
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/auth/verify-email");
    });
  });

  it("shows server error alert when registerAction returns failure", async () => {
    mockRegisterAction.mockResolvedValueOnce({
      success: false,
      error: "auth.errors.emailAlreadyExists",
    });

    render(<RegisterForm />);

    await fillAndSubmitForm("taken@example.com", "SecurePass1!");

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("calls signIn('google') when Google button is clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(<RegisterForm />);

    await userEvent.click(
      screen.getByRole("button", { name: "auth.continueWithGoogle" })
    );

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/trips",
    });
  });

  it("disables submit button while server action is in progress", async () => {
    mockRegisterAction.mockImplementation(() => new Promise(() => {}));

    render(<RegisterForm />);

    await userEvent.type(screen.getByLabelText("auth.email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("auth.password"), "SecurePass1!");

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
