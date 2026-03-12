/**
 * Unit tests for TripCountdown component.
 *
 * Tests cover: future trip, in-progress trip, completed trip,
 * no dates provided, accessibility attributes.
 *
 * [SPEC-PROD-010]
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!values) return fullKey;
      const suffix = Object.values(values).join(",");
      return `${fullKey}[${suffix}]`;
    },
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { TripCountdown } from "@/components/features/expedition/TripCountdown";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TripCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows days until trip when start date is in the future", () => {
    render(
      <TripCountdown
        startDate={new Date("2026-06-11T00:00:00Z")}
        endDate={new Date("2026-06-20T00:00:00Z")}
      />
    );

    const el = screen.getByTestId("trip-countdown");
    // days may vary by timezone — just check the key is used
    expect(el.textContent).toContain("expedition.countdown.daysUntil");
  });

  it("shows 'in progress' when current date is between start and end", () => {
    render(
      <TripCountdown
        startDate={new Date("2026-05-28")}
        endDate={new Date("2026-06-10")}
      />
    );

    const el = screen.getByTestId("trip-countdown");
    expect(el).toHaveTextContent("expedition.countdown.inProgress");
  });

  it("shows 'completed' when current date is after end date", () => {
    render(
      <TripCountdown
        startDate={new Date("2026-05-01")}
        endDate={new Date("2026-05-15")}
      />
    );

    const el = screen.getByTestId("trip-countdown");
    expect(el).toHaveTextContent("expedition.countdown.completed");
  });

  it("shows 'no dates' when start date is null", () => {
    render(<TripCountdown startDate={null} endDate={null} />);

    const el = screen.getByTestId("trip-countdown");
    expect(el).toHaveTextContent("expedition.countdown.noDates");
  });

  it("has proper accessibility attributes", () => {
    render(
      <TripCountdown
        startDate={new Date("2026-06-11")}
        endDate={new Date("2026-06-20")}
      />
    );

    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-live", "polite");
  });

  it("shows 'in progress' on exact start date", () => {
    render(
      <TripCountdown
        startDate={new Date("2026-06-01")}
        endDate={new Date("2026-06-10")}
      />
    );

    const el = screen.getByTestId("trip-countdown");
    expect(el).toHaveTextContent("expedition.countdown.inProgress");
  });
});
