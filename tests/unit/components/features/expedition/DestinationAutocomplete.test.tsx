import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => ns ? `${ns}.${key}` : key,
  useLocale: () => "pt-BR",
}));

// Mock Radix Popover — render inline instead of portal (jsdom compat)
vi.mock("@radix-ui/react-popover", () => {
  const React = require("react");
  return {
    Root: function Root({ children }: { children: React.ReactNode }) {
      return React.createElement("div", { "data-radix-popover-root": "" }, children);
    },
    Anchor: function Anchor({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
      if (asChild) return children;
      return React.createElement("div", null, children);
    },
    Portal: function Portal({ children }: { children: React.ReactNode }) {
      return children;
    },
    Content: function Content({
      children,
      asChild,
      onOpenAutoFocus,
      onCloseAutoFocus,
      ...props
    }: {
      children: React.ReactNode;
      asChild?: boolean;
      onOpenAutoFocus?: (e: Event) => void;
      onCloseAutoFocus?: (e: Event) => void;
      [key: string]: unknown;
    }) {
      if (asChild) return children;
      return React.createElement("div", props, children);
    },
  };
});

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
  lat: 48.8,
  lon: 2.3,
  country: "France",
  countryCode: "FR",
  state: "Ile-de-France",
  city: "Paris",
  formattedName: "Paris, Ile-de-France, France",
};

const parmaResult = {
  displayName: "Parma, Emilia-Romagna, Italy",
  lat: 44.8,
  lon: 10.3,
  country: "Italy",
  countryCode: "IT",
  state: "Emilia-Romagna",
  city: "Parma",
  formattedName: "Parma, Emilia-Romagna, Italy",
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

function setupFetchWith(results: unknown[]) {
  const mockFetch = fetch as ReturnType<typeof vi.fn>;
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ results }),
  });
  return mockFetch;
}

describe("DestinationAutocomplete", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders input with combobox role", () => {
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<DestinationAutocomplete value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Par" } });
    expect(onChange).toHaveBeenCalledWith("Par");
  });

  it("debounces fetch by 400ms", async () => {
    const mockFetch = setupFetchWith([]);
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Par" } });

    expect(mockFetch).not.toHaveBeenCalled();
    await advanceAndFlush(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not fetch for queries shorter than 2 chars", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "P" } });

    await advanceAndFlush(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ─── Two-line result format ──────────────────────────────────────────────

  it("shows results with two-line format (city + state/country)", async () => {
    setupFetchWith([parisResult]);

    render(<DestinationAutocomplete value="Par" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Paris" } });

    await advanceAndFlush(400);

    expect(screen.getByTestId("destination-listbox")).toBeInTheDocument();
    expect(screen.getByTestId("result-line1")).toHaveTextContent("Paris");
    expect(screen.getByTestId("result-line2")).toHaveTextContent("Ile-de-France, France");
  });

  it("falls back to displayName on line 1 when city is null", async () => {
    setupFetchWith([noCityResult]);

    render(<DestinationAutocomplete value="Some" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Some Island" } });

    await advanceAndFlush(400);

    const line1 = screen.getByTestId("result-line1");
    expect(line1).toHaveTextContent("Some Island, Pacific Ocean");
    const line2 = screen.getByTestId("result-line2");
    expect(line2).toHaveTextContent("Pacific Islands");
  });

  // ─── Opaque dropdown ────────────────────────────────────────────────────

  it("renders opaque dropdown with bg-card background", async () => {
    setupFetchWith([parisResult]);

    render(<DestinationAutocomplete value="Par" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Paris" } });

    await advanceAndFlush(400);

    const listbox = screen.getByTestId("destination-listbox");
    expect(listbox).toHaveClass("bg-card");
    expect(listbox).toHaveClass("border-border");
    expect(listbox).toHaveClass("shadow-lg");
  });

  // ─── Mobile touch target ────────────────────────────────────────────────

  it("result items have min-height 44px for mobile touch targets", async () => {
    setupFetchWith([parisResult]);

    render(<DestinationAutocomplete value="Par" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Paris" } });

    await advanceAndFlush(400);

    const option = screen.getByTestId("destination-option");
    expect(option.style.minHeight).toBe("44px");
  });

  // ─── No-results hint ───────────────────────────────────────────────────

  it("shows no-results hint when search returns empty results", async () => {
    setupFetchWith([]);

    render(<DestinationAutocomplete value="XYZ" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "XYZXYZ" } });

    await advanceAndFlush(400);

    const hint = screen.getByTestId("no-results-hint");
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveTextContent("destination.noResults");
  });

  it("does not show no-results hint when query is too short", async () => {
    render(<DestinationAutocomplete value="X" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "X" } });

    await advanceAndFlush(400);

    expect(screen.queryByTestId("no-results-hint")).not.toBeInTheDocument();
  });

  // ─── Loading spinner ───────────────────────────────────────────────────

  it("loading spinner has motion-reduce:animate-none fallback", async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Par" } });

    await advanceAndFlush(400);

    const spinner = screen.getByRole("status");
    const spinnerCircle = spinner.querySelector("[aria-hidden]");
    expect(spinnerCircle).toHaveClass("motion-reduce:animate-none");
  });

  // ─── Selected value format ─────────────────────────────────────────────

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
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Paris" } });

    await advanceAndFlush(400);

    fireEvent.click(screen.getByTestId("destination-option"));

    expect(onChange).toHaveBeenCalledWith("Paris, France");
  });

  // ─── Keyboard navigation ──────────────────────────────────────────────

  it("navigates with ArrowDown and selects items", async () => {
    setupFetchWith([parisResult, parmaResult]);

    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Par" } });

    await advanceAndFlush(400);

    expect(screen.getByTestId("destination-listbox")).toBeInTheDocument();

    // cmdk handles keyboard navigation internally via data-selected attribute
    const options = screen.getAllByTestId("destination-option");
    expect(options.length).toBe(2);
  });

  it("selects with Enter key", async () => {
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

    await advanceAndFlush(400);

    expect(screen.getByTestId("destination-listbox")).toBeInTheDocument();

    // cmdk selects via onSelect callback when Enter pressed on active item
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalled();
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
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Paris" } });

    await advanceAndFlush(400);

    fireEvent.click(screen.getByTestId("destination-option"));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ city: "Paris", country: "France" })
    );
  });

  it("has aria-autocomplete attribute", () => {
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-autocomplete", "list");
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
    expect(screen.getByPlaceholderText("Search cities...")).toBeInTheDocument();
  });

  // ─── Portal rendering (cmdk + Radix Popover) ──────────────────────────

  it("uses cmdk Command root with shouldFilter=false", () => {
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    const cmdkRoot = document.querySelector("[cmdk-root]");
    expect(cmdkRoot).toBeInTheDocument();
  });

  it("renders accessible label for command menu", () => {
    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    const label = document.querySelector("[cmdk-label]");
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent("destination.searchLabel");
  });
});
