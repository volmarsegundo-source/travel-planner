# Technical Specification: Stripe Payment Integration Architecture

**Spec ID**: SPEC-ARCH-032
**Related Story**: Sprint 37 — Gamification Wave 3 (Stripe Integration)
**Author**: architect
**Status**: Draft
**Last Updated**: 2026-03-23
**Sprint**: 37
**References**: SPEC-ARCH-030 (Mock Payment, Sprint 36), SPEC-PROD-041 (PA Packages), SPEC-SEC-006

---

## 1. Overview

Replace the MockPaymentProvider with a production StripePaymentProvider that uses Stripe Checkout Sessions for PA package purchases. The user is redirected to Stripe's hosted checkout page (supporting credit card and optionally PIX for Brazilian users), and payment confirmation is handled asynchronously via Stripe webhooks. This architecture preserves the existing PaymentProvider interface, making the swap transparent to the purchase flow.

---

## 2. Architecture Diagram

```
User clicks "Comprar PA"
        |
        v
[Client: PurchasePackagePage]
        |
        | POST createCheckoutSessionAction(packageId)
        v
[Server Action] ──── auth() + rate limit ────┐
        |                                      |
        | validate packageId                   | REJECT if not authed
        | create Purchase(status:"pending")     |   or rate limit exceeded
        | call StripePaymentProvider            |
        |   .createCheckoutSession()           |
        v                                      |
[Stripe API] ──── stripe.checkout.sessions.create()
        |
        | returns { sessionId, url }
        v
[Server Action returns { url }]
        |
        v
[Client redirects to Stripe Checkout URL]
        |
        ├── User completes payment ──> Stripe redirects to success_url
        │                                (/meu-atlas/comprar-pa?success=true&session_id=...)
        │
        └── User cancels ──> Stripe redirects to cancel_url
                                (/meu-atlas/comprar-pa?canceled=true)

        === ASYNC (webhook) ===

[Stripe] ──── POST /api/webhooks/stripe ────>
        |
        v
[Webhook Handler]
        | 1. Read raw body (no JSON parse yet)
        | 2. Verify signature via stripe.webhooks.constructEvent()
        | 3. Switch on event.type:
        |    ├── checkout.session.completed
        |    │     ├── Extract metadata: { userId, packageId, paAmount }
        |    │     ├── Idempotency check: Purchase.paymentRef unique
        |    │     ├── $transaction:
        |    │     │   ├── Update Purchase: status="confirmed", paymentRef=session.id
        |    │     │   ├── UserProgress: availablePoints += paAmount (NOT totalPoints)
        |    │     │   └── Create PointTransaction(type="purchase")
        |    │     └── Invalidate Redis cache
        |    │
        |    └── checkout.session.expired
        |          └── Update Purchase: status="expired"
        v
[Return 200 OK to Stripe]
```

---

## 3. Data Model

### No schema migration required.

The existing `Purchase` model already has all necessary fields:

| Field | Type | Usage in Stripe flow |
|---|---|---|
| `id` | `String @id @default(cuid())` | Internal PK |
| `userId` | `String` | BOLA enforcement |
| `packageId` | `String @db.VarChar(50)` | PA package identifier |
| `paAmount` | `Int` | PA to credit on confirmation |
| `amountCents` | `Int` | Stripe `amount_total` for reconciliation |
| `currency` | `String @default("BRL")` | Always BRL for now |
| `status` | `String @default("pending")` | pending -> confirmed / expired / failed |
| `paymentRef` | `String? @unique` | Stripe Checkout Session ID (idempotency key) |
| `refundedAt` | `DateTime?` | Future: refund timestamp |
| `createdAt` | `DateTime` | Audit |
| `updatedAt` | `DateTime` | Audit |

The `paymentRef` unique constraint is the idempotency mechanism: if a webhook fires twice for the same session, the second `Purchase.update` or lookup will detect the duplicate.

---

## 4. API Contract

### 4.1 Server Action: createCheckoutSessionAction

**Location**: `src/server/actions/purchase.actions.ts` (extend existing file)

```typescript
export async function createCheckoutSessionAction(
  packageId: string
): Promise<ActionResult<{ checkoutUrl: string }>>
```

- **Auth**: Required (session.user.id)
- **Rate limit**: 5 requests / hour / user (key: `checkout:${userId}`)
- **Request**: `packageId: string` (validated against PA_PACKAGES)
- **Response (success)**: `{ success: true, data: { checkoutUrl: string } }`
- **Error responses**:
  - `gamification.purchase.invalidPackage` — packageId not in PA_PACKAGES
  - `gamification.purchase.rateLimited` — exceeded 5/hr
  - `gamification.purchase.stripeError` — Stripe API failure (logged, generic message to user)

**Logic**:
1. `auth()` — reject if no session
2. `checkRateLimit("checkout:" + userId, 5, 3600)` — 5 per hour
3. Validate `getPackage(packageId)` — reject if undefined
4. Create `Purchase` with status `"pending"`, no `paymentRef` yet
5. Call `stripeProvider.createCheckoutSession(purchase.id, pkg, userId)`
6. Update `Purchase.paymentRef = session.id` (link Purchase to Stripe session)
7. Return `{ checkoutUrl: session.url }`

### 4.2 API Route: POST /api/webhooks/stripe

**Location**: `src/app/api/webhooks/stripe/route.ts`

- **Auth**: NONE (public endpoint). Secured by Stripe webhook signature verification.
- **Content-Type**: Must read raw body (NOT parsed JSON). Use `request.text()`.
- **Request**: Raw Stripe event payload + `stripe-signature` header
- **Response**: Always `200 OK` with JSON `{ received: true }` (Stripe retries on non-2xx)
- **Events handled**:

| Event | Action |
|---|---|
| `checkout.session.completed` | Credit PA atomically (see section 5) |
| `checkout.session.expired` | Mark Purchase as expired |
| All others | Log and ignore (200 OK) |

**CRITICAL**: This route must NOT import `src/lib/env.ts` at the top level if env validation would fail without all vars. Use `process.env.STRIPE_WEBHOOK_SECRET` directly, or make Stripe env vars optional in env.ts.

### 4.3 API Route: GET /api/checkout/session-status

**Location**: `src/app/api/checkout/session-status/route.ts`

- **Auth**: Required (session cookie validated via `auth()`)
- **Query params**: `session_id: string`
- **Response (200)**:
  ```json
  {
    "status": "complete" | "expired" | "open",
    "purchaseId": "clxx...",
    "paAmount": 500,
    "packageId": "explorador"
  }
  ```
- **Error responses**: 401 (no session), 404 (session not found or not owned by user)
- **Purpose**: Success page polls this to confirm payment landed before showing confirmation UI. Prevents showing "success" before webhook has processed.

---

## 5. Business Logic

### 5.1 Checkout Session Creation

```typescript
// src/server/services/payment/stripe-provider.ts
import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export class StripePaymentProvider implements PaymentProvider {
  async createCheckoutSession(
    purchaseId: string,
    pkg: { id: string; nameKey: string; amountCents: number; pa: number; currency: string },
    userId: string
  ): Promise<{ sessionId: string; url: string }> {
    const baseUrl = env.NEXT_PUBLIC_APP_URL;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: pkg.currency.toLowerCase(),
            unit_amount: pkg.amountCents,
            product_data: {
              name: pkg.id,  // i18n resolved on client, not in Stripe
              description: `${pkg.pa} Atlas Points`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/pt/meu-atlas/comprar-pa?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pt/meu-atlas/comprar-pa?canceled=true`,
      metadata: {
        userId,
        packageId: pkg.id,
        paAmount: String(pkg.pa),
        purchaseId,
      },
      client_reference_id: userId,
      expires_after_completion: { enabled: true, after: 300 },
    });

    return { sessionId: session.id, url: session.url! };
  }

  // PaymentProvider interface methods (for backward compat)
  async createIntent(
    amountCents: number,
    currency: string,
    metadata?: Record<string, string>
  ): Promise<PaymentIntent> {
    // Delegate to createCheckoutSession internally
    // This maintains interface compliance
    throw new Error("Use createCheckoutSession() for Stripe Checkout flow");
  }

  async confirmIntent(_intentId: string): Promise<PaymentConfirmation> {
    // Stripe Checkout uses webhooks, not explicit confirm
    throw new Error("Stripe Checkout uses webhook confirmation, not confirmIntent()");
  }

  async verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean> {
    try {
      stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      return true;
    } catch {
      return false;
    }
  }
}
```

**IMPORTANT NOTE ON INTERFACE EVOLUTION**: The current `PaymentProvider` interface was designed for a 2-step (createIntent + confirmIntent) flow. Stripe Checkout uses a redirect + webhook flow. Two options:

- **Option A** (recommended): Extend StripePaymentProvider with `createCheckoutSession()` as a Stripe-specific method. The `createIntent`/`confirmIntent` methods throw since they are not used with Stripe Checkout. The factory returns a typed `StripePaymentProvider` when Stripe is active.
- **Option B**: Refactor the interface to be more generic. Deferred — would break MockPaymentProvider contract for no gain.

### 5.2 Webhook Processing (checkout.session.completed)

```
1. Read raw body: const payload = await request.text()
2. Get signature: const sig = request.headers.get("stripe-signature")
3. Construct event: stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET)
4. If event.type !== "checkout.session.completed" && event.type !== "checkout.session.expired":
     log("stripe.webhook.ignored", { type: event.type })
     return Response.json({ received: true })
5. Extract session = event.data.object as Stripe.Checkout.Session
6. Extract metadata: { userId, packageId, paAmount, purchaseId }
7. Validate metadata fields are present — reject if missing

For checkout.session.completed:
8. IDEMPOTENCY CHECK:
     const existing = await db.purchase.findFirst({
       where: { paymentRef: session.id, status: "confirmed" }
     })
     if (existing) {
       log("stripe.webhook.duplicate", { sessionId: session.id })
       return Response.json({ received: true })
     }
9. AMOUNT VERIFICATION:
     Verify session.amount_total === pkg.amountCents
     If mismatch: log CRITICAL alert, do NOT credit, mark Purchase as "amount_mismatch"
10. ATOMIC CREDIT ($transaction):
     a. Update Purchase: status="confirmed", paymentRef=session.id
     b. UserProgress: availablePoints += paAmount  (NOT totalPoints)
     c. Create PointTransaction: type="purchase", amount=+paAmount
11. Invalidate Redis cache for user
12. log("purchase.webhook.completed", { sessionId, userId: hashUserId(userId), packageId, paAmount })
13. Return Response.json({ received: true })

For checkout.session.expired:
8. Update Purchase: status="expired" WHERE id=purchaseId AND status="pending"
9. log("purchase.webhook.expired", { sessionId, purchaseId })
10. Return Response.json({ received: true })
```

### 5.3 CRITICAL: availablePoints vs totalPoints

This rule is already enforced in `purchasePAAction` (Sprint 36) and must be preserved:

- `availablePoints += pkg.pa` — spendable balance increases
- `totalPoints` is UNCHANGED — it tracks lifetime organic earned points only
- Purchased PA does NOT affect rank progression

### 5.4 Success Page Flow

```
1. User returns to /meu-atlas/comprar-pa?success=true&session_id=cs_xxx
2. Client component reads query params
3. If success=true && session_id present:
     Poll GET /api/checkout/session-status?session_id=cs_xxx
     Show spinner while status is "open" (webhook not yet processed)
     Show confirmation when status is "complete"
     Show error/retry if status is "expired" or not found after 30s
4. If canceled=true:
     Show "Compra cancelada" message with option to retry
```

### 5.5 Edge Cases

| Case | Handling |
|---|---|
| Webhook fires before user returns to success_url | Normal — webhook processes asynchronously, success page polls |
| Webhook fires twice (Stripe retry) | Idempotent: paymentRef unique check prevents double credit |
| User creates session but never completes | Stripe session expires after 24h; `checkout.session.expired` webhook fires |
| Amount mismatch between metadata and session | CRITICAL: log alert, do NOT credit, mark as "amount_mismatch" |
| Stripe API down during session creation | Return generic error; Purchase stays "pending"; user can retry |
| User has no UserProgress record | Should not happen (created at registration). If missing, create in transaction. |
| Multiple pending purchases for same user | Allowed — each gets its own Stripe session. Only confirmed ones credit PA. |

---

## 6. External Integrations

### 6.1 Stripe SDK

- **Package**: `stripe` (npm) — latest stable v17+
- **License**: MIT
- **API version**: Pin to `2025-02-24.acacia` (or latest stable at implementation time)
- **SDK usage**: Server-side only (never expose secret key to client)

### 6.2 Stripe Checkout Session

- No Stripe.js or Elements on the client — user is redirected to Stripe's hosted page
- Supports: Visa, Mastercard, Amex, Elo, Hipercard (Brazilian cards)
- PIX: Requires Stripe account activated in Brazil. Add `pix` to `payment_method_types` when available. For MVP, start with `card` only.
- Stripe handles PCI compliance for card data — our server never sees card numbers

### 6.3 Failure Handling

| Failure | Strategy |
|---|---|
| Stripe API timeout | 10s timeout on SDK calls. Return error to user. Purchase stays "pending". |
| Webhook delivery failure | Stripe retries with exponential backoff for up to 3 days. Idempotent handler ensures safe retries. |
| Stripe SDK version mismatch | Pin API version in Stripe constructor. SDK handles backward compat. |
| Network partition during $transaction | Prisma $transaction rolls back. Webhook will retry. |

---

## 7. Security Considerations

### 7.1 Webhook Signature Verification

- **MANDATORY**: Every webhook request must be verified using `stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)`
- Raw body must be read as text, NOT parsed as JSON first (Stripe signature covers the raw bytes)
- If verification fails: return `400 Bad Request`, log the attempt

### 7.2 Secret Management

| Variable | Location | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Environment (server-only) | Stripe API secret key (sk_live_... / sk_test_...) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Environment (client-safe) | Stripe publishable key (pk_live_... / pk_test_...) — not needed for Checkout redirect flow, but useful if client needs to display Stripe branding |
| `STRIPE_WEBHOOK_SECRET` | Environment (server-only) | Webhook endpoint signing secret (whsec_...) |

**env.ts additions**:
```typescript
server: {
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
}
client: {
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
}
```

All Stripe env vars are optional so that local dev and CI continue to work without Stripe credentials. The factory (`getPaymentProvider()`) returns MockPaymentProvider when `STRIPE_SECRET_KEY` is not set.

### 7.3 BOLA Prevention

- `createCheckoutSessionAction`: userId from `auth()` session, never from client input
- Webhook handler: userId from Stripe metadata (set by server during session creation), not from any client header
- `session-status` endpoint: verify that the Purchase linked to the session belongs to the requesting user

### 7.4 Input Validation

- `packageId` validated against `PA_PACKAGES` (server-side whitelist)
- `session_id` in query params: validated as string, used only in Stripe API lookup (Stripe validates internally)
- Webhook payload: validated by Stripe signature. No further parsing until signature is verified.

### 7.5 PCI Compliance

- Stripe Checkout handles all card data. Our server never receives, stores, or transmits card numbers.
- No SAQ (Self-Assessment Questionnaire) required for Stripe Checkout redirect flow.
- Purchase records store only: package ID, amount, currency, Stripe session ID. No card data.

### 7.6 Rate Limiting

| Endpoint | Limit | Window |
|---|---|---|
| `createCheckoutSessionAction` | 5 | 1 hour |
| `POST /api/webhooks/stripe` | No rate limit (Stripe must always reach us) |
| `GET /api/checkout/session-status` | 30 | 1 minute (polling protection) |

---

## 8. Performance Requirements

### 8.1 Latency Targets

| Operation | Target | Notes |
|---|---|---|
| createCheckoutSession (server action) | < 2s | Includes Stripe API call (~500-1000ms) |
| Webhook processing | < 500ms | DB transaction only |
| Session status check | < 100ms | Single DB lookup |
| Client redirect to Stripe | < 200ms | Browser redirect |

### 8.2 Throughput

- Expected: < 100 purchases/day at MVP scale
- Stripe Checkout rate limit: 1000 sessions/hour (well within)
- No caching needed for purchase flow (each is unique)

### 8.3 Database Impact

- Purchase creation: single INSERT (index on userId)
- Webhook confirmation: 1 SELECT (idempotency) + 1 UPDATE + 1 UPDATE + 1 INSERT (in $transaction)
- No new indexes needed — existing Purchase indexes on `userId`, `status`, `paymentRef` (unique) are sufficient

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Test | Layer | Description |
|---|---|---|
| `stripe-provider.test.ts` | Service | Mock Stripe SDK, verify session creation params |
| `purchase.actions.test.ts` | Actions | Test createCheckoutSessionAction with mocked provider |
| `webhook-handler.test.ts` | API Route | Test event processing with crafted Stripe events |

**Stripe SDK mocking pattern**:
```typescript
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_xxx",
          url: "https://checkout.stripe.com/xxx",
        }),
        retrieve: vi.fn().mockResolvedValue({ ... }),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({ type: "checkout.session.completed", ... }),
    },
  })),
}));
```

### 9.2 Integration Tests

- Stripe test mode with `sk_test_` keys (manual, not CI)
- Stripe CLI for local webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Verify idempotency: send same webhook event twice, confirm PA credited only once
- Verify amount mismatch detection: tamper with metadata, confirm no credit

### 9.3 E2E Tests (Playwright)

- Full purchase flow using MockPaymentProvider (Stripe not available in CI)
- Verify success page shows correct PA amount after purchase
- Verify cancel URL returns user to purchase page with appropriate message

### 9.4 Performance Tests

- Not required at MVP scale (< 100 purchases/day)
- Monitor Stripe webhook latency via Stripe Dashboard

---

## 10. Implementation Notes for Developers

### 10.1 File Structure

```
src/
  server/
    services/
      payment/
        payment-provider.interface.ts  # EXISTING — no changes
        mock-provider.ts               # EXISTING — no changes
        stripe-provider.ts             # NEW
        index.ts                       # MODIFY — factory now checks STRIPE_SECRET_KEY
    actions/
      purchase.actions.ts              # MODIFY — add createCheckoutSessionAction
  app/
    api/
      webhooks/
        stripe/
          route.ts                     # NEW — webhook handler
      checkout/
        session-status/
          route.ts                     # NEW — session status for success page
  lib/
    env.ts                             # MODIFY — add Stripe env vars
```

### 10.2 Factory Update

```typescript
// src/server/services/payment/index.ts
export function getPaymentProvider(): PaymentProvider {
  if (process.env.STRIPE_SECRET_KEY) {
    return new StripePaymentProvider();
  }
  return new MockPaymentProvider();
}

// For Stripe-specific methods (createCheckoutSession):
export function getStripeProvider(): StripePaymentProvider | null {
  if (process.env.STRIPE_SECRET_KEY) {
    return new StripePaymentProvider();
  }
  return null;
}
```

### 10.3 Webhook Route — Raw Body

Next.js App Router API routes parse JSON by default. For Stripe webhooks, you MUST read the raw body:

```typescript
// src/app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const payload = await request.text();  // RAW text, not request.json()
  const sig = request.headers.get("stripe-signature");
  // ...
}
```

Do NOT add `export const config = { api: { bodyParser: false } }` — that is Pages Router syntax. App Router does not auto-parse; `request.text()` works directly.

### 10.4 Stripe Singleton

Do NOT create a new `Stripe` instance per request. Use a module-level singleton:

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});
```

The `stripe` npm package is safe for reuse across requests.

### 10.5 Success URL Locale

The success/cancel URLs must include the locale prefix. Use `NEXT_PUBLIC_APP_URL` as base. Default to `/pt/` for Brazilian users. The locale is NOT dynamic per user in this flow — all redirects go to `/pt/meu-atlas/comprar-pa`.

### 10.6 Patterns to AVOID

- **Do NOT** use Stripe Elements or Stripe.js on the client. Stripe Checkout redirect is the correct pattern for our use case.
- **Do NOT** store the Stripe customer ID on the User model for MVP. We are using one-time payments, not subscriptions.
- **Do NOT** create a Stripe Customer object. Guest checkout is sufficient for one-time payments.
- **Do NOT** call `confirmIntent()` from the server action. Stripe Checkout confirmation happens via webhook.
- **Do NOT** trust query params (`success=true`) as proof of payment. Always verify via webhook or session-status API.

### 10.7 Local Development

- Without `STRIPE_SECRET_KEY`: factory returns MockPaymentProvider, existing flow works unchanged
- With `STRIPE_SECRET_KEY` (test mode): real Stripe Checkout flow
- Stripe CLI for webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Stripe Dashboard (test mode) for session inspection

---

## 11. Open Questions

- [x] PIX support: deferred. Start with `card` only. Add PIX when Stripe Brazil account is activated.
- [ ] OQ-1: Should the existing `purchasePAAction` (2-step mock flow) be kept alongside the new Checkout flow, or replaced entirely? **Recommendation**: Replace. The mock flow can use the same Checkout pattern with MockPaymentProvider returning a fake URL.
- [ ] OQ-2: Success URL locale — should it detect user locale or always use `/pt/`? **Recommendation**: Use `/pt/` for MVP. Multi-locale success URLs add complexity for minimal gain.
- [ ] OQ-3: Should we store Stripe session ID in a separate column (stripeSessionId) or reuse paymentRef? **Recommendation**: Reuse `paymentRef` — it is already unique and semantically correct.

---

## 12. Definition of Done

- [ ] StripePaymentProvider implements PaymentProvider interface
- [ ] Factory returns StripePaymentProvider when STRIPE_SECRET_KEY is set
- [ ] createCheckoutSessionAction creates Stripe Checkout Session and returns URL
- [ ] Webhook handler verifies signature and credits PA atomically
- [ ] Idempotency: duplicate webhooks do not double-credit
- [ ] Amount verification: metadata mismatch blocks credit
- [ ] Rate limiting on checkout session creation (5/hr)
- [ ] env.ts updated with Stripe env vars (all optional)
- [ ] Success page polls session-status and shows confirmation
- [ ] Cancel URL returns user to purchase page
- [ ] Unit test coverage >= 80% on new code
- [ ] Integration test with Stripe CLI documented
- [ ] No card data stored or logged anywhere
- [ ] BOLA: userId always from server session or Stripe metadata
- [ ] ADR updated if interface is modified

> READY FOR DEVELOPMENT (blocked on OQ-1 disposition from tech-lead)
