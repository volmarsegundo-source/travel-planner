/**
 * Unit tests for auth.config.ts JWT and session callbacks.
 *
 * Verifies that:
 * 1. JWT callback picks up user.name on initial sign-in
 * 2. JWT callback updates token.name when trigger="update" (unstable_update)
 * 3. Session callback propagates token.name to session.user.name
 *
 * These callbacks are the mechanism that keeps the displayed user name
 * in sync with the database after a profile update in Phase1Wizard.
 *
 * @see TASK-29-001
 */
import { describe, it, expect } from "vitest";
import authConfig from "@/lib/auth.config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Extract callbacks with proper typing
const jwtCallback = authConfig.callbacks!.jwt! as (params: {
  token: Record<string, unknown>;
  user?: { id: string; name?: string | null };
  trigger?: string;
  session?: Record<string, unknown>;
}) => Promise<Record<string, unknown>> | Record<string, unknown>;

const sessionCallback = authConfig.callbacks!.session! as (params: {
  session: { user: Record<string, unknown> };
  token: Record<string, unknown>;
}) => Promise<{ user: Record<string, unknown> }> | { user: Record<string, unknown> };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("auth.config.ts JWT callback — name persistence", () => {
  it("sets token.sub from user.id on initial sign-in", async () => {
    const token = { name: null, sub: undefined } as Record<string, unknown>;
    const user = { id: "user-abc", name: "Alice" };

    const result = await jwtCallback({ token, user });

    expect(result.sub).toBe("user-abc");
  });

  it("updates token.name when trigger=update with new name", async () => {
    const token = { sub: "user-abc", name: "Old Name" } as Record<string, unknown>;
    const session = { user: { name: "New Name" } };

    const result = await jwtCallback({
      token,
      trigger: "update",
      session,
    });

    expect(result.name).toBe("New Name");
    // sub should remain unchanged
    expect(result.sub).toBe("user-abc");
  });

  it("does NOT change token.name when trigger is not update", async () => {
    const token = { sub: "user-abc", name: "Current Name" } as Record<string, unknown>;

    const result = await jwtCallback({ token });

    expect(result.name).toBe("Current Name");
  });

  it("preserves token.name when trigger=update but session.user.name is undefined", async () => {
    const token = { sub: "user-abc", name: "Keep This" } as Record<string, unknown>;
    const session = { user: {} };

    const result = await jwtCallback({
      token,
      trigger: "update",
      session,
    });

    // Name should remain unchanged because session.user.name is undefined
    expect(result.name).toBe("Keep This");
  });
});

describe("auth.config.ts session callback — name propagation", () => {
  it("propagates token.name to session.user.name", async () => {
    const session = { user: { id: undefined, name: undefined } as Record<string, unknown> };
    const token = { sub: "user-abc", name: "Session Name" };

    const result = await sessionCallback({ session, token });

    expect(result.user.name).toBe("Session Name");
    expect(result.user.id).toBe("user-abc");
  });

  it("sets session.user.id from token.sub", async () => {
    const session = { user: { id: undefined } as Record<string, unknown> };
    const token = { sub: "user-xyz", name: "Test" };

    const result = await sessionCallback({ session, token });

    expect(result.user.id).toBe("user-xyz");
  });
});
