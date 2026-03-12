/**
 * Unit tests for AtlasProfilePage component.
 * SPEC-ARCH-004: Navigation restructure — atlas profile page.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!values) return fullKey;
      return `${fullKey}[${Object.values(values).join(",")}]`;
    },
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

import { AtlasProfilePage } from "@/components/features/dashboard/AtlasProfilePage";

describe("AtlasProfilePage", () => {
  const defaultProps = {
    totalPoints: 350,
    currentRank: "explorer" as const,
    streakDays: 7,
    badges: [
      { badgeKey: "firstTrip" as const, earnedAt: new Date("2026-01-15") },
    ],
    expeditionCount: 3,
  };

  it("renders stats grid with points", () => {
    render(<AtlasProfilePage {...defaultProps} />);
    expect(screen.getByTestId("atlas-points")).toHaveTextContent("350");
  });

  it("renders rank name", () => {
    render(<AtlasProfilePage {...defaultProps} />);
    expect(screen.getByTestId("atlas-rank")).toHaveTextContent("gamification.ranks.explorer");
  });

  it("renders badge count", () => {
    render(<AtlasProfilePage {...defaultProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders streak days", () => {
    render(<AtlasProfilePage {...defaultProps} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders badges section when badges exist", () => {
    render(<AtlasProfilePage {...defaultProps} />);
    expect(screen.getByText("atlas.badgesEarned")).toBeInTheDocument();
    expect(screen.getByText("gamification.badges.firstTrip")).toBeInTheDocument();
  });

  it("renders empty state when no expeditions and no points", () => {
    render(
      <AtlasProfilePage
        totalPoints={0}
        currentRank="traveler"
        streakDays={0}
        badges={[]}
        expeditionCount={0}
      />
    );
    expect(screen.getByTestId("atlas-empty")).toBeInTheDocument();
    expect(screen.getByText("atlas.emptyTitle")).toBeInTheDocument();
    expect(screen.getByText("atlas.emptyDescription")).toBeInTheDocument();
  });

  it("links to expedition/new in empty state", () => {
    render(
      <AtlasProfilePage
        totalPoints={0}
        currentRank="traveler"
        streakDays={0}
        badges={[]}
        expeditionCount={0}
      />
    );
    const link = screen.getByText("atlas.startExpedition").closest("a");
    expect(link).toHaveAttribute("href", "/expedition/new");
  });

  it("does not show badges section when empty", () => {
    render(<AtlasProfilePage {...defaultProps} badges={[]} />);
    expect(screen.queryByText("atlas.badgesEarned")).not.toBeInTheDocument();
  });
});
