# Promptfoo Eval Suite

Complementary eval layer to the Vitest-based evals already in `tests/evals/*.eval.ts`. Driven by declarative YAML datasets + JS graders.

- Spec: [`docs/specs/SPEC-EVALS-V1.md`](../../docs/specs/SPEC-EVALS-V1.md)
- Trust Score methodology: [`docs/process/TRUST-SCORE.md`](../../docs/process/TRUST-SCORE.md)

## Quick start

```bash
# Run the full Promptfoo suite against the mock provider (no API cost)
npx promptfoo eval -c tests/evals/promptfooconfig.yaml --output eval-results.json

# Check the composite Trust Score gate (PR threshold = 0.80)
node tests/evals/scripts/gate.js eval-results.json --threshold=0.80

# Open the interactive report
npx promptfoo view
```

## Structure

```
tests/evals/
  promptfooconfig.yaml          # main config
  datasets/
    guide.yaml                  # 5 cases — destination guide
    plan.yaml                   # 6 cases — travel plan (multi-city incluso)
    checklist.yaml              # 5 cases — pre-trip checklist
  graders/
    safety.js                   # emergency numbers, PII, injection markers
    accuracy.js                 # schema + required fields + echo check
    performance.js              # latency + token budget
    ux.js                       # structural completeness, language tag
    i18n.js                     # currency, locale, language fingerprint
  providers/
    mock-provider.js            # deterministic fixture provider
  scripts/
    gate.js                     # composite Trust Score gate (CI)
    drift.js                    # regression check vs. baseline
    scheduled.js                # full run + history snapshot
    trend.js                    # show trust score trend
```

## Composite Trust Score

| Dimension | Weight | Grader |
|-----------|-------:|--------|
| Safety | 30% | `graders/safety.js` |
| Accuracy | 25% | `graders/accuracy.js` |
| Performance | 20% | `graders/performance.js` |
| UX | 15% | `graders/ux.js` |
| i18n | 10% | `graders/i18n.js` |

Degradation rules (match `src/lib/evals/trust-score.ts`):
- `safety < 0.90` caps composite at `0.79` (flagged DEGRADED)
- any dimension `< 0.50` caps composite at `0.69`

## Gates per environment

| Gate | Threshold | Script |
|------|----------:|--------|
| PR (CI) | 0.80 | `gate.js --threshold=0.80` |
| Staging | 0.85 | `gate.js --threshold=0.85` |
| Production | 0.90 | `gate.js --threshold=0.90` |

## Coexistence with Vitest evals

This Promptfoo suite is **additive**. The existing Vitest evals (`*.eval.ts`) remain the source of truth for:

- Injection resistance (`injection-resistance.eval.ts`)
- Schema validation (`schema-validation.eval.ts`)
- i18n completeness (`i18n-completeness.eval.ts`)
- Token budget (`token-budget.eval.ts`)
- LLM-as-judge quality (`llm-judge.eval.ts`)
- Composite Trust Score unit tests (`trust-score.test.ts`)

See [`docs/specs/SPEC-EVALS-V1.md` §2.2](../../docs/specs/SPEC-EVALS-V1.md) for the division of responsibilities.

## Package scripts

The proposed npm scripts use the `pf:` prefix to avoid collision with the existing Vitest eval scripts — see [`package-scripts.patch.md`](./package-scripts.patch.md).

## Playbooks

| Condition | Playbook |
|-----------|----------|
| Trust Score below threshold | [`docs/evals/playbooks/trust-score-drop.md`](../../docs/evals/playbooks/trust-score-drop.md) |
| Drift > 10% | [`docs/evals/playbooks/drift-detected.md`](../../docs/evals/playbooks/drift-detected.md) |
| Injection resistance fails | [`docs/evals/playbooks/injection-detected.md`](../../docs/evals/playbooks/injection-detected.md) |
