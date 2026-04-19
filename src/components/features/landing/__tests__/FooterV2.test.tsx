import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FooterV2 } from "../FooterV2";

// SPEC-LANDING-COPY-001: footer must not expose phantom /como-funciona routes
// and must render the "coming soon" label via i18n (no hardcoded PT).

vi.mock("next-intl", () => ({
  useTranslations: (_ns: string) => (key: string) => {
    const table: Record<string, string> = {
      tagline: "Atlas — planning.",
      explore: "Explore",
      destinationGuides: "Destination Guides",
      travelInsurance: "Travel Insurance",
      blog: "Editorial Blog",
      company: "Company",
      about: "About Us",
      contact: "Contact",
      privacy: "Privacy Policy",
      terms: "Terms of Use",
      newsletter: "News",
      newsletterDescription: "Subscribe.",
      emailPlaceholder: "email@",
      emailLabel: "email label",
      send: "Send",
      copyright: "Atlas",
      lgpd: "LGPD.",
      newsletterSuccess: "ok",
      comingSoon: "Coming soon",
    };
    return table[key] ?? key;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("FooterV2 — SPEC-LANDING-COPY-001", () => {
  it("does NOT render dead /como-funciona links in the Explore column", () => {
    const { container } = render(<FooterV2 />);

    const deadLinks = container.querySelectorAll('a[href="/como-funciona"]');
    expect(deadLinks.length).toBe(0);
  });

  it("renders Destination Guides / Travel Insurance / Blog as non-interactive labels with coming-soon pill", () => {
    render(<FooterV2 />);

    // Labels still present (text preserved)
    expect(screen.getByText("Destination Guides")).toBeInTheDocument();
    expect(screen.getByText("Travel Insurance")).toBeInTheDocument();
    expect(screen.getByText("Editorial Blog")).toBeInTheDocument();

    // Each carries a localized "Coming soon" pill (one per row)
    // plus the 2 pre-existing ones next to About/Contact → 5 total.
    const pills = screen.getAllByText("Coming soon");
    expect(pills.length).toBe(5);
  });

  it("uses the i18n comingSoon key — no hardcoded 'Em breve' in the rendered DOM", () => {
    const { container } = render(<FooterV2 />);
    expect(container.textContent).not.toContain("Em breve");
  });
});
