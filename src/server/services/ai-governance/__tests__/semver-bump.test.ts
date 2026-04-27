/**
 * B-W2-002 — bumpSemverPatch unit tests.
 *
 * Asserts the real semver patch arithmetic (replaces the B-W2-001 stub):
 *   - "1.2.5" → "1.2.6"
 *   - "1.0.0" → "1.0.1"
 *   - rejects malformed inputs (throws)
 *   - rejects null / undefined / empty (throws)
 *   - preserves major.minor (only patch advances)
 *
 * SPEC-ARCH-AI-GOVERNANCE-V2 §5.1 — "auto-incrementado: 1.1.0 → 1.2.0"
 * (the SPEC mentions minor in the example, but §B.2 of the execution plan
 * specifies "semver patch bump"; the contract followed here is patch).
 */
import { describe, it, expect } from "vitest";

vi.mock("server-only", () => ({}));

import { vi } from "vitest";

describe("B-W2-002 — bumpSemverPatch", () => {
  it("increments the patch component by 1", async () => {
    const { bumpSemverPatch } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    expect(bumpSemverPatch("1.0.0")).toBe("1.0.1");
    expect(bumpSemverPatch("1.2.5")).toBe("1.2.6");
    expect(bumpSemverPatch("0.0.0")).toBe("0.0.1");
    expect(bumpSemverPatch("9.9.9")).toBe("9.9.10");
  });

  it("preserves major and minor components", async () => {
    const { bumpSemverPatch } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    expect(bumpSemverPatch("3.4.0")).toBe("3.4.1");
    expect(bumpSemverPatch("12.34.56")).toBe("12.34.57");
  });

  it("throws on malformed input (non-semver string)", async () => {
    const { bumpSemverPatch } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    expect(() => bumpSemverPatch("1.0")).toThrow();
    expect(() => bumpSemverPatch("1.0.0.0")).toThrow();
    expect(() => bumpSemverPatch("1.0.x")).toThrow();
    expect(() => bumpSemverPatch("v1.0.0")).toThrow();
    expect(() => bumpSemverPatch("not-a-version")).toThrow();
  });

  it("throws on null, undefined, or empty input", async () => {
    const { bumpSemverPatch } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    expect(() => bumpSemverPatch(null)).toThrow();
    expect(() => bumpSemverPatch(undefined)).toThrow();
    expect(() => bumpSemverPatch("")).toThrow();
  });

  it("rejects negative numbers and leading zeros", async () => {
    const { bumpSemverPatch } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    expect(() => bumpSemverPatch("-1.0.0")).toThrow();
    expect(() => bumpSemverPatch("1.-1.0")).toThrow();
    expect(() => bumpSemverPatch("01.0.0")).toThrow();
    expect(() => bumpSemverPatch("1.02.0")).toThrow();
  });

  it("rejects values that would overflow Number.MAX_SAFE_INTEGER on patch", async () => {
    const { bumpSemverPatch } = await import(
      "@/server/services/ai-governance/prompt-admin.service"
    );
    const max = String(Number.MAX_SAFE_INTEGER);
    expect(() => bumpSemverPatch(`1.0.${max}`)).toThrow();
  });
});
