/**
 * Unit tests for UserSignUpSchema password strength (B1/B4).
 *
 * Verifies: min 8 chars, uppercase, number, special char requirements.
 */
import { describe, it, expect } from "vitest";
import { UserSignUpSchema } from "@/lib/validations/user.schema";

describe("UserSignUpSchema — password strength (B1/B4)", () => {
  const validBase = { email: "test@example.com", name: "Test" };

  function parsePassword(password: string) {
    return UserSignUpSchema.safeParse({ ...validBase, password });
  }

  // ─── Valid passwords ─────────────────────────────────────────────────────────

  it("accepts a password meeting all criteria", () => {
    const result = parsePassword("StrongP@ss1");
    expect(result.success).toBe(true);
  });

  it("accepts a password at exactly 8 characters", () => {
    const result = parsePassword("Aa1!xxxx");
    expect(result.success).toBe(true);
  });

  it("accepts a password at 72 characters (bcrypt max)", () => {
    const longPwd = "A1!" + "a".repeat(69);
    expect(longPwd.length).toBe(72);
    const result = parsePassword(longPwd);
    expect(result.success).toBe(true);
  });

  // ─── Invalid passwords ───────────────────────────────────────────────────────

  it("rejects a password shorter than 8 characters", () => {
    const result = parsePassword("Aa1!xxx");
    expect(result.success).toBe(false);
    expect(result.error?.errors[0]?.message).toBe("auth.errors.passwordWeak");
  });

  it("rejects a password without an uppercase letter", () => {
    const result = parsePassword("nouppercase1!");
    expect(result.success).toBe(false);
    expect(result.error?.errors[0]?.message).toBe("auth.errors.passwordWeak");
  });

  it("rejects a password without a number", () => {
    const result = parsePassword("NoNumber!abc");
    expect(result.success).toBe(false);
    expect(result.error?.errors[0]?.message).toBe("auth.errors.passwordWeak");
  });

  it("rejects a password without a special character", () => {
    const result = parsePassword("NoSpecial1abc");
    expect(result.success).toBe(false);
    expect(result.error?.errors[0]?.message).toBe("auth.errors.passwordWeak");
  });

  it("rejects a password longer than 72 characters", () => {
    const longPwd = "A1!" + "a".repeat(70);
    expect(longPwd.length).toBe(73);
    const result = parsePassword(longPwd);
    expect(result.success).toBe(false);
  });

  it("rejects a password that is only numbers", () => {
    const result = parsePassword("123456789");
    expect(result.success).toBe(false);
  });

  it("rejects a password that is only lowercase + length >= 8", () => {
    const result = parsePassword("abcdefgh");
    expect(result.success).toBe(false);
  });

  it("collects all failing criteria when none are met (only lowercase)", () => {
    const result = parsePassword("abcdefgh");
    expect(result.success).toBe(false);
    // All regex checks fail — at least uppercase, number, special
    const messages = result.error?.errors.map((e) => e.message) ?? [];
    // Should have passwordWeak for each failing regex
    expect(messages.every((m) => m === "auth.errors.passwordWeak")).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(2);
  });
});
