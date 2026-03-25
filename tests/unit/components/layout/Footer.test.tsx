/**
 * Behavior tests for Footer component.
 *
 * Tests cover: copyright text, login/sign-up links (public variant),
 * terms/privacy/support links (authenticated variant), language switcher.
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
  describe("public variant (default)", () => {
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

    it("does not render terms, privacy, or support links", () => {
      render(<Footer />);

      expect(screen.queryByRole("link", { name: "landing.footer.terms" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "landing.footer.privacy" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "landing.footer.support" })).not.toBeInTheDocument();
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

  describe("authenticated variant", () => {
    it("renders the copyright text", () => {
      render(<Footer variant="authenticated" />);

      expect(screen.getByText("landing.footer.copyright")).toBeInTheDocument();
    });

    it("renders a terms link pointing to /termos", () => {
      render(<Footer variant="authenticated" />);

      const termsLink = screen.getByRole("link", { name: "landing.footer.terms" });
      expect(termsLink).toHaveAttribute("href", "/termos");
    });

    it("renders a privacy link pointing to /privacidade", () => {
      render(<Footer variant="authenticated" />);

      const privacyLink = screen.getByRole("link", { name: "landing.footer.privacy" });
      expect(privacyLink).toHaveAttribute("href", "/privacidade");
    });

    it("renders a support link pointing to /support", () => {
      render(<Footer variant="authenticated" />);

      const supportLink = screen.getByRole("link", { name: "landing.footer.support" });
      expect(supportLink).toHaveAttribute("href", "/support");
    });

    it("does not render sign in or sign up links", () => {
      render(<Footer variant="authenticated" />);

      expect(screen.queryByRole("link", { name: "auth.signIn" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "auth.signUp" })).not.toBeInTheDocument();
    });

    it("renders the language switcher", () => {
      render(<Footer variant="authenticated" />);

      expect(screen.getByText("EN")).toBeInTheDocument();
      expect(screen.getByText("PT")).toBeInTheDocument();
    });

    it("renders inside a footer element", () => {
      render(<Footer variant="authenticated" />);

      const footer = document.querySelector("footer");
      expect(footer).toBeInTheDocument();
    });
  });
});
