import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SupportPage from "../page";

// Mock next-intl/server
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue(
    (key: string) => `legal.support.${key}`
  ),
}));

// Mock LandingNav
vi.mock("@/components/features/landing/LandingNav", () => ({
  LandingNav: () => <nav data-testid="landing-nav" />,
}));

// Mock Footer
vi.mock("@/components/layout/Footer", () => ({
  Footer: () => <footer data-testid="footer" />,
}));

// Mock Breadcrumb
vi.mock("@/components/layout/Breadcrumb", () => ({
  Breadcrumb: ({ items }: { items: { label: string }[] }) => (
    <nav data-testid="breadcrumb" aria-label="breadcrumb">
      {items.map((item, i) => (
        <span key={i}>{item.label}</span>
      ))}
    </nav>
  ),
}));

describe("SupportPage", () => {
  it("renders page title", async () => {
    const Page = await SupportPage();
    render(Page);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("legal.support.title");
  });

  it("renders intro text", async () => {
    const Page = await SupportPage();
    render(Page);

    expect(screen.getByText("legal.support.intro")).toBeInTheDocument();
  });

  it("renders FAQ section with 6 questions", async () => {
    const Page = await SupportPage();
    render(Page);

    const faqHeading = screen.getByText("legal.support.faq.title");
    expect(faqHeading).toBeInTheDocument();

    for (let i = 1; i <= 6; i++) {
      expect(
        screen.getByText(`legal.support.faq.items.q${i}.question`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(`legal.support.faq.items.q${i}.answer`)
      ).toBeInTheDocument();
    }
  });

  it("renders contact section with email link", async () => {
    const Page = await SupportPage();
    render(Page);

    const contactHeading = screen.getByText("legal.support.contact.title");
    expect(contactHeading).toBeInTheDocument();

    const emailLink = screen.getByRole("link", {
      name: "legal.support.contact.email",
    });
    expect(emailLink).toHaveAttribute(
      "href",
      "mailto:legal.support.contact.email"
    );
  });

  it("renders breadcrumb", async () => {
    const Page = await SupportPage();
    render(Page);

    expect(screen.getByTestId("breadcrumb")).toBeInTheDocument();
  });

  it("uses details/summary for FAQ accordion", async () => {
    const Page = await SupportPage();
    const { container } = render(Page);

    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(6);

    const summaries = container.querySelectorAll("summary");
    expect(summaries).toHaveLength(6);
  });

  it("has proper heading hierarchy", async () => {
    const Page = await SupportPage();
    render(Page);

    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);

    const h2 = screen.getAllByRole("heading", { level: 2 });
    expect(h2).toHaveLength(2); // FAQ title + Contact title
  });

  it("includes focus-visible ring on email link", async () => {
    const Page = await SupportPage();
    const { container } = render(Page);

    const emailLink = container.querySelector("a[href^='mailto:']");
    expect(emailLink).not.toBeNull();
    expect(emailLink?.className).toContain("focus-visible:ring-2");
    expect(emailLink?.className).toContain("focus-visible:ring-atlas-focus-ring");
  });

  it("includes motion-reduce classes on accordion indicators", async () => {
    const Page = await SupportPage();
    const { container } = render(Page);

    const details = container.querySelectorAll("details");
    details.forEach((detail) => {
      expect(detail.className).toContain("motion-reduce:");
    });
  });
});
