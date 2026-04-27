/**
 * B-W2-005 — token-count heuristic unit tests.
 *
 * Asserts:
 *   - empty / null / undefined → 0
 *   - small string scales by ceil(chars / 3.5)
 *   - large strings tested at canonical V-03 budget boundary
 *   - non-string input (defensive) → 0
 *   - unicode / surrogate pairs counted by .length (UTF-16 units)
 *   - estimateCombinedTokens sums correctly
 */
import { describe, it, expect } from "vitest";
import {
  estimateTokenCount,
  estimateCombinedTokens,
} from "@/lib/ai/token-count";

describe("estimateTokenCount", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokenCount("")).toBe(0);
  });

  it("returns 0 for null", () => {
    expect(estimateTokenCount(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(estimateTokenCount(undefined)).toBe(0);
  });

  it("returns 0 for non-string (defensive — no throw)", () => {
    expect(estimateTokenCount(42 as unknown as string)).toBe(0);
    expect(estimateTokenCount({} as unknown as string)).toBe(0);
  });

  it("returns 1 for a single character", () => {
    // ceil(1 / 3.5) = 1
    expect(estimateTokenCount("a")).toBe(1);
  });

  it("returns 1 for 3 characters", () => {
    // ceil(3 / 3.5) = 1
    expect(estimateTokenCount("abc")).toBe(1);
  });

  it("returns 2 for 4 characters", () => {
    // ceil(4 / 3.5) = 2
    expect(estimateTokenCount("abcd")).toBe(2);
  });

  it("returns 2 for 7 characters (boundary above 1)", () => {
    // ceil(7 / 3.5) = 2
    expect(estimateTokenCount("abcdefg")).toBe(2);
  });

  it("returns 3 for 8 characters", () => {
    // ceil(8 / 3.5) = ceil(2.285...) = 3
    expect(estimateTokenCount("abcdefgh")).toBe(3);
  });

  it("returns 4000 at the V-03 budget boundary (14000 chars)", () => {
    expect(estimateTokenCount("x".repeat(14000))).toBe(4000);
  });

  it("returns 4001 just above the V-03 budget", () => {
    // ceil(14001 / 3.5) = ceil(4000.285...) = 4001
    expect(estimateTokenCount("x".repeat(14001))).toBe(4001);
  });

  it("counts unicode by UTF-16 length (surrogate pairs count as 2 units)", () => {
    // "👋" is a surrogate pair — JS .length === 2.
    expect(estimateTokenCount("👋")).toBe(1);
    // 4 emoji = 8 UTF-16 units = ceil(8/3.5) = 3
    expect(estimateTokenCount("👋👋👋👋")).toBe(3);
  });

  it("counts CJK characters one-per-unit (over-estimating tokens, safe for V-03)", () => {
    // Chinese: each char is 1 UTF-16 unit. 4 chars → ceil(4/3.5) = 2.
    expect(estimateTokenCount("中文文字")).toBe(2);
  });
});

describe("estimateCombinedTokens", () => {
  it("sums two empty strings to 0/0/0", () => {
    expect(estimateCombinedTokens("", "")).toEqual({
      systemTokens: 0,
      userTokens: 0,
      total: 0,
    });
  });

  it("returns the per-field counts and the total", () => {
    // 7 chars → 2 tokens; 8 chars → 3 tokens.
    expect(estimateCombinedTokens("abcdefg", "abcdefgh")).toEqual({
      systemTokens: 2,
      userTokens: 3,
      total: 5,
    });
  });

  it("treats null inputs as empty", () => {
    expect(estimateCombinedTokens(null, "abc")).toEqual({
      systemTokens: 0,
      userTokens: 1,
      total: 1,
    });
  });
});
