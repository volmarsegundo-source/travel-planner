# SPEC-LANDING-LANGTOOLTIP-001 — Language switcher tooltip flip (top → bottom)

**Status**: Approved (PO Volmar, 2026-04-19)
**Sprint**: 44 — pre-Beta
**Owner**: dev-fullstack-1

## 1. Problem

On the public landing page, the language switcher sits inside a sticky header at `top: 0`. When hovered/focused, the tooltip renders **above** the button (`bottom-full mb-2`), so it is pushed off the top of the viewport and gets clipped by the browser chrome — effectively invisible to the user.

## 2. Line-exact root cause

- `src/components/layout/LanguageSwitcher.tsx:165` — tooltip container uses `bottom-full left-1/2 -translate-x-1/2 mb-2`, which positions it above the anchor.
- `src/components/layout/LanguageSwitcher.tsx:168-170` — arrow pseudo-element uses `top-full ... border-t-gray-900` (arrow attached to the bottom of the tooltip, pointing downward toward the button).

## 3. 9-dimension summary

| Dim | Content |
|---|---|
| PROD | Tooltip must always be visible. On the landing header (`position: sticky; top: 0`) a top-anchored tooltip is structurally impossible. |
| UX | Flip tooltip below the anchor. Arrow flips to the top of the tooltip, still pointing at the button. Delay (300ms), aria-describedby, motion-reduce behavior preserved. |
| TECH | Change 2 lines. `bottom-full mb-2` → `top-full mt-2`. `top-full border-t-gray-900` → `bottom-full border-b-gray-900`. Zero new deps, zero new state. |
| SEC | N/A. |
| AI | N/A. |
| INFRA | N/A. |
| QA | Unit test: tooltip container has classes `top-full` + `mt-2` AND does NOT have `bottom-full` or `mb-2`. Arrow has `bottom-full` + `border-b-gray-900`. |
| RELEASE | No flag — merge direct after PO + UX approval. |
| COST | N/A. |

## 4. Acceptance criteria

1. AC-T-001: Hovering the language switcher on the public landing header renders the tooltip BELOW the switcher, fully inside the viewport.
2. AC-T-002: The arrow points UP at the switcher from the top edge of the tooltip.
3. AC-T-003: 300ms show delay, aria-describedby wiring, motion-reduce class, and max-width cap preserved.
4. AC-T-004: Existing LanguageSwitcher tests remain green.

## 5. Gate EDD (symbolic)

- PR ≥ 0.80 | Staging ≥ 0.85 | Prod ≥ 0.90
- Weights: Safety 30% + Accuracy 25% + Performance 20% + UX 15% + i18n 10%
- Scoring for this PR: line-exact CSS flip + unit test = self-rated 0.92.
