/**
 * E2E — SPEC-LANDING-COPY-002
 *
 * Asserts that the landing copy rewrite is live:
 *  - NEW marketing strings (AI-free) are present on /pt-BR (default) and /en
 *  - OLD marketing strings (AI-positioning) are absent
 *  - Hero title is preserved (regression guard)
 *
 * TDD contract: this spec MUST fail before the i18n edits land, and pass after.
 * Runs at desktop 1440x900 and mobile 375x812 per UX validation requirement.
 */

import { test, expect, type Page } from "@playwright/test";

type CopyCheck = {
  slot: string;
  newText: string;
  oldText: string;
};

const PT_NEW_COPY: CopyCheck[] = [
  { slot: "C2-01 hero.badge",      newText: "Do começo ao fim, do seu jeito",
    oldText: "A Nova Era do Planejamento" },
  { slot: "C2-03 hero.subtitle",   newText: "Viagens que combinam com você",
    oldText: "A IA cuida dos detalhes" },
  { slot: "C2-04 ai.title",        newText: "Organize, descubra, viaje",
    oldText: "Ferramentas de planejamento com IA" },
  { slot: "C2-06 ai.feature1",     newText: "Roteiros que se adaptam a você",
    oldText: "Geração de roteiro dia a dia completo" },
  { slot: "C2-07 ai.feature2",     newText: "Checklist personalizado para cada viagem",
    oldText: "Checklist inteligente de documentos e vistos" },
  { slot: "C2-08 ai.feature3",     newText: "Guia personalizado do destino",
    oldText: "Guia detalhado do destino com dicas locais" },
  { slot: "C2-09 phases.subtitle", newText: "Transforme cada fase da viagem",
    oldText: "metodologia proprietária" },
  { slot: "C2-10 phase4Reordered.description", newText: "Cronograma dia a dia otimizado, usando o guia",
    oldText: "otimizado por IA" },
  { slot: "C2-11 gamification.explanation",    newText: "guias pensados para o seu estilo de viagem",
    oldText: "guias de destino com IA" },
];

const EN_NEW_COPY: CopyCheck[] = [
  { slot: "C2-01 hero.badge",      newText: "From start to finish, your way",
    oldText: "The New Era of Planning" },
  { slot: "C2-03 hero.subtitle",   newText: "Trips that match who you are",
    oldText: "AI handles the details" },
  { slot: "C2-04 ai.title",        newText: "Organize, discover, travel",
    oldText: "AI-powered planning tools" },
  { slot: "C2-06 ai.feature1",     newText: "Itineraries that adapt to you",
    oldText: "Complete day-by-day itinerary generation" },
  { slot: "C2-07 ai.feature2",     newText: "Personalized checklist for every trip",
    oldText: "Smart document and visa checklist" },
  { slot: "C2-08 ai.feature3",     newText: "Personalized destination guide",
    oldText: "Detailed destination guide with local tips" },
  { slot: "C2-09 phases.subtitle", newText: "Turn every phase of your trip",
    oldText: "proprietary methodology" },
  { slot: "C2-10 phase4Reordered.description", newText: "Day-by-day schedule, using the guide",
    oldText: "AI-optimized day-by-day" },
  { slot: "C2-11 gamification.explanation",    newText: "guides tailored to your travel style",
    oldText: "powered by AI" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile",  width:  375, height: 812 },
] as const;

async function assertCopy(page: Page, checks: CopyCheck[]) {
  const body = page.locator("body");
  for (const check of checks) {
    await expect(body, `${check.slot} — new text should be present`).toContainText(
      check.newText
    );
    await expect(body, `${check.slot} — old text must be absent`).not.toContainText(
      check.oldText
    );
  }
}

// ---------------------------------------------------------------------------
// pt-BR (default locale, localePrefix=as-needed → no path prefix)
// ---------------------------------------------------------------------------

test.describe("SPEC-LANDING-COPY-002 — pt-BR", () => {
  for (const vp of VIEWPORTS) {
    test(`pt-BR @ ${vp.name} — new copy present, old copy absent`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        locale: "pt-BR",
      });
      const page = await context.newPage();
      try {
        await page.goto("/");
        await page.waitForLoadState("networkidle");

        // Regression guard: hero title preserved
        await expect(
          page.getByRole("heading", { name: /sua próxima aventura/i }).first()
        ).toBeVisible();

        await assertCopy(page, PT_NEW_COPY);
      } finally {
        await context.close();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// en
// ---------------------------------------------------------------------------

test.describe("SPEC-LANDING-COPY-002 — en", () => {
  for (const vp of VIEWPORTS) {
    test(`en @ ${vp.name} — new copy present, old copy absent`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        locale: "en-US",
      });
      const page = await context.newPage();
      try {
        await page.goto("/en/");
        await page.waitForLoadState("networkidle");

        await assertCopy(page, EN_NEW_COPY);
      } finally {
        await context.close();
      }
    });
  }
});
