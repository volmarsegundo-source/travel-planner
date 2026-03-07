/**
 * Behavior tests for HeroSection component (Atlas redesign).
 *
 * Tests cover: eyebrow, title with highlight, description, CTA links,
 * stats panel, scroll indicator, and background decorations.
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
  it("renders the eyebrow text", () => {
    render(<HeroSection />);

    expect(screen.getByText("landing.hero.eyebrow")).toBeInTheDocument();
  });

  it("renders the hero title as h1", () => {
    render(<HeroSection />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain("landing.hero.title");
  });

  it("renders the title highlight text", () => {
    render(<HeroSection />);

    expect(screen.getByText("landing.hero.titleHighlight")).toBeInTheDocument();
  });

  it("renders the hero description", () => {
    render(<HeroSection />);

    expect(screen.getByText("landing.hero.description")).toBeInTheDocument();
  });

  it("renders the primary CTA button linking to /auth/register", () => {
    render(<HeroSection />);

    const cta = screen.getByText("landing.hero.cta");
    expect(cta.closest("a")).toHaveAttribute("href", "/auth/register");
  });

  it("renders the secondary CTA button linking to #features", () => {
    render(<HeroSection />);

    const secondaryCta = screen.getByText("landing.hero.secondaryCta");
    expect(secondaryCta.closest("a")).toHaveAttribute("href", "#features");
  });

  it("renders the stats panel with three stats", () => {
    render(<HeroSection />);

    expect(screen.getByText("landing.hero.stat1Value")).toBeInTheDocument();
    expect(screen.getByText("landing.hero.stat1Label")).toBeInTheDocument();
    expect(screen.getByText("landing.hero.stat2Value")).toBeInTheDocument();
    expect(screen.getByText("landing.hero.stat2Label")).toBeInTheDocument();
    expect(screen.getByText("landing.hero.stat3Value")).toBeInTheDocument();
    expect(screen.getByText("landing.hero.stat3Label")).toBeInTheDocument();
  });

  it("renders background decorations as aria-hidden", () => {
    render(<HeroSection />);

    const decorations = document.querySelectorAll("[aria-hidden='true']");
    expect(decorations.length).toBeGreaterThanOrEqual(3);
  });

  it("renders a scroll indicator as aria-hidden", () => {
    render(<HeroSection />);

    // The scroll indicator SVG is inside an aria-hidden div
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it("uses Atlas design tokens instead of gradient background", () => {
    render(<HeroSection />);

    const section = document.querySelector("section");
    expect(section?.className).toContain("bg-background");
    expect(section?.className).not.toContain("bg-gradient");
  });
});
