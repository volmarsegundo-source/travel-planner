/**
 * Behavior tests for Footer component.
 *
 * Tests cover: copyright text, login/sign-up links, language switcher.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    className,
    locale,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    locale?: string;
  }) => (
    <a href={href} className={className} data-locale={locale}>
      {children}
    </a>
  ),
  usePathname: () => "/",
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { Footer } from "@/components/layout/Footer";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Footer", () => {
  it("renders the copyright text", () => {
    render(<Footer />);

    expect(screen.getByText("landing.footer.copyright")).toBeInTheDocument();
  });

  it("renders a Login link pointing to /auth/login", () => {
    render(<Footer />);

    const loginLink = screen.getByRole("link", { name: "auth.signIn" });
    expect(loginLink).toHaveAttribute("href", "/auth/login");
  });

  it("renders a Sign Up link pointing to /auth/register", () => {
    render(<Footer />);

    const signUpLink = screen.getByRole("link", { name: "auth.signUp" });
    expect(signUpLink).toHaveAttribute("href", "/auth/register");
  });

  it("renders the language switcher", () => {
    render(<Footer />);

    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("PT")).toBeInTheDocument();
  });

  it("renders inside a footer element", () => {
    render(<Footer />);

    const footer = document.querySelector("footer");
    expect(footer).toBeInTheDocument();
  });
});
