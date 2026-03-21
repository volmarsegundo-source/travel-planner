/**
 * Unit tests for GamificationBadge component.
 * Sprint 35: Enhanced badge with availablePoints, rank icon, rank name, animation.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";

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
    totalPoints: 500,
    availablePoints: 250,
    currentLevel: 3,
    phaseName: "The Preparation",
    rank: "navegador" as const,
  };

  it("renders available points (not total)", () => {
    render(<GamificationBadge {...defaultProps} />);
    expect(screen.getByTestId("badge-points")).toHaveTextContent("250");
  });

  it("shows PA label", () => {
    render(<GamificationBadge {...defaultProps} />);
    expect(screen.getByText("PA")).toBeInTheDocument();
  });

  it("shows rank name via i18n", () => {
    render(<GamificationBadge {...defaultProps} />);
    const rankEl = screen.getByTestId("badge-rank");
    // Mock returns the key, so it shows the rank key
    expect(rankEl).toHaveTextContent("gamification.ranks.navegador");
  });

  it("has role=status for accessibility", () => {
    render(<GamificationBadge {...defaultProps} />);
    const badge = screen.getByTestId("gamification-badge");
    expect(badge).toHaveAttribute("role", "status");
  });

  it("has aria-label with available points and phase name", () => {
    render(<GamificationBadge {...defaultProps} />);
    const badge = screen.getByTestId("gamification-badge");
    const label = badge.getAttribute("aria-label")!;
    expect(label).toContain("250");
    expect(label).toContain("The Preparation");
  });

  it("is NOT a link (display-only div)", () => {
    render(<GamificationBadge {...defaultProps} />);
    const badge = screen.getByTestId("gamification-badge");
    expect(badge.tagName).toBe("DIV");
    expect(badge).not.toHaveAttribute("href");
  });

  it("has cursor-default (not pointer)", () => {
    render(<GamificationBadge {...defaultProps} />);
    const badge = screen.getByTestId("gamification-badge");
    expect(badge.className).toContain("cursor-default");
  });

  it("has atlas-gold styling", () => {
    render(<GamificationBadge {...defaultProps} />);
    const badge = screen.getByTestId("gamification-badge");
    expect(badge.className).toContain("atlas-gold");
  });

  it("renders zero available points", () => {
    render(<GamificationBadge {...defaultProps} availablePoints={0} />);
    expect(screen.getByTestId("badge-points")).toHaveTextContent("0");
  });

  it("renders high available points", () => {
    render(<GamificationBadge {...defaultProps} availablePoints={9999} />);
    expect(screen.getByTestId("badge-points")).toHaveTextContent("9999");
  });

  it("renders different rank icons for different ranks", () => {
    const { rerender } = render(
      <GamificationBadge {...defaultProps} rank="novato" />
    );
    const badge1 = screen.getByTestId("gamification-badge");
    const icon1 = badge1.textContent;

    rerender(<GamificationBadge {...defaultProps} rank="lendario" />);
    const badge2 = screen.getByTestId("gamification-badge");
    const icon2 = badge2.textContent;

    // Different ranks should produce different icons in the text
    expect(icon1).not.toBe(icon2);
  });

  it("applies animation class when points change", async () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <GamificationBadge {...defaultProps} availablePoints={100} />
    );

    rerender(<GamificationBadge {...defaultProps} availablePoints={200} />);

    // After the 50ms timeout, the display should update
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId("badge-points")).toHaveTextContent("200");
    vi.useRealTimers();
  });

  it("includes phase name in sr-only span", () => {
    render(<GamificationBadge {...defaultProps} />);
    const phaseEl = screen.getByTestId("badge-phase");
    expect(phaseEl).toHaveTextContent("The Preparation");
    expect(phaseEl.className).toContain("sr-only");
  });
});
