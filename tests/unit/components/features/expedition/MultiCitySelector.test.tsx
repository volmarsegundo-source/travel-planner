/**
 * Unit tests for MultiCitySelector (Sprint 43 Wave 3).
 *
 * Covers: rendering, add/remove, move up/down (keyboard reorder),
 * premium gate, and maxCities enforcement.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DestinationDraft } from "@/components/features/expedition/MultiCitySelector";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string, params?: Record<string, unknown>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    if (params) {
      let result = fullKey;
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
      return result;
    }
    return fullKey;
  },
  useLocale: () => "en",
}));

vi.mock("@/components/features/expedition/DestinationAutocomplete", () => ({
  DestinationAutocomplete: ({
    value,
    onChange,
    placeholder,
    disabled,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <input
      data-testid="autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  ),
}));

// ─── Import SUT after mocks ──────────────────────────────────────────────────

import { MultiCitySelector } from "@/components/features/expedition/MultiCitySelector";

function makeRow(overrides: Partial<DestinationDraft> = {}): DestinationDraft {
  return {
    order: 0,
    city: "",
    ...overrides,
  };
}

interface HarnessProps {
  initial?: DestinationDraft[];
  maxCities?: number;
  isPremium?: boolean;
  onUpsellRequested?: () => void;
}

function Harness({
  initial,
  maxCities = 4,
  isPremium = true,
  onUpsellRequested = vi.fn(),
}: HarnessProps) {
  const [value, setValue] = require("react").useState<DestinationDraft[]>(
    initial ?? [makeRow({ city: "Paris" })]
  );
  return (
    <MultiCitySelector
      value={value}
      onChange={setValue}
      maxCities={maxCities}
      isPremium={isPremium}
      onUpsellRequested={onUpsellRequested}
    />
  );
}

describe("MultiCitySelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a single row when given one initial destination", () => {
    render(<Harness initial={[makeRow({ city: "Paris" })]} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(screen.getByTestId("multi-city-row-0")).toBeDefined();
  });

  it("'Add city' appends a new empty row when under the cap", () => {
    render(<Harness initial={[makeRow({ city: "Paris" })]} maxCities={4} />);
    fireEvent.click(screen.getByTestId("add-city-button"));
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId("multi-city-row-1")).toBeDefined();
  });

  it("Remove button removes a row but is hidden when only one remains", () => {
    render(
      <Harness
        initial={[
          makeRow({ city: "Paris" }),
          makeRow({ order: 1, city: "Lisbon" }),
        ]}
      />
    );
    // Row 0 has a remove button when length > 1
    fireEvent.click(screen.getByTestId("remove-city-1"));
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    // Only-one case: remove button no longer rendered
    expect(screen.queryByTestId("remove-city-0")).toBeNull();
  });

  it("Move up and move down reorder rows and are keyboard-accessible", () => {
    render(
      <Harness
        initial={[
          makeRow({ city: "Paris" }),
          makeRow({ order: 1, city: "Lisbon" }),
          makeRow({ order: 2, city: "Madrid" }),
        ]}
      />
    );

    // Move Lisbon (index 1) up
    fireEvent.click(screen.getByTestId("move-up-1"));
    const inputs = screen.getAllByTestId("autocomplete") as HTMLInputElement[];
    expect(inputs[0].value).toBe("Lisbon");
    expect(inputs[1].value).toBe("Paris");

    // Move the now-bottom Madrid (still index 2) up twice — ends up at top
    fireEvent.click(screen.getByTestId("move-up-2"));
    fireEvent.click(screen.getByTestId("move-up-1"));
    const after = screen.getAllByTestId("autocomplete") as HTMLInputElement[];
    expect(after[0].value).toBe("Madrid");
  });

  it("'Move up' is disabled on the first row and 'Move down' on the last", () => {
    render(
      <Harness
        initial={[
          makeRow({ city: "Paris" }),
          makeRow({ order: 1, city: "Lisbon" }),
        ]}
      />
    );
    const moveUpFirst = screen.getByTestId("move-up-0") as HTMLButtonElement;
    const moveDownLast = screen.getByTestId("move-down-1") as HTMLButtonElement;
    expect(moveUpFirst.disabled).toBe(true);
    expect(moveDownLast.disabled).toBe(true);
  });

  it("triggers the upsell when a Free user clicks 'Add city' with an existing row", () => {
    const onUpsellRequested = vi.fn();
    render(
      <Harness
        isPremium={false}
        maxCities={1}
        initial={[makeRow({ city: "Paris" })]}
        onUpsellRequested={onUpsellRequested}
      />
    );
    fireEvent.click(screen.getByTestId("add-city-button"));
    expect(onUpsellRequested).toHaveBeenCalledTimes(1);
    // Still only 1 row — no append on Free path
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("enforces the maxCities cap for Premium users (4)", () => {
    render(
      <Harness
        isPremium
        maxCities={4}
        initial={[
          makeRow({ city: "A" }),
          makeRow({ order: 1, city: "B" }),
          makeRow({ order: 2, city: "C" }),
          makeRow({ order: 3, city: "D" }),
        ]}
      />
    );
    const addButton = screen.getByTestId("add-city-button") as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });
});
