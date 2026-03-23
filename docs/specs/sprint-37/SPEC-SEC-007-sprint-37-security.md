# SPEC-SEC-007: Sprint 37 Security Review — Real Stripe Payment Integration

**Version**: 1.0.0
**Status**: Draft
**Author**: security-specialist
**Reviewers**: tech-lead, architect, finops-engineer
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Sprint**: 37
**Baseline**: v0.31.0 (Sprint 36)
**References**: SPEC-SEC-006, SPEC-ARCH-030, SPEC-ARCH-031, ATLAS-GAMIFICACAO-APROVADO.md

---

## 1. Scope

This specification covers the security requirements for transitioning Atlas from a mock payment provider to real Stripe Checkout integration. It addresses:

1. **Stripe Checkout Session Integration** — replacing MockPaymentProvider with StripeProvider
2. **Webhook Security** — signature verification, idempotency, replay protection
3. **Payment Manipulation Prevention** — server-side price enforcement, session ownership
4. **Admin Dashboard Hardening** — CSV export authorization, cache headers, PII controls
5. **LGPD Compliance** — Purchase data lifecycle, Stripe customer ID handling, data export
6. **Open Findings** — remediation of SEC-036 items not yet implemented

Builds on SPEC-SEC-006 (Sprint 36). All SEC-036-XXX requirements remain in force unless explicitly superseded.

### PCI-DSS Scope Assessment

Atlas uses **Stripe Checkout (hosted payment page)**. Card data is entered on Stripe's domain, never touches our servers. This qualifies Atlas for **SAQ A** (Self-Assessment Questionnaire A) — the lightest PCI-DSS compliance tier.

| PCI-DSS Concern | Atlas Posture |
|---|---|
| Card number storage | NEVER — Stripe handles exclusively |
| Card number transmission | NEVER — redirect to Stripe domain |
| Card number processing | NEVER — Stripe processes, returns session |
| What we store | `stripe_session_id`, `stripe_customer_id`, `paymentRef` (Stripe payment intent ID) |
| Tokenization | Stripe handles — we receive only session/payment references |

**Conclusion**: Atlas is out of PCI-DSS scope for card data. We MUST maintain this posture — no custom payment form, no card fields, no client-side Stripe.js Elements in Sprint 37.

---

## 2. Threat Model (STRIDE)

### 2.1 Stripe Checkout Session Creation

| STRIDE | Threat | Severity | Mitigation |
|---|---|---|---|
| Spoofing | Attacker creates checkout session for another user | CRITICAL | `userId` from server session only, never from client. SEC-037-001 |
| Tampering | Client sends manipulated price or PA amount | CRITICAL | Server-side price lookup from `PA_PACKAGES`; Stripe receives `amountCents` from server. SEC-037-002 |
| Tampering | Attacker modifies Stripe session `line_items` in transit | LOW | HTTPS enforced; Stripe API call is server-to-server |
| Repudiation | User disputes they initiated purchase | MEDIUM | `Purchase.createdAt` + `stripe_session_id` in Purchase record; Stripe dashboard has parallel audit trail |
| Info Disclosure | Stripe secret key leaked to client | CRITICAL | `STRIPE_SECRET_KEY` in env.ts server block; `"server-only"` import on provider. SEC-037-003 |
| Info Disclosure | Checkout session URL leaked via Referer header | LOW | Stripe Checkout is on stripe.com domain; our success URL contains only session ID |
| DoS | Attacker floods checkout session creation | HIGH | Rate limit: 5 sessions per user per hour. SEC-037-004 |
| DoS | Attacker creates sessions without completing — orphaned Purchase records | MEDIUM | Cron/webhook-based expiration: pending purchases older than 24h marked `expired`. SEC-037-005 |
| Elevation | Non-authenticated user creates checkout session | HIGH | `auth()` check as first line in action; `UnauthorizedError` if no session |

### 2.2 Stripe Webhook Processing

| STRIDE | Threat | Severity | Mitigation |
|---|---|---|---|
| Spoofing | Attacker sends forged webhook to credit PA | CRITICAL | `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`. SEC-037-006 |
| Spoofing | Replay attack: re-send legitimate webhook to double-credit | CRITICAL | Idempotent processing: unique constraint on `paymentRef`. SEC-037-007 |
| Tampering | Webhook payload modified in transit | CRITICAL | Stripe signature covers entire payload; `constructEvent` rejects tampered bodies. SEC-037-006 |
| Tampering | Webhook `metadata.userId` swapped to credit wrong user | CRITICAL | Cross-verify: `metadata.userId` must match `Purchase.userId` for the session. SEC-037-008 |
| Repudiation | Webhook processed but PA not credited (or vice versa) | HIGH | Atomic `$transaction`: Purchase update + PA credit + PointTransaction in single TX. SEC-037-009 |
| Info Disclosure | Webhook endpoint returns internal errors exposing stack traces | MEDIUM | Return only `{ received: true }` (200) or `{ error: "Invalid signature" }` (400). SEC-037-010 |
| DoS | Stripe sends burst of webhooks during incident | LOW | Webhook handler is idempotent; duplicate processing is safe (no-op). Queue if needed |
| Elevation | Webhook endpoint accessible without signature | CRITICAL | MUST reject ALL requests without valid `stripe-signature` header. SEC-037-006 |

### 2.3 Success/Cancel URL Handling

| STRIDE | Threat | Severity | Mitigation |
|---|---|---|---|
| Spoofing | User navigates to success URL with another user's session_id | HIGH | Success page MUST verify `Purchase.userId === session.user.id` before showing confirmation. SEC-037-011 |
| Tampering | Attacker crafts success URL with fake session_id | MEDIUM | Success page is display-only; PA credit happens via webhook, NOT via success page load. SEC-037-012 |
| Info Disclosure | Success URL exposes Stripe session_id in browser history | LOW | Session IDs are opaque Stripe references; no PII. Acceptable risk |

### 2.4 Admin Dashboard (Sprint 37 Additions)

| STRIDE | Threat | Severity | Mitigation |
|---|---|---|---|
| Spoofing | Non-admin triggers CSV export | CRITICAL | CSV export action MUST include `assertAdmin(session)`. SEC-037-013 |
| Tampering | Admin manipulates period filter to extract unbounded data | MEDIUM | Zod validation: `dateFrom`/`dateTo` required, max range 365 days. SEC-037-014 |
| Info Disclosure | CSV export contains PII beyond allowlist | HIGH | CSV columns limited to same allowlist as dashboard UI (SEC-036-016). SEC-037-015 |
| Info Disclosure | Revenue data cached in browser/CDN | MEDIUM | `Cache-Control: no-store` on all admin endpoints (SEC-036-017 — re-verify). SEC-037-016 |
| DoS | CSV export of large dataset exhausts server memory | MEDIUM | Streaming CSV generation; max 10,000 rows per export. SEC-037-017 |

### 2.5 Refund via Stripe

| STRIDE | Threat | Severity | Mitigation |
|---|---|---|---|
| Tampering | User initiates refund for purchase they don't own | CRITICAL | BOLA: `Purchase.userId === session.user.id`. SEC-037-018 |
| Tampering | User manipulates refund amount | HIGH | Refund amount read from `Purchase.amountCents`; full refund only. SEC-037-019 |
| DoS | Rapid refund attempts | MEDIUM | Rate limit: 1 refund per user per 24h (carries forward SEC-036-026). SEC-037-020 |
| Elevation | Refund succeeds on Stripe but PA deduction fails | HIGH | Atomic: Stripe refund + DB transaction. If DB fails, do NOT initiate Stripe refund. SEC-037-021 |

---

## 3. Security Requirements

### Stripe Provider Implementation

**SEC-037-001**: `StripeProvider` MUST import `"server-only"`. The Stripe SDK (`stripe` npm package) MUST NOT appear in any client bundle. Validate via build analysis or `import "server-only"` at module top.

**SEC-037-002**: Checkout session creation MUST resolve price from `PA_PACKAGES` server-side constant. The `line_items[0].price_data.unit_amount` sent to Stripe MUST come from `PA_PACKAGES[packageId].amountCents`. Client sends ONLY `packageId`. This carries forward SEC-036-006 — verify enforcement in new StripeProvider code path.

**SEC-037-003**: Environment variables for Stripe:

| Variable | Location | Validation |
|---|---|---|
| `STRIPE_SECRET_KEY` | `env.ts` server block | `z.string().startsWith("sk_")` |
| `STRIPE_WEBHOOK_SECRET` | `env.ts` server block | `z.string().startsWith("whsec_")` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `env.ts` client block | `z.string().startsWith("pk_")` |

`STRIPE_SECRET_KEY` MUST NEVER appear in:
- Client-side code or bundles
- Log output at any level
- Error messages or API responses
- Git history (use `.env.local` only, already in `.gitignore`)

**SEC-037-004**: Rate limit checkout session creation: **5 per user per hour**.
```
Key: ratelimit:checkout:${userId}
Max: 5
Window: 3600 seconds
```
This MUST be enforced in the server action BEFORE calling Stripe API.

**SEC-037-005**: Orphaned session cleanup — Purchase records with `status: "pending"` older than 24 hours MUST be marked `status: "expired"`. Implementation options:
- Preferred: handle via `checkout.session.expired` webhook event from Stripe
- Fallback: daily cron that marks stale pending purchases as expired
- PA MUST NOT be credited for expired sessions

### Webhook Security

**SEC-037-006**: Webhook endpoint (`/api/webhooks/stripe`) MUST:
1. Read raw body as `Buffer` or `string` (NOT parsed JSON) — Stripe signature requires raw payload
2. Extract `stripe-signature` header
3. Call `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`
4. Reject with 400 if signature verification fails
5. Return 200 with `{ received: true }` for all valid webhooks (even unhandled event types)
6. MUST NOT use `bodyParser` or any middleware that parses the body before signature verification

**SEC-037-007**: Idempotent webhook processing:
- `checkout.session.completed` handler MUST check if `Purchase` with matching `paymentRef` already has `status: "confirmed"`
- If already confirmed: log and return 200 (no-op)
- If pending: process within `$transaction`
- Unique constraint on `Purchase.paymentRef` (already exists in schema) provides database-level guard

**SEC-037-008**: Metadata cross-verification:
- When creating Stripe Checkout session, include `metadata: { userId, purchaseId, packageId }`
- On webhook receipt, verify `session.metadata.userId === Purchase.userId` for the matching `purchaseId`
- If mismatch: log CRITICAL alert, do NOT credit PA, mark purchase as `fraud_review`

**SEC-037-009**: Atomic PA credit on webhook:
```
$transaction:
  1. Update Purchase: status = "confirmed", paymentRef = session.payment_intent
  2. Increment UserProgress.availablePoints by paAmount (NOT totalPoints)
  3. Create PointTransaction type="purchase"
```
All three operations in a single Prisma `$transaction`. If any fails, all roll back.

**SEC-037-010**: Webhook endpoint response rules:
- Valid signature, event processed: `200 { received: true }`
- Valid signature, event type not handled: `200 { received: true }` (Stripe retries on non-2xx)
- Invalid signature: `400 { error: "Invalid signature" }` — no stack trace, no details
- Internal error: `500 { error: "Processing failed" }` — Stripe will retry

### Stripe Checkout Flow Security

**SEC-037-011**: Success page ownership verification:
```typescript
// /expedition/purchase/success?session_id=cs_xxx
const session = await auth();
const purchase = await db.purchase.findFirst({
  where: { stripeSessionId: checkoutSessionId, userId: session.user.id }
});
if (!purchase) redirect("/expeditions"); // BOLA: not your purchase
```

**SEC-037-012**: PA credit MUST happen exclusively via webhook, NEVER on success page load. The success page is informational only — it reads the Purchase record status but does not mutate it.

### Payment Provider Interface Changes

**SEC-037-023**: The `PaymentProvider` interface MUST be extended for Stripe Checkout:

```typescript
interface PaymentProvider {
  createCheckoutSession(params: {
    packageId: string;
    amountCents: number;
    currency: string;
    userId: string;
    purchaseId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }>;

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;

  createRefund(paymentIntentId: string, amountCents: number): Promise<{ refundId: string }>;
}
```

The old `createIntent` / `confirmIntent` flow (synchronous mock) is replaced by Stripe's asynchronous Checkout Session flow. `MockPaymentProvider` MUST be updated to match the new interface for test compatibility.

### Purchase Model Changes

**SEC-037-024**: New fields on `Purchase` model:

| Field | Type | Purpose |
|---|---|---|
| `stripeSessionId` | `String? @unique` | Stripe Checkout Session ID for lookup |
| `stripeCustomerId` | `String?` | Stripe customer ID (optional, for recurring billing future) |

`paymentRef` continues to store the Stripe Payment Intent ID (from webhook `session.payment_intent`).

### Domain Origin Validation

**SEC-037-025**: Stripe Checkout `success_url` and `cancel_url` MUST be constructed from `env.NEXT_PUBLIC_APP_URL` — never from client-provided URLs. This prevents open redirect via checkout flow.

```typescript
const successUrl = `${env.NEXT_PUBLIC_APP_URL}/expedition/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/expedition/purchase?cancelled=true`;
```

---

## 4. Admin Dashboard Security (Sprint 37 Additions)

### CSV Export

**SEC-037-013**: CSV export server action MUST:
1. Call `assertAdmin(session)` as first line
2. Validate export parameters via Zod (period, date range, columns)
3. Limit to 10,000 rows maximum
4. Set response headers:
   - `Content-Type: text/csv; charset=utf-8`
   - `Content-Disposition: attachment; filename="atlas-export-YYYY-MM-DD.csv"`
   - `Cache-Control: no-store, no-cache, must-revalidate`
   - `X-Content-Type-Options: nosniff`

**SEC-037-014**: Period filter validation:
```typescript
const ExportParamsSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  type: z.enum(["revenue", "users", "transactions"]),
}).refine(
  (data) => {
    const diffMs = data.dateTo.getTime() - data.dateFrom.getTime();
    return diffMs > 0 && diffMs <= 365 * 24 * 60 * 60 * 1000;
  },
  { message: "Date range must be positive and at most 365 days" }
);
```

**SEC-037-015**: CSV column allowlist per export type:

| Export Type | Allowed Columns |
|---|---|
| `revenue` | date, packageId, paAmount, amountCents, currency, status |
| `users` | idSuffix (last 6), email, name, availablePoints, totalPoints, rank, badgeCount, tripCount, createdAt |
| `transactions` | date, type, amount, description (no userId, no raw IDs) |

MUST NOT include: passwordHash, passport, nationalId, birthDate, phone, address, stripeCustomerId, stripeSessionId, full userId.

**SEC-037-016**: Verify `Cache-Control: no-store` headers on ALL admin routes. This was SEC-036-017 — verify implementation in Sprint 36 code. If implemented as Next.js `headers()` export, confirm it applies to both RSC data and API responses.

**SEC-037-017**: CSV streaming for large exports:
- Use `ReadableStream` or chunked response
- Process in batches of 500 rows
- Abort if row count exceeds 10,000

### Admin Guard Integrity Check

**SEC-037-026**: Verify the 3-layer admin guard (SEC-036-013) remains intact after Sprint 37 changes:

| Layer | File | Check |
|---|---|---|
| Middleware | `src/middleware.ts:76-83` | `pathname.includes("/admin")` + `role !== "admin"` redirect |
| Layout | `src/app/[locale]/(app)/admin/layout.tsx` | `db.user.findUnique` role check (not just JWT) |
| Action | Every admin server action | `assertAdmin(session)` or equivalent |

**Finding from Sprint 36 code review**: The admin layout queries the DB for role verification (`db.user.findUnique`), which is stronger than JWT-only check. This is correct — JWT role could be stale. Maintain this pattern.

---

## 5. LGPD Compliance

### 5.1 Purchase Data Classification

Purchase records are **personal data** under LGPD Art. 5, I — they link a natural person to financial transactions.

| Data Element | Classification | Retention | Export | Deletion |
|---|---|---|---|---|
| Purchase record | Personal data | Indefinite (accounting) | Yes — in data export | Anonymize (retain for fiscal) |
| `Purchase.userId` | Personal identifier | While account active | Included | Replace with `ANONYMIZED` |
| `Purchase.stripeSessionId` | Technical reference | While account active | Excluded | Set to NULL |
| `Purchase.stripeCustomerId` | External identifier | While account active | Excluded from client | Set to NULL |
| `Purchase.paymentRef` | Technical reference | Indefinite (reconciliation) | Excluded | Retain (no PII) |
| `PointTransaction` (purchase type) | Personal data | Indefinite (accounting) | Yes — in data export | Anonymize userId |

### 5.2 Data Export (LGPD Art. 18, V)

When user requests data export, include:

```json
{
  "purchases": [
    {
      "packageId": "explorador",
      "paAmount": 500,
      "amountBRL": "R$ 14,90",
      "status": "confirmed",
      "date": "2026-03-15T10:30:00Z"
    }
  ],
  "pointTransactions": [
    {
      "type": "purchase",
      "amount": 500,
      "description": "PA package: explorador (500 PA)",
      "date": "2026-03-15T10:30:00Z"
    }
  ]
}
```

MUST NOT include in export: `stripeSessionId`, `stripeCustomerId`, `paymentRef`, internal IDs.

### 5.3 Account Deletion (LGPD Art. 18, VI)

**SEC-037-027**: On account deletion, execute in this order within `$transaction`:

1. **Anonymize Purchase records** (retain for fiscal/accounting compliance):
   ```sql
   UPDATE "purchases"
   SET "userId" = 'DELETED_USER',
       "stripeSessionId" = NULL,
       "stripeCustomerId" = NULL
   WHERE "userId" = $1;
   ```
2. **Anonymize PointTransactions**:
   ```sql
   UPDATE "point_transactions"
   SET "userId" = 'DELETED_USER'
   WHERE "userId" = $1;
   ```
3. **Delete Stripe customer** (if stored): call `stripe.customers.del(stripeCustomerId)` before removing the record
4. **Delete remaining user data**: cascades handle UserProgress, UserBadge, etc.

Retained anonymized records allow Atlas to maintain accurate revenue reporting without personal data linkage.

### 5.4 Stripe Customer ID

**SEC-037-028**: `stripeCustomerId`:
- Stored on Purchase record (not on User model) — Sprint 37 scope
- MUST NOT be exposed in any client-side response or API
- MUST NOT be included in data export
- MUST be set to NULL on account deletion
- If future recurring billing needs a User-level `stripeCustomerId`, create a separate ADR

### 5.5 Data Minimization

**SEC-037-029**: Client-side purchase display MUST only include:
- `packageId`, `paAmount`, `status`, `createdAt`, `amountCents`, `currency`
- MUST NOT include: `stripeSessionId`, `stripeCustomerId`, `paymentRef`, `userId`
- The existing `getPurchaseHistoryAction` (Sprint 36) already follows this pattern — verify it remains compliant after schema changes

---

## 6. Stripe-Specific Security Controls

### 6.1 API Key Management

**SEC-037-030**: Stripe keys lifecycle:

| Key | Environment | Prefix | Storage |
|---|---|---|---|
| Test Secret Key | development, staging | `sk_test_` | `.env.local` |
| Live Secret Key | production | `sk_live_` | Railway/Vercel env vars (encrypted) |
| Test Publishable Key | development, staging | `pk_test_` | `.env.local` + `NEXT_PUBLIC_` |
| Live Publishable Key | production | `pk_live_` | Railway/Vercel env vars + `NEXT_PUBLIC_` |
| Webhook Secret (test) | development | `whsec_` | `.env.local` |
| Webhook Secret (live) | production | `whsec_` | Railway/Vercel env vars (encrypted) |

**Rules**:
- NEVER commit any Stripe key to Git
- NEVER log Stripe keys at any level
- NEVER use `sk_live_` in development or staging
- Use Stripe restricted keys in production with ONLY these permissions:
  - `checkout_sessions: write`
  - `refunds: write`
  - `customers: write` (if storing customer ID)
  - `webhook_endpoints: read`

### 6.2 Webhook Endpoint Hardening

**SEC-037-031**: Webhook endpoint configuration:

```typescript
// src/app/api/webhooks/stripe/route.ts

export const runtime = "nodejs"; // NOT edge — need Buffer for raw body
export const dynamic = "force-dynamic";

// Disable body parsing — Stripe needs raw body for signature
export async function POST(req: Request) {
  const rawBody = await req.text(); // raw string, not parsed JSON
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn("webhook.signature_invalid", { error: err instanceof Error ? err.message : "unknown" });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Process event...
  return Response.json({ received: true }, { status: 200 });
}
```

**SEC-037-032**: Webhook event handling matrix:

| Event Type | Action | Idempotency |
|---|---|---|
| `checkout.session.completed` | Credit PA via `$transaction` | Check `Purchase.status !== "confirmed"` |
| `checkout.session.expired` | Mark Purchase `status: "expired"` | Check `Purchase.status === "pending"` |
| `charge.refunded` | Debit PA, update Purchase status | Check `Purchase.status !== "refunded"` |
| All others | Log and return 200 | N/A |

**SEC-037-033**: Webhook retry safety:
- Stripe retries failed webhooks up to 3 days with exponential backoff
- ALL handlers MUST be idempotent — processing the same event twice produces the same result
- Use `event.id` as additional deduplication key if needed (log processed event IDs to Redis with 72h TTL)

### 6.3 Stripe SDK Version Pinning

**SEC-037-034**: Pin `stripe` npm package to exact version (e.g., `"stripe": "17.5.0"`, not `"^17.5.0"`). Stripe SDK updates can introduce breaking API changes. Update only with explicit review.

---

## 7. Open Findings from Sprint 36

The following SEC-036 requirements were specified but NOT yet implemented based on code review:

| ID | Severity | Description | Status | Sprint 37 Action |
|---|---|---|---|---|
| SEC-036-008 | CRITICAL | Idempotent PA credit (unique paymentRef) | Schema has `@unique` but action does not check before insert | MUST fix: add `findFirst` check in webhook handler |
| SEC-036-009 | HIGH | Mock webhook HMAC verification | Mock always returns `true` | Replace with Stripe `constructEvent` in Sprint 37 |
| SEC-036-012 | HIGH | Purchase rate limit 5/hr | NOT implemented in `purchasePAAction` | MUST add `checkRateLimit()` call |
| SEC-036-026 | MEDIUM | Refund rate limit 1/24h | No refund action exists yet | Implement with rate limit in Sprint 37 |
| SEC-S34-001 | HIGH | OAuth redirect URI validation | Open | Carry forward |
| SEC-S34-004 | HIGH | Phone field injection | Open | Carry forward |
| DT-004 | ALTO | `updateTrip` mass assignment risk | Open | Carry forward |

**SEC-037-035**: Sprint 37 MUST NOT ship without fixing SEC-036-012 (purchase rate limit). This is a prerequisite for real money transactions.

---

## 8. Auth & Authorization Matrix (Sprint 37)

| Route/Action | Auth | Role | BOLA | Rate Limit |
|---|---|---|---|---|
| POST `createCheckoutSessionAction` | Yes | any | userId=session | 5/hr (SEC-037-004) |
| GET `/purchase/success` | Yes | any | Purchase.userId=session | Standard |
| POST `/api/webhooks/stripe` | No (Stripe signature) | N/A | metadata cross-verify | N/A |
| POST `requestRefundAction` | Yes | any | Purchase.userId=session | 1/24hr (SEC-037-020) |
| GET `/admin/dashboard` | Yes | admin | N/A | 30/min |
| POST `adminExportCSVAction` | Yes | admin | N/A | 5/hr (SEC-037-013) |
| GET `/api/admin/dashboard/*` | Yes | admin | N/A | 30/min |
| GET purchase history (own) | Yes | any | userId=session | Standard |

---

## 9. Environment Variable Changes

### New Variables

```
# Server-side only
STRIPE_SECRET_KEY=sk_test_...      # z.string().startsWith("sk_")
STRIPE_WEBHOOK_SECRET=whsec_...    # z.string().startsWith("whsec_")
PAYMENT_PROVIDER=stripe            # z.enum(["mock", "stripe"]).default("mock")

# Client-side
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # z.string().startsWith("pk_")
```

### Removed/Deprecated

```
PAYMENT_WEBHOOK_SECRET  # Replaced by STRIPE_WEBHOOK_SECRET
```

**SEC-037-036**: `env.ts` MUST be updated to include all new variables with proper Zod validation. `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` MUST be in the `server` block — NEVER in `client`.

**SEC-037-037**: `PAYMENT_PROVIDER` env var controls the factory:
- `"mock"`: returns `MockPaymentProvider` (development/test)
- `"stripe"`: returns `StripeProvider` (staging/production)
- Default: `"mock"` — prevents accidental Stripe calls in development

---

## 10. CSP and External Script Policy

**SEC-037-038**: Stripe Checkout uses a redirect to `checkout.stripe.com` — no additional CSP changes needed (it is not an iframe or embedded script).

If a future sprint introduces Stripe.js Elements (embedded card form), the following CSP additions would be required:
- `script-src: https://js.stripe.com`
- `frame-src: https://js.stripe.com https://hooks.stripe.com`

Sprint 37 does NOT require these CSP changes. Document here for awareness only.

---

## 11. Logging and Observability

**SEC-037-039**: Payment logging rules:

| Event | Log Level | Fields |
|---|---|---|
| Checkout session created | INFO | `userIdHash`, `packageId`, `amountCents` |
| Webhook received (valid) | INFO | `eventType`, `sessionId` (last 8 chars) |
| Webhook signature invalid | WARN | IP address (hashed), error message |
| PA credited via webhook | INFO | `userIdHash`, `packageId`, `paAmount`, `paymentRef` (last 8 chars) |
| Purchase confirmed | INFO | `userIdHash`, `packageId`, `amountCents` |
| Refund processed | INFO | `userIdHash`, `packageId`, `paAmount` |
| Idempotent skip (duplicate webhook) | INFO | `eventType`, `sessionId` (last 8 chars) |
| Metadata userId mismatch | CRITICAL | `expectedUserIdHash`, `receivedUserIdHash`, `purchaseId` |
| Rate limit hit (checkout) | WARN | `userIdHash` |

**MUST NOT log**: full Stripe keys, full session IDs, full payment intent IDs, raw webhook payloads, user email, card details (never available to us).

**SEC-037-040**: Structured log fields for payment events MUST use the `payment.` namespace prefix (e.g., `payment.checkout.created`, `payment.webhook.received`, `payment.credit.completed`).

---

## 12. Testing Strategy

### Unit Tests

| Test | Description | Count |
|---|---|---|
| StripeProvider.createCheckoutSession | Validates params, calls stripe SDK | 4 |
| StripeProvider.verifyWebhookSignature | Valid/invalid/missing signature | 3 |
| Webhook handler: checkout.session.completed | Credit PA, idempotency, metadata mismatch | 5 |
| Webhook handler: checkout.session.expired | Mark purchase expired | 2 |
| Webhook handler: charge.refunded | Debit PA, update purchase | 3 |
| Rate limit: checkout creation | Allow 5, block 6th | 2 |
| Rate limit: refund | Allow 1, block 2nd within 24h | 2 |
| Purchase ownership verification (BOLA) | Own/other user | 2 |
| Admin CSV export: role check | Admin allowed, non-admin rejected | 2 |
| Admin CSV export: column allowlist | No PII leakage | 3 |
| Price server-side resolution | Client cannot influence amount | 2 |
| **Total** | | **~30** |

### Integration Tests

| Test | Description |
|---|---|
| Full checkout flow (mock mode) | Create session -> webhook -> PA credited |
| Duplicate webhook processing | Second webhook is no-op |
| Expired session handling | Session expires -> purchase marked expired |
| Refund flow | Refund -> PA debited -> purchase updated |
| Admin export with real DB | Correct columns, no PII |

### Security-Specific Tests

| Test | Description |
|---|---|
| Webhook without signature header | Returns 400 |
| Webhook with invalid signature | Returns 400 |
| Webhook with valid signature but tampered body | Returns 400 |
| Success page with wrong user's session_id | Redirects to /expeditions |
| `createCheckoutSessionAction` without auth | Throws UnauthorizedError |
| `createCheckoutSessionAction` with invalid packageId | Returns error |
| `adminExportCSVAction` by non-admin | Throws ForbiddenError |
| NEXT_PUBLIC bundle does not contain `sk_` | Build-time verification |

---

## 13. PR Security Checklist

Before merging Sprint 37 payment code:

- [ ] `STRIPE_SECRET_KEY` in `env.ts` server block, not client block
- [ ] `STRIPE_WEBHOOK_SECRET` in `env.ts` server block, not client block
- [ ] `StripeProvider` module has `import "server-only"` at top
- [ ] Webhook handler uses `req.text()` (raw body), not `req.json()`
- [ ] `stripe.webhooks.constructEvent()` called with correct params
- [ ] Webhook returns 400 on invalid signature (no stack trace in response)
- [ ] PA credit ONLY via webhook handler, NEVER on success page load
- [ ] `$transaction` wraps Purchase update + PA credit + PointTransaction
- [ ] Idempotency: duplicate `paymentRef` handled as no-op
- [ ] `metadata.userId` cross-verified against `Purchase.userId`
- [ ] Price comes from `PA_PACKAGES` server-side, not from client
- [ ] Rate limit `checkRateLimit("ratelimit:checkout:${userId}", 5, 3600)` in checkout action
- [ ] Rate limit `checkRateLimit("ratelimit:refund:${userId}", 1, 86400)` in refund action
- [ ] Success/Cancel URLs built from `env.NEXT_PUBLIC_APP_URL`, not client input
- [ ] Admin CSV export checks `assertAdmin(session)` before processing
- [ ] CSV columns match allowlist (no passwordHash, passport, etc.)
- [ ] `Cache-Control: no-store` on all admin API responses
- [ ] No Stripe keys in log output at any level
- [ ] `stripeSessionId` and `stripeCustomerId` excluded from client-facing API responses
- [ ] `stripeSessionId` and `stripeCustomerId` excluded from data export
- [ ] Account deletion anonymizes Purchase records (not deletes)
- [ ] Stripe SDK pinned to exact version in `package.json`
- [ ] Build output verified: no `sk_` strings in client bundles
- [ ] `PAYMENT_PROVIDER` env var defaults to `"mock"` — safe for development

---

## 14. Summary

| Severity | Count |
|---|---|
| CRITICAL | 10 |
| HIGH | 11 |
| MEDIUM | 9 |
| LOW | 3 |
| **Total** | **33** |

### CRITICAL Items (must resolve before merge)

| ID | Description |
|---|---|
| SEC-037-001 | userId from session only, never from client |
| SEC-037-002 | Server-side price resolution from PA_PACKAGES |
| SEC-037-003 | STRIPE_SECRET_KEY server-only, never in client bundle |
| SEC-037-006 | Webhook signature verification via constructEvent |
| SEC-037-007 | Idempotent webhook processing (unique paymentRef check) |
| SEC-037-008 | Metadata userId cross-verification |
| SEC-037-009 | Atomic $transaction for PA credit |
| SEC-037-011 | Success page ownership verification (BOLA) |
| SEC-037-013 | Admin CSV export role check |
| SEC-037-035 | Rate limit on checkout session creation (missing from Sprint 36) |

### Inherited Open Findings

| ID | Severity | From Sprint | Description |
|---|---|---|---|
| SEC-S34-001 | HIGH | 34 | OAuth redirect URI validation |
| SEC-S34-004 | HIGH | 34 | Phone field injection |
| DT-004 | ALTO | Legacy | `updateTrip` mass assignment risk |

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-23 | Criacao inicial — Sprint 37 real Stripe payment security |
