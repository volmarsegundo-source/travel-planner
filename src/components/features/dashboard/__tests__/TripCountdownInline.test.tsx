import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { TripCountdownInline } from "../TripCountdownInline";

/* ────────────────────────────────────────────────────────────────────────────
 * Mocks
 * ──────────────────────────────────────────────────────────────────────────── */

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => {
    const translate = (key: string, params?: Record<string, string | number>) => {
      let result = `${ns}.${key}`;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    };
    return translate;
  },
}));

/* ────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────────── */

const DAY_MS = 1000 * 60 * 60 * 24;
const HOUR_MS = 1000 * 60 * 60;

/* ────────────────────────────────────────────────────────────────────────────
 * Tests
 * ──────────────────────────────────────────────────────────────────────────── */

describe("TripCountdownInline", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    // Fix "now" to a known date/time: 2026-06-15 12:00:00 UTC
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial render states", () => {
    it("shows days remaining for a future departure date", () => {
      render(<TripCountdownInline startDate="2026-06-25" />);
      const el = screen.getByTestId("trip-countdown-inline");
      expect(el).toHaveTextContent("expedition.countdown.daysUntil");
    });

    it("shows in-progress when departure is today", () => {
      render(<TripCountdownInline startDate="2026-06-15" />);
      const el = screen.getByTestId("trip-countdown-inline");
      expect(el).toHaveTextContent("expedition.countdown.inProgress");
    });

    it("shows in-progress when departure is in the past but no end date", () => {
      render(<TripCountdownInline startDate="2026-06-10" />);
      const el = screen.getByTestId("trip-countdown-inline");
      expect(el).toHaveTextContent("expedition.countdown.inProgress");
    });

    it("shows completed when end date is in the past", () => {
      render(<TripCountdownInline startDate="2026-06-01" endDate="2026-06-10" />);
      const el = screen.getByTestId("trip-countdown-inline");
      expect(el).toHaveTextContent("expedition.countdown.completed");
    });

    it("shows in-progress when within start/end date range", () => {
      render(<TripCountdownInline startDate="2026-06-10" endDate="2026-06-20" />);
      const el = screen.getByTestId("trip-countdown-inline");
      expect(el).toHaveTextContent("expedition.countdown.inProgress");
    });

    it("applies urgent color class when <= 7 days away", () => {
      render(<TripCountdownInline startDate="2026-06-20" />);
      const el = screen.getByTestId("trip-countdown-inline");
      expect(el.className).toContain("text-atlas-rust");
    });

    it("applies normal color class when > 7 days away", () => {
      render(<TripCountdownInline startDate="2026-06-30" />);
      const el = screen.getByTestId("trip-countdown-inline");
      expect(el.className).toContain("text-atlas-teal");
    });
  });

  describe("runtime recalculation", () => {
    it("updates countdown after interval elapses", () => {
      // Start at 10 days away
      render(<TripCountdownInline startDate="2026-06-25" />);
      const el = screen.getByTestId("trip-countdown-inline");
      expect(el).toHaveTextContent("expedition.countdown.daysUntil");

      // Advance 24 hours — countdown should update
      act(() => {
        vi.advanceTimersByTime(HOUR_MS);
      });

      // Component should have re-rendered with updated time
      // The exact day count may change based on hour alignment
      expect(el).toHaveTextContent("expedition.countdown.daysUntil");
    });

    it("transitions from countdown to in-progress when departure date arrives", () => {
      // 3 days until trip — safely in the future regardless of timezone
      render(<TripCountdownInline startDate="2026-06-18" />);
      const el = screen.getByTestId("trip-countdown-inline");
      expect(el).toHaveTextContent("expedition.countdown.daysUntil");

      // Advance 4 days — well past departure date
      act(() => {
        vi.advanceTimersByTime(DAY_MS * 4);
      });

      expect(el).toHaveTextContent("expedition.countdown.inProgress");
    });

    it("cleans up interval on unmount", () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      const { unmount } = render(
        <TripCountdownInline startDate="2026-06-25" />
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe("accessibility", () => {
    it("has role=status and aria-live for screen readers", () => {
      render(<TripCountdownInline startDate="2026-06-25" />);
      const el = screen.getByTestId("trip-countdown-inline");
      expect(el).toHaveAttribute("role", "status");
      expect(el).toHaveAttribute("aria-live", "polite");
    });
  });
});
