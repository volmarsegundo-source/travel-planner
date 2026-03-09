import { describe, it, expect } from "vitest";
import { hashUserId } from "@/lib/hash";

describe("hashUserId", () => {
  it("produces consistent output for the same input", () => {
    const id = "clx123abc456def";
    expect(hashUserId(id)).toBe(hashUserId(id));
  });

  it("returns a 12-character hex string", () => {
    const result = hashUserId("user-id-test");
    expect(result).toHaveLength(12);
    expect(result).toMatch(/^[0-9a-f]{12}$/);
  });

  it("output is not the original userId", () => {
    const id = "clx123abc456def";
    const hashed = hashUserId(id);
    expect(hashed).not.toBe(id);
    expect(id).not.toContain(hashed);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = hashUserId("user-1");
    const hash2 = hashUserId("user-2");
    expect(hash1).not.toBe(hash2);
  });

  it("is synchronous (no async/await needed)", () => {
    // The function should return a string directly, not a Promise
    const result = hashUserId("sync-test");
    expect(typeof result).toBe("string");
    expect(result).not.toBeInstanceOf(Promise);
  });
});
