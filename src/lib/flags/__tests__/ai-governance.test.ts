/**
 * B-W1-001 — Feature flag for AI Governance V2.
 *
 * Tests `isAiGovernanceV2Enabled()` exported from
 * `src/lib/flags/ai-governance.ts` per SPEC-OPS-AI-GOVERNANCE-V2 §2.2.
 *
 * Contract:
 *   - Reads `env.AI_GOVERNANCE_V2` (boolean, transformed from "true"/"false"
 *     enum string per @t3-oss/env-nextjs validation in src/lib/env.ts).
 *   - Default OFF when env var is unset (per SPEC §2.1).
 *   - Strict enum: invalid env values crash app at boot (validated by env
 *     schema in src/lib/env.ts; not re-validated here because @t3-oss/env-nextjs
 *     caches the parsed env at first import).
 *
 * STATUS AT COMMIT: tests follow Vitest best-practice of mocking the env
 * barrel per test, since @t3-oss/env-nextjs caches at first import.
 * The schema-side strict-enum validation is asserted via SPEC + integration,
 * not unit re-validation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { AI_GOVERNANCE_V2: false as boolean },
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

describe("B-W1-001 — isAiGovernanceV2Enabled", () => {
  beforeEach(() => {
    vi.resetModules();
    mockEnv.AI_GOVERNANCE_V2 = false;
  });

  it("returns false when env.AI_GOVERNANCE_V2 is false (default OFF)", async () => {
    mockEnv.AI_GOVERNANCE_V2 = false;
    const { isAiGovernanceV2Enabled } = await import(
      "@/lib/flags/ai-governance"
    );
    expect(isAiGovernanceV2Enabled).toBeTypeOf("function");
    expect(isAiGovernanceV2Enabled()).toBe(false);
  });

  it("returns true when env.AI_GOVERNANCE_V2 is true", async () => {
    mockEnv.AI_GOVERNANCE_V2 = true;
    const { isAiGovernanceV2Enabled } = await import(
      "@/lib/flags/ai-governance"
    );
    expect(isAiGovernanceV2Enabled()).toBe(true);
  });

  it("re-evaluates env on each call (no caching of result)", async () => {
    mockEnv.AI_GOVERNANCE_V2 = false;
    const { isAiGovernanceV2Enabled } = await import(
      "@/lib/flags/ai-governance"
    );
    expect(isAiGovernanceV2Enabled()).toBe(false);

    mockEnv.AI_GOVERNANCE_V2 = true;
    expect(isAiGovernanceV2Enabled()).toBe(true);

    mockEnv.AI_GOVERNANCE_V2 = false;
    expect(isAiGovernanceV2Enabled()).toBe(false);
  });

  it("returns a boolean (not a string)", async () => {
    mockEnv.AI_GOVERNANCE_V2 = true;
    const { isAiGovernanceV2Enabled } = await import(
      "@/lib/flags/ai-governance"
    );
    const result = isAiGovernanceV2Enabled();
    expect(typeof result).toBe("boolean");
  });
});
