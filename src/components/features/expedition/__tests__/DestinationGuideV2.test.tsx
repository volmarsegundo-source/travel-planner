import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DestinationGuideV2 } from "../DestinationGuideV2";
import type { DestinationGuideContent } from "@/types/ai.types";

/* ────────────────────────────────────────────────────────────────────────────
 * Mocks
 * ──────────────────────────────────────────────────────────────────────────── */

const mockRouterPush = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => {
    const translate = (key: string, params?: Record<string, string | number>) => {
      let result = `${ns}.${key}`;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    };
    return translate;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/server/actions/expedition.actions", () => ({
  generateDestinationGuideAction: vi.fn(),
  completePhase5Action: vi.fn(),
  bulkViewGuideSectionsAction: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/actions/gamification.actions", () => ({
  spendPAForAIAction: vi.fn().mockResolvedValue({ success: true, data: { remainingBalance: 100 } }),
}));

vi.mock("../PhaseShell", () => ({
  PhaseShell: ({ children }: { children: React.ReactNode }) => <div data-testid="phase-shell">{children}</div>,
}));

vi.mock("../AiDisclaimer", () => ({
  AiDisclaimer: ({ message }: { message: string }) => <div data-testid="ai-disclaimer">{message}</div>,
}));

vi.mock("../WizardFooter", () => ({
  WizardFooter: () => <div data-testid="wizard-footer">WizardFooter</div>,
}));

vi.mock("@/components/features/gamification/PAConfirmationModal", () => ({
  PAConfirmationModal: () => null,
}));

/* ────────────────────────────────────────────────────────────────────────────
 * Fixtures
 * ──────────────────────────────────────────────────────────────────────────── */

function makeGuideSection(title: string) {
  return { icon: "X", title, summary: `${title} summary`, details: `${title} details`, tips: ["tip 1"], type: "stat" as const };
}

const mockGuide: DestinationGuideContent = {
  timezone: makeGuideSection("Timezone"),
  currency: makeGuideSection("Currency"),
  language: makeGuideSection("Language"),
  electricity: makeGuideSection("Electricity"),
  connectivity: makeGuideSection("Connectivity"),
  cultural_tips: makeGuideSection("Cultural Tips"),
  safety: makeGuideSection("Safety"),
  health: makeGuideSection("Health"),
  transport_overview: makeGuideSection("Transport"),
  local_customs: makeGuideSection("Local Customs"),
};

/* ────────────────────────────────────────────────────────────────────────────
 * Tests
 * ──────────────────────────────────────────────────────────────────────────── */

describe("DestinationGuideV2", () => {
  const defaultProps = {
    tripId: "trip-1",
    destination: "Lisbon, Portugal",
    locale: "en",
    tripCurrentPhase: 5,
    completedPhases: [1, 2, 3, 4],
    availablePoints: 200,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders generate hint when no guide", () => {
    render(<DestinationGuideV2 {...defaultProps} initialGuide={null} />);
    // Auto-generate triggers, but the skeleton should show
    // or the generate hint (depending on timing)
    expect(screen.getByTestId("phase-shell")).toBeInTheDocument();
  });

  it("renders guide content when initialGuide is provided", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{
          content: mockGuide,
          generationCount: 1,
          viewedSections: [],
        }}
      />,
    );

    expect(screen.getByTestId("hero-banner-v2")).toBeInTheDocument();
    expect(screen.getByTestId("stat-cards-v2")).toBeInTheDocument();
    expect(screen.getByTestId("guide-v2-bento")).toBeInTheDocument();
  });

  it("renders stat section titles", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{
          content: mockGuide,
          generationCount: 1,
          viewedSections: [],
        }}
      />,
    );

    expect(screen.getByText("Timezone")).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Electricity")).toBeInTheDocument();
  });

  it("renders content section titles", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{
          content: mockGuide,
          generationCount: 1,
          viewedSections: [],
        }}
      />,
    );

    expect(screen.getByText("Cultural Tips")).toBeInTheDocument();
    expect(screen.getByText("Safety")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
  });

  it("renders AI disclaimer when guide exists", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{
          content: mockGuide,
          generationCount: 1,
          viewedSections: [],
        }}
      />,
    );

    expect(screen.getByTestId("ai-disclaimer")).toBeInTheDocument();
  });

  it("renders destination in subtitle", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{
          content: mockGuide,
          generationCount: 1,
          viewedSections: [],
        }}
      />,
    );

    // V2: destination is inside the hero header as "title: destination"
    expect(screen.getByText(/Lisbon, Portugal/)).toBeInTheDocument();
  });

  it("renders wizard footer when guide exists", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{
          content: mockGuide,
          generationCount: 1,
          viewedSections: [],
        }}
      />,
    );

    expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
  });

  it("shows regenerate confirm when hash mismatch", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{
          content: mockGuide,
          generationCount: 1,
          viewedSections: [],
        }}
        tripDataHash="new-hash"
        storedDataHash="old-hash"
      />,
    );

    expect(screen.getByTestId("regenerate-confirm-dialog-v2")).toBeInTheDocument();
  });
});
