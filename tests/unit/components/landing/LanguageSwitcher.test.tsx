/**
 * Behavior tests for LanguageSwitcher component.
 *
 * Tests cover: rendering both locale options, highlighting current locale,
 * linking to the correct locale paths, preserving dynamic route segments
 * (T-S25-013), and stripping locale prefixes from raw pathnames.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockUseLocale, mockUsePathname, mockUseSearchParams } = vi.hoisted(() => ({
  mockUseLocale: vi.fn(() => "en"),
  mockUsePathname: vi.fn(() => "/"),
  mockUseSearchParams: vi.fn(() => ({ toString: () => "" })),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useLocale: mockUseLocale,
  useTranslations: () => (key: string) => key,
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
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}));

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["pt-BR", "en"],
    defaultLocale: "pt-BR",
    localePrefix: "as-needed",
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocale.mockReturnValue("en");
    mockUsePathname.mockReturnValue("/");
    mockUseSearchParams.mockReturnValue({ toString: () => "" });
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

  it("links EN to current path with en locale (no prefix)", () => {
    mockUsePathname.mockReturnValue("/some/page");
    render(<LanguageSwitcher />);

    const enLink = screen.getByText("EN").closest("a");
    expect(enLink).toHaveAttribute("href", "/some/page");
    expect(enLink).toHaveAttribute("data-locale", "en");
  });

  it("links PT to current path with pt-BR locale (no prefix)", () => {
    mockUsePathname.mockReturnValue("/some/page");
    render(<LanguageSwitcher />);

    const ptLink = screen.getByText("PT").closest("a");
    expect(ptLink).toHaveAttribute("href", "/some/page");
    expect(ptLink).toHaveAttribute("data-locale", "pt-BR");
  });

  // ─── T-S25-013: Dynamic route preservation ──────────────────────────────

  it("preserves full dynamic path segments on expedition phase pages", () => {
    mockUsePathname.mockReturnValue("/en/expedition/abc123/phase-3");
    mockUseLocale.mockReturnValue("en");
    render(<LanguageSwitcher />);

    const ptLink = screen.getByText("PT").closest("a");
    expect(ptLink).toHaveAttribute("href", "/expedition/abc123/phase-3");
    expect(ptLink).toHaveAttribute("data-locale", "pt-BR");
  });

  it("strips en locale prefix from pathname", () => {
    mockUsePathname.mockReturnValue("/en/dashboard");
    mockUseLocale.mockReturnValue("en");
    render(<LanguageSwitcher />);

    const ptLink = screen.getByText("PT").closest("a");
    expect(ptLink).toHaveAttribute("href", "/dashboard");
  });

  it("strips pt-BR locale prefix from pathname", () => {
    mockUsePathname.mockReturnValue("/pt-BR/dashboard");
    mockUseLocale.mockReturnValue("pt-BR");
    render(<LanguageSwitcher />);

    const enLink = screen.getByText("EN").closest("a");
    expect(enLink).toHaveAttribute("href", "/dashboard");
  });

  it("handles pathname without locale prefix (default locale)", () => {
    mockUsePathname.mockReturnValue("/expedition/abc123/phase-3");
    mockUseLocale.mockReturnValue("pt-BR");
    render(<LanguageSwitcher />);

    const enLink = screen.getByText("EN").closest("a");
    expect(enLink).toHaveAttribute("href", "/expedition/abc123/phase-3");
    expect(enLink).toHaveAttribute("data-locale", "en");
  });

  it("handles exact locale prefix path (e.g. /en)", () => {
    mockUsePathname.mockReturnValue("/en");
    mockUseLocale.mockReturnValue("en");
    render(<LanguageSwitcher />);

    const ptLink = screen.getByText("PT").closest("a");
    expect(ptLink).toHaveAttribute("href", "/");
  });

  it("preserves search params when switching locale", () => {
    mockUsePathname.mockReturnValue("/en/expedition/abc123/phase-3");
    mockUseSearchParams.mockReturnValue({ toString: () => "tab=transport" });
    mockUseLocale.mockReturnValue("en");
    render(<LanguageSwitcher />);

    const ptLink = screen.getByText("PT").closest("a");
    expect(ptLink).toHaveAttribute(
      "href",
      "/expedition/abc123/phase-3?tab=transport"
    );
  });
});
