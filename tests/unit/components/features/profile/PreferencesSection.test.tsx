/**
 * Unit tests for PreferencesSection and sub-components.
 *
 * Tests: chip toggle, single-select logic, multi-select logic, progress bar,
 * auto-save behavior, pagination.
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

  it("does not have truncate class on label text", () => {
    render(
      <PreferenceChip
        label="A very long label text"
        selected={false}
        onToggle={vi.fn()}
        role="radio"
      />
    );
    const label = screen.getByText("A very long label text");
    expect(label.className).not.toContain("truncate");
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

  it("renders 4 category cards on page 1 (paginated)", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    // Page 1 shows first 4 categories (CATEGORIES_PER_PAGE = 4)
    expect(screen.getByText("preferences.categories.travelPace.title")).toBeInTheDocument();
    expect(screen.getByText("preferences.categories.budgetStyle.title")).toBeInTheDocument();
    expect(screen.getByText("preferences.categories.socialPreference.title")).toBeInTheDocument();
    expect(screen.getByText("preferences.categories.accommodationStyle.title")).toBeInTheDocument();

    // Should NOT see page 2 categories
    expect(screen.queryByText("preferences.categories.interests.title")).not.toBeInTheDocument();
    expect(screen.queryByText("preferences.categories.foodPreferences.title")).not.toBeInTheDocument();
  });

  it("shows page 2 categories after clicking Next", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    // Click Next
    fireEvent.click(screen.getByTestId("preferences-next-btn"));

    // Should see page 2 categories (interests, foodPreferences, fitnessLevel)
    expect(screen.getByText("preferences.categories.interests.title")).toBeInTheDocument();
    expect(screen.getByText("preferences.categories.foodPreferences.title")).toBeInTheDocument();
    expect(screen.getByText("preferences.categories.fitnessLevel.title")).toBeInTheDocument();

    // Should NOT see page 1 categories
    expect(screen.queryByText("preferences.categories.travelPace.title")).not.toBeInTheDocument();
    expect(screen.queryByText("preferences.categories.budgetStyle.title")).not.toBeInTheDocument();
  });

  it("navigates back with Previous button", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    // Go to page 2
    fireEvent.click(screen.getByTestId("preferences-next-btn"));
    expect(screen.queryByText("preferences.categories.travelPace.title")).not.toBeInTheDocument();

    // Go back to page 1
    fireEvent.click(screen.getByTestId("preferences-prev-btn"));
    expect(screen.getByText("preferences.categories.travelPace.title")).toBeInTheDocument();
  });

  it("disables Previous button on page 1", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    expect(screen.getByTestId("preferences-prev-btn")).toBeDisabled();
  });

  it("disables Next button on last page", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    // Go to page 2
    fireEvent.click(screen.getByTestId("preferences-next-btn"));
    // Page 2 is not the last (there's page 3), so Next should still be enabled
    expect(screen.getByTestId("preferences-next-btn")).not.toBeDisabled();

    // Go to page 3 (last page)
    fireEvent.click(screen.getByTestId("preferences-next-btn"));
    expect(screen.getByTestId("preferences-next-btn")).toBeDisabled();
  });

  it("shows page indicator text", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    const indicator = screen.getByTestId("preferences-page-indicator");
    expect(indicator).toHaveTextContent("preferences.pageIndicator");
  });

  it("shows single page with no pagination when <=4 categories after exclusion", () => {
    // Exclude 6 categories so only 4 remain (fits in one page with CATEGORIES_PER_PAGE=4)
    render(
      <PreferencesSection
        initialPreferences={{}}
        excludeCategories={["interests", "foodPreferences", "fitnessLevel", "photographyInterest", "wakePreference", "connectivityNeeds"]}
      />
    );

    // All 4 remaining should be visible
    expect(screen.getByText("preferences.categories.travelPace.title")).toBeInTheDocument();
    expect(screen.getByText("preferences.categories.budgetStyle.title")).toBeInTheDocument();
    expect(screen.getByText("preferences.categories.socialPreference.title")).toBeInTheDocument();
    expect(screen.getByText("preferences.categories.accommodationStyle.title")).toBeInTheDocument();

    // No pagination controls
    expect(screen.queryByTestId("preferences-next-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preferences-prev-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preferences-page-indicator")).not.toBeInTheDocument();
  });

  it("has aria-live region for page change announcements", () => {
    render(<PreferencesSection initialPreferences={{}} />);

    const announcement = screen.getByTestId("preferences-page-announcement");
    expect(announcement).toHaveAttribute("aria-live", "polite");
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

    // Navigate to page 2 where interests is located
    fireEvent.click(screen.getByTestId("preferences-next-btn"));

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
