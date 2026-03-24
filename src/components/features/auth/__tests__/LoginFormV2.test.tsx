import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginFormV2 } from "../LoginFormV2";

/* ────────────────────────────────────────────────────────────────────────────
 * Mocks
 * ──────────────────────────────────────────────────────────────────────────── */

const mockRouterPush = vi.hoisted(() => vi.fn());
const mockSignIn = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => {
    const translate = (key: string, params?: Record<string, string>) => {
      let result = `${ns}.${key}`;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, v);
        });
      }
      return result;
    };
    return translate;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
}));

describe("LoginFormV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ─── Renders core form elements ───────────────────────────────────────── */

  it("renders email and password inputs and submit button", () => {
    render(<LoginFormV2 />);

    expect(screen.getByLabelText(/authV2\.emailLabel/)).toBeInTheDocument();
    expect(screen.getByLabelText(/authV2\.passwordLabel/)).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", {
      name: /authV2\.submit/,
    });
    expect(submitBtn).toBeInTheDocument();
  });

  /* ─── Renders welcome text ────────────────────────────────────────────── */

  it("renders welcome heading and subtitle", () => {
    render(<LoginFormV2 />);

    expect(
      screen.getByRole("heading", { name: "authV2.welcomeBack" }),
    ).toBeInTheDocument();
    expect(screen.getByText("authV2.subtitle")).toBeInTheDocument();
  });

  /* ─── Brand panel renders decorative card (not real data) ──────────── */

  it("renders brand panel with decorative content (hidden on mobile via CSS)", () => {
    const { container } = render(<LoginFormV2 />);

    // Brand panel exists in DOM (hidden via CSS class lg:flex)
    const brandPanel = container.querySelector('[aria-hidden="true"]');
    expect(brandPanel).toBeInTheDocument();

    // Contains hardcoded route text (decorative)
    expect(screen.getByText(/Rio de Janeiro/)).toBeInTheDocument();
    expect(screen.getByText(/Lisboa/)).toBeInTheDocument();
  });

  /* ─── Mobile header renders Atlas logo ────────────────────────────────── */

  it("renders mobile header with Atlas branding", () => {
    render(<LoginFormV2 />);

    // "Atlas" text should appear in mobile header (and optionally brand panel)
    const atlasTexts = screen.getAllByText("Atlas");
    expect(atlasTexts.length).toBeGreaterThanOrEqual(1);
  });

  /* ─── Social buttons conditional on providers ───────────────────────── */

  it("hides social login section when no providers configured", () => {
    render(<LoginFormV2 availableProviders={[]} />);

    // No "or" divider
    expect(screen.queryByText("authV2.or")).not.toBeInTheDocument();
    // No Google button
    expect(screen.queryByTestId("google-signin-v2")).not.toBeInTheDocument();
  });

  it("shows Google button when google provider is available", () => {
    render(<LoginFormV2 availableProviders={["google"]} />);

    // "or" divider visible
    expect(screen.getByText("authV2.or")).toBeInTheDocument();
    // Google button visible
    expect(screen.getByTestId("google-signin-v2")).toBeInTheDocument();
  });

  /* ─── Form submission with valid credentials ───────────────────────── */

  it("submits credentials and redirects on success", async () => {
    mockSignIn.mockResolvedValueOnce({ ok: true, error: null });

    render(<LoginFormV2 />);

    const emailInput = screen.getByLabelText(/authV2\.emailLabel/);
    const passwordInput = screen.getByLabelText(/authV2\.passwordLabel/);
    const form = emailInput.closest("form")!;

    fireEvent.change(emailInput, { target: { value: "user@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "Test1234!" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "user@test.com",
        password: "Test1234!",
        redirect: false,
      });
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/expeditions");
    });
  });

  /* ─── Error displayed with invalid credentials ─────────────────────── */

  it("shows error message on invalid credentials", async () => {
    mockSignIn.mockResolvedValueOnce({ ok: false, error: "CredentialsSignin" });

    render(<LoginFormV2 />);

    const emailInput = screen.getByLabelText(/authV2\.emailLabel/);
    const passwordInput = screen.getByLabelText(/authV2\.passwordLabel/);
    const form = emailInput.closest("form")!;

    fireEvent.change(emailInput, { target: { value: "bad@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrong" } });
    fireEvent.submit(form);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });
  });

  /* ─── Error on signIn exception ────────────────────────────────────── */

  it("shows error when signIn throws", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("Network error"));

    render(<LoginFormV2 />);

    const emailInput = screen.getByLabelText(/authV2\.emailLabel/);
    const passwordInput = screen.getByLabelText(/authV2\.passwordLabel/);
    const form = emailInput.closest("form")!;

    fireEvent.change(emailInput, { target: { value: "user@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "pass" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  /* ─── Links present ───────────────────────────────────────────────── */

  it("renders forgot password and create account links", () => {
    render(<LoginFormV2 />);

    const forgotLink = screen.getByText("authV2.forgotPassword");
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink.closest("a")).toHaveAttribute(
      "href",
      "/auth/forgot-password",
    );

    const createLink = screen.getByText("authV2.createAccount");
    expect(createLink).toBeInTheDocument();
    expect(createLink.closest("a")).toHaveAttribute("href", "/auth/register");
  });

  /* ─── Legal text with links ────────────────────────────────────────── */

  it("renders legal text with terms and privacy links", () => {
    render(<LoginFormV2 />);

    expect(screen.getByText("authV2.termsOfUse")).toBeInTheDocument();
    expect(screen.getByText("authV2.privacyPolicy")).toBeInTheDocument();
  });

  /* ─── Remember me checkbox ─────────────────────────────────────────── */

  it("renders remember me checkbox", () => {
    render(<LoginFormV2 />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(
      screen.getByLabelText("authV2.rememberMe"),
    ).toBeInTheDocument();
  });

  /* ─── Google signIn triggered ──────────────────────────────────────── */

  it("triggers Google sign-in when Google button is clicked", async () => {
    mockSignIn.mockResolvedValueOnce(undefined);
    render(<LoginFormV2 availableProviders={["google"]} />);

    const googleBtn = screen.getByTestId("google-signin-v2");
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("google", {
        callbackUrl: "/expeditions",
      });
    });
  });

  /* ─── Disabled state during submission ─────────────────────────────── */

  it("disables submit during form submission", async () => {
    let resolveSignIn: (value: { ok: boolean }) => void;
    mockSignIn.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    render(<LoginFormV2 />);

    const emailInput = screen.getByLabelText(/authV2\.emailLabel/);
    const passwordInput = screen.getByLabelText(/authV2\.passwordLabel/);
    const form = emailInput.closest("form")!;

    fireEvent.change(emailInput, { target: { value: "user@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "Test1234!" } });
    fireEvent.submit(form);

    // Submit button should be disabled and show loading (aria-busy)
    await waitFor(() => {
      const submitBtn = form.querySelector('button[type="submit"]');
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveAttribute("aria-busy", "true");
    });

    // Resolve to clean up
    resolveSignIn!({ ok: true });
  });
});
