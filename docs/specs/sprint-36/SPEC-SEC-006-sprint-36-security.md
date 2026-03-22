# SPEC-SEC-006: Sprint 36 Security Review — Gamification Wave 2 + WizardFooter Global

**Version**: 1.0.0
**Status**: Draft
**Author**: security-specialist
**Reviewers**: tech-lead, architect
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**Baseline**: v0.30.0

---

## 1. Scope

This security specification covers all Sprint 36 features:

1. **WizardFooter Global Rollout + SaveDiscardDialog** (SPEC-PROD-039, SPEC-ARCH-028)
2. **Badge System UI** (SPEC-PROD-040, SPEC-ARCH-029)
3. **PA Package Purchase** (SPEC-PROD-041, SPEC-ARCH-030 — mock provider)
4. **Admin Dashboard** (SPEC-PROD-042, SPEC-ARCH-031)
5. **Cross-cutting**: LGPD, input validation, CSP, rate limiting

Builds on SPEC-SEC-005 (Sprint 34). Open items from SEC-S34 remain tracked.

---

## 2. Threat Model (STRIDE per Feature)

### 2.1 WizardFooter + SaveDiscardDialog

| STRIDE | Threat | Severity | Mitigation |
|--------|--------|----------|------------|
| Spoofing | N/A — dialog operates within authenticated session | -- | Existing auth middleware |
| Tampering | Client manipulates `isDirty` state to force save with stale data | LOW | Server-side timestamp validation; `updatedAt` optimistic concurrency check on save actions |
| Repudiation | User claims they did not discard data | LOW | No logging required — user-initiated client-side action |
| Info Disclosure | Form data in `computeFormHash()` serialized to JSON captured via DevTools | LOW | djb2 hash is one-way for practical purposes; hash MUST NOT be logged, sent to analytics, or persisted to localStorage/URL |
| DoS | Rapid save button clicks trigger N server actions | MEDIUM | Debounce on client (300ms); server action must be idempotent (upsert semantics) |
| Elevation | N/A — operates within existing trip ownership (BOLA) | -- | Existing BOLA checks in save actions |

**Key constraint**: The djb2 hash in `computeFormHash()` is NOT cryptographic and MUST NOT be used for any security purpose. It is solely a UI optimization for dirty-state comparison.

### 2.2 Badge System

| STRIDE | Threat | Severity | Mitigation |
|--------|--------|----------|------------|
| Spoofing | User impersonates another to trigger badge award | HIGH | All badge evaluation server-side only; `userId` from session, never from client |
| Tampering | User crafts API requests to call badge-award endpoint | HIGH | No public badge-award endpoint; `awardBadge()` is server-only |
| Tampering | User manipulates trip data to trigger badge criteria (fake trips) | MEDIUM | Badge criteria must validate meaningful trip completion, not just creation. See SEC-036-004 |
| Repudiation | User claims badge was not awarded | LOW | `UserBadge.earnedAt` timestamp + `PointTransaction` audit trail |
| Info Disclosure | Badge grid exposes other users' badge data | MEDIUM | Badge queries MUST include `userId` WHERE clause (BOLA) |
| DoS | Repeated actions to trigger badge evaluation loops | LOW | Badge evaluation is idempotent (unique constraint `[userId, badgeKey]`) |
| Elevation | User triggers admin-only badge override | HIGH | No admin badge override in Sprint 36 |

### 2.3 PA Package Purchase (Mock Provider)

| STRIDE | Threat | Severity | Mitigation |
|--------|--------|----------|------------|
| Spoofing | Attacker replays payment webhook to credit PA multiple times | CRITICAL | Idempotent credit via unique constraint on payment reference. SEC-036-008 |
| Tampering | Client sends manipulated price or PA amount | CRITICAL | Server-side price lookup from `PA_PACKAGES` constant; NEVER trust client. SEC-036-006 |
| Tampering | Mock payment provider callback is forged | HIGH | Even mock must use HMAC signature verification. SEC-036-009 |
| Repudiation | User disputes purchase | MEDIUM | Full audit trail: `PointTransaction` type=purchase. SEC-036-010 |
| Info Disclosure | Purchase history exposes payment details | HIGH | Atlas NEVER stores card numbers/CVV. SEC-036-011 |
| DoS | Automated purchase attempts to inflate PA | MEDIUM | Rate limit: 5 purchase attempts per user per hour. SEC-036-012 |
| Elevation | User modifies `availablePoints` directly | CRITICAL | Only via `PointsEngine.earnPoints()` inside `$transaction`. SEC-036-007 |

### 2.4 Admin Dashboard

| STRIDE | Threat | Severity | Mitigation |
|--------|--------|----------|------------|
| Spoofing | Non-admin accesses admin routes | CRITICAL | Defense in depth: middleware + page + API role check. SEC-036-013 |
| Tampering | Admin injects SQL/XSS via filter params | HIGH | Zod validation server-side; Prisma parameterized queries. SEC-036-018 |
| Repudiation | Admin performs action without audit | HIGH | All admin mutations logged. SEC-036-015 |
| Info Disclosure | Admin dashboard leaks PII beyond email | HIGH | Strict field allowlist. SEC-036-016 |
| Info Disclosure | Revenue figures cached in browser | MEDIUM | `Cache-Control: no-store`. SEC-036-017 |
| DoS | Expensive aggregate queries lock DB | MEDIUM | Rate limit 30 req/min; use COUNT/SUM aggregates. SEC-036-019 |
| Elevation | Admin session hijacking | CRITICAL | JWT mechanism; admin actions logged; re-auth for PA emission in Sprint 37. SEC-036-014 |

---

## 3. Security Requirements

### WizardFooter + SaveDiscardDialog

**SEC-036-001**: `computeFormHash()` output MUST NOT be logged, persisted to localStorage, included in URL parameters, sent to analytics, or included in error reports.

**SEC-036-002**: Save action MUST be idempotent. Use `updatedAt` optimistic concurrency or upsert semantics.

**SEC-036-003**: Dialog dismissal (discard) MUST clear all form state references from component state.

### Badge System

**SEC-036-004**: Badge evaluation criteria MUST validate meaningful user activity:
- `viajante_frequente` (3+ trips): trips must have `completedPhases >= 3`
- `zero_pendencias`: verify via server-side query, not client-reported count
- `detalhista`: verify `completionScore === 100` server-side

**SEC-036-005**: Badge award MUST remain server-side only. Module must import `"server-only"`.

### PA Package Purchase

**SEC-036-006**: PA package price and amount MUST be resolved server-side from `PA_PACKAGES` constant. Client sends ONLY `packageId`. Server NEVER reads price from client request.

**SEC-036-007**: `UserProgress.availablePoints` MUST only be incremented via `PointsEngine.earnPoints()` within a Prisma `$transaction`. No direct `db.userProgress.update()`.

**SEC-036-008**: PA credit after purchase MUST be idempotent. Unique constraint or check on payment reference ID.

**SEC-036-009**: Mock payment provider MUST implement webhook signature verification using HMAC-SHA256.

**SEC-036-010**: Every PA purchase MUST create `PointTransaction` with type=`purchase`, description with package name + payment ref, positive amount, server timestamp.

**SEC-036-011**: Atlas MUST NOT store any payment card data. Stored: `{ packageId, paymentReferenceId, amount_brl, pa_credited, timestamp }` only.

**SEC-036-012**: Purchase rate limit: **5 attempts per user per hour**. Key: `ratelimit:purchase:${userId}`.

### Admin Access Control

**SEC-036-013**: Admin access enforced at three layers:

| Layer | Implementation | Failure Mode |
|-------|---------------|--------------|
| Middleware | `/admin` in protected paths, verify `token.role === 'admin'` | 403 redirect to /expeditions |
| Page/Layout | `auth()` + verify `session.user.role === 'admin'` | Server redirect |
| Server Action | `assertAdmin(session)` as first line | 403 error |

**SEC-036-014**: Admin role stored in JWT via `jwt` callback. NEVER updatable via client request.

**SEC-036-015**: Admin mutations logged with: hashed adminId, action type, hashed targetUserId, amount, description, timestamp.

**SEC-036-016**: Admin user list exposes ONLY: id (last 6 chars), email, name, availablePoints, totalPoints, currentRank, badgeCount, tripCount, createdAt, lastLoginDate. MUST NOT expose: passwordHash, passport, nationalId, birthDate, phone, address, preferences, bio.

**SEC-036-017**: Revenue API responses: `Cache-Control: no-store, no-cache, must-revalidate`.

**SEC-036-018**: Admin filters validated via Zod server-side (page, pageSize, search, rankFilter, dateFrom, dateTo).

**SEC-036-019**: Admin aggregate queries rate-limited 30 req/min; use COUNT/SUM, not full scans.

### CSP and Dialogs

**SEC-036-020**: New dialogs MUST use Radix primitives (shadcn/ui), NOT inject inline `<script>`, NOT use `eval()`, work within existing CSP nonce policy.

### Input Validation

**SEC-036-021**: All new forms MUST have server-side Zod validation.

**SEC-036-022**: Admin PA emission requires mandatory description (min 10 chars).

---

## 4. Data Protection (LGPD)

**SEC-036-023**: PA balance and transaction history are personal data (LGPD Art. 5, I):

| Operation | Requirement |
|-----------|-------------|
| Data export (Art. 18, V) | Include balance, full transaction history, badge list with dates |
| Account deletion (Art. 18, VI) | Anonymize PointTransaction; delete UserProgress, UserBadge; retain anonymized Purchase for accounting |
| Data minimization (Art. 6, III) | Transaction descriptions must not contain other users' PII |
| Purpose limitation (Art. 6, I) | PA data for gamification only; not shared with third parties |

**SEC-036-024**: Mock purchase records must follow same schema as real ones for LGPD pipeline compatibility.

**SEC-036-025**: No new encrypted fields required. PA amounts are NOT PII requiring encryption.

**SEC-036-026**: Refund validation: only if `availablePoints >= pa_from_package`. Rate limit: 1 refund per user per 24h.

---

## 5. Auth & Authorization Matrix

| Route/Action | Auth | Role | BOLA | Rate Limit |
|-------------|------|------|------|------------|
| GET `/admin/*` | Yes | admin | N/A | 30/min |
| POST `adminEmitPAAction` | Yes | admin | N/A | 10/hr |
| GET badge grid (own) | Yes | any | userId=session | Standard |
| POST `purchasePAAction` | Yes | any | userId=session | 5/hr |
| POST `refundPAAction` | Yes | any | userId=session+owns | 1/24hr |
| POST save phase (Footer) | Yes | any | tripId.userId=session | Standard |
| GET transaction history | Yes | any | userId=session | Standard |
| GET admin revenue | Yes | admin | N/A | 30/min |

**SEC-036-027**: Add `role` field to User model:
```prisma
role String @default("user") @db.VarChar(20)
```

**SEC-036-028**: Admin users NOT creatable via registration. Registration MUST set `role: "user"` and reject `role` in request body.

---

## 6. Payment Security (Mock Architecture)

**SEC-036-029**: Server-mediated flow — client never touches payment details:
```
Client -> selectPackage(packageId) -> Server -> createIntent(pkg) -> MockProvider
Server <- { intentId, token } <- MockProvider
Client -> confirmPayment(intentId) -> Server -> confirm(intentId) -> MockProvider
Server: if SUCCESS -> creditPA(userId, pkg.pa, ref)
Client <- { success, newBalance }
```

**SEC-036-030**: Mock provider: separate module, implements PaymentProvider interface, simulates latency, generates unique refs, supports failure mode for testing.

**SEC-036-031**: PaymentProvider interface:
```typescript
interface PaymentProvider {
  createIntent(packageId: string, amount: number, currency: string): Promise<PaymentIntent>;
  confirmIntent(intentId: string): Promise<PaymentResult>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
```

**SEC-036-032**: Payment secrets: `PAYMENT_WEBHOOK_SECRET` in env vars, validated via `env.ts`. NEVER log payment intent IDs at INFO level.

---

## 7. Recommendations for Sprint 37

- REC-037-001: PCI-DSS scope assessment — use hosted payment form (SAQ A)
- REC-037-002: Webhook hardening — IP allowlisting, replay protection, idempotency keys
- REC-037-003: Daily reconciliation between PointTransaction and provider settlements
- REC-037-004: Refund policy enforcement via provider API
- REC-037-005: Admin re-authentication for PA emission; consider TOTP
- REC-037-006: Per-IP rate limiting + CAPTCHA on purchase flow

---

## 8. Open Findings from Previous Sprints

| ID | Severity | Sprint | Description | Status |
|---|---|---|---|---|
| SEC-S34-001 | HIGH | 34 | OAuth redirect URI validation | Open |
| SEC-S34-004 | HIGH | 34 | Phone field injection | Open |
| SEC-S34-007 | LOW | 34 | Apple relay email SPF/DKIM | Open |
| DT-004 | ALTO | Legacy | `updateTrip` mass assignment risk | Open |

---

## 9. PR Security Checklist

- [ ] All new server actions validate input with Zod before DB access
- [ ] All new queries include `userId` in WHERE (BOLA) unless admin-scoped
- [ ] No PII in log statements
- [ ] No `eval()`, `Function()`, or inline `<script>` in new components
- [ ] Admin routes check role at middleware, layout, AND action level
- [ ] PA credit/debit only via `PointsEngine` inside `$transaction`
- [ ] Purchase sends only `packageId` from client; price resolved server-side
- [ ] Mock webhook verifies HMAC signature
- [ ] New dialogs use Radix primitives; no CSP violations
- [ ] `Cache-Control: no-store` on admin API responses
- [ ] Badge evaluation verifies server-side data, not client values
- [ ] Admin PA emission requires description (min 10 chars)
- [ ] Registration sets `role: "user"`, rejects `role` in request body
- [ ] Rate limits applied per auth matrix

---

## 10. Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 13 |
| MEDIUM | 10 |
| LOW | 3 |
| **Total** | **32** |

CRITICAL items (SEC-036-006/007/008/013/027/028) must be addressed before any Sprint 36 code is merged.

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-22 | Criacao inicial — Sprint 36 security review |
