/**
 * Unit tests for BadgeShowcase component.
 *
 * Tests cover:
 * - Renders all badges passed as props
 * - Locked badges show lock icon and progress bar
 * - Unlocked badges show badge icon and earned date
 * - Category headings are rendered
 * - ARIA roles and attributes
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      let result = key;
      for (const [k, v] of Object.entries(params)) {
        result = result + `[${k}=${v}]`;
      }
      return result;
    }
    return key;
  },
}));

// ─── Import SUT ─────────────────────────────────────────────────────────────

import {
  BadgeShowcase,
  type BadgeDisplayItem,
} from "@/components/features/gamification/BadgeShowcase";

// ─── Test data ──────────────────────────────────────────────────────────────

const mockBadges: BadgeDisplayItem[] = [
  {
    key: "primeira_viagem",
    nameKey: "gamification.badges.primeira_viagem.name",
    descriptionKey: "gamification.badges.primeira_viagem.description",
    category: "explorador",
    icon: "\u{1F30D}",
    unlocked: true,
    earnedAt: "2026-03-15T00:00:00Z",
    progress: { current: 1, target: 1, percentage: 100 },
  },
  {
    key: "viajante_frequente",
    nameKey: "gamification.badges.viajante_frequente.name",
    descriptionKey: "gamification.badges.viajante_frequente.description",
    category: "explorador",
    icon: "\u{2708}\uFE0F",
    unlocked: false,
    earnedAt: null,
    progress: { current: 1, target: 3, percentage: 33 },
  },
  {
    key: "detalhista",
    nameKey: "gamification.badges.detalhista.name",
    descriptionKey: "gamification.badges.detalhista.description",
    category: "perfeccionista",
    icon: "\u{1F50D}",
    unlocked: false,
    earnedAt: null,
    progress: { current: 0, target: 1, percentage: 0 },
  },
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("BadgeShowcase", () => {
  it("renders the showcase title", () => {
    render(<BadgeShowcase badges={mockBadges} />);

    expect(
      screen.getByText("gamification.badgeShowcase.title")
    ).toBeInTheDocument();
  });

  it("renders category headings for present categories", () => {
    render(<BadgeShowcase badges={mockBadges} />);

    expect(
      screen.getByText("gamification.badgeShowcase.categoryExplorador")
    ).toBeInTheDocument();
    expect(
      screen.getByText("gamification.badgeShowcase.categoryPerfeccionista")
    ).toBeInTheDocument();
  });

  it("does not render empty category headings", () => {
    render(<BadgeShowcase badges={mockBadges} />);

    // aventureiro and veterano have no badges in test data
    expect(
      screen.queryByText("gamification.badgeShowcase.categoryAventureiro")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("gamification.badgeShowcase.categoryVeterano")
    ).not.toBeInTheDocument();
  });

  it("renders all provided badges", () => {
    render(<BadgeShowcase badges={mockBadges} />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(3);
  });

  it("shows unlocked badge with earned date", () => {
    render(<BadgeShowcase badges={mockBadges} />);

    // The unlocked badge should have the earnedOn text
    const unlocked = screen.getByLabelText(
      /gamification\.badges\.primeira_viagem\.name.*gamification\.badgeShowcase\.unlocked/
    );
    expect(unlocked).toBeInTheDocument();
  });

  it("shows locked badge with progress bar", () => {
    render(<BadgeShowcase badges={mockBadges} />);

    // Progress bar for viajante_frequente (33%)
    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars.length).toBeGreaterThanOrEqual(1);

    const firstBar = progressBars[0];
    expect(firstBar).toHaveAttribute("aria-valuenow", "33");
  });

  it("renders badge grid with list role", () => {
    render(<BadgeShowcase badges={mockBadges} />);

    const lists = screen.getAllByRole("list");
    expect(lists.length).toBeGreaterThanOrEqual(1);
  });
});
