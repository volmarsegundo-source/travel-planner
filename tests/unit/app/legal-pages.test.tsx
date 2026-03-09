/**
 * Unit tests for legal pages (terms, privacy, support).
 *
 * Verifies that each page renders with proper structure,
 * i18n keys, and accessibility landmarks.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockImplementation((namespace?: string) =>
    Promise.resolve((key: string) => namespace ? `${namespace}.${key}` : key),
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
  usePathname: () => "/",
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import TermsPage from "@/app/[locale]/terms/page";
import PrivacyPage from "@/app/[locale]/privacy/page";
import SupportPage from "@/app/[locale]/support/page";

// ─── Terms Page ───────────────────────────────────────────────────────────────

describe("TermsPage", () => {
  it("renders the page title", async () => {
    const Component = await TermsPage();
    render(Component);

    expect(screen.getByText("legal.terms.title")).toBeInTheDocument();
  });

  it("renders the last updated date", async () => {
    const Component = await TermsPage();
    render(Component);

    expect(screen.getByText("legal.terms.lastUpdated")).toBeInTheDocument();
  });

  it("renders the intro text", async () => {
    const Component = await TermsPage();
    render(Component);

    expect(screen.getByText("legal.terms.intro")).toBeInTheDocument();
  });

  it("renders all 7 sections", async () => {
    const Component = await TermsPage();
    render(Component);

    const sectionKeys = ["acceptance", "service", "accounts", "ai", "privacy", "liability", "changes"];
    for (const key of sectionKeys) {
      expect(screen.getByText(`legal.terms.sections.${key}.title`)).toBeInTheDocument();
      expect(screen.getByText(`legal.terms.sections.${key}.content`)).toBeInTheDocument();
    }
  });

  it("renders Header and Footer", async () => {
    const Component = await TermsPage();
    render(Component);

    // Header renders within a <header> element
    expect(screen.getByRole("banner")).toBeInTheDocument();
    // Footer renders a contentinfo landmark
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders breadcrumb navigation", async () => {
    const Component = await TermsPage();
    render(Component);

    const breadcrumbs = screen.getAllByRole("navigation", { name: /breadcrumb/i });
    expect(breadcrumbs.length).toBeGreaterThan(0);
  });
});

// ─── Privacy Page ─────────────────────────────────────────────────────────────

describe("PrivacyPage", () => {
  it("renders the page title", async () => {
    const Component = await PrivacyPage();
    render(Component);

    expect(screen.getByText("legal.privacy.title")).toBeInTheDocument();
  });

  it("renders all 7 sections", async () => {
    const Component = await PrivacyPage();
    render(Component);

    const sectionKeys = ["collection", "usage", "ai", "storage", "rights", "cookies", "contact"];
    for (const key of sectionKeys) {
      expect(screen.getByText(`legal.privacy.sections.${key}.title`)).toBeInTheDocument();
      expect(screen.getByText(`legal.privacy.sections.${key}.content`)).toBeInTheDocument();
    }
  });

  it("renders Header and Footer", async () => {
    const Component = await PrivacyPage();
    render(Component);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});

// ─── Support Page ─────────────────────────────────────────────────────────────

describe("SupportPage", () => {
  it("renders the page title", async () => {
    const Component = await SupportPage();
    render(Component);

    expect(screen.getByText("legal.support.title")).toBeInTheDocument();
  });

  it("renders the FAQ section title", async () => {
    const Component = await SupportPage();
    render(Component);

    expect(screen.getByText("legal.support.faq.title")).toBeInTheDocument();
  });

  it("renders all 4 FAQ items", async () => {
    const Component = await SupportPage();
    render(Component);

    const faqKeys = ["q1", "q2", "q3", "q4"];
    for (const key of faqKeys) {
      expect(screen.getByText(`legal.support.faq.items.${key}.question`)).toBeInTheDocument();
      expect(screen.getByText(`legal.support.faq.items.${key}.answer`)).toBeInTheDocument();
    }
  });

  it("renders the contact section", async () => {
    const Component = await SupportPage();
    render(Component);

    expect(screen.getByText("legal.support.contact.title")).toBeInTheDocument();
    expect(screen.getByText("legal.support.contact.description")).toBeInTheDocument();
  });

  it("renders contact email as a mailto link", async () => {
    const Component = await SupportPage();
    render(Component);

    const emailLink = screen.getByRole("link", { name: "legal.support.contact.email" });
    expect(emailLink).toHaveAttribute("href", "mailto:legal.support.contact.email");
  });

  it("renders Header and Footer", async () => {
    const Component = await SupportPage();
    render(Component);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
