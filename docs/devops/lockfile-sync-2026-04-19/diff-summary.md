# Lockfile Sync — diff-summary

**Date**: 2026-04-19
**Branch**: `chore/lockfile-sync-analysis`
**Base**: `master` @ `db73225`
**Tool**: `npx npm@10 install` (matched CI Node 20 / npm 10 environment)

## Executive Summary

The lockfile was out-of-sync with `package.json` for **3 transitive nested entries only**. Zero direct dependencies changed. Zero version bumps. Zero removals. Lockfile version (`v3`) unchanged.

This is the smallest possible sync — no risk of version drift across the dependency tree.

## Delta

| Metric | Count |
|---|---|
| Packages added | **3** |
| Packages removed | **0** |
| Version changes (MAJOR) | **0** |
| Version changes (minor) | **0** |
| Version changes (patch) | **0** |
| Direct dependencies changed (package.json) | **0** |
| Lockfile version | 3 → 3 (unchanged) |
| File size | 1,012,820 → 1,014,872 bytes (+2,052) |

## Packages added (all nested transitive)

| Package | Parent | Reason |
|---|---|---|
| `magicast@0.3.5` | `node_modules/@prisma/config` | Prisma config loader dependency |
| `gcp-metadata@7.0.1` | `node_modules/mongoose` | Mongoose GCP support (unused by project, but installed) |
| `@swc/helpers@0.5.21` | `node_modules/promptfoo` | SWC helpers for promptfoo eval tooling |

These are exactly the 3 packages CI reported missing. They are transitive — the project's `package.json` does not declare any of them directly.

## Expected-missing confirmation

| Package | Present in new lockfile |
|---|---|
| `magicast@0.3.5` | ✅ yes |
| `gcp-metadata@7.0.1` | ✅ yes |
| `@swc/helpers@0.5.21` | ✅ yes |

## Direct dependencies (package.json) changed

**None.** No entry under `dependencies` or `devDependencies` changed version or was added/removed.

## Root cause of the drift

The `ce7b8eb` commit (`feat(toast): wire up sonner toast library`) was made on a dev machine running `npm 11` (see `npm --version` → `11.9.0`). npm 11 writes lockfile entries with a slightly different nesting heuristic for transitive optional/peer deps. CI runs `npm ci` on npm 10.x (GitHub Actions Node 20 default), which refuses to proceed when those 3 entries are absent — even though the same tree is valid for npm 11.

Regenerating the lockfile with `npx npm@10 install` produces a superset that both npm 10 and npm 11 accept. No upstream version resolution was performed (all pinned versions identical).

## Risk classification

🟢 **LOW RISK**. The change is additive-transitive-only. Standard CI npm 10 acceptance restored. No new surface area exposed in production code paths (these 3 packages are already loaded at runtime via their parents — the lockfile just now records them correctly).

## Artifacts

- `package-lock.before.json` — captured on `db73225` (HEAD of master)
- `package-lock.json` (current) — after `npm@10 install`
- `diff-raw.json` — machine-readable diff output
