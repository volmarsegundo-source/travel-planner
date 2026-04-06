/**
 * Unit tests for KillSwitchPolicy.
 *
 * Tests cover:
 * - AI_KILL_SWITCH env var blocks globally
 * - DB global switch enabled -> blocked
 * - DB phase-specific switch enabled -> blocked
 * - All switches off -> allowed
 * - DB failure -> fail-open (allowed)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: mockDeep<PrismaClient>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

import { db } from "@/server/db";
import {
  killSwitchPolicy,
  _clearKillSwitchCache,
} from "@/server/services/ai-governance/policies/kill-switch.policy";

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;
const originalEnv = process.env.AI_KILL_SWITCH;

beforeEach(() => {
  vi.clearAllMocks();
  _clearKillSwitchCache();
  delete process.env.AI_KILL_SWITCH;
  // Default: no rows in DB
  prismaMock.aiKillSwitch.findUnique.mockResolvedValue(null);
});

afterEach(() => {
  if (originalEnv !== undefined) {
    process.env.AI_KILL_SWITCH = originalEnv;
  } else {
    delete process.env.AI_KILL_SWITCH;
  }
});

describe("KillSwitchPolicy", () => {
  it("blocks when AI_KILL_SWITCH env var is true", async () => {
    process.env.AI_KILL_SWITCH = "true";

    const result = await killSwitchPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("kill_switch");
    expect(result.reason).toContain("environment variable");
    // Should not query DB when env var blocks
    expect(prismaMock.aiKillSwitch.findUnique).not.toHaveBeenCalled();
  });

  it("blocks when DB global switch is enabled", async () => {
    prismaMock.aiKillSwitch.findUnique.mockImplementation(
      (args: { where: { phase: string } }) => {
        if (args.where.phase === "global") {
          return Promise.resolve({
            id: "1",
            phase: "global",
            isEnabled: true,
            reason: "Maintenance window",
            updatedBy: "admin",
            updatedAt: new Date(),
            createdAt: new Date(),
          }) as ReturnType<typeof prismaMock.aiKillSwitch.findUnique>;
        }
        return Promise.resolve(null) as ReturnType<typeof prismaMock.aiKillSwitch.findUnique>;
      },
    );

    const result = await killSwitchPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("kill_switch");
    expect(result.reason).toBe("Maintenance window");
  });

  it("blocks when DB phase-specific switch is enabled", async () => {
    prismaMock.aiKillSwitch.findUnique.mockImplementation(
      (args: { where: { phase: string } }) => {
        if (args.where.phase === "plan") {
          return Promise.resolve({
            id: "2",
            phase: "plan",
            isEnabled: true,
            reason: "Plan generation paused",
            updatedBy: "admin",
            updatedAt: new Date(),
            createdAt: new Date(),
          }) as ReturnType<typeof prismaMock.aiKillSwitch.findUnique>;
        }
        return Promise.resolve(null) as ReturnType<typeof prismaMock.aiKillSwitch.findUnique>;
      },
    );

    const result = await killSwitchPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("kill_switch");
    expect(result.reason).toBe("Plan generation paused");
  });

  it("allows when all switches are off", async () => {
    const result = await killSwitchPolicy.evaluate({
      phase: "guide",
      userId: "u1",
    });

    expect(result.allowed).toBe(true);
    expect(result.blockedBy).toBeUndefined();
  });

  it("allows (fail-open) when DB query throws", async () => {
    prismaMock.aiKillSwitch.findUnique.mockRejectedValue(
      new Error("Connection refused"),
    );

    const result = await killSwitchPolicy.evaluate({
      phase: "plan",
      userId: "u1",
    });

    expect(result.allowed).toBe(true);
  });
});
