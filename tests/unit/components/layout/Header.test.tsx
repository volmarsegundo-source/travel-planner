/**
 * Behavior tests for Header component.
 *
 * Tests cover: rendering of logo, login/sign-up links, language switcher,
 * mobile menu toggle, and navigation link targets.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(() => "/"),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => "en",
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

import { Header } from "@/components/layout/Header";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/");
  });

  it("renders the app logo/name", () => {
    render(<Header />);

    expect(screen.getByText("common.appName")).toBeInTheDocument();
  });

  it("renders the compass emoji as decorative", () => {
    render(<Header />);

    const emoji = screen.getByText("🧭");
    expect(emoji).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a Login link pointing to /auth/login", () => {
    render(<Header />);

    const loginLinks = screen.getAllByText("auth.signIn");
    // At least the desktop version should point to /auth/login
    const desktopLink = loginLinks[0];
    expect(desktopLink.closest("a")).toHaveAttribute("href", "/auth/login");
  });

  it("renders a Sign Up link pointing to /auth/register", () => {
    render(<Header />);

    const signUpLinks = screen.getAllByText("auth.signUp");
    const desktopLink = signUpLinks[0];
    expect(desktopLink.closest("a")).toHaveAttribute("href", "/auth/register");
  });

  it("renders the language switcher with EN and PT options", () => {
    render(<Header />);

    expect(screen.getAllByText("EN").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("PT").length).toBeGreaterThanOrEqual(1);
  });

  it("renders a mobile menu toggle button", () => {
    render(<Header />);

    const button = screen.getByRole("button", { name: /toggle menu/i });
    expect(button).toBeInTheDocument();
  });

  it("toggles mobile menu when hamburger is clicked", () => {
    render(<Header />);

    const button = screen.getByRole("button", { name: /toggle menu/i });

    // Mobile menu should not be visible initially (only desktop links)
    const initialSignUpLinks = screen.getAllByText("auth.signUp");
    expect(initialSignUpLinks.length).toBe(1); // only desktop

    // Click to open mobile menu
    fireEvent.click(button);

    // Now there should be desktop + mobile links
    const afterOpenLinks = screen.getAllByText("auth.signUp");
    expect(afterOpenLinks.length).toBe(2);
  });

  it("closes mobile menu when a navigation link is clicked", () => {
    render(<Header />);

    const button = screen.getByRole("button", { name: /toggle menu/i });
    fireEvent.click(button);

    // Click the mobile login link (second one)
    const mobileLoginLinks = screen.getAllByText("auth.signIn");
    fireEvent.click(mobileLoginLinks[1]);

    // Mobile menu should be closed
    const afterClickLinks = screen.getAllByText("auth.signIn");
    expect(afterClickLinks.length).toBe(1);
  });

  it("has a sticky header with backdrop blur", () => {
    render(<Header />);

    const header = document.querySelector("header");
    expect(header).toHaveClass("sticky");
    expect(header).toHaveClass("top-0");
  });

  it("logo links to the home page", () => {
    render(<Header />);

    const logoLink = screen.getByText("common.appName").closest("a");
    expect(logoLink).toHaveAttribute("href", "/");
  });
});
