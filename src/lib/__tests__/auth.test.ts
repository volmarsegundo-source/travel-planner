/**
 * Regression tests for the NextAuth signIn callback in src/lib/auth.ts.
 *
 * BUG-C-F3 Iter 7.1 (SPEC-AUTH-AGE-002 v2.0.1) removed a mutation that
 * attached `profileComplete` to the OAuth-profile-derived `user` object.
 * `@auth/prisma-adapter` spreads the full user into
 * `db.user.create({ data: user })` on fresh signups, and `User` has no
 * `profileComplete` column — Prisma threw `PrismaClientValidationError`.
 *
 * These tests assert the callback never adds `profileComplete` (or any
 * other non-User column) to the user object.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the NextAuth config so we can invoke the signIn callback directly
// without booting the real handlers / adapter.
const { mockNextAuth, captured } = vi.hoisted(() => {
  const captured: { config?: unknown } = {};
  return {
    mockNextAuth: vi.fn((cfg: unknown) => {
      captured.config = cfg;
      return {
        handlers: { GET: vi.fn(), POST: vi.fn() },
        auth: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        unstable_update: vi.fn(),
      };
    }),
    captured,
  };
});

// Heavy deps mocks so importing auth.ts does not touch the DB or network.
vi.mock("next-auth", () => ({ default: mockNextAuth }));
vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: () => ({}),
}));
vi.mock("@/server/db", () => ({
  db: {
    userProfile: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn().mockResolvedValue(false) },
}));
vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google", type: "oauth" })),
}));
vi.mock("next-auth/providers/apple", () => ({
  default: vi.fn(() => ({ id: "apple", type: "oauth" })),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((opts: unknown) => ({ id: "credentials", type: "credentials", ...(opts as object) })),
}));
vi.mock("@/lib/validations/user.schema", () => ({
  UserSignInSchema: { safeParse: vi.fn() },
}));

// Stub GOOGLE_CLIENT_* / APPLE_* so auth.ts registers them (coverage of the
// conditional branches). AUTH_SECRET unused here but harmless.
process.env.GOOGLE_CLIENT_ID = "test-google-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";

type SignInParams = {
  user: Record<string, unknown>;
  account: { provider: string; type: "oauth" | "credentials" } | null;
  profile?: Record<string, unknown>;
  email?: { verificationRequest?: boolean };
  credentials?: Record<string, unknown>;
};

type CapturedConfig = {
  callbacks: {
    signIn: (params: SignInParams) => Promise<boolean>;
  };
};

let signInCallback: CapturedConfig["callbacks"]["signIn"];

describe("auth.ts signIn callback — v2.0.1 regression coverage", () => {
  beforeEach(async () => {
    vi.resetModules();
    captured.config = undefined;
    mockNextAuth.mockClear();
    // Dynamic import so the NextAuth({...}) call happens inside the test,
    // letting us rebind the captured config each time.
    await import("@/lib/auth");
    const cfg = captured.config as CapturedConfig | undefined;
    if (!cfg?.callbacks?.signIn) {
      throw new Error("auth.ts did not expose signIn callback");
    }
    signInCallback = cfg.callbacks.signIn;
  });

  it("does NOT add profileComplete to the user object on OAuth sign-in (fresh user, no UserProfile row)", async () => {
    const user = {
      id: "fresh-oauth-user-id",
      email: "new@example.com",
      name: "New User",
      image: null,
      emailVerified: null,
    };
    const keysBefore = Object.keys(user);

    const result = await signInCallback({
      user,
      account: { provider: "google", type: "oauth" },
      profile: {},
    });

    expect(result).toBe(true);
    // CRITICAL: user must not gain a profileComplete property, or any other
    // key that PrismaAdapter would forward to User.create.
    expect(user).not.toHaveProperty("profileComplete");
    expect(Object.keys(user)).toEqual(keysBefore);
  });

  it("does NOT add profileComplete for credentials provider", async () => {
    const user = {
      id: "cred-user-id",
      email: "existing@example.com",
      name: "Existing User",
    };
    const keysBefore = Object.keys(user);

    const result = await signInCallback({
      user,
      account: { provider: "credentials", type: "credentials" },
      credentials: { email: "existing@example.com", password: "x" },
    });

    expect(result).toBe(true);
    expect(user).not.toHaveProperty("profileComplete");
    expect(Object.keys(user)).toEqual(keysBefore);
  });

  it("does NOT add profileComplete for OAuth sign-in of a user who already has a UserProfile row", async () => {
    // Even though the DB mock would return { birthDate: ... }, the callback
    // should no longer read or write profileComplete at all.
    const user = {
      id: "returning-oauth-user-id",
      email: "returning@example.com",
      name: "Returning User",
    };
    const keysBefore = Object.keys(user);

    const result = await signInCallback({
      user,
      account: { provider: "google", type: "oauth" },
      profile: {},
    });

    expect(result).toBe(true);
    expect(user).not.toHaveProperty("profileComplete");
    expect(Object.keys(user)).toEqual(keysBefore);
  });
});
