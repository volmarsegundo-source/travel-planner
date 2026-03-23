# SPEC-INFRA-007: Sprint 37 Infrastructure — Stripe Payment Integration

**Version**: 1.0.0
**Status**: Draft
**Author**: devops-engineer
**Reviewers**: tech-lead, architect, security-specialist
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Sprint**: 37
**Baseline**: v0.31.0

---

## 1. Overview

Sprint 37 replaces the mock payment provider introduced in Sprint 36 with a real Stripe integration. This spec covers the infrastructure changes required to support Stripe in all environments: new environment variables, webhook endpoint hardening, secrets management, environment separation (test mode vs live mode), monitoring, CI/CD adjustments, and rollback strategy.

No new cloud services, databases, or containers are introduced. The Purchase model and webhook endpoint already exist from Sprint 36 (SPEC-INFRA-006). This sprint transitions the `PAYMENT_PROVIDER` flag from `mock` to `stripe` and wires in the Stripe SDK.

---

## 2. Architecture Diagram

```
                         Traveler Browser
                              |
                     [NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY]
                              |
                     Stripe.js / Elements
                              |
                    Stripe Checkout Session
                              |
                   +----------+----------+
                   |                     |
              Success URL           Stripe Backend
           (redirect back)              |
                                  Webhook POST
                                        |
                            /api/webhooks/stripe
                                        |
                          [STRIPE_WEBHOOK_SECRET]
                       stripe.webhooks.constructEvent()
                                        |
                              Purchase Service
                                        |
                                   Neon PostgreSQL
```

Key points:
- Client uses `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_* / pk_live_*) for Stripe.js
- Server uses `STRIPE_SECRET_KEY` (sk_test_* / sk_live_*) to create Checkout Sessions
- Webhook uses `STRIPE_WEBHOOK_SECRET` (whsec_*) for signature verification
- No card data touches our servers — Stripe handles PCI scope entirely

---

## 3. Environment Variables

### 3.1 New Variables

| Variable | Type | Required | Environments | Description |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | server | Yes | staging, production | Stripe API secret key (sk_test_* or sk_live_*) |
| `STRIPE_PUBLISHABLE_KEY` | server | Yes | staging, production | Stripe publishable key — server reference for session creation |
| `STRIPE_WEBHOOK_SECRET` | server | Yes | staging, production, local | Webhook endpoint signature secret (whsec_*) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | Yes | staging, production | Stripe publishable key exposed to browser via Stripe.js |

### 3.2 Modified Variables

| Variable | Sprint 36 Value | Sprint 37 Value | Notes |
|---|---|---|---|
| `PAYMENT_PROVIDER` | `mock` | `stripe` | Controls which provider factory returns |

### 3.3 Validation Rules (env.ts)

The following validations must be added to `src/lib/env.ts`:

```typescript
// server block additions
STRIPE_SECRET_KEY: z.string()
  .startsWith("sk_")
  .min(20, "STRIPE_SECRET_KEY must be a valid Stripe secret key"),
STRIPE_PUBLISHABLE_KEY: z.string()
  .startsWith("pk_")
  .min(20, "STRIPE_PUBLISHABLE_KEY must be a valid Stripe publishable key"),
STRIPE_WEBHOOK_SECRET: z.string()
  .startsWith("whsec_")
  .min(10, "STRIPE_WEBHOOK_SECRET must be a valid Stripe webhook secret"),
PAYMENT_PROVIDER: z.enum(["mock", "stripe"]).default("mock"),

// client block addition
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string()
  .startsWith("pk_")
  .min(20, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a valid Stripe publishable key"),
```

**Important**: When `PAYMENT_PROVIDER=mock`, the Stripe variables should be optional to avoid blocking local development and CI test runs that do not need Stripe. Use a `.refine()` or conditional validation:

```typescript
STRIPE_SECRET_KEY: z.string().startsWith("sk_").min(20).optional()
  .refine(
    (val) => process.env.PAYMENT_PROVIDER !== "stripe" || !!val,
    { message: "STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe" }
  ),
```

Apply the same conditional pattern to `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### 3.4 Environment Values Per Environment

| Environment | PAYMENT_PROVIDER | Key Prefix | Source |
|---|---|---|---|
| Local (dev) | `mock` | N/A | `.env.local` |
| Local (Stripe CLI) | `stripe` | `sk_test_*` / `pk_test_*` | `.env.local` + Stripe CLI |
| CI (GitHub Actions) | `mock` | N/A | GitHub Secrets |
| Staging (Vercel Preview) | `stripe` | `sk_test_*` / `pk_test_*` | Vercel Environment Variables (Preview) |
| Production (Vercel) | `stripe` | `sk_live_*` / `pk_live_*` | Vercel Environment Variables (Production) |

### 3.5 .env.example Update

Add the following block to `.env.example`:

```bash
# ----- STRIPE (Sprint 37+) -----
# Payment provider: "mock" (default, no Stripe needed) or "stripe" (requires keys below)
PAYMENT_PROVIDER="mock"
# Stripe keys — required only when PAYMENT_PROVIDER=stripe
# Get from: https://dashboard.stripe.com/apikeys
# STRIPE_SECRET_KEY="sk_test_YOUR_STRIPE_SECRET_KEY"
# STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_STRIPE_PUBLISHABLE_KEY"
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_STRIPE_PUBLISHABLE_KEY"
# Webhook secret — from Stripe Dashboard or Stripe CLI output
# STRIPE_WEBHOOK_SECRET="whsec_YOUR_STRIPE_WEBHOOK_SECRET"
```

Keys are commented out so that `PAYMENT_PROVIDER=mock` works without any Stripe configuration.

---

## 4. Secrets Management

### 4.1 Secret Inventory

| Secret | Store | Rotation | Access | PCI Relevant |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | Vercel Env Vars (per environment) | On compromise or annually | Server-side only | Yes |
| `STRIPE_WEBHOOK_SECRET` | Vercel Env Vars (per environment) | On endpoint change | Webhook handler only | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Vercel Env Vars (per environment) | Paired with secret key | Server reference | No (public) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel Env Vars (per environment) | Paired with secret key | Client bundle | No (public) |

### 4.2 Key Separation Rules

- **Staging and production MUST use different Stripe accounts or at minimum different API key pairs.** A single key pair shared across environments violates least privilege and risks test transactions in production.
- Staging uses Stripe **test mode** keys (`sk_test_*`, `pk_test_*`). Production uses **live mode** keys (`sk_live_*`, `pk_live_*`). These are inherently different keys from Stripe's side.
- Webhook secrets differ per environment because each Vercel deployment URL has a separate webhook endpoint registered in Stripe Dashboard.
- `STRIPE_SECRET_KEY` must NEVER appear in client-side code, logs, error messages, or Sentry reports.

### 4.3 Vercel Environment Variable Configuration

In Vercel Dashboard, set scoped variables:

| Variable | Preview (Staging) | Production |
|---|---|---|
| `PAYMENT_PROVIDER` | `stripe` | `stripe` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (staging endpoint) | `whsec_...` (production endpoint) |

Use Vercel's environment scoping (Preview vs Production) to enforce separation. Do NOT use a single value across both scopes.

---

## 5. Webhook Endpoint

### 5.1 Endpoint: `/api/webhooks/stripe`

Sprint 36 created `/api/webhooks/payment` for the mock provider. Sprint 37 adds a Stripe-specific endpoint:

| Property | Value |
|---|---|
| Path | `/api/webhooks/stripe` |
| Method | POST |
| Authentication | None (Stripe signature verification instead) |
| Rate Limit | 100 requests/minute |
| Idempotency | Enforced via `paymentRef` unique constraint on Purchase |
| Body Parsing | Raw body required for signature verification |

### 5.2 Signature Verification

```typescript
// Pseudocode — exact implementation is the developer's responsibility
import Stripe from 'stripe';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function POST(request: Request) {
  const body = await request.text(); // raw body, NOT json()
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // Log signature failure — potential tampering or misconfiguration
    logger.warn({ event: 'webhook.signature_failed', error: err.message });
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  // Process event...
}
```

**Critical**: Next.js App Router route handlers receive the raw `Request` object. Use `request.text()` to get the raw body string. Do NOT use `request.json()` before signature verification — Stripe requires the exact raw bytes for HMAC computation.

### 5.3 Handled Event Types

| Stripe Event | Action | Idempotent Key |
|---|---|---|
| `checkout.session.completed` | Mark Purchase as completed, credit PA | `paymentRef` (Stripe session ID) |
| `checkout.session.expired` | Mark Purchase as expired | `paymentRef` |
| `charge.refunded` | Mark Purchase as refunded, debit PA | `paymentRef` |

Unrecognized event types should return 200 OK (acknowledge receipt, do nothing).

### 5.4 Local Development with Stripe CLI

For developers testing Stripe locally:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# The CLI outputs a webhook signing secret (whsec_...) — use this as STRIPE_WEBHOOK_SECRET in .env.local
```

Add to `.env.local`:
```bash
PAYMENT_PROVIDER="stripe"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..." # from stripe listen output
```

---

## 6. Network & Security

### 6.1 PCI-DSS Scope Minimization

By using Stripe Checkout (hosted or embedded), **no card data flows through our servers**. This keeps Atlas in **SAQ-A** (the simplest PCI self-assessment level):

- Card numbers, CVVs, and expiry dates are collected by Stripe.js in an iframe
- Our server only creates Checkout Sessions and receives webhook events
- No card data is stored, processed, or transmitted through our infrastructure

### 6.2 Content Security Policy Update

The CSP middleware in `src/middleware.ts` must allow Stripe.js domains:

```
script-src: 'self' 'nonce-{nonce}' https://js.stripe.com
frame-src: 'self' https://js.stripe.com https://hooks.stripe.com
connect-src: 'self' https://api.stripe.com
```

These additions are required for Stripe Elements and Checkout to function.

### 6.3 Security Headers for Webhook Endpoint

The webhook endpoint (`/api/webhooks/stripe`) must:
- Accept POST only — return 405 for other methods
- NOT require CSRF token (external caller)
- NOT require session/auth cookie (external caller)
- Verify Stripe signature on every request (replaces auth)
- Log failed signature verifications as security events

### 6.4 Stripe SDK as Server-Only Dependency

The `stripe` npm package must only be imported in server-side code. Enforce with:
- Import `stripe` only in files under `src/server/` or API route handlers
- Add `import 'server-only'` at the top of any module that imports the Stripe SDK
- Never re-export Stripe types or instances from shared modules

---

## 7. CI/CD Updates

### 7.1 GitHub Actions — No Pipeline Changes Required

The existing CI pipeline (`ci.yml`) requires no structural changes:

- `PAYMENT_PROVIDER=mock` in CI — tests run against the mock provider
- Stripe SDK is installed via `npm ci` (it is a regular dependency) but not invoked during mock-mode tests
- Build step succeeds because Stripe env vars are optional when `PAYMENT_PROVIDER=mock`
- `SKIP_ENV_VALIDATION=true` already set in CI for build step

### 7.2 CI Environment Variables

Add to GitHub Actions environment (for documentation — not needed if mock mode):

```yaml
env:
  PAYMENT_PROVIDER: mock
  # No Stripe keys needed in CI — mock provider handles all payment tests
```

### 7.3 Staging Deployment

On merge to `master`, Vercel Preview deploys automatically with staging env vars:
- `PAYMENT_PROVIDER=stripe` with test-mode keys
- Stripe webhook registered for Vercel Preview URL
- Test purchases use Stripe test cards (4242 4242 4242 4242)

### 7.4 Production Deployment

Production deploy follows existing process (manual approval via `workflow_dispatch` or Vercel promotion):
- `PAYMENT_PROVIDER=stripe` with live-mode keys
- Stripe webhook registered for production URL
- Verify webhook delivery in Stripe Dashboard after first deploy

### 7.5 Pre-Deploy Checklist (Sprint 37 Specific)

Before deploying Sprint 37 to staging:
- [ ] Stripe test-mode API keys created and added to Vercel Preview env vars
- [ ] Webhook endpoint registered in Stripe Dashboard for staging URL
- [ ] `STRIPE_WEBHOOK_SECRET` from Stripe Dashboard added to Vercel Preview env vars
- [ ] CSP headers updated to allow Stripe.js domains
- [ ] Smoke test: complete a test purchase with card 4242 4242 4242 4242

Before deploying Sprint 37 to production:
- [ ] Stripe live-mode API keys created and added to Vercel Production env vars
- [ ] Webhook endpoint registered in Stripe Dashboard for production URL
- [ ] `STRIPE_WEBHOOK_SECRET` from Stripe Dashboard added to Vercel Production env vars
- [ ] Verify webhook signing secret is different from staging
- [ ] Run smoke test on staging with test card before promoting to production

---

## 8. Monitoring & Alerting

### 8.1 New Metrics

| Metric | Source | Dashboard | Description |
|---|---|---|---|
| `stripe.checkout.created` | Checkout Session creation | Sentry/Custom | Rate of checkout sessions created |
| `stripe.checkout.completed` | Webhook `checkout.session.completed` | Sentry/Custom | Successful payment completions |
| `stripe.checkout.expired` | Webhook `checkout.session.expired` | Sentry/Custom | Abandoned checkouts |
| `stripe.webhook.received` | Webhook handler entry | Sentry/Custom | Total webhook events received |
| `stripe.webhook.signature_failed` | Signature verification failure | Sentry/Custom | Failed signature checks |
| `stripe.webhook.processing_error` | Exception in webhook handler | Sentry/Custom | Internal errors during processing |
| `stripe.refund.processed` | Webhook `charge.refunded` | Sentry/Custom | Refund completions |

### 8.2 Alert Rules

| Alert | Condition | Severity | Channel | Action |
|---|---|---|---|---|
| Webhook failure spike | `stripe.webhook.signature_failed` > 5/hr | P1 | Sentry + Slack #incidents | Investigate: key rotation needed? Endpoint misconfigured? |
| Payment processing errors | `stripe.webhook.processing_error` > 3/hr | P1 | Sentry + Slack #incidents | Check logs, verify DB connectivity, check Purchase service |
| Zero successful payments | `stripe.checkout.completed` = 0 for 6h (during business hours) | P2 | Slack #alerts | Verify Stripe API status, check webhook delivery in Stripe Dashboard |
| High checkout abandonment | `expired / (completed + expired)` > 80% over 24h | P2 | Slack #alerts | UX review — pricing page or checkout flow issue |
| Signature failures (security) | `stripe.webhook.signature_failed` > 20/hr | P0 | Sentry + Slack #incidents + page on-call | Potential attack or webhook secret compromise — rotate secret immediately |

### 8.3 Structured Log Events

All payment-related log events must follow the project's JSON logging standard:

```json
{
  "timestamp": "ISO-8601",
  "level": "info",
  "service": "payment-service",
  "event": "stripe.checkout.completed",
  "traceId": "uuid",
  "metadata": {
    "sessionId": "cs_test_...",
    "packageId": "navegador",
    "amountCents": 2990,
    "currency": "BRL"
  }
}
```

**Never log**: full Stripe API keys, card details, customer email in combination with purchase details, raw webhook payload (may contain PII).

**Safe to log**: Stripe session ID (cs_*), event type, amount, currency, package ID, processing duration.

---

## 9. Rollback Plan

### 9.1 Instant Rollback via Feature Flag

The `PAYMENT_PROVIDER` environment variable acts as a built-in feature flag:

| Step | Action | Time | Risk |
|---|---|---|---|
| 1 | Set `PAYMENT_PROVIDER=mock` in Vercel env vars | 30 seconds | None |
| 2 | Trigger redeploy (or Vercel auto-redeploy on env change) | 2-3 minutes | None |
| 3 | Mock provider resumes — no real payments processed | Immediate | None |

### 9.2 Full Version Rollback

| Step | Action | Time | Risk |
|---|---|---|---|
| 1 | Revert to v0.31.0 tag via Vercel deployment rollback | 2-3 minutes | None |
| 2 | Purchase table and data remain in DB | N/A | No harm — Sprint 36 code uses mock |
| 3 | Stripe webhook events arrive but endpoint returns 404 | N/A | Stripe retries for 3 days; disable webhook in Dashboard |
| 4 | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` removed from client | N/A | Stripe.js will not load |

### 9.3 Data Consistency on Rollback

- Purchases completed via Stripe before rollback remain in DB with `status=completed` and `paymentRef` containing the Stripe session ID
- PA (Pontos Atlas) credited during Stripe purchases remain in user accounts
- If rollback is due to Stripe issues, refunds must be processed manually via Stripe Dashboard
- Mock provider does not conflict with existing Stripe Purchase records

### 9.4 Rollback Decision Criteria

Trigger immediate rollback if:
- Webhook signature failures > 20/hr (potential compromise)
- Payment completion rate drops below 50% for 2+ hours
- Stripe API returns 5xx for > 15 minutes
- Any evidence of unauthorized transactions

---

## 10. Disaster Recovery

| Metric | Target |
|---|---|
| RTO (Recovery Time Objective) | < 5 minutes (env var toggle + redeploy) |
| RPO (Recovery Point Objective) | Zero data loss — all purchases in PostgreSQL |

- **Stripe is the system of record** for payment transactions. Our Purchase table is a local mirror.
- In case of DB failure, transactions can be reconciled from Stripe Dashboard export.
- In case of Stripe outage, `PAYMENT_PROVIDER=mock` restores the purchase flow without real payments (users can retry when Stripe recovers).

---

## 11. Cost Impact

| Component | Sprint 36 | Sprint 37 | Delta |
|---|---|---|---|
| Infrastructure (Vercel, Neon, Upstash) | $0-5/mo | $0-5/mo | $0 |
| Stripe fees | $0 | 2.99% + R$0.39 per transaction | Variable, per transaction |
| `stripe` npm package | N/A | 0 (open source) | $0 |
| CI/CD (GitHub Actions) | Free tier | Free tier | $0 |
| **Infrastructure total** | | | **$0.00** |

Stripe fees are operational costs passed to the business, not infrastructure costs. No new cloud resources are provisioned.

---

## 12. No New Services

This spec confirms:
- No new Docker containers
- No new databases or database services
- No new Redis instances
- No new CI/CD services
- No new cloud resources beyond Vercel environment variables
- The `stripe` npm package is the only new dependency (server-side SDK, MIT license)

---

## 13. Local Development Impact

### 13.1 Default: Mock Mode (No Changes Required)

Developers who do not need Stripe integration continue working with `PAYMENT_PROVIDER=mock`. No Stripe keys are needed. No changes to `docker-compose.yml`.

### 13.2 Optional: Stripe Test Mode

Developers testing the Stripe flow locally need:
1. A Stripe account (free) with test-mode API keys
2. Stripe CLI installed for webhook forwarding
3. Five environment variables in `.env.local` (see Section 5.4)

This is opt-in. The mock provider remains the default for local development.

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-23 | Criacao inicial — Sprint 37 Stripe integration infrastructure |

---

> Ready with conditions -- resolve before apply:
> 1. security-specialist must review CSP additions (Stripe.js domains) and webhook endpoint security
> 2. Stripe test-mode keys must be provisioned and added to Vercel Preview before staging deploy
> 3. Stripe webhook endpoint must be registered in Stripe Dashboard for both staging and production URLs
> 4. tech-lead must approve the conditional env validation approach (optional when mock, required when stripe)
