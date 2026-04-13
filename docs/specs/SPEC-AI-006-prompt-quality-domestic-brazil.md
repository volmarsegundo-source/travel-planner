# SPEC-AI-006 — Prompt quality for Brazilian domestic trips + eval dataset expansion

**Status**: DRAFT — awaiting prompt-engineer + qa-engineer review
**Owner**: prompt-engineer (implementation) · qa-engineer (eval gating)
**Sprint target**: 44
**Depends on**: travel-plan.prompt v1.2.0 · destination-guide.prompt v2.1.0 (Sprint 43 QA Etapa 1 — `system-prompts.ts` current state)
**Related commits**: 251e5cd, 6f262b8, (Etapa 1 fix commit)

---

## 1. Context

Sprint 43 closed with Etapa 1 of the prompt-quality fixes (emergency numbers,
currency binding, realistic schedules, anti-hallucination hedge). The remaining
items from the prompt review — schema relaxations for small destinations and
trip-type branching — require schema changes and eval coverage, so they ship
in a separate Sprint 44 spec.

The Travel Planner is launching with Brazilian domestic trips as a primary
use case. Today's prompts are tuned for international itineraries with rigid
schemas (passport always required, mustSee always 5-8, checklist always
includes HEALTH/vaccines). For a 3-day São Paulo → Campinas trip those
constraints force the model to either invent content or emit meaningless
placeholder text.

## 2. Problem statement

Five prompt-quality gaps remain after Etapa 1:

| # | Gap | Impact |
|---|-----|--------|
| 5 | `GUIDE_SYSTEM_PROMPT` mustSee = 5-8 rigid | Small towns (Piracicaba, Bonito) get padded/fabricated attractions |
| 6 | `GUIDE_SYSTEM_PROMPT.documentation` always demands passport/visa | Domestic Brazilian guides show nonsensical "no passport required" boilerplate |
| 7 | `PLAN_SYSTEM_PROMPT` does not branch on `trip_type` | Domestic itineraries waste tokens on airport pickup / immigration / FX |
| 8 | `CHECKLIST_SYSTEM_PROMPT` fixed 5 categories including HEALTH/vaccines | Domestic checklists include irrelevant international categories |
| 9 | No eval dataset covering Brazilian domestic or small-town destinations | No regression gate for items 5-8 or the Etapa 1 fixes |

## 3. Proposed changes

### 3.1 Relax `GUIDE_SYSTEM_PROMPT` schema for small destinations

- `mustSee`: change "5-8 items" → "4-8 items, prefer fewer high-confidence items over padded lists".
- `documentation`: make `passport`, `visa`, `vaccines` fields nullable. Add a personalization rule:
  > When `trip_type` is "domestic", set `documentation.passport` and `documentation.visa` to "not required" and focus on local ID (Brazil: RG/CNH). Skip vaccine requirements unless the destination has region-specific ones (yellow fever for Pantanal/Amazônia).

### 3.2 Branch `PLAN_SYSTEM_PROMPT` on `trip_type`

Add a new CONSTRAINT:
> When `trip_type` is "domestic" (declared in `<traveler_context>`), DO NOT include airport pickups, immigration queues, currency exchange, SIM-card purchases, or passport-control activities. Focus on ground transit (bus terminals, car rentals, Uber) and local payment methods.

### 3.3 Split `CHECKLIST_SYSTEM_PROMPT` categories by trip type

New schema rule:
- For `trip_type` domestic → allowed categories: `DOCUMENTS` (only RG/CNH), `HEALTH` (only basic meds), `WEATHER`, `TECHNOLOGY`.
- For `trip_type` international → existing 5 categories including full HEALTH/vaccines and CURRENCY.

Requires passing `tripType` into the checklist prompt (the builder currently drops it).

### 3.4 Eval dataset expansion (blocks release)

Add 6 test cases to `tests/evals/datasets/prompt-quality.json`:

1. **PB-3d-Piracicaba-BRL600** — `currency === "BRL"`, all costs in BRL, no airport activities, meal times in 12–14 / 19–21, documentation.passport reflects domestic, mustSee ≥ 4 items, no invented-looking venue names (grader: LLM-as-judge with a hedging rubric).
2. **PB-5d-Bonito-BRL2500** — same as above plus `safety.emergencyNumbers.police === "190"`, `ambulance === "192"`.
3. **INT-7d-Lisboa-EUR1400** — regression: `emergencyNumbers.police === "112"`, `currency === "EUR"`.
4. **INT-10d-Tokyo-USD3000** — regression: emergency numbers correct for Japan (110/119), currency correct.
5. **MC-SaoPaulo-Rio-Florianopolis** — multi-city: transit days present, `city` tags correct, BRL throughout, no duplicated São Paulo attractions in Rio guide.
6. **TRAP-2d-Jacutinga-MG** — hallucination trap: assert no specific restaurant names with ratings, no specific addresses, prefer descriptive titles ("Passeio pela praça central").

### 3.5 Gate

Before merging v2.2.0 (guide) and v1.3.0 (plan), all 6 eval cases must run with `npm run eval:gate` and hit the staging threshold (trust score ≥ 0.85).

## 4. Out of scope

- Google Places / mapping integration for venue verification — separate spec.
- Claude vs Gemini A/B on these prompts — separate experiment.
- Multi-language checklist personalization — Sprint 45.

## 5. Risks

- **Cache bust**: Version bumps invalidate the Anthropic prompt cache. Expected one-time cost spike. finops-engineer to validate.
- **Schema breakage**: Making `passport` nullable changes the Zod schema consumed by `destinationGuide.service`. Migration of existing DB rows not needed (JSON column), but the client render needs a null guard.
- **Eval flakiness**: LLM-as-judge with hedging rubric can be subjective — qa-engineer to calibrate with >10 sample runs before gating.

## 6. Test strategy

- **Unit tests** (TDD): new assertions on `PLAN_SYSTEM_PROMPT` and `GUIDE_SYSTEM_PROMPT` for each rule.
- **Eval tests**: 6 cases above, run in CI on every prompt-file change.
- **Regression**: full existing eval dataset must remain green.

## 7. Rollback plan

If v2.2.0 / v1.3.0 regresses the staging trust score:
1. Revert the prompt files (single commit).
2. Re-run eval suite to confirm return to baseline.
3. Keep the DB `promptTemplate` overrides feature-flag-gated so ops can flip back via env var without redeploy.
