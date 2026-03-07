/**
 * Behavior tests for FeaturesSection component.
 *
 * Tests cover: rendering of 4 feature cards with titles and descriptions.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { FeaturesSection } from "@/components/landing/FeaturesSection";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FeaturesSection", () => {
  it("renders 4 feature cards", () => {
    render(<FeaturesSection />);

    const titles = [
      "phases.title",
      "coordinates.title",
      "intelligence.title",
      "routes.title",
    ];

    for (const title of titles) {
      expect(screen.getByText(`landing.features.${title}`)).toBeInTheDocument();
    }
  });

  it("renders descriptions for all 4 features", () => {
    render(<FeaturesSection />);

    const descriptions = [
      "phases.description",
      "coordinates.description",
      "intelligence.description",
      "routes.description",
    ];

    for (const desc of descriptions) {
      expect(
        screen.getByText(`landing.features.${desc}`)
      ).toBeInTheDocument();
    }
  });

  it("renders feature titles as h3 headings", () => {
    render(<FeaturesSection />);

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(4);
  });

  it("renders SVG icons for each feature", () => {
    render(<FeaturesSection />);

    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(4);
  });

  it("renders feature cards in a grid layout", () => {
    render(<FeaturesSection />);

    const section = document.querySelector("section");
    const grid = section?.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid?.className).toContain("grid-cols-1");
    expect(grid?.className).toContain("sm:grid-cols-2");
  });
});
