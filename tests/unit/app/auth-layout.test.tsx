/**
 * Unit tests for the auth layout (Header + Footer presence).
 *
 * Verifies that the auth layout wraps children in a flex column
 * with Header and Footer components.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => `common.${key}`),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => "en",
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
  usePathname: () => "/",
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import AuthLayout from "@/app/[locale]/auth/layout";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AuthLayout", () => {
  it("renders Header with navigation", async () => {
    const Component = await AuthLayout({ children: <div>Test</div> });
    render(Component);

    // Header renders a nav element
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders Footer with copyright text", async () => {
    const Component = await AuthLayout({ children: <div>Test</div> });
    render(Component);

    // Footer renders with the copyright key
    expect(screen.getByText("landing.footer.copyright")).toBeInTheDocument();
  });

  it("renders children content", async () => {
    const Component = await AuthLayout({
      children: <div data-testid="auth-content">Login form here</div>,
    });
    render(Component);

    expect(screen.getByTestId("auth-content")).toBeInTheDocument();
  });

  it("renders app name heading", async () => {
    const Component = await AuthLayout({ children: <div>Test</div> });
    render(Component);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
