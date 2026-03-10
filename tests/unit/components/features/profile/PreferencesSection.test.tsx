/**
 * Unit tests for PreferencesSection and sub-components.
 *
 * Tests: chip toggle, single-select logic, multi-select logic, progress bar,
 * auto-save behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSavePreferences = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!values) return fullKey;
      const suffix = Object.entries(values)
        .map(([k, v]) => `${k}:${v}`)
        .join(",");
      return `${fullKey}[${suffix}]`;
    },
}));

vi.mock("@/server/actions/profile.actions", () => ({
  savePreferencesAction: mockSavePreferences,
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { PreferenceChip } from "@/components/features/profile/PreferenceChip";
import { PreferenceProgressBar } from "@/components/features/profile/PreferenceProgressBar";
import { PreferencesSection } from "@/components/features/profile/PreferencesSection";

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockSavePreferences.mockResolvedValue({
    success: true,
    data: { pointsAwarded: 0, totalFilled: 0 },
  });
});

describe("PreferenceChip", () => {
  it("renders with label", () => {
    render(
      <PreferenceChip
        label="Relaxed"
        selected={false}
        onToggle={vi.fn()}
        role="radio"
      />
    );
    expect(screen.getByText("Relaxed")).toBeInTheDocument();
  });

  it("shows checkmark when selected", () => {
    render(
      <PreferenceChip
        label="Relaxed"
        selected={true}
        onToggle={vi.fn()}
        role="radio"
      />
    );
    expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "true");
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(
      <PreferenceChip
        label="Relaxed"
        selected={false}
        onToggle={onToggle}
        role="checkbox"
      />
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("respects disabled state", () => {
    const onToggle = vi.fn();
    render(
      <PreferenceChip
        label="Vegan"
        selected={false}
        onToggle={onToggle}
        role="checkbox"
        disabled={true}
      />
    );
    const chip = screen.getByRole("checkbox");
    expect(chip).toBeDisabled();
  });

  it("renders description when provided", () => {
    render(
      <PreferenceChip
        label="Relaxed"
        description="Few activities per day"
        selected={false}
        onToggle={vi.fn()}
        role="radio"
      />
    );
    expect(screen.getByText("Few activities per day")).toBeInTheDocument();
  });
});

describe("PreferenceProgressBar", () => {
  it("renders progress with filled count", () => {
    render(
      <PreferenceProgressBar filledCount={3} progressText="3 of 10 filled" />
    );
    expect(screen.getByText("3/10")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
  });

  it("shows progress text", () => {
    render(
      <PreferenceProgressBar filledCount={0} progressText="Start filling!" />
    );
    expect(screen.getByText("Start filling!")).toBeInTheDocument();
  });
});

describe("PreferencesSection", () => {
  it("renders section title and subtitle", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    expect(
      screen.getByText("preferences.sectionTitle")
    ).toBeInTheDocument();
    expect(
      screen.getByText("preferences.sectionSubtitle")
    ).toBeInTheDocument();
  });

  it("renders all 10 category cards", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    // Each category card has a button with aria-expanded
    const categoryButtons = screen.getAllByRole("button", { expanded: false });
    // There should be at least 10 (categories)
    expect(categoryButtons.length).toBeGreaterThanOrEqual(10);
  });

  it("expands category card when clicked", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    // Click on first category (Travel Pace)
    const travelPaceButton = screen.getByText("preferences.categories.travelPace.title");
    fireEvent.click(travelPaceButton);

    // Should show the question
    expect(
      screen.getByText("preferences.categories.travelPace.question")
    ).toBeInTheDocument();
  });

  it("shows chips inside expanded category", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    // Expand Travel Pace
    fireEvent.click(screen.getByText("preferences.categories.travelPace.title"));

    // Should render radio chips
    const radioGroup = screen.getByRole("radiogroup");
    expect(radioGroup).toBeInTheDocument();

    // Should have 3 options for travel pace
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
  });

  it("pre-populates from initial preferences", () => {
    render(
      <PreferencesSection
        initialPreferences={{ travelPace: "relaxed", interests: ["beaches"] }}
      />
    );

    // Expand Travel Pace
    fireEvent.click(screen.getByText("preferences.categories.travelPace.title"));

    // The "relaxed" option should be checked
    const radios = screen.getAllByRole("radio");
    const relaxedChip = radios.find(
      (r) => r.getAttribute("aria-checked") === "true"
    );
    expect(relaxedChip).toBeDefined();
  });

  it("triggers debounced save on chip toggle", async () => {
    vi.useRealTimers();
    render(<PreferencesSection initialPreferences={{}} />);

    // Expand Travel Pace
    fireEvent.click(screen.getByText("preferences.categories.travelPace.title"));

    // Click a chip
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[0]);

    // Wait for debounce (500ms) + async save
    await waitFor(
      () => {
        expect(mockSavePreferences).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 }
    );
  });

  it("shows progress bar with 0 initially", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
  });

  it("handles multi-select categories correctly", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    // Expand Interests
    fireEvent.click(screen.getByText("preferences.categories.interests.title"));

    // Should show checkboxes (multi-select)
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);

    // Click two checkboxes
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    // Both should be checked
    expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
    expect(checkboxes[1]).toHaveAttribute("aria-checked", "true");
  });

  it("single-select categories deselect previous on new selection", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    // Expand Travel Pace
    fireEvent.click(screen.getByText("preferences.categories.travelPace.title"));

    const radios = screen.getAllByRole("radio");

    // Select first
    fireEvent.click(radios[0]);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");

    // Select second — first should deselect
    fireEvent.click(radios[1]);
    expect(radios[0]).toHaveAttribute("aria-checked", "false");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
  });
});
