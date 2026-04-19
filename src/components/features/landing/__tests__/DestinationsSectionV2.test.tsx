import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DestinationsSectionV2 } from "../DestinationsSectionV2";

// SPEC-LANDING-COPY-001: the destinations section must not promise
// interactivity that does not exist. No "View All" link, no cursor-pointer
// on cards, no orphan arrow button on the panoramic card.

vi.mock("next-intl", () => ({
  useTranslations: (_ns: string) => (key: string) => {
    const table: Record<string, string> = {
      title: "Featured Destinations",
      "rio.name": "Rio de Janeiro",
      "rio.category": "Culture & Beach",
      "rio.description": "Marvelous.",
      "rio.imageAlt": "Rio photo",
      "bonito.name": "Bonito",
      "bonito.category": "Ecotourism",
      "bonito.description": "Crystal.",
      "bonito.imageAlt": "Bonito photo",
      "pantanal.name": "Pantanal",
      "pantanal.category": "Wildlife",
      "pantanal.description": "Wild.",
      "pantanal.imageAlt": "Pantanal photo",
    };
    return table[key] ?? key;
  },
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    ...rest
  }: {
    alt: string;
    src: string;
    [key: string]: unknown;
  }) => <img alt={alt} src={src} {...rest} />,
}));

describe("DestinationsSectionV2 — SPEC-LANDING-COPY-001", () => {
  it("does NOT render a 'View All Destinations' link", () => {
    render(<DestinationsSectionV2 />);
    expect(screen.queryByText("View All Destinations")).not.toBeInTheDocument();
    expect(screen.queryByText("viewAll")).not.toBeInTheDocument();
  });

  it("has no dead href='#' anchors anywhere in the section", () => {
    const { container } = render(<DestinationsSectionV2 />);
    const deadLinks = container.querySelectorAll('a[href="#"]');
    expect(deadLinks.length).toBe(0);
  });

  it("does NOT apply cursor-pointer hover on destination cards (no navigation exists)", () => {
    const { container } = render(<DestinationsSectionV2 />);
    const cursorPointers = container.querySelectorAll(".cursor-pointer");
    expect(cursorPointers.length).toBe(0);
  });

  it("does NOT render the orphan arrow button on the Pantanal card", () => {
    render(<DestinationsSectionV2 />);
    // The old implementation rendered a <button> with aria-label containing "viewAll"
    // and an ArrowUpRight icon. Buttons with role "button" inside the destinations
    // section should be zero.
    const buttons = screen.queryAllByRole("button");
    expect(buttons.length).toBe(0);
  });

  it("still renders the three destination cards", () => {
    render(<DestinationsSectionV2 />);
    expect(screen.getByText("Rio de Janeiro")).toBeInTheDocument();
    expect(screen.getByText("Bonito")).toBeInTheDocument();
    expect(screen.getByText("Pantanal")).toBeInTheDocument();
  });
});
