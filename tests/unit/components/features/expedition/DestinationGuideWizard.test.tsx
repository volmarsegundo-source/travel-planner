/**
 * Unit tests for DestinationGuideWizard component (Sprint 26 redesign).
 *
 * Tests cover: always-visible sections, hero banner, no collapse behavior,
 * regenerate button (no update button), skeleton loading, bulk points,
 * section unavailable text, backward compatibility.
 *
 * [SPEC-PROD-003, SPEC-UX-002]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

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
}));

const mockPush = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <a {...props}>{children}</a>,
}));

const mockGenerateGuide = vi.fn();
const mockCompletePhase5 = vi.fn();
const mockBulkViewSections = vi.fn();

vi.mock("@/server/actions/expedition.actions", () => ({
  generateDestinationGuideAction: (...args: unknown[]) =>
    mockGenerateGuide(...args),
  completePhase5Action: (...args: unknown[]) => mockCompletePhase5(...args),
  bulkViewGuideSectionsAction: (...args: unknown[]) =>
    mockBulkViewSections(...args),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { DestinationGuideWizard } from "@/components/features/expedition/DestinationGuideWizard";
import type { DestinationGuideContent } from "@/types/ai.types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_GUIDE: DestinationGuideContent = {
  timezone: {
    title: "UTC+1",
    icon: "\u{1F550}",
    summary: "Central European Time",
    tips: ["Set your watch ahead"],
    type: "stat",
  },
  currency: {
    title: "Euro (EUR)",
    icon: "\u{1F4B6}",
    summary: "Euro is the main currency",
    tips: ["Use ATMs for best rates", "Cards widely accepted"],
    type: "stat",
  },
  language: {
    title: "French",
    icon: "\u{1F5E3}\uFE0F",
    summary: "French is the official language",
    tips: ["Learn bonjour and merci"],
    type: "stat",
  },
  electricity: {
    title: "Type C/E, 230V",
    icon: "\u{1F50C}",
    summary: "European plugs, 230V",
    tips: ["Bring an adapter"],
    type: "stat",
  },
  connectivity: {
    title: "eSIM recommended",
    icon: "\u{1F4F6}",
    summary: "Good 4G coverage throughout",
    tips: ["Buy eSIM before travel"],
    type: "content",
    details: "Wi-Fi is widely available in cafes and hotels.",
  },
  cultural_tips: {
    title: "French etiquette",
    icon: "\u{1F3AD}",
    summary: "Greeting is important in France",
    tips: ["Say bonjour when entering shops", "Tip is included in prices"],
    type: "content",
    details: "French culture values politeness and formality.",
  },
  safety: {
    title: "Safety",
    icon: "\u{1F6E1}\uFE0F",
    summary: "Generally safe for tourists",
    tips: ["Watch for pickpockets in tourist areas"],
    type: "content",
    details: "Paris is safe but stay alert in crowded places.",
  },
  health: {
    title: "Health",
    icon: "\u2764\uFE0F",
    summary: "Good healthcare available",
    tips: ["Carry your EHIC card"],
    type: "content",
    details: "France has excellent public healthcare.",
  },
  transport_overview: {
    title: "Transport",
    icon: "\u{1F687}",
    summary: "Excellent metro system",
    tips: ["Buy a Navigo pass for the week"],
    type: "content",
    details: "The Paris metro is one of the best in the world.",
  },
  local_customs: {
    title: "Customs",
    icon: "\u{1F1EB}\u{1F1F7}",
    summary: "Kiss on both cheeks",
    tips: ["Say bonjour when entering shops"],
    type: "content",
    details: "French people greet with la bise in social settings.",
  },
};

const ALL_SECTIONS_VIEWED = [
  "timezone", "currency", "language", "electricity", "connectivity", "cultural_tips",
  "safety", "health", "transport_overview", "local_customs",
];

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockBulkViewSections.mockResolvedValue({
    success: true,
    data: { totalPointsAwarded: 50 },
  });

  // Mock matchMedia for PhaseTransition prefers-reduced-motion check
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("DestinationGuideWizard", () => {
  // ─── Initial Render ─────────────────────────────────────────────────

  it("renders title and subtitle", async () => {
    mockGenerateGuide.mockResolvedValue({ success: false, error: "test" });

    await act(async () => {
      render(
        <DestinationGuideWizard
          tripId="trip-1"
          destination="Paris, France"
          locale="en"
        />
      );
    });

    expect(
      screen.getByText("expedition.phase5.title")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase5.subtitle")
    ).toBeInTheDocument();
  });

  it("renders destination name", async () => {
    mockGenerateGuide.mockResolvedValue({ success: false, error: "test" });

    await act(async () => {
      render(
        <DestinationGuideWizard
          tripId="trip-1"
          destination="Paris, France"
          locale="en"
        />
      );
    });

    expect(screen.getByText("Paris, France")).toBeInTheDocument();
  });

  it("auto-triggers generation on first visit when no guide exists", async () => {
    mockGenerateGuide.mockResolvedValue({
      success: true,
      data: { content: MOCK_GUIDE, generationCount: 1 },
    });

    await act(async () => {
      render(
        <DestinationGuideWizard
          tripId="trip-1"
          destination="Paris, France"
          locale="en"
        />
      );
    });

    expect(mockGenerateGuide).toHaveBeenCalledWith("trip-1", "en");
    // UTC+1 appears in hero banner AND stat card
    expect(screen.getAllByText("UTC+1").length).toBeGreaterThanOrEqual(1);
  });

  // ─── All 10 Sections Render Without Collapse ────────────────────────

  it("renders all 10 sections always visible without collapse", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    // All stat cards visible with summaries and tips (also in hero banner)
    expect(screen.getAllByText("UTC+1").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Euro (EUR)").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("French").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Type C/E, 230V").length).toBeGreaterThanOrEqual(2);

    // All content sections visible with details
    expect(screen.getByText("eSIM recommended")).toBeInTheDocument();
    expect(screen.getByText("Wi-Fi is widely available in cafes and hotels.")).toBeInTheDocument();
    expect(screen.getByText("French etiquette")).toBeInTheDocument();
    expect(screen.getByText("Safety")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Customs")).toBeInTheDocument();

    // No chevrons (collapse indicators) should exist
    const svgs = document.querySelectorAll("svg");
    const chevrons = Array.from(svgs).filter((svg) =>
      svg.querySelector('path[d*="19 9l-7 7-7-7"]')
    );
    expect(chevrons.length).toBe(0);
  });

  it("shows stat cards in grid and content cards in list", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    const statCards = screen.getByTestId("stat-cards");
    const contentCards = screen.getByTestId("content-cards");
    expect(statCards).toBeInTheDocument();
    expect(contentCards).toBeInTheDocument();

    // Stat cards: 4 divs (no longer buttons)
    const statItems = statCards.querySelectorAll('[data-section-type="stat"]');
    expect(statItems.length).toBe(4);

    // Content cards: 6 divs
    const contentItems = contentCards.querySelectorAll('[data-section-type="content"]');
    expect(contentItems.length).toBe(6);
  });

  // ─── Hero Banner ────────────────────────────────────────────────────

  it("renders hero banner with stat data", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    const hero = screen.getByTestId("hero-banner");
    expect(hero).toBeInTheDocument();
    expect(hero).toHaveTextContent("expedition.phase5.heroTitle");
    // Hero shows stat titles
    expect(hero).toHaveTextContent("UTC+1");
    expect(hero).toHaveTextContent("Euro (EUR)");
    expect(hero).toHaveTextContent("French");
    expect(hero).toHaveTextContent("Type C/E, 230V");
  });

  // ─── Buttons ────────────────────────────────────────────────────────

  it("'Update guide' button is NOT present", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    // There should be no "Update guide" / "Atualizar guia" button
    // The regenerate button has a different label pattern
    const buttons = screen.getAllByRole("button");
    const updateButtons = buttons.filter((btn) =>
      btn.textContent?.includes("Update guide") ||
      btn.textContent?.includes("Atualizar guia")
    );
    expect(updateButtons.length).toBe(0);
  });

  it("'Regenerate' button IS present as secondary action", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    const regenerateBtn = screen.getByTestId("regenerate-button");
    expect(regenerateBtn).toBeInTheDocument();
    expect(regenerateBtn).toHaveTextContent(/regenerateCta/);
  });

  // ─── Skeleton Loading ──────────────────────────────────────────────

  it("shows skeleton loading with 10 card placeholders", async () => {
    // Make generateGuide hang (never resolve) to keep isGenerating true
    mockGenerateGuide.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(
        <DestinationGuideWizard
          tripId="trip-1"
          destination="Paris, France"
          locale="en"
        />
      );
    });

    // Should show skeleton placeholders
    expect(screen.getByTestId("skeleton-hero")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton-stats")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton-content")).toBeInTheDocument();

    // Count skeleton cards: 1 hero + 4 stat + 6 content = 11 animated elements
    const skeletonStats = screen.getByTestId("skeleton-stats");
    expect(skeletonStats.children.length).toBe(4);

    const skeletonContent = screen.getByTestId("skeleton-content");
    expect(skeletonContent.children.length).toBe(6);
  });

  // ─── Missing Section ──────────────────────────────────────────────

  it("shows 'unavailable' text for missing sections", () => {
    const PARTIAL_GUIDE = {
      timezone: MOCK_GUIDE.timezone,
      currency: MOCK_GUIDE.currency,
      language: MOCK_GUIDE.language,
      electricity: MOCK_GUIDE.electricity,
      connectivity: MOCK_GUIDE.connectivity,
      cultural_tips: MOCK_GUIDE.cultural_tips,
      // safety, health, transport_overview, local_customs are missing
    } as unknown as DestinationGuideContent;

    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: PARTIAL_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    // 4 missing content sections should show "unavailable" text
    const unavailableTexts = screen.getAllByText("expedition.phase5.sectionUnavailable");
    expect(unavailableTexts.length).toBe(4);
  });

  // ─── Bulk Points Award ────────────────────────────────────────────

  it("calls bulkViewGuideSectionsAction once when guide loads", async () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    await waitFor(() => {
      expect(mockBulkViewSections).toHaveBeenCalledWith("trip-1");
      expect(mockBulkViewSections).toHaveBeenCalledTimes(1);
    });
  });

  // ─── AI Disclaimer ────────────────────────────────────────────────

  it("shows AI disclaimer when guide is displayed", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: ALL_SECTIONS_VIEWED,
        }}
      />
    );

    expect(
      screen.getByText("expedition.phase5.aiDisclaimer")
    ).toBeInTheDocument();
  });

  // ─── Phase Completion ───────────────────────────────────────────────

  it("shows complete button when guide exists", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    expect(
      screen.getByText("expedition.phase5.completeCta")
    ).toBeInTheDocument();
  });

  it("enables complete button immediately when guide exists", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    const completeBtn = screen.getByText("expedition.phase5.completeCta");
    expect(completeBtn.closest("button")).not.toBeDisabled();
  });

  it("calls completePhase5Action on complete click", async () => {
    mockCompletePhase5.mockResolvedValue({
      success: true,
      data: {
        phaseNumber: 5,
        pointsEarned: 40,
        badgeAwarded: null,
        newRank: "cartographer",
        nextPhaseUnlocked: 6,
      },
    });

    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: ALL_SECTIONS_VIEWED,
        }}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByText("expedition.phase5.completeCta")
      );
    });

    expect(mockCompletePhase5).toHaveBeenCalledWith("trip-1");
  });

  it("navigates to phase-6 after completion animation", async () => {
    vi.useFakeTimers();

    mockCompletePhase5.mockResolvedValue({
      success: true,
      data: {
        phaseNumber: 5,
        pointsEarned: 40,
        badgeAwarded: null,
        newRank: "cartographer",
        nextPhaseUnlocked: 6,
      },
    });

    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: ALL_SECTIONS_VIEWED,
        }}
      />
    );

    // Complete the phase
    await act(async () => {
      fireEvent.click(
        screen.getByText("expedition.phase5.completeCta")
      );
    });

    // PointsAnimation auto-dismisses after 2500ms + 300ms fade
    await act(async () => {
      vi.advanceTimersByTime(2900);
    });

    // PhaseTransition shows -> advancing state shows after 1200ms with Continue button
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });

    // Click Continue button
    const continueButton = screen.getByRole("button", {
      name: "expedition.transition.continue",
    });
    await act(async () => {
      fireEvent.click(continueButton);
    });

    expect(mockPush).toHaveBeenCalledWith("/expedition/trip-1/phase-6");

    vi.useRealTimers();
  });

  it("shows error on completion failure", async () => {
    mockCompletePhase5.mockResolvedValue({
      success: false,
      error: "errors.generic",
    });

    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: ALL_SECTIONS_VIEWED,
        }}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByText("expedition.phase5.completeCta")
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("errors.generic");
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────

  it("renders nav for progress bar", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  // ─── Content Sections Show Details Always ─────────────────────────

  it("shows details for all content sections without clicking", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: [],
        }}
      />
    );

    // Details should be visible without any clicks
    expect(screen.getByText("Wi-Fi is widely available in cafes and hotels.")).toBeInTheDocument();
    expect(screen.getByText("French culture values politeness and formality.")).toBeInTheDocument();
    expect(screen.getByText("Paris is safe but stay alert in crowded places.")).toBeInTheDocument();
    expect(screen.getByText("France has excellent public healthcare.")).toBeInTheDocument();
    expect(screen.getByText("The Paris metro is one of the best in the world.")).toBeInTheDocument();
    expect(screen.getByText("French people greet with la bise in social settings.")).toBeInTheDocument();
  });

  // ─── Auto-update Check ────────────────────────────────────────────

  it("shows regenerate confirmation when trip data hash differs from stored hash", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: ALL_SECTIONS_VIEWED,
        }}
        tripDataHash="hash-new"
        storedDataHash="hash-old"
      />
    );

    expect(screen.getByTestId("regenerate-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase5.regenerateConfirm")).toBeInTheDocument();
  });

  it("does not show regenerate confirmation when hashes match", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: ALL_SECTIONS_VIEWED,
        }}
        tripDataHash="hash-same"
        storedDataHash="hash-same"
      />
    );

    expect(screen.queryByTestId("regenerate-confirm-dialog")).not.toBeInTheDocument();
  });

  // ─── Backward Compatibility — old 6-section guide (T-S20-001) ──────

  describe("backward compatibility with old 6-section guide format", () => {
    const OLD_FORMAT_GUIDE = {
      timezone: MOCK_GUIDE.timezone,
      currency: MOCK_GUIDE.currency,
      language: MOCK_GUIDE.language,
      electricity: MOCK_GUIDE.electricity,
      connectivity: MOCK_GUIDE.connectivity,
      cultural_tips: MOCK_GUIDE.cultural_tips,
    } as unknown as DestinationGuideContent;

    it("renders without crashing when guide has only 6 sections (old format)", () => {
      render(
        <DestinationGuideWizard
          tripId="trip-old"
          destination="Tokyo, Japan"
          locale="en"
          initialGuide={{
            content: OLD_FORMAT_GUIDE,
            generationCount: 1,
            viewedSections: [],
          }}
        />
      );

      // Stat titles appear in both hero banner and stat cards
      expect(screen.getAllByText("UTC+1").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Euro (EUR)").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("eSIM recommended")).toBeInTheDocument();
      expect(screen.getByText("French etiquette")).toBeInTheDocument();

      // Missing sections show "unavailable" text
      const unavailableTexts = screen.getAllByText("expedition.phase5.sectionUnavailable");
      expect(unavailableTexts.length).toBe(4);
    });

    it("still allows phase completion with old format guide", () => {
      render(
        <DestinationGuideWizard
          tripId="trip-old"
          destination="Tokyo, Japan"
          locale="en"
          initialGuide={{
            content: OLD_FORMAT_GUIDE,
            generationCount: 1,
            viewedSections: [],
          }}
        />
      );

      const completeBtn = screen.getByText("expedition.phase5.completeCta");
      expect(completeBtn.closest("button")).not.toBeDisabled();
    });
  });

  // ─── Guide Generation ───────────────────────────────────────────────

  it("shows regenerate button after auto-generation completes", async () => {
    mockGenerateGuide.mockResolvedValue({
      success: true,
      data: { content: MOCK_GUIDE, generationCount: 1 },
    });

    await act(async () => {
      render(
        <DestinationGuideWizard
          tripId="trip-1"
          destination="Paris, France"
          locale="en"
        />
      );
    });

    const regenerateBtn = screen.getByTestId("regenerate-button");
    expect(regenerateBtn).toBeInTheDocument();
  });

  it("shows error message on generation failure", async () => {
    // Provide initialGuide so auto-generation does not trigger
    // Then manually click regenerate to test error display
    mockGenerateGuide.mockResolvedValue({
      success: false,
      error: "errors.guideGenerationLimit",
    });

    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: ALL_SECTIONS_VIEWED,
        }}
      />
    );

    // Click regenerate
    await act(async () => {
      fireEvent.click(screen.getByTestId("regenerate-button"));
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "guideGenerationLimit"
      );
    });
  });
});
