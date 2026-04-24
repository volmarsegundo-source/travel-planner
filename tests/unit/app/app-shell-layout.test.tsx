/**
 * Unit tests for the AppShellLayout (authenticated layout).
 *
 * Verifies that the authenticated layout includes the Footer component,
 * uses min-h-screen for proper layout, and renders children content.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const {
  mockAuth,
  mockRedirect,
  mockUserProfileFindUnique,
  mockSubscriptionFindUnique,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRedirect: vi.fn(),
  mockUserProfileFindUnique: vi.fn(),
  mockSubscriptionFindUnique: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// SPEC-AUTH-AGE-002 v2.0.0 (BUG-C-F3 iteração 7): the layout now reads
// UserProfile.birthDate to enforce the age gate. Default mock returns a
// present birthDate so the existing assertions about footer/navbar/etc.
// all run past the gate. The "redirects to login" test stays unaffected
// because mockAuth.mockResolvedValue(null) short-circuits before this read.
vi.mock("@/server/db", () => ({
  db: {
    userProfile: { findUnique: mockUserProfileFindUnique },
    subscription: { findUnique: mockSubscriptionFindUnique },
  },
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

vi.mock("next/link", () => ({
  default: ({
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

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: {
    getBalance: vi.fn().mockResolvedValue({ totalPoints: 100 }),
  },
}));

vi.mock("@/lib/engines/phase-config", () => ({
  PHASE_DEFINITIONS: [
    { name: "Phase 1" },
    { name: "Phase 2" },
    { name: "Phase 3" },
  ],
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import AppShellLayout from "@/app/[locale]/(app)/layout";

// ─── Tests ────────────────────────────────────────────────────────────────────

const mockSession = {
  user: {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
    image: null,
  },
  expires: "2099-01-01",
};

// Each AppShellLayout render takes ~33s under contention (see
// docs/specs/sprint-45/FLAKY-TRIAGE-app-shell-layout-2026-04-20.md — slow,
// not flaky). Bump the per-test timeout to 60s so the suite stays green when
// co-running with the rest of the jsdom-heavy tests.
describe("AppShellLayout", { timeout: 60_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    // Default: present birthDate so the new B4-Node-gate (iteração 7)
    // does not redirect — keeps the existing footer/navbar assertions
    // running on the rendered shell.
    mockUserProfileFindUnique.mockResolvedValue({
      birthDate: new Date("1982-03-28"),
    });
    mockSubscriptionFindUnique.mockResolvedValue(null);
  });

  it("renders FooterV2 with copyright text in authenticated pages", async () => {
    const Component = await AppShellLayout({
      children: <div>Page content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(Component);

    expect(screen.getByText(/landingV2\.footer\.copyright/)).toBeInTheDocument();
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

  it("renders FooterV2 with terms and privacy links", async () => {
    const Component = await AppShellLayout({
      children: <div>Page content</div>,
      params: Promise.resolve({ locale: "en" }),
    });
    render(Component);

    expect(screen.getByRole("link", { name: "landingV2.footer.terms" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "landingV2.footer.privacy" })).toBeInTheDocument();
  });

  it("does not render sign in or sign up links in FooterV2", async () => {
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

    // AuthenticatedNavbarV2 renders a nav with translated aria-label
    const nav = screen.getByRole("navigation", { name: "navV2.mainNavigation" });
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
