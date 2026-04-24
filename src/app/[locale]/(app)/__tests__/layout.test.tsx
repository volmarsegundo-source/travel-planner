/**
 * BUG-C-F3 Iteração 7 — B4-Node-gate layout test.
 *
 * The (app) layout is the new age-gate enforcement boundary.
 * Source of truth: UserProfile.birthDate (DB).
 *
 * Phase 4 (TDD): two of these tests start RED, since AppShellLayout
 * does not yet read birthDate. Phase 5 makes them GREEN.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockAuth,
  mockRedirect,
  mockUserProfileFindUnique,
  mockSubscriptionFindUnique,
  mockGetBalance,
  mockGetPhaseDefinitions,
  mockGetTranslations,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  // Typed with `unknown[]` so vitest infers `mock.calls` as
  // `unknown[][]`, letting tests inspect args without further casts.
  mockRedirect: vi.fn((..._args: unknown[]) => {
    // next-intl's redirect throws to abort rendering, mirror that here so
    // any code path past it does not silently execute and pollute assertions.
    throw new Error("NEXT_REDIRECT");
  }),
  mockUserProfileFindUnique: vi.fn(),
  mockSubscriptionFindUnique: vi.fn(),
  mockGetBalance: vi.fn(),
  mockGetPhaseDefinitions: vi.fn(),
  mockGetTranslations: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/i18n/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/server/db", () => ({
  db: {
    userProfile: { findUnique: mockUserProfileFindUnique },
    subscription: { findUnique: mockSubscriptionFindUnique },
  },
}));

vi.mock("next-intl/server", () => ({
  getTranslations: mockGetTranslations,
}));

vi.mock("@/lib/engines/points-engine", () => ({
  PointsEngine: { getBalance: mockGetBalance },
}));

vi.mock("@/lib/engines/phase-config", () => ({
  getPhaseDefinitions: mockGetPhaseDefinitions,
}));

// Replace heavy presentational children with stubs so the layout under
// test stays focused on its guard logic.
vi.mock("@/components/layout/AuthenticatedNavbarV2", () => ({
  AuthenticatedNavbarV2: () => null,
}));
vi.mock("@/components/features/landing/FooterV2", () => ({
  FooterV2: () => null,
}));
vi.mock("@/components/features/feedback/FeedbackWidgetLoader", () => ({
  FeedbackWidgetLoader: () => null,
}));
vi.mock("@/components/layout/AppShellClient", () => ({
  AppShellClient: ({ children }: { children: React.ReactNode }) =>
    children as React.ReactElement,
}));

import AppShellLayout from "@/app/[locale]/(app)/layout";

const adultUser = {
  user: { id: "user_1", name: "Ada", email: "ada@example.com", image: null },
};

describe("(app) layout — B4-Node-gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Defaults that the existing layout already relies on.
    mockGetTranslations.mockResolvedValue((key: string) => key);
    mockGetBalance.mockResolvedValue({
      totalPoints: 0,
      availablePoints: 0,
      currentRank: "novato",
    });
    mockGetPhaseDefinitions.mockReturnValue([
      { name: "Phase 1" },
    ]);
    mockSubscriptionFindUnique.mockResolvedValue(null);
  });

  it("redirects to /auth/login when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      AppShellLayout({
        children: null,
        params: Promise.resolve({ locale: "pt-BR" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/auth/login", locale: "pt-BR" }),
    );
    expect(mockUserProfileFindUnique).not.toHaveBeenCalled();
  });

  it("redirects to /auth/complete-profile when birthDate is null", async () => {
    mockAuth.mockResolvedValue(adultUser);
    mockUserProfileFindUnique.mockResolvedValue({ birthDate: null });

    await expect(
      AppShellLayout({
        children: null,
        params: Promise.resolve({ locale: "pt-BR" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockUserProfileFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        select: { birthDate: true },
      }),
    );
    const redirectCall = mockRedirect.mock.calls.find(([arg]) => {
      const obj = arg as { href?: string } | string;
      const href = typeof obj === "string" ? obj : obj?.href;
      return typeof href === "string" && href.includes("/auth/complete-profile");
    });
    expect(redirectCall, "expected a redirect to complete-profile").toBeDefined();
  });

  it("redirects to /auth/complete-profile when UserProfile row does not exist", async () => {
    mockAuth.mockResolvedValue(adultUser);
    mockUserProfileFindUnique.mockResolvedValue(null);

    await expect(
      AppShellLayout({
        children: null,
        params: Promise.resolve({ locale: "pt-BR" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    const redirectCall = mockRedirect.mock.calls.find(([arg]) => {
      const obj = arg as { href?: string } | string;
      const href = typeof obj === "string" ? obj : obj?.href;
      return typeof href === "string" && href.includes("/auth/complete-profile");
    });
    expect(redirectCall, "expected a redirect to complete-profile").toBeDefined();
  });

  it("renders the shell when birthDate is present", async () => {
    mockAuth.mockResolvedValue(adultUser);
    mockUserProfileFindUnique.mockResolvedValue({
      birthDate: new Date("1982-03-28"),
    });

    const result = await AppShellLayout({
      children: null,
      params: Promise.resolve({ locale: "pt-BR" }),
    });

    expect(result).not.toBeNull();
    expect(mockUserProfileFindUnique).toHaveBeenCalled();
    // No redirect call should have been made for DOB enforcement.
    const dobRedirect = mockRedirect.mock.calls.find(([arg]) => {
      const obj = arg as { href?: string } | string;
      const href = typeof obj === "string" ? obj : obj?.href;
      return typeof href === "string" && href.includes("/auth/complete-profile");
    });
    expect(dobRedirect).toBeUndefined();
  });
});
