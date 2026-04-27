/**
 * F-OPS-04 — Idempotency contract for seed-v2-only.
 *
 * The wrapper script in prisma/seed-v2-only.ts is operational (run
 * against a real DB), so this test asserts the contract at the unit
 * level: `seedAiGovernanceV2Defaults` is called with the right number of
 * upsert ops and uses `update: {}` (preserving admin-tuned values).
 *
 * Sprint 46.5 fix bundle.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { modelAssignmentUpsert, aiRuntimeConfigUpsert, mockDb } = vi.hoisted(
  () => {
    const modelAssignmentUpsert = vi.fn().mockResolvedValue({});
    const aiRuntimeConfigUpsert = vi.fn().mockResolvedValue({});
    const mockDb = {
      modelAssignment: { upsert: modelAssignmentUpsert },
      aiRuntimeConfig: { upsert: aiRuntimeConfigUpsert },
    };
    return { modelAssignmentUpsert, aiRuntimeConfigUpsert, mockDb };
  }
);

beforeEach(() => {
  modelAssignmentUpsert.mockClear();
  aiRuntimeConfigUpsert.mockClear();
});

describe("F-OPS-04 — seedAiGovernanceV2Defaults idempotency contract", () => {
  it("upserts 3 ModelAssignment rows (one per phase: plan, checklist, guide)", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);
    expect(modelAssignmentUpsert).toHaveBeenCalledTimes(3);

    const phases = modelAssignmentUpsert.mock.calls.map((c) => {
      const arg = c[0] as { where: { phase: string } };
      return arg.where.phase;
    });
    expect(phases.sort()).toEqual(["checklist", "guide", "plan"]);
  });

  it("upserts 13 AiRuntimeConfig rows (allowlist per SPEC §5.3.1)", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);
    expect(aiRuntimeConfigUpsert).toHaveBeenCalledTimes(13);
  });

  it("each upsert uses empty update body (preserves admin-tuned values on re-run)", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);

    for (const call of modelAssignmentUpsert.mock.calls) {
      const arg = call[0] as { update: object };
      expect(arg.update).toEqual({});
    }
    for (const call of aiRuntimeConfigUpsert.mock.calls) {
      const arg = call[0] as { update: object };
      expect(arg.update).toEqual({});
    }
  });

  it("re-running the function does not change the call shape (idempotency contract)", async () => {
    const { seedAiGovernanceV2Defaults } = await import(
      "../seed-ai-governance-v2"
    );
    await seedAiGovernanceV2Defaults(mockDb as never);
    const firstCallCount =
      modelAssignmentUpsert.mock.calls.length +
      aiRuntimeConfigUpsert.mock.calls.length;

    modelAssignmentUpsert.mockClear();
    aiRuntimeConfigUpsert.mockClear();

    await seedAiGovernanceV2Defaults(mockDb as never);
    const secondCallCount =
      modelAssignmentUpsert.mock.calls.length +
      aiRuntimeConfigUpsert.mock.calls.length;

    expect(secondCallCount).toBe(firstCallCount);
  });
});
