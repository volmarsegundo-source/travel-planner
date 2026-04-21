# SPEC-SEC-AUDIT-001: Security-Spec "Security Theater" Audit

**Version**: 0.1.0
**Status**: Draft (candidate for Sprint 46)
**Author**: architect (candidate — to be re-assigned to security-specialist in sprint planning)
**Reviewers**: [tech-lead, security-specialist]
**Priority**: P1
**Estimated Effort**: 6–10h
**Created**: 2026-04-21
**Last Updated**: 2026-04-21
**Trigger**: BUG-C (SPEC-SEC-CSP-NONCE-001) — a CSP spec present since Sprint 2 had a nonce-propagation bug latent in production. Security specs were treated as "done" because the header existed, not because the protection actually worked end-to-end. This SPEC audits all security specs for the same failure mode.

---

## 1. Overview

Walk every approved `SPEC-SEC-*` (and security-relevant sections of non-SEC specs) and verify the control is **functionally wired end-to-end**, not merely declared. The CSP nonce bug shipped because no one asked "does the browser actually accept the nonce?" — we shipped the header and moved on.

This audit looks for the same class of gap across authentication, authorization, encryption, input validation, rate limiting, audit logging, CSRF, BOLA, and session handling.

## 2. Scope

### In scope
- All files under `docs/specs/SPEC-SEC-*.md`
- Security sections (§6 "Security Requirements") inside `SPEC-ARCH-*.md`
- Middleware (`src/middleware.ts`), all `src/lib/guards/*.ts`, all encryption call sites in `src/lib/crypto.ts`, all rate-limit call sites

### Out of scope
- Third-party dependency CVE audit (covered by `npm run security:ci`)
- Compliance framework mapping (LGPD/GDPR) — separate SPEC
- Performance of security controls

## 3. Audit Questions (per control)

For each security control identified, answer:

1. **Declaration**: what does the spec say should happen?
2. **Wiring**: where in the code is that control invoked?
3. **End-to-end test**: is there a test that *fails* if the control is silently removed? Not "does it compile" — does a real assertion catch the absence?
4. **Observability**: if the control fires in production, do we see it? (logs, metrics, alerts)
5. **Failure mode**: what happens when the control itself fails? Fail-open or fail-closed?

A control is "security theater" if any of 2–5 is missing. Flag with severity P0 (active vulnerability), P1 (latent/masked gap), P2 (monitoring gap only).

## 4. Known Candidates (pre-identified)

| Control | Spec | Suspected gap |
|---|---|---|
| CSP nonce propagation | SPEC-SEC-CSP-NONCE-001 | ✅ Fixed 2026-04-21 (used as the reference case) |
| Rate limiting on server actions | various | No assertion that limiter is wired — test mocks it |
| BOLA on `/trips/:id` | SPEC-SEC-BOLA-* (if exists) | Expedition-summary service does check, but test coverage? |
| Encrypted field storage | SPEC-SEC-ENCRYPTION-* (if exists) | `crypto.ts` exists; is every PII write using it? |
| AuthZ on admin routes | middleware.ts `/admin` guard | JWT role check — is there a test that validates the JWT is actually populated server-side? |

The security-specialist should expand/replace this list as the audit proceeds.

## 5. Deliverables

- `docs/qa/security-audit-sprint-46.md` — one row per control × the 5 questions, with severity + owner for each gap
- One issue per P0/P1 gap with acceptance criteria
- One meta-SPEC proposal (if patterns emerge) — e.g., "every new security spec must ship with an integration test that proves the negative case"

## 6. Acceptance Criteria

- [ ] Every `SPEC-SEC-*.md` has a row in the audit table
- [ ] Every P0 gap has a linked fix SPEC or an accepted-risk memo signed by security-specialist + tech-lead
- [ ] Every P1 gap has an owner and target sprint
- [ ] Audit doc committed to `docs/qa/` and linked from `docs/specs/SPEC-STATUS.md`
- [ ] Post-mortem retro in the sprint review: did this audit prevent future theater, or just catalogue it?

## 7. Open Questions

- Who owns re-running this audit? Per-sprint spot-check, or dedicated sprint every N sprints?
- Should CI enforce "security spec must link to an integration test file" at merge time? (possible follow-on SPEC)

---

## Change History
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1.0 | 2026-04-21 | architect (candidate) | Initial draft — registry entry for Sprint 46 planning |
