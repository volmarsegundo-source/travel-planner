import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockUser, mockRedis, mockBcrypt } = vi.hoisted(() => {
  const mockUser = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mockRedis = {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  };
  // bcrypt is slow; mock it so tests run fast
  const mockBcrypt = {
    hash: vi.fn(async (pwd: string) => `hashed:${pwd}`),
    compare: vi.fn(async (plain: string, hashed: string) =>
      hashed === `hashed:${plain}`,
    ),
  };
  return { mockUser, mockRedis, mockBcrypt };
});

vi.mock("@/server/db/client", () => ({ db: { user: mockUser } }));
vi.mock("@/server/cache/client", () => ({ redis: mockRedis }));
vi.mock("@/server/cache/keys", () => ({
  CacheKeys: {
    emailVerify: (t: string) => `cache:email-verify:${t}`,
    passwordReset: (t: string) => `cache:pwd-reset:${t}`,
  },
  CacheTTL: { EMAIL_VERIFY: 86400, PASSWORD_RESET: 3600 },
}));
vi.mock("bcryptjs", () => ({ default: mockBcrypt }));
vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => "test-cuid-123",
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  hashPassword,
  verifyPassword,
  getUserByEmail,
  createVerificationToken,
  verifyEmailToken,
} from "../auth.service";

// ── hashPassword / verifyPassword ─────────────────────────────────────────────

describe("hashPassword", () => {
  it("returns a non-empty string different from the input", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("secret123");
  });
});

describe("verifyPassword", () => {
  it("returns true for matching password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("correct", hash)).toBe(true);
  });

  it("returns false for non-matching password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

// ── getUserByEmail ────────────────────────────────────────────────────────────

describe("getUserByEmail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the user when found", async () => {
    const user = { id: "u1", email: "alice@example.com", name: "Alice" };
    mockUser.findUnique.mockResolvedValue(user);

    expect(await getUserByEmail("alice@example.com")).toEqual(user);
  });

  it("returns null when user not found", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    expect(await getUserByEmail("nobody@example.com")).toBeNull();
  });

  it("passes email as-is to the DB query (case-sensitivity handled by DB collation)", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    await getUserByEmail("alice@example.com");

    expect(mockUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "alice@example.com" } }),
    );
  });
});

// ── createVerificationToken ───────────────────────────────────────────────────

describe("createVerificationToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores token in Redis with 24h TTL", async () => {
    mockRedis.setex.mockResolvedValue("OK");

    const token = await createVerificationToken("alice@example.com");

    expect(token).toBeTruthy();
    expect(mockRedis.setex).toHaveBeenCalledWith(
      expect.stringContaining("cache:email-verify:"),
      86400,
      "alice@example.com",
    );
  });

  it("returns a non-empty token string", async () => {
    mockRedis.setex.mockResolvedValue("OK");
    const token = await createVerificationToken("user@test.com");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });
});

// ── verifyEmailToken ──────────────────────────────────────────────────────────

describe("verifyEmailToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks user email as verified and deletes token on success", async () => {
    mockRedis.get.mockResolvedValue("alice@example.com");
    mockUser.update.mockResolvedValue({ id: "u1", emailVerified: new Date() });
    mockRedis.del.mockResolvedValue(1);

    await verifyEmailToken("valid-token");

    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ emailVerified: expect.any(Date) }),
      }),
    );
    expect(mockRedis.del).toHaveBeenCalledWith(
      "cache:email-verify:valid-token",
    );
  });

  it("returns false when token not found in Redis (expired or invalid)", async () => {
    mockRedis.get.mockResolvedValue(null);
    // Service returns false (does not throw) — callers handle the false return
    expect(await verifyEmailToken("bad-token")).toBe(false);
    expect(mockUser.update).not.toHaveBeenCalled();
  });
});
