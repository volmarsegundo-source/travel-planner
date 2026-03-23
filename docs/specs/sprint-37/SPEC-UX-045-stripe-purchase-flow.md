# SPEC-UX-045: Stripe Purchase Flow — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: Sprint 37 — Gamification Wave 3
**Sprint**: 37
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Supersedes**: SPEC-UX-043 (mock payment flow)

---

## 1. Traveler Goal

Purchase additional Pontos Atlas (PA) through a secure, transparent Stripe-powered checkout — understanding exactly what they are buying, how much it costs, and what their new balance will be, with confidence that the payment is handled by a trusted provider.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Needs PA top-up for a spontaneous trip plan; values quick, frictionless purchase with clear balance preview |
| `@leisure-family` | May need bulk PA for multiple expedition AI features; wants to see "best value" clearly to make a family-budget decision |
| `@business-traveler` | Requires fast checkout with real receipt (Stripe provides invoice/receipt); values efficiency and expense documentation |
| `@bleisure` | Extends PA balance for both work and leisure; wants assurance that payment is secure via recognized provider |
| `@group-organizer` | Planning multiple trips consumes PA quickly; bulk package savings must be obvious at a glance |

## 3. User Flow

### 3.1 Happy Path — Purchase with Stripe

```
[User navigates to /meu-atlas/comprar-pa]
(Entry: header dropdown "Comprar PA" | insufficient balance modal | /como-funciona CTA)
    |
    v
[Purchase page loads]
[Current balance displayed: "Seu saldo: 320 PA"]
[4 package cards in grid]
    |
    v
[User selects a package card (e.g., Navegador — 1.200 PA / R$29,90)]
[Selected card: primary border + checkmark + subtle bg tint]
    |
    v
[Review panel appears below cards (inline, not modal)]
[Shows: package name, PA amount, price, current balance, projected balance]
[CTA: "Pagar com Stripe" (primary)]
    |
    v
[User clicks "Pagar com Stripe"]
    |
    v
[Loading overlay: "Redirecionando para pagamento seguro..." + spinner]
[All page interactions disabled. Stripe Checkout session created server-side.]
    |
    v
[Browser redirects to Stripe Checkout hosted page]
[User completes payment on Stripe (card details, PIX, etc.)]
    |
    v
[Stripe redirects to /meu-atlas/comprar-pa/sucesso?session_id=xxx]
    |
    v
[Success page loads — server verifies session]
[Confetti animation (1200ms) + new balance display]
[CTA: "Voltar ao Atlas"]
[Header PA badge updates with new balance]
```

### 3.2 Arriving from Insufficient Balance

```
[PAInsufficientModal on a phase page]
    |
    v
[User clicks "Comprar PA"]
    |
    v
[Navigate to /meu-atlas/comprar-pa?needed=50]
    |
    v
[Page loads with contextual banner at top]
"Voce precisa de pelo menos 50 PA para gerar o guia do destino."
[Info blue banner: #EFF6FF bg, #3B82F6 left border]
    |
    v
[Package cards: cards with fewer PA than needed show "Insuficiente para esta acao" in muted text]
[Sufficient packages have normal presentation]
```

### 3.3 Payment Cancelled by User

```
[User is on Stripe Checkout page]
    |
    v
[User clicks "Back" or closes the Stripe tab]
    |
    v
[Stripe redirects to /meu-atlas/comprar-pa/cancelado]
    |
    v
[Cancel page loads]
[Friendly message: "Compra nao finalizada"]
[Body: "Nenhuma cobranca foi realizada. Voce pode tentar novamente quando quiser."]
[CTA: "Tentar novamente" (primary, navigates to /meu-atlas/comprar-pa)]
[Secondary: "Voltar ao Atlas" (ghost, navigates to /atlas)]
```

### 3.4 Payment Failed (Stripe-side)

```
[User enters invalid card / payment declined on Stripe]
    |
    v
[Stripe handles error messaging on their hosted page]
[User may retry on Stripe or cancel]
    |
    v
[If user cancels after failure: same cancel flow as 3.3]
```

### 3.5 Webhook Confirmation Delayed

```
[User completes payment on Stripe, redirected to success page]
    |
    v
[Server checks session status — payment "processing" (not yet confirmed)]
    |
    v
[Success page shows pending state]
"Seu pagamento esta sendo processado. Os PA serao adicionados em instantes."
[Spinner + polling every 3 seconds (max 30s)]
    |
    v
[Webhook confirms payment OR poll succeeds]
    |
    v
[Success page transitions to confirmed state with confetti]
    |
    -- OR (timeout) --
    |
    v
[After 30s: "Seu pagamento foi recebido e sera processado em breve. Os PA aparecerao no seu saldo em ate 5 minutos."]
[CTA: "Voltar ao Atlas"]
[No confetti on timeout state — reassuring, not celebratory]
```

### Error States

- **Page load failure (packages)**: Full-page error: "Nao foi possivel carregar os pacotes. Verifique sua conexao e tente novamente." with retry button. Balance section shows "Saldo indisponivel" in muted text.
- **Stripe session creation failure**: Inline error below CTA: "Nao foi possivel iniciar o pagamento. Tente novamente em alguns instantes." CTA re-enabled.
- **Stripe redirect timeout (>10s)**: Loading overlay shows additional text: "Isso esta demorando mais que o esperado. Aguarde..." If >20s: "Houve um problema. Tente novamente." with retry button, overlay dismissible.
- **Success page — invalid session**: If session_id is invalid or tampered: "Nao encontramos esta compra. Se voce completou um pagamento, seu saldo sera atualizado em ate 5 minutos." with link to /atlas.
- **Balance fetch failure on purchase page**: Packages still shown. Balance replaced with "Saldo indisponivel" (muted). Review panel shows "Saldo apos: indisponivel" instead of number.

### Edge Cases

- **User navigates back from Stripe**: Browser back from Stripe Checkout returns to /meu-atlas/comprar-pa with previous selection cleared. No stale state.
- **Double purchase prevention**: After successful redirect, the session_id is single-use. Refreshing the success page re-validates — if already processed, shows the same success (idempotent).
- **User already has high balance**: No restrictions. All packages available. No "you don't need this" messaging.
- **Multiple tabs**: If user opens purchase page in two tabs and completes in one, the other tab's review panel has stale balance. On clicking "Pagar com Stripe", server creates session with fresh balance. Success page always shows real-time balance.
- **Currency locale**: R$ follows PT-BR formatting (R$29,90 with comma). EN locale shows same R$ (not converted). Stripe Checkout displays in user's browser language.

---

## 4. Screen Descriptions

### Screen 1: Purchase Page (/meu-atlas/comprar-pa)

**Purpose**: Present PA packages with transparent pricing, value comparison, and a clear path to Stripe checkout.

**Layout (top to bottom)**:
1. Page title: "Comprar Pontos Atlas" (24px, bold, #1A202C)
2. Stripe trust badge row: lock icon + "Pagamento seguro via Stripe" (14px, #5C6B7A) + Stripe wordmark (small, muted)
3. Current balance card (compact)
4. Contextual banner (conditional, when ?needed=X)
5. Package cards grid (4 cards)
6. Review panel (appears after selection)
7. Purchase history section
8. Refund info footer

**Content — Stripe Trust Badge Row**:
- Positioned directly below the page title
- Lock icon (16px) + text "Pagamento seguro via Stripe" in a single line
- Stripe wordmark in muted gray (#94A3B8), not the branded purple — keeps visual hierarchy on our content
- Purpose: immediate trust signal that payment is handled by a recognized provider, reducing anxiety before the user even sees packages

**Content — Current Balance Card**:
- Same design as SPEC-UX-043: compact card, bg #FFFBEB, border #FDE68A
- Left: PA coin icon (24px)
- Center: "Seu saldo atual" (12px, #5C6B7A) + "320 PA" (32px, bold, #92400E)
- Right: Link "Ver historico" -> /atlas#historico (14px, #E8621A)

**Content — Package Cards**:

| Package | PA | Price (BRL) | PA/R$ | Highlight | Economy |
|---|---|---|---|---|---|
| Explorador | 500 | R$14,90 | 33,6 PA/R$ | -- | -- |
| Navegador | 1.200 | R$29,90 | 40,1 PA/R$ | "Mais popular" | 20% mais PA/R$ |
| Cartografo | 2.800 | R$59,90 | 46,7 PA/R$ | -- | 39% mais PA/R$ |
| Embaixador | 6.000 | R$119,90 | 50,0 PA/R$ | "Melhor custo-beneficio" | 49% mais PA/R$ |

Economy % calculated relative to Explorador base rate (33.6 PA/R$).

**Package Card Design** (unchanged from SPEC-UX-043):
- Width: flexible, min 200px, max 280px
- Border: 1px solid #E2E8F0, border-radius 16px, padding 24px
- Top: package name (16px, bold) + highlight badge pill (if applicable)
  - "Mais popular": bg #3B82F6, white text
  - "Melhor custo-beneficio": bg #10B981, white text
- Center: PA amount (36px, bold) + PA icon, price (20px, #5C6B7A)
- Bottom: PA/R$ ratio (12px, #94A3B8), economy badge (12px, bold, #10B981)
- States:
  - Default: white bg, subtle border
  - Hover: shadow-md, border #CBD5E1
  - Selected: border 2px solid #E8621A, bg #FFF7ED, checkmark top-left
  - Focus: 2px solid #E8621A outline, offset 2px
  - Insufficient context (?needed): muted opacity 0.6, "Insuficiente para esta acao" text

**Content — Review Panel** (NEW — replaces modal confirmation from SPEC-UX-043):
- Appears with slide-down animation (200ms ease-out) after package selection
- Card style: bg #F7F9FC, border 1px solid #E2E8F0, border-radius 12px, padding 20px
- Content (left side):
  - "Resumo da compra" (16px, bold, #1A202C)
  - Package name + PA amount (14px)
  - Price: "R$29,90" (14px, bold)
  - Divider
  - "Saldo atual: 320 PA" (14px, #5C6B7A)
  - "Saldo apos compra: 1.520 PA" (14px, bold, #10B981)
- Content (right side / below on mobile):
  - CTA: "Pagar com Stripe" (primary, #E8621A, white text, 48px height)
  - Below CTA: lock icon + "Voce sera redirecionado para o checkout seguro Stripe" (12px, #94A3B8)
  - Accepted payment methods: small icons for Visa, Mastercard, PIX, Boleto (muted, 24px each)
- Disabled until package selected. Animates in when package chosen, animates out when deselected.

**Content — Purchase History Section**:
- Same as SPEC-UX-043: title, list of past purchases (date, package, PA, price), empty state, max 10 items

**Content — Refund Info**:
- Same as SPEC-UX-043: 12px muted footer text, non-refundable policy, support link

**Loading State**:
- Balance card: skeleton pulse
- Package cards: 4 skeleton cards
- History: 3 skeleton list items

**Error State**: See Error States in section 3.

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Balance card full-width. Package cards: 1 column stacked, full-width, 12px gap. Review panel full-width below cards. CTA full-width. Trust badge row wraps to 2 lines if needed. Payment icons below CTA. History full-width. |
| Tablet (768-1024px) | Balance card full-width. Package cards: 2x2 grid. Review panel: 2-column (summary left, CTA right). |
| Desktop (> 1024px) | All content max-width 1200px centered. Package cards: 4 in a row. Review panel: 2-column (summary left, CTA right). |

---

### Screen 2: Stripe Redirect Loading Overlay

**Purpose**: Reassure the user during the server-side Stripe session creation and browser redirect.

**Layout**:
- Semi-transparent overlay: rgba(0, 0, 0, 0.5) covering the full viewport
- Centered card: max-width 360px, bg white, border-radius 12px, padding 32px
- Content:
  - Spinner (32px, #E8621A, rotating)
  - Text: "Redirecionando para pagamento seguro..." (16px, #1A202C)
  - Lock icon + "Stripe" below spinner (12px, #94A3B8)
- No close button, no Escape — the redirect is in progress
- If redirect takes >10s: additional text appears below: "Isso esta demorando mais que o esperado. Aguarde..."
- If redirect takes >20s: overlay becomes dismissible with "Cancelar" button + error text

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Card: full-width with 16px margin |
| Tablet+ | Card: centered, max-width 360px |

---

### Screen 3: Success Page (/meu-atlas/comprar-pa/sucesso)

**Purpose**: Confirm the purchase was successful, show the new balance, and celebrate the moment.

**Layout**:
- Dedicated page (not modal — user has been redirected away and back)
- Centered content, max-width 480px
- Content (top to bottom):
  1. Confetti animation: gold + orange particles, 1200ms, canvas overlay (`aria-hidden="true"`)
  2. Large checkmark icon: 64px, #10B981, scale-in animation (300ms ease-out)
  3. Title: "Compra realizada com sucesso!" (24px, bold, #1A202C)
  4. Package info: "1.200 PA adicionados ao seu saldo" (16px, #5C6B7A)
  5. New balance card: bg #FFFBEB, "Novo saldo" (12px) + "1.520 PA" (36px, bold, #92400E)
  6. CTA: "Voltar ao Atlas" (primary, #E8621A, 48px height, min-width 200px)
  7. Secondary: "Comprar mais" (ghost, 44px height)
  8. Receipt note: "Um recibo foi enviado para seu email por Stripe." (12px, #94A3B8)

**Pending State** (webhook not yet confirmed):
- Replace checkmark with spinner (32px, #E8621A)
- Title: "Processando seu pagamento..." (24px, bold, #1A202C)
- Body: "Isso pode levar alguns segundos." (16px, #5C6B7A)
- Progress dots animation (3 dots pulsing)
- No CTA buttons visible during pending
- Polls every 3 seconds (max 30s)

**Timeout State** (after 30s without confirmation):
- Replace spinner with clock icon (48px, #F59E0B)
- Title: "Pagamento recebido" (24px, bold, #1A202C)
- Body: "Seu pagamento foi recebido e esta sendo processado. Os Pontos Atlas aparecerao no seu saldo em ate 5 minutos." (16px, #5C6B7A)
- CTA: "Voltar ao Atlas" (primary)
- No confetti on timeout (reassuring, not celebratory)

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Full-width with 16px padding. CTAs stacked, full-width. |
| Tablet+ | Centered, max-width 480px. CTAs inline. |

---

### Screen 4: Cancel Page (/meu-atlas/comprar-pa/cancelado)

**Purpose**: Acknowledge the user chose not to complete payment, reassure no charge was made, and offer a clear path forward.

**Layout**:
- Centered content, max-width 480px
- Content:
  1. Icon: circle with X, 48px, #94A3B8 (neutral, not red — cancellation is a choice, not an error)
  2. Title: "Compra nao finalizada" (24px, bold, #1A202C)
  3. Body: "Nenhuma cobranca foi realizada. Voce pode tentar novamente quando quiser." (16px, #5C6B7A)
  4. CTA: "Tentar novamente" (primary, navigates to /meu-atlas/comprar-pa)
  5. Secondary: "Voltar ao Atlas" (ghost, navigates to /atlas)

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Full-width with 16px padding. CTAs stacked, full-width. |
| Tablet+ | Centered, max-width 480px. CTAs inline. |

---

## 5. Interaction Patterns

- **Package selection**: Single-select radio group behavior. Selecting a new card deselects the previous. Selection clear: border + background + checkmark.
- **Review panel entrance**: Slide-down + fade-in (200ms ease-out) when package selected. Slide-up + fade-out (150ms) when deselected. Reduced motion: instant show/hide.
- **Stripe redirect overlay entrance**: Overlay fade-in 200ms. Reduced motion: instant.
- **Success confetti**: Canvas overlay, gold + orange particles, 1200ms. Reduced motion: static gold glow ring around checkmark (200ms).
- **Success checkmark**: Scale from 0 to 1.0 (300ms ease-out) with slight overshoot. Reduced motion: instant appear.
- **Balance update in header**: After success page loads and confirms, header PA badge updates. Counter animation (400ms). Reduced motion: instant.
- **Toast on success**: "+1.200 PA adicionados!" with PA icon, auto-dismiss 4s, standard toast position (top-right).
- **Pending state polling**: Visual dots animation to show activity. No user-visible loading bar (avoid anxiety over progress).
- **Scroll to review panel**: On mobile, after selecting a package, auto-scroll to bring review panel into view.
- **Contextual banner dismissal**: X button dismiss, session-only persistence (reappears on reload from insufficient modal).

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA (minimum, non-negotiable)

### Keyboard Navigation
- [x] Package cards: `role="radiogroup"` with each card as `role="radio"` + `aria-checked`
- [x] Tab order: trust badge -> balance card -> package cards (L-R) -> review panel CTA -> history section
- [x] Enter/Space on package card: selects it
- [x] Arrow keys within radiogroup: navigate between cards
- [x] Review panel CTA: standard button focus
- [x] Stripe redirect overlay: not dismissible by keyboard (redirect in progress) until timeout
- [x] Success page: focus moves to "Voltar ao Atlas" button on page load
- [x] Cancel page: focus moves to "Tentar novamente" button on page load
- [x] Focus indicator: 2px solid #E8621A, outline-offset 2px on all interactive elements

### Screen Reader
- [x] Page title: `<h1>` "Comprar Pontos Atlas"
- [x] Trust badge: `aria-label="Pagamento seguro processado via Stripe"`
- [x] Balance card: `aria-label="Seu saldo atual: 320 Pontos Atlas"`
- [x] Package cards: `aria-label="Pacote [name]: [PA] Pontos Atlas por [price]. [Economy/highlight if applicable]"`
- [x] Selected package: `aria-checked="true"`, live announcement "Pacote [name] selecionado"
- [x] Review panel: `aria-live="polite"` container, announced when it appears
- [x] CTA: dynamic `aria-label="Pagar [PA] Pontos Atlas por [price] via Stripe"`
- [x] Redirect overlay: `role="alert"`, `aria-live="assertive"` for "Redirecionando para pagamento seguro"
- [x] Success page: `aria-live="assertive"` for purchase confirmation announcement
- [x] Pending state: `aria-live="polite"` for "Processando seu pagamento"
- [x] Cancel page: `<h1>` "Compra nao finalizada", clear page structure
- [x] Payment method icons: `aria-hidden="true"` (decorative, supplementary to text)
- [x] Confetti: `aria-hidden="true"`

### Color & Contrast
- [x] Package name (#1A202C on white): 16:1 (passes AAA)
- [x] Price text (#5C6B7A on white): 5.2:1 (passes AA)
- [x] "Mais popular" (white on #3B82F6): 4.6:1 (passes AA)
- [x] "Melhor custo-beneficio" (white on #10B981): 3.4:1 — bold 14px+ text (passes large text AA)
- [x] Review panel "Saldo apos" (#10B981 on #F7F9FC): 3.2:1 — supplemented by bold weight + is not sole information source
- [x] Selected state: border + background + checkmark, not color alone
- [x] Cancel page icon: neutral gray, not color-coded as error

### Motion
- [x] Review panel entrance/exit: respects `prefers-reduced-motion`
- [x] Confetti: disabled under reduced motion, replaced by static glow
- [x] Checkmark scale: instant under reduced motion
- [x] Balance counter: instant under reduced motion
- [x] Redirect overlay: instant under reduced motion

### Touch
- [x] Package cards: entire card is touch target (min 200x160px — exceeds 44px)
- [x] CTA button: 48px height, full-width on mobile
- [x] Review panel CTA: 48px height
- [x] Payment method icons: not interactive (decorative)
- [x] Card spacing: min 12px gap
- [x] Success/Cancel page CTAs: 48px height primary, 44px height secondary

---

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `purchase.title` | Comprar Pontos Atlas | Buy Atlas Points |
| `purchase.trustBadge` | Pagamento seguro via Stripe | Secure payment via Stripe |
| `purchase.balance` | Seu saldo atual | Your current balance |
| `purchase.viewHistory` | Ver historico | View history |
| `purchase.review.title` | Resumo da compra | Purchase summary |
| `purchase.review.balanceAfter` | Saldo apos compra: {balance} PA | Balance after purchase: {balance} PA |
| `purchase.review.cta` | Pagar com Stripe | Pay with Stripe |
| `purchase.review.redirect` | Voce sera redirecionado para o checkout seguro Stripe | You'll be redirected to Stripe secure checkout |
| `purchase.redirect.loading` | Redirecionando para pagamento seguro... | Redirecting to secure payment... |
| `purchase.redirect.slow` | Isso esta demorando mais que o esperado. Aguarde... | This is taking longer than expected. Please wait... |
| `purchase.success.title` | Compra realizada com sucesso! | Purchase completed successfully! |
| `purchase.success.body` | {pa} PA adicionados ao seu saldo | {pa} PA added to your balance |
| `purchase.success.newBalance` | Novo saldo | New balance |
| `purchase.success.back` | Voltar ao Atlas | Back to Atlas |
| `purchase.success.buyMore` | Comprar mais | Buy more |
| `purchase.success.receipt` | Um recibo foi enviado para seu email por Stripe. | A receipt was sent to your email by Stripe. |
| `purchase.pending.title` | Processando seu pagamento... | Processing your payment... |
| `purchase.pending.body` | Isso pode levar alguns segundos. | This may take a few seconds. |
| `purchase.timeout.title` | Pagamento recebido | Payment received |
| `purchase.timeout.body` | Seu pagamento foi recebido e esta sendo processado. Os Pontos Atlas aparecerao no seu saldo em ate 5 minutos. | Your payment was received and is being processed. Atlas Points will appear in your balance within 5 minutes. |
| `purchase.cancel.title` | Compra nao finalizada | Purchase not completed |
| `purchase.cancel.body` | Nenhuma cobranca foi realizada. Voce pode tentar novamente quando quiser. | No charge was made. You can try again whenever you like. |
| `purchase.cancel.retry` | Tentar novamente | Try again |
| `purchase.cancel.back` | Voltar ao Atlas | Back to Atlas |
| `purchase.toast` | +{pa} PA adicionados! | +{pa} PA added! |
| `purchase.needed.banner` | Voce precisa de pelo menos {amount} PA para {action}. | You need at least {amount} PA for {action}. |
| `purchase.insufficient` | Insuficiente para esta acao | Insufficient for this action |
| `purchase.economy` | {percent}% mais PA/R$ | {percent}% more PA/R$ |
| `purchase.ratio` | {ratio} PA por real | {ratio} PA per real |
| `purchase.badge.popular` | Mais popular | Most popular |
| `purchase.badge.bestValue` | Melhor custo-beneficio | Best value |
| `purchase.package.explorer` | Explorador | Explorer |
| `purchase.package.navigator` | Navegador | Navigator |
| `purchase.package.cartographer` | Cartografo | Cartographer |
| `purchase.package.ambassador` | Embaixador | Ambassador |
| `purchase.history.title` | Historico de compras | Purchase history |
| `purchase.history.empty` | Nenhuma compra realizada ainda. | No purchases yet. |
| `purchase.refund` | Pontos Atlas adquiridos nao sao reembolsaveis. Em caso de problemas com sua compra, entre em contato pelo suporte. | Purchased Atlas Points are non-refundable. For issues with your purchase, contact support. |
| `purchase.invalidSession` | Nao encontramos esta compra. Se voce completou um pagamento, seu saldo sera atualizado em ate 5 minutos. | We couldn't find this purchase. If you completed a payment, your balance will be updated within 5 minutes. |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Stripe session creation failure | Nao foi possivel iniciar o pagamento. Tente novamente em alguns instantes. | Could not initiate payment. Please try again in a moment. |
| Network error (page load) | Nao foi possivel carregar os pacotes. Verifique sua conexao e tente novamente. | Could not load packages. Check your connection and try again. |
| Balance fetch failure | Saldo indisponivel | Balance unavailable |
| Redirect timeout (>20s) | Houve um problema ao redirecionar. Tente novamente. | There was a problem redirecting. Please try again. |
| Invalid session on success page | Nao encontramos esta compra. Se voce completou um pagamento, seu saldo sera atualizado em ate 5 minutos. | We couldn't find this purchase. If you completed a payment, your balance will be updated within 5 minutes. |

### Tone of Voice
- Transparent and trustworthy. Stripe is a recognized name — leverage it for trust, not hide it.
- No urgency manipulation. No "limited time" pricing. No scarcity signals.
- Economy percentages are real calculations relative to the base package rate.
- Payment cancellation is treated as a neutral choice, never a failure. "Compra nao finalizada" — factual, not judgmental.
- Pending state is reassuring: "Isso pode levar alguns segundos" — calm, not anxious.
- Refund policy visible upfront, not buried in fine print.
- Receipt mention on success page builds confidence for business travelers.

---

## 8. Constraints

- **Stripe Checkout (hosted)**: The user is redirected to Stripe's hosted checkout page. We do NOT embed Stripe Elements on our page in v1. This reduces PCI scope and implementation complexity.
- **Currency**: BRL (R$) only. No multi-currency in v1.
- **Payment methods**: Defined by Stripe account configuration. Expected: credit/debit card, PIX, boleto. The UI shows generic payment method icons but Stripe controls what is actually available.
- **PA non-refundable**: Business rule. Stripe refunds are admin-only operations, not user-facing.
- **Authentication required**: Route is under (app) group, requires login.
- **Webhook dependency**: Stripe webhook (checkout.session.completed) is the authoritative payment confirmation. The success page polls/verifies but does not trust the redirect alone.
- **Package prices from config**: Prices and PA amounts must come from server configuration (not hardcoded in UI), as specified in SPEC-UX-043.
- **Header PA badge**: Must update client-side after confirmed purchase (refetch or state update).
- **Stripe session single-use**: Each "Pagar com Stripe" click creates a new Stripe Checkout session. No session reuse.
- **Success/Cancel URLs**: Configured server-side when creating the Stripe session. Success: `/meu-atlas/comprar-pa/sucesso?session_id={CHECKOUT_SESSION_ID}`. Cancel: `/meu-atlas/comprar-pa/cancelado`.

---

## 9. Prototype

- [ ] Prototype required: Yes (after spec approval)
- **Location**: `docs/prototypes/stripe-purchase-flow.html`
- **Scope**: Purchase page with review panel, redirect overlay, success page (confirmed + pending + timeout), cancel page
- **Notes**: Stripe Checkout itself is not prototyped (external hosted page). Prototype covers all states on our pages.

---

## 10. Open Questions

- [ ] **Payment methods display**: Should we show specific payment method icons (Visa, Mastercard, PIX, Boleto) or a generic "Cartao de credito e outros" text? Stripe account configuration determines actual availability. **Awaits: product-owner + architect**
- [ ] **Email receipt**: Stripe can send automatic email receipts. Should this be enabled, or do we send our own branded receipt email? **Awaits: product-owner**
- [ ] **Webhook retry handling**: If the webhook fails and the user refreshes the success page, how long should we poll before showing the timeout state? Current spec says 30s. **Awaits: architect**
- [ ] **PIX/Boleto async payments**: PIX and Boleto are async (not instant). If Stripe offers these, the success page pending state must handle longer waits. Should we support these payment methods in v1? **Awaits: product-owner + architect**
- [ ] **Promotional pricing / coupons**: Will Stripe Coupons be used for promotional pricing? If so, the review panel and package cards need "was/now" price display. **Awaits: product-owner**
- [ ] **Purchase limits**: Is there a max purchases per day or max PA balance? **Awaits: product-owner**

---

## 11. Acceptance Criteria

- [ ] **AC-01**: The purchase page at /meu-atlas/comprar-pa displays a Stripe trust badge ("Pagamento seguro via Stripe") below the page title.
- [ ] **AC-02**: The user's current PA balance is displayed at the top of the purchase page.
- [ ] **AC-03**: 4 package cards are displayed with PA amount, price in R$, PA/R$ ratio, and economy percentage (where applicable). "Navegador" shows "Mais popular" badge, "Embaixador" shows "Melhor custo-beneficio" badge.
- [ ] **AC-04**: Selecting a package card highlights it (primary border + checkmark + background tint). Only one package selectable at a time (radio behavior). Package cards are keyboard-navigable with arrow keys and use `role="radiogroup"`/`role="radio"`.
- [ ] **AC-05**: After selecting a package, a review panel slides in showing package summary, price, current balance, and projected balance after purchase.
- [ ] **AC-06**: The review panel contains a "Pagar com Stripe" CTA button (48px height) with accepted payment method icons and a redirect notice below it.
- [ ] **AC-07**: Clicking "Pagar com Stripe" shows a loading overlay ("Redirecionando para pagamento seguro...") and redirects the browser to Stripe Checkout.
- [ ] **AC-08**: On successful payment, the user is redirected to /meu-atlas/comprar-pa/sucesso which displays a confetti animation, the new PA balance, a "Voltar ao Atlas" CTA, and a "Comprar mais" secondary action.
- [ ] **AC-09**: If the Stripe webhook has not yet confirmed payment when the success page loads, a pending state with spinner and polling (every 3s, max 30s) is shown before transitioning to the confirmed state.
- [ ] **AC-10**: If polling times out after 30 seconds, a reassuring timeout message is shown with "Voltar ao Atlas" CTA and no confetti.
- [ ] **AC-11**: On payment cancellation, the user is redirected to /meu-atlas/comprar-pa/cancelado which shows a neutral message ("Nenhuma cobranca foi realizada"), a "Tentar novamente" CTA, and a "Voltar ao Atlas" secondary link.
- [ ] **AC-12**: When arriving from an insufficient balance modal (?needed=X), a contextual info banner explains the minimum PA needed, and cards providing fewer PA than needed show "Insuficiente para esta acao".
- [ ] **AC-13**: On confirmed purchase, the header PA badge updates to reflect the new balance and a toast "+X PA adicionados!" appears (auto-dismiss 4s).
- [ ] **AC-14**: All animations (confetti, review panel, checkmark) respect `prefers-reduced-motion` with instant alternatives.
- [ ] **AC-15**: The cancel page icon is neutral gray (not red) — cancellation is treated as a user choice, not an error.
- [ ] **AC-16**: On mobile (< 768px), package cards stack in a single column, review panel is full-width, and CTAs are full-width.

---

## 12. Patterns Used

| Pattern | Source | Usage |
|---|---|---|
| **PackageCard** | SPEC-UX-043 | Package selection cards (unchanged design) |
| **ContextualNeedBanner** | SPEC-UX-043 | ?needed=X contextual banner |
| **Toast** | ux-patterns.md | Purchase success feedback |
| **TransactionList** | SPEC-UX-GAMIFICATION 4.4 | Purchase history section |
| **CelebrationToast** | SPEC-UX-GAMIFICATION 4.8 | Confetti on success page |

### New Patterns Introduced

| Pattern | Description | Reusable? |
|---|---|---|
| **InlineReviewPanel** | Slide-in summary panel with transaction preview and CTA. Replaces confirmation modal for flows that redirect externally. | Yes — any external checkout flow |
| **StripeRedirectOverlay** | Full-viewport overlay with spinner and progressive messaging during external payment redirect. | Yes — any external redirect with loading state |
| **PaymentResultPage** | Centered result page with icon, title, body, CTA — 3 variants (success, pending, cancel). | Yes — any post-payment landing |

---

> **Spec Status**: Draft
> **Ready for**: Architect (6 open questions need resolution; PIX/Boleto support is the critical UX-impacting decision)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-23 | ux-designer | Initial draft — Stripe Checkout integration replacing mock payment from SPEC-UX-043 |
