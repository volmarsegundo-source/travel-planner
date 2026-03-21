# SPEC-SEC-005: Sprint 34 Security Review

**Version**: 1.0.0
**Status**: Draft
**Author**: security-specialist
**Reviewers**: tech-lead, architect
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Scope

This security review covers all Sprint 34 features:
- OAuth social login (Google + Apple)
- Phone input validation
- "Ainda nao decidi" checkbox bypass
- WizardFooter dirty-state dialog
- Phase 3 completion sync

## 2. Findings

### Finding SEC-S34-001: OAuth Redirect URI Validation (HIGH)

**Risk**: Open redirect via manipulated `callbackUrl` parameter.

**Current state**: Auth.js v5 pages config sets `signIn: "/auth/login"` and `error: "/auth/error"`. The default `redirect` callback in Auth.js allows any URL on the same origin.

**Recommendation**:
1. Explicitly define the `redirect` callback in `auth.config.ts` to whitelist allowed paths:
   ```typescript
   callbacks: {
     async redirect({ url, baseUrl }) {
       if (url.startsWith(baseUrl)) return url;
       return baseUrl;
     },
   }
   ```
2. Never allow redirect to external domains.
3. Log all OAuth callback errors for monitoring.

### Finding SEC-S34-002: OAuth CSRF State Parameter (MEDIUM)

**Risk**: CSRF attack on OAuth callback endpoint.

**Current state**: Auth.js v5 automatically generates and validates the `state` parameter for OAuth providers. This is handled internally.

**Recommendation**: No action needed — Auth.js handles this. Verify by testing that a callback with a tampered `state` parameter returns an error.

### Finding SEC-S34-003: OAuth Token Verification (MEDIUM)

**Risk**: Spoofed OAuth tokens accepted without verification.

**Current state**: Auth.js v5 verifies ID tokens from Google/Apple automatically using the provider's JWKS endpoint.

**Recommendation**: No action needed. Ensure `next-auth` is kept up to date to receive security patches.

### Finding SEC-S34-004: Phone Field Injection (HIGH)

**Risk**: SQL injection or XSS via phone number field if not sanitized.

**Current state**: The phone field will use Prisma parameterized queries (safe from SQL injection). However, the formatted phone number could contain script payloads if not sanitized before formatting.

**Recommendations**:
1. Strip all non-digit characters server-side before storing: `phone.replace(/\D/g, '')`
2. Validate server-side: only digits, length 10-15
3. Add Zod schema validation: `z.string().regex(/^\d{10,15}$/).optional()`
4. Never render raw phone input in HTML without sanitization

### Finding SEC-S34-005: "Ainda nao decidi" Server-Side Bypass (MEDIUM)

**Risk**: User manipulates request to set `isUndecided: true` for all steps via DevTools, bypassing all Phase 4 validation permanently.

**Current state**: The `isUndecided` flag will be stored in `ExpeditionPhase.metadata` JSON.

**Recommendations**:
1. The `advanceFromPhaseAction` must still verify trip ownership (BOLA check) regardless of `isUndecided`
2. Store `isUndecided` flags server-side so they can be audited
3. The downstream Phase 5/6 AI prompt should note "logistics not yet decided" when flags are set (already covered by SPEC-AI-005)
4. Consider: in a future sprint, flag trips with all-undecided Phase 4 as "incomplete logistics" in the expedition summary

### Finding SEC-S34-006: Dialog Data Leak (LOW)

**Risk**: Form data leaks to URL or localStorage via the save/discard dialog.

**Current state**: The current WizardFooter dialog uses `useState` only — no URL params or storage.

**Recommendations**:
1. Ensure the dialog state machine (SPEC-ARCH-024) does NOT persist dialog intent or form data to `window.history.state`, URL query params, or localStorage
2. The `computeFormHash` function must not be logged or exposed in error reports (it could contain PII hashes)
3. No form data should be sent as URL parameters during navigation

### Finding SEC-S34-007: Apple Relay Email Handling (LOW)

**Risk**: Apple "Hide My Email" relay addresses (`xxx@privaterelay.appleid.com`) could cause email delivery failures for password reset, verification, etc.

**Recommendations**:
1. Accept Apple relay addresses as valid emails
2. Configure SPF/DKIM/DMARC for your sending domain to ensure Apple relay forwards emails
3. Do not expose the user's real email even if available — respect Apple's privacy relay

## 3. Summary

| ID | Severity | Feature | Status |
|---|---|---|---|
| SEC-S34-001 | HIGH | OAuth redirect URI | Open — needs redirect callback whitelist |
| SEC-S34-002 | MEDIUM | OAuth CSRF | Mitigated — Auth.js handles automatically |
| SEC-S34-003 | MEDIUM | OAuth token verification | Mitigated — Auth.js handles automatically |
| SEC-S34-004 | HIGH | Phone field injection | Open — needs server-side sanitization |
| SEC-S34-005 | MEDIUM | "Ainda nao decidi" bypass | Acceptable risk — needs BOLA check and audit trail |
| SEC-S34-006 | LOW | Dialog data leak | Mitigated — no URL/storage persistence |
| SEC-S34-007 | LOW | Apple relay email | Open — needs SPF/DKIM configuration |

## 4. Recommendations Summary

1. Add explicit `redirect` callback in `auth.config.ts`
2. Server-side phone sanitization: strip non-digits, validate length
3. BOLA check in `advanceFromPhaseAction` for Phase 4 with undecided flags
4. No form hash in logs or error reports
5. Accept and support Apple relay email addresses

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
