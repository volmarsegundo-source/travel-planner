# SPEC-AI-006: Sprint 36 AI Impact Review

**Version**: 1.0.0
**Status**: Draft
**Author**: prompt-engineer
**Reviewers**: tech-lead, finops-engineer
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**Baseline**: v0.30.0

---

## 1. AI Impact Assessment per Feature

### 1.1 WizardFooter Global (SPEC-PROD-039)

| Dimension | Impact |
|---|---|
| Prompt changes | NONE |
| Token cost | ZERO |
| Guardrail changes | NONE |

WizardFooter is pure frontend UX. No AI involvement.

### 1.2 Badge System (SPEC-PROD-040)

| Dimension | Impact |
|---|---|
| Prompt changes | NONE |
| Token cost | ZERO |
| Guardrail changes | NONE |

Badges are reward/display only. The `planejador_nato` badge requires 100% data in all phases, meaning AI outputs may have richer context for these users, but this is incidental — no prompt modification needed.

### 1.3 PA Packages (SPEC-PROD-041)

| Dimension | Impact |
|---|---|
| Prompt changes | NONE |
| Token cost | ZERO |
| Guardrail changes | NONE |

PA is a currency wrapper around existing AI calls. Regeneration costs confirmed same as generation (30/50/80 PA, implemented Sprint 35).

### 1.4 Admin Dashboard (SPEC-PROD-042)

| Dimension | Impact |
|---|---|
| Prompt changes | NONE |
| Token cost | ZERO |
| Guardrail changes | NONE |

Pure backend/frontend analytics. No LLM calls.

---

## 2. Undecided Handling Follow-up (from SPEC-AI-005)

Sprint 34 added "Ainda nao decidi" checkboxes in Phase 4 steps. When undecided:
- No data is saved for that step
- `buildTravelerContext` in `travel-plan.prompt.ts` omits the `<logistics>` section
- This is safe — no hallucination risk

SPEC-AI-005 recommended adding explicit "Not yet decided" annotations in prompts. This was NOT implemented and remains a **P3 backlog item** for future sprints. Current behavior is acceptable: missing data = omitted section.

---

## 3. Token Cost Projection

| Feature | Sprint 35 Cost | Sprint 36 Delta | Sprint 36 Cost |
|---|---|---|---|
| Checklist (Haiku 4.5) | 30 PA / ~$0.012 | $0.00 | ~$0.012 |
| Guia do Destino (Haiku 4.5) | 50 PA / ~$0.017 | $0.00 | ~$0.017 |
| Roteiro (Sonnet 4.6) | 80 PA / ~$0.099 | $0.00 | ~$0.099 |
| **Total per expedition** | **160 PA / ~$0.128** | **$0.00** | **~$0.128** |

**Zero incremental AI cost for Sprint 36.**

---

## 4. Guardrail Review

All 7 guardrails unchanged and active:

| Guardrail | File | Status |
|---|---|---|
| Injection guard | `src/lib/guards/injection-guard.ts` | Active |
| PII masker | `src/lib/guards/pii-masker.ts` | Active |
| Zod output validation | Schema validators in actions | Active |
| Rate limiting | `src/lib/rate-limit.ts` | Active |
| Age guard | `src/lib/guards/age-guard.ts` | Active |
| PA cost gate | `gamification.actions.ts` (spendPAForAI) | Active |
| BOLA prevention | All server actions | Active |

---

## 5. Prompt Template Version Registry

| Template | Version | Last Changed | Sprint 36 Bump? |
|---|---|---|---|
| `checklist.prompt.ts` | v1.0.0 | Sprint 19 | No |
| `destination-guide.prompt.ts` | v1.0.0 | Sprint 19 | No |
| `travel-plan.prompt.ts` | v1.1.0 | Sprint 20 | No |

No prompt version bumps needed.

---

## 6. Recommendations

| ID | Recommendation | Priority | Sprint |
|---|---|---|---|
| REC-AI-001 | Add "Not yet decided" annotations for undecided Phase 4 steps | P3 | Backlog |
| REC-AI-002 | Consider badge-aware prompt enrichment (show user rank in context) | P4 | Backlog |
| REC-AI-003 | Batch API for non-urgent regenerations (50% cost reduction) | P2 | 38 |
| REC-AI-004 | Haiku for short itineraries (1-3 days) — 70% cost reduction | P2 | 38 |

---

## 7. Sign-off

- [x] Zero new AI features in Sprint 36
- [x] Zero incremental token cost
- [x] All guardrails remain active
- [x] No prompt changes required
- [x] Undecided handling reviewed — safe as-is

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — Sprint 36 AI review |
