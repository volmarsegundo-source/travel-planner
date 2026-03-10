/**
 * Unit tests for PassengersStep component (T-S21-009).
 *
 * Tests cover: increment/decrement adults, children with age selectors,
 * seniors, infants, total display, and navigation (next/back buttons).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

import { PassengersStep } from "@/components/features/expedition/PassengersStep";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDefaultProps(overrides: Partial<Parameters<typeof PassengersStep>[0]> = {}) {
  return {
    adults: 1,
    setAdults: vi.fn(),
    childrenCount: 0,
    setChildrenCount: vi.fn(),
    childrenAges: [] as number[],
    setChildrenAges: vi.fn(),
    seniors: 0,
    setSeniors: vi.fn(),
    infants: 0,
    setInfants: vi.fn(),
    totalPassengers: 1,
    onNext: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PassengersStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and all passenger categories", () => {
    render(<PassengersStep {...createDefaultProps()} />);

    expect(
      screen.getByText("expedition.phase2.passengers.title")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase2.passengers.adults")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase2.passengers.children")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase2.passengers.seniors")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase2.passengers.infants")
    ).toBeInTheDocument();
  });

  it("displays current adults count and calls setAdults on increment", () => {
    const setAdults = vi.fn();
    render(<PassengersStep {...createDefaultProps({ adults: 2, setAdults })} />);

    // Display shows 2
    const adultsDisplay = screen.getAllByText("2");
    expect(adultsDisplay.length).toBeGreaterThan(0);

    // Click increment (+) for adults
    const increaseBtn = screen.getByLabelText(
      /expedition\.phase2\.passengers\.increase.*expedition\.phase2\.passengers\.adults/
    );
    fireEvent.click(increaseBtn);

    expect(setAdults).toHaveBeenCalledWith(3);
  });

  it("calls setAdults on decrement (minimum 1)", () => {
    const setAdults = vi.fn();
    render(<PassengersStep {...createDefaultProps({ adults: 1, setAdults })} />);

    const decreaseBtn = screen.getByLabelText(
      /expedition\.phase2\.passengers\.decrease.*expedition\.phase2\.passengers\.adults/
    );
    fireEvent.click(decreaseBtn);

    // Should not go below 1
    expect(setAdults).toHaveBeenCalledWith(1);
  });

  it("increments children and adds default age", () => {
    const setChildrenCount = vi.fn();
    const setChildrenAges = vi.fn();
    render(
      <PassengersStep
        {...createDefaultProps({
          childrenCount: 0,
          childrenAges: [],
          setChildrenCount,
          setChildrenAges,
        })}
      />
    );

    const increaseBtn = screen.getByLabelText(
      /expedition\.phase2\.passengers\.increase.*expedition\.phase2\.passengers\.children/
    );
    fireEvent.click(increaseBtn);

    expect(setChildrenCount).toHaveBeenCalledWith(1);
    expect(setChildrenAges).toHaveBeenCalledWith([5]); // default age 5
  });

  it("decrements children and trims ages array", () => {
    const setChildrenCount = vi.fn();
    const setChildrenAges = vi.fn();
    render(
      <PassengersStep
        {...createDefaultProps({
          childrenCount: 2,
          childrenAges: [5, 8],
          setChildrenCount,
          setChildrenAges,
        })}
      />
    );

    const decreaseBtn = screen.getByLabelText(
      /expedition\.phase2\.passengers\.decrease.*expedition\.phase2\.passengers\.children/
    );
    fireEvent.click(decreaseBtn);

    expect(setChildrenCount).toHaveBeenCalledWith(1);
    expect(setChildrenAges).toHaveBeenCalledWith([5]);
  });

  it("shows age selectors when childrenCount > 0", () => {
    render(
      <PassengersStep
        {...createDefaultProps({
          childrenCount: 2,
          childrenAges: [5, 8],
        })}
      />
    );

    expect(
      screen.getByLabelText("expedition.phase2.passengers.childAge[1]")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("expedition.phase2.passengers.childAge[2]")
    ).toBeInTheDocument();
  });

  it("does not show age selectors when childrenCount is 0", () => {
    render(
      <PassengersStep
        {...createDefaultProps({ childrenCount: 0, childrenAges: [] })}
      />
    );

    expect(
      screen.queryByLabelText(/expedition\.phase2\.passengers\.childAge/)
    ).not.toBeInTheDocument();
  });

  it("calls setChildrenAges when age is changed", () => {
    const setChildrenAges = vi.fn();
    render(
      <PassengersStep
        {...createDefaultProps({
          childrenCount: 1,
          childrenAges: [5],
          setChildrenAges,
        })}
      />
    );

    const ageSelect = screen.getByLabelText(
      "expedition.phase2.passengers.childAge[1]"
    );
    fireEvent.change(ageSelect, { target: { value: "10" } });

    expect(setChildrenAges).toHaveBeenCalledWith([10]);
  });

  it("increments seniors", () => {
    const setSeniors = vi.fn();
    render(<PassengersStep {...createDefaultProps({ seniors: 1, setSeniors })} />);

    const increaseBtn = screen.getByLabelText(
      /expedition\.phase2\.passengers\.increase.*expedition\.phase2\.passengers\.seniors/
    );
    fireEvent.click(increaseBtn);

    expect(setSeniors).toHaveBeenCalledWith(2);
  });

  it("decrements seniors (minimum 0)", () => {
    const setSeniors = vi.fn();
    render(<PassengersStep {...createDefaultProps({ seniors: 0, setSeniors })} />);

    const decreaseBtn = screen.getByLabelText(
      /expedition\.phase2\.passengers\.decrease.*expedition\.phase2\.passengers\.seniors/
    );
    fireEvent.click(decreaseBtn);

    expect(setSeniors).toHaveBeenCalledWith(0);
  });

  it("increments infants", () => {
    const setInfants = vi.fn();
    render(<PassengersStep {...createDefaultProps({ infants: 0, setInfants })} />);

    const increaseBtn = screen.getByLabelText(
      /expedition\.phase2\.passengers\.increase.*expedition\.phase2\.passengers\.infants/
    );
    fireEvent.click(increaseBtn);

    expect(setInfants).toHaveBeenCalledWith(1);
  });

  it("decrements infants (minimum 0)", () => {
    const setInfants = vi.fn();
    render(<PassengersStep {...createDefaultProps({ infants: 0, setInfants })} />);

    const decreaseBtn = screen.getByLabelText(
      /expedition\.phase2\.passengers\.decrease.*expedition\.phase2\.passengers\.infants/
    );
    fireEvent.click(decreaseBtn);

    expect(setInfants).toHaveBeenCalledWith(0);
  });

  it("displays total passengers count", () => {
    render(
      <PassengersStep
        {...createDefaultProps({ totalPassengers: 5 })}
      />
    );

    expect(
      screen.getByText("expedition.phase2.passengers.total[5]")
    ).toBeInTheDocument();
  });

  it("calls onNext when next button is clicked", () => {
    const onNext = vi.fn();
    render(<PassengersStep {...createDefaultProps({ onNext })} />);

    fireEvent.click(screen.getByText("common.next"));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<PassengersStep {...createDefaultProps({ onBack })} />);

    // Back button is the arrow
    const backButton = screen.getByText("\u2190");
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
