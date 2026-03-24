# Sprint 39 — Review Document

**Tema**: Landing Page + Login V2
**Versao**: v0.34.0
**Data**: 2026-03-23
**Branch**: feat/sprint-39-landing-login-v2 (merged to master)
**Tag**: v0.34.0
**Baseline**: v0.33.0 (2597 unit tests)

---

## 1. Resumo Executivo

Sprint 39 entregou as primeiras telas migradas para o Design System V2: Landing Page completa (7 secoes) e Login com layout split-screen 60/40. Ambas controladas por feature flag (OFF por padrao). Tambem corrigiu 3 itens low-severity do Sprint 38.

### Resultados

| Metrica | v0.33.0 | v0.34.0 | Delta |
|---------|---------|---------|-------|
| Testes unitarios | 2597 | 2644 | +47 |
| Arquivos de teste | 173 | 177 | +4 |
| Falhas | 0 | 0 | 0 |
| Build | Clean | Clean | -- |

---

## 2. Entregaveis

### Track 1 — Landing Page V2 (dev-fullstack-1)

| Componente | Descricao | Tests |
|-----------|-----------|-------|
| LandingNav | Sticky nav, CTAs para unauth, hamburger mobile | -- |
| HeroSectionV2 | Navy bg, headline display, CTA primary, min-h-[85vh] | 9 |
| PhasesSectionV2 | 8 cards, Em Breve badge + opacity-60 + aria-disabled on 7-8 | 12 |
| AiSectionV2 | AI features showcase, dark section | -- |
| GamificationSectionV2 | PA/badges/ranks explanation, glow cards | -- |
| DestinationsSectionV2 | Asymmetric grid, gradient placeholders | -- |
| FooterV2 | bg-atlas-primary, LGPD, copyright, newsletter | 12 |
| LandingPageV2 | Composition of all 7 sections | -- |

### Track 2 — Login V2 + Carryover (dev-fullstack-2)

| Componente | Descricao | Tests |
|-----------|-----------|-------|
| LoginFormV2 | Split-screen 60/40, brand panel < lg hidden | 14 |
| Brand panel | atlas-primary bg, teal glow, mock trip card | -- |
| Social login | Google conditional on env vars | -- |
| FIX-001 | AtlasChip aria-pressed removed | -- |
| FIX-002 | AtlasPhaseProgress 44px touch target | -- |
| FIX-003 | AtlasButton glow-amber shadow | -- |

---

## 3. Design Decisions Implemented

| Decision | Implementation |
|---|---|
| Focus dual | Teal (#1c9a8e) input borders + Amber (atlas-focus-ring) keyboard ring |
| Link color | #005049 (atlas-on-tertiary-fixed-variant), 8.2:1 contrast |
| Footer bg | atlas-primary (#040d1b), NOT atlas-primary-container |
| Login mobile | Brand panel hidden below 1024px (lg breakpoint) |
| Phases 7-8 | "Em Breve" AtlasBadge + opacity-60 + aria-disabled + no hover |
| Images | Gradient placeholders (Unsplash in Sprint 40) |
| Icons | Lucide React (tree-shakeable) |
| ESLint cn/cva | Deferred as DEBT-S39-001 |

---

## 4. Feature Flag

| Scenario | Behavior |
|---|---|
| NEXT_PUBLIC_DESIGN_V2=false (default) | V1 renders, zero visual changes |
| NEXT_PUBLIC_DESIGN_V2=true | V2 renders (Landing + Login) |

DesignBranch wraps both pages in their route files.

---

## 5. Tech-Lead Validation

| Item | Status |
|---|---|
| 8 telas V2 | 8/8 PASS |
| Feature flags | 5/5 PASS |
| Carryover fixes | 4/4 PASS |
| Tests (2644) | PASS |
| Link color #005049 | PASS |
| Focus dual | PASS (ring-atlas-focus-ring on all inputs) |
| Footer links | PASS (fixed from # to /privacidade etc.) |

---

## 6. Pendencias

| Item | Status |
|------|--------|
| Unsplash images (replace gradient placeholders) | Sprint 40 |
| Register page V2 | Sprint 40 (optional in Sprint 39, not implemented) |
| Visual regression V2 baselines | Sprint 40 |
| ESLint cn/cva detection | DEBT-S39-001 |

---

*Documento gerado em 2026-03-23. Tag: v0.34.0.*
