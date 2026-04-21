# SPEC-OBSERVABILITY-SENTRY-001: Forward Server Action Errors to Sentry

**Version**: 0.1.0
**Status**: Draft (candidate for Sprint 46)
**Author**: architect (candidate — to be re-assigned to devops-engineer in sprint planning)
**Reviewers**: [tech-lead, devops-engineer, security-specialist]
**Priority**: P2
**Estimated Effort**: 3–5h
**Created**: 2026-04-21
**Last Updated**: 2026-04-21
**Trigger**: BUG-B (Prisma P2022 schema drift) and BUG-C (CSP nonce) were diagnosed **only after the PO copied Vercel logs into the conversation**. Both errors fired silently against real users. `logger.error` is wired to stdout only, which means staging errors disappear the moment the log line scrolls off Vercel's 1-hour tail.

---

## 1. Overview

Wire `@sentry/nextjs` (already a dependency — see lint output deprecation warnings for `disableLogger` and `automaticVercelMonitors`) to capture:

1. Every `logger.error(...)` call originating from a Server Action
2. Every uncaught exception in route handlers and middleware
3. Every Prisma error (P-code + constraint) with sanitized bindings

Errors must reach Sentry with enough context to diagnose without asking the user for logs. PII (email, DOB, passport, etc.) MUST be redacted before leaving the server.

## 2. Problem Examples

- **BUG-B**: `getAiConsentGate` (and similar) returned `ActionResult<{ error: 'errors.unexpected' }>` on P2022 without any alert firing. The UX showed "Algo deu errado" for 26 hours before a PO pasted a Vercel log.
- **BUG-C**: CSP violations fire as browser console errors — never reach the server at all. Sentry's CSP report-uri endpoint would have surfaced this on the first hit.

## 3. Scope

### In scope
- Server Actions (`src/server/actions/*.ts`) — wrap the existing `logger.error` call site
- Route handlers (`src/app/api/**/route.ts`) — global error handler
- Middleware (`src/middleware.ts`) — catch + `Sentry.captureException`
- CSP report-uri endpoint — add `report-uri` / `report-to` directive pointing at Sentry (coordinated with SPEC-SEC-CSP-NONCE-001 which just shipped)
- PII redaction in the Sentry `beforeSend` hook

### Out of scope
- Client-side error capture (already ships with `@sentry/nextjs`)
- Performance monitoring (Sentry Tracing) — separate SPEC if we adopt
- Source map upload tuning — devops can configure without a SPEC

## 4. Acceptance Criteria

- [ ] `sentry.server.config.ts` and `sentry.edge.config.ts` exist with DSN from env (validated via `src/lib/env.ts`)
- [ ] `beforeSend` redacts: `email`, `dateOfBirth`, `passportNumber`, `nationalId`, `phone`, `address` fields and any top-level `user.email`/`user.id` → hashed ID
- [ ] Every `logger.error(...)` call that includes an `error` object also triggers `Sentry.captureException(error, { extra, tags })`
- [ ] Prisma errors include: `code`, `meta.constraint`, `meta.modelName` as Sentry tags
- [ ] Middleware uncaught errors are captured (Edge runtime compatibility — `@sentry/nextjs` supports Edge)
- [ ] CSP `report-to` endpoint configured in production (staging optional, gated by `VERCEL_ENV`)
- [ ] Integration test: throw a known error in a Server Action, assert Sentry mock was called with redacted payload
- [ ] Runbook: `docs/runbooks/sentry-triage.md` — how to read a Sentry issue, how to reproduce locally, when to page vs Slack

## 5. Constraints

### Privacy (MANDATORY)
- No email, phone, DOB, passport, national ID, or full address in any Sentry payload
- User IDs MUST be hashed via `hashUserId()` before leaving the process
- Review by security-specialist before enabling in production

### Cost
- Sentry free tier is 5K events/month — gate with `sampleRate: 0.25` in production initially
- finops-engineer must review projected event volume before enabling prod

### Performance
- `Sentry.captureException` MUST NOT block the response — use async / fire-and-forget pattern at the Edge

## 6. Open Questions

- Do we enable Sentry on staging from day 1, or wait until redaction is battle-tested locally?
- Who owns the oncall rotation once alerts start firing? (likely tech-lead + on-call dev)
- Should CSP `report-to` go to Sentry or to our own logging endpoint? (Sentry has native CSP support — lean toward Sentry)

## 7. Dependencies

- SPEC-SEC-CSP-NONCE-001 (✅ shipped 2026-04-21) — `report-to` directive extends the CSP built in `src/lib/csp.ts`
- `@sentry/nextjs` already installed (current version has deprecation warnings — upgrade as part of this SPEC)

---

## Change History
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1.0 | 2026-04-21 | architect (candidate) | Initial draft — registry entry for Sprint 46 planning |
