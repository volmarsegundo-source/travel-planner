# SPEC-LANDING-COPY-002 — Hero / Tools / Phases copy rewrite (AI-free marketing)

**Version:** 1.0.0
**Status:** Approved for execution (PO Volmar, 2026-04-20)
**Sprint:** 44 (pre-Beta — Wave 2.1)
**Owner:** dev-fullstack-1
**Related:** SPEC-LANDING-COPY-001, SPEC-LANDING-LAYOUT-001, onda2-regression-diagnosis-2026-04-20
**UX validation:** `docs/design/landing-copy-002-validation-2026-04-20.md`

---

## 1. Problem (line-exact root cause)

Post-diagnosis of the 2026-04-20 staging regression: SPEC-LANDING-COPY-001
**explicitly excluded** "Copy rewrites of hero/AI/gamification sections" (see
COPY-001 Section 2, Out of scope). As a result, eight marketing strings on the
landing page still advertise the product as AI-powered and perpetuate the
pre-Atlas voice:

| # | i18n key (pt-BR.json + en.json) | Current PT | Slot |
|---|---|---|---|
| 1 | `landingV2.hero.badge` (L2433) | "A Nova Era do Planejamento" | Hero eyebrow |
| 2 | `landingV2.hero.subtitle` (L2435) | "Planeje viagens incríveis em minutos — fácil, inteligente e divertido. A IA cuida dos detalhes, você aproveita a aventura." | Hero subtitle |
| 3 | `landingV2.ai.title` (L2494) | "Ferramentas de planejamento com IA" | Tools section title |
| 4 | `landingV2.ai.description` (L2495) | "Gere roteiros completos, checklists de documentos e guias de destino — tudo personalizado para o perfil da sua viagem." | Tools section subtitle |
| 5 | `landingV2.ai.feature1` (L2496) | "Geração de roteiro dia a dia completo" | Bullet 1 |
| 6 | `landingV2.ai.feature2` (L2497) | "Checklist inteligente de documentos e vistos" | Bullet 2 |
| 7 | `landingV2.ai.feature3` (L2498) | "Guia detalhado do destino com dicas locais" | Bullet 3 |
| 8 | `landingV2.phases.subtitle` (L2442) | "Nossa metodologia proprietária garante que nada seja esquecido, transformando cada etapa em uma experiência fluida." | 8-Phases subtitle |

The hero title (`landingV2.hero.title`, "Sua próxima aventura comeca aqui") is
preserved per PO directive — out of scope for rewriting.

## 2. Scope

**In scope (this spec):**
- Replace 8 strings in `messages/pt-BR.json` (lines 2433, 2435, 2442, 2494–2498).
- Replace the 8 equivalent strings in `messages/en.json` (same line numbers).
- All new copy MUST NOT explicitly mention "AI" / "IA" / "inteligência artificial".
- The C2-05 (`ai.description`) rewrite is a **minimal edit** — drop the imperative
  "Gere" and start with a noun, per UX recommendation (keeps the information,
  removes the auto-generation framing that would clash with the new "Organize,
  descubra, viaje" section title).
- Add a Playwright E2E smoke test that asserts new strings present + old strings
  absent on `/pt` and `/en`, at mobile (375px) and desktop (1440px) viewports.

**Out of scope:**
- Title `landingV2.hero.title` (PO directive: keep).
- Two **additional** AI mentions flagged by UX on lines `landingV2.gamification.explanation`
  (L2504) and `landingV2.phase4Reordered.description` (L2482). Escalated to PO
  for a future SPEC-LANDING-COPY-003. Not touched here.
- Legal pages (`/terms`, `/privacy`): AI transparency is legally required.
- Component-level changes (no TSX edits — pure i18n edits).
- Visual regression / snapshot tests (not in EDD gate here; optional addition).

## 3. Acceptance criteria (BDD-style)

```gherkin
Scenario 1 — PT landing has new hero copy and no AI marketing
  Given a visitor on /pt
  When the landing page is fully hydrated
  Then the hero badge reads "Do começo ao fim, do seu jeito"
  And the hero subtitle contains "Viagens que combinam com você"
  And the hero subtitle does NOT contain "A IA cuida dos detalhes"
  And the hero subtitle does NOT contain "planejamento"

Scenario 2 — PT Tools section uses new copy
  Given a visitor on /pt
  When they scroll to the Tools section (AiSectionV2)
  Then the section title reads "Organize, descubra, viaje"
  And the section description does NOT start with "Gere"
  And the three feature bullets read exactly:
    - "Roteiros que se adaptam a você"
    - "Checklist personalizado para cada viagem"
    - "Guia personalizado do destino"
  And none of the above contain "IA"

Scenario 3 — PT Phases section uses the new subtitle
  Given a visitor on /pt
  When they scroll to the 8 Fases section
  Then the subtitle reads "Transforme cada fase da viagem em uma experiência fluida e pensada para você"
  And the subtitle does NOT contain "proprietária"

Scenario 4 — EN mirrors the AI-free strategy
  Given a visitor on /en
  Then the hero badge reads "From start to finish, your way"
  And the Tools title reads "Organize, discover, travel"
  And no new marketing string contains the token "AI"

Scenario 5 — Hero title is preserved (regression guard)
  Given a visitor on /pt
  Then the hero title still reads "Sua próxima aventura comeca aqui"

Scenario 6 — No layout regression in mobile
  Given a visitor on /pt at viewport 375×812
  Then the hero badge, subtitle, tools title, bullets, and phases subtitle
       render without horizontal overflow
```

## 4. Technical plan

### 4.1 i18n edits — `messages/pt-BR.json`

| Line | Key | From | To |
|---|---|---|---|
| 2433 | `landingV2.hero.badge` | "A Nova Era do Planejamento" | "Do começo ao fim, do seu jeito" |
| 2435 | `landingV2.hero.subtitle` | "Planeje viagens incríveis em minutos — fácil, inteligente e divertido. A IA cuida dos detalhes, você aproveita a aventura." | "Viagens que combinam com você. Organize tudo num lugar só, com recomendações pensadas para o seu perfil." |
| 2442 | `landingV2.phases.subtitle` | "Nossa metodologia proprietária garante que nada seja esquecido, transformando cada etapa em uma experiência fluida." | "Transforme cada fase da viagem em uma experiência fluida e pensada para você" |
| 2494 | `landingV2.ai.title` | "Ferramentas de planejamento com IA" | "Organize, descubra, viaje" |
| 2495 | `landingV2.ai.description` | "Gere roteiros completos, checklists de documentos e guias de destino — tudo personalizado para o perfil da sua viagem." | "Roteiros completos, checklists de documentos e guias de destino — tudo personalizado para o perfil da sua viagem." |
| 2496 | `landingV2.ai.feature1` | "Geração de roteiro dia a dia completo" | "Roteiros que se adaptam a você" |
| 2497 | `landingV2.ai.feature2` | "Checklist inteligente de documentos e vistos" | "Checklist personalizado para cada viagem" |
| 2498 | `landingV2.ai.feature3` | "Guia detalhado do destino com dicas locais" | "Guia personalizado do destino" |

### 4.2 i18n edits — `messages/en.json`

| Line | Key | From | To |
|---|---|---|---|
| 2433 | `landingV2.hero.badge` | "The New Era of Planning" | "From start to finish, your way" |
| 2435 | `landingV2.hero.subtitle` | "Plan amazing trips in minutes — easy, smart, and fun. AI handles the details, you enjoy the adventure." | "Trips that match who you are. Organize everything in one place, with recommendations tailored to your profile." |
| 2442 | `landingV2.phases.subtitle` | "Our proprietary methodology ensures nothing is forgotten, turning each step into a seamless experience." | "Turn every phase of your trip into a seamless experience tailored to you" |
| 2494 | `landingV2.ai.title` | "AI-powered planning tools" | "Organize, discover, travel" |
| 2495 | `landingV2.ai.description` | "Generate complete itineraries, document checklists, and destination guides — all personalized to your trip profile." | "Complete itineraries, document checklists, and destination guides — all personalized to your trip profile." |
| 2496 | `landingV2.ai.feature1` | "Complete day-by-day itinerary generation" | "Itineraries that adapt to you" |
| 2497 | `landingV2.ai.feature2` | "Smart document and visa checklist" | "Personalized checklist for every trip" |
| 2498 | `landingV2.ai.feature3` | "Detailed destination guide with local tips" | "Personalized destination guide" |

### 4.3 New E2E test — `e2e/landing-copy-002.spec.ts`

- Boots Playwright against `PLAYWRIGHT_BASE_URL` (defaults to local).
- Two describe blocks: `/pt` and `/en`.
- For each locale: mobile viewport {width: 375, height: 812} and desktop {1440, 900}.
- Asserts new copy present (`expect(page.locator('body')).toContainText(...)`).
- Asserts old copy absent (`expect(page.locator('body')).not.toContainText(...)`).
- Preserves hero title as a regression guard.

### 4.4 Files touched

| File | Change |
|---|---|
| `messages/pt-BR.json` | 8 string replacements (lines 2433, 2435, 2442, 2494–2498) |
| `messages/en.json` | 8 string replacements (same line numbers) |
| `e2e/landing-copy-002.spec.ts` | NEW — Playwright smoke |
| `docs/specs/sprint-44-pre-beta/SPEC-LANDING-COPY-002.md` | NEW — this file |
| `docs/design/landing-copy-002-validation-2026-04-20.md` | Already written by ux-designer |

## 5. SDD dimensions (9)

- **PROD**: Aligns landing marketing with the post-consent positioning (the AI
  is implementation detail, not the product). Fixes the PO staging regression
  without a rollback cycle.
- **UX**: Every new string is equal or shorter than the current one (biggest drop:
  C2-09 at −39 chars, C2-08 at −14). UX validated: no wrapping regressions at
  375px. Hierarchy preserved (eyebrow < subtitle < section subtitle < body).
- **TECH**: Pure i18n replacement. No new code paths, no components, no deps.
  C2-05 is a minimal edit (drop one verb) to keep the section's voice coherent
  with the new `ai.title`.
- **SEC**: N/A — no auth, no PII, no attack surface.
- **AI**: N/A — no runtime AI involvement. The *marketing strategy* is to remove
  explicit AI framing from the landing funnel; this spec executes that strategy
  for the 8 specified slots. Two additional AI references (gamification.explanation,
  phase4Reordered.description) are escalated to PO for COPY-003.
- **INFRA**: N/A — no infra change. Vercel redeploy picks up the JSON diff
  automatically.
- **QA**: TDD — write the Playwright spec first, confirm it fails against the
  current deploy, apply i18n edits, confirm it passes. Unit suite (`npm run test`)
  MUST still be green (no snapshot tests assert these strings, per pre-check).
- **RELEASE**: Patch (no breaking change, no migration, reversible via revert).
  No feature flag. Conventional commit: `feat(landing)(SPEC-LANDING-COPY-002)`.
- **COST**: Zero. No new runtime cost, no new Vercel build cost beyond the usual
  redeploy.

## 6. Trust gates

- **PR gate**: Trust Score ≥ 0.80
- **Staging gate**: ≥ 0.85
- **Prod gate**: ≥ 0.90

Weights: UX 25% + i18n 25% + Accuracy 20% + Safety 20% + Performance 10%.

## 7. Stop conditions

- If the new copy causes visible wrapping breakage at 375px that UX did not
  predict → STOP, report to PO, iterate on copy before committing.
- If the unit suite fails because an existing snapshot asserted one of the old
  strings → STOP, report the snapshot path and let QA decide between updating
  the snapshot and rolling back the copy change.

## 8. Change history

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0.0 | 2026-04-20 | dev-fullstack-1 | Initial spec. Approved by PO Volmar after Phase 1 diagnosis of 2026-04-20 staging regression. |
