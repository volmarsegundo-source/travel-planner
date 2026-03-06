/**
 * Unit tests for account validation schemas (T-050).
 *
 * Tests UpdateUserProfileSchema and DeleteUserAccountSchema edge cases.
 */
import { describe, it, expect } from "vitest";
import {
  UpdateUserProfileSchema,
  DeleteUserAccountSchema,
} from "@/lib/validations/account.schema";

describe("UpdateUserProfileSchema", () => {
  it("accepts valid name with minimum length", () => {
    const result = UpdateUserProfileSchema.safeParse({ name: "AB" });
    expect(result.success).toBe(true);
  });

  it("accepts valid name with maximum length", () => {
    const result = UpdateUserProfileSchema.safeParse({ name: "A".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("accepts name with preferredLocale pt-BR", () => {
    const result = UpdateUserProfileSchema.safeParse({
      name: "Test",
      preferredLocale: "pt-BR",
    });
    expect(result.success).toBe(true);
  });

  it("accepts name with preferredLocale en", () => {
    const result = UpdateUserProfileSchema.safeParse({
      name: "Test",
      preferredLocale: "en",
    });
    expect(result.success).toBe(true);
  });

  it("accepts name without preferredLocale (optional)", () => {
    const result = UpdateUserProfileSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preferredLocale).toBeUndefined();
    }
  });

  it("rejects name shorter than 2 characters", () => {
    const result = UpdateUserProfileSchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("account.errors.nameTooShort");
    }
  });

  it("rejects name longer than 100 characters", () => {
    const result = UpdateUserProfileSchema.safeParse({ name: "A".repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("account.errors.nameTooLong");
    }
  });

  it("rejects empty name", () => {
    const result = UpdateUserProfileSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported locale", () => {
    const result = UpdateUserProfileSchema.safeParse({
      name: "Test",
      preferredLocale: "fr",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("account.errors.invalidLocale");
    }
  });

  it("trims whitespace from name", () => {
    const result = UpdateUserProfileSchema.safeParse({ name: "  Test Name  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Test Name");
    }
  });

  it("rejects name that becomes too short after trimming", () => {
    const result = UpdateUserProfileSchema.safeParse({ name: " A " });
    expect(result.success).toBe(false);
  });
});

describe("DeleteUserAccountSchema", () => {
  it("accepts valid email", () => {
    const result = DeleteUserAccountSchema.safeParse({
      confirmEmail: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("lowercases the email", () => {
    const result = DeleteUserAccountSchema.safeParse({
      confirmEmail: "TEST@EXAMPLE.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confirmEmail).toBe("test@example.com");
    }
  });

  it("trims whitespace from email", () => {
    const result = DeleteUserAccountSchema.safeParse({
      confirmEmail: " test@example.com ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confirmEmail).toBe("test@example.com");
    }
  });

  it("rejects invalid email format", () => {
    const result = DeleteUserAccountSchema.safeParse({
      confirmEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("account.errors.invalidEmail");
    }
  });

  it("rejects empty email", () => {
    const result = DeleteUserAccountSchema.safeParse({ confirmEmail: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing confirmEmail field", () => {
    const result = DeleteUserAccountSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
