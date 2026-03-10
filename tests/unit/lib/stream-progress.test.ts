/**
 * Unit tests for stream progress utilities (T-S19-001a).
 *
 * Tests cover:
 * - getProgressPhase: time-based phase transitions
 * - getProgressMessageKey: i18n key mapping
 * - countDaysInStream: partial JSON day extraction
 * - calculateTotalDays: date range calculation
 * - calculateProgressPercent: progress bar percentage
 */
import { describe, it, expect } from "vitest";
import {
  getProgressPhase,
  getProgressMessageKey,
  countDaysInStream,
  calculateTotalDays,
  calculateProgressPercent,
} from "@/lib/utils/stream-progress";

describe("stream-progress", () => {
  // ─── getProgressPhase ──────────────────────────────────────────────────

  describe("getProgressPhase", () => {
    it("returns 'analyzing' for 0-5s", () => {
      expect(getProgressPhase(0)).toBe("analyzing");
      expect(getProgressPhase(2000)).toBe("analyzing");
      expect(getProgressPhase(4999)).toBe("analyzing");
    });

    it("returns 'planning' for 5-15s", () => {
      expect(getProgressPhase(5000)).toBe("planning");
      expect(getProgressPhase(10000)).toBe("planning");
      expect(getProgressPhase(14999)).toBe("planning");
    });

    it("returns 'optimizing' for 15-30s", () => {
      expect(getProgressPhase(15000)).toBe("optimizing");
      expect(getProgressPhase(20000)).toBe("optimizing");
      expect(getProgressPhase(29999)).toBe("optimizing");
    });

    it("returns 'almostDone' for 30s+", () => {
      expect(getProgressPhase(30000)).toBe("almostDone");
      expect(getProgressPhase(60000)).toBe("almostDone");
    });
  });

  // ─── getProgressMessageKey ─────────────────────────────────────────────

  describe("getProgressMessageKey", () => {
    it("maps each phase to the correct i18n key", () => {
      expect(getProgressMessageKey("analyzing")).toBe("progressAnalyzing");
      expect(getProgressMessageKey("planning")).toBe("progressPlanning");
      expect(getProgressMessageKey("optimizing")).toBe("progressOptimizing");
      expect(getProgressMessageKey("almostDone")).toBe("progressAlmostDone");
    });
  });

  // ─── countDaysInStream ────────────────────────────────────────────────

  describe("countDaysInStream", () => {
    it("returns 0 for empty string", () => {
      expect(countDaysInStream("")).toBe(0);
    });

    it("returns 0 for text without dayNumber", () => {
      expect(countDaysInStream('{"destination":"Paris"}')).toBe(0);
    });

    it("counts single dayNumber occurrence", () => {
      const json = '{"days":[{"dayNumber":1,"theme":"Arrival"}]}';
      expect(countDaysInStream(json)).toBe(1);
    });

    it("counts multiple dayNumber occurrences", () => {
      const json = '{"days":[{"dayNumber":1},{"dayNumber":2},{"dayNumber":3}]}';
      expect(countDaysInStream(json)).toBe(3);
    });

    it("handles partial/incomplete JSON with dayNumber", () => {
      const partial = '{"days":[{"dayNumber":1,"theme":"Day 1","activities":[...]},{"dayNumber":2,"the';
      expect(countDaysInStream(partial)).toBe(2);
    });

    it("handles whitespace variations around dayNumber", () => {
      const json = '{"dayNumber" : 1}{"dayNumber":2}';
      expect(countDaysInStream(json)).toBe(2);
    });
  });

  // ─── calculateTotalDays ───────────────────────────────────────────────

  describe("calculateTotalDays", () => {
    it("calculates correct days for a 5-day trip", () => {
      expect(calculateTotalDays("2026-06-01", "2026-06-05")).toBe(5);
    });

    it("returns 1 for same-day trip", () => {
      expect(calculateTotalDays("2026-06-01", "2026-06-01")).toBe(1);
    });

    it("returns 1 for invalid date range (end before start)", () => {
      expect(calculateTotalDays("2026-06-05", "2026-06-01")).toBe(1);
    });

    it("calculates correctly for month-long trip", () => {
      expect(calculateTotalDays("2026-06-01", "2026-06-30")).toBe(30);
    });
  });

  // ─── calculateProgressPercent ─────────────────────────────────────────

  describe("calculateProgressPercent", () => {
    it("returns 0 when no days generated", () => {
      expect(calculateProgressPercent(0, 5)).toBe(0);
    });

    it("returns correct percentage for partial progress", () => {
      expect(calculateProgressPercent(2, 5)).toBe(40);
    });

    it("caps at 95% even when all days are generated", () => {
      expect(calculateProgressPercent(5, 5)).toBe(95);
    });

    it("returns 0 when totalDays is 0", () => {
      expect(calculateProgressPercent(3, 0)).toBe(0);
    });

    it("handles more days generated than expected", () => {
      expect(calculateProgressPercent(7, 5)).toBe(95);
    });
  });
});
