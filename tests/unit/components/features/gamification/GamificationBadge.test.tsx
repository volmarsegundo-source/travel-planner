/**
 * Unit tests for GamificationBadge component.
 * SPEC-ARCH-006: Real-time gamification in header.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { GamificationBadge } from "@/components/features/gamification/GamificationBadge";

describe("GamificationBadge", () => {
  const defaultProps = {
    totalPoints: 250,
    currentLevel: 3,
    phaseName: "The Preparation",
  };

  it("renders with points and phase name", () => {
    render(<GamificationBadge {...defaultProps} />);
    expect(screen.getByTestId("badge-points")).toHaveTextContent("250");
    expect(screen.getByTestId("badge-phase")).toHaveTextContent("The Preparation");
  });

  it("links to /atlas", () => {
    render(<GamificationBadge {...defaultProps} />);
    const link = screen.getByTestId("gamification-badge");
    expect(link).toHaveAttribute("href", "/atlas");
  });

  it("shows viewProfile tooltip", () => {
    render(<GamificationBadge {...defaultProps} />);
    const link = screen.getByTestId("gamification-badge");
    expect(link).toHaveAttribute("title", "gamification.badge.viewProfile");
  });

  it("renders zero points", () => {
    render(<GamificationBadge {...defaultProps} totalPoints={0} />);
    expect(screen.getByTestId("badge-points")).toHaveTextContent("0");
  });

  it("renders high points", () => {
    render(<GamificationBadge {...defaultProps} totalPoints={9999} />);
    expect(screen.getByTestId("badge-points")).toHaveTextContent("9999");
  });

  it("has atlas-gold styling", () => {
    render(<GamificationBadge {...defaultProps} />);
    const link = screen.getByTestId("gamification-badge");
    expect(link.className).toContain("atlas-gold");
  });
});
