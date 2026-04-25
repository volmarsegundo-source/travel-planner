import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isAdult, canUseAI } from "../age-guard";
import { logger } from "@/lib/logger";

// SPEC-AUTH-AGE-001: 18+ age gate — BDD scenarios for isAdult.

describe("isAdult — SPEC-AUTH-AGE-001", () => {
  // Scenario 1: Given a person born exactly 18 years before reference date,
  // When we check isAdult, Then it returns true.
  it("returns true when exactly 18 on the reference date", () => {
    const ref = new Date("2026-04-19");
    const dob = new Date("2008-04-19");
    expect(isAdult(dob, ref)).toBe(true);
  });

  // Scenario 2: Given a person who is 17 years and 364 days old,
  // When we check isAdult, Then it returns false.
  it("returns false one day before the 18th birthday", () => {
    const ref = new Date("2026-04-19");
    const dob = new Date("2008-04-20");
    expect(isAdult(dob, ref)).toBe(false);
  });

  // Scenario 3: Given a person born on a leap day (2008-02-29),
  // When the reference date is 2026-02-28 (non-leap), Then they are still 17.
  // When the reference date is 2026-03-01, Then they are 18.
  it("handles leap-year boundary: 2008-02-29 is still 17 on 2026-02-28", () => {
    const dob = new Date("2008-02-29");
    expect(isAdult(dob, new Date("2026-02-28"))).toBe(false);
    expect(isAdult(dob, new Date("2026-03-01"))).toBe(true);
  });

  // Scenario 4: Given a DOB in the future,
  // When we check isAdult, Then it returns false.
  it("returns false for a future DOB", () => {
    const ref = new Date("2026-04-19");
    expect(isAdult(new Date("2027-01-01"), ref)).toBe(false);
  });

  it("accepts an ISO date string as input", () => {
    const ref = new Date("2026-04-19");
    expect(isAdult("2000-01-01", ref)).toBe(true);
    expect(isAdult("2020-01-01", ref)).toBe(false);
  });

  it("returns false for an invalid date string", () => {
    expect(isAdult("not-a-date", new Date("2026-04-19"))).toBe(false);
  });
});

describe("canUseAI — D-02 F-02 MEDIUM fail-closed (Sprint 46)", () => {
  // F-02 (Sprint 45 iter 7 security audit): canUseAI(null) previously
  // returned `true`, allowing accidental AI access for under-18s with
  // no birthDate. The (app)/layout already redirects null-birthDate
  // users to /auth/complete-profile, so the guard's permissive default
  // was unreachable for users coming through pages — but API routes
  // (/api/ai/*/stream) skip the layout and rely on the guard alone.
  // Fix: fail-closed default + warn log for visibility.

  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns false when birthDate is null (fail-closed; was true)", () => {
    expect(canUseAI(null)).toBe(false);
  });

  it("returns false when birthDate is undefined (fail-closed; was true)", () => {
    expect(canUseAI(undefined)).toBe(false);
  });

  it("emits a warn log when birthDate is null (visibility for caller gaps)", () => {
    canUseAI(null);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [event] = warnSpy.mock.calls[0];
    expect(event).toBe("auth.age_guard.null_birthdate");
  });

  it("emits a warn log when birthDate is undefined", () => {
    canUseAI(undefined);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("returns true for an adult (no regression)", () => {
    const dob = new Date("2000-01-01");
    expect(canUseAI(dob)).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns false for an under-18 (no regression)", () => {
    const dob = new Date("2020-01-01");
    expect(canUseAI(dob)).toBe(false);
    // Real (under-18) birthDate is NOT a missing-data condition; no warn.
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns false for an invalid date string (no regression; no warn)", () => {
    expect(canUseAI("not-a-date" as unknown as Date)).toBe(false);
    // Caller-supplied bad input — distinct from the null-birthDate case.
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warn-log payload does NOT leak any caller-supplied data", () => {
    canUseAI(null);
    const [, meta] = warnSpy.mock.calls[0] ?? [];
    // Meta may carry guard-internal context, but never the raw input
    // (null is unlikely to be sensitive, but undefined could carry an
    // env-leaked stack — keep the contract strict).
    if (meta) {
      const serialized = JSON.stringify(meta);
      expect(serialized).not.toContain("null");
      expect(serialized).not.toContain("undefined");
    }
  });
});
