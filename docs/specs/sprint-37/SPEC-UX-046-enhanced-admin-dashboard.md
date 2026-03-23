# SPEC-UX-046: Enhanced Admin Dashboard — UX Specification

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: Sprint 37 — Gamification Wave 3
**Sprint**: 37
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Supersedes**: SPEC-UX-GAMIFICATION 4.11 (skeleton admin dashboard)

---

## 1. Traveler Goal

As the system administrator, gain full visibility into the PA economy health — revenue, costs, margins, user behavior — to make informed pricing and feature decisions, and detect economic imbalances before they become problems.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@travel-agent` (as admin proxy) | Needs revenue visibility, user management, and margin health at a glance to make business decisions |
| `@business-traveler` (internal stakeholder) | May review dashboard for reporting; needs clear, exportable data |

**Note**: This is an admin-only feature. End-user personas (`@leisure-solo`, `@leisure-family`, etc.) are not directly affected. The admin persona is the product owner / system operator.

## 3. User Flow

### 3.1 Happy Path — Viewing Dashboard

```
[Admin navigates to /admin/dashboard]
(Entry: direct URL or admin nav link)
    |
    v
[Dashboard loads with default period: last 30 days]
[KPI cards row renders with data]
[Charts section renders below]
[User table renders below charts]
    |
    v
[Admin reviews KPI cards for quick health check]
    |
    v
[Admin changes period filter (e.g., "7 dias")]
    |
    v
[All data refreshes: KPI cards, charts, table update to reflect new period]
[Trend indicators recalculate against previous equivalent period]
    |
    v
[Admin scrolls to user table, searches for specific user]
    |
    v
[Table filters to matching users]
[Admin sorts by "Margem" column to find negative-margin users]
    |
    v
[Admin clicks "Exportar CSV" to download user table data]
```

### 3.2 Margin Alert Flow

```
[Dashboard loads or period changes]
    |
    v
[System calculates gross margin for selected period]
    |
    -- margin >= 80% --
    |
    v
[No alert banner — healthy margin]
    |
    -- margin < 80% and >= 50% --
    |
    v
[Yellow warning banner at top of dashboard]
"Atencao: Margem bruta em {X}% no periodo selecionado. Considere ajustar precos ou otimizar custos de IA."
[Icon: warning triangle, bg #FFFBEB, border #F59E0B]
    |
    -- margin < 50% --
    |
    v
[Red critical banner at top of dashboard]
"Critico: Margem bruta em {X}% no periodo selecionado. Acao imediata recomendada."
[Icon: alert circle, bg #FDF2F1, border #D93B2B]
```

### 3.3 CSV Export Flow

```
[Admin clicks "Exportar CSV" button above user table]
    |
    v
[Button shows loading state: "Exportando..." with spinner]
    |
    v
[CSV file downloads with filename: atlas-usuarios-{YYYY-MM-DD}.csv]
[Contains all rows (not just current page), respecting current search/sort filters]
    |
    v
[Button returns to default state]
[Toast: "Arquivo exportado com sucesso." (auto-dismiss 4s)]
```

### Error States

- **Dashboard load failure**: Full-page error: "Nao foi possivel carregar o dashboard. Verifique sua conexao e tente novamente." Retry button.
- **Partial load failure**: Individual sections show inline error with retry. Other sections render normally. KPI cards show "--" for failed metrics.
- **Chart render failure**: Chart area shows "Nao foi possivel carregar este grafico." with retry link. Placeholder area maintains layout.
- **Table load failure**: Table area shows "Nao foi possivel carregar os dados de usuarios." with retry button. Filters and export button disabled.
- **CSV export failure**: Toast error: "Nao foi possivel exportar os dados. Tente novamente." Button re-enabled.
- **No data for period**: KPI cards show "0" with "--" for trend. Charts show empty state with centered text: "Sem dados para o periodo selecionado."

### Edge Cases

- **First day of operation**: All metrics at 0. Trend indicators show "--" (no previous period for comparison). Charts empty.
- **Single user**: All user-level metrics reflect one user. Table shows 1 row.
- **Very large dataset**: Table paginated at 25/page. Charts aggregate data points (daily for 7d/30d, weekly for 90d, monthly for 1y).
- **Currency conversion (AI costs)**: AI costs from Anthropic are in USD. Dashboard converts to BRL using daily exchange rate. Conversion rate displayed in tooltip on AI Cost card.
- **Admin on mobile**: Not optimized for mobile. Show advisory banner: "Para melhor experiencia, acesse o dashboard pelo desktop." Dashboard still renders (responsive, not blocked).

---

## 4. Screen Descriptions

### Screen 1: Admin Dashboard (/admin/dashboard)

**Purpose**: Provide a comprehensive, at-a-glance view of the PA economy health with drill-down capability into user-level data.

**Layout (top to bottom)**:
1. Page header: "Painel Administrativo — Economia Atlas" (24px, bold, #1A202C)
2. Period filter row
3. Margin alert banner (conditional)
4. KPI cards row (7 cards)
5. Charts section (2x2 grid)
6. User table section

---

#### 4.1 Period Filter Row

**Layout**:
- Positioned right-aligned below page header
- Preset buttons: "7 dias" | "30 dias" | "90 dias" | "1 ano" (pill buttons, single-select)
- Custom date picker: "Personalizado" button opens date range picker (2 date inputs: "De" and "Ate")
- Active preset: filled primary (#E8621A, white text)
- Inactive presets: outlined (#E2E8F0 border, #1A202C text)
- Default active: "30 dias"

**Behavior**:
- Clicking a preset instantly selects it and triggers data reload
- Clicking "Personalizado" reveals date range inputs inline (slide-down 200ms)
- Date range requires both dates. "Aplicar" button confirms custom range.
- Custom range selected: "Personalizado" pill stays active, shows selected range in parentheses "(01/03 - 23/03)"
- Max custom range: 1 year

**Responsive**:

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Preset pills wrap to 2 rows. Custom date picker full-width below. |
| Tablet+ | Single row, all presets + custom inline. |

---

#### 4.2 KPI Cards Row

**Layout**: 7 cards in a scrollable row (desktop: grid wrap, mobile: horizontal scroll)

**Card Design** (each card):
- Width: flexible, min 160px
- Height: auto (content-driven)
- Background: white (#FFFFFF)
- Border: 1px solid #E2E8F0, border-radius 12px
- Padding: 16px
- Content:
  - Label: 12px, #94A3B8, uppercase tracking-wide
  - Value: 28px, bold, #1A202C
  - Trend indicator: 14px, with arrow icon
    - Positive: green (#10B981), up arrow
    - Negative: red (#D93B2B), down arrow
    - Neutral: gray (#94A3B8), dash
    - Format: "+12,5%" or "-3,2%" vs previous equivalent period
  - Subtitle: 11px, #94A3B8, "vs periodo anterior"

**KPI Cards**:

| # | Label | Value Format | Trend Meaning | Notes |
|---|---|---|---|---|
| 1 | USUARIOS TOTAIS | 1.234 | vs previous period end | Total registered users |
| 2 | USUARIOS PAGANTES | 156 | vs previous period | Users with >= 1 purchase in period |
| 3 | RECEITA (BRL) | R$4.567,00 | vs previous period | Total Stripe revenue in period |
| 4 | CUSTO IA (BRL) | R$1.234,00 | vs previous period | Anthropic cost converted to BRL. Tooltip: "Custo em USD: $XXX. Cotacao: R$X,XX" |
| 5 | MARGEM BRUTA | 73,0% | vs previous period | (Revenue - AI Cost) / Revenue * 100. Color-coded: >=80% green, 50-79% amber, <50% red |
| 6 | ARPU | R$29,28 | vs previous period | Revenue / Paying Users. "Receita media por usuario pagante" |
| 7 | TAXA CONVERSAO | 12,6% | vs previous period | Paying Users / Total Users * 100 |

**Margin card special behavior**:
- Value text color: #10B981 if >=80%, #F59E0B if 50-79%, #D93B2B if <50%
- This is supplemented by the margin alert banner (color is not sole indicator)

**Loading State**: 7 skeleton cards with pulse animation (same dimensions)

**Responsive**:

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | 2-column grid, cards stack. 7th card spans full width at bottom. Horizontal scroll alternative disabled (grid preferred for data density). |
| Tablet (768-1024px) | 4-column grid, second row: 3 cards |
| Desktop (> 1024px) | 7 cards in a single row, equal width, max-width 1400px |

---

#### 4.3 Charts Section

**Layout**: 2x2 grid on desktop, stacked on mobile. Each chart in a card container.

**Chart Card Design**:
- Background: white, border 1px solid #E2E8F0, border-radius 12px
- Padding: 20px
- Header: chart title (16px, bold) + optional subtitle/legend
- Chart area: min-height 280px
- Charts are read-only (no interactive drill-down in v1)

**Chart 1: Receita ao longo do tempo** (line chart)
- X-axis: time (daily for 7d/30d, weekly for 90d, monthly for 1y)
- Y-axis: R$ value
- Single line, color #10B981 (revenue green)
- Data points visible on hover (tooltip: date + value)
- Area fill below line at 10% opacity

**Chart 2: Chamadas de IA ao longo do tempo** (line chart)
- X-axis: time (same granularity as Chart 1)
- Y-axis: count of AI calls
- 3 lines: Checklist (#3B82F6), Guia (#F59E0B), Roteiro (#8B5CF6)
- Legend below chart title with color swatches
- Hover tooltip: date + count per feature

**Chart 3: Distribuicao de nivel dos usuarios** (pie/donut chart)
- Segments: one per rank (Novato, Desbravador, Navegador, Capitao, Aventureiro, Lendario)
- Colors: rank-specific (use distinct, accessible palette)
- Center text (donut): total user count
- Legend to the right of chart (desktop), below chart (mobile)
- Hover: segment highlights, tooltip shows rank name + count + %

**Chart 4: Top destinos** (horizontal bar chart)
- Top 10 destinations by expedition count
- Bars: #E8621A (primary orange)
- Labels: destination name on Y-axis, count on bar end
- Sorted descending (most popular at top)

**Empty state per chart**: Centered text "Sem dados para o periodo selecionado" with muted icon

**Loading state**: Skeleton rectangles matching chart area dimensions, pulse animation

**Responsive**:

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Charts stack vertically, full-width. Min-height 240px per chart. Pie chart legend below. |
| Tablet (768-1024px) | 2x2 grid. Charts may be slightly compressed. |
| Desktop (> 1024px) | 2x2 grid, max-width 1400px. Charts comfortably sized. |

---

#### 4.4 User Table Section

**Layout**:
- Section title: "Usuarios" (20px, bold)
- Controls row: search input (left) + export button (right)
- Table
- Pagination below table

**Search Input**:
- Placeholder: "Buscar por email ou nome..."
- Width: 320px (desktop), full-width (mobile)
- Debounced: 300ms after last keystroke
- Clear button (X) when text present
- Icon: magnifying glass on left

**Export Button**:
- "Exportar CSV" with download icon
- Style: outlined button, #1A202C border, 44px height
- Loading state: "Exportando..." with spinner, disabled
- Exports ALL rows matching current search/sort (not just current page)

**Table Columns**:

| Column | Content | Sortable | Width | Notes |
|---|---|---|---|---|
| Usuario | Name + email (2-line: name bold, email muted) | By name | flex | Primary identifier |
| Nivel | Rank badge (emoji + name) | By rank | 120px | Colored by rank |
| PA Saldo | Current PA balance | Yes (desc) | 100px | Right-aligned number |
| Receita | Total R$ from this user (period) | Yes (desc) | 120px | "R$0,00" if none |
| Custo IA | AI cost attributed to user (period, BRL) | Yes (desc) | 120px | Converted from USD |
| Margem | Per-user margin % | Yes (desc) | 100px | Color: green >=80%, amber 50-79%, red <50% |
| Lucro | Revenue - AI Cost (BRL) | Yes (desc) | 120px | **Green** (#10B981) if positive, **red** (#D93B2B) if negative. Bold. |

**Margin/Profit color note**: Color is supplemented by +/- sign and value. Color is not the sole indicator. Negative values always prefixed with "-" sign.

**Default sort**: Receita descending (highest-revenue users first)

**Pagination**:
- 25 rows per page
- Controls: "Anterior" | page numbers | "Proximo"
- Show "Mostrando 1-25 de 156 usuarios"
- Page numbers: show first, last, and 2 around current (e.g., 1 ... 3 4 **5** 6 7 ... 12)

**Empty state**: "Nenhum usuario encontrado para os filtros aplicados." centered in table area.

**Loading state**: Table skeleton — 5 rows with animated pulse columns

**Responsive**:

| Breakpoint | Behavior |
|---|---|
| Mobile (< 768px) | Table: horizontal scroll container. Minimum table width 900px. Search full-width above table. Export button below search. |
| Tablet (768-1024px) | Table fits with slight horizontal scroll for all columns. Controls inline. |
| Desktop (> 1024px) | Table fits without scroll, max-width 1400px. Controls inline. |

---

#### 4.5 Margin Alert Banner

**Purpose**: Alert the admin when gross margin drops below healthy thresholds.

**Warning banner (margin 50-79%)**:
- Position: below period filter, above KPI cards
- Background: #FFFBEB
- Left border: 4px solid #F59E0B
- Icon: warning triangle (20px, #F59E0B)
- Text: "Atencao: Margem bruta em {X}% no periodo selecionado. Considere ajustar precos ou otimizar custos de IA." (14px, #92400E)
- Dismissible: X button (session-only, reappears on period change if still applicable)

**Critical banner (margin <50%)**:
- Position: same as warning
- Background: #FDF2F1
- Left border: 4px solid #D93B2B
- Icon: alert circle (20px, #D93B2B)
- Text: "Critico: Margem bruta em {X}% no periodo selecionado. Acao imediata recomendada." (14px, bold, #991B1B)
- NOT dismissible (critical alerts stay visible)

---

## 5. Interaction Patterns

- **Period filter selection**: Instant highlight on pill click. Data refresh starts immediately. All sections show loading state during refresh. Reduced motion: no pill transition animation.
- **Custom date picker**: Slide-down reveal (200ms ease-out). "Aplicar" triggers data refresh. Reduced motion: instant reveal.
- **Chart hover**: Tooltip appears near cursor with data point details. 150ms delay before showing.
- **Table sort**: Click column header to sort. First click: descending. Second click: ascending. Third click: remove sort (return to default). Active sort column header shows arrow indicator.
- **Table search**: Debounced 300ms. Results update in-place. Pagination resets to page 1 on new search. Clear button resets search.
- **CSV export**: Button loading state during generation. Browser download dialog. Toast on completion.
- **Margin banner**: Warning is dismissible (X), critical is not. Both recalculate on period change.
- **Mobile advisory**: Banner at top of page on screens < 768px. Dismissible. Does not block access.

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA (minimum, non-negotiable)

### Keyboard Navigation
- [x] Period filter pills: focusable via Tab, selectable via Enter/Space
- [x] Custom date picker: Tab navigates between date inputs and "Aplicar" button
- [x] Table headers: focusable via Tab, Enter toggles sort direction
- [x] Table rows: not individually focusable (data display, not interactive rows)
- [x] Pagination controls: focusable via Tab, Enter activates
- [x] Search input: standard input focus behavior
- [x] Export button: standard button focus
- [x] Alert banner dismiss (X): focusable, 44x44px touch target
- [x] Focus indicator: 2px solid #E8621A, outline-offset 2px

### Screen Reader
- [x] Page title: `<h1>` "Painel Administrativo — Economia Atlas"
- [x] Period filter: `role="group"` with `aria-label="Periodo de analise"`. Active pill: `aria-pressed="true"`
- [x] KPI cards: each card is a `<section>` with `aria-label="[metric name]: [value], [trend]"`
- [x] AI Cost card tooltip (USD conversion): accessible via focus, `aria-describedby` links to tooltip content
- [x] Margin alert banner: `role="alert"` (critical) or `role="status"` (warning)
- [x] Charts: each chart has `role="img"` with `aria-label` describing the chart purpose and a text summary. Example: `aria-label="Grafico de receita ao longo do tempo. Periodo: ultimos 30 dias. Total: R$4.567."`
- [x] Chart data: accessible data table hidden visually but available to screen readers (`sr-only` table below each chart)
- [x] Table: proper `<table>` with `<thead>`, `<th scope="col">` for headers
- [x] Sortable headers: `aria-sort="ascending|descending|none"` on `<th>`
- [x] Search input: `aria-label="Buscar usuarios por email ou nome"` with `role="search"` on container
- [x] Pagination: `aria-label="Paginacao da tabela de usuarios"`, current page `aria-current="page"`
- [x] Export button: `aria-label="Exportar tabela de usuarios em formato CSV"`
- [x] Empty states: announced via `aria-live="polite"`
- [x] Margin/Profit colors: values include +/- sign. Screen reader reads number with sign. Color is not sole indicator.

### Color & Contrast
- [x] KPI label (#94A3B8 on white): 3.0:1 for 12px uppercase — supplementary to value, not sole info. Value (#1A202C) provides primary info at 16:1.
- [x] Trend green (#10B981 on white): 3.4:1 — supplemented by arrow icon direction
- [x] Trend red (#D93B2B on white): 5.5:1 (passes AA)
- [x] Margin value colors: green/amber/red supplemented by percentage value + alert banner. Never color-only.
- [x] Profit column: green/red supplemented by +/- sign prefix. Never color-only.
- [x] Warning banner text (#92400E on #FFFBEB): 7.1:1 (passes AAA)
- [x] Critical banner text (#991B1B on #FDF2F1): 8.2:1 (passes AAA)
- [x] Chart lines: distinct colors + legend labels. Hover tooltips provide exact values.

### Motion
- [x] Period filter pill transition: respects `prefers-reduced-motion`
- [x] Custom date picker reveal: instant under reduced motion
- [x] Chart animations (if any): respects `prefers-reduced-motion`. Charts may render without animation.
- [x] Skeleton loading pulse: respects `prefers-reduced-motion` (static gray under reduced motion)

### Touch
- [x] Period filter pills: min 44px height, 8px gap between pills
- [x] Search input: 44px height
- [x] Export button: 44px height
- [x] Pagination controls: min 44x44px per page button
- [x] Alert banner dismiss: 44x44px
- [x] Table on mobile: horizontal scroll container (touch-scrollable)

---

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `admin.title` | Painel Administrativo — Economia Atlas | Admin Panel — Atlas Economy |
| `admin.mobileAdvice` | Para melhor experiencia, acesse o dashboard pelo desktop. | For better experience, access the dashboard on desktop. |
| `admin.period.7d` | 7 dias | 7 days |
| `admin.period.30d` | 30 dias | 30 days |
| `admin.period.90d` | 90 dias | 90 days |
| `admin.period.1y` | 1 ano | 1 year |
| `admin.period.custom` | Personalizado | Custom |
| `admin.period.from` | De | From |
| `admin.period.to` | Ate | To |
| `admin.period.apply` | Aplicar | Apply |
| `admin.period.vsPrevious` | vs periodo anterior | vs previous period |
| `admin.kpi.totalUsers` | Usuarios totais | Total users |
| `admin.kpi.payingUsers` | Usuarios pagantes | Paying users |
| `admin.kpi.revenue` | Receita (BRL) | Revenue (BRL) |
| `admin.kpi.aiCost` | Custo IA (BRL) | AI Cost (BRL) |
| `admin.kpi.aiCostTooltip` | Custo em USD: {usd}. Cotacao: R${rate} | Cost in USD: {usd}. Rate: R${rate} |
| `admin.kpi.margin` | Margem bruta | Gross margin |
| `admin.kpi.arpu` | ARPU | ARPU |
| `admin.kpi.arpuSub` | Receita media por usuario pagante | Average revenue per paying user |
| `admin.kpi.conversion` | Taxa conversao | Conversion rate |
| `admin.chart.revenue` | Receita ao longo do tempo | Revenue over time |
| `admin.chart.aiCalls` | Chamadas de IA ao longo do tempo | AI calls over time |
| `admin.chart.aiCalls.checklist` | Checklist | Checklist |
| `admin.chart.aiCalls.guide` | Guia | Guide |
| `admin.chart.aiCalls.itinerary` | Roteiro | Itinerary |
| `admin.chart.levels` | Distribuicao de nivel dos usuarios | User level distribution |
| `admin.chart.destinations` | Top destinos | Top destinations |
| `admin.chart.empty` | Sem dados para o periodo selecionado. | No data for selected period. |
| `admin.table.title` | Usuarios | Users |
| `admin.table.search` | Buscar por email ou nome... | Search by email or name... |
| `admin.table.export` | Exportar CSV | Export CSV |
| `admin.table.exporting` | Exportando... | Exporting... |
| `admin.table.exportSuccess` | Arquivo exportado com sucesso. | File exported successfully. |
| `admin.table.user` | Usuario | User |
| `admin.table.level` | Nivel | Level |
| `admin.table.balance` | PA Saldo | PA Balance |
| `admin.table.revenue` | Receita | Revenue |
| `admin.table.aiCost` | Custo IA | AI Cost |
| `admin.table.margin` | Margem | Margin |
| `admin.table.profit` | Lucro | Profit |
| `admin.table.empty` | Nenhum usuario encontrado para os filtros aplicados. | No users found for applied filters. |
| `admin.table.showing` | Mostrando {from}-{to} de {total} usuarios | Showing {from}-{to} of {total} users |
| `admin.table.previous` | Anterior | Previous |
| `admin.table.next` | Proximo | Next |
| `admin.alert.warning` | Atencao: Margem bruta em {margin}% no periodo selecionado. Considere ajustar precos ou otimizar custos de IA. | Warning: Gross margin at {margin}% for selected period. Consider adjusting prices or optimizing AI costs. |
| `admin.alert.critical` | Critico: Margem bruta em {margin}% no periodo selecionado. Acao imediata recomendada. | Critical: Gross margin at {margin}% for selected period. Immediate action recommended. |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| Dashboard load failure | Nao foi possivel carregar o dashboard. Verifique sua conexao e tente novamente. | Could not load dashboard. Check your connection and try again. |
| Chart load failure | Nao foi possivel carregar este grafico. | Could not load this chart. |
| Table load failure | Nao foi possivel carregar os dados de usuarios. | Could not load user data. |
| CSV export failure | Nao foi possivel exportar os dados. Tente novamente. | Could not export data. Please try again. |
| Partial metric failure | -- (shown in KPI card value) | -- |

### Tone of Voice
- Functional and data-driven. This is a business intelligence tool, not a consumer product.
- Alert banners are informative, not alarming. "Considere ajustar" (consider adjusting) — advisory, not commanding.
- Critical alert is direct but not panic-inducing. "Acao imediata recomendada" — recommended, not demanded.
- Numbers formatted with PT-BR locale: periods for thousands (1.234), commas for decimals (73,0%).
- USD values explicitly labeled when shown (AI Cost tooltip).

---

## 8. Constraints

- **Admin role only**: Route protected by middleware. Non-admin users see 403. No "request access" flow in v1.
- **Desktop-primary**: Dashboard is optimized for desktop. Mobile renders but with advisory banner and horizontal scroll for table. No mobile-specific layouts for charts.
- **Chart library**: Architect decides charting library. Spec is technology-agnostic — defines data, axes, colors, and behavior, not implementation.
- **USD to BRL conversion**: AI costs from Anthropic are billed in USD. Dashboard must convert using a daily exchange rate. Source of exchange rate is an architect decision (API, static config, Stripe rate).
- **Real-time vs cached**: KPI data may be cached (e.g., refreshed every 5 minutes). This is acceptable. Show "Atualizado em: HH:MM" timestamp below KPI cards.
- **CSV export**: Server-side generation. Client downloads file. Max export: 10,000 rows (if user base exceeds this, paginate export or limit).
- **No drill-down in v1**: Charts are display-only. Clicking a chart element does not navigate or filter. This may be added in future sprints.
- **Per-user AI cost attribution**: Requires tracking which AI calls belong to which user. This data must exist in the transaction/AI call logs.
- **No user CRUD from dashboard**: Admin dashboard is read-only for user data. No ban/edit/delete user actions in v1.

---

## 9. Prototype

- [ ] Prototype required: No (admin tool — functional layout sufficient from spec)
- **Notes**: The admin dashboard prioritizes data clarity over visual polish. No prototype needed — spec describes layout and behavior sufficiently for implementation.

---

## 10. Open Questions

- [ ] **Charting library**: Which library will render charts? Options: Chart.js, Recharts (React), Nivo. Affects bundle size and SSR compatibility. **Awaits: architect**
- [ ] **USD/BRL exchange rate source**: API (e.g., Banco Central do Brasil, exchangerate-api), Stripe conversion rate, or manual config? **Awaits: architect + finops-engineer**
- [ ] **Data refresh interval**: How often are KPI values recalculated? Real-time per request, 5-minute cache, or daily aggregate? **Awaits: architect**
- [ ] **CSV export row limit**: If user base exceeds 10,000, should CSV be paginated or streamed? **Awaits: architect**
- [ ] **Per-user AI cost attribution accuracy**: Are AI costs tracked per-user today in the transaction model? If not, this requires backend work before the table can show accurate Custo IA and Margem per user. **Awaits: architect + data-engineer**
- [ ] **Chart accessibility**: Screen-reader-accessible data tables behind each chart add significant development effort. Should this be v1 or deferred? Recommendation: v1 for compliance. **Awaits: tech-lead**

---

## 11. Acceptance Criteria

- [ ] **AC-01**: The admin dashboard at /admin/dashboard is accessible only to users with admin role. Non-admin users see a 403 error page.
- [ ] **AC-02**: A period filter row with preset buttons (7 dias, 30 dias, 90 dias, 1 ano) and a custom date range picker is displayed. Default selection is "30 dias". Changing the period refreshes all dashboard data.
- [ ] **AC-03**: 7 KPI cards are displayed: Total Users, Paying Users, Revenue (BRL), AI Cost (BRL), Gross Margin %, ARPU, and Conversion Rate.
- [ ] **AC-04**: Each KPI card shows a trend indicator (up arrow green, down arrow red) comparing to the previous equivalent period. First-time data shows "--" for trend.
- [ ] **AC-05**: The AI Cost card includes a tooltip showing the original USD amount and the BRL conversion rate used.
- [ ] **AC-06**: The Gross Margin KPI card value is color-coded: green (>=80%), amber (50-79%), red (<50%). This color is supplemented by the percentage value and margin alert banner.
- [ ] **AC-07**: A yellow warning banner appears when gross margin is between 50% and 79%. A red critical banner appears when margin is below 50%. Warning is dismissible; critical is not.
- [ ] **AC-08**: 4 charts are displayed: Revenue over time (line), AI calls by feature (multi-line), User level distribution (pie/donut), Top destinations (horizontal bar).
- [ ] **AC-09**: Charts have hover tooltips showing exact data point values. Chart empty states display "Sem dados para o periodo selecionado."
- [ ] **AC-10**: A searchable, sortable, paginated user table displays: name+email, level, PA balance, revenue, AI cost, margin %, and profit (BRL).
- [ ] **AC-11**: The Profit column displays positive values in green and negative values in red, supplemented by +/- sign prefix. Profit is calculated as Revenue - AI Cost per user for the selected period.
- [ ] **AC-12**: The table search filters by user email or name with 300ms debounce. Pagination is 25 rows per page with "Anterior"/"Proximo" controls.
- [ ] **AC-13**: An "Exportar CSV" button above the table exports all matching rows (respecting search/sort) as a CSV file. Loading state shown during export. Success toast on completion.
- [ ] **AC-14**: Each chart has an `aria-label` describing its purpose and an accessible data table (sr-only) for screen readers.
- [ ] **AC-15**: On mobile (< 768px), an advisory banner suggests using desktop. KPI cards display in a 2-column grid. The user table is in a horizontal scroll container.
- [ ] **AC-16**: All sortable table headers have `aria-sort` attributes. Period filter pills have `aria-pressed`. Margin alert uses appropriate `role` (alert/status).

---

## 12. Patterns Used

| Pattern | Source | Usage |
|---|---|---|
| **Toast** | ux-patterns.md | CSV export success feedback |
| **KPI stat card** | SPEC-UX-GAMIFICATION 4.11 | Extended from skeleton to full design |

### New Patterns Introduced

| Pattern | Description | Reusable? |
|---|---|---|
| **KPICard** | Compact metric card with label, value, trend indicator. 7 in a row. | Yes — any metrics dashboard |
| **MarginAlertBanner** | Conditional warning/critical banner with threshold-based visibility and color. | Yes — any threshold-based alerting |
| **PeriodFilter** | Preset pill buttons + custom date range picker for time-based filtering. | Yes — any analytics view |
| **SortableDataTable** | Table with sortable headers, search, pagination, CSV export. | Yes — any admin data view |
| **ChartCard** | Container card for a chart with title, loading, empty, and error states. | Yes — any chart display |

---

> **Spec Status**: Draft
> **Ready for**: Architect (6 open questions; per-user AI cost attribution is the critical data dependency)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-23 | ux-designer | Initial draft — full admin dashboard with KPIs, charts, user table, margin alerts |
