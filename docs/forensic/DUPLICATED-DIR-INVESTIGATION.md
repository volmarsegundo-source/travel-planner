# Duplicated Directory Investigation: travel-planner/travel-planner/

**Date**: 2026-04-18
**Investigator**: tech-lead
**Task ref**: Sprint 44 pending task #14
**Status**: Investigation complete -- awaiting remediation approval

---

## Summary

A duplicated `travel-planner/` subdirectory exists at `C:\travel-planner\travel-planner\`. It is a full, independent git clone of the same repository, frozen at commit `bfbba203` (Feb 26, 2026 -- Sprint 2 era). The directory is **not tracked** by the parent repo (it is listed in `.gitignore` at line 74) and contains no `node_modules`. The nested repo's HEAD (`bfbba203`) does **not** match the reported Vercel anomaly commit (`55db51e`), so this directory is **unlikely to be the direct cause** of the Vercel production deploy issue. However, it remains a maintenance hazard and should be removed.

---

## Evidence

### 1. Directory exists -- confirmed

```
$ ls C:/travel-planner/travel-planner/
BOOTSTRAP.md   CLAUDE.md      Dockerfile     components.json  docs
CHANGELOG.md   .claude        docker-compose.yml  eslint.config.mjs  messages
next.config.ts  package-lock.json  package.json  playwright.config.ts  postcss.config.mjs
prisma  public  src  tests  tsconfig.json  vitest.config.ts
```

Full project structure. 2.4 MB total (no `node_modules`).
All file timestamps: `Feb 28 14:13` -- consistent with a single clone event.

### 2. It is a git repo -- confirmed

```
$ git -C "C:/travel-planner/travel-planner" rev-parse HEAD
bfbba20315ce4946a92f80bae59a30f4d9a0d17a

$ git -C "C:/travel-planner/travel-planner" log --oneline -5
bfbba20 docs: add dev environment testing guide
4d71504 test: update LoginForm mock after useRouter import fix
09a6e8b fix: resolve 5 compounding login bugs blocking JWT issuance
1ba6227 chore: add dev seed + fix prisma seed command
2bf4d04 fix: Auth.js Edge compatibility + turbopack deprecation warning

$ git -C "C:/travel-planner/travel-planner" branch -a
* master
  remotes/origin/HEAD -> origin/master
  remotes/origin/feat/sprint-1
  remotes/origin/feat/sprint-2
  remotes/origin/feat/sprint-2-hardening
  remotes/origin/master
```

HEAD points to `bfbba203` (dated 2026-02-26). Branch: `master`. Remote: same origin as parent repo (`https://github.com/volmarsegundo-source/travel-planner`).

### 3. Does NOT match the Vercel anomaly commit

```
Nested repo HEAD:        bfbba203  (2026-02-26, Sprint 2)
Reported Vercel commit:  55db51e   (2026-04-08, "fix: Gemini API key lookup...")
Parent repo HEAD:        6560858   (current master)
```

Commit `55db51e` exists in the **parent** repo history but does NOT appear in the nested repo (which only has commits up to Sprint 2). The nested directory is therefore **not** the source of the Vercel deploy pointing to `55db51e`.

### 4. Not tracked by parent repo

```
$ git -C "C:/travel-planner" ls-files "travel-planner/"
(empty output -- no files tracked)
```

The parent `.gitignore` (line 74) contains:
```
travel-planner/
```

This means the nested dir is excluded from git and has never been committed into the parent repo.

### 5. No Vercel root directory override

```
$ cat C:/travel-planner/vercel.json
No such file or directory
```

`next.config.ts` has no `rootDir` or output path overrides. Build configuration is standard.

### 6. No parent commits touch this path

```
$ git -C "C:/travel-planner" log --oneline --all -- "travel-planner/"
(empty output)
```

---

## Root Cause Hypotheses

### For the duplicated directory

| # | Hypothesis | Likelihood | Evidence |
|---|---|---|---|
| 1 | **Accidental `git clone` into the project root during Sprint 2 setup** (e.g., running `git clone <url>` while `cwd` was already inside the repo) | **HIGH** | All timestamps are Feb 28 14:13 (single event). HEAD is at Sprint 2's final commit. The `.gitignore` entry was likely added after discovery. |
| 2 | **`create-next-app` or bootstrap script created a nested project** | LOW | The nested dir has the full git history (not just scaffolding), which rules out `create-next-app`. |
| 3 | **IDE or tool artifact** (e.g., VSCode workspace duplication) | LOW | A full `.git` directory with remote tracking is inconsistent with IDE artifacts. |

### For the Vercel deploy anomaly (55db51e)

The nested directory does NOT explain the Vercel issue. Separate hypotheses:

| # | Hypothesis | Likelihood |
|---|---|---|
| 1 | **Vercel Production deployment is pinned to a specific commit or branch ref** that hasn't been updated | HIGH |
| 2 | **Vercel auto-deploy is triggered by a different branch** (not `master`) that is stale at `55db51e` | MEDIUM |
| 3 | **Vercel cache issue** -- the displayed commit SHA is stale but the actual build is current | LOW |

---

## Remediation Options (DO NOT EXECUTE -- awaiting approval)

### Option A: Delete the nested directory (recommended)

Since the directory is **not tracked** by git and is already in `.gitignore`:

```bash
rm -rf C:/travel-planner/travel-planner/
```

- **Risk**: NONE. The directory is gitignored, contains no unique content (it's a stale Sprint 2 clone), and has no `node_modules` or build artifacts.
- **Reversibility**: The same state can be recreated by cloning the repo.

### Option B: Verify and fix Vercel deploy target (separate issue)

The Vercel `55db51e` anomaly requires a separate investigation:

1. Check Vercel dashboard for Production deployment settings (branch, commit pinning).
2. Verify the GitHub integration webhook is active and pointing to `master`.
3. Trigger a manual redeploy from current `master` (`6560858`).

### Option C: Clean up `.gitignore` entry

After deleting the directory (Option A), the `.gitignore` entry on line 74 (`travel-planner/`) can optionally be kept as a safeguard or removed to reduce noise.

---

## Risk Assessment

| Action | Risk Level | Impact if wrong |
|---|---|---|
| Delete `travel-planner/travel-planner/` | **ZERO** | Directory is untracked, gitignored, contains no unique data. No build, CI, or deploy references it. |
| Remove `.gitignore` entry | **NEGLIGIBLE** | Only matters if someone accidentally clones into the root again. |
| Ignore the Vercel issue | **HIGH** | Production may continue deploying stale code. This needs separate investigation. |

---

## Recommended Next Steps

1. **Approve Option A** -- delete the nested `travel-planner/` directory. This is safe and removes the maintenance hazard.
2. **Open a separate investigation** for the Vercel Production deploy anomaly (`55db51e` vs `6560858`). The nested directory is confirmed NOT the cause. Check Vercel dashboard settings, GitHub webhook configuration, and branch targeting.
3. **Keep the `.gitignore` entry** as a guardrail against accidental re-cloning.
