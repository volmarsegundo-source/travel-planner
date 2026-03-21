import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("getAvailableOAuthProviders", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns empty array when no OAuth env vars are set", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.APPLE_ID;
    delete process.env.APPLE_SECRET;

    const { getAvailableOAuthProviders } = await import("@/lib/auth-providers");
    expect(getAvailableOAuthProviders()).toEqual([]);
  });

  it("returns ['google'] when only Google credentials are set", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    delete process.env.APPLE_ID;
    delete process.env.APPLE_SECRET;

    const { getAvailableOAuthProviders } = await import("@/lib/auth-providers");
    expect(getAvailableOAuthProviders()).toEqual(["google"]);
  });

  it("returns ['apple'] when only Apple credentials are set", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    process.env.APPLE_ID = "com.example.app";
    process.env.APPLE_SECRET = "apple-jwt-secret";

    const { getAvailableOAuthProviders } = await import("@/lib/auth-providers");
    expect(getAvailableOAuthProviders()).toEqual(["apple"]);
  });

  it("returns ['google', 'apple'] when both are set", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    process.env.APPLE_ID = "com.example.app";
    process.env.APPLE_SECRET = "apple-jwt-secret";

    const { getAvailableOAuthProviders } = await import("@/lib/auth-providers");
    expect(getAvailableOAuthProviders()).toEqual(["google", "apple"]);
  });

  it("returns empty when Google ID is set but secret is missing", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-id";
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.APPLE_ID;
    delete process.env.APPLE_SECRET;

    const { getAvailableOAuthProviders } = await import("@/lib/auth-providers");
    expect(getAvailableOAuthProviders()).toEqual([]);
  });

  it("returns empty when Apple ID is set but secret is missing", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    process.env.APPLE_ID = "com.example.app";
    delete process.env.APPLE_SECRET;

    const { getAvailableOAuthProviders } = await import("@/lib/auth-providers");
    expect(getAvailableOAuthProviders()).toEqual([]);
  });
});
