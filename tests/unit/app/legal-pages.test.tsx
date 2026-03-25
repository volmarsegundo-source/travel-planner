/**
 * Unit tests for legal pages.
 *
 * - /terms and /privacy are redirect stubs (redirect to /termos and /privacidade)
 * - /support renders with LandingNav + Footer + FAQ content
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  usePathname: () => "/support",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["pt-BR", "en"], defaultLocale: "pt-BR" },
}));

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

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import TermsRedirect from "@/app/[locale]/terms/page";
import PrivacyRedirect from "@/app/[locale]/privacy/page";
import SupportPage from "@/app/[locale]/support/page";

// ─── Terms Redirect ──────────────────────────────────────────────────────────

describe("TermsPage (redirect)", () => {
  it("redirects to /termos", () => {
    TermsRedirect();

    expect(mockRedirect).toHaveBeenCalledWith("/termos");
  });
});

// ─── Privacy Redirect ────────────────────────────────────────────────────────

describe("PrivacyPage (redirect)", () => {
  it("redirects to /privacidade", () => {
    PrivacyRedirect();

    expect(mockRedirect).toHaveBeenCalledWith("/privacidade");
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

  it("renders LandingNav and Footer", async () => {
    const Component = await SupportPage();
    render(Component);

    // LandingNav renders within a <header> element
    expect(screen.getByRole("banner")).toBeInTheDocument();
    // Footer renders a contentinfo landmark
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
