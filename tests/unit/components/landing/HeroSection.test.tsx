/**
 * Behavior tests for HeroSection component.
 *
 * Tests cover: title, subtitle, CTA link, login link, and gradient background.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

vi.mock("@/i18n/navigation", () => ({
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
  usePathname: () => "/",
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { HeroSection } from "@/components/landing/HeroSection";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("HeroSection", () => {
  it("renders the hero title", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("heading", { level: 1, name: "landing.hero.title" })
    ).toBeInTheDocument();
  });

  it("renders the hero subtitle", () => {
    render(<HeroSection />);

    expect(screen.getByText("landing.hero.subtitle")).toBeInTheDocument();
  });

  it("renders the CTA button linking to /auth/register", () => {
    render(<HeroSection />);

    const cta = screen.getByText("landing.hero.cta");
    expect(cta.closest("a")).toHaveAttribute("href", "/auth/register");
  });

  it("renders the login prompt text", () => {
    render(<HeroSection />);

    expect(screen.getByText("landing.hero.loginPrompt")).toBeInTheDocument();
  });

  it("renders a login link pointing to /auth/login", () => {
    render(<HeroSection />);

    const loginLink = screen.getByText("auth.signIn");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/auth/login");
  });

  it("has a gradient background section", () => {
    render(<HeroSection />);

    const section = document.querySelector("section");
    expect(section?.className).toContain("bg-gradient");
  });

  it("renders background decorations as aria-hidden", () => {
    render(<HeroSection />);

    const decoration = document.querySelector("[aria-hidden='true']");
    expect(decoration).toBeInTheDocument();
  });
});
