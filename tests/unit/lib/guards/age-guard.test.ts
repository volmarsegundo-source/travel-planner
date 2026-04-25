import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { canUseAI, getAgeRestrictionMessage } from "@/lib/guards/age-guard";

describe("age-guard", () => {
  // Use a fixed "today" for deterministic tests
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // canUseAI tests — D-02 (Sprint 46) F-02 MEDIUM closure: null/undefined
  // birthDate now returns FALSE (fail-closed). See src/lib/guards/age-guard.ts.
  // Detailed warn-log assertions live in src/lib/guards/__tests__/age-guard.test.ts.
  it("returns false when birthDate is null (D-02 fail-closed)", () => {
    expect(canUseAI(null)).toBe(false);
  });

  it("returns false when birthDate is undefined (D-02 fail-closed)", () => {
    expect(canUseAI(undefined)).toBe(false);
  });

  it("returns true for user exactly 18 years old today", () => {
    expect(canUseAI(new Date("2008-03-06"))).toBe(true);
  });

  it("returns true for user over 18", () => {
    expect(canUseAI(new Date("2000-01-15"))).toBe(true);
  });

  it("returns false for user under 18", () => {
    expect(canUseAI(new Date("2010-06-15"))).toBe(false);
  });

  it("returns false for user turning 18 tomorrow", () => {
    expect(canUseAI(new Date("2008-03-07"))).toBe(false);
  });

  it("returns true for user who turned 18 yesterday", () => {
    expect(canUseAI(new Date("2008-03-05"))).toBe(true);
  });

  it("returns true for very old user", () => {
    expect(canUseAI(new Date("1950-01-01"))).toBe(true);
  });

  it("returns false for newborn", () => {
    expect(canUseAI(new Date("2026-01-01"))).toBe(false);
  });

  // getAgeRestrictionMessage tests
  it("returns correct i18n key", () => {
    expect(getAgeRestrictionMessage()).toBe("errors.aiAgeRestricted");
  });
});
