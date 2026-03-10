import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "pt-BR",
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { DestinationAutocomplete } from "@/components/features/expedition/DestinationAutocomplete";

// Helper: advance fake timers AND flush microtasks (resolved promises)
async function advanceAndFlush(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    // Flush microtask queue so fetch().then().then() callbacks all run
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
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
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });

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

  it("shows results dropdown when results are available", async () => {
    const results = [
      { displayName: "Paris, France", lat: 48.8, lon: 2.3, country: "France", state: null, city: "Paris" },
    ];
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results }),
    });

    render(<DestinationAutocomplete value="Par" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Paris" } });

    await advanceAndFlush(400);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("Paris, France")).toBeInTheDocument();
  });

  it("calls onSelect when clicking a result", async () => {
    const onSelect = vi.fn();
    const results = [
      { displayName: "Paris, France", lat: 48.8, lon: 2.3, country: "France", state: null, city: "Paris" },
    ];
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results }),
    });

    render(
      <DestinationAutocomplete
        value="Par"
        onChange={vi.fn()}
        onSelect={onSelect}
      />
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Paris" } });

    await advanceAndFlush(400);

    fireEvent.click(screen.getByText("Paris, France"));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "Paris, France", country: "France" })
    );
  });

  it("navigates with ArrowDown and ArrowUp keys", async () => {
    const results = [
      { displayName: "Paris, France", lat: 48.8, lon: 2.3, country: "France", state: null, city: "Paris" },
      { displayName: "Parma, Italy", lat: 44.8, lon: 10.3, country: "Italy", state: null, city: "Parma" },
    ];
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results }),
    });

    render(<DestinationAutocomplete value="" onChange={vi.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Paris" } });

    await advanceAndFlush(400);

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByText("Paris, France").getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByText("Parma, Italy").getAttribute("aria-selected")).toBe("true");
  });

  it("selects with Enter key", async () => {
    const onSelect = vi.fn();
    const onChange = vi.fn();
    const results = [
      { displayName: "Paris, France", lat: 48.8, lon: 2.3, country: "France", state: null, city: "Paris" },
    ];
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results }),
    });

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

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalled();
  });

  it("closes dropdown on Escape", async () => {
    const results = [
      { displayName: "Paris, France", lat: 48.8, lon: 2.3, country: "France", state: null, city: "Paris" },
    ];
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results }),
    });

    render(<DestinationAutocomplete value="Par" onChange={vi.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Paris" } });

    await advanceAndFlush(400);

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
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
});
