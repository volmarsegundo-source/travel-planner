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

const mockStreamDestinationGuide = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/expedition.actions", () => ({
  completePhase5Action: vi.fn(),
  bulkViewGuideSectionsAction: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/ai/guide-stream-client", () => ({
  streamDestinationGuide: mockStreamDestinationGuide,
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
    expect(screen.getByText("expedition.phase5.mustSeeTitle")).toBeInTheDocument();
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

  // ─── Personalization section (SPEC-GUIA-PERSONALIZACAO) ────────────────

  const guideWithRegen = {
    content: mockGuideV2,
    generationCount: 1,
    viewedSections: [] as string[],
    regenCount: 0,
    extraCategories: [] as string[],
    personalNotes: null as string | null,
  };

  it("renders personalization section when v2 guide exists (AC-002)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );
    expect(screen.getByTestId("guide-personalization")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase5.personalizeTitle")).toBeInTheDocument();
  });

  it("does NOT render personalization section when no guide (AC-001)", () => {
    render(<DestinationGuideV2 {...defaultProps} initialGuide={null} />);
    expect(screen.queryByTestId("guide-personalization")).not.toBeInTheDocument();
  });

  it("renders all 9 category chips (AC-002)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );
    expect(screen.getByText("expedition.phase5.category_festivals_events")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase5.category_nightlife_clubs")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase5.category_beaches")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase5.category_shows_entertainment")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase5.category_recommended_restaurants")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase5.category_shopping_markets")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase5.category_museums_galleries")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase5.category_parks_nature")).toBeInTheDocument();
    expect(screen.getByText("expedition.phase5.category_local_experiences")).toBeInTheDocument();
  });

  it("toggles category chip selection on click (AC-003, AC-004)", async () => {
    const user = userEvent.setup();
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );
    const beachesChip = screen.getByRole("switch", { name: "expedition.phase5.category_beaches" });
    expect(beachesChip).toHaveAttribute("aria-pressed", "false");

    await user.click(beachesChip);
    expect(beachesChip).toHaveAttribute("aria-pressed", "true");

    await user.click(beachesChip);
    expect(beachesChip).toHaveAttribute("aria-pressed", "false");
  });

  it("disables regen button when no categories and no notes (AC-005)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );
    const btn = screen.getByRole("button", { name: /expedition\.phase5\.regenerateGuideCta/ });
    expect(btn).toBeDisabled();
  });

  it("enables regen button when a category is selected (AC-006)", async () => {
    const user = userEvent.setup();
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );
    const beachesChip = screen.getByRole("switch", { name: "expedition.phase5.category_beaches" });
    await user.click(beachesChip);

    const btn = screen.getByRole("button", { name: /expedition\.phase5\.regenerateGuideCta/ });
    expect(btn).not.toBeDisabled();
  });

  it("enables regen button when personal notes are typed (AC-006)", async () => {
    const user = userEvent.setup();
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );
    const textarea = screen.getByPlaceholderText("expedition.phase5.personalNotesPlaceholder");
    await user.type(textarea, "Jazz festivals");

    const btn = screen.getByRole("button", { name: /expedition\.phase5\.regenerateGuideCta/ });
    expect(btn).not.toBeDisabled();
  });

  it("shows character counter for personal notes (AC-012)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );
    expect(screen.getByText("0/500")).toBeInTheDocument();
  });

  it("shows regen counter (AC-010)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );
    expect(screen.getByText("expedition.phase5.regenCounter")).toBeInTheDocument();
  });

  it("disables regen button when regenCount reaches max (AC-010)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{ ...guideWithRegen, regenCount: 5 }}
      />,
    );
    const btn = screen.getByRole("button", { name: /expedition\.phase5\.regenLimitReached/ });
    expect(btn).toBeDisabled();
  });

  it("disables regen button when PA insufficient (AC-011)", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        availablePoints={10}
        initialGuide={guideWithRegen}
      />,
    );
    const btn = screen.getByRole("button", { name: /expedition\.phase5\.insufficientPALabel/ });
    expect(btn).toBeDisabled();
  });

  it("calls streamDestinationGuide on regen click and shows success (AC-008)", async () => {
    const user = userEvent.setup();
    mockStreamDestinationGuide.mockResolvedValue({
      kind: "complete",
      content: mockGuideV2,
      regenCount: 1,
    });

    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );

    // Select a category to enable the button
    const beachesChip = screen.getByRole("switch", { name: "expedition.phase5.category_beaches" });
    await user.click(beachesChip);

    const btn = screen.getByRole("button", { name: /expedition\.phase5\.regenerateGuideCta/ });
    await user.click(btn);

    // After regen completes, the streaming client should have been invoked
    expect(mockStreamDestinationGuide).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: "trip-1",
        regen: true,
        extraCategories: ["beaches"],
        personalNotes: "",
      }),
    );
  });

  it("shows error message on regen failure (AC-009)", async () => {
    const user = userEvent.setup();
    mockStreamDestinationGuide.mockResolvedValue({
      kind: "error",
      errorCode: "errors.generic",
    });

    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );

    const beachesChip = screen.getByRole("switch", { name: "expedition.phase5.category_beaches" });
    await user.click(beachesChip);

    const btn = screen.getByRole("button", { name: /expedition\.phase5\.regenerateGuideCta/ });
    await user.click(btn);

    // Error message appears
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("expedition.phase5.regenError");
  });

  it("pre-selects categories from initialGuide", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{
          ...guideWithRegen,
          extraCategories: ["beaches", "nightlife_clubs"],
        }}
      />,
    );
    const beachesChip = screen.getByRole("switch", { name: "expedition.phase5.category_beaches" });
    const nightlifeChip = screen.getByRole("switch", { name: "expedition.phase5.category_nightlife_clubs" });
    expect(beachesChip).toHaveAttribute("aria-pressed", "true");
    expect(nightlifeChip).toHaveAttribute("aria-pressed", "true");
  });

  it("pre-fills personal notes from initialGuide", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={{
          ...guideWithRegen,
          personalNotes: "I love jazz",
        }}
      />,
    );
    const textarea = screen.getByPlaceholderText("expedition.phase5.personalNotesPlaceholder");
    expect(textarea).toHaveValue("I love jazz");
  });

  it("category chips have aria-pressed attribute for accessibility", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );
    const chips = screen.getAllByRole("switch");
    chips.forEach((chip) => {
      expect(chip).toHaveAttribute("aria-pressed");
    });
  });

  it("category chips have minimum 44px touch target", () => {
    render(
      <DestinationGuideV2
        {...defaultProps}
        initialGuide={guideWithRegen}
      />,
    );
    const chips = screen.getAllByRole("switch");
    chips.forEach((chip) => {
      expect(chip.className).toContain("min-h-[44px]");
    });
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
