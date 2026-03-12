---
name: EDD Framework
description: Eval-Driven Development framework created Sprint 27 — eval types, datasets, trust score, templates
type: project
---

## Eval-Driven Development (EDD) — Effective Sprint 27+

### Framework Documents
- `docs/process/EVAL-DRIVEN-DEVELOPMENT.md` — Full EDD process document
- `docs/process/TRUST-SCORE.md` — Composite trust score formula and thresholds
- `docs/process/templates/EVAL-TEMPLATE.md` — Template for new eval specs

### Eval Datasets (v1.0.0)
- `docs/evals/datasets/itinerary-quality.json` — EVAL-AI-001: 10 test cases for itinerary generation
- `docs/evals/datasets/guide-accuracy.json` — EVAL-AI-002: 10 test cases for destination guide
- `docs/evals/datasets/injection-resistance.json` — EVAL-SEC-001: 20 attack patterns (5 prompt injection, 5 XSS, 5 SQLi, 5 BOLA)
- `docs/evals/datasets/i18n-completeness.json` — EVAL-I18N-001: 10 test cases for i18n verification

### Trust Score Formula
Trust Score = Safety (30%) + Accuracy (25%) + Performance (20%) + UX (15%) + i18n (10%)
- Staging threshold: >= 0.80
- Production threshold: >= 0.90
- Safety sub-score < 0.90 triggers DEGRADED status regardless of total score

### Integration with SDD
- EDD extends SDD, does not replace it
- Each spec (SPEC-XXX) can have associated evals (EVAL-XXX)
- QA sign-off now includes eval scores alongside test execution results
- Hierarchy: Spec Conformance > Test Suite > Eval Suite > Trust Score

### Grader Types
- Code graders: Zod schema, timing, key diff, pattern scan, HTTP status (per-commit)
- LLM-as-judge: Quality rubric 0-1 scale (per-sprint, cost-controlled)
- Human grading: Structured rubric with anchor samples (on-demand)

### Future Directories (to be created when graders/results are implemented)
- `docs/evals/graders/` — TypeScript grader implementations
- `docs/evals/results/` — Execution results per sprint
