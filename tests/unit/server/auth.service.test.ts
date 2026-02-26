/**
 * Unit tests for AuthService.
 *
 * All external dependencies (Prisma, Redis, bcrypt) are mocked so these tests
 * run in isolation with no infrastructure required.
 *
 * Mocking pattern: vi.hoisted() is used to create vi.fn() instances before
 * vi.mock() factories are executed. vi.mock() calls are hoisted by the vitest
 * transformer to the very top of the file, so any variables they reference
 * must be initialised with vi.hoisted() — plain const/let declarations are in
 * the Temporal Dead Zone at the time the factory runs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoist plain mock functions before vi.mock factories run ─────────────────

const { mockRedisGet, mockRedisSet, mockRedisDel } = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisSet: vi.fn(),
  mockRedisDel: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/cache/redis", () => ({
  redis: {
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
  },
}));

// Prisma: mockDeep<PrismaClient>() inside the factory is safe — it constructs
// the deep proxy synchronously from the type definition.
vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn().mockReturnValue("test-token-123"),
}));

// ─── Import SUT after mocks are registered ────────────────────────────────────

import { AuthService } from "@/server/services/auth.service";
import { AppError, ConflictError } from "@/lib/errors";
import { db } from "@/server/db";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(
  overrides: Partial<{
    id: string;
    email: string;
    emailVerified: Date | null;
    passwordHash: string | null;
    deletedAt: Date | null;
    deactivatedAt: Date | null;
  }> = {}
) {
  return {
    id: "user-1",
    email: "test@example.com",
    emailVerified: null,
    passwordHash: "hashed-password",
    deletedAt: null,
    deactivatedAt: null,
    name: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── registerUser ──────────────────────────────────────────────────────────

  describe("registerUser", () => {
    it("creates user and returns userId on happy path", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const createdUser = makeUser({ id: "new-user-id" });
      prismaMock.user.create.mockResolvedValue(createdUser);
      mockRedisSet.mockResolvedValue("OK");

      const result = await AuthService.registerUser(
        "new@example.com",
        "securepass123",
        "Alice"
      );

      expect(result.userId).toBe("new-user-id");
      expect(prismaMock.user.create).toHaveBeenCalledOnce();
      expect(mockRedisSet).toHaveBeenCalledWith(
        "cache:email-verify:test-token-123",
        "new-user-id",
        "EX",
        86400
      );
    });

    it("throws ConflictError when email is already registered", async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        AuthService.registerUser("existing@example.com", "password123")
      ).rejects.toBeInstanceOf(ConflictError);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("does not log PII — email must not appear in console output", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(makeUser({ id: "user-pii-test" }));
      mockRedisSet.mockResolvedValue("OK");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await AuthService.registerUser("private@example.com", "password123");

      const logs = consoleSpy.mock.calls.map((args) => JSON.stringify(args));
      for (const log of logs) {
        expect(log).not.toContain("private@example.com");
      }

      consoleSpy.mockRestore();
    });
  });

  // ─── sendVerificationEmail ─────────────────────────────────────────────────

  describe("sendVerificationEmail", () => {
    it("stores token in Redis with 24-hour TTL", async () => {
      mockRedisSet.mockResolvedValue("OK");

      const result = await AuthService.sendVerificationEmail(
        "user-1",
        "test@example.com"
      );

      expect(result.token).toBe("test-token-123");
      expect(mockRedisSet).toHaveBeenCalledWith(
        "cache:email-verify:test-token-123",
        "user-1",
        "EX",
        86400
      );
    });
  });

  // ─── verifyEmail ───────────────────────────────────────────────────────────

  describe("verifyEmail", () => {
    it("marks emailVerified and deletes token on valid token", async () => {
      mockRedisGet.mockResolvedValue("user-1");
      prismaMock.user.update.mockResolvedValue(
        makeUser({ id: "user-1", emailVerified: new Date() })
      );
      mockRedisDel.mockResolvedValue(1);

      const result = await AuthService.verifyEmail("valid-token");

      expect(result.userId).toBe("user-1");
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({ emailVerified: expect.any(Date) }),
        })
      );
      expect(mockRedisDel).toHaveBeenCalledWith(
        "cache:email-verify:valid-token"
      );
    });

    it("throws AppError TOKEN_INVALID when token is not found in Redis", async () => {
      mockRedisGet.mockResolvedValue(null);

      await expect(
        AuthService.verifyEmail("expired-token")
      ).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof AppError && (err as AppError).code === "TOKEN_INVALID"
      );

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("throws AppError TOKEN_INVALID when Redis returns empty string", async () => {
      mockRedisGet.mockResolvedValue("");

      await expect(
        AuthService.verifyEmail("empty-token")
      ).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof AppError && (err as AppError).code === "TOKEN_INVALID"
      );
    });
  });

  // ─── requestPasswordReset ─────────────────────────────────────────────────

  describe("requestPasswordReset", () => {
    it("stores reset token in Redis with 1-hour TTL when user exists", async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());
      mockRedisSet.mockResolvedValue("OK");

      await AuthService.requestPasswordReset("test@example.com");

      expect(mockRedisSet).toHaveBeenCalledWith(
        "cache:pwd-reset:test-token-123",
        "user-1",
        "EX",
        3600
      );
    });

    it("returns undefined when email does not exist (prevents user enumeration)", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        AuthService.requestPasswordReset("unknown@example.com")
      ).resolves.toBeUndefined();

      expect(mockRedisSet).not.toHaveBeenCalled();
    });
  });

  // ─── confirmPasswordReset ─────────────────────────────────────────────────

  describe("confirmPasswordReset", () => {
    it("updates passwordHash and deletes token on valid token", async () => {
      mockRedisGet.mockResolvedValue("user-1");
      prismaMock.user.update.mockResolvedValue(
        makeUser({ passwordHash: "new-hashed-password" })
      );
      mockRedisDel.mockResolvedValue(1);

      const result = await AuthService.confirmPasswordReset(
        "valid-reset-token",
        "newSecurePass1"
      );

      expect(result.userId).toBe("user-1");
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({ passwordHash: "hashed-password" }),
        })
      );
      expect(mockRedisDel).toHaveBeenCalledWith(
        "cache:pwd-reset:valid-reset-token"
      );
    });

    it("throws AppError TOKEN_INVALID when token is expired or not found", async () => {
      mockRedisGet.mockResolvedValue(null);

      await expect(
        AuthService.confirmPasswordReset("expired-token", "newpass123")
      ).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof AppError && (err as AppError).code === "TOKEN_INVALID"
      );

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("throws AppError TOKEN_INVALID when Redis returns empty string", async () => {
      mockRedisGet.mockResolvedValue("");

      await expect(
        AuthService.confirmPasswordReset("bad-token", "newpass123")
      ).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof AppError && (err as AppError).code === "TOKEN_INVALID"
      );
    });
  });
});
