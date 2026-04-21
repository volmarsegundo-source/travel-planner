# Wave 2 Pre-requisite — Point 1 (middleware) Triage

**Date:** 2026-04-20
**Owner:** dev-fullstack-1 (impersonated)
**Input:** Architect endorsement note #1 — "`src/middleware.ts` has no IP extraction … attacker can hammer locale-prefixed routes without hitting any rate-limit gate"
**Outcome:** **FALSE ALARM for Sprint 45 Wave 2 scope.** Gap is genuine at infra layer; not a code fix.

---

## What middleware.ts actually does per request

Read `src/middleware.ts` (140 lines, Edge runtime):

1. Skip `/api/*` and Server Action POSTs (early return).
2. `req.auth` — decode JWT from cookie (stateless, CPU-cheap).
3. Check if path is in `PROTECTED_PATH_SEGMENTS`; redirect unauth → `/auth/login`.
4. SPEC-AUTH-AGE-002 branch — DOB completion redirect.
5. Admin role branch — non-admin → `/expeditions`.
6. `intlMiddleware(req)` — locale rewrite (O(1) path match).
7. `crypto.randomUUID()` for CSP nonce.
8. Set 5 security headers + HSTS.

**Zero DB queries. Zero Redis calls. Zero network I/O. Zero AI calls.**

## Why this is not a Wave 2 code fix

- The Edge runtime explicitly excludes `ioredis` (documented on line 4-5 of middleware.ts — BC-004). Adding a rate limit here would require Upstash REST — adds network latency to **every** authenticated request on the site.
- All expensive work (DB, Redis, AI, email) happens behind rate limits that Wave 1 already migrated to fail-closed where appropriate.
- Flooding the middleware only burns CPU on the Vercel Edge tier, which Vercel's platform itself rate-limits / absorbs via CDN + DDoS shield.
- The correct control is **Vercel WAF rule** or **Cloudflare page rule** — infra, not application code.

## Wave 2 decision

- **No code change in Sprint 45 Wave 2.**
- Create infra follow-up: `SPEC-SEC-MIDDLEWARE-WAF-001` (backlog owner: devops-engineer) — configure Vercel WAF rule throttling per-IP requests to locale-prefixed non-API paths. Estimate: 1h config, 1h test. Not Wave 2 scope.
- Wave 2 can start immediately with Items 2A, 2B, and 2.1–2.8.

## Audit trail

- File examined: `src/middleware.ts` (140 lines)
- No external dependencies beyond `next-auth`, `next-intl`, `next/server`
- Consistent with Edge runtime constraints documented in-file and in `docs/RISK-ASSESSMENT-EDGE-RUNTIME.md`
