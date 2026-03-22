# SPEC-ARCH-030: Payment Integration Architecture (Mock for MVP)

**Version**: 1.0.0
**Status**: Draft
**Author**: architect
**Reviewers**: tech-lead, security-specialist, finops-engineer
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**References**: SPEC-PROD-041, SPEC-SEC-006, ATLAS-GAMIFICACAO-APROVADO.md Section 2.3

---

## 1. Problem Statement

Atlas needs a payment system for PA packages. Sprint 36 implements mock payment to validate the flow architecture. Stripe integration follows in Sprint 37+.

---

## 2. System Design

### 2.1 Architecture Overview

```
Client (React)
  │
  ├── SelectPackage(packageId) ──→ Server Action: createPurchaseAction
  │                                    │
  │                                    ├── Validate packageId (server-side lookup)
  │                                    ├── Create Purchase record (status: pending)
  │                                    ├── Call PaymentProvider.createIntent()
  │                                    └── Return { intentId, clientToken }
  │
  ├── ConfirmPayment(intentId) ──→ Server Action: confirmPurchaseAction
  │                                    │
  │                                    ├── Call PaymentProvider.confirmIntent()
  │                                    ├── If SUCCESS:
  │                                    │   ├── $transaction:
  │                                    │   │   ├── Update Purchase status=completed
  │                                    │   │   ├── PointsEngine.earnPoints(userId, pa, "purchase")
  │                                    │   │   │   (increments availablePoints ONLY, NOT totalPoints)
  │                                    │   │   └── Create PointTransaction type=purchase
  │                                    │   └── Invalidate Redis cache
  │                                    └── Return { success, newBalance }
```

### 2.2 PaymentProvider Interface

```typescript
// src/server/services/payment/payment-provider.interface.ts

export interface PaymentIntent {
  intentId: string;
  clientToken: string;
  status: "pending" | "confirmed" | "failed";
}

export interface PaymentResult {
  status: "success" | "failed" | "pending";
  referenceId: string;
  failureReason?: string;
}

export interface PaymentProvider {
  createIntent(packageId: string, amountCents: number, currency: string): Promise<PaymentIntent>;
  confirmIntent(intentId: string): Promise<PaymentResult>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
```

### 2.3 Mock Payment Provider

```typescript
// src/server/services/payment/mock-provider.ts
import "server-only";

export class MockPaymentProvider implements PaymentProvider {
  // Creates intent with unique CUID2 id
  // Simulates 200-500ms latency
  // Auto-confirms on confirmIntent
  // Supports test packageIds:
  //   "test-fail" → always fails
  //   "test-timeout" → simulates timeout (5s delay)
  //   any other → succeeds
}
```

### 2.4 Provider Factory

```typescript
// src/server/services/payment/index.ts
export function getPaymentProvider(): PaymentProvider {
  const provider = env.PAYMENT_PROVIDER;
  switch (provider) {
    case "mock": return new MockPaymentProvider();
    case "stripe": throw new Error("Stripe not yet implemented — Sprint 37");
    default: throw new Error(`Unknown payment provider: ${provider}`);
  }
}
```

---

## 3. Data Model

### Purchase Model (new)

```prisma
model Purchase {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  packageId   String    // explorador, navegador, cartografo, embaixador
  paAmount    Int       // PA to credit
  amountCents Int       // price in BRL cents (e.g., 1490 for R$14.90)
  currency    String    @default("BRL")
  status      String    // pending, completed, refunded
  paymentRef  String?   @unique // external payment reference for idempotency
  refundedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}
```

### PA Packages Constant (server-side only)

```typescript
// src/lib/gamification/pa-packages.ts
import "server-only";

export const PA_PACKAGES = {
  explorador:  { id: "explorador",  name: "Explorador",  pa: 500,   amountCents: 1490,  currency: "BRL" },
  navegador:   { id: "navegador",   name: "Navegador",   pa: 1200,  amountCents: 2990,  currency: "BRL" },
  cartografo:  { id: "cartografo",  name: "Cartógrafo",  pa: 2800,  amountCents: 5990,  currency: "BRL" },
  embaixador:  { id: "embaixador",  name: "Embaixador",  pa: 6000,  amountCents: 11990, currency: "BRL" },
} as const;
```

**Security**: Prices resolved server-side only. Client receives only packageId list and display info via a read-only API.

---

## 4. PA Credit Logic

**CRITICAL**: PA purchased increments `availablePoints` but NOT `totalPoints`.

```typescript
// Inside confirmPurchaseAction, within $transaction:
await tx.userProgress.update({
  where: { userId },
  data: {
    availablePoints: { increment: pkg.pa },
    // totalPoints NOT incremented — per ATLAS-GAMIFICACAO-APROVADO.md
  },
});
```

This preserves rank integrity: ranks reflect engagement, not spending power.

---

## 5. Refund Logic

Per ATLAS-GAMIFICACAO-APROVADO.md:
- Refundable within 7 days if PA unspent
- Condition: `user.availablePoints >= purchase.paAmount`
- Refund decrements `availablePoints` by `paAmount`
- Creates `PointTransaction` type=`refund` with negative amount
- Updates `Purchase.status = "refunded"`, sets `refundedAt`
- Rate limit: 1 refund per user per 24 hours (SEC-036-026)

---

## 6. API Routes

### GET /api/packages
Public (authenticated). Returns package list for display.
```json
{
  "packages": [
    { "id": "explorador", "name": "Explorador", "pa": 500, "price": "R$ 14,90", "paPerReal": 33.6 },
    ...
  ]
}
```

### GET /api/purchases
Authenticated. Returns user's purchase history.
```json
{
  "purchases": [
    { "id": "...", "packageId": "explorador", "pa": 500, "amount": "R$ 14,90", "status": "completed", "createdAt": "..." }
  ]
}
```

### POST /api/webhooks/payment
Webhook endpoint for payment provider callbacks. Verifies HMAC signature. Idempotent credit.

---

## 7. Security Constraints

Per SPEC-SEC-006:
- SEC-036-006: Server-side price resolution only
- SEC-036-007: PA credit only via PointsEngine in $transaction
- SEC-036-008: Idempotent credit via unique paymentRef
- SEC-036-009: HMAC signature on webhooks
- SEC-036-012: Rate limit 5 purchases/hr

---

## 8. Testing Strategy

| Test | Count |
|---|---|
| MockPaymentProvider: create/confirm/fail/timeout | 6 |
| createPurchaseAction: validation, creation, PA credit | 8 |
| PA credit: availablePoints up, totalPoints unchanged | 3 |
| Refund: eligible, ineligible, rate limit | 4 |
| Idempotency: duplicate paymentRef | 2 |
| Package validation: invalid packageId rejected | 2 |
| **Total** | **~25** |

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — payment integration architecture |
