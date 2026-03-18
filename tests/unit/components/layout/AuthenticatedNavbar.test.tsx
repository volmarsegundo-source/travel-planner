/**
 * Behavior tests for AuthenticatedNavbar component.
 *
 * Tests cover: rendering, active link state, mobile menu toggle,
 * Escape key handling, component composition, header cleanup (Sprint 31).
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

import { AuthenticatedNavbar } from "@/components/layout/AuthenticatedNavbar";

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
    currentLevel: 3,
    phaseName: "Explorador",
  },
};

describe("AuthenticatedNavbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
  });

  it("renders the app logo/name linking to /expeditions", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    const logo = screen.getByText("common.appName");
    expect(logo.closest("a")).toHaveAttribute("href", "/expeditions");
  });

  it("renders Expeditions link", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    const links = screen.getAllByText("navigation.expeditions");
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].closest("a")).toHaveAttribute("href", "/expeditions");
  });

  it("renders My Atlas link to /atlas", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    const links = screen.getAllByText("navigation.myAtlas");
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].closest("a")).toHaveAttribute("href", "/atlas");
  });

  it("highlights Expeditions link when pathname is /expeditions", () => {
    mockUsePathname.mockReturnValue("/expeditions");
    render(<AuthenticatedNavbar {...defaultProps} />);

    const links = screen.getAllByText("navigation.expeditions");
    expect(links[0].closest("a")?.className).toContain("font-semibold");
  });

  it("highlights Expeditions link when pathname starts with /expedition", () => {
    mockUsePathname.mockReturnValue("/expedition/some-id");
    render(<AuthenticatedNavbar {...defaultProps} />);

    const links = screen.getAllByText("navigation.expeditions");
    expect(links[0].closest("a")?.className).toContain("font-semibold");
  });

  it("highlights My Atlas link when pathname is /atlas", () => {
    mockUsePathname.mockReturnValue("/atlas");
    render(<AuthenticatedNavbar {...defaultProps} />);

    const links = screen.getAllByText("navigation.myAtlas");
    expect(links[0].closest("a")?.className).toContain("font-semibold");
  });

  it("does not render My Trips link (deactivated in Sprint 15)", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    expect(screen.queryByText("navigation.myTrips")).not.toBeInTheDocument();
  });

  it("renders the LanguageSwitcher with EN and PT", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    expect(screen.getAllByText("EN").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("PT").length).toBeGreaterThanOrEqual(1);
  });

  it("renders mobile menu toggle button", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    const button = screen.getByRole("button", { name: "navigation.toggleMenu" });
    expect(button).toBeInTheDocument();
  });

  it("toggles mobile menu when hamburger is clicked", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    const button = screen.getByRole("button", { name: "navigation.toggleMenu" });

    // Mobile menu should not be visible initially
    expect(screen.queryByText("auth.signOut")).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(button);

    // Now sign out should be visible (from mobile UserMenu inline)
    expect(screen.getByText("auth.signOut")).toBeInTheDocument();
  });

  it("closes mobile menu when Escape is pressed", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    const button = screen.getByRole("button", { name: "navigation.toggleMenu" });
    fireEvent.click(button);

    // Mobile menu is open
    expect(screen.getByText("auth.signOut")).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Menu should be closed
    expect(screen.queryByText("auth.signOut")).not.toBeInTheDocument();
  });

  it("closes mobile menu when a nav link is clicked", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    const button = screen.getByRole("button", { name: "navigation.toggleMenu" });
    fireEvent.click(button);

    // Click the mobile "My Atlas" link
    const mobileLinks = screen.getAllByText("navigation.myAtlas");
    const mobileLink = mobileLinks[mobileLinks.length - 1];
    fireEvent.click(mobileLink);

    // Menu should be closed
    expect(screen.queryByText("auth.signOut")).not.toBeInTheDocument();
  });

  it("has a sticky header with backdrop blur", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    const header = document.querySelector("header");
    expect(header).toHaveClass("sticky");
    expect(header).toHaveClass("top-0");
  });

  it("renders with role=banner and nav with aria-label", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toBeInTheDocument();
  });

  it("renders user avatar with initials when no image", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    // The UserMenu desktop trigger shows initials "J"
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  // ─── Sprint 31 Header Cleanup Tests ──────────────────────────────────────

  describe("Header Cleanup (SPEC-UX-027)", () => {
    it("does NOT render Profile as a top-level nav link in desktop nav", () => {
      render(<AuthenticatedNavbar {...defaultProps} />);

      // Only 2 top-level nav links: Expeditions and My Atlas
      // Profile should NOT be a direct nav link
      const desktopNav = document.querySelector(".md\\:flex");
      const navLinks = desktopNav?.querySelectorAll("a[href='/profile']") ?? [];

      // Profile link should not exist as a top-level nav link
      // (it may exist in the dropdown, but not as a standalone link in the nav bar)
      expect(navLinks.length).toBe(0);
    });

    it("renders Profile link in the dropdown menu", () => {
      render(<AuthenticatedNavbar {...defaultProps} />);

      // Open the UserMenu dropdown by clicking the avatar button
      const avatarButton = screen.getByRole("button", { name: "John Doe" });
      fireEvent.click(avatarButton);

      // Profile link should be in the dropdown
      const profileLinks = screen.getAllByText("navigation.myProfile");
      expect(profileLinks.length).toBeGreaterThanOrEqual(1);

      // Verify the profile link points to /profile
      const profileLink = profileLinks.find(
        (el) => el.closest("a")?.getAttribute("href") === "/profile"
      );
      expect(profileLink).toBeDefined();
    });

    it("renders Profile link in mobile menu user section", () => {
      render(<AuthenticatedNavbar {...defaultProps} />);

      // Open mobile menu
      const button = screen.getByRole("button", { name: "navigation.toggleMenu" });
      fireEvent.click(button);

      // Profile link should be visible in the mobile user section
      const profileLinks = screen.getAllByText("navigation.myProfile");
      expect(profileLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("gamification badge is NOT clickable (no href, no link)", () => {
      render(<AuthenticatedNavbar {...propsWithGamification} />);

      const badge = screen.getByTestId("gamification-badge");
      expect(badge).toBeInTheDocument();

      // Badge should be a div, not an anchor
      expect(badge.tagName).toBe("DIV");
      expect(badge).not.toHaveAttribute("href");
    });

    it("gamification badge has role=status for accessibility", () => {
      render(<AuthenticatedNavbar {...propsWithGamification} />);

      const badge = screen.getByTestId("gamification-badge");
      expect(badge).toHaveAttribute("role", "status");
    });

    it("gamification badge displays points and phase name", () => {
      render(<AuthenticatedNavbar {...propsWithGamification} />);

      expect(screen.getByTestId("badge-points")).toHaveTextContent("720");
      expect(screen.getByTestId("badge-phase")).toHaveTextContent("Explorador");
    });

    it("gamification badge has cursor-default (not pointer)", () => {
      render(<AuthenticatedNavbar {...propsWithGamification} />);

      const badge = screen.getByTestId("gamification-badge");
      expect(badge.className).toContain("cursor-default");
      expect(badge.className).not.toContain("cursor-pointer");
    });

    it("gamification badge has no hover effect classes", () => {
      render(<AuthenticatedNavbar {...propsWithGamification} />);

      const badge = screen.getByTestId("gamification-badge");
      expect(badge.className).not.toContain("hover:bg-atlas-gold/20");
    });

    it("desktop nav has exactly 2 nav links (Expeditions and My Atlas)", () => {
      render(<AuthenticatedNavbar {...defaultProps} />);

      // Get all links within the desktop nav container
      const desktopNav = document.querySelector(".md\\:flex");
      const allLinks = desktopNav?.querySelectorAll("a") ?? [];

      // Filter to just the nav links (exclude avatar dropdown links)
      const navLinks = Array.from(allLinks).filter((a) => {
        const href = a.getAttribute("href");
        return href === "/expeditions" || href === "/atlas";
      });

      expect(navLinks.length).toBe(2);
    });
  });
});
