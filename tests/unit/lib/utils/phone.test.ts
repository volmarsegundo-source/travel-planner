import { describe, it, expect } from "vitest";
import {
  formatBrazilianPhone,
  isValidBrazilianPhone,
} from "@/lib/utils/phone";

// ─── formatBrazilianPhone ───────────────────────────────────────────────────

describe("formatBrazilianPhone", () => {
  it("returns empty string for empty input", () => {
    expect(formatBrazilianPhone("")).toBe("");
  });

  it("formats 1 digit with opening parenthesis", () => {
    expect(formatBrazilianPhone("1")).toBe("(1");
  });

  it("formats 2 digits as area code", () => {
    expect(formatBrazilianPhone("11")).toBe("(11");
  });

  it("formats 3 digits with area code and space", () => {
    expect(formatBrazilianPhone("119")).toBe("(11) 9");
  });

  it("formats 7 digits as partial number", () => {
    expect(formatBrazilianPhone("1199999")).toBe("(11) 99999");
  });

  it("formats 10 digits as landline (XX) XXXX-XXXX", () => {
    expect(formatBrazilianPhone("1133334444")).toBe("(11) 33334-444");
  });

  it("formats 11 digits as mobile (XX) XXXXX-XXXX", () => {
    expect(formatBrazilianPhone("11999998888")).toBe("(11) 99999-8888");
  });

  it("truncates input beyond 11 digits", () => {
    expect(formatBrazilianPhone("119999988881234")).toBe("(11) 99999-8888");
  });

  it("strips non-digit characters before formatting", () => {
    expect(formatBrazilianPhone("(11) 99999-8888")).toBe("(11) 99999-8888");
  });

  it("handles mixed input with letters", () => {
    expect(formatBrazilianPhone("11abc99999def8888")).toBe("(11) 99999-8888");
  });

  it("formats a string of only non-digit characters as empty", () => {
    expect(formatBrazilianPhone("abc")).toBe("");
  });

  it("formats pre-formatted input correctly (idempotent for 11 digits)", () => {
    const formatted = formatBrazilianPhone("(11) 99999-8888");
    expect(formatBrazilianPhone(formatted)).toBe("(11) 99999-8888");
  });
});

// ─── isValidBrazilianPhone ──────────────────────────────────────────────────

describe("isValidBrazilianPhone", () => {
  it("returns true for empty string (optional field)", () => {
    expect(isValidBrazilianPhone("")).toBe(true);
  });

  it("returns true for whitespace-only string", () => {
    expect(isValidBrazilianPhone("   ")).toBe(true);
  });

  it("returns true for 10-digit landline", () => {
    expect(isValidBrazilianPhone("1133334444")).toBe(true);
  });

  it("returns true for 11-digit mobile", () => {
    expect(isValidBrazilianPhone("11999998888")).toBe(true);
  });

  it("returns true for formatted 11-digit mobile", () => {
    expect(isValidBrazilianPhone("(11) 99999-8888")).toBe(true);
  });

  it("returns true for formatted 10-digit landline", () => {
    expect(isValidBrazilianPhone("(11) 3333-4444")).toBe(true);
  });

  it("returns false for 9 digits (too short)", () => {
    expect(isValidBrazilianPhone("113334444")).toBe(false);
  });

  it("returns false for 12 digits (too long)", () => {
    expect(isValidBrazilianPhone("119999988889")).toBe(false);
  });

  it("returns false for single digit", () => {
    expect(isValidBrazilianPhone("1")).toBe(false);
  });

  it("returns true for null-ish undefined (optional)", () => {
    expect(isValidBrazilianPhone("")).toBe(true);
  });
});
