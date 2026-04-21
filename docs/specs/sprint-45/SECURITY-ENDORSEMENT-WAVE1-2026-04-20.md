# SPEC-SPRINT-45-WAVE1 — Security Endorsement

**Date:** 2026-04-20
**Requested by:** dev-fullstack-1 (impersonated, acting for Wave 1 closeout)
**Provider:** `architect` subagent acting as **provisional security-specialist** (the real `security-specialist` subagent_type is not registered — see `feedback_subagent_types.md` in auto-memory; PO-approved fallback per SCOPE-BOX.md Decision 2)
**Scope:** Independent security review of Wave 1 hardening landed in Sprint 45 (XFF unification + fail-closed rate-limit opt-in + feature flag + tests + flaky triage).
**Related specs:** SPEC-SEC-XFF-001, SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001, SPEC-AUTH-FORGOTPW-003

---

## 1. Endorsement

**Wave 1.1 (XFF unification) — ENDORSED.** Leftmost-entry-only parsing is the correct approach for trusted reverse proxies (Vercel/Cloudflare strip and prepend). Centralizing into a single helper eliminates the class of bugs where different call sites parse differently. The regression test for rotating tail IPs confirms the specific attack vector is closed. No gaps identified.

**Wave 1.2 (Fail-closed opt-in) — ENDORSED.** The design is sound: dual-gate (code flag + env var) prevents accidental activation, sensitive endpoints are explicitly opted in, and non-sensitive endpoints remain fail-open to preserve availability. The separation is well-reasoned — login/register/admin-export merit denial-on-doubt; health probes and content generation do not.

---

## 2. Rollout Risk Assessment

Default-OFF with a 1-sprint staging bake is **acceptable** given the dual-gate design. Compensating controls required before the Sprint 46 production flip:

- **Alerting**: instrument a counter/log on every fail-closed denial path (distinct from normal rate-limit denials). Set a threshold alert at >50 fail-closed events/minute — that signals Redis instability, not attack traffic.
- **Structured log field**: ensure the denial log emits `{ reason: "redis_unavailable", failClosed: true }` so on-call can distinguish from legitimate rate exhaustion. (Currently the structured log emits event key `rate-limit.redis.unavailable.failClosed` — acceptable; add a Sentry alert rule on this event.)
- **Rollback latency**: confirm the env var change propagates without redeploy (Vercel env reload or Railway restart <60s). Document expected rollback time in DEPLOY.md.

No circuit breaker needed — the env var IS the circuit breaker.

---

## 3. Missed Surface Area (Wave 2 backlog — NOT Wave 1 blockers)

1. **`src/middleware.ts` has no IP extraction** — the Edge middleware applies CSP but does no rate limiting. An attacker can hammer locale-prefixed routes (triggering i18n/redirect logic) without hitting any rate-limit gate. Consider a lightweight Edge-compatible counter or Vercel WAF rule.

2. **`src/server/actions/auth.actions.ts` password-reset email enumeration** — the email-keyed rate limit is now fail-closed, but the response still likely differs between "user exists" and "user not found" (timing or message). Confirm constant-time response regardless of existence to close the oracle.

3. **`src/app/api/destinations/search/route.ts`** remains fail-open and proxies to Nominatim with Redis cache. A sustained cache-miss flood (novel queries) bypasses local rate limiting and could exhaust Nominatim's IP allowance or trigger upstream bans. This endpoint should either get fail-closed or a secondary in-memory sliding window (no Redis dependency).

---

## 4. Conclusion

Wave 1 is cleared to merge. The 3 gaps above are genuine risks but out of scope for Sprint 45 Wave 1 — they belong in Wave 2 backlog or a follow-on SPEC-SEC ticket. Before flipping `RATE_LIMIT_FAIL_CLOSED_ENABLED=true` in production, apply the Sentry alert rule in §2.
