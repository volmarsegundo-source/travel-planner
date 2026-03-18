import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AtlasFilterChips, type AtlasFilter } from "@/components/features/atlas/AtlasFilterChips";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      filterAll: "All",
      filterPlanned: "Planned",
      filterActive: "Active",
      filterCompleted: "Completed",
    };
    return messages[key] ?? key;
  },
}));

describe("AtlasFilterChips", () => {
  const defaultCounts = { all: 5, planning: 2, inProgress: 2, completed: 1 };
  const mockOnFilterChange = vi.fn();

  function renderChips(activeFilter: AtlasFilter = "ALL") {
    return render(
      <AtlasFilterChips
        activeFilter={activeFilter}
        onFilterChange={mockOnFilterChange}
        counts={defaultCounts}
      />
    );
  }

  it("renders all four filter chips", () => {
    renderChips();
    expect(screen.getByText(/All/)).toBeInTheDocument();
    expect(screen.getByText(/Planned/)).toBeInTheDocument();
    expect(screen.getByText(/Active/)).toBeInTheDocument();
    expect(screen.getByText(/Completed/)).toBeInTheDocument();
  });

  it("displays counts next to each filter", () => {
    renderChips();
    expect(screen.getByText("(5)")).toBeInTheDocument();
    expect(screen.getByText("(2)", { selector: "[data-testid='atlas-filter-planning'] span" })).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
  });

  it("marks the active filter as aria-checked=true", () => {
    renderChips("COMPLETED");
    const completedChip = screen.getByTestId("atlas-filter-completed");
    expect(completedChip).toHaveAttribute("aria-checked", "true");

    const allChip = screen.getByTestId("atlas-filter-all");
    expect(allChip).toHaveAttribute("aria-checked", "false");
  });

  it("calls onFilterChange when clicking a chip", () => {
    renderChips();
    fireEvent.click(screen.getByTestId("atlas-filter-completed"));
    expect(mockOnFilterChange).toHaveBeenCalledWith("COMPLETED");
  });

  it("uses radiogroup role for accessibility", () => {
    renderChips();
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });

  it("each chip uses radio role", () => {
    renderChips();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
  });
});
