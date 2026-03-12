/**
 * Behavior tests for AuthenticatedNavbar component.
 *
 * Tests cover: rendering, active link state, mobile menu toggle,
 * Escape key handling, and component composition.
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
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
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
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    onClick?: () => void;
    locale?: string;
  }) => (
    <a href={href} className={className} onClick={onClick} data-locale={locale}>
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

  it("renders My Profile link", () => {
    render(<AuthenticatedNavbar {...defaultProps} />);

    const links = screen.getAllByText("navigation.myProfile");
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].closest("a")).toHaveAttribute("href", "/profile");
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
});
