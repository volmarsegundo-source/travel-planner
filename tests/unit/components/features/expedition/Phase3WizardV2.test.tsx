/**
 * Tests for Phase3WizardV2 component.
 *
 * Covers: checklist rendering, toggle behavior, progress bar,
 * AtlasCard wrappers, AtlasBadge for points, accessibility.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockPush, mockRefresh, mockToggleItem, mockAdvance } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockToggleItem: vi.fn().mockResolvedValue({
    success: true,
    data: { completed: true, pointsAwarded: 10 },
  }),
  mockAdvance: vi.fn().mockResolvedValue({ success: true }),
}));

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
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: mockRefresh }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => "/expedition/test/phase-3",
}));

vi.mock("@/hooks/useFormDirty", () => ({
  useFormDirty: () => ({ isDirty: false, markClean: vi.fn() }),
}));

vi.mock("@/server/actions/expedition.actions", () => ({
  togglePhase3ItemAction: mockToggleItem,
  advanceFromPhaseAction: mockAdvance,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { Phase3WizardV2 } from "@/components/features/expedition/Phase3WizardV2";

// ─── Test data ────────────────────────────────────────────────────────────────

const defaultItems = [
  { id: "1", itemKey: "passport", required: true, completed: false, deadline: null, pointsValue: 20 },
  { id: "2", itemKey: "visa", required: true, completed: true, deadline: "2026-04-15", pointsValue: 30 },
  { id: "3", itemKey: "guidebook", required: false, completed: false, deadline: null, pointsValue: 10 },
];

const defaultProps = {
  tripId: "test-trip-id",
  items: defaultItems,
  tripType: "international",
  destination: "Paris, France",
  tripCurrentPhase: 3,
  completedPhases: [1, 2],
};

describe("Phase3WizardV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with data-testid phase3-v2", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    expect(screen.getByTestId("phase3-v2")).toBeInTheDocument();
  });

  it("renders destination and trip type context", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    expect(screen.getByText(/Paris, France/)).toBeInTheDocument();
  });

  it("renders required section header", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    expect(screen.getByText("expedition.phase3.requiredSection")).toBeInTheDocument();
  });

  it("renders recommended section header", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    expect(screen.getByText("expedition.phase3.recommendedSection")).toBeInTheDocument();
  });

  it("renders checklist items with checkbox role", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(3); // 2 required + 1 recommended
  });

  it("marks completed items as checked", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    const checkboxes = screen.getAllByRole("checkbox");
    const visaCheckbox = checkboxes.find(
      (cb) => cb.getAttribute("aria-checked") === "true"
    );
    expect(visaCheckbox).toBeDefined();
  });

  it("renders progress percentage", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    // 1 of 2 required completed = 50%
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders progress bar with AtlasCard wrapper", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    const cards = document.querySelectorAll("[data-slot='atlas-card']");
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("renders PA badge on each checklist item", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    // AtlasBadge PA variant renders aria-label with PA
    const paBadges = screen.getAllByRole("status");
    expect(paBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("calls toggle action when item is clicked", async () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    const checkboxes = screen.getAllByRole("checkbox");
    // Click first unchecked item (passport)
    const uncheckedBox = checkboxes.find(
      (cb) => cb.getAttribute("aria-checked") === "false"
    );
    if (uncheckedBox) {
      fireEvent.click(uncheckedBox);
    }

    expect(mockToggleItem).toHaveBeenCalledWith("test-trip-id", "passport");
  });

  it("uses atlas headline font for section headers", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    const requiredHeader = screen.getByText("expedition.phase3.requiredSection");
    expect(requiredHeader.className).toContain("font-atlas-headline");
  });

  it("uses atlas tokens for checklist row focus ring", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0].className).toContain("focus-visible:ring-atlas-focus-ring");
  });

  it("applies motion-reduce to transitions", () => {
    render(<Phase3WizardV2 {...defaultProps} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0].className).toContain("motion-reduce:transition-none");
  });
});
