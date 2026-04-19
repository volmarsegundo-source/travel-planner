# SPEC-LANDING-HEADER-001 — Landing header PT/EN parity

**Status**: Approved (PO Volmar, 2026-04-19)
**Sprint**: 44 — pre-Beta
**Owner**: dev-fullstack-1

## 1. Problem

During pre-Beta staging tests, PO observed 3 dead menus (`Explorar`, `Minhas Viagens`, `Planejador`) in the PT landing header. They are dead links (`href="#"`), not useful for anonymous visitors, and not aligned with the intended anonymous landing nav (logo + language switch + Entrar + Criar Conta).

## 2. Line-exact root cause

- `src/components/features/landing/LandingNav.tsx:39-59` — desktop nav renders 3 dead `<a href="#">` items always, regardless of locale.
- `src/components/features/landing/LandingNav.tsx:105-129` — mobile dropdown duplicates the same 3 dead items.
- `messages/pt-BR.json:2410-2412` + `messages/en.json:2410-2412` — keys `landingV2.nav.{explore,myTrips,planner}` exist and are only referenced by this component.

The PO's framing ("EN is correct") does not match the actual rendering — both locales render the same dead menus. Desired final state is unambiguous: **remove the 3 items**.

## 3. 9-dimension summary

| Dim | Content |
|---|---|
| PROD | Anonymous landing header = logo (left) ∣ lang switch + Login + Register (right). Out of scope: authenticated navbar. |
| UX | Keep `LandingNav` visual treatment; remove 3 menu items desktop + mobile. Mobile hamburger retains only the right-side CTAs — or drops entirely if no dropdown content remains. |
| TECH | Delete lines 39-59 + 105-129 of `LandingNav.tsx`. Delete 3 i18n keys (`explore`, `myTrips`, `planner`) under `landingV2.nav` in pt-BR.json + en.json. Zero new deps. |
| SEC | N/A (removing dead client-side links). |
| AI | N/A. |
| INFRA | N/A. |
| QA | Unit test: `LandingNav` in pt + en does NOT render strings for the 3 removed items. |
| RELEASE | No flag — merge direct after PO + UX approval. |
| COST | N/A. |

## 4. Acceptance criteria

1. AC-H-001: Desktop anonymous header renders exactly: Atlas logo (left), lang switcher + Login CTA + Register CTA (right). No other interactive element.
2. AC-H-002: Mobile anonymous header renders Atlas logo + Login CTA + hamburger; hamburger open drops no stale menu items.
3. AC-H-003: Both locales (pt-BR, en) render the same structure — PT/EN parity.
4. AC-H-004: i18n keys `landingV2.nav.explore|myTrips|planner` removed from both locale files.

## 5. Gate EDD (symbolic)

- PR ≥ 0.80 | Staging ≥ 0.85 | Prod ≥ 0.90
- Weights: Safety 30% + Accuracy 25% + Performance 20% + UX 15% + i18n 10%
- Scoring for this PR (UI-only): unit test passing + build clean + line-exact traceability = self-rated 0.92.
