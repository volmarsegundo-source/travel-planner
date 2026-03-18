import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Phase1Schema } from "@/lib/validations/expedition.schema";

describe("Phase1Schema — date validation", () => {
  const baseData = {
    destination: "Tokyo, Japan",
    flexibleDates: false,
  };

  // Fix "today" for deterministic tests
  const FIXED_TODAY = new Date("2026-03-17T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts valid future dates", () => {
    const result = Phase1Schema.safeParse({
      ...baseData,
      startDate: "2026-04-01",
      endDate: "2026-04-10",
    });
    expect(result.success).toBe(true);
  });

  it("rejects startDate in the past", () => {
    const result = Phase1Schema.safeParse({
      ...baseData,
      startDate: "2026-03-01",
      endDate: "2026-04-10",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toContain("startDate");
    }
  });

  it("rejects startDate equal to today", () => {
    const result = Phase1Schema.safeParse({
      ...baseData,
      startDate: "2026-03-17",
      endDate: "2026-03-20",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toContain("startDate");
    }
  });

  it("rejects endDate equal to today", () => {
    const result = Phase1Schema.safeParse({
      ...baseData,
      startDate: "2026-03-18",
      endDate: "2026-03-17",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat();
      expect(paths).toContain("endDate");
    }
  });

  it("rejects same startDate and endDate", () => {
    const result = Phase1Schema.safeParse({
      ...baseData,
      startDate: "2026-04-01",
      endDate: "2026-04-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("expedition.phase1.errors.sameDates");
    }
  });

  it("rejects startDate after endDate", () => {
    const result = Phase1Schema.safeParse({
      ...baseData,
      startDate: "2026-04-10",
      endDate: "2026-04-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("expedition.phase1.errors.startAfterEnd");
    }
  });

  it("accepts when no dates provided (flexible mode)", () => {
    const result = Phase1Schema.safeParse({
      ...baseData,
      flexibleDates: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts when only startDate provided", () => {
    const result = Phase1Schema.safeParse({
      ...baseData,
      startDate: "2026-04-01",
    });
    expect(result.success).toBe(true);
  });

  it("accepts tomorrow as startDate", () => {
    const result = Phase1Schema.safeParse({
      ...baseData,
      startDate: "2026-03-18",
      endDate: "2026-03-20",
    });
    expect(result.success).toBe(true);
  });

  it("rejects past endDate even with valid startDate", () => {
    const result = Phase1Schema.safeParse({
      ...baseData,
      startDate: "2026-03-18",
      endDate: "2026-03-10",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat();
      expect(paths).toContain("endDate");
    }
  });
});
