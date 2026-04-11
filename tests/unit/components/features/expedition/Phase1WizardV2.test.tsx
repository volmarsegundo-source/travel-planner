/**
 * Tests for Phase1WizardV2 component.
 *
 * Covers: step rendering, AtlasInput/AtlasCard usage,
 * profile summary card, form fields, navigation buttons.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockPush, mockCreateExpedition, mockUpdatePhase1 } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockCreateExpedition: vi.fn().mockResolvedValue({ success: true, data: { tripId: "new-id" } }),
  mockUpdatePhase1: vi.fn().mockResolvedValue({ success: true }),
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
  useLocale: () => "en",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => "/expedition/test/phase-1",
}));

vi.mock("@/hooks/useFormDirty", () => ({
  useFormDirty: () => ({ isDirty: false, markClean: vi.fn() }),
}));

vi.mock("@/server/actions/expedition.actions", () => ({
  createExpeditionAction: mockCreateExpedition,
  updatePhase1Action: mockUpdatePhase1,
}));

vi.mock("@/lib/travel/trip-classifier", () => ({
  classifyTrip: () => null,
}));

// Sprint 43 Wave 3: Phase1WizardV2 now reads the premium flag via
// useIsPremium → getSubscriptionStatusAction → next-auth. Stub both the
// hook and the MultiCitySelector so the test stays pure client-side.
vi.mock("@/hooks/useIsPremium", () => ({
  useIsPremium: () => ({ isPremium: false, isTrialing: false, loading: false }),
}));
vi.mock("@/components/features/expedition/MultiCitySelector", () => ({
  MultiCitySelector: () => null,
}));
vi.mock("@/components/features/premium/UpsellModal", () => ({
  UpsellModal: () => null,
}));

vi.mock("@/lib/utils/phone", () => ({
  formatBrazilianPhone: (v: string) => v,
  isValidBrazilianPhone: () => true,
}));

vi.mock("@/components/features/expedition/DestinationAutocomplete", () => ({
  DestinationAutocomplete: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
  }) => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid="destination-autocomplete"
    />
  ),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { Phase1WizardV2 } from "@/components/features/expedition/Phase1WizardV2";

// ─── Tests ────────────────────────────────────────────────────────────────────

const defaultProps = {
  tripCurrentPhase: 1,
  completedPhases: [] as number[],
};

describe("Phase1WizardV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with data-testid phase1-v2", () => {
    render(<Phase1WizardV2 {...defaultProps} />);

    expect(screen.getByTestId("phase1-v2")).toBeInTheDocument();
  });

  it("renders step 1 (About You) by default", () => {
    render(<Phase1WizardV2 {...defaultProps} />);

    expect(screen.getByText("expedition.phase1.step1.title")).toBeInTheDocument();
  });

  it("renders name input field on step 1", () => {
    render(<Phase1WizardV2 {...defaultProps} />);

    // AtlasInput renders with label
    expect(screen.getByText("expedition.phase1.step1.name")).toBeInTheDocument();
  });

  it("renders birth date field on step 1", () => {
    render(<Phase1WizardV2 {...defaultProps} />);

    expect(screen.getByText("expedition.phase1.step1.birthDate")).toBeInTheDocument();
  });

  it("shows profile summary card when profile is complete", () => {
    render(
      <Phase1WizardV2
        {...defaultProps}
        userName="John Doe"
        userProfile={{
          birthDate: "1990-01-01",
          country: "Brazil",
          city: "Sao Paulo",
        }}
      />
    );

    expect(screen.getByText("expedition.phase1.step1.savedProfileTitle")).toBeInTheDocument();
    expect(screen.getByTestId("edit-profile-btn")).toBeInTheDocument();
  });

  it("renders Next button on step 1", () => {
    render(<Phase1WizardV2 {...defaultProps} />);

    const nextButtons = screen.getAllByText("common.next");
    expect(nextButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows error when name is empty and Next is clicked", () => {
    render(<Phase1WizardV2 {...defaultProps} />);

    const nextButtons = screen.getAllByText("common.next");
    fireEvent.click(nextButtons[0]);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase1.errors.nameRequired")).toBeInTheDocument();
  });

  it("uses AtlasCard wrapper for step content", () => {
    render(<Phase1WizardV2 {...defaultProps} />);

    // AtlasCard renders with data-slot
    const cards = document.querySelectorAll("[data-slot='atlas-card']");
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("uses atlas error container for error messages", () => {
    render(<Phase1WizardV2 {...defaultProps} />);

    const nextButtons = screen.getAllByText("common.next");
    fireEvent.click(nextButtons[0]);

    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("bg-atlas-error-container");
  });
});
