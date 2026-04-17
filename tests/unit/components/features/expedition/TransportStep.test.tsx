/**
 * Unit tests for TransportStep component.
 * T-S21-002: Base transport step tests.
 * T-S34-003: Ida/Volta toggle, undecided checkbox, required asterisks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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
  useLocale: () => "en",
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { TransportStep } from "@/components/features/expedition/TransportStep";
import type { TransportSegmentInput } from "@/lib/validations/transport.schema";
import { MAX_TRANSPORT_SEGMENTS } from "@/lib/validations/transport.schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
  tripId: "trip-test-1",
  onSave: vi.fn().mockResolvedValue(undefined),
  saving: false,
};

function makeSegment(
  overrides: Partial<TransportSegmentInput> = {}
): TransportSegmentInput {
  return {
    transportType: "flight",
    segmentOrder: 0,
    isReturn: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TransportStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with one empty segment by default", () => {
    render(<TransportStep {...defaultProps} />);

    // Title should be visible
    expect(
      screen.getByText("expedition.phase4.transport.title")
    ).toBeInTheDocument();

    // One segment card
    expect(
      screen.getByText("expedition.phase4.transport.segment[1]")
    ).toBeInTheDocument();

    // Transport type radio group should exist
    expect(
      screen.getByText("expedition.phase4.transport.types.flight")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.transport.types.bus")
    ).toBeInTheDocument();
  });

  it("renders with initial segments when provided", () => {
    render(
      <TransportStep
        {...defaultProps}
        initialSegments={[
          makeSegment({ segmentOrder: 0 }),
          makeSegment({ transportType: "bus", segmentOrder: 1 }),
        ]}
      />
    );

    expect(
      screen.getByText("expedition.phase4.transport.segment[1]")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.transport.segment[2]")
    ).toBeInTheDocument();
  });

  it("adds a new segment when add button is clicked", () => {
    render(<TransportStep {...defaultProps} />);

    // Initially 1 segment
    expect(
      screen.getByText("expedition.phase4.transport.segment[1]")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("expedition.phase4.transport.segment[2]")
    ).not.toBeInTheDocument();

    // Click add
    fireEvent.click(
      screen.getByText("expedition.phase4.transport.addSegment")
    );

    // Now 2 segments
    expect(
      screen.getByText("expedition.phase4.transport.segment[2]")
    ).toBeInTheDocument();
  });

  it("removes a segment when remove button is clicked", () => {
    render(
      <TransportStep
        {...defaultProps}
        initialSegments={[
          makeSegment({ segmentOrder: 0 }),
          makeSegment({ segmentOrder: 1 }),
        ]}
      />
    );

    // 2 segments initially
    expect(
      screen.getByText("expedition.phase4.transport.segment[1]")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase4.transport.segment[2]")
    ).toBeInTheDocument();

    // Click first remove button
    const removeButtons = screen.getAllByText(
      "expedition.phase4.transport.removeSegment"
    );
    fireEvent.click(removeButtons[0]);

    // Now 1 segment
    expect(
      screen.getByText("expedition.phase4.transport.segment[1]")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("expedition.phase4.transport.segment[2]")
    ).not.toBeInTheDocument();
  });

  it("does not show remove button when only one segment exists", () => {
    render(<TransportStep {...defaultProps} />);

    expect(
      screen.queryByText("expedition.phase4.transport.removeSegment")
    ).not.toBeInTheDocument();
  });

  it("disables add button when max segments reached", () => {
    const maxSegments = Array.from({ length: MAX_TRANSPORT_SEGMENTS }, (_, i) =>
      makeSegment({ segmentOrder: i })
    );

    render(
      <TransportStep {...defaultProps} initialSegments={maxSegments} />
    );

    // Add button should show max reached message
    expect(
      screen.getByText(
        `expedition.phase4.transport.maxReached[${MAX_TRANSPORT_SEGMENTS}]`
      )
    ).toBeInTheDocument();
  });

  it("selects transport type when type button is clicked", () => {
    render(<TransportStep {...defaultProps} />);

    // Flight is selected by default
    const flightButton = screen.getByText(
      "expedition.phase4.transport.types.flight"
    ).closest("button");
    expect(flightButton).toHaveAttribute("aria-checked", "true");

    // Click bus
    fireEvent.click(
      screen.getByText("expedition.phase4.transport.types.bus")
    );

    // Bus should now be selected
    const busButton = screen.getByText(
      "expedition.phase4.transport.types.bus"
    ).closest("button");
    expect(busButton).toHaveAttribute("aria-checked", "true");

    // Flight should no longer be selected
    expect(flightButton).toHaveAttribute("aria-checked", "false");
  });

  // ─── T-S25-006: Pre-fill with trip data ───────────────────────────────

  it("pre-fills first segment with origin, destination, and startDate", () => {
    render(
      <TransportStep
        {...defaultProps}
        prefillOrigin="São Paulo, Brazil"
        prefillDestination="Paris, France"
        prefillStartDate="2026-06-15T00:00:00Z"
      />
    );

    const departureInput = screen.getByLabelText(/expedition\.phase4\.transport\.departurePlace/);
    expect(departureInput).toHaveValue("São Paulo, Brazil");

    const arrivalInput = screen.getByLabelText(/expedition\.phase4\.transport\.arrivalPlace/);
    expect(arrivalInput).toHaveValue("Paris, France");

    const departureAtInput = screen.getByLabelText(/expedition\.phase4\.transport\.departureAt/);
    expect(departureAtInput).toHaveValue("2026-06-15T00:00");
  });

  it("does not pre-fill when initialSegments are provided", () => {
    render(
      <TransportStep
        {...defaultProps}
        initialSegments={[makeSegment({ segmentOrder: 0 })]}
        prefillOrigin="São Paulo, Brazil"
        prefillDestination="Paris, France"
        prefillStartDate="2026-06-15T00:00:00Z"
      />
    );

    const departureInput = screen.getByLabelText(/expedition\.phase4\.transport\.departurePlace/);
    expect(departureInput).toHaveValue("");
  });

  it("handles null prefill values gracefully", () => {
    render(
      <TransportStep
        {...defaultProps}
        prefillOrigin={null}
        prefillDestination={null}
        prefillStartDate={null}
      />
    );

    const departureInput = screen.getByLabelText(/expedition\.phase4\.transport\.departurePlace/);
    expect(departureInput).toHaveValue("");

    const arrivalInput = screen.getByLabelText(/expedition\.phase4\.transport\.arrivalPlace/);
    expect(arrivalInput).toHaveValue("");
  });

  // ─── T-S34: Ida/Volta toggle ──────────────────────────────────────────

  it("renders round-trip toggle with round-trip selected by default", () => {
    render(<TransportStep {...defaultProps} />);

    const roundTripOption = screen.getByTestId("round-trip-option");
    const oneWayOption = screen.getByTestId("one-way-option");

    expect(roundTripOption).toHaveAttribute("aria-checked", "true");
    expect(oneWayOption).toHaveAttribute("aria-checked", "false");
  });

  it("shows return date field in round-trip mode", () => {
    render(<TransportStep {...defaultProps} />);

    expect(screen.getByLabelText(/expedition\.phase4\.transport\.arrivalAt/)).toBeInTheDocument();
  });

  it("hides return date field when one-way is selected", () => {
    render(<TransportStep {...defaultProps} />);

    fireEvent.click(screen.getByTestId("one-way-option"));

    expect(screen.queryByLabelText(/expedition\.phase4\.transport\.arrivalAt/)).not.toBeInTheDocument();
  });

  it("toggles between one-way and round-trip", () => {
    render(<TransportStep {...defaultProps} />);

    // Switch to one-way
    fireEvent.click(screen.getByTestId("one-way-option"));
    expect(screen.getByTestId("one-way-option")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("round-trip-option")).toHaveAttribute("aria-checked", "false");

    // Switch back to round-trip
    fireEvent.click(screen.getByTestId("round-trip-option"));
    expect(screen.getByTestId("round-trip-option")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("one-way-option")).toHaveAttribute("aria-checked", "false");

    // Return date field should reappear
    expect(screen.getByLabelText(/expedition\.phase4\.transport\.arrivalAt/)).toBeInTheDocument();
  });

  // ─── Required asterisks ───────────────────────────────────────────────

  it("shows required asterisks on mandatory fields", () => {
    const { container } = render(<TransportStep {...defaultProps} />);

    const asterisks = container.querySelectorAll(".text-destructive");
    expect(asterisks.length).toBeGreaterThan(0);
  });

  // ─── No step-level save button (removed per T-S34-001d) ──────────────

  it("does not render a step-level save button", () => {
    render(<TransportStep {...defaultProps} />);

    // The old "Save Transport" button should not exist
    expect(
      screen.queryByText("expedition.phase4.transport.save")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("expedition.phase4.transport.saving")
    ).not.toBeInTheDocument();
  });
});
