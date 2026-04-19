# EDD Gate Failure Investigation — i18n Completeness

**Date**: 2026-04-19
**Investigator**: dev-fullstack-1 (diagnosis only — no fix applied)
**Eval**: `EVAL-I18N-001: i18n Completeness`
**Eval file**: `tests/evals/i18n-completeness.eval.ts`
**Grader**: `src/lib/evals/i18n-completeness.grader.ts`
**Branch**: `master`
**Report source**: `C:\Users\volma\AppData\Local\Temp\eval-report\eval-report.json`

---

## 1. Which eval test(s) scored 0.89

Two assertions failed inside `EVAL-I18N-001: i18n Completeness` (`tests/evals/i18n-completeness.eval.ts`):

| Line | Test name | Failure | Measuring |
|---|---|---|---|
| `:60` | `verifies key parity between en.json and pt-BR.json via grader` | `expected 0.89 to be greater than or equal to 0.9` | Overall grader composite score — penalty-based (missing -0.01, extra -0.005, empty -0.02, interpolation -0.03). Threshold for this assertion is `>= 0.9` (below the grader's own 0.95 default). |
| `:142` | `checks interpolation variable parity between locales` | `expected [ {…} ] to have length 0 but got 1` | Interpolation variable parity (excluding the whitelisted `expedition.phase2.step5.preferencesCount`). |

The other 5 assertions in the suite pass (key parity with 5% tolerance, empty-value scan, coverage/issue-count details).

Grader raw output:

```
score:              0.89
issueCounts:        { missingKeys: 5, extraKeys: 0, emptyValues: 0, interpolationMismatches: 2, total: 7 }
totalReferenceKeys: 2266
coverage (pt-BR):   99.8% (5 missing out of 2266)
```

Score math: `1.00 − (5 × 0.01) − (2 × 0.03) = 1.00 − 0.05 − 0.06 = 0.89`.

---

## 2. Root cause category

**Primary**: *missing keys* (5 keys in `en.json` absent from `pt-BR.json`).
**Secondary**: *interpolation parity mismatch* — one real, one false-positive from the grader regex.

Breakdown:

- **Missing keys (5)** — all under the `phaseReorderBanner` namespace, added to `en.json` but never translated to pt-BR.
- **Interpolation mismatch #1 (real)** — `dashboard.expeditions.tripCount`:
  - en: `"{count} {count, plural, one {expedition} other {expeditions}}"`
  - pt-BR: `"{count} {count, plural, one {expedição} other {expedições}}"`
  - The grader regex `/\{(\w+)(?:\s*,\s*\w+)?(?:\s*,\s*[^}]*)?\}/g` captures `expeditions` as a variable in en because it matches `\w+`, but does **not** capture `expedições` in pt-BR because `ç` is not a word character. Diagnosis: the ICU plural literals are being mis-parsed. The pt-BR translation is semantically correct; the grader produces a false positive driven by Latin-vs-Portuguese character classes.
- **Interpolation mismatch #2 (whitelisted)** — `expedition.phase2.step5.preferencesCount` (`{category}` vs `{categoria}` inside the plural form). Already tracked in the test's `KNOWN_MISMATCHES` allowlist (so test `:142` passes for it), but the grader at `:60` does **not** honor the allowlist and still deducts 0.03.

**Not** S44 injection-resistance drift. The IR-024 / lines 89/95/316 failures in `injection-resistance.eval.ts` are an unrelated regression where a sanitizer helper returns `undefined` instead of `{blocked: true, errorCode: 'PROMPT_INJECTION_DETECTED'}`. Those failures do not touch the i18n grader inputs or outputs.

---

## 3. List of affected keys

### 3a. Missing in `messages/pt-BR.json` (present in `en.json`)

1. `phaseReorderBanner.message`
2. `phaseReorderBanner.dismiss`
3. `phaseReorderBanner.dismissAriaLabel`
4. `phaseReorderBanner.learnMore`
5. `phaseReorderBanner.learnMoreHref`

Cross-check (grep): namespace lives at `messages/en.json:2833` and is consumed by `src/components/features/dashboard/PhaseReorderBanner.tsx` (`useTranslations("phaseReorderBanner")` on line 29). These are live, user-facing keys — translating them is a real product fix.

English source strings:

| Key | Value |
|---|---|
| `phaseReorderBanner.message` | "We have reorganized the phases for a more natural journey. Your progress is preserved — pick up where you left off." |
| `phaseReorderBanner.dismiss` | "Got it" |
| `phaseReorderBanner.dismissAriaLabel` | "Got it, close the phase reorganization notice" |
| `phaseReorderBanner.learnMore` | "See what changed" |
| `phaseReorderBanner.learnMoreHref` | "/help/phase-reorder" (URL — keep identical in pt-BR) |

### 3b. Interpolation mismatches

1. `dashboard.expeditions.tripCount` — **false positive** caused by grader regex treating ICU plural literal `{expeditions}` (ASCII) as a variable while ignoring `{expedições}` (non-ASCII). Translation is correct; grader is wrong.
2. `expedition.phase2.step5.preferencesCount` — same false-positive shape (`{category}` vs `{categoria}`); already whitelisted in the test layer but still penalized by the grader score.

---

## 4. Total count of affected keys

- **5** missing keys (real product defect).
- **2** interpolation parity "mismatches" reported by the grader — **0 real** semantic defects (both are ASCII-vs-diacritic false positives inside ICU plural literals).

**Effective problem surface: 5 key additions in `pt-BR.json`.**

A single quick fix — adding the 5 pt-BR translations — recovers +0.05 score (0.89 → 0.94), which clears the `>= 0.9` gate at `:60`.

To clear `:142` (interpolation parity) as well, the grader regex needs to be fixed (or `dashboard.expeditions.tripCount` added to the test's `KNOWN_MISMATCHES` allowlist). Without that change, `:142` keeps failing even after the pt-BR keys are added.

---

## 5. Effort assessment

- Translation work: **5 short strings, all UI microcopy**. Can be produced inline without external translator review (straightforward phrasing; URL slug stays identical). Estimated effort: **10–15 minutes** of editor time.
- Interpolation mismatch at `tripCount`: **1-line allowlist addition** to the test (matching the pattern already used for `preferencesCount`) OR a grader regex fix. Estimated effort: **5 minutes** for the allowlist; **20–30 minutes + unit test update** for a proper grader fix.
- No structural refactor needed. No new namespaces, no code changes beyond the test allowlist.

**Total: well under 20 key fixes, no refactor. Gate recovery to ≥ 0.94 is achievable with ≤ 6 localized edits.**

---

## 6. Decision recommendation

**RECOMMEND AUTO-FIX.**

Rationale:
- 5 missing keys < 20 threshold.
- No S44 injection-resistance drift in the i18n grader path (IR-024 and friends are a separate regression in the sanitizer helper, not leaking into this eval's inputs).
- No structural refactor; no breaking change; no security surface.
- The fix is a mechanical translation of 5 UI strings + a 1-line test allowlist addition (or grader regex hardening).

### Proposed auto-fix plan (for the follow-up task — NOT executed here)

1. Add to `messages/pt-BR.json` under a new top-level `phaseReorderBanner` block, mirroring the en.json shape:
   - `message`: "Reorganizamos as fases para uma jornada mais natural. Seu progresso foi preservado — continue de onde parou."
   - `dismiss`: "Entendi"
   - `dismissAriaLabel`: "Entendi, fechar o aviso de reorganização de fases"
   - `learnMore`: "Veja o que mudou"
   - `learnMoreHref`: "/help/phase-reorder" (keep identical — it's a route slug, not prose)
2. Either:
   - (a) Add `"dashboard.expeditions.tripCount"` to the `KNOWN_MISMATCHES` set in `tests/evals/i18n-completeness.eval.ts:121` (quick), **and** update `gradeI18nCompleteness` to accept an optional `knownMismatches` set so the grader score at `:60` also excludes it; OR
   - (b) Harden `extractInterpolationVars` in `src/lib/evals/i18n-completeness.grader.ts` to skip capturing the inner `{word}` literals of ICU plural forms (recognize `, plural,` or `, select,` markers and stop variable extraction inside the match body).

Option (b) is the architecturally correct fix (eliminates a whole class of false positives across future plural translations). Option (a) is the fast path.

Post-fix expected score: **≥ 0.94** (well above the 0.9 gate and the 0.95 grader default pass threshold if option b is chosen and mismatches drop to 0).

### Parallel track (out of scope for this investigation)

The S44 injection-resistance failures in `tests/evals/injection-resistance.eval.ts` (IR-024 Cyrillic homoglyph + lines 89/95/316 returning `undefined`) are a **separate P1** and require escalation to `security-specialist`. They do NOT block or influence the i18n gate, but they ARE failing the overall EDD suite and must be triaged on their own track.

---

## Reproduction command

```bash
npx vitest run --config vitest.eval.config.ts tests/evals/i18n-completeness.eval.ts --reporter=verbose
```

Programmatic cross-check (bypasses test harness):

```bash
node --experimental-strip-types -e "import('./src/lib/evals/i18n-completeness.grader.ts').then(m => { const r = m.gradeI18nCompleteness(); console.log(r.score, JSON.stringify(r.details.issueCounts)); });"
```

Both reproduce `score = 0.89`, `missingKeys = 5`, `interpolationMismatches = 2`.
