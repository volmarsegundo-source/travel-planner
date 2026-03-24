/**
 * Tests for PhasesSectionV2 component.
 *
 * Covers: 8 phase cards rendering, "Em Breve" badge on phases 7-8,
 * aria-disabled on coming-soon cards, section anchor id, and hover behavior.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { PhasesSectionV2 } from "@/components/features/landing/PhasesSectionV2";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_PHASES = 8;
const COMING_SOON_PHASE_NUMBERS = [7, 8];
const ACTIVE_PHASE_NUMBERS = [1, 2, 3, 4, 5, 6];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PhasesSectionV2", () => {
  it("renders the section title as h2", () => {
    render(<PhasesSectionV2 />);

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("landingV2.phases.title");
  });

  it("renders 8 phase cards", () => {
    render(<PhasesSectionV2 />);

    const cards = screen.getAllByRole("heading", { level: 3 });
    expect(cards).toHaveLength(TOTAL_PHASES);
  });

  it("renders phase names for all 8 phases", () => {
    render(<PhasesSectionV2 />);

    for (let i = 1; i <= TOTAL_PHASES; i++) {
      expect(screen.getByText(`landingV2.phases.phase${i}.name`)).toBeInTheDocument();
    }
  });

  it("renders phase descriptions for all 8 phases", () => {
    render(<PhasesSectionV2 />);

    for (let i = 1; i <= TOTAL_PHASES; i++) {
      expect(screen.getByText(`landingV2.phases.phase${i}.description`)).toBeInTheDocument();
    }
  });

  it("renders 'Em Breve' badges on phases 7 and 8", () => {
    render(<PhasesSectionV2 />);

    const badges = screen.getAllByText("landingV2.phases.comingSoon");
    expect(badges).toHaveLength(COMING_SOON_PHASE_NUMBERS.length);
  });

  it("applies aria-disabled to phases 7 and 8 card wrappers", () => {
    const { container } = render(<PhasesSectionV2 />);

    const disabledCards = container.querySelectorAll("[aria-disabled='true']");
    expect(disabledCards).toHaveLength(COMING_SOON_PHASE_NUMBERS.length);
  });

  it("applies opacity-60 to coming-soon phase wrappers", () => {
    const { container } = render(<PhasesSectionV2 />);

    const disabledCards = container.querySelectorAll("[aria-disabled='true']");
    disabledCards.forEach((card) => {
      expect(card.className).toContain("opacity-60");
    });
  });

  it("does NOT apply aria-disabled to active phases 1-6", () => {
    const { container } = render(<PhasesSectionV2 />);

    // There are 8 phase wrapper divs; only 2 should have aria-disabled
    const allPhaseWrappers = container.querySelectorAll(
      "[data-slot='atlas-card']",
    );
    const disabledCount = Array.from(allPhaseWrappers).filter(
      (el) => el.closest("[aria-disabled='true']") !== null,
    ).length;

    expect(disabledCount).toBe(COMING_SOON_PHASE_NUMBERS.length);
    expect(allPhaseWrappers.length - disabledCount).toBe(ACTIVE_PHASE_NUMBERS.length);
  });

  it("has id='fases' on the section element for scroll anchor", () => {
    const { container } = render(<PhasesSectionV2 />);

    const section = container.querySelector("section#fases");
    expect(section).toBeInTheDocument();
  });

  it("active phase cards have hover translate class", () => {
    const { container } = render(<PhasesSectionV2 />);

    // Get cards that are NOT inside aria-disabled wrappers
    const allCards = container.querySelectorAll("[data-slot='atlas-card']");
    let activeCardsWithHover = 0;

    allCards.forEach((card) => {
      const wrapper = card.closest("[aria-disabled]");
      if (!wrapper) {
        expect(card.className).toContain("hover:translate-y-[-4px]");
        activeCardsWithHover++;
      }
    });

    expect(activeCardsWithHover).toBe(ACTIVE_PHASE_NUMBERS.length);
  });

  it("coming-soon phase cards do NOT have hover translate class", () => {
    const { container } = render(<PhasesSectionV2 />);

    const disabledWrappers = container.querySelectorAll("[aria-disabled='true']");
    disabledWrappers.forEach((wrapper) => {
      const card = wrapper.querySelector("[data-slot='atlas-card']");
      expect(card?.className).not.toContain("hover:translate-y-[-4px]");
    });
  });

  it("includes reduced-motion safety on hover animation", () => {
    const { container } = render(<PhasesSectionV2 />);

    const allCards = container.querySelectorAll("[data-slot='atlas-card']");
    allCards.forEach((card) => {
      if (card.className.includes("hover:translate-y-[-4px]")) {
        expect(card.className).toContain("motion-reduce:hover:translate-y-0");
      }
    });
  });
});
