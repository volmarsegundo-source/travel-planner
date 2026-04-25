/**
 * B-W1-003 — Seed defaults for ModelAssignment + AiRuntimeConfig.
 *
 * Tests `seedAiGovernanceV2Defaults` exported from
 * `prisma/seed-ai-governance-v2.ts` per SPEC-ARCH-AI-GOVERNANCE-V2
 * §5.3.1 (AiRuntimeConfig allowlist) + §8.3 (ModelAssignment SQL).
 *
 * Tests use a mocked PrismaClient (no DB access) and assert:
 *   - 3 ModelAssignment upsert calls with SPEC §8.3 values
 *   - 13 AiRuntimeConfig upsert calls with SPEC §5.3.1 values
 *   - Idempotent (upsert with where=unique key)
 *   - JSON-encoded `value` for every AiRuntimeConfig row
 *
 * STATUS AT COMMIT: starts RED (function does not exist yet).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  modelAssignmentUpsert,
  aiRuntimeConfigUpsert,
  mockDb,
} = vi.hoisted(() => {
  const modelAssignmentUpsert = vi.fn().mockResolvedValue({});
  const aiRuntimeConfigUpsert = vi.fn().mockResolvedValue({});
  return {
    modelAssignmentUpsert,
    aiRuntimeConfigUpsert,
    mockDb: {
      modelAssignment: { upsert: modelAssignmentUpsert },
      aiRuntimeConfig: { upsert: aiRuntimeConfigUpsert },
    },
  };
});

describe("B-W1-003 — seedAiGovernanceV2Defaults", () => {
  beforeEach(() => {
    vi.resetModules();
    modelAssignmentUpsert.mockClear();
    aiRuntimeConfigUpsert.mockClear();
  });

  it("upserts exactly 3 ModelAssignment rows (plan, checklist, guide) per SPEC §8.3", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../../../../prisma/seed-ai-governance-v2"
    );
    expect(seedAiGovernanceV2Defaults, "function must be exported").toBeTypeOf(
      "function"
    );

    await seedAiGovernanceV2Defaults(mockDb as never);

    expect(modelAssignmentUpsert).toHaveBeenCalledTimes(3);

    const phases = modelAssignmentUpsert.mock.calls.map(
      (c) => (c[0] as { where: { phase: string } }).where.phase
    );
    expect(phases).toEqual(expect.arrayContaining(["plan", "checklist", "guide"]));
  });

  it("seeds plan with primary anthropic + fallback gemini per SPEC §8.3", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../../../../prisma/seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);

    const planCall = modelAssignmentUpsert.mock.calls.find(
      (c) => (c[0] as { where: { phase: string } }).where.phase === "plan"
    );
    expect(planCall).toBeDefined();
    const args = planCall![0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(args.create).toMatchObject({
      phase: "plan",
      primaryProvider: "anthropic",
      primaryModelId: "claude-haiku-4-5-20251001",
      primaryTimeoutMs: 30000,
      fallbackProvider: "gemini",
      fallbackModelId: "gemini-2.0-flash",
      fallbackTimeoutMs: 25000,
    });
  });

  it("seeds checklist with primary anthropic + no fallback per SPEC §8.3", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../../../../prisma/seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);

    const checklistCall = modelAssignmentUpsert.mock.calls.find(
      (c) => (c[0] as { where: { phase: string } }).where.phase === "checklist"
    );
    const args = checklistCall![0] as { create: Record<string, unknown> };
    expect(args.create).toMatchObject({
      phase: "checklist",
      primaryProvider: "anthropic",
      primaryModelId: "claude-haiku-4-5-20251001",
      primaryTimeoutMs: 20000,
      fallbackProvider: null,
      fallbackModelId: null,
      fallbackTimeoutMs: null,
    });
  });

  it("seeds guide with primary anthropic + no fallback per SPEC §8.3", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../../../../prisma/seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);

    const guideCall = modelAssignmentUpsert.mock.calls.find(
      (c) => (c[0] as { where: { phase: string } }).where.phase === "guide"
    );
    const args = guideCall![0] as { create: Record<string, unknown> };
    expect(args.create).toMatchObject({
      phase: "guide",
      primaryProvider: "anthropic",
      primaryModelId: "claude-haiku-4-5-20251001",
      primaryTimeoutMs: 25000,
      fallbackProvider: null,
      fallbackModelId: null,
      fallbackTimeoutMs: null,
    });
  });

  it("upserts exactly 13 AiRuntimeConfig rows per SPEC §5.3.1 allowlist", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../../../../prisma/seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);

    expect(aiRuntimeConfigUpsert).toHaveBeenCalledTimes(13);

    const keys = aiRuntimeConfigUpsert.mock.calls.map(
      (c) => (c[0] as { where: { key: string } }).where.key
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        "maxTokens.plan",
        "maxTokens.checklist",
        "maxTokens.guide",
        "temperature.plan",
        "temperature.checklist",
        "temperature.guide",
        "killSwitch.global",
        "killSwitch.plan",
        "killSwitch.checklist",
        "killSwitch.guide",
        "rateLimitPerHour.plan",
        "rateLimitPerHour.checklist",
        "rateLimitPerHour.guide",
      ])
    );
  });

  it("AiRuntimeConfig values are JSON-encoded strings per schema contract", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../../../../prisma/seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);

    for (const call of aiRuntimeConfigUpsert.mock.calls) {
      const args = call[0] as { create: { value: string } };
      expect(typeof args.create.value).toBe("string");
      // Round-trip: must parse as valid JSON
      expect(() => JSON.parse(args.create.value)).not.toThrow();
    }
  });

  it("AiRuntimeConfig defaults match SPEC §5.3.1 verbatim", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../../../../prisma/seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);

    const expected: Record<string, unknown> = {
      "maxTokens.plan": 2048,
      "maxTokens.checklist": 2048,
      "maxTokens.guide": 4096,
      "temperature.plan": 0.7,
      "temperature.checklist": 0.3,
      "temperature.guide": 0.7,
      "killSwitch.global": false,
      "killSwitch.plan": false,
      "killSwitch.checklist": false,
      "killSwitch.guide": false,
      "rateLimitPerHour.plan": 10,
      "rateLimitPerHour.checklist": 5,
      "rateLimitPerHour.guide": 5,
    };

    for (const call of aiRuntimeConfigUpsert.mock.calls) {
      const args = call[0] as { where: { key: string }; create: { value: string } };
      const parsed = JSON.parse(args.create.value);
      expect(parsed, `key ${args.where.key}`).toEqual(expected[args.where.key]);
    }
  });

  it("uses upsert (not create) so the seed is idempotent", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../../../../prisma/seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);
    await seedAiGovernanceV2Defaults(mockDb as never);

    // Two runs: 6 ModelAssignment upserts + 26 AiRuntimeConfig upserts.
    // Upsert is idempotent at the DB level (where = unique key).
    expect(modelAssignmentUpsert).toHaveBeenCalledTimes(6);
    expect(aiRuntimeConfigUpsert).toHaveBeenCalledTimes(26);

    // Every call uses where + create + update — the upsert shape, not raw create.
    for (const call of modelAssignmentUpsert.mock.calls) {
      const args = call[0] as { where?: unknown; create?: unknown; update?: unknown };
      expect(args.where).toBeDefined();
      expect(args.create).toBeDefined();
      expect(args.update).toBeDefined();
    }
  });
});
