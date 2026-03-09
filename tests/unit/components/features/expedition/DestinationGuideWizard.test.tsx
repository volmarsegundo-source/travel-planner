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
  },
  currency: {
    title: "Euro (EUR)",
    icon: "💶",
    summary: "Euro is the main currency",
    tips: ["Use ATMs for best rates", "Cards widely accepted"],
  },
  language: {
    title: "French",
    icon: "🗣️",
    summary: "French is the official language",
    tips: ["Learn bonjour and merci"],
  },
  electricity: {
    title: "Type C/E, 230V",
    icon: "🔌",
    summary: "European plugs, 230V",
    tips: ["Bring an adapter"],
  },
  connectivity: {
    title: "eSIM recommended",
    icon: "📶",
    summary: "Good 4G coverage throughout",
    tips: ["Buy eSIM before travel"],
  },
  cultural_tips: {
    title: "French etiquette",
    icon: "🎭",
    summary: "Greeting is important in France",
    tips: ["Say bonjour when entering shops", "Tip is included in prices"],
  },
};

const ALL_SECTIONS_VIEWED = [
  "timezone", "currency", "language", "electricity", "connectivity", "cultural_tips",
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

    // All 6 section titles should be visible
    expect(screen.getByText("UTC+1")).toBeInTheDocument();
    expect(screen.getByText("Euro (EUR)")).toBeInTheDocument();
    expect(screen.getByText("French")).toBeInTheDocument();
    expect(screen.getByText("Type C/E, 230V")).toBeInTheDocument();
    expect(screen.getByText("eSIM recommended")).toBeInTheDocument();
    expect(screen.getByText("French etiquette")).toBeInTheDocument();
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

  it("expands a section on click", async () => {
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

    // Summary should not be visible initially
    expect(
      screen.queryByText("Central European Time")
    ).not.toBeInTheDocument();

    // Click timezone section
    await act(async () => {
      fireEvent.click(screen.getByText("UTC+1"));
    });

    expect(
      screen.getByText("Central European Time")
    ).toBeInTheDocument();
  });

  it("collapses section on second click", async () => {
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

    // Expand
    await act(async () => {
      fireEvent.click(screen.getByText("UTC+1"));
    });
    expect(
      screen.getByText("Central European Time")
    ).toBeInTheDocument();

    // Collapse
    await act(async () => {
      fireEvent.click(screen.getByText("UTC+1"));
    });
    expect(
      screen.queryByText("Central European Time")
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

  // ─── Regeneration ──────────────────────────────────────────────────

  it("shows regenerate button when under limit", () => {
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
      screen.getByText(/expedition\.phase5\.regenerateCta/)
    ).toBeInTheDocument();
  });

  it("hides regenerate button when at limit", () => {
    render(
      <DestinationGuideWizard
        tripId="trip-1"
        destination="Paris, France"
        locale="en"
        initialGuide={{
          content: MOCK_GUIDE,
          generationCount: 3,
          viewedSections: [],
        }}
      />
    );

    expect(
      screen.queryByText(/expedition\.phase5\.regenerateCta/)
    ).not.toBeInTheDocument();
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

    expect(sectionButtons.length).toBe(6);
    sectionButtons.forEach((btn) => {
      expect(btn).toHaveAttribute("aria-expanded", "false");
    });
  });
});
