# package.json patch — Promptfoo scripts

Add the block below to the `scripts` section of `package.json`. The `pf:` prefix is deliberate: the existing `eval`, `eval:watch`, `eval:report`, `eval:gate`, `eval:drift`, `eval:scheduled`, and `eval:trend` scripts already exist and point at the Vitest-based eval suite — do **not** overwrite them.

## Scripts to add

```json
{
  "scripts": {
    "pf:eval": "promptfoo eval -c tests/evals/promptfooconfig.yaml --output eval-results.json",
    "pf:eval:watch": "promptfoo eval -c tests/evals/promptfooconfig.yaml --watch",
    "pf:eval:report": "promptfoo view",
    "pf:eval:gate": "node tests/evals/scripts/gate.js eval-results.json",
    "pf:eval:gate:staging": "node tests/evals/scripts/gate.js eval-results.json --threshold=0.85",
    "pf:eval:gate:prod": "node tests/evals/scripts/gate.js eval-results.json --threshold=0.90",
    "pf:eval:drift": "node tests/evals/scripts/drift.js eval-results.json",
    "pf:eval:scheduled": "node tests/evals/scripts/scheduled.js",
    "pf:eval:trend": "node tests/evals/scripts/trend.js"
  }
}
```

## Dev dependency to add

```bash
npm install --save-dev promptfoo
```

Then commit the resulting `package.json` + `package-lock.json` delta.

## Rationale for the `pf:` prefix

- Keeps the existing Vitest eval pipeline untouched (no risk of breaking current CI gates).
- Makes each script's framework unambiguous (`eval:*` = Vitest, `pf:*` = Promptfoo).
- Allows both suites to run in CI side by side during the migration window defined in `SPEC-EVALS-V1` §2.2.

Once the YAML datasets have absorbed the JSON datasets in `docs/evals/datasets/`, the Vitest `eval` scripts can be retired and the `pf:` scripts renamed to own the `eval:*` namespace. That migration is out of scope for `SPEC-EVALS-V1 1.0.0`.
