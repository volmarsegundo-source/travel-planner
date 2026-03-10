/**
 * Unit tests for DestinationGuideWizard component.
 *
 * Tests cover: initial render, guide generation, collapsible sections,
 * section view points, regeneration limit, phase completion flow.
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
const mockViewSection = vi.fn();

vi.mock("@/server/actions/expedition.actions", () => ({
  generateDestinationGuideAction: (...args: unknown[]) =>
    mockGenerateGuide(...args),
  completePhase5Action: (...args: unknown[]) => mockCompletePhase5(...args),
  viewGuideSectionAction: (...args: unknown[]) => mockViewSection(...args),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { DestinationGuideWizard } from "@/components/features/expedition/DestinationGuideWizard";
import type { DestinationGuideContent } from "@/types/ai.types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_GUIDE: DestinationGuideContent = {
  timezone: {
    title: "UTC+1",
    icon: "🕐",
    summary: "Central European Time",
    tips: ["Set your watch ahead"],
    type: "stat",
  },
  currency: {
    title: "Euro (EUR)",
    icon: "💶",
    summary: "Euro is the main currency",
    tips: ["Use ATMs for best rates", "Cards widely accepted"],
    type: "stat",
  },
  language: {
    title: "French",
    icon: "🗣️",
    summary: "French is the official language",
    tips: ["Learn bonjour and merci"],
    type: "stat",
  },
  electricity: {
    title: "Type C/E, 230V",
    icon: "🔌",
    summary: "European plugs, 230V",
    tips: ["Bring an adapter"],
    type: "stat",
  },
  connectivity: {
    title: "eSIM recommended",
    icon: "📶",
    summary: "Good 4G coverage throughout",
    tips: ["Buy eSIM before travel"],
    type: "content",
    details: "Wi-Fi is widely available in cafes and hotels.",
  },
  cultural_tips: {
    title: "French etiquette",
    icon: "🎭",
    summary: "Greeting is important in France",
    tips: ["Say bonjour when entering shops", "Tip is included in prices"],
    type: "content",
    details: "French culture values politeness and formality.",
  },
  safety: {
    title: "Safety",
    icon: "🛡️",
    summary: "Generally safe for tourists",
    tips: ["Watch for pickpockets in tourist areas"],
    type: "content",
    details: "Paris is safe but stay alert in crowded places.",
  },
  health: {
    title: "Health",
    icon: "❤️",
    summary: "Good healthcare available",
    tips: ["Carry your EHIC card"],
    type: "content",
    details: "France has excellent public healthcare.",
  },
  transport_overview: {
    title: "Transport",
    icon: "🚇",
    summary: "Excellent metro system",
    tips: ["Buy a Navigo pass for the week"],
    type: "content",
    details: "The Paris metro is one of the best in the world.",
  },
  local_customs: {
    title: "Customs",
    icon: "🇫🇷",
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
  mockViewSection.mockResolvedValue({
    success: true,
    data: { pointsAwarded: 5 },
  });
});

describe("DestinationGuideWizard", () => {
  // ─── Initial Render ─────────────────────────────────────────────────

  it("renders title and subtitle", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
      />
    );

    expect(
      screen.getByText("expedition.phase5.title")
    ).toBeInTheDocument();
    expect(
      screen.getByText("expedition.phase5.subtitle")
    ).toBeInTheDocument();
  });

  it("renders destination name", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
      />
    );

    expect(screen.getByText("Paris, France")).toBeInTheDocument();
  });

  it("shows generate button when no guide exists", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
      />
    );

    expect(
      screen.getByText("expedition.phase5.generateCta")
    ).toBeInTheDocument();
  });

  it("shows guide sections when initialGuide is provided", () => {
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

    // Stat section titles visible in compact cards
    expect(screen.getByText("UTC+1")).toBeInTheDocument();
    expect(screen.getByText("Euro (EUR)")).toBeInTheDocument();
    expect(screen.getByText("French")).toBeInTheDocument();
    expect(screen.getByText("Type C/E, 230V")).toBeInTheDocument();
    // Content section titles visible
    expect(screen.getByText("eSIM recommended")).toBeInTheDocument();
    expect(screen.getByText("French etiquette")).toBeInTheDocument();
    expect(screen.getByText("Safety")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Customs")).toBeInTheDocument();
  });

  it("renders stat cards in a grid and content cards in a list", () => {
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

    // Stat cards: 4 buttons with data-section-type="stat"
    const statButtons = statCards.querySelectorAll('[data-section-type="stat"]');
    expect(statButtons.length).toBe(4);

    // Content cards: 6 buttons with data-section-type="content"
    const contentButtons = contentCards.querySelectorAll('[data-section-type="content"]');
    expect(contentButtons.length).toBe(6);
  });

  it("shows details field for content sections when expanded", async () => {
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

    // Expand a content section that has details
    await act(async () => {
      fireEvent.click(screen.getByText("eSIM recommended"));
    });

    expect(screen.getByText("Wi-Fi is widely available in cafes and hotels.")).toBeInTheDocument();
  });

  // ─── Guide Generation ───────────────────────────────────────────────

  it("calls generateDestinationGuideAction on generate click", async () => {
    mockGenerateGuide.mockResolvedValue({
      success: true,
      data: { content: MOCK_GUIDE, generationCount: 1 },
    });

    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByText("expedition.phase5.generateCta")
      );
    });

    expect(mockGenerateGuide).toHaveBeenCalledWith("trip-1", "en");
  });

  it("shows sections after successful generation", async () => {
    mockGenerateGuide.mockResolvedValue({
      success: true,
      data: { content: MOCK_GUIDE, generationCount: 1 },
    });

    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByText("expedition.phase5.generateCta")
      );
    });

    await waitFor(() => {
      expect(screen.getByText("UTC+1")).toBeInTheDocument();
    });
  });

  it("shows error message on generation failure", async () => {
    mockGenerateGuide.mockResolvedValue({
      success: false,
      error: "errors.guideGenerationLimit",
    });

    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByText("expedition.phase5.generateCta")
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "errors.guideGenerationLimit"
      );
    });
  });

  // ─── Collapsible Sections ───────────────────────────────────────────

  it("expands a stat section on click showing tips", async () => {
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

    // Click timezone stat card
    await act(async () => {
      fireEvent.click(screen.getByText("UTC+1"));
    });

    // Stat expanded detail shows tips
    expect(
      screen.getByText("Set your watch ahead")
    ).toBeInTheDocument();
  });

  it("collapses content section on second click", async () => {
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

    // Expand connectivity content section
    await act(async () => {
      fireEvent.click(screen.getByText("eSIM recommended"));
    });
    expect(
      screen.getByText("Wi-Fi is widely available in cafes and hotels.")
    ).toBeInTheDocument();

    // Collapse
    await act(async () => {
      fireEvent.click(screen.getByText("eSIM recommended"));
    });
    expect(
      screen.queryByText("Wi-Fi is widely available in cafes and hotels.")
    ).not.toBeInTheDocument();
  });

  it("shows tips in expanded section", async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByText("Euro (EUR)"));
    });

    expect(
      screen.getByText("Use ATMs for best rates")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cards widely accepted")
    ).toBeInTheDocument();
  });

  // ─── Section View Points ────────────────────────────────────────────

  it("calls viewGuideSectionAction when expanding a new section", async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByText("UTC+1"));
    });

    expect(mockViewSection).toHaveBeenCalledWith("trip-1", "timezone");
  });

  it("does not call viewGuideSectionAction for already viewed sections", async () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 1,
          viewedSections: ["timezone"],
        }}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("UTC+1"));
    });

    expect(mockViewSection).not.toHaveBeenCalled();
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

  it("enables complete button immediately when guide exists (no section view required)", () => {
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

    // PhaseTransition shows → advancing state shows after 1200ms with Continue button
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

  it("section buttons have aria-expanded attribute", () => {
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

    const sectionButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.getAttribute("aria-expanded") !== null);

    expect(sectionButtons.length).toBe(10);
    sectionButtons.forEach((btn) => {
      expect(btn).toHaveAttribute("aria-expanded", "false");
    });
  });
});
