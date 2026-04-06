/**
 * Unit tests for PolicyEngine.
 *
 * Tests cover:
 * - All policies pass -> allowed
 * - First policy blocks -> short-circuits
 * - Second policy blocks -> returns correct blockedBy
 * - No policies registered -> allowed
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PolicyEngine,
  type AiPolicy,
  type PolicyContext,
  type PolicyResult,
} from "@/server/services/ai-governance/policy-engine";

vi.mock("server-only", () => ({}));

vi.unmock("@/server/services/ai-governance/policy-engine");
vi.unmock("@/server/services/ai-governance/policies");

const ctx: PolicyContext = { phase: "plan", userId: "user-1" };

function makePolicy(
  name: string,
  result: PolicyResult,
): AiPolicy {
  return {
    name,
    evaluate: vi.fn().mockResolvedValue(result),
  };
}

beforeEach(() => {
  PolicyEngine._reset();
});

describe("PolicyEngine", () => {
  it("returns allowed when all policies pass", async () => {
    PolicyEngine.register(makePolicy("a", { allowed: true }));
    PolicyEngine.register(makePolicy("b", { allowed: true }));

    const result = await PolicyEngine.evaluate(ctx);
    expect(result).toEqual({ allowed: true });
  });

  it("returns allowed when no policies are registered", async () => {
    const result = await PolicyEngine.evaluate(ctx);
    expect(result).toEqual({ allowed: true });
  });

  it("short-circuits when the first policy blocks", async () => {
    const blockPolicy = makePolicy("blocker", {
      allowed: false,
      blockedBy: "blocker",
      reason: "blocked",
    });
    const secondPolicy = makePolicy("second", { allowed: true });

    PolicyEngine.register(blockPolicy);
    PolicyEngine.register(secondPolicy);

    const result = await PolicyEngine.evaluate(ctx);

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("blocker");
    expect(secondPolicy.evaluate).not.toHaveBeenCalled();
  });

  it("returns correct blockedBy when the second policy blocks", async () => {
    const passPolicy = makePolicy("pass", { allowed: true });
    const blockPolicy = makePolicy("cost_budget", {
      allowed: false,
      blockedBy: "cost_budget",
      reason: "over budget",
    });

    PolicyEngine.register(passPolicy);
    PolicyEngine.register(blockPolicy);

    const result = await PolicyEngine.evaluate(ctx);

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("cost_budget");
    expect(passPolicy.evaluate).toHaveBeenCalledWith(ctx);
    expect(blockPolicy.evaluate).toHaveBeenCalledWith(ctx);
  });
});
