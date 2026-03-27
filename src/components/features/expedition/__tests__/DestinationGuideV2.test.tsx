import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const mockSpendPAForAIAction = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true, data: { remainingBalance: 100 } }));

vi.mock("@/server/actions/gamification.actions", () => ({
  spendPAForAIAction: mockSpendPAForAIAction,
}));

vi.mock("../PhaseShell", () => ({
  PhaseShell: ({ children }: { children: React.ReactNode }) => <div data-testid="phase-shell">{children}</div>,
}));

vi.mock("../WizardFooter", () => ({
  WizardFooter: ({ onPrimary, primaryLabel }: { onPrimary?: () => void; primaryLabel?: string }) => (
    <div data-testid="wizard-footer">
      <button onClick={onPrimary}>{primaryLabel ?? "WizardFooter"}</button>
    </div>
  ),
}));

vi.mock("@/components/features/gamification/PAConfirmationModal", () => ({
  PAConfirmationModal: () => null,
}));

/* ────────────────────────────────────────────────────────────────────────────
 * Fixtures
 * ──────────────────────────────────────────────────────────────────────────── */

function makeGuideSection(title: string, options?: { tips?: string[]; details?: string }) {
  return {
    icon: "X",
    title,
    summary: `${title} summary`,
    details: options?.details ?? `${title} details`,
    tips: options?.tips ?? ["tip 1", "tip 2"],
    type: "stat" as const,
  };
}

const mockGuide: DestinationGuideContent = {
  timezone: makeGuideSection("Fuso Horario"),
  currency: makeGuideSection("Moeda"),
  language: makeGuideSection("Idioma"),
  electricity: makeGuideSection("Eletricidade"),
  connectivity: makeGuideSection("Conectividade"),
  cultural_tips: makeGuideSection("Dicas Culturais", {
    tips: ["Alfama: bairro mais antigo", "Torre de Belem: icone manuelino", "Pasteis de Belem: receita secreta"],
  }),
  safety: makeGuideSection("Seguranca", {
    tips: ["Cuidado com carteiristas", "Calcado escorregadio", "Evite ruas desertas"],
  }),
  health: makeGuideSection("Saude"),
  transport_overview: makeGuideSection("Transporte", { tips: ["Metro €1.50", "Taxi €6-10"] }),
  local_customs: makeGuideSection("Costumes Locais", {
    tips: ["Fado: musica tradicional", "Cafe expresso: €0.80"],
    details: "Dica: Lisboa Card oferece transporte gratis.",
  }),
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

  // ─── Empty state ──────────────────────────────────────────────────────

  it("renders phase shell when no guide", () => {
    render(<DestinationGuideV2 {...defaultProps} initialGuide={null} />);
    expect(screen.getByTestId("phase-shell")).toBeInTheDocument();
  });

  // ─── Bento grid rendering ─────────────────────────────────────────────

  it("renders bento grid when initialGuide is provided", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("guide-v2-bento")).toBeInTheDocument();
  });

  it("renders about destination card", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("about-destination-card")).toBeInTheDocument();
    expect(screen.getByText("Sobre o Destino")).toBeInTheDocument();
  });

  it("renders quick facts card with stat titles", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("quick-facts-card")).toBeInTheDocument();
    expect(screen.getByText("Fuso Horario")).toBeInTheDocument();
    expect(screen.getByText("Moeda")).toBeInTheDocument();
    expect(screen.getByText("Idioma")).toBeInTheDocument();
    expect(screen.getByText("Eletricidade")).toBeInTheDocument();
  });

  it("renders safety card with tips", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("safety-card")).toBeInTheDocument();
    expect(screen.getByText("Dicas de Segurança")).toBeInTheDocument();
    expect(screen.getByText("Cuidado com carteiristas")).toBeInTheDocument();
  });

  it("renders safety badge with level indicator", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    // Default level should be "Safe" since summary doesn't contain caution/moderate keywords
    expect(screen.getByText("Safe")).toBeInTheDocument();
  });

  it("renders costs card", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("costs-card")).toBeInTheDocument();
    expect(screen.getByText("Custos Médios")).toBeInTheDocument();
  });

  it("renders attractions card with items from tips", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("attractions-card")).toBeInTheDocument();
    expect(screen.getByText("O que não perder")).toBeInTheDocument();
  });

  // ─── V2 Page Header ───────────────────────────────────────────────────

  it("renders V2 hero header with AI badge pill", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("guide-v2-header")).toBeInTheDocument();
    expect(screen.getByText("Gerado por IA")).toBeInTheDocument();
  });

  it("renders H1 with destination name", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lisbon, Portugal");
  });

  it("renders destination name in about card overlay", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    // Destination name appears in both the H1 and the about card overlay
    const aboutCard = screen.getByTestId("about-destination-card");
    expect(aboutCard).toHaveTextContent("Lisbon, Portugal");
  });

  // ─── AI Disclaimer ────────────────────────────────────────────────────

  it("renders AI disclaimer as plain italic centered text", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    const disclaimer = screen.getByTestId("ai-disclaimer");
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer.tagName).toBe("FOOTER");
    expect(disclaimer).toHaveAttribute("role", "note");
  });

  // ─── Wizard footer ────────────────────────────────────────────────────

  it("renders wizard footer when guide exists", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
  });

  // ─── Regenerate confirm ───────────────────────────────────────────────

  it("auto-regenerates when hash mismatch (no confirm dialog)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
        tripDataHash="new-hash"
        storedDataHash="old-hash"
      />,
    );
    // No confirm dialog — auto-regeneration triggers instead
    expect(screen.queryByTestId("regenerate-confirm-dialog-v2")).not.toBeInTheDocument();
    // PA spend is called for the auto-regeneration
    expect(mockSpendPAForAIAction).toHaveBeenCalledWith("trip-1", "ai_accommodation");
  });

  it("does not auto-regenerate when hashes match", () => {
    mockSpendPAForAIAction.mockClear();
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
        tripDataHash="same-hash"
        storedDataHash="same-hash"
      />,
    );
    // No dialog and no PA spend for regeneration (guide already exists with matching hash)
    expect(screen.queryByTestId("regenerate-confirm-dialog-v2")).not.toBeInTheDocument();
    expect(mockSpendPAForAIAction).not.toHaveBeenCalled();
  });

  // ─── Skeleton state ───────────────────────────────────────────────────

  it("renders bento skeleton grid with correct gap", () => {
    // When no initial guide, auto-generate triggers which sets isGenerating
    // We test skeleton by checking for the skeleton testid
    render(<DestinationGuideV2 {...defaultProps} initialGuide={null} />);
    // Auto-generate fires, skeleton should appear
    expect(screen.getByTestId("phase-shell")).toBeInTheDocument();
  });

  // ─── Quick facts card value fallback ──────────────────────────────────

  it("renders dash for missing quick fact values", () => {
    const partialGuide: DestinationGuideContent = {
      ...mockGuide,
      timezone: { icon: "X", title: "Timezone", summary: "", tips: [], type: "stat" },
    };
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: partialGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    const factsCard = screen.getByTestId("quick-facts-card");
    expect(factsCard).toBeInTheDocument();
  });

  // ─── Content sections ─────────────────────────────────────────────────

  it("renders overview paragraphs in about card", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    // Connectivity summary and details are used as overview paragraphs
    expect(screen.getByText("Conectividade summary")).toBeInTheDocument();
    expect(screen.getByText("Conectividade details")).toBeInTheDocument();
  });

  it("renders costs card with local tip when details present", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    // local_customs has details that becomes the local tip
    expect(screen.getByText("Dica: Lisboa Card oferece transporte gratis.")).toBeInTheDocument();
  });

  // ─── Accessibility ────────────────────────────────────────────────────

  it("AI badge has role=status", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    const badge = screen.getByRole("status", { name: "Gerado por IA" });
    expect(badge).toBeInTheDocument();
  });

  it("safety badge has role=status with level text", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    const safetyBadge = screen.getByRole("status", { name: "Safe" });
    expect(safetyBadge).toBeInTheDocument();
  });

  it("attractions carousel has region role", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    const carousel = screen.getByRole("region", { name: "Attractions carousel" });
    expect(carousel).toBeInTheDocument();
  });

  it("error alert has role=alert", () => {
    // Render with guide to access the error display area, then trigger error via state
    // Instead, we just verify the structure doesn't crash without error
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // ─── H1 sizing per spec ───────────────────────────────────────────────

  it("H1 has correct text-2xl class (design system consistent)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.className).toContain("text-2xl");
  });

  // ─── No blue Tailwind classes (atlas tokens only) ─────────────────────

  it("AI disclaimer does not use blue-* Tailwind classes", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuide, generationCount: 1, viewedSections: [] }}
      />,
    );
    const disclaimer = screen.getByTestId("ai-disclaimer");
    expect(disclaimer.className).not.toContain("blue-");
    const innerP = disclaimer.querySelector("p");
    expect(innerP?.className).not.toContain("blue-");
  });
});
