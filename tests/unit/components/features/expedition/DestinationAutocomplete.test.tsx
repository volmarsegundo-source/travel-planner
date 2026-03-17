import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => {
    // Handle ICU plural for resultsCount
    return (key: string, params?: Record<string, unknown>) => {
      if (params && key === "resultsCount") {
        return `${params.count} results found`;
      }
      return ns ? `${ns}.${key}` : key;
    };
  },
  useLocale: () => "pt-BR",
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { DestinationAutocomplete } from "@/components/features/expedition/DestinationAutocomplete";

// Helper: advance fake timers AND flush microtasks (resolved promises)
async function advanceAndFlush(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

// ─── Test data ───────────────────────────────────────────────────────────────

const parisResult = {
  displayName: "Paris, Ile-de-France, France",
  shortName: "Paris, France",
  formattedName: "Paris, Ile-de-France, France",
  lat: 48.8,
  lon: 2.3,
  country: "France",
  countryCode: "FR",
  state: "Ile-de-France",
  city: "Paris",
};

const parmaResult = {
  displayName: "Parma, Emilia-Romagna, Italy",
  shortName: "Parma, Italy",
  formattedName: "Parma, Emilia-Romagna, Italy",
  lat: 44.8,
  lon: 10.3,
  country: "Italy",
  countryCode: "IT",
  state: "Emilia-Romagna",
  city: "Parma",
};

const noCityResult = {
  displayName: "Some Island, Pacific Ocean",
  lat: -10.0,
  lon: 170.0,
  country: "Pacific Islands",
  countryCode: null,
  state: null,
  city: null,
  formattedName: "Some Island, Pacific Ocean",
};

function setupFetchWith(
  results: unknown[],
  extra: Record<string, unknown> = {}
) {
  const mockFetch = fetch as ReturnType<typeof vi.fn>;
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ results, provider: "nominatim", ...extra }),
  });
  return mockFetch;
}

function setupFetchError(status = 500) {
  const mockFetch = fetch as ReturnType<typeof vi.fn>;
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: "Server error" }),
  });
  return mockFetch;
}

function setupFetchNetworkError() {
  const mockFetch = fetch as ReturnType<typeof vi.fn>;
  mockFetch.mockRejectedValue(new Error("Network error"));
  return mockFetch;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("DestinationAutocomplete", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─── Rendering ────────────────────────────────────────────────────────

  it("renders input with combobox role", () => {
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("has aria-autocomplete='list' attribute", () => {
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-autocomplete",
      "list"
    );
  });

  it("has aria-expanded='false' when dropdown is closed", () => {
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("has aria-label for search", () => {
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-label");
  });

  it("renders with disabled state", () => {
    render(<DestinationAutocomplete value="" onChange={vi.fn()} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("renders custom placeholder", () => {
    render(
      <DestinationAutocomplete
        value=""
        onChange={vi.fn()}
        placeholder="Search cities..."
      />
    );
    expect(
      screen.getByPlaceholderText("Search cities...")
    ).toBeInTheDocument();
  });

  // ─── Input behavior ───────────────────────────────────────────────────

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<DestinationAutocomplete value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Par" },
    });
    expect(onChange).toHaveBeenCalledWith("Par");
  });

  it("debounces fetch by 300ms", async () => {
    const mockFetch = setupFetchWith([]);
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Par" },
    });

    expect(mockFetch).not.toHaveBeenCalled();
    await advanceAndFlush(300);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not fetch for queries shorter than 2 chars", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "P" },
    });

    await advanceAndFlush(300);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ─── Results display ──────────────────────────────────────────────────

  it("shows results with two-line format (city + state/country)", async () => {
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    expect(screen.getByTestId("destination-listbox")).toBeInTheDocument();
    expect(screen.getByTestId("result-line1")).toHaveTextContent("Paris");
    expect(screen.getByTestId("result-line2")).toHaveTextContent(
      "Ile-de-France, France"
    );
  });

  it("shows flag emoji for results with countryCode", async () => {
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    const flag = screen.getByTestId("flag-emoji");
    expect(flag).toBeInTheDocument();
    expect(flag).toHaveAttribute("aria-hidden", "true");
  });

  it("falls back to displayName on line 1 when city is null", async () => {
    setupFetchWith([noCityResult]);

    render(
      <DestinationAutocomplete value="Some" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Some Island" },
    });

    await advanceAndFlush(300);

    const line1 = screen.getByTestId("result-line1");
    expect(line1).toHaveTextContent("Some Island, Pacific Ocean");
    const line2 = screen.getByTestId("result-line2");
    expect(line2).toHaveTextContent("Pacific Islands");
  });

  it("does not show flag emoji when countryCode is null", async () => {
    setupFetchWith([noCityResult]);

    render(
      <DestinationAutocomplete value="Some" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Some Island" },
    });

    await advanceAndFlush(300);

    expect(screen.queryByTestId("flag-emoji")).not.toBeInTheDocument();
  });

  // ─── Opaque dropdown ─────────────────────────────────────────────────

  it("renders opaque dropdown with bg-card background", async () => {
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    const listbox = screen.getByTestId("destination-listbox");
    expect(listbox).toHaveClass("bg-card");
    expect(listbox).toHaveClass("border-border");
    expect(listbox).toHaveClass("shadow-lg");
  });

  // ─── Listbox with role="listbox" ──────────────────────────────────────

  it("renders dropdown with role='listbox'", async () => {
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("renders result items with role='option'", async () => {
    setupFetchWith([parisResult, parmaResult]);

    render(
      <DestinationAutocomplete value="" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Par" },
    });

    await advanceAndFlush(300);

    const options = screen.getAllByTestId("destination-option");
    expect(options).toHaveLength(2);
    // Verify role="option" attribute
    expect(options[0]).toHaveAttribute("role", "option");
    expect(options[1]).toHaveAttribute("role", "option");
  });

  // ─── Mobile touch target ─────────────────────────────────────────────

  it("result items have min-height 44px for mobile touch targets", async () => {
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    const option = screen.getByTestId("destination-option");
    expect(option.style.minHeight).toBe("44px");
  });

  // ─── Skeleton loading ────────────────────────────────────────────────

  it("shows skeleton loading items while fetching", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Par" },
    });

    await advanceAndFlush(300);

    expect(screen.getByTestId("skeleton-loading")).toBeInTheDocument();
  });

  it("loading spinner has motion-reduce:animate-none fallback", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Par" },
    });

    await advanceAndFlush(300);

    const spinner = screen.getByRole("status");
    const spinnerCircle = spinner.querySelector("[aria-hidden]");
    expect(spinnerCircle).toHaveClass("motion-reduce:animate-none");
  });

  // ─── No-results hint ─────────────────────────────────────────────────

  it("shows no-results hint when search returns empty results", async () => {
    setupFetchWith([]);

    render(
      <DestinationAutocomplete value="XYZ" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "XYZXYZ" },
    });

    await advanceAndFlush(300);

    const hint = screen.getByTestId("no-results-hint");
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveTextContent("destination.noResults");
  });

  it("does not show no-results hint when query is too short", async () => {
    render(<DestinationAutocomplete value="X" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "X" },
    });

    await advanceAndFlush(300);

    expect(screen.queryByTestId("no-results-hint")).not.toBeInTheDocument();
  });

  // ─── Error state ─────────────────────────────────────────────────────

  it("shows error message on API error", async () => {
    setupFetchError(500);

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    const error = screen.getByTestId("search-error");
    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent("destination.searchError");
  });

  it("shows error message on network error", async () => {
    setupFetchNetworkError();

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    expect(screen.getByTestId("search-error")).toBeInTheDocument();
  });

  // ─── Selection ────────────────────────────────────────────────────────

  it("sets input value to City, Country format when selecting", async () => {
    const onChange = vi.fn();
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete
        value="Par"
        onChange={onChange}
        onSelect={vi.fn()}
      />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    fireEvent.click(screen.getByTestId("destination-option"));

    expect(onChange).toHaveBeenCalledWith("Paris, France");
  });

  it("calls onSelect when clicking a result", async () => {
    const onSelect = vi.fn();
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete
        value="Par"
        onChange={vi.fn()}
        onSelect={onSelect}
      />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    fireEvent.click(screen.getByTestId("destination-option"));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ city: "Paris", country: "France" })
    );
  });

  it("closes dropdown after selection", async () => {
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete
        value="Par"
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    fireEvent.click(screen.getByTestId("destination-option"));

    expect(
      screen.queryByTestId("destination-listbox")
    ).not.toBeInTheDocument();
  });

  // ─── Keyboard navigation ─────────────────────────────────────────────

  it("navigates results with ArrowDown/ArrowUp", async () => {
    setupFetchWith([parisResult, parmaResult]);

    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Par" } });

    await advanceAndFlush(300);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);

    // ArrowDown selects first item
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    // ArrowDown moves to second item
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveAttribute("aria-selected", "false");

    // ArrowDown wraps to first
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    // ArrowUp wraps to last
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("selects with Enter key after ArrowDown", async () => {
    const onSelect = vi.fn();
    const onChange = vi.fn();
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete
        value="Par"
        onChange={onChange}
        onSelect={onSelect}
      />
    );
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Paris" } });

    await advanceAndFlush(300);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ city: "Paris" })
    );
    expect(onChange).toHaveBeenCalledWith("Paris, France");
  });

  it("closes dropdown on Escape", async () => {
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Paris" } });

    await advanceAndFlush(300);

    expect(screen.getByTestId("destination-listbox")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(
      screen.queryByTestId("destination-listbox")
    ).not.toBeInTheDocument();
  });

  it("Enter does nothing when no item is highlighted", async () => {
    const onSelect = vi.fn();
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete
        value="Par"
        onChange={vi.fn()}
        onSelect={onSelect}
      />
    );
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Paris" } });

    await advanceAndFlush(300);

    // Press Enter without ArrowDown first
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).not.toHaveBeenCalled();
  });

  // ─── Live region ──────────────────────────────────────────────────────

  it("has aria-live region for screen readers", () => {
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    const liveRegion = screen.getByTestId("live-region");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  // ─── Mapbox attribution ───────────────────────────────────────────────

  it("shows Mapbox attribution when provider is mapbox", async () => {
    setupFetchWith([parisResult], { provider: "mapbox" });

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    expect(screen.getByTestId("mapbox-attribution")).toBeInTheDocument();
  });

  it("does not show attribution when provider is nominatim", async () => {
    setupFetchWith([parisResult], { provider: "nominatim" });

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Paris" },
    });

    await advanceAndFlush(300);

    expect(
      screen.queryByTestId("mapbox-attribution")
    ).not.toBeInTheDocument();
  });

  // ─── aria-activedescendant ────────────────────────────────────────────

  it("sets aria-activedescendant when navigating", async () => {
    setupFetchWith([parisResult]);

    render(
      <DestinationAutocomplete value="Par" onChange={vi.fn()} />
    );
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Paris" } });

    await advanceAndFlush(300);

    // No active item initially
    expect(input).not.toHaveAttribute("aria-activedescendant");

    // ArrowDown sets it
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      "destination-option-0"
    );
  });
});
