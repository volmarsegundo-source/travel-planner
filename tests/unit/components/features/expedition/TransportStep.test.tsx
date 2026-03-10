/**
 * Unit tests for TransportStep component (T-S21-002).
 *
 * Tests cover: empty state rendering, add segment, remove segment,
 * max 10 cap, type selection, save callback, saving state.
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

  it("calls onSave with current segments when save is clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<TransportStep {...defaultProps} onSave={onSave} />);

    fireEvent.click(
      screen.getByText("expedition.phase4.transport.save")
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    // Should be called with an array of segments
    const savedSegments = onSave.mock.calls[0][0];
    expect(Array.isArray(savedSegments)).toBe(true);
    expect(savedSegments[0].transportType).toBe("flight");
  });

  it("shows saving state when saving prop is true", () => {
    render(<TransportStep {...defaultProps} saving={true} />);

    expect(
      screen.getByText("expedition.phase4.transport.saving")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("expedition.phase4.transport.save")
    ).not.toBeInTheDocument();
  });

  it("renders isReturn checkbox", () => {
    render(<TransportStep {...defaultProps} />);

    expect(
      screen.getByText("expedition.phase4.transport.isReturn")
    ).toBeInTheDocument();
  });
});
