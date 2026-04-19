import { describe, it, expect } from "vitest";
import { isAdult, canUseAI } from "../age-guard";

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

describe("canUseAI — regression after refactor (SPEC-AUTH-AGE-001)", () => {
  it("returns true when birthDate is null (permissive for legacy users)", () => {
    expect(canUseAI(null)).toBe(true);
  });

  it("returns true for an adult", () => {
    const dob = new Date("2000-01-01");
    expect(canUseAI(dob)).toBe(true);
  });
});
