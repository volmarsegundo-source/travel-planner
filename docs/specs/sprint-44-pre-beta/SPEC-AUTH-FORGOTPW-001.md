# SPEC-AUTH-FORGOTPW-001 — Forgot-password email delivery

**Version:** 1.0.0
**Status:** Approved (Wave 2 — parallel with COPY-001)
**Sprint:** 44 (pre-Beta)
**Owner:** dev-fullstack-1
**Related:** SPEC-AUTH-AGE-001

---

## 1. Problem (line-exact root cause)

The "Forgot password" flow is **silently broken**. A Beta user who requests a
reset:

1. Submits `email` → server action `requestPasswordResetAction` at
   `src/server/actions/auth.actions.ts:85`.
2. Reaches `AuthService.requestPasswordReset` at
   `src/server/services/auth.service.ts:135`.
3. Token is generated and stored in Redis at
   `src/server/services/auth.service.ts:147-150`.
4. **NO EMAIL IS EVER SENT.** Line 154 carries the literal comment:
   `// TODO (T-003): send actual email with reset link containing token.`
5. UI at `src/components/features/auth/ForgotPasswordForm.tsx:104` flips to
   `isSuccess=true` regardless → user sees "Check your inbox" copy but nothing
   is delivered.

Confirmation: `grep -rn "sendMail|sendEmail|nodemailer|resend|sendgrid" src/`
returns zero matches. There is **no email infrastructure** in the codebase at all.

This is a pre-Beta showstopper: the account-recovery happy path is fully fake.

## 2. Scope

**In scope (this spec):**
- Introduce a pluggable `EmailSender` abstraction at
  `src/server/services/email/email-sender.ts`.
- Ship a `ConsoleEmailSender` (default) that logs the full reset URL via
  `logger.info` — safe default for pre-Beta where we control all test accounts,
  and a clear operational signal if real email isn't configured yet.
- Ship a `ResendEmailSender` that calls the Resend HTTP API directly (no SDK,
  zero new deps — just `fetch`).
- Wire into `AuthService.requestPasswordReset` so the reset link
  (`${AUTH_URL}/auth/reset-password?token={token}`) is delivered via the active
  sender.
- Respect rate-limit contract (already at `src/server/actions/auth.actions.ts:89`
  — 3/900s per IP): MUST NOT be double-counted by the email path.
- Localize the email subject + body based on the request's `Accept-Language`
  header (fallback: `en`).
- Add server-side unit tests for both senders and the service wiring.

**Out of scope:**
- Email verification flow (registration) — same `T-003` TODO still lives at
  `auth.service.ts:98`. Will ship in SPEC-AUTH-VERIFY-001.
- Post-reset success email ("Your password was changed"). Nice-to-have, not
  blocking.
- HTML templates with branding. Plain-text + minimal HTML is acceptable for Beta.
- Bounce/complaint handling — relies on Resend's automatic suppression list.

## 3. Acceptance criteria (BDD-style)

```gherkin
Scenario 1 — Happy path: registered user receives reset link
  Given a registered user with email "alice@example.com"
  When they submit the forgot-password form with their email
  Then requestPasswordReset persists a token in Redis with a 1-hour TTL
  And the active EmailSender.sendPasswordReset is invoked exactly once
  And the URL passed to the sender matches "${AUTH_URL}/auth/reset-password?token={token}"
  And the UI shows the anti-enumeration success screen

Scenario 2 — Anti-enumeration: unknown email
  Given no user exists with email "ghost@example.com"
  When a visitor submits the forgot-password form with "ghost@example.com"
  Then NO token is persisted and NO email is dispatched
  And the UI still shows the same success screen (no timing / content signal)

Scenario 3 — Default dev sender logs URL
  Given RESEND_API_KEY is not set
  When requestPasswordReset is called for a registered user
  Then the ConsoleEmailSender logs one entry at level "info" tagged
       "auth.email.passwordReset.consoleFallback"
  And the log payload contains the full reset URL (dev/staging only — never prod)

Scenario 4 — Production requires real sender
  Given NODE_ENV === "production"
  And RESEND_API_KEY is NOT set
  When the process boots
  Then env validation fails — ConsoleEmailSender is rejected in prod

Scenario 5 — Resend API failure does not leak to the user
  Given RESEND_API_KEY is set and Resend returns 5xx
  When requestPasswordReset is called
  Then the token IS still stored (user can retry)
  And the failure is logged at level "error" with event "auth.email.sendFailed"
  And the UI still shows the generic success screen (no enumeration leak)

Scenario 6 — Locale-aware email body
  Given the request carries Accept-Language: pt-BR
  When the reset email is dispatched
  Then the subject and body are rendered in Portuguese
  And reset-link anchor text is localized
```

## 4. Technical plan

### 4.1 New module: `src/server/services/email/email-sender.ts`

```ts
export interface EmailSender {
  sendPasswordReset(args: {
    to: string;
    resetUrl: string;
    locale: "en" | "pt-BR";
  }): Promise<void>;
}
```

### 4.2 `ConsoleEmailSender` (fallback)

Logs `logger.info("auth.email.passwordReset.consoleFallback", { to, resetUrl, locale })`.
Used automatically when `RESEND_API_KEY` is absent and `NODE_ENV !== "production"`.

### 4.3 `ResendEmailSender`

Direct `fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: \`Bearer ${RESEND_API_KEY}\` }, body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, text }) })`.
Logs `auth.email.sendFailed` on non-2xx. Never throws to the service (swallowed
after log) so anti-enumeration is preserved.

### 4.4 Factory: `getEmailSender()`

```
if RESEND_API_KEY && EMAIL_FROM  → ResendEmailSender
else if NODE_ENV === "production" → throw at boot
else                              → ConsoleEmailSender
```

### 4.5 i18n templates (`src/server/services/email/templates/password-reset.ts`)

Plain-text + minimal HTML bodies keyed by locale. Subject + body strings live
in the templates file (email content is not rendered with next-intl because it
runs outside the request scope).

### 4.6 Hook into `AuthService.requestPasswordReset`

`src/server/services/auth.service.ts:154` — after storing the token, build
`resetUrl = \`${env.AUTH_URL}/auth/reset-password?token=${token}\`` and call
`sender.sendPasswordReset({ to: email, resetUrl, locale })`.

### 4.7 Locale forwarding

`requestPasswordReset(email, locale)` — server action passes the locale extracted
from `headers().get("accept-language")` (default `"en"`). Server actions live
on the server, so reading the header inline is safe.

### 4.8 Env additions

```
RESEND_API_KEY        optional (required in production)
EMAIL_FROM            optional, default: "Atlas <noreply@atlas.local>"
```

### 4.9 Files touched

| File | Change |
|---|---|
| `src/server/services/email/email-sender.ts` | NEW — interface |
| `src/server/services/email/console-sender.ts` | NEW |
| `src/server/services/email/resend-sender.ts` | NEW |
| `src/server/services/email/factory.ts` | NEW |
| `src/server/services/email/templates/password-reset.ts` | NEW |
| `src/server/services/auth.service.ts:135-155` | wire sender |
| `src/server/actions/auth.actions.ts:85-105` | forward locale |
| `src/lib/env.ts` | add RESEND_API_KEY, EMAIL_FROM |
| `src/server/services/email/__tests__/console-sender.test.ts` | NEW |
| `src/server/services/email/__tests__/resend-sender.test.ts` | NEW |
| `src/server/services/email/__tests__/password-reset-template.test.ts` | NEW |
| `src/server/services/__tests__/auth.service.forgotpw.test.ts` | NEW |

## 5. SDD dimensions (9)

- **PROD**: Closes the #1 pre-Beta credibility gap (account recovery).
- **UX**: UI contract unchanged — still shows anti-enumeration success. Real email arrives when `RESEND_API_KEY` is set in Staging/Prod.
- **TECH**: Zero new npm deps. `fetch` + abstraction. Reusable for verification email in SPEC-AUTH-VERIFY-001.
- **SEC**: Anti-enumeration preserved (success always). Dev-fallback logs URL ONLY outside production. Prod throws at boot if sender is missing (fail-loud).
- **AI**: N/A.
- **INFRA**: Staging needs `RESEND_API_KEY` + `EMAIL_FROM` secrets before deploy.
- **QA**: Unit tests per sender + service integration + template i18n.
- **RELEASE**: Minor — adds optional env vars (backward compatible in dev). Breaking in production only if deployed without setting secrets (fail-fast is desired).
- **COST**: Resend free tier: 100 emails/day, 3,000/month. Beta volume expected <50/day → $0.

## 6. Trust gates

- Gate: PR ≥ 0.85, Staging ≥ 0.88, Prod ≥ 0.92
- Weights: Safety 35% + Accuracy 25% + i18n 15% + UX 15% + Performance 10%
