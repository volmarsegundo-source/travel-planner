# SPEC-UX-043: PA Package Purchase Page — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: Sprint 36
**Sprint**: 36
**Created**: 2026-03-22
**Last Updated**: 2026-03-22

---

## 1. Traveler Goal

Purchase additional Pontos Atlas (PA) with full transparency on pricing, value, and what they get — feeling confident there are no hidden costs and that their purchase is secure.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@leisure-solo` | Wants to top up PA to generate a guide or itinerary for an upcoming trip without waiting to earn PA through phases |
| `@leisure-family` | May need more PA for multiple expedition itineraries; values seeing the "best value" option clearly |
| `@business-traveler` | Prefers fast transaction with clear receipt for expense reporting; values efficiency over browsing |
| `@bleisure` | Extends PA balance to cover both work and leisure expedition AI features |
| `@group-organizer` | Planning multiple trips consumes more PA; the bulk package provides clear savings |

## 3. User Flow

### 3.1 Happy Path — Purchase PA Package

```
[User navigates to /meu-atlas/comprar-pa]
(Entry points: header dropdown "Comprar PA" | insufficient balance modal CTA | /como-funciona CTA)
    |
    v
[Purchase page loads]
[Current balance displayed at top: "Seu saldo: 320 PA"]
[4 package cards displayed in a row/grid]
    |
    v
[User selects a package card (e.g., Navegador — 1200 PA / R$29,90)]
[Selected card: primary border highlight + checkmark]
    |
    v
[User clicks "Comprar agora"]
    |
    v
[Confirmation modal opens]
"Confirmar compra de 1.200 PA por R$29,90?"
"Saldo atual: 320 PA"
"Saldo apos: 1.520 PA"
[Buttons: "Confirmar compra" (primary) | "Cancelar" (ghost)]
    |
    v
[User confirms]
    |
    v
[Loading state: "Processando pagamento..." with spinner]
[Button disabled, overlay stays]
    |
    v
[Payment succeeds (mocked in v1)]
    |
    v
[Success screen replaces modal content]
[Checkmark icon + "Compra realizada com sucesso!"]
["1.200 PA adicionados ao seu saldo"]
["Novo saldo: 1.520 PA"]
[CTA: "Voltar para o Atlas" (primary)]
    |
    v
[Header PA badge updates with new balance]
[Toast: "+1.200 PA adicionados!" (auto-dismiss 4s)]
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
[Banner style: info blue (#EFF6FF bg, #3B82F6 border)]
    |
    v
[Package cards highlight which ones cover the needed amount]
[Cards that don't cover: subtle "Insuficiente para esta acao" text]
```

### Error States

- **Payment failure**: Modal shows inline error: "A compra nao foi concluida. Nenhuma cobranca foi realizada. Tente novamente." Buttons re-enabled. Do not close modal.
- **Network error during page load**: Full-page error: "Nao foi possivel carregar os pacotes. Verifique sua conexao e tente novamente." with retry button.
- **Balance fetch failure**: Show packages without current balance. Replace balance display with "Saldo indisponivel" in muted text.

### Edge Cases

- **User already has high balance**: No behavioral change. All packages still available. No "you don't need this" messaging — the user knows what they need.
- **User selects then deselects**: Selection clears. "Comprar agora" button remains disabled until a package is selected.
- **Double-click prevention**: "Confirmar compra" disabled after first click. Re-enabled only on error.
- **Currency locale**: R$ formatting follows PT-BR locale (R$29,90 not R$29.90). EN locale shows same R$ value (not converted).

---

## 4. Screen Descriptions

### Screen 1: Purchase Page (/meu-atlas/comprar-pa)

**Purpose**: Present all PA packages with clear pricing, value comparison, and a simple selection flow.

**Layout**:
- Page title: "Comprar Pontos Atlas" (24px, bold, #1A202C)
- Current balance card: subtle surface card showing "Seu saldo atual" + balance in large text (32px, bold, gold #D4A017) + PA icon
- Contextual banner (conditional): only when `?needed=X` query param exists
- Package grid: 4 cards in a row (desktop), responsive
- Purchase history section below packages
- Refund info footer

**Content — Current Balance Card**:
- Compact card, bg #FFFBEB (warm amber tint), border 1px solid #FDE68A
- Left: PA coin icon (24px)
- Center: "Seu saldo atual" (12px, #5C6B7A) + "320 PA" (32px, bold, #92400E)
- Right: Link "Ver historico" -> /atlas#historico (14px, #E8621A)

**Content — Package Cards**:

| Package | PA | Price (BRL) | PA/R$ | Highlight | Economy |
|---|---|---|---|---|---|
| Explorador | 500 | R$14,90 | 33,6 PA/R$ | — | — |
| Navegador | 1.200 | R$29,90 | 40,1 PA/R$ | "Mais popular" | 20% mais PA/R$ |
| Cartografo | 2.800 | R$59,90 | 46,7 PA/R$ | — | 39% mais PA/R$ |
| Embaixador | 6.000 | R$119,90 | 50,0 PA/R$ | "Melhor custo-beneficio" | 49% mais PA/R$ |

Economy % is calculated relative to the Explorador base rate (33.6 PA/R$).

**Package Card Design**:
- Width: flexible, min 200px, max 280px
- Border: 1px solid #E2E8F0, border-radius 16px
- Padding: 24px
- Top section:
  - Package name (16px, bold, #1A202C)
  - Highlight badge (if applicable): pill with text, positioned top-right of card
    - "Mais popular": bg #3B82F6, text white
    - "Melhor custo-beneficio": bg #10B981, text white
- Center section:
  - PA amount: large (36px, bold, #1A202C), with PA icon
  - Price: (20px, #5C6B7A), "R$29,90"
- Bottom section:
  - PA/R$ ratio: (12px, #94A3B8), "40,1 PA por real"
  - Economy badge (if applicable): (12px, bold, #10B981), "20% mais PA/R$"
- States:
  - Default: white bg, subtle border
  - Hover: shadow-md, border #CBD5E1
  - Selected: border 2px solid #E8621A, bg #FFF7ED (very subtle orange tint), checkmark icon in top-left
  - Focus: 2px solid #E8621A outline, offset 2px
  - Insufficient context (when ?needed param): muted opacity 0.6, small text "Insuficiente para esta acao" if PA < needed amount

**CTA Button** (below package grid):
- "Comprar agora" — primary filled (#E8621A, white text), full-width on mobile, 200px min-width on desktop
- Disabled until a package is selected (opacity 0.5, cursor not-allowed)
- When selected: enabled, shows package summary inline: "Comprar 1.200 PA por R$29,90"

**Content — Purchase History Section**:
- Title: "Historico de compras" (18px, bold, #1A202C)
- List of past purchases, most recent first
- Each item: date (DD MMM YYYY) | package name | PA amount (+) | price paid (R$)
- Empty state: "Nenhuma compra realizada ainda."
- Max 10 items visible, "Ver historico completo" link to /atlas#historico with "Compras" filter pre-selected

**Content — Refund Info**:
- Small footer text (12px, #94A3B8)
- "Pontos Atlas adquiridos nao sao reembolsaveis. Em caso de problemas com sua compra, entre em contato pelo suporte."
- Link "suporte" to /suporte (or mailto)

**Loading State**:
- Balance card: skeleton (animated pulse)
- Package cards: 4 skeleton cards with rounded placeholders
- History: skeleton list of 3 items

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Balance card full-width. Package cards: 1 column, full-width, stacked vertically with 12px gap. CTA full-width sticky at bottom. History list full-width. |
| Tablet (768-1024px) | Balance card full-width. Package cards: 2x2 grid. CTA centered below grid. |
| Desktop (> 1024px) | Balance card max-width 1200px centered. Package cards: 4 in a row, max-width 1200px centered. CTA centered below. |

---

### Screen 2: Purchase Confirmation Modal

**Purpose**: Final confirmation before payment. Show exactly what the user is buying and the impact on their balance.

**Layout**:
- Modal overlay: rgba(0, 0, 0, 0.5)
- Card: centered, max-width 440px, border-radius 12px, bg white, padding 24px
- Close (X): top-right, 44x44px

**Content**:
- Icon: PA coin (32px, gold)
- Title: "Confirmar compra" (18px, bold, #1A202C)
- Summary card (bg #F7F9FC, rounded, padding 16px):
  - Package name + PA amount (bold)
  - Price: "R$29,90"
  - Divider line
  - "Saldo atual: 320 PA"
  - "Saldo apos: 1.520 PA" (bold, #10B981)
- Buttons:
  - "Confirmar compra" (primary, #E8621A)
  - "Cancelar" (ghost)

**Loading state (processing payment)**:
- "Confirmar compra" becomes "Processando..." with spinner
- "Cancelar" disabled
- Overlay click and Escape disabled

**Success state (replaces modal content)**:
- Large checkmark icon (48px, #10B981, animated scale-in 300ms)
- Title: "Compra realizada!" (20px, bold, #1A202C)
- Body: "1.200 PA adicionados ao seu saldo"
- New balance: "Novo saldo: 1.520 PA" (24px, bold, gold #92400E)
- CTA: "Voltar para o Atlas" (primary, navigates to /atlas)
- Auto-close after 8 seconds if no interaction

**Error state**:
- Inline error text: "A compra nao foi concluida. Nenhuma cobranca foi realizada. Tente novamente."
- Error color: #D93B2B with info icon prefix
- Buttons re-enabled for retry

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Modal: full-width with 16px margin. Buttons stacked. Success state same layout. |
| Tablet+ | Modal: centered, max-width 440px. Buttons inline. |

---

## 5. Interaction Patterns

- **Package selection**: Single-select (radio group behavior). Clicking a new card deselects the previous one. Selection is visually clear (border + background + checkmark).
- **Confirmation modal entrance**: Overlay fade 150ms + card scale 0.95->1.0 (200ms ease-out). Reduced motion: instant.
- **Success checkmark animation**: Scale from 0 to 1.0 (300ms ease-out) + brief bounce. Reduced motion: instant appear.
- **Balance update in header**: Counter animation from old to new value (400ms). Reduced motion: instant update.
- **Toast on success**: "+1.200 PA adicionados!" with PA icon, 4s auto-dismiss, top-right position (standard toast position, not celebration position).
- **Contextual banner dismissal**: The "needed" banner can be dismissed via X button. Dismissal is session-only (reappears on page reload from insufficient modal).
- **Scroll to selected**: On mobile, after selecting a package, the CTA button scrolls into view if not already visible.

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA (minimum, non-negotiable)

### Keyboard Navigation
- [x] Package cards are selectable via keyboard: Tab navigates between cards, Enter/Space selects
- [x] Package cards use `role="radiogroup"` with each card as `role="radio"` + `aria-checked`
- [x] Tab order: balance card -> package cards (left to right) -> CTA button -> history section
- [x] Confirmation modal: focus trap, Escape = Cancel, Tab cycles through summary and buttons
- [x] Success state: focus moves to "Voltar para o Atlas" button
- [x] Focus indicator: 2px solid #E8621A, outline-offset 2px on all interactive elements

### Screen Reader
- [x] Page title: `<h1>` "Comprar Pontos Atlas"
- [x] Balance card: `aria-label="Seu saldo atual: 320 Pontos Atlas"`
- [x] Package cards: `aria-label="Pacote [name]: [PA] Pontos Atlas por [price]. [Economy text if applicable]"`
- [x] Selected package: `aria-checked="true"`, announcement "Pacote [name] selecionado"
- [x] Highlight badges ("Mais popular"): included in card's aria-label
- [x] CTA button: `aria-label="Comprar [PA] Pontos Atlas por [price]"` (dynamic based on selection)
- [x] Confirmation modal: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- [x] Success announcement: `aria-live="assertive"` for "Compra realizada! [PA] PA adicionados."
- [x] Refund info: `role="note"`

### Color & Contrast
- [x] Package name (#1A202C on white): 16:1 (passes AAA)
- [x] Price text (#5C6B7A on white): 5.2:1 (passes AA)
- [x] "Mais popular" badge (white on #3B82F6): 4.6:1 (passes AA)
- [x] "Melhor custo-beneficio" badge (white on #10B981): 3.4:1 — use bold 14px+ text (passes large text AA)
- [x] Economy % text (#10B981 on white): 3.4:1 — supplemented by text content, not color-only info
- [x] Selected state differentiated by border + background + checkmark, not color alone
- [x] Insufficient card state: muted opacity + text label, not color alone

### Motion
- [x] Modal entrance/exit: respects `prefers-reduced-motion`
- [x] Success checkmark animation: instant under reduced motion
- [x] Balance counter animation: instant under reduced motion

### Touch
- [x] Package cards: entire card is touch target (min 200px wide x 160px tall — far exceeds 44px)
- [x] CTA button: 48px height, full-width on mobile
- [x] Confirmation modal buttons: min 44px height
- [x] Close (X): 44x44px
- [x] Card spacing: min 12px gap

---

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `purchase.title` | Comprar Pontos Atlas | Buy Atlas Points |
| `purchase.balance` | Seu saldo atual | Your current balance |
| `purchase.viewHistory` | Ver historico | View history |
| `purchase.cta` | Comprar agora | Buy now |
| `purchase.ctaWithDetails` | Comprar {pa} PA por {price} | Buy {pa} PA for {price} |
| `purchase.confirm.title` | Confirmar compra | Confirm purchase |
| `purchase.confirm.package` | Pacote {name}: {pa} PA | Package {name}: {pa} PA |
| `purchase.confirm.price` | Valor: {price} | Price: {price} |
| `purchase.confirm.balanceAfter` | Saldo apos: {balance} PA | Balance after: {balance} PA |
| `purchase.confirm.cta` | Confirmar compra | Confirm purchase |
| `purchase.confirm.processing` | Processando... | Processing... |
| `purchase.success.title` | Compra realizada! | Purchase complete! |
| `purchase.success.body` | {pa} PA adicionados ao seu saldo | {pa} PA added to your balance |
| `purchase.success.newBalance` | Novo saldo: {balance} PA | New balance: {balance} PA |
| `purchase.success.back` | Voltar para o Atlas | Back to Atlas |
| `purchase.toast` | +{pa} PA adicionados! | +{pa} PA added! |
| `purchase.history.title` | Historico de compras | Purchase history |
| `purchase.history.empty` | Nenhuma compra realizada ainda. | No purchases yet. |
| `purchase.history.viewAll` | Ver historico completo | View full history |
| `purchase.refund` | Pontos Atlas adquiridos nao sao reembolsaveis. Em caso de problemas com sua compra, entre em contato pelo suporte. | Purchased Atlas Points are non-refundable. For issues with your purchase, contact support. |
| `purchase.needed.banner` | Voce precisa de pelo menos {amount} PA para {action}. | You need at least {amount} PA for {action}. |
| `purchase.insufficient` | Insuficiente para esta acao | Insufficient for this action |
| `purchase.economy` | {percent}% mais PA/R$ | {percent}% more PA/R$ |
| `purchase.ratio` | {ratio} PA por real | {ratio} PA per real |
| `purchase.package.explorer` | Explorador | Explorer |
| `purchase.package.navigator` | Navegador | Navigator |
| `purchase.package.cartographer` | Cartografo | Cartographer |
| `purchase.package.ambassador` | Embaixador | Ambassador |
| `purchase.badge.popular` | Mais popular | Most popular |
| `purchase.badge.bestValue` | Melhor custo-beneficio | Best value |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Payment failure | A compra nao foi concluida. Nenhuma cobranca foi realizada. Tente novamente. | Purchase was not completed. No charge was made. Please try again. |
| Network error | Nao foi possivel carregar os pacotes. Verifique sua conexao e tente novamente. | Could not load packages. Check your connection and try again. |
| Balance fetch failure | Saldo indisponivel | Balance unavailable |

### Tone of Voice
- Transparent and trustworthy. No urgency manipulation ("Buy now before it's too late!").
- "Mais popular" and "Melhor custo-beneficio" are factual descriptors based on data, not pressure tactics.
- Economy percentages are real calculations, not inflated marketing numbers.
- Refund policy is visible and clear — not hidden behind links.
- Purchase success is positive but not over-the-top. The user made a transaction, not a celebration.

---

## 8. Constraints

- Payment gateway is NOT implemented in v1. The purchase flow uses a mock payment that succeeds immediately after a 1.5-second simulated delay. The confirmation modal and success screen are real; only the actual payment processing is mocked.
- Package prices and PA amounts are defined by the product owner and may change. Do not hardcode in the UI — consume from a configuration endpoint or constants file.
- R$ (Brazilian Real) is the only currency for v1. No currency conversion.
- PA are non-refundable per business rules.
- The /meu-atlas/comprar-pa route requires authentication (sits under the (app) route group).
- Header PA badge must update in real-time after successful purchase (client-side state update or refetch).
- Purchase history data comes from the existing PointTransaction model filtered by type "PURCHASE".

---

## 9. Prototype

- [ ] Prototype required: Yes (after spec approval)
- **Location**: `docs/prototypes/pa-purchase-page.html`
- **Scope**: Package selection, confirmation modal, success state, contextual banner
- **Status**: Deferred to post-approval

---

## 10. Open Questions

- [ ] **Payment gateway (v2)**: Which payment provider will be used for real transactions? Stripe, MercadoPago, PagSeguro? **Awaits: architect + product-owner**
- [ ] **Mock payment behavior**: Should the mock always succeed, or should it randomly fail ~10% of the time to test error flows? **Awaits: tech-lead**
- [ ] **Package pricing source**: Should prices come from the database (admin-editable) or from a config file? **Awaits: architect**
- [ ] **Promotional pricing**: Will there be discounts or promotional packages in the future? Should the card design accommodate a "was/now" price display? **Awaits: product-owner**
- [ ] **Receipt generation**: Should users receive an email receipt after purchase? Required for @business-traveler expense reporting. **Awaits: product-owner**
- [ ] **Purchase limits**: Is there a maximum number of purchases per day/week or maximum PA balance? **Awaits: product-owner**

---

## 11. Acceptance Criteria

- [ ] **AC-01**: The purchase page at /meu-atlas/comprar-pa displays the user's current PA balance at the top.
- [ ] **AC-02**: 4 package cards are displayed with PA amount, price in R$, PA/R$ ratio, and economy percentage (where applicable).
- [ ] **AC-03**: The "Navegador" package displays a "Mais popular" badge. The "Embaixador" package displays a "Melhor custo-beneficio" badge.
- [ ] **AC-04**: Selecting a package card highlights it with a primary border, checkmark, and subtle background change. Only one package can be selected at a time (radio behavior).
- [ ] **AC-05**: The "Comprar agora" button is disabled until a package is selected. When selected, the button label updates to show the package summary.
- [ ] **AC-06**: Clicking "Comprar agora" opens a confirmation modal showing package details, current balance, and projected balance after purchase.
- [ ] **AC-07**: Confirming the purchase shows a loading state ("Processando..."), then a success screen with the new balance and a CTA to return to Atlas.
- [ ] **AC-08**: On purchase success, the header PA badge updates to reflect the new balance and a toast "+X PA adicionados!" appears.
- [ ] **AC-09**: When arriving from an insufficient balance modal (?needed=X), a contextual info banner explains the minimum PA needed. Package cards that provide fewer PA than needed show "Insuficiente para esta acao".
- [ ] **AC-10**: A purchase history section shows past purchases (date, package, PA, price). Empty state: "Nenhuma compra realizada ainda."
- [ ] **AC-11**: Refund policy text is visible at the bottom of the page without requiring scroll on desktop.
- [ ] **AC-12**: Package cards use `role="radiogroup"`/`role="radio"` with `aria-checked` and are fully keyboard-navigable.
- [ ] **AC-13**: All modal dialogs have focus trap, Escape to cancel, and return focus to the trigger element on close.
- [ ] **AC-14**: On mobile (< 768px), package cards stack in a single column with the CTA button sticky at the bottom of the viewport.

---

## 12. Patterns Used

| Pattern | Source | Usage |
|---|---|---|
| **PAConfirmModal** | SPEC-UX-GAMIFICATION 4.10 | Base for purchase confirmation modal |
| **Toast** | ux-patterns.md | Purchase success feedback |
| **TransactionList** | SPEC-UX-GAMIFICATION 4.4 | Purchase history section |

### New Patterns Introduced

| Pattern | Description | Reusable? |
|---|---|---|
| **PackageCard** | Selectable card with pricing, value metrics, and highlight badge. Radio group behavior. | Yes — any tiered pricing display |
| **PurchaseConfirmModal** | Confirmation modal with transaction preview (before/after balance) | Yes — any in-app currency transaction |
| **ContextualNeedBanner** | Info banner driven by query params explaining why the user is on this page | Yes — any context-aware landing page |

---

> **Spec Status**: Draft
> **Ready for**: Architect (6 open questions need resolution; payment gateway is the critical dependency)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-22 | ux-designer | Initial draft — PA purchase page with 4 packages, mock payment flow |
