# SPEC-LANDING-LAYOUT-001 — Landing layout cleanup (drop AI placeholders + reorder sections)

**Status**: Approved (PO Volmar, 2026-04-19)
**Sprint**: 44 — pre-Beta
**Owner**: dev-fullstack-1

## 1. Problem

Two issues on the anonymous landing page uncovered in pre-Beta staging:

1. The AI section ships a **fake** right-column mockup: a gradient placeholder with literal text "AI Preview" and a floating "Lisbon balloon" quoting `"Generate a 7-day itinerary for Lisbon."`. There is also a "Learn how it works" CTA button with no `onClick` handler — a dead CTA. These mislead anonymous visitors by implying a product preview that is not wired up.
2. Section order buries the concrete value (destinations) below the abstract AI pitch. PO wants the landing to open with proof (phases + destinations) before pitching AI.

## 2. Line-exact root cause

- `src/components/features/landing/AiSectionV2.tsx:37-43` — `<button>` with no `onClick`, renders `{t("cta")}` ("Learn how it works"). Dead CTA.
- `src/components/features/landing/AiSectionV2.tsx:46-67` — right column: gradient placeholder with "AI Preview" literal + floating `promptExample` card ("Generate a 7-day itinerary for Lisbon.").
- `src/components/features/landing/AiSectionV2.tsx:55-57` — hard-coded English string "AI Preview" inside an i18n-ed component (bypasses localization).
- `src/components/features/landing/LandingPageV2.tsx:20-24` — section order: Hero → Phases → **Ai → Gamification → Destinations**. PO wants Destinations before AI.
- `messages/en.json:2482-2484` + `messages/pt-BR.json:2482-2484` — `landingV2.ai.{cta,promptExample,mockupAlt}` keys only referenced by the removed code.

## 3. 9-dimension summary

| Dim | Content |
|---|---|
| PROD | Landing opens with: Hero → Phases → Destinations → Gamification → AI. AI section is text-only (no fake mockup, no dead CTA) until we can ship a real animated demo. |
| UX | Drop fake mockup, Lisbon balloon, dead CTA. AI section becomes a single-column text block centered, max-w cap on prose. Preserve feature checklist + heading + description. |
| TECH | Delete lines 37-43 and 46-67 of AiSectionV2. Change flex-row to single column. Reorder sections in LandingPageV2. Delete 3 i18n keys per locale. |
| SEC | N/A. |
| AI | N/A (removing fake AI preview). |
| INFRA | N/A. |
| QA | Unit test: AiSectionV2 does not render "AI Preview", `promptExample` text, or the fake CTA button. LandingPageV2 renders sections in new order. |
| RELEASE | No flag — merge direct after PO + UX approval. |
| COST | N/A. |

## 4. Acceptance criteria

1. AC-L-001: AiSectionV2 no longer renders literal "AI Preview".
2. AC-L-002: AiSectionV2 no longer renders the floating Lisbon prompt card.
3. AC-L-003: AiSectionV2 no longer renders a CTA button ("Learn how it works") with no handler.
4. AC-L-004: LandingPageV2 renders sections in this order: Hero, Phases, Destinations, Gamification, AI.
5. AC-L-005: i18n keys `landingV2.ai.{cta,promptExample,mockupAlt}` removed from both locale files.

## 5. Gate EDD (symbolic)

- PR ≥ 0.80 | Staging ≥ 0.85 | Prod ≥ 0.90
- Weights: Safety 30% + Accuracy 25% + Performance 20% + UX 15% + i18n 10%
- Scoring for this PR: UI cleanup + section reorder + test = self-rated 0.90.
