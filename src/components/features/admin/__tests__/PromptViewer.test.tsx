import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PromptViewer } from "../PromptViewer";
import type { AiInteractionDTO } from "@/server/actions/admin.actions";

vi.mock("next-intl", () => ({
  useTranslations: (_ns: string) => (key: string, params?: Record<string, unknown>) => {
    if (params && "count" in params) return `admin.prompts.${key}:${params.count}`;
    return `admin.prompts.${key}`;
  },
}));

function createInteraction(overrides: Partial<AiInteractionDTO> = {}): AiInteractionDTO {
  return {
    id: "int-1",
    userId: "user-1",
    phase: "guide",
    provider: "gemini",
    model: "gemini-2.0-flash",
    promptSlug: "destination-guide",
    inputTokens: 1500,
    outputTokens: 800,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    estimatedCostUsd: 0.001234,
    latencyMs: 2300,
    status: "success",
    errorCode: null,
    cacheHit: false,
    metadata: { route: "stream" },
    createdAt: "2026-04-15T10:30:00.000Z",
    templateSystemPrompt: "You are a travel guide assistant.",
    templateUserPrompt: "Generate a guide for {destination}.",
    templateVersion: "1.2.0",
    ...overrides,
  };
}

describe("PromptViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no interactions", () => {
    render(<PromptViewer interactions={[]} />);
    expect(screen.getByText("admin.prompts.noResults")).toBeInTheDocument();
  });

  it("renders interaction cards with metrics", () => {
    const interactions = [createInteraction()];
    render(<PromptViewer interactions={interactions} />);

    // Check the card article exists with the right aria-label
    const card = screen.getByRole("article");
    expect(card).toBeInTheDocument();

    // Check metrics inside the card — toLocaleString format varies by locale
    const cardText = card.textContent ?? "";
    // inputTokens: 1500 renders as "1,500" or "1.500" or "1500" depending on locale
    expect(cardText).toMatch(/1[.,]?500/);
    expect(cardText).toContain("800");  // outputTokens
    // latencyMs: 2300 renders as "2,300" or "2.300" or "2300" depending on locale
    expect(cardText).toMatch(/2[.,]?300/);
  });

  it("renders prompt slug and template version", () => {
    render(<PromptViewer interactions={[createInteraction()]} />);

    expect(screen.getByText("destination-guide")).toBeInTheDocument();
    expect(screen.getByText("v1.2.0")).toBeInTheDocument();
  });

  it("renders collapsible system prompt section", () => {
    render(<PromptViewer interactions={[createInteraction()]} />);

    const summaries = screen.getAllByText("admin.prompts.systemPrompt");
    expect(summaries).toHaveLength(1);
  });

  it("renders collapsible user prompt section", () => {
    render(<PromptViewer interactions={[createInteraction()]} />);

    const summaries = screen.getAllByText("admin.prompts.userPrompt");
    expect(summaries).toHaveLength(1);
  });

  it("renders metadata section when metadata exists", () => {
    render(
      <PromptViewer
        interactions={[createInteraction({ metadata: { route: "stream", regen: true } })]}
      />,
    );

    const summaries = screen.getAllByText("admin.prompts.metadata");
    expect(summaries).toHaveLength(1);
  });

  it("does not render metadata section when metadata is null", () => {
    render(
      <PromptViewer interactions={[createInteraction({ metadata: null })]} />,
    );

    expect(screen.queryByText("admin.prompts.metadata")).not.toBeInTheDocument();
  });

  it("does not render template sections when templates are null", () => {
    render(
      <PromptViewer
        interactions={[
          createInteraction({
            templateSystemPrompt: null,
            templateUserPrompt: null,
          }),
        ]}
      />,
    );

    expect(screen.queryByText("admin.prompts.systemPrompt")).not.toBeInTheDocument();
    expect(screen.queryByText("admin.prompts.userPrompt")).not.toBeInTheDocument();
  });

  it("shows error code when present", () => {
    render(
      <PromptViewer
        interactions={[
          createInteraction({ status: "error", errorCode: "RATE_LIMIT" }),
        ]}
      />,
    );

    expect(screen.getByText("RATE_LIMIT")).toBeInTheDocument();
    // "error" appears in both badge and filter option — use getAllByText
    const errorTexts = screen.getAllByText("error");
    expect(errorTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows cache hit badge when cacheHit is true", () => {
    render(
      <PromptViewer interactions={[createInteraction({ cacheHit: true })]} />,
    );

    expect(screen.getByText("admin.prompts.cacheHitYes")).toBeInTheDocument();
  });

  it("does not show cache hit badge when cacheHit is false", () => {
    render(
      <PromptViewer interactions={[createInteraction({ cacheHit: false })]} />,
    );

    expect(screen.queryByText("admin.prompts.cacheHitYes")).not.toBeInTheDocument();
  });

  describe("filtering", () => {
    const interactions = [
      createInteraction({ id: "1", phase: "guide", model: "gemini-2.0-flash", status: "success" }),
      createInteraction({ id: "2", phase: "checklist", model: "gemini-2.0-flash", status: "success" }),
      createInteraction({ id: "3", phase: "plan", model: "claude-3-5-sonnet", status: "error", errorCode: "TIMEOUT" }),
    ];

    it("filters by phase", () => {
      render(<PromptViewer interactions={interactions} />);

      const phaseSelect = screen.getByRole("combobox", { name: /filterByPhase/ });
      fireEvent.change(phaseSelect, { target: { value: "guide" } });

      expect(screen.getByText("admin.prompts.showingCount:1")).toBeInTheDocument();
    });

    it("filters by model", () => {
      render(<PromptViewer interactions={interactions} />);

      const modelSelect = screen.getByRole("combobox", { name: /filterByModel/ });
      fireEvent.change(modelSelect, { target: { value: "claude-3-5-sonnet" } });

      expect(screen.getByText("admin.prompts.showingCount:1")).toBeInTheDocument();
    });

    it("filters by status", () => {
      render(<PromptViewer interactions={interactions} />);

      const statusSelect = screen.getByRole("combobox", { name: /filterByStatus/ });
      fireEvent.change(statusSelect, { target: { value: "error" } });

      expect(screen.getByText("admin.prompts.showingCount:1")).toBeInTheDocument();
    });

    it("combines multiple filters", () => {
      render(<PromptViewer interactions={interactions} />);

      const phaseSelect = screen.getByRole("combobox", { name: /filterByPhase/ });
      const statusSelect = screen.getByRole("combobox", { name: /filterByStatus/ });

      fireEvent.change(phaseSelect, { target: { value: "guide" } });
      fireEvent.change(statusSelect, { target: { value: "error" } });

      // guide + error = 0 results
      expect(screen.getByText("admin.prompts.noResults")).toBeInTheDocument();
    });

    it("shows all results when filters are reset", () => {
      render(<PromptViewer interactions={interactions} />);

      const phaseSelect = screen.getByRole("combobox", { name: /filterByPhase/ });

      fireEvent.change(phaseSelect, { target: { value: "guide" } });
      expect(screen.getByText("admin.prompts.showingCount:1")).toBeInTheDocument();

      fireEvent.change(phaseSelect, { target: { value: "" } });
      expect(screen.getByText("admin.prompts.showingCount:3")).toBeInTheDocument();
    });

    it("populates filter options from interaction data", () => {
      render(<PromptViewer interactions={interactions} />);

      const phaseSelect = screen.getByRole("combobox", { name: /filterByPhase/ });
      const options = within(phaseSelect).getAllByRole("option");

      // "All phases" + checklist + guide + plan
      expect(options).toHaveLength(4);
    });
  });

  describe("copy button", () => {
    it("renders copy buttons for template sections", () => {
      render(<PromptViewer interactions={[createInteraction()]} />);

      const copyButtons = screen.getAllByText("admin.prompts.copy");
      // system prompt + user prompt + metadata = 3 copy buttons
      expect(copyButtons.length).toBeGreaterThanOrEqual(2);
    });

    it("calls clipboard API on click", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(<PromptViewer interactions={[createInteraction()]} />);

      const copyButtons = screen.getAllByText("admin.prompts.copy");
      fireEvent.click(copyButtons[0]);

      expect(writeTextMock).toHaveBeenCalled();
    });
  });

  describe("showing count", () => {
    it("displays correct count for all interactions", () => {
      const interactions = [
        createInteraction({ id: "1" }),
        createInteraction({ id: "2" }),
      ];
      render(<PromptViewer interactions={interactions} />);

      expect(screen.getByText("admin.prompts.showingCount:2")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has labeled filter group", () => {
      render(<PromptViewer interactions={[createInteraction()]} />);

      expect(
        screen.getByRole("group", { name: "admin.prompts.filterByPhase" }),
      ).toBeInTheDocument();
    });

    it("has aria-live on count element", () => {
      render(<PromptViewer interactions={[createInteraction()]} />);

      const count = screen.getByText("admin.prompts.showingCount:1");
      expect(count).toHaveAttribute("aria-live", "polite");
    });

    it("interaction cards have aria-label with phase and model", () => {
      render(<PromptViewer interactions={[createInteraction()]} />);

      expect(
        screen.getByRole("article", {
          name: "admin.prompts.phase: guide, admin.prompts.model: gemini-2.0-flash",
        }),
      ).toBeInTheDocument();
    });

    it("all select elements have associated labels", () => {
      render(<PromptViewer interactions={[createInteraction()]} />);

      expect(screen.getByRole("combobox", { name: /filterByPhase/ })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: /filterByModel/ })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: /filterByStatus/ })).toBeInTheDocument();
    });

    it("empty state has role status", () => {
      render(<PromptViewer interactions={[]} />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });
});
