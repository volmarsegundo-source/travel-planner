/**
 * Behavior tests for Breadcrumb component.
 *
 * Tests cover: rendering trail, active page, links, truncation,
 * mobile back link, and accessibility.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    className,
    title,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    title?: string;
  }) => (
    <a href={href} className={className} title={title}>
      {children}
    </a>
  ),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { Breadcrumb } from "@/components/layout/Breadcrumb";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Breadcrumb", () => {
  const items = [
    { label: "My trips", href: "/trips" },
    { label: "Portugal Vacation 2026", href: "/trips/abc123" },
    { label: "Itinerary" },
  ];

  it("renders all items in the breadcrumb trail (desktop + mobile)", () => {
    render(<Breadcrumb items={items} />);

    // Items appear in both desktop and mobile views
    expect(screen.getAllByText("My trips").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Portugal Vacation 2026").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Itinerary")).toBeInTheDocument();
  });

  it("renders links for non-last items", () => {
    render(<Breadcrumb items={items} />);

    const myTripsLinks = screen.getAllByText("My trips");
    expect(myTripsLinks[0].closest("a")).toHaveAttribute("href", "/trips");

    const tripLinks = screen.getAllByText("Portugal Vacation 2026");
    expect(tripLinks[0].closest("a")).toHaveAttribute("href", "/trips/abc123");
  });

  it("renders last item without link and with aria-current=page", () => {
    render(<Breadcrumb items={items} />);

    const lastItem = screen.getByText("Itinerary");
    expect(lastItem.closest("a")).toBeNull();
    expect(lastItem).toHaveAttribute("aria-current", "page");
  });

  it("renders separators with aria-hidden", () => {
    render(<Breadcrumb items={items} />);

    const separators = screen.getAllByText("/");
    expect(separators.length).toBe(2);
    separators.forEach((sep) => {
      expect(sep).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("renders nav with aria-label=Breadcrumb", () => {
    render(<Breadcrumb items={items} />);

    const navs = screen.getAllByRole("navigation", { name: "Breadcrumb" });
    expect(navs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders mobile back link pointing to penultimate item href", () => {
    render(<Breadcrumb items={items} />);

    // Both desktop and mobile render the penultimate item's text with link
    const tripLinks = screen.getAllByText("Portugal Vacation 2026");
    // All links should point to /trips/abc123
    tripLinks.forEach((link) => {
      expect(link.closest("a")).toHaveAttribute("href", "/trips/abc123");
    });
  });

  it("uses custom backLabel when provided", () => {
    render(<Breadcrumb items={items} backLabel="Back to Portugal" />);

    expect(screen.getByText("Back to Portugal")).toBeInTheDocument();
  });

  it("renders only two items correctly", () => {
    const twoItems = [
      { label: "My trips", href: "/trips" },
      { label: "Trip Detail" },
    ];

    render(<Breadcrumb items={twoItems} />);

    expect(screen.getAllByText("My trips").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Trip Detail")).toBeInTheDocument();
  });

  it("renders with font-medium on current page", () => {
    render(<Breadcrumb items={items} />);

    const currentPage = screen.getByText("Itinerary");
    expect(currentPage.className).toContain("font-medium");
  });
});
