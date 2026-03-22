import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormDirty, _djb2Hash } from "../useFormDirty";

// ─── djb2Hash unit tests ─────────────────────────────────────────────────────

describe("djb2Hash", () => {
  it("returns a consistent hash for the same input", () => {
    const hash1 = _djb2Hash("hello world");
    const hash2 = _djb2Hash("hello world");
    expect(hash1).toBe(hash2);
  });

  it("returns different hashes for different inputs", () => {
    const hash1 = _djb2Hash("hello");
    const hash2 = _djb2Hash("world");
    expect(hash1).not.toBe(hash2);
  });

  it("returns a non-negative 32-bit integer", () => {
    const hash = _djb2Hash("test string");
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });

  it("handles empty string", () => {
    const hash = _djb2Hash("");
    expect(hash).toBe(5381); // djb2 starting value
  });

  it("produces different hashes for strings that differ by one character", () => {
    const hash1 = _djb2Hash("abc");
    const hash2 = _djb2Hash("abd");
    expect(hash1).not.toBe(hash2);
  });
});

// ─── useFormDirty hook tests ─────────────────────────────────────────────────

describe("useFormDirty", () => {
  it("starts with isDirty = false when values are unchanged", () => {
    const { result } = renderHook(() =>
      useFormDirty({ name: "Alice", age: 30 }),
    );
    expect(result.current.isDirty).toBe(false);
  });

  it("reports isDirty = true when values change", () => {
    const { result, rerender } = renderHook(
      ({ values }) => useFormDirty(values),
      { initialProps: { values: { name: "Alice" } as Record<string, unknown> } },
    );

    expect(result.current.isDirty).toBe(false);

    rerender({ values: { name: "Bob" } });
    expect(result.current.isDirty).toBe(true);
  });

  it("reports isDirty = false when values revert to initial", () => {
    const { result, rerender } = renderHook(
      ({ values }) => useFormDirty(values),
      { initialProps: { values: { name: "Alice" } as Record<string, unknown> } },
    );

    rerender({ values: { name: "Bob" } });
    expect(result.current.isDirty).toBe(true);

    rerender({ values: { name: "Alice" } });
    expect(result.current.isDirty).toBe(false);
  });

  it("resetDirty sets the baseline to the current hash", () => {
    const { result, rerender } = renderHook(
      ({ values }) => useFormDirty(values),
      { initialProps: { values: { name: "Alice" } as Record<string, unknown> } },
    );

    rerender({ values: { name: "Bob" } });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.resetDirty();
    });

    expect(result.current.isDirty).toBe(false);

    // Going back to original now shows dirty (baseline moved to "Bob")
    rerender({ values: { name: "Alice" } });
    expect(result.current.isDirty).toBe(true);
  });

  it("markClean is an alias for resetDirty", () => {
    const { result, rerender } = renderHook(
      ({ values }) => useFormDirty(values),
      { initialProps: { values: { x: 1 } as Record<string, unknown> } },
    );

    rerender({ values: { x: 2 } });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.markClean();
    });

    expect(result.current.isDirty).toBe(false);
  });

  it("serialization is key-order independent", () => {
    const { result: result1 } = renderHook(() =>
      useFormDirty({ a: 1, b: 2 }),
    );
    const { result: result2 } = renderHook(() =>
      useFormDirty({ b: 2, a: 1 }),
    );

    expect(result1.current.currentHash).toBe(result2.current.currentHash);
  });

  it("tracks nested object changes via serialization", () => {
    const { result, rerender } = renderHook(
      ({ values }) => useFormDirty(values),
      {
        initialProps: {
          values: { data: JSON.stringify({ x: 1 }) } as Record<string, unknown>,
        },
      },
    );

    expect(result.current.isDirty).toBe(false);

    rerender({ values: { data: JSON.stringify({ x: 2 }) } });
    expect(result.current.isDirty).toBe(true);
  });

  it("exposes initialHash and currentHash for debugging", () => {
    const { result, rerender } = renderHook(
      ({ values }) => useFormDirty(values),
      { initialProps: { values: { v: "a" } as Record<string, unknown> } },
    );

    const initialHash = result.current.initialHash;
    expect(initialHash).toBe(result.current.currentHash);

    rerender({ values: { v: "b" } });
    expect(result.current.currentHash).not.toBe(initialHash);
    expect(result.current.initialHash).toBe(initialHash);
  });
});
