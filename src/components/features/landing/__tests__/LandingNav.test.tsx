import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingNav } from "../LandingNav";

// SPEC-LANDING-HEADER-001: anonymous landing header must NOT render
// dead "explore", "myTrips", "planner" menus.

vi.mock("next-intl", () => ({
  useTranslations: (_ns: string) => (key: string) => {
    const table: Record<string, string> = {
      logo: "Atlas",
      login: "Entrar",
      getStarted: "Criar conta",
      openMenu: "Open",
      closeMenu: "Close",
    };
    return table[key] ?? key;
  },
  useLocale: () => "pt-BR",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/layout/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher-mock" />,
}));

describe("LandingNav — SPEC-LANDING-HEADER-001", () => {
  it("does NOT render explore/myTrips/planner menu items", () => {
    render(<LandingNav isAuthenticated={false} />);

    // The 3 dead menus must not appear — key text should not render.
    expect(screen.queryByText("explore")).not.toBeInTheDocument();
    expect(screen.queryByText("myTrips")).not.toBeInTheDocument();
    expect(screen.queryByText("planner")).not.toBeInTheDocument();
  });

  it("renders logo, language switcher, and auth CTAs for anonymous visitors", () => {
    render(<LandingNav isAuthenticated={false} />);

    expect(screen.getByText("Atlas")).toBeInTheDocument();
    expect(screen.getByTestId("language-switcher-mock")).toBeInTheDocument();
    // Login rendered at least once (desktop + mobile variants both use the same label)
    expect(screen.getAllByText("Entrar").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Criar conta")).toBeInTheDocument();
  });

  it("has no interactive element pointing to href='#' in the nav", () => {
    const { container } = render(<LandingNav isAuthenticated={false} />);
    const deadLinks = container.querySelectorAll('a[href="#"]');
    expect(deadLinks.length).toBe(0);
  });
});
