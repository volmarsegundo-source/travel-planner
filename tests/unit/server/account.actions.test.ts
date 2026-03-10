/**
 * Unit tests for account Server Actions (T-050).
 *
 * Tests cover:
 * - updateUserProfileAction: success, validation errors, unauthorized
 * - deleteUserAccountAction: success with correct email, wrong email rejection,
 *   unauthorized, PII anonymization after deletion
 *
 * Mocking pattern: vi.hoisted() creates mock functions before vi.mock() factories
 * are executed (vitest hoists vi.mock() to the top of the file).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// ─── Hoist mock functions before vi.mock factories run ──────────────────────

const { mockAuth, mockRevalidatePath } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/action-utils", () => ({
  mapErrorToKey: vi.fn().mockReturnValue("errors.generic"),
}));

// ─── Import SUT after mocks are registered ──────────────────────────────────

import {
  updateUserProfileAction,
  deleteUserAccountAction,
} from "@/server/actions/account.actions";
import { db } from "@/server/db";
import { UnauthorizedError } from "@/lib/errors";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<{ id: string; email: string }> = {}) {
  return {
    user: {
      id: overrides.id ?? "user-1",
      email: overrides.email ?? "test@example.com",
      name: "Test User",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

function makeUser(
  overrides: Partial<{
    id: string;
    email: string;
    name: string | null;
    preferredLocale: string | null;
    deletedAt: Date | null;
  }> = {}
) {
  return {
    id: overrides.id ?? "user-1",
    email: overrides.email ?? "test@example.com",
    emailVerified: new Date(),
    name: overrides.name ?? "Test User",
    image: null,
    passwordHash: "hashed-password",
    preferredLocale: overrides.preferredLocale ?? "pt-BR",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: overrides.deletedAt ?? null,
    deactivatedAt: null,
  };
}

function makeMockTx(tripIds: string[] = ["trip-1", "trip-2"]) {
  return {
    account: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    session: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    userProfile: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    userBadge: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) },
    pointTransaction: { deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
    userProgress: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    trip: {
      findMany: vi.fn().mockResolvedValue(tripIds.map((id) => ({ id }))),
      updateMany: vi.fn().mockResolvedValue({ count: tripIds.length }),
    },
    activity: { deleteMany: vi.fn().mockResolvedValue({ count: 8 }) },
    itineraryDay: { deleteMany: vi.fn().mockResolvedValue({ count: 4 }) },
    checklistItem: { deleteMany: vi.fn().mockResolvedValue({ count: 6 }) },
    expeditionPhase: { deleteMany: vi.fn().mockResolvedValue({ count: 4 }) },
    phaseChecklistItem: { deleteMany: vi.fn().mockResolvedValue({ count: 6 }) },
    itineraryPlan: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    destinationGuide: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    user: { update: vi.fn().mockResolvedValue(undefined) },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Account Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── updateUserProfileAction ────────────────────────────────────────────

  describe("updateUserProfileAction", () => {
    it("updates user name and returns updated profile on success", async () => {
      mockAuth.mockResolvedValue(makeSession());

      const updatedUser = {
        id: "user-1",
        name: "New Name",
        email: "test@example.com",
        preferredLocale: "pt-BR",
      };
      prismaMock.user.update.mockResolvedValue(makeUser({ name: "New Name" }));
      // Override the select projection
      prismaMock.user.update.mockResolvedValue(updatedUser as never);

      const result = await updateUserProfileAction({ name: "New Name" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(updatedUser);
      }
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "user-1", deletedAt: null },
        data: { name: "New Name" },
        select: {
          id: true,
          name: true,
          email: true,
          preferredLocale: true,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/account");
    });

    it("updates user name and preferredLocale when locale is provided", async () => {
      mockAuth.mockResolvedValue(makeSession());

      const updatedUser = {
        id: "user-1",
        name: "New Name",
        email: "test@example.com",
        preferredLocale: "en",
      };
      prismaMock.user.update.mockResolvedValue(updatedUser as never);

      const result = await updateUserProfileAction({
        name: "New Name",
        preferredLocale: "en",
      });

      expect(result.success).toBe(true);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "user-1", deletedAt: null },
        data: { name: "New Name", preferredLocale: "en" },
        select: {
          id: true,
          name: true,
          email: true,
          preferredLocale: true,
        },
      });
    });

    it("returns validation error when name is too short", async () => {
      mockAuth.mockResolvedValue(makeSession());

      const result = await updateUserProfileAction({ name: "A" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("account.errors.nameTooShort");
      }
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("returns validation error when name is too long", async () => {
      mockAuth.mockResolvedValue(makeSession());

      const longName = "A".repeat(101);
      const result = await updateUserProfileAction({ name: longName });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("account.errors.nameTooLong");
      }
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("returns validation error when preferredLocale is invalid", async () => {
      mockAuth.mockResolvedValue(makeSession());

      const result = await updateUserProfileAction({
        name: "Valid Name",
        preferredLocale: "fr" as "en" | "pt-BR",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("account.errors.invalidLocale");
      }
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("throws UnauthorizedError when session is missing", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(
        updateUserProfileAction({ name: "New Name" })
      ).rejects.toBeInstanceOf(UnauthorizedError);

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("throws UnauthorizedError when session has no user id", async () => {
      mockAuth.mockResolvedValue({ user: {} });

      await expect(
        updateUserProfileAction({ name: "New Name" })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("returns error when database update fails", async () => {
      mockAuth.mockResolvedValue(makeSession());
      prismaMock.user.update.mockRejectedValue(new Error("DB error"));

      const result = await updateUserProfileAction({ name: "New Name" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("errors.generic");
      }
    });

    it("trims whitespace from name", async () => {
      mockAuth.mockResolvedValue(makeSession());

      const updatedUser = {
        id: "user-1",
        name: "Trimmed Name",
        email: "test@example.com",
        preferredLocale: "pt-BR",
      };
      prismaMock.user.update.mockResolvedValue(updatedUser as never);

      const result = await updateUserProfileAction({ name: "  Trimmed Name  " });

      expect(result.success).toBe(true);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Trimmed Name" }),
        })
      );
    });
  });

  // ─── deleteUserAccountAction ──────────────────────────────────────────

  describe("deleteUserAccountAction", () => {
    it("soft deletes user, anonymizes PII, cleans up OAuth accounts/sessions, and cascades to trips on success", async () => {
      mockAuth.mockResolvedValue(makeSession());
      prismaMock.user.findFirst.mockResolvedValue(
        makeUser({ id: "user-1", email: "test@example.com" }) as never
      );

      // Mock the transaction — Prisma $transaction receives a callback
      const mockTx = makeMockTx();
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await deleteUserAccountAction({
        confirmEmail: "test@example.com",
      });

      expect(result.success).toBe(true);

      // Verify OAuth accounts were deleted (T-S17-002)
      expect(mockTx.account.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });

      // Verify sessions were deleted (T-S17-002)
      expect(mockTx.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });

      // Verify user was soft deleted + anonymized
      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            name: "Deleted User",
            email: expect.stringMatching(/^deleted_[a-f0-9]+@anonymous\.local$/),
            image: null,
            passwordHash: null,
          }),
        })
      );

      // Verify trips were cascade soft deleted
      expect(mockTx.trip.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });

      // Verify analytics event was dispatched
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"event":"account.deleted"')
      );
      const loggedEvent = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedEvent.event).toBe("account.deleted");
      expect(loggedEvent.userIdHash).toBeDefined();
      expect(loggedEvent.timestamp).toBeDefined();
      // Ensure no PII in the analytics event
      expect(loggedEvent.email).toBeUndefined();
      expect(loggedEvent.name).toBeUndefined();
      expect(loggedEvent.userId).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it("returns error when confirmation email does not match", async () => {
      mockAuth.mockResolvedValue(makeSession());
      prismaMock.user.findFirst.mockResolvedValue(
        makeUser({ id: "user-1", email: "test@example.com" }) as never
      );

      const result = await deleteUserAccountAction({
        confirmEmail: "wrong@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("account.errors.emailMismatch");
      }
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("returns error when user is not found (already deleted)", async () => {
      mockAuth.mockResolvedValue(makeSession());
      prismaMock.user.findFirst.mockResolvedValue(null);

      const result = await deleteUserAccountAction({
        confirmEmail: "test@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("account.errors.accountNotFound");
      }
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("throws UnauthorizedError when session is missing", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(
        deleteUserAccountAction({ confirmEmail: "test@example.com" })
      ).rejects.toBeInstanceOf(UnauthorizedError);

      expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    });

    it("returns validation error for invalid email format", async () => {
      mockAuth.mockResolvedValue(makeSession());

      const result = await deleteUserAccountAction({
        confirmEmail: "not-an-email",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("account.errors.invalidEmail");
      }
      expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    });

    it("anonymized email contains hash, not original user ID", async () => {
      mockAuth.mockResolvedValue(makeSession({ id: "user-sensitive-id" }));
      prismaMock.user.findFirst.mockResolvedValue(
        makeUser({ id: "user-sensitive-id", email: "test@example.com" }) as never
      );

      const mockTx = makeMockTx();
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      vi.spyOn(console, "log").mockImplementation(() => {});

      await deleteUserAccountAction({ confirmEmail: "test@example.com" });

      const updateCall = mockTx.user.update.mock.calls[0][0];
      const anonymizedEmail = updateCall.data.email as string;

      // Verify email is anonymized (not original)
      expect(anonymizedEmail).not.toContain("test@example.com");
      expect(anonymizedEmail).not.toContain("user-sensitive-id");
      expect(anonymizedEmail).toMatch(/^deleted_[a-f0-9]+@anonymous\.local$/);

      vi.restoreAllMocks();
    });

    it("handles case-insensitive email matching", async () => {
      mockAuth.mockResolvedValue(makeSession());
      prismaMock.user.findFirst.mockResolvedValue(
        makeUser({ id: "user-1", email: "test@example.com" }) as never
      );

      const mockTx = makeMockTx();
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      vi.spyOn(console, "log").mockImplementation(() => {});

      // Provide uppercase email — Zod schema lowercases it
      const result = await deleteUserAccountAction({
        confirmEmail: "TEST@EXAMPLE.COM",
      });

      expect(result.success).toBe(true);

      vi.restoreAllMocks();
    });

    it("returns error when database transaction fails", async () => {
      mockAuth.mockResolvedValue(makeSession());
      prismaMock.user.findFirst.mockResolvedValue(
        makeUser({ id: "user-1", email: "test@example.com" }) as never
      );
      prismaMock.$transaction.mockRejectedValue(new Error("TX failed"));

      const result = await deleteUserAccountAction({
        confirmEmail: "test@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("errors.generic");
      }
    });

    it("deletes OAuth accounts before soft-deleting user (T-S17-002)", async () => {
      mockAuth.mockResolvedValue(makeSession());
      prismaMock.user.findFirst.mockResolvedValue(
        makeUser({ id: "user-1", email: "test@example.com" }) as never
      );

      const callOrder: string[] = [];
      const mockTx = {
        ...makeMockTx(),
        account: {
          deleteMany: vi.fn().mockImplementation(() => {
            callOrder.push("account.deleteMany");
            return Promise.resolve({ count: 2 });
          }),
        },
        session: {
          deleteMany: vi.fn().mockImplementation(() => {
            callOrder.push("session.deleteMany");
            return Promise.resolve({ count: 1 });
          }),
        },
        user: {
          update: vi.fn().mockImplementation(() => {
            callOrder.push("user.update");
            return Promise.resolve(undefined);
          }),
        },
      };
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await deleteUserAccountAction({
        confirmEmail: "test@example.com",
      });

      expect(result.success).toBe(true);

      // OAuth accounts must be deleted
      expect(mockTx.account.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });

      // Sessions must be deleted
      expect(mockTx.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });

      // OAuth + session cleanup must happen BEFORE user anonymization
      expect(callOrder.indexOf("account.deleteMany")).toBeLessThan(
        callOrder.indexOf("user.update")
      );
      expect(callOrder.indexOf("session.deleteMany")).toBeLessThan(
        callOrder.indexOf("user.update")
      );

      vi.restoreAllMocks();
    });

    it("cleans up gamification, profile, and trip-dependent data (SEC-S17-003)", async () => {
      mockAuth.mockResolvedValue(makeSession());
      prismaMock.user.findFirst.mockResolvedValue(
        makeUser({ id: "user-1", email: "test@example.com" }) as never
      );

      const mockTx = makeMockTx(["trip-a", "trip-b", "trip-c"]);
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await deleteUserAccountAction({
        confirmEmail: "test@example.com",
      });

      expect(result.success).toBe(true);

      // User-level data cleanup
      expect(mockTx.userProfile.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(mockTx.userBadge.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(mockTx.pointTransaction.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(mockTx.userProgress.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });

      // Trip-dependent data cleanup
      const expectedTripIds = ["trip-a", "trip-b", "trip-c"];
      expect(mockTx.trip.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        select: { id: true },
      });
      // SEC-S18-001: Activity, ItineraryDay, ChecklistItem cascade deletion
      expect(mockTx.activity.deleteMany).toHaveBeenCalledWith({
        where: { day: { tripId: { in: expectedTripIds } } },
      });
      expect(mockTx.itineraryDay.deleteMany).toHaveBeenCalledWith({
        where: { tripId: { in: expectedTripIds } },
      });
      expect(mockTx.checklistItem.deleteMany).toHaveBeenCalledWith({
        where: { tripId: { in: expectedTripIds } },
      });
      expect(mockTx.expeditionPhase.deleteMany).toHaveBeenCalledWith({
        where: { tripId: { in: expectedTripIds } },
      });
      expect(mockTx.phaseChecklistItem.deleteMany).toHaveBeenCalledWith({
        where: { tripId: { in: expectedTripIds } },
      });
      expect(mockTx.itineraryPlan.deleteMany).toHaveBeenCalledWith({
        where: { tripId: { in: expectedTripIds } },
      });
      expect(mockTx.destinationGuide.deleteMany).toHaveBeenCalledWith({
        where: { tripId: { in: expectedTripIds } },
      });

      vi.restoreAllMocks();
    });

    it("deletes activities before itinerary days (FK constraint order, SEC-S18-001)", async () => {
      mockAuth.mockResolvedValue(makeSession());
      prismaMock.user.findFirst.mockResolvedValue(
        makeUser({ id: "user-1", email: "test@example.com" }) as never
      );

      const callOrder: string[] = [];
      const mockTx = {
        ...makeMockTx(["trip-x"]),
        activity: {
          deleteMany: vi.fn().mockImplementation(() => {
            callOrder.push("activity.deleteMany");
            return Promise.resolve({ count: 3 });
          }),
        },
        itineraryDay: {
          deleteMany: vi.fn().mockImplementation(() => {
            callOrder.push("itineraryDay.deleteMany");
            return Promise.resolve({ count: 2 });
          }),
        },
        checklistItem: {
          deleteMany: vi.fn().mockImplementation(() => {
            callOrder.push("checklistItem.deleteMany");
            return Promise.resolve({ count: 1 });
          }),
        },
      };
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await deleteUserAccountAction({
        confirmEmail: "test@example.com",
      });

      expect(result.success).toBe(true);

      // Activities must be deleted BEFORE ItineraryDays (FK: Activity -> ItineraryDay)
      expect(callOrder.indexOf("activity.deleteMany")).toBeLessThan(
        callOrder.indexOf("itineraryDay.deleteMany")
      );

      vi.restoreAllMocks();
    });

    it("skips trip-dependent cleanup when user has no trips", async () => {
      mockAuth.mockResolvedValue(makeSession());
      prismaMock.user.findFirst.mockResolvedValue(
        makeUser({ id: "user-1", email: "test@example.com" }) as never
      );

      const mockTx = makeMockTx([]);
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await deleteUserAccountAction({
        confirmEmail: "test@example.com",
      });

      expect(result.success).toBe(true);

      // User-level cleanup still happens
      expect(mockTx.userProfile.deleteMany).toHaveBeenCalled();
      expect(mockTx.userBadge.deleteMany).toHaveBeenCalled();

      // Trip-dependent cleanup is skipped (including SEC-S18-001 models)
      expect(mockTx.activity.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.itineraryDay.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.checklistItem.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.expeditionPhase.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.phaseChecklistItem.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.itineraryPlan.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.destinationGuide.deleteMany).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it("does not log PII in audit events", async () => {
      mockAuth.mockResolvedValue(makeSession({ email: "private@sensitive.com" }));
      prismaMock.user.findFirst.mockResolvedValue(
        makeUser({
          id: "user-1",
          email: "private@sensitive.com",
          name: "Private Person",
        }) as never
      );

      const mockTx = makeMockTx();
      prismaMock.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          return fn(mockTx as never);
        }
        return undefined as never;
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await deleteUserAccountAction({ confirmEmail: "private@sensitive.com" });

      // Check all console.log calls for PII
      for (const call of consoleSpy.mock.calls) {
        const logStr = JSON.stringify(call);
        expect(logStr).not.toContain("private@sensitive.com");
        expect(logStr).not.toContain("Private Person");
      }

      // Check all console.error calls for PII
      for (const call of consoleErrorSpy.mock.calls) {
        const logStr = JSON.stringify(call);
        expect(logStr).not.toContain("private@sensitive.com");
        expect(logStr).not.toContain("Private Person");
      }

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
