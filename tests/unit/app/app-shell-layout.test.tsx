/**
 * Unit tests for the AppShellLayout (authenticated layout).
 *
 * Verifies that the authenticated layout includes the Footer component,
 * uses min-h-screen for proper layout, and renders children content.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockAuth, mockRedirect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRedirect: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/i18n/navigation", () => ({
  redirect: mockRedirect,
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
  usePathname: () => "/trips",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => `common.${key}`),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => "en",
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import AppShellLayout from "@/app/[locale]/(app)/layout";

// ─── Tests ────────────────────────────────────────────────────────────────────

const mockSession = {
  user: {
    name: "Test User",
    email: "test@example.com",
    image: null,
  },
  expires: "2099-01-01",
};

describe("AppShellLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
  });

  it("renders Footer with copyright text in authenticated pages", async () => {
    const Component = await AppShellLayout({
      children: <div>Page content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(Component);

    expect(screen.getByText("landing.footer.copyright")).toBeInTheDocument();
  });

  it("renders Footer inside a footer element", async () => {
    const Component = await AppShellLayout({
      children: <div>Page content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(Component);

    const footer = document.querySelector("footer");
    expect(footer).toBeInTheDocument();
  });

  it("renders Footer with terms, privacy, and support links (authenticated variant)", async () => {
    const Component = await AppShellLayout({
      children: <div>Page content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(Component);

    expect(screen.getByRole("link", { name: "landing.footer.terms" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "landing.footer.privacy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "landing.footer.support" })).toBeInTheDocument();
  });

  it("does not render sign in or sign up links in Footer", async () => {
    const Component = await AppShellLayout({
      children: <div>Page content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(Component);

    expect(screen.queryByRole("link", { name: "auth.signIn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "auth.signUp" })).not.toBeInTheDocument();
  });

  it("wraps layout with min-h-screen and flex-col for proper footer positioning", async () => {
    const Component = await AppShellLayout({
      children: <div data-testid="content">Page content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    const { container } = render(Component);

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("min-h-screen");
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("flex-col");
  });

  it("renders children content between navbar and footer", async () => {
    const Component = await AppShellLayout({
      children: <div data-testid="page-content">My trips page</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(Component);

    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    expect(screen.getByText("My trips page")).toBeInTheDocument();
  });

  it("renders the AuthenticatedNavbar", async () => {
    const Component = await AppShellLayout({
      children: <div>Page content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(Component);

    // AuthenticatedNavbar renders a nav with aria-label
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toBeInTheDocument();
  });

  it("renders skip-to-content link", async () => {
    const Component = await AppShellLayout({
      children: <div>Page content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(Component);

    const skipLink = screen.getByText("common.skipToContent");
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("redirects to login when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await AppShellLayout({
      children: <div>Page content</div>,
      params: Promise.resolve({ locale: "en" }),
    });

    expect(mockRedirect).toHaveBeenCalledWith({ href: "/auth/login", locale: "en" });
    expect(result).toBeNull();
  });
});
