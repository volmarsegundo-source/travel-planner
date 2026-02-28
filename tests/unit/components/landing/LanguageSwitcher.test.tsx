/**
 * Behavior tests for LanguageSwitcher component.
 *
 * Tests cover: rendering both locale options, highlighting current locale,
 * and linking to the correct locale paths.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockUseLocale, mockUsePathname } = vi.hoisted(() => ({
  mockUseLocale: vi.fn(() => "en"),
  mockUsePathname: vi.fn(() => "/"),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useLocale: mockUseLocale,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    className,
    locale,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    locale?: string;
  }) => (
    <a href={href} className={className} data-locale={locale}>
      {children}
    </a>
  ),
  usePathname: mockUsePathname,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { LanguageSwitcher } from "@/components/landing/LanguageSwitcher";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocale.mockReturnValue("en");
    mockUsePathname.mockReturnValue("/");
  });

  it("renders EN and PT options", () => {
    render(<LanguageSwitcher />);

    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("PT")).toBeInTheDocument();
  });

  it("renders a separator between locale options", () => {
    render(<LanguageSwitcher />);

    expect(screen.getByText("|")).toBeInTheDocument();
  });

  it("highlights EN when locale is en", () => {
    mockUseLocale.mockReturnValue("en");
    render(<LanguageSwitcher />);

    const enLink = screen.getByText("EN");
    expect(enLink.className).toContain("font-semibold");
  });

  it("highlights PT when locale is pt-BR", () => {
    mockUseLocale.mockReturnValue("pt-BR");
    render(<LanguageSwitcher />);

    const ptLink = screen.getByText("PT");
    expect(ptLink.className).toContain("font-semibold");
  });

  it("links EN to current path with en locale", () => {
    mockUsePathname.mockReturnValue("/some/page");
    render(<LanguageSwitcher />);

    const enLink = screen.getByText("EN").closest("a");
    expect(enLink).toHaveAttribute("href", "/some/page");
    expect(enLink).toHaveAttribute("data-locale", "en");
  });

  it("links PT to current path with pt-BR locale", () => {
    mockUsePathname.mockReturnValue("/some/page");
    render(<LanguageSwitcher />);

    const ptLink = screen.getByText("PT").closest("a");
    expect(ptLink).toHaveAttribute("href", "/some/page");
    expect(ptLink).toHaveAttribute("data-locale", "pt-BR");
  });
});
