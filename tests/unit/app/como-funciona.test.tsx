/**
 * Unit tests for Como Funciona (How It Works) page.
 * Sprint 35: Static page explaining the PA system.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockImplementation(async (namespace?: string) => {
    return (key: string, params?: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (params) {
        return `${fullKey} ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(" ")}`;
      }
      return fullKey;
    };
  }),
}));

import ComoFuncionaPage from "@/app/[locale]/(app)/como-funciona/page";

describe("ComoFuncionaPage", () => {
  async function renderPage() {
    const PageElement = await ComoFuncionaPage();
    render(PageElement);
  }

  it("renders the page title", async () => {
    await renderPage();
    expect(screen.getByTestId("how-it-works-title")).toHaveTextContent(
      "gamification.howItWorks.title"
    );
  });

  it("renders What are Atlas Points section", async () => {
    await renderPage();
    expect(screen.getByTestId("section-what-are-pa")).toBeInTheDocument();
  });

  it("renders earn PA section with table", async () => {
    await renderPage();
    expect(screen.getByTestId("section-earn")).toBeInTheDocument();
    const tables = screen.getAllByRole("table");
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  it("renders spend PA section with table", async () => {
    await renderPage();
    expect(screen.getByTestId("section-spend")).toBeInTheDocument();
  });

  it("renders levels section with rank cards", async () => {
    await renderPage();
    expect(screen.getByTestId("section-levels")).toBeInTheDocument();
  });

  it("renders FAQ section", async () => {
    await renderPage();
    expect(screen.getByTestId("section-faq")).toBeInTheDocument();
  });

  it("renders all 5 sections", async () => {
    await renderPage();
    expect(screen.getByTestId("section-what-are-pa")).toBeInTheDocument();
    expect(screen.getByTestId("section-earn")).toBeInTheDocument();
    expect(screen.getByTestId("section-spend")).toBeInTheDocument();
    expect(screen.getByTestId("section-levels")).toBeInTheDocument();
    expect(screen.getByTestId("section-faq")).toBeInTheDocument();
  });
});
