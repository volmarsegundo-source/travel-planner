import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { LandingPageV2 } from "../LandingPageV2";

// SPEC-LANDING-LAYOUT-001: anonymous landing must render sections in this
// order — Hero, Phases, Destinations, Gamification, AI.

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => "pt-BR",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../LandingNav", () => ({
  LandingNav: () => <nav data-testid="landing-nav" />,
}));
vi.mock("../HeroSectionV2", () => ({
  HeroSectionV2: () => <div data-testid="section-hero" />,
}));
vi.mock("../PhasesSectionV2", () => ({
  PhasesSectionV2: () => <div data-testid="section-phases" />,
}));
vi.mock("../DestinationsSectionV2", () => ({
  DestinationsSectionV2: () => <div data-testid="section-destinations" />,
}));
vi.mock("../GamificationSectionV2", () => ({
  GamificationSectionV2: () => <div data-testid="section-gamification" />,
}));
vi.mock("../AiSectionV2", () => ({
  AiSectionV2: () => <div data-testid="section-ai" />,
}));
vi.mock("../FooterV2", () => ({
  FooterV2: () => <footer data-testid="landing-footer" />,
}));

describe("LandingPageV2 section order — SPEC-LANDING-LAYOUT-001", () => {
  it("renders hero → phases → destinations → gamification → ai in order", () => {
    const { container } = render(<LandingPageV2 isAuthenticated={false} />);
    const expectedOrder = [
      "section-hero",
      "section-phases",
      "section-destinations",
      "section-gamification",
      "section-ai",
    ];
    const all = Array.from(container.querySelectorAll("[data-testid]"));
    const positions = expectedOrder.map((id) =>
      all.findIndex((n) => n.getAttribute("data-testid") === id),
    );
    positions.forEach((p) => expect(p).toBeGreaterThanOrEqual(0));
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });
});
