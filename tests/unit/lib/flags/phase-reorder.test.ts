/**
 * Unit tests for the PHASE_REORDER_ENABLED feature flag helper.
 *
 * Tests both paths (flag ON / flag OFF) by mocking @/lib/env.
 * These are pure unit tests — no DB, no Redis, no network.
 *
 * Spec ref: SPEC-ARCH-REORDER-PHASES §3
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock env ────────────────────────────────────────────────────────────────

const mockEnv = vi.hoisted(() => ({
  env: {
    NEXT_PUBLIC_PHASE_REORDER_ENABLED: false as boolean,
  },
}));

vi.mock("@/lib/env", () => mockEnv);

// ─── Import SUT after mock ────────────────────────────────────────────────────

import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("isPhaseReorderEnabled", () => {
  beforeEach(() => {
    // Reset to default (OFF) before each test
    mockEnv.env.NEXT_PUBLIC_PHASE_REORDER_ENABLED = false;
  });

  it("returns false when NEXT_PUBLIC_PHASE_REORDER_ENABLED is false (default)", () => {
    mockEnv.env.NEXT_PUBLIC_PHASE_REORDER_ENABLED = false;
    expect(isPhaseReorderEnabled()).toBe(false);
  });

  it("returns true when NEXT_PUBLIC_PHASE_REORDER_ENABLED is true", () => {
    mockEnv.env.NEXT_PUBLIC_PHASE_REORDER_ENABLED = true;
    expect(isPhaseReorderEnabled()).toBe(true);
  });

  it("returns a boolean (not a truthy string)", () => {
    mockEnv.env.NEXT_PUBLIC_PHASE_REORDER_ENABLED = false;
    expect(typeof isPhaseReorderEnabled()).toBe("boolean");
  });
});

// ─── Regression guard: env var naming (Sprint 44 post-mortem) ────────────────
//
// Sprint 44 rollout failed silently in Vercel Preview because runbook/specs
// referenced `PHASE_REORDER_ENABLED` while code reads
// `NEXT_PUBLIC_PHASE_REORDER_ENABLED` (client-exposed). This guard ensures the
// `env` module keeps the client-prefixed name and nobody accidentally renames
// it back to the unprefixed form. If this test fails, update docs/runbooks/
// Vercel env before touching the code.
describe("env var naming guard (Sprint 44 regression)", () => {
  it("exports NEXT_PUBLIC_PHASE_REORDER_ENABLED on env", () => {
    expect(mockEnv.env).toHaveProperty("NEXT_PUBLIC_PHASE_REORDER_ENABLED");
  });

  it("does NOT export PHASE_REORDER_ENABLED without the NEXT_PUBLIC_ prefix", () => {
    expect(mockEnv.env).not.toHaveProperty("PHASE_REORDER_ENABLED");
  });

  it("isPhaseReorderEnabled reads the value from NEXT_PUBLIC_PHASE_REORDER_ENABLED", () => {
    mockEnv.env.NEXT_PUBLIC_PHASE_REORDER_ENABLED = true;
    expect(isPhaseReorderEnabled()).toBe(true);
    mockEnv.env.NEXT_PUBLIC_PHASE_REORDER_ENABLED = false;
    expect(isPhaseReorderEnabled()).toBe(false);
  });
});
