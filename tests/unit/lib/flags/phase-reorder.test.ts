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
