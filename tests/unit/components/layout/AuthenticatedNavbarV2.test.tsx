/**
 * Tests for AuthenticatedNavbarV2 component.
 *
 * Covers: Atlas tokens, PA badge, user menu, nav links,
 * mobile menu, sticky header, accessibility attributes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockUsePathname, mockSignOut } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(() => "/dashboard"),
  mockSignOut: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string, params?: Record<string, unknown>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    if (params) {
      let result = fullKey;
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
      return result;
    }
    return fullKey;
  },
  useLocale: () => "en",
}));

vi.mock("next-auth/react", () => ({
  signOut: mockSignOut,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    className,
    onClick,
    locale,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    onClick?: () => void;
    locale?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} onClick={onClick} data-locale={locale} {...rest}>
      {children}
    </a>
  ),
  usePathname: mockUsePathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { AuthenticatedNavbarV2 } from "@/components/layout/AuthenticatedNavbarV2";

// ─── Tests ────────────────────────────────────────────────────────────────────

const defaultProps = {
  userName: "John Doe",
  userImage: null,
  userEmail: "john@example.com",
};

const propsWithGamification = {
  ...defaultProps,
  gamification: {
    totalPoints: 720,
    availablePoints: 520,
    currentLevel: 3,
    phaseName: "Explorador",
    rank: "navegador" as const,
  },
};

describe("AuthenticatedNavbarV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
  });

  it("renders with data-testid navbar-v2", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    expect(screen.getByTestId("navbar-v2")).toBeInTheDocument();
  });

  it("renders Atlas logo text", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    expect(screen.getByText("Atlas")).toBeInTheDocument();
  });

  it("renders Expeditions link", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    const links = screen.getAllByText("navigation.expeditions");
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].closest("a")).toHaveAttribute("href", "/expeditions");
  });

  it("renders My Atlas link", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    const links = screen.getAllByText("navigation.myAtlas");
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].closest("a")).toHaveAttribute("href", "/atlas");
  });

  it("renders PA badge when gamification data is present", () => {
    render(<AuthenticatedNavbarV2 {...propsWithGamification} />);

    // AtlasBadge PA variant renders the points
    expect(screen.getAllByText("520 PA").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render PA badge when gamification is absent", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    expect(screen.queryByText(/PA$/)).not.toBeInTheDocument();
  });

  it("has sticky header with atlas background tokens", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    const header = screen.getByTestId("navbar-v2");
    expect(header).toHaveClass("sticky");
    expect(header).toHaveClass("top-0");
    expect(header).toHaveClass("h-16");
  });

  it("has backdrop blur", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    const header = screen.getByTestId("navbar-v2");
    expect(header).toHaveClass("backdrop-blur");
  });

  it("renders role=banner and nav with aria-label", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "navV2.mainNavigation" })
    ).toBeInTheDocument();
  });

  it("renders mobile menu toggle", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    const button = screen.getByRole("button", { name: "navigation.toggleMenu" });
    expect(button).toBeInTheDocument();
  });

  it("toggles mobile menu on click", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    const button = screen.getByRole("button", { name: "navigation.toggleMenu" });
    fireEvent.click(button);

    // Mobile menu should show sign out from UserMenu inline
    expect(screen.getByText("auth.signOut")).toBeInTheDocument();
  });

  it("closes mobile menu on Escape", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    const button = screen.getByRole("button", { name: "navigation.toggleMenu" });
    fireEvent.click(button);
    expect(screen.getByText("auth.signOut")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("auth.signOut")).not.toBeInTheDocument();
  });

  it("highlights active nav link with font-bold", () => {
    mockUsePathname.mockReturnValue("/expeditions");
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    const links = screen.getAllByText("navigation.expeditions");
    expect(links[0].className).toContain("font-bold");
  });

  it("uses atlas token border color on header", () => {
    render(<AuthenticatedNavbarV2 {...defaultProps} />);

    const header = screen.getByTestId("navbar-v2");
    expect(header.className).toContain("border-atlas-outline-variant");
  });
});
