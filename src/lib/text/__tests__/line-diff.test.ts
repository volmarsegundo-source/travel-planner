/**
 * B-W2-007 — line-diff algorithm tests.
 *
 * Asserts:
 *   - identical inputs → all "same"
 *   - empty before / empty after handled
 *   - LCS ordering preserved
 *   - line numbers labeled correctly
 *   - summarizeDiff aggregates accurately
 */
import { describe, it, expect } from "vitest";
import { lineDiff, summarizeDiff } from "@/lib/text/line-diff";

describe("lineDiff", () => {
  it("identical inputs produce only `same` ops", () => {
    const ops = lineDiff("a\nb\nc", "a\nb\nc");
    expect(ops.every((o) => o.type === "same")).toBe(true);
    expect(ops).toHaveLength(3);
  });

  it("empty before, non-empty after → adds dominate", () => {
    // "" splits to [""], "x\ny" splits to ["x","y"]. The empty line at index 0
    // of `before` may anchor or be removed depending on tiebreak; the
    // contract we assert is "add count >= 2 and at least one ADD exists".
    const ops = lineDiff("", "x\ny");
    const adds = ops.filter((o) => o.type === "add").length;
    expect(adds).toBeGreaterThanOrEqual(2);
  });

  it("non-empty before, empty after → removes dominate", () => {
    const ops = lineDiff("x\ny", "");
    const removes = ops.filter((o) => o.type === "remove").length;
    expect(removes).toBeGreaterThanOrEqual(2);
  });

  it("inserts mark `add` with rightLine set, no leftLine", () => {
    const ops = lineDiff("a\nb", "a\nMID\nb");
    const inserted = ops.find((o) => o.type === "add" && o.text === "MID");
    expect(inserted).toBeDefined();
    expect(inserted!.rightLine).toBe(2);
    expect(inserted!.leftLine).toBeUndefined();
  });

  it("removals mark `remove` with leftLine set, no rightLine", () => {
    const ops = lineDiff("a\nGONE\nb", "a\nb");
    const removed = ops.find((o) => o.type === "remove" && o.text === "GONE");
    expect(removed).toBeDefined();
    expect(removed!.leftLine).toBe(2);
    expect(removed!.rightLine).toBeUndefined();
  });

  it("`same` ops carry both leftLine and rightLine", () => {
    const ops = lineDiff("a\nb\nc", "a\nX\nb\nc");
    const sameB = ops.find((o) => o.type === "same" && o.text === "b");
    expect(sameB).toBeDefined();
    expect(sameB!.leftLine).toBe(2);
    expect(sameB!.rightLine).toBe(3);
  });

  it("preserves LCS top-to-bottom display order", () => {
    const ops = lineDiff("a\nb\nc", "a\nx\nb\ny\nc");
    const texts = ops.map((o) => o.text);
    expect(texts).toEqual(["a", "x", "b", "y", "c"]);
  });

  it("handles total replacement (no shared lines)", () => {
    const ops = lineDiff("a\nb", "x\ny");
    const removes = ops.filter((o) => o.type === "remove").length;
    const adds = ops.filter((o) => o.type === "add").length;
    expect(removes).toBe(2);
    expect(adds).toBe(2);
  });
});

describe("summarizeDiff", () => {
  it("counts each op type independently", () => {
    const ops = lineDiff("a\nb\nc\nd", "a\nx\nb\ny\nz");
    const sum = summarizeDiff(ops);
    expect(sum.same).toBeGreaterThan(0);
    expect(sum.added).toBeGreaterThan(0);
    expect(sum.removed).toBeGreaterThan(0);
    expect(sum.same + sum.added + sum.removed).toBe(ops.length);
  });

  it("identical inputs → only `same` count", () => {
    const sum = summarizeDiff(lineDiff("hi\nbye", "hi\nbye"));
    expect(sum.added).toBe(0);
    expect(sum.removed).toBe(0);
    expect(sum.same).toBe(2);
  });
});
