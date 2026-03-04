/**
 * Tests for the locale-aware 404 page.
 *
 * Verifies Header/Footer presence, i18n text rendering, and navigation link.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
  Link: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
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

import NotFound from "@/app/[locale]/not-found";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Locale NotFound page", () => {
  it("renders the 404 heading", () => {
    render(<NotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders translated title and description", () => {
    render(<NotFound />);

    expect(screen.getByText("notFoundPage.title")).toBeInTheDocument();
    expect(screen.getByText("notFoundPage.description")).toBeInTheDocument();
  });

  it("renders a link back to home with translated text", () => {
    render(<NotFound />);

    const homeLink = screen.getByRole("link", { name: "notFoundPage.backHome" });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("renders Header component (app name visible)", () => {
    render(<NotFound />);

    expect(screen.getByText("common.appName")).toBeInTheDocument();
  });

  it("renders Footer component (copyright visible)", () => {
    render(<NotFound />);

    expect(screen.getByText("landing.footer.copyright")).toBeInTheDocument();
  });
});
