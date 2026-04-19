# Lockfile Sync — breaking-risk

**Date**: 2026-04-19
**Branch**: `chore/lockfile-sync-analysis`
**Scope**: Analysis of critical Atlas dependencies for version drift

## Executive Summary

🟢 **ZERO version bumps on any critical library.** No MAJOR, minor, or patch bumps detected in Next.js, React, Prisma, NextAuth, Tailwind, Zod, next-intl, Anthropic SDK, ioredis, or any direct dependency. This sync only reconciles transitive lockfile nesting for 3 nested packages.

**Verdict**: No breaking-change risk.

## Critical library matrix

| Package | Declared (package.json) | Before (lockfile) | After (lockfile) | Bump |
|---|---|---|---|---|
| `next` | `^15.1.0` | `15.5.14` | `15.5.14` | 🟢 NONE |
| `react` | `^19.0.0` | `19.2.4` | `19.2.4` | 🟢 NONE |
| `react-dom` | `^19.0.0` | `19.2.4` | `19.2.4` | 🟢 NONE |
| `@prisma/client` | `^6.0.0` | `6.19.2` | `6.19.2` | 🟢 NONE |
| `prisma` | `^6.0.0` | `6.19.3` | `6.19.3` | 🟢 NONE |
| `next-auth` | `^5.0.0-beta.30` | `5.0.0-beta.30` | `5.0.0-beta.30` | 🟢 NONE |
| `@auth/prisma-adapter` | `^2.7.2` | `2.11.1` | `2.11.1` | 🟢 NONE |
| `tailwindcss` | `^4.0.0` | `4.2.1` | `4.2.1` | 🟢 NONE |
| `zod` | `^3.25.76` | `3.25.76` | `3.25.76` | 🟢 NONE |
| `next-intl` | `^3.26.0` | `3.26.5` | `3.26.5` | 🟢 NONE |
| `@anthropic-ai/sdk` | `^0.78.0` | `0.78.0` | `0.78.0` | 🟢 NONE |
| `ioredis` | `^5.4.1` | `5.10.0` | `5.10.0` | 🟢 NONE |
| `bcryptjs` | `^3.0.3` | `3.0.3` | `3.0.3` | 🟢 NONE |
| `@radix-ui/react-dialog` | (transitive) | `1.1.15` | `1.1.15` | 🟢 NONE |

## Direct-dependency change count

**0** out of **98** direct dependencies (in `dependencies` + `devDependencies`) changed version.

## Red flags check

- [x] Next.js major bump? **No.**
- [x] React major bump? **No.**
- [x] Prisma major bump? **No.**
- [x] NextAuth major bump? **No.**
- [x] Any critical CVE critical introduced? **No** (see `security-audit.md`).
- [x] Peer dep conflict that broke install? **No** (install completed successfully with pre-existing `chokidar/nunjucks` warnings — same warnings present on master).

## The 3 added transitive packages

| Package | Version | Parent | Impact |
|---|---|---|---|
| `magicast@0.3.5` | 0.3.5 | `@prisma/config` | Prisma config loader — runtime use only in CLI tools (`prisma migrate`, etc.). No Atlas source code touches it. |
| `gcp-metadata@7.0.1` | 7.0.1 | `mongoose` | Mongoose's GCP support. Project does **not** use Mongoose in runtime — it's a Prisma-only codebase. This package is dead weight but harmless. |
| `@swc/helpers@0.5.21` | 0.5.21 | `promptfoo` | SWC helper package for eval tooling. Only loaded by `npm run eval:*` — zero footprint in production bundle. |

None of these affect production runtime behavior for Atlas end users.

## Gate verdict

✅ **PASS** — no breaking risk detected. This lockfile sync is strictly additive at the transitive level and preserves byte-exact parity on every declared dependency.

## Signed-off by

`devops-engineer` (via automated analysis) — 2026-04-19
