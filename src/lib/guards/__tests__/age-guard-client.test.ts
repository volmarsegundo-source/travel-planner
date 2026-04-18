import { describe, it, expect, vi, afterEach } from "vitest";
import { calculateAge, isMinor } from "../age-guard.client";

describe("age-guard.client", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("calculateAge", () => {
    it("returns correct age for someone who turned 18 earlier this year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

      // Born 2008-01-15 → turned 18 on 2026-01-15
      expect(calculateAge(new Date("2008-01-15T00:00:00Z"))).toBe(18);
    });

    it("returns 17 for someone turning 18 later this year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

      // Born 2008-12-01 → still 17 on 2026-06-15
      expect(calculateAge(new Date("2008-12-01T00:00:00Z"))).toBe(17);
    });

    it("returns correct age for someone well over 18", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

      expect(calculateAge(new Date("1990-01-01T00:00:00Z"))).toBe(36);
    });

    it("returns 0 for a baby born this year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

      expect(calculateAge(new Date("2026-02-01T00:00:00Z"))).toBe(0);
    });

    it("handles string date input", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

      // Born 2008-01-15 → 18 on 2026-06-15
      expect(calculateAge("2008-01-15T00:00:00Z")).toBe(18);
    });

    it("returns null for null input", () => {
      expect(calculateAge(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(calculateAge(undefined)).toBeNull();
    });
  });

  describe("isMinor", () => {
    it("returns true for age 17 (birthday not yet reached)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

      // Born 2009-07-01 → 16 years old on 2026-06-15
      expect(isMinor(new Date("2009-07-01T00:00:00Z"))).toBe(true);
    });

    it("returns false for age 18 (birthday already passed)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

      // Born 2008-01-01 → 18 years old on 2026-06-15
      expect(isMinor(new Date("2008-01-01T00:00:00Z"))).toBe(false);
    });

    it("returns false for age 25", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));

      expect(isMinor(new Date("2001-01-01T00:00:00Z"))).toBe(false);
    });

    it("returns false when birthDate is null (no restriction without data)", () => {
      expect(isMinor(null)).toBe(false);
    });

    it("returns false when birthDate is undefined", () => {
      expect(isMinor(undefined)).toBe(false);
    });
  });
});
