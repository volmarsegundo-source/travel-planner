# Lockfile Sync — security-audit

**Date**: 2026-04-19
**Branch**: `chore/lockfile-sync-analysis`
**Reference**: `npm audit --json` before/after lockfile regeneration

## Executive Summary

🟢 **NO NEW CVEs INTRODUCED. NO CVEs RESOLVED.** The security posture is identical before and after the lockfile regeneration — unchanged because no dependency versions changed, only transitive nesting.

## Before → After

| Severity | Before | After | Delta |
|---|---|---|---|
| info | 0 | 0 | 0 |
| low | 0 | 0 | 0 |
| moderate | 3 | 3 | 0 |
| high | 1 | 1 | 0 |
| critical | 0 | 0 | **0** |
| **Total** | **4** | **4** | **0** |

## Advisory-level diff

| Advisory | Before | After |
|---|---|---|
| `@hono/node-server` | ✓ | ✓ |
| `hono` | ✓ | ✓ |
| `next` | ✓ | ✓ |
| `next-intl` | ✓ | ✓ |

All 4 advisories are identical in both states. Zero new, zero resolved.

## Pre-existing CVEs (unchanged — NOT caused by this sync)

These CVEs existed on `master` **before** this PR and are **not regressed by the lockfile sync**. They are tracked separately and should be addressed by `security-specialist` in a dedicated dependency-upgrade PR.

| Package | Severity | Range | Issue |
|---|---|---|---|
| `@hono/node-server` | moderate | <1.19.13 | Middleware bypass via repeated slashes in serveStatic |
| `hono` | moderate | <4.12.14 | Improper JSX attribute name handling → HTML injection in hono/jsx SSR |
| `next` | **high** | 13.0.0 – 15.5.14 | Denial of Service via Server Components |
| `next-intl` | moderate | <4.9.1 | Open redirect vulnerability |

GitHub Dependabot already has 4 open alerts for these — see https://github.com/volmarsegundo-source/travel-planner/security/dependabot.

## Gate verdict

✅ **PASS** — zero regression in security audit. The lockfile sync is not a security-affecting change and does not block on CVE grounds. Pre-existing CVEs are a separate workstream.

## Artifacts

- `npm-audit.before.json` — audit captured on `db73225` (HEAD of master)
- `npm-audit.after.json` — audit captured after `npm@10 install`
