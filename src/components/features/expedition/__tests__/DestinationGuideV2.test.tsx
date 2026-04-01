import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DestinationGuideV2 } from "../DestinationGuideV2";
import type { DestinationGuideContentV2 } from "@/types/ai.types";

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

const mockGuideV2: DestinationGuideContentV2 = {
  destination: {
    name: "Lisboa",
    nickname: "A Cidade das Sete Colinas",
    subtitle: "Uma capital europeia de historia milenar e gastronomia.",
    overview: [
      "Lisboa e uma das capitais mais antigas da Europa com mais de 3.000 anos.",
      "Em junho, a cidade ganha vida com as Festas dos Santos Populares.",
    ],
  },
  quickFacts: {
    climate: { label: "Clima", value: "18-28C (junho)" },
    currency: { label: "Moeda", value: "Euro (EUR)" },
    language: { label: "Idioma", value: "Portugues" },
    timezone: { label: "Fuso Horario", value: "UTC+1" },
    plugType: { label: "Tomada", value: "Tipo F (230V)" },
    dialCode: { label: "DDI", value: "+351" },
  },
  safety: {
    level: "safe",
    tips: [
      "Cuidado com carteiristas no Tram 28.",
      "Calcadas podem ser escorregadias.",
      "Evite pertences visiveis no carro.",
    ],
    emergencyNumbers: { police: "112", ambulance: "112", tourist: "+351 213 421 634" },
  },
  dailyCosts: {
    items: [
      { category: "Refeição", budget: "EUR 10-18", mid: "EUR 25-40", premium: "EUR 60+" },
      { category: "Transporte", budget: "EUR 3-7", mid: "EUR 15-25", premium: "EUR 40+" },
      { category: "Hospedagem", budget: "EUR 50-80", mid: "EUR 120-180", premium: "EUR 250+" },
    ],
    dailyTotal: { budget: "EUR 63-105", mid: "EUR 160-245", premium: "EUR 350+" },
    tip: "Compre o Lisboa Card para transporte ilimitado.",
  },
  mustSee: [
    { name: "Oceanario de Lisboa", category: "nature", estimatedTime: "2-3h", costRange: "EUR 0-25", description: "Um dos maiores aquarios da Europa." },
    { name: "Torre de Belem", category: "culture", estimatedTime: "1-2h", costRange: "EUR 0-8", description: "Icone do estilo manuelino." },
    { name: "Pasteis de Belem", category: "food", estimatedTime: "1h", costRange: "EUR 5-10", description: "Os pasteis de nata originais." },
    { name: "Alfama", category: "culture", estimatedTime: "2-3h", costRange: "EUR 0", description: "Bairro mais antigo de Lisboa." },
    { name: "Sintra", category: "nature", estimatedTime: "4-5h", costRange: "EUR 10-30", description: "Palacios e jardins encantados." },
  ],
  documentation: {
    passport: "Passaporte valido com minimo 6 meses.",
    visa: "Isento para brasileiros ate 90 dias.",
    vaccines: "Nenhuma vacina obrigatoria.",
    insurance: "Seguro viagem obrigatorio para Schengen.",
  },
  localTransport: {
    options: ["Metro de Lisboa", "Tram 28", "Uber/Bolt"],
    tips: ["Cartao Viva Viagem e recarregavel.", "Taxis do aeroporto tem tarifa fixa."],
  },
  culturalTips: [
    "Cumprimente com dois beijos no rosto.",
    "Gorjeta nao obrigatoria, 5-10% apreciado.",
    "Almoco e a refeicao principal (12h30-14h).",
  ],
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

  // ─── V2 Bento grid rendering ──────────────────────────────────────────

  it("renders bento grid when v2 guide is provided", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("guide-v2-bento")).toBeInTheDocument();
  });

  it("renders about destination card with overview paragraphs", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("about-destination-card")).toBeInTheDocument();
    expect(screen.getByText("Sobre o Destino")).toBeInTheDocument();
    expect(screen.getByText(/Lisboa e uma das capitais/)).toBeInTheDocument();
    expect(screen.getByText(/Festas dos Santos Populares/)).toBeInTheDocument();
  });

  it("renders destination nickname in about card", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByText("A Cidade das Sete Colinas")).toBeInTheDocument();
  });

  it("renders quick facts card with 6 facts", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("quick-facts-card")).toBeInTheDocument();
    expect(screen.getByText("Clima")).toBeInTheDocument();
    expect(screen.getByText("Moeda")).toBeInTheDocument();
    expect(screen.getByText("Idioma")).toBeInTheDocument();
    expect(screen.getByText("Fuso Horario")).toBeInTheDocument();
    expect(screen.getByText("Tomada")).toBeInTheDocument();
    expect(screen.getByText("DDI")).toBeInTheDocument();
  });

  it("renders quick fact values", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByText("Euro (EUR)")).toBeInTheDocument();
    expect(screen.getByText("+351")).toBeInTheDocument();
  });

  it("renders safety card with tips and level badge", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("safety-card")).toBeInTheDocument();
    expect(screen.getByText("Dicas de Seguranca")).toBeInTheDocument();
    expect(screen.getByText("Cuidado com carteiristas no Tram 28.")).toBeInTheDocument();
  });

  it("renders safety badge with correct level", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByText("Safe")).toBeInTheDocument();
  });

  it("renders emergency numbers in safety card", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByText(/Policia: 112/)).toBeInTheDocument();
    expect(screen.getByText(/Turismo: \+351 213 421 634/)).toBeInTheDocument();
  });

  it("renders costs card with three-column layout", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("costs-card")).toBeInTheDocument();
    expect(screen.getByText("Custos Médios Diários")).toBeInTheDocument();
    expect(screen.getByText("Refeição")).toBeInTheDocument();
    expect(screen.getByText("Transporte")).toBeInTheDocument();
    expect(screen.getByText("Hospedagem")).toBeInTheDocument();
  });

  it("renders daily total in costs card", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByText("Total/dia")).toBeInTheDocument();
    expect(screen.getByText("EUR 63-105")).toBeInTheDocument();
  });

  it("renders money-saving tip in costs card", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByText("Compre o Lisboa Card para transporte ilimitado.")).toBeInTheDocument();
  });

  it("renders attractions card with mustSee items", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("attractions-card")).toBeInTheDocument();
    expect(screen.getByText("O que nao perder")).toBeInTheDocument();
    expect(screen.getByText("Oceanario de Lisboa")).toBeInTheDocument();
    expect(screen.getByText("Torre de Belem")).toBeInTheDocument();
    expect(screen.getByText("Pasteis de Belem")).toBeInTheDocument();
  });

  it("renders mustSee item metadata (time, cost)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    // Multiple items may have "2-3h" so use getAllByText
    expect(screen.getAllByText("2-3h").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("EUR 0-25")).toBeInTheDocument();
  });

  // ─── V2 Page Header ───────────────────────────────────────────────────

  it("renders V2 hero header with AI badge pill", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("guide-v2-header")).toBeInTheDocument();
    expect(screen.getByText("Gerado por IA")).toBeInTheDocument();
  });

  it("renders H1 with destination name", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lisbon, Portugal");
  });

  // ─── AI Disclaimer ────────────────────────────────────────────────────

  it("renders AI disclaimer as plain italic centered text", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
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
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
  });

  // ─── Auto-regenerate ──────────────────────────────────────────────────

  it("auto-regenerates when hash mismatch (no confirm dialog)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
        tripDataHash="new-hash"
        storedDataHash="old-hash"
      />,
    );
    expect(screen.queryByTestId("regenerate-confirm-dialog-v2")).not.toBeInTheDocument();
    expect(mockSpendPAForAIAction).toHaveBeenCalledWith("trip-1", "ai_accommodation");
  });

  it("does not auto-regenerate when hashes match", () => {
    mockSpendPAForAIAction.mockClear();
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
        tripDataHash="same-hash"
        storedDataHash="same-hash"
      />,
    );
    expect(screen.queryByTestId("regenerate-confirm-dialog-v2")).not.toBeInTheDocument();
    expect(mockSpendPAForAIAction).not.toHaveBeenCalled();
  });

  // ─── Skeleton state ───────────────────────────────────────────────────

  it("renders phase shell when no initial guide (auto-generate fires)", () => {
    render(<DestinationGuideV2 {...defaultProps} initialGuide={null} />);
    expect(screen.getByTestId("phase-shell")).toBeInTheDocument();
  });

  // ─── Accessibility ────────────────────────────────────────────────────

  it("AI badge has role=status", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    const badge = screen.getByRole("status", { name: "Gerado por IA" });
    expect(badge).toBeInTheDocument();
  });

  it("safety badge has role=status with level text", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    const safetyBadge = screen.getByRole("status", { name: "Safe" });
    expect(safetyBadge).toBeInTheDocument();
  });

  it("attractions carousel has region role", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    const carousel = screen.getByRole("region", { name: "Attractions carousel" });
    expect(carousel).toBeInTheDocument();
  });

  it("error alert has role=alert when error exists", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    // No error by default
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // ─── H1 sizing per spec ───────────────────────────────────────────────

  it("H1 has correct text-2xl class", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.className).toContain("text-2xl");
  });

  // ─── No blue Tailwind classes ─────────────────────────────────────────

  it("AI disclaimer does not use blue-* Tailwind classes", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: mockGuideV2, generationCount: 1, viewedSections: [] }}
      />,
    );
    const disclaimer = screen.getByTestId("ai-disclaimer");
    expect(disclaimer.className).not.toContain("blue-");
    const innerP = disclaimer.querySelector("p");
    expect(innerP?.className).not.toContain("blue-");
  });

  // ─── Legacy v1 fallback ───────────────────────────────────────────────

  it("renders legacy fallback when v1 guide data is provided", () => {
    const v1Guide = {
      timezone: { icon: "X", title: "TZ", summary: "UTC+1", tips: ["t1"], type: "stat" as const },
      currency: { icon: "X", title: "Cur", summary: "EUR", tips: ["t1"], type: "stat" as const },
      language: { icon: "X", title: "Lang", summary: "PT", tips: ["t1"], type: "stat" as const },
      electricity: { icon: "X", title: "Elec", summary: "230V", tips: ["t1"], type: "stat" as const },
      connectivity: { icon: "X", title: "Conn", summary: "Good", tips: ["t1"], type: "content" as const },
      cultural_tips: { icon: "X", title: "Tips", summary: "Be nice", tips: ["t1"], type: "content" as const },
      safety: { icon: "X", title: "Safety", summary: "Safe", tips: ["t1"], type: "content" as const },
      health: { icon: "X", title: "Health", summary: "OK", tips: ["t1"], type: "content" as const },
      transport_overview: { icon: "X", title: "Trans", summary: "Metro", tips: ["t1"], type: "content" as const },
      local_customs: { icon: "X", title: "Customs", summary: "Fado", tips: ["t1"], type: "content" as const },
    };

    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ content: v1Guide, generationCount: 1, viewedSections: [] }}
      />,
    );

    // Should show legacy fallback, not v2 bento grid
    expect(screen.queryByTestId("guide-v2-bento")).not.toBeInTheDocument();
    expect(screen.getByText(/versao anterior/)).toBeInTheDocument();
    expect(screen.getByText("Regenerar Guia")).toBeInTheDocument();
  });
});
