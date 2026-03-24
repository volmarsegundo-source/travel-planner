/**
 * Tests for HeroSectionV2 component.
 *
 * Covers: headline rendering, CTA buttons, badge pill,
 * smooth scroll behavior, and auth-dependent CTA links.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { HeroSectionV2 } from "@/components/features/landing/HeroSectionV2";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("HeroSectionV2", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the hero headline as h1", () => {
    render(<HeroSectionV2 />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("landingV2.hero.title");
  });

  it("renders the badge pill", () => {
    render(<HeroSectionV2 />);

    expect(screen.getByText("landingV2.hero.badge")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<HeroSectionV2 />);

    expect(screen.getByText("landingV2.hero.subtitle")).toBeInTheDocument();
  });

  it("renders the primary CTA button", () => {
    render(<HeroSectionV2 />);

    expect(screen.getByText("landingV2.hero.cta")).toBeInTheDocument();
  });

  it("renders the secondary CTA button", () => {
    render(<HeroSectionV2 />);

    expect(screen.getByText("landingV2.hero.secondaryCta")).toBeInTheDocument();
  });

  it("links primary CTA to /auth/register when not authenticated", () => {
    render(<HeroSectionV2 isAuthenticated={false} />);

    const ctaLink = screen.getByText("landingV2.hero.cta").closest("a");
    expect(ctaLink).toHaveAttribute("href", "/auth/register");
  });

  it("links primary CTA to /expeditions when authenticated", () => {
    render(<HeroSectionV2 isAuthenticated={true} />);

    const ctaLink = screen.getByText("landingV2.hero.cta").closest("a");
    expect(ctaLink).toHaveAttribute("href", "/expeditions");
  });

  it("secondary CTA triggers smooth scroll to #fases", () => {
    const scrollIntoViewMock = vi.fn();
    const mockElement = { scrollIntoView: scrollIntoViewMock };
    vi.spyOn(document, "getElementById").mockReturnValue(
      mockElement as unknown as HTMLElement,
    );

    render(<HeroSectionV2 />);

    const secondaryCta = screen.getByText("landingV2.hero.secondaryCta").closest("a");
    expect(secondaryCta).toHaveAttribute("href", "#fases");

    fireEvent.click(secondaryCta!);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("has minimum viewport height class", () => {
    const { container } = render(<HeroSectionV2 />);

    const section = container.querySelector("section");
    expect(section?.className).toContain("min-h-[70vh]");
  });
});
