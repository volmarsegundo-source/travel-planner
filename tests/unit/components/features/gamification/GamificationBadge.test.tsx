/**
 * Unit tests for GamificationBadge component.
 * SPEC-ARCH-006: Real-time gamification in header.
 * Updated Sprint 31: Badge is display-only (not a link).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, params?: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (params) {
        const paramStr = Object.values(params).map(String).join(" ");
        return `${fullKey} ${paramStr}`;
      }
      return fullKey;
    },
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

  it("is NOT a link (display-only div)", () => {
    render(<GamificationBadge {...defaultProps} />);
    const badge = screen.getByTestId("gamification-badge");
    expect(badge.tagName).toBe("DIV");
    expect(badge).not.toHaveAttribute("href");
  });

  it("has role=status for accessibility", () => {
    render(<GamificationBadge {...defaultProps} />);
    const badge = screen.getByTestId("gamification-badge");
    expect(badge).toHaveAttribute("role", "status");
  });

  it("has aria-label with points and rank name", () => {
    render(<GamificationBadge {...defaultProps} />);
    const badge = screen.getByTestId("gamification-badge");
    expect(badge).toHaveAttribute("aria-label");
    const label = badge.getAttribute("aria-label")!;
    expect(label).toContain("250");
    expect(label).toContain("The Preparation");
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
    const badge = screen.getByTestId("gamification-badge");
    expect(badge.className).toContain("atlas-gold");
  });

  it("has cursor-default (not pointer)", () => {
    render(<GamificationBadge {...defaultProps} />);
    const badge = screen.getByTestId("gamification-badge");
    expect(badge.className).toContain("cursor-default");
    expect(badge.className).not.toContain("cursor-pointer");
  });
});
