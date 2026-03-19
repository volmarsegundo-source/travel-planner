/**
 * Unit tests for TripReport component — Sprint 32.
 *
 * Tests cover: enum translation via tEnums() for tripType, travelerType,
 * accommodationStyle; passenger detail rendering; budget display; pending
 * required items warning.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!values) return fullKey;
      const suffix = Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
      return `${fullKey}[${suffix}]`;
    },
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { TripReport } from "@/components/features/expedition/TripReport";
import type { TripReportDTO } from "@/server/services/report-generation.service";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function buildMinimalReport(overrides?: Partial<TripReportDTO>): TripReportDTO {
  return {
    tripId: "trip-1",
    tripTitle: "Tokyo Adventure",
    generatedAt: "2026-03-19T12:00:00Z",
    phase1: null,
    phase2: null,
    phase3: null,
    phase4: null,
    phase5: null,
    phase6: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TripReport", () => {
  // ─── Header ───────────────────────────────────────────────────────────

  it("renders trip title and generated date", () => {
    render(<TripReport data={buildMinimalReport()} />);

    expect(screen.getByTestId("report-title")).toHaveTextContent("Tokyo Adventure");
    expect(screen.getByTestId("report-generated-at")).toBeInTheDocument();
  });

  // ─── Phase 1: enum translations ──────────────────────────────────────

  it("renders tripType via tEnums translation key", () => {
    render(
      <TripReport
        data={buildMinimalReport({
          phase1: {
            destination: "Tokyo",
            origin: "Sao Paulo",
            startDate: "2026-04-01",
            endDate: "2026-04-15",
            tripType: "international",
            destinationLat: null,
            destinationLon: null,
          },
        })}
      />
    );

    const phase1 = screen.getByTestId("report-phase-1");
    // The mock returns "report.enums.tripType.international"
    expect(phase1).toHaveTextContent("report.enums.tripType.international");
  });

  it("renders destination and origin in phase 1", () => {
    render(
      <TripReport
        data={buildMinimalReport({
          phase1: {
            destination: "Paris",
            origin: "Lisboa",
            startDate: null,
            endDate: null,
            tripType: "schengen",
            destinationLat: null,
            destinationLon: null,
          },
        })}
      />
    );

    const phase1 = screen.getByTestId("report-phase-1");
    expect(phase1).toHaveTextContent("Paris");
    expect(phase1).toHaveTextContent("Lisboa");
    expect(phase1).toHaveTextContent("report.enums.tripType.schengen");
  });

  // ─── Phase 2: travelerType + accommodationStyle translations ─────────

  it("renders travelerType and accommodationStyle via tEnums", () => {
    render(
      <TripReport
        data={buildMinimalReport({
          phase2: {
            travelerType: "couple",
            accommodationStyle: "luxury",
            travelPace: null,
            budget: null,
            currency: null,
            passengers: null,
          },
        })}
      />
    );

    const phase2 = screen.getByTestId("report-phase-2");
    expect(phase2).toHaveTextContent("report.enums.travelerType.couple");
    expect(phase2).toHaveTextContent("report.enums.accommodationStyle.luxury");
  });

  it("renders travel pace when provided", () => {
    render(
      <TripReport
        data={buildMinimalReport({
          phase2: {
            travelerType: "solo",
            accommodationStyle: "budget",
            travelPace: 3,
            budget: null,
            currency: null,
            passengers: null,
          },
        })}
      />
    );

    const phase2 = screen.getByTestId("report-phase-2");
    // Mock returns "report.paceValue[value=3]"
    expect(phase2).toHaveTextContent("report.paceValue");
  });

  it("renders budget with currency when provided", () => {
    render(
      <TripReport
        data={buildMinimalReport({
          phase2: {
            travelerType: "family",
            accommodationStyle: "comfort",
            travelPace: null,
            budget: 5000,
            currency: "BRL",
            passengers: null,
          },
        })}
      />
    );

    const phase2 = screen.getByTestId("report-phase-2");
    expect(phase2).toHaveTextContent("BRL");
    // toLocaleString() output varies by environment; just verify the number is present
    expect(phase2).toHaveTextContent(/5[.,]000/);
  });

  it("renders passenger detail when provided", () => {
    render(
      <TripReport
        data={buildMinimalReport({
          phase2: {
            travelerType: "group",
            accommodationStyle: "hotel",
            travelPace: null,
            budget: null,
            currency: null,
            passengers: { adults: 2, children: 1, infants: 0, seniors: 1 },
          },
        })}
      />
    );

    const phase2 = screen.getByTestId("report-phase-2");
    // Mock returns "report.passengersDetail[adults=2,children=1,seniors=1,infants=0]"
    expect(phase2).toHaveTextContent("report.passengersDetail");
  });

  // ─── Phase 3: pending required items ─────────────────────────────────

  it("shows pending required count when checklist is incomplete", () => {
    render(
      <TripReport
        data={buildMinimalReport({
          phase3: {
            completedCount: 3,
            totalCount: 7,
            items: [
              { itemKey: "passport", required: true, completed: true, pointsValue: 10 },
              { itemKey: "visa", required: true, completed: false, pointsValue: 10 },
              { itemKey: "insurance", required: true, completed: true, pointsValue: 10 },
              { itemKey: "tickets", required: true, completed: true, pointsValue: 10 },
              { itemKey: "adapter", required: false, completed: false, pointsValue: 5 },
              { itemKey: "sunscreen", required: false, completed: false, pointsValue: 5 },
              { itemKey: "guidebook", required: false, completed: false, pointsValue: 5 },
            ],
          },
        })}
      />
    );

    const pendingWarning = screen.getByTestId("report-pending-required");
    expect(pendingWarning).toBeInTheDocument();
    // Mock returns "report.pendingRequiredCount[count=4]"
    expect(pendingWarning).toHaveTextContent("report.pendingRequiredCount");
  });

  it("does not show pending warning when all items are completed", () => {
    render(
      <TripReport
        data={buildMinimalReport({
          phase3: {
            completedCount: 2,
            totalCount: 2,
            items: [
              { itemKey: "passport", required: true, completed: true, pointsValue: 10 },
              { itemKey: "visa", required: true, completed: true, pointsValue: 10 },
            ],
          },
        })}
      />
    );

    expect(screen.queryByTestId("report-pending-required")).not.toBeInTheDocument();
  });

  // ─── Phase sections render conditionally ──────────────────────────────

  it("does not render phase sections when data is null", () => {
    render(<TripReport data={buildMinimalReport()} />);

    expect(screen.queryByTestId("report-phase-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("report-phase-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("report-phase-3")).not.toBeInTheDocument();
    expect(screen.queryByTestId("report-phase-4")).not.toBeInTheDocument();
    expect(screen.queryByTestId("report-phase-5")).not.toBeInTheDocument();
    expect(screen.queryByTestId("report-phase-6")).not.toBeInTheDocument();
  });
});
