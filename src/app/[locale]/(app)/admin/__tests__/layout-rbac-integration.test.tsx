/**
 * B-W1-008 — Wave 1 integration tests: parent admin layout + path-aware RBAC.
 *
 * Closes the honesty flag from commit f188686 (middleware integration test
 * deferred). The middleware is wrapped in NextAuth's `auth()` HOF which is
 * hard to unit-test in isolation; the parent admin layout duplicates the
 * same path-aware RBAC logic as defense-in-depth, so testing the layout
 * exercises the same effective contract (admin → all /admin/*; admin-ai
 * → /admin/ia only; user → nothing).
 *
 * Coverage matrix (4 roles × 2 paths = 8 cases):
 *
 *                    /admin/ia        /admin/dashboard
 *   admin            allow            allow
 *   admin-ai         allow            redirect
 *   admin-ai-approver allow           redirect
 *   user             redirect         redirect
 *
 * Wave 1 task 8/8 — closes Wave 1.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockAuth,
  mockRedirect,
  mockGetTranslations,
  mockHeadersGet,
  mockHeaders,
  mockUserFindUnique,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRedirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  mockGetTranslations: vi.fn(),
  mockHeadersGet: vi.fn(),
  mockHeaders: vi.fn(),
  mockUserFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("next-intl/server", () => ({ getTranslations: mockGetTranslations }));
vi.mock("@/server/db", () => ({
  db: { user: { findUnique: mockUserFindUnique } },
}));
// Keep AdminNav out of the way — it's a client component.
vi.mock("../AdminNav", () => ({ AdminNav: () => null }));

import AdminLayout from "@/app/[locale]/(app)/admin/layout";

const setRole = (role: string | null) => {
  mockAuth.mockResolvedValue(role ? { user: { id: "u1" } } : null);
  mockUserFindUnique.mockResolvedValue(role ? { role } : null);
};

const setPath = (pathname: string) => {
  mockHeadersGet.mockImplementation((key: string) =>
    key === "x-pathname" ? pathname : null,
  );
  mockHeaders.mockResolvedValue({ get: mockHeadersGet });
};

const expectRedirect = async (
  pathname: string,
  role: string,
  expectedTarget: string,
) => {
  setRole(role);
  setPath(pathname);
  await expect(
    AdminLayout({ children: null }),
  ).rejects.toThrow(`NEXT_REDIRECT:${expectedTarget}`);
};

const expectAllowed = async (pathname: string, role: string) => {
  setRole(role);
  setPath(pathname);
  // Allowed = does not throw NEXT_REDIRECT.
  // The layout returns JSX. We don't render it — just confirm no redirect fired.
  const result = await AdminLayout({ children: null });
  expect(result).toBeTruthy();
};

describe("AdminLayout — Wave 1 integration RBAC matrix (B-W1-008)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTranslations.mockResolvedValue((key: string) => key);
  });

  it("redirects unauthenticated users to /auth/login", async () => {
    setRole(null);
    setPath("/admin/ia");
    await expect(
      AdminLayout({ children: null }),
    ).rejects.toThrow("NEXT_REDIRECT:/auth/login");
  });

  it("admin → allowed on /admin/ia", async () => {
    await expectAllowed("/admin/ia", "admin");
  });

  it("admin → allowed on /admin/dashboard (back-compat)", async () => {
    await expectAllowed("/admin/dashboard", "admin");
  });

  it("admin-ai → allowed on /admin/ia (SPEC §7.7)", async () => {
    await expectAllowed("/admin/ia", "admin-ai");
  });

  it("admin-ai → redirected on /admin/dashboard (admin-only)", async () => {
    await expectRedirect("/admin/dashboard", "admin-ai", "/expeditions");
  });

  it("admin-ai-approver → allowed on /admin/ia", async () => {
    await expectAllowed("/admin/ia", "admin-ai-approver");
  });

  it("admin-ai-approver → redirected on /admin/dashboard (admin-only)", async () => {
    await expectRedirect("/admin/dashboard", "admin-ai-approver", "/expeditions");
  });

  it("user → redirected on /admin/ia", async () => {
    await expectRedirect("/admin/ia", "user", "/expeditions");
  });

  it("user → redirected on /admin/dashboard", async () => {
    await expectRedirect("/admin/dashboard", "user", "/expeditions");
  });

  it("nested /admin/ia/prompts inherits the allowed-roles rule", async () => {
    await expectAllowed("/admin/ia/prompts", "admin-ai");
  });

  it("missing x-pathname header treats as non-/admin/ia (back-compat: admin-only)", async () => {
    mockHeadersGet.mockReturnValue(null);
    mockHeaders.mockResolvedValue({ get: mockHeadersGet });
    setRole("admin-ai");
    await expect(
      AdminLayout({ children: null }),
    ).rejects.toThrow("NEXT_REDIRECT:/expeditions");
    // admin-ai without /admin/ia in pathname falls back to admin-only check → redirect.
  });
});
