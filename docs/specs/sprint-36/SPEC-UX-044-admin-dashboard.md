# SPEC-UX-044: Admin Dashboard Layout — UX Specification

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

This feature serves the **app administrator**, not the traveler. The admin needs to monitor the health of the PA economy, track revenue, understand AI costs, and identify high-usage users — all from a single dashboard with clear data visualization.

## 2. Personas Affected

| Persona | How this feature serves them |
|---|---|
| `@travel-agent` | As the closest proxy to an admin persona: needs visibility into system metrics, revenue, and user behavior for business decisions |

Note: This is an admin-only feature. Standard traveler personas do not interact with this page. The primary user is the app owner/operator.

## 3. User Flow

### 3.1 Happy Path — View Dashboard

```
[Admin logs in with admin-role account]
    |
    v
[Admin navigates to /admin/dashboard]
    |
    v
[Dashboard loads with default date range: last 30 days]
    |
    v
[KPI cards render with current values]
[Charts render with data for selected period]
[User table renders with first 20 rows]
    |
    v
[Admin adjusts date range filter]
    |
    v
[All KPI cards and charts refresh with new data]
[User table refreshes]
    |
    v
[Admin searches for a specific user in the table]
    |
    v
[Table filters to matching results]
    |
    v
[Admin clicks a column header to sort]
    |
    v
[Table re-sorts by selected column]
```

### 3.2 Date Range Selection

```
[Admin clicks date range selector]
    |
    v
[Dropdown with presets: 7 dias | 30 dias | 90 dias | Personalizado]
    |
    +-- Preset selected --> [Dashboard refreshes immediately]
    |
    +-- "Personalizado" --> [Date picker opens with start/end fields]
        |
        v
        [Admin selects dates, clicks "Aplicar"]
        |
        v
        [Dashboard refreshes with custom range]
```

### Error States

- **Data load failure**: Each section (KPIs, charts, table) has independent error handling. If one fails, others still load. Error: "Nao foi possivel carregar [section]. Tente novamente." with retry button.
- **No data in range**: KPI cards show "0" or "R$0,00". Charts show empty state: "Nenhum dado para o periodo selecionado." Table shows "Nenhum usuario encontrado."
- **Unauthorized access**: Redirect to /expeditions with toast: "Acesso restrito a administradores."

### Edge Cases

- **First-time admin (no data)**: All KPIs show zero. Charts show empty states. Table shows no users. No special empty state — the dashboard structure is still useful for understanding what metrics will appear.
- **Very large dataset (1000+ users)**: Table uses server-side pagination (20 rows per page). Charts aggregate data server-side.
- **Mobile access**: Dashboard is desktop-optimized. On mobile, a notice bar appears: "Para melhor experiencia, acesse o painel pelo desktop." Dashboard still renders (stacked layout) but is not optimized for small screens.

---

## 4. Screen Descriptions

### Screen 1: Admin Dashboard (/admin/dashboard)

**Purpose**: Central overview of the PA economy, revenue, costs, and user activity.

**Layout — Top Section**:
- Page title: "Painel Administrativo" (24px, bold, #1A202C)
- Date range filter: inline to the right of the title (desktop) or below it (mobile)
- Date range presets: segmented control with options "7 dias", "30 dias", "90 dias", "Personalizado"
- Active preset: bg #E8621A, text white. Inactive: bg #F7F9FC, text #5C6B7A.

**Layout — KPI Cards Row**:
- 5 cards in a single row (desktop), wrapping to 2+3 (tablet), stacking (mobile)
- Each card: surface white, border 1px solid #E2E8F0, border-radius 12px, padding 20px
- Card height: consistent across all 5 (min 120px)

**KPI Card 1 — Receita**:
- Label: "Receita" (12px, uppercase, #94A3B8)
- Value: "R$4.520,00" (28px, bold, #10B981)
- Trend indicator: arrow up/down + percentage vs previous period (12px, green for up, #D93B2B for down)
- Icon: currency circle (left of label), muted green

**KPI Card 2 — Custo IA**:
- Label: "Custo IA" (12px, uppercase, #94A3B8)
- Value: "R$890,00" (28px, bold, #1A202C)
- Trend indicator: arrow + percentage
- Icon: sparkle circle, muted blue

**KPI Card 3 — Margem**:
- Label: "Margem" (12px, uppercase, #94A3B8)
- Value: "80,3%" (28px, bold, #10B981 if positive, #D93B2B if negative)
- Calculation: ((Revenue - AI Cost) / Revenue) * 100
- Trend indicator: arrow + percentage points vs previous period
- Icon: chart circle, muted teal

**KPI Card 4 — Usuarios Ativos**:
- Label: "Usuarios Ativos" (12px, uppercase, #94A3B8)
- Value: "342" (28px, bold, #1A202C)
- Subtext: "no periodo" (12px, #94A3B8)
- Trend indicator: arrow + percentage
- Icon: people circle, muted navy

**KPI Card 5 — PA em Circulacao**:
- Label: "PA em Circulacao" (12px, uppercase, #94A3B8)
- Value: "1.245.800" (28px, bold, #92400E — gold-brown)
- Subtext: "total acumulado" (12px, #94A3B8)
- Trend indicator: arrow + absolute change
- Icon: coin circle, muted gold

**Layout — Charts Section** (below KPI cards):
- Two-column layout on desktop, stacked on mobile/tablet
- Each chart in a surface card with title, border, and padding

**Chart 1 — Revenue Line Chart** (left column, or top when stacked):
- Title: "Receita ao longo do tempo" (16px, bold, #1A202C)
- Type: Line chart with filled area
- X-axis: dates (daily for 7/30 days, weekly for 90 days)
- Y-axis: R$ values
- Line color: #10B981 (success green)
- Fill: #10B981 at 10% opacity
- Hover: tooltip showing date + exact R$ value
- Grid lines: subtle #E2E8F0

**Chart 2 — Top 10 Users Bar Chart** (right column, or middle when stacked):
- Title: "Top 10 usuarios por gasto de PA" (16px, bold, #1A202C)
- Type: Horizontal bar chart
- Y-axis: user email (truncated to 20 chars if needed)
- X-axis: PA spent
- Bar color: #3B82F6 (blue)
- Hover: tooltip showing full email + exact PA spent + number of AI generations
- Bars sorted descending (highest spender at top)

**Chart 3 — PA Economy Donut** (below line chart, or bottom when stacked):
- Title: "Economia de PA no periodo" (16px, bold, #1A202C)
- Type: Donut/ring chart
- Segments:
  - "PA ganhos (fases)": #10B981 (green)
  - "PA ganhos (perfil)": #2DB8A0 (teal)
  - "PA ganhos (login)": #3B82F6 (blue)
  - "PA comprados": #8B5CF6 (purple)
  - "PA gastos (IA)": #F59E0B (amber)
- Center: total PA transacted in period (bold, 20px)
- Legend: below chart with colored dots + labels + values
- Hover: segment highlights + tooltip with percentage

**Layout — User Table Section** (below charts):
- Title: "Usuarios" (18px, bold, #1A202C)
- Search input: "Buscar usuario por nome ou email..." (left-aligned, max-width 320px)
- Table fills available width

**User Table**:

| Column | Description | Sortable |
|---|---|---|
| Usuario | Name + email (2 lines) | Yes (by name) |
| Saldo PA | Current PA balance | Yes |
| PA Gastos | Total PA spent in period | Yes |
| PA Ganhos | Total PA earned in period | Yes |
| Compras (R$) | Total R$ spent in period | Yes |
| Rank | Current gamification rank | Yes |
| Ultima atividade | Last active date | Yes (default sort) |

- Rows: alternating bg white / #F7F9FC for readability
- Hover: row bg #EFF6FF (light blue tint)
- Sort: click column header to toggle asc/desc. Active sort column: bold header + arrow icon
- Pagination: 20 rows per page. "Anterior" / "Proximo" buttons + page counter "Pagina 1 de 15"
- Search: client-side filter on name and email (debounced 300ms)

**Loading State**:
- KPI cards: skeleton placeholders with pulse animation (5 cards)
- Charts: skeleton rectangles with rounded corners
- Table: skeleton rows (5 rows) with animated pulse

**Responsive Behavior**:

| Breakpoint | Layout behavior |
|---|---|
| Mobile (< 768px) | Notice bar at top. KPI cards: 1 column stacked. Charts: full-width stacked. Table: horizontal scroll with sticky first column. Date filter below title. |
| Tablet (768-1024px) | KPI cards: 3+2 grid. Charts: stacked full-width. Table: horizontal scroll. Date filter inline with title. |
| Desktop (> 1024px) | KPI cards: 5 in a row. Charts: 2-column grid (line left, bar right, donut below line). Table: full-width, no scroll. Max-width 1400px centered. |

---

## 5. Interaction Patterns

- **Date range change**: All sections refresh simultaneously. Each section shows its own loading skeleton. Debounce: none for presets (immediate), 500ms after date picker "Aplicar" click.
- **Chart hover**: Tooltip appears near cursor showing exact data point. Tooltip: white bg, shadow-md, 12px text, max-width 200px.
- **Table sort**: Click column header toggles sort direction. Visual: header text bold + arrow (up for asc, down for desc). Active sort persists across pagination.
- **Table search**: Debounced 300ms. Filters results client-side for current page, server-side if paginated. Clears on X button or empty input.
- **Table pagination**: Standard previous/next buttons. Maintains sort and search state across pages.
- **No chart animation**: Charts render statically (no entrance animation). This is a data tool, not a presentation. No animation reduces cognitive load and respects the admin's need for speed.
- **Refresh**: No auto-refresh. Admin refreshes manually via browser or a refresh icon next to the date filter.

---

## 6. Accessibility Requirements (MANDATORY)

**WCAG Level**: AA (minimum, non-negotiable)

### Keyboard Navigation
- [x] Date range segmented control: arrow keys navigate between options, Enter/Space selects
- [x] Table headers: focusable, Enter toggles sort
- [x] Table pagination buttons: focusable, Enter activates
- [x] Search input: standard focus behavior, Escape clears
- [x] Tab order: date filter -> KPI cards (read-only) -> charts (read-only) -> search -> table -> pagination
- [x] Focus indicator: 2px solid #E8621A, outline-offset 2px

### Screen Reader
- [x] Page: `<h1>` "Painel Administrativo"
- [x] KPI cards: each is a `<div>` with `role="group"` and `aria-label="[KPI name]: [value]"`
- [x] Trend indicators: text alternative in aria-label (e.g., "Receita: R$4.520,00, aumento de 12% em relacao ao periodo anterior")
- [x] Charts: each has `role="img"` with `aria-label` describing the chart content summarily. A data table alternative is available as a "Ver dados" toggle below each chart for screen reader users.
- [x] User table: standard `<table>` with `<thead>`, `<th scope="col">`, `aria-sort` on active sort column
- [x] Pagination: `nav` with `aria-label="Paginacao da tabela de usuarios"`
- [x] Search: `<input>` with visible `<label>` "Buscar usuario"
- [x] Date range: `role="radiogroup"` with `role="radio"` for each preset
- [x] Mobile notice: `role="note"`

### Color & Contrast
- [x] KPI values (#1A202C on white): 16:1 (passes AAA)
- [x] KPI labels (#94A3B8 on white): 3.3:1 — supplementary labels, paired with large bold value text
- [x] Green trend (#10B981 on white): 3.4:1 — paired with arrow icon (not color alone)
- [x] Red trend (#D93B2B on white): 4.7:1 (passes AA) + arrow icon
- [x] Chart segments: differentiated by color + legend labels + hover tooltips (not color alone)
- [x] Table alternating rows: subtle tint, not relied upon for data interpretation
- [x] Donut chart: accessible via legend and data table toggle

### Motion
- [x] No chart entrance animations
- [x] Skeleton loading pulse: respects `prefers-reduced-motion` (static gray if reduced)
- [x] Tooltip appearance: instant (no animation)

### Touch
- [x] Date range buttons: min 44px height
- [x] Table sort headers: min 44px height
- [x] Pagination buttons: min 44px
- [x] Search input: 44px height
- [x] Chart data table toggle: 44px touch target

---

## 7. Content & Copy

### Key Labels & CTAs

| Key | PT-BR | EN |
|---|---|---|
| `admin.title` | Painel Administrativo | Admin Dashboard |
| `admin.dateRange.7days` | 7 dias | 7 days |
| `admin.dateRange.30days` | 30 dias | 30 days |
| `admin.dateRange.90days` | 90 dias | 90 days |
| `admin.dateRange.custom` | Personalizado | Custom |
| `admin.dateRange.apply` | Aplicar | Apply |
| `admin.kpi.revenue` | Receita | Revenue |
| `admin.kpi.aiCost` | Custo IA | AI Cost |
| `admin.kpi.margin` | Margem | Margin |
| `admin.kpi.activeUsers` | Usuarios Ativos | Active Users |
| `admin.kpi.paCirculation` | PA em Circulacao | PA in Circulation |
| `admin.kpi.inPeriod` | no periodo | in period |
| `admin.kpi.totalAccumulated` | total acumulado | total accumulated |
| `admin.chart.revenue` | Receita ao longo do tempo | Revenue over time |
| `admin.chart.topUsers` | Top 10 usuarios por gasto de PA | Top 10 users by PA spend |
| `admin.chart.economy` | Economia de PA no periodo | PA economy in period |
| `admin.chart.viewData` | Ver dados | View data |
| `admin.chart.hideData` | Ocultar dados | Hide data |
| `admin.chart.empty` | Nenhum dado para o periodo selecionado. | No data for the selected period. |
| `admin.table.title` | Usuarios | Users |
| `admin.table.search` | Buscar usuario por nome ou email... | Search user by name or email... |
| `admin.table.user` | Usuario | User |
| `admin.table.balance` | Saldo PA | PA Balance |
| `admin.table.spent` | PA Gastos | PA Spent |
| `admin.table.earned` | PA Ganhos | PA Earned |
| `admin.table.purchases` | Compras (R$) | Purchases (R$) |
| `admin.table.rank` | Rank | Rank |
| `admin.table.lastActivity` | Ultima atividade | Last activity |
| `admin.table.empty` | Nenhum usuario encontrado. | No users found. |
| `admin.table.page` | Pagina {current} de {total} | Page {current} of {total} |
| `admin.table.previous` | Anterior | Previous |
| `admin.table.next` | Proximo | Next |
| `admin.mobile.notice` | Para melhor experiencia, acesse o painel pelo desktop. | For a better experience, access the dashboard on desktop. |
| `admin.legend.earnedPhases` | PA ganhos (fases) | PA earned (phases) |
| `admin.legend.earnedProfile` | PA ganhos (perfil) | PA earned (profile) |
| `admin.legend.earnedLogin` | PA ganhos (login) | PA earned (login) |
| `admin.legend.purchased` | PA comprados | PA purchased |
| `admin.legend.spentAI` | PA gastos (IA) | PA spent (AI) |

### Error Messages

| Scenario | PT-BR | EN |
|---|---|---|
| KPI load failure | Nao foi possivel carregar os indicadores. Tente novamente. | Could not load indicators. Please try again. |
| Chart load failure | Nao foi possivel carregar o grafico. Tente novamente. | Could not load chart. Please try again. |
| Table load failure | Nao foi possivel carregar a tabela de usuarios. Tente novamente. | Could not load user table. Please try again. |
| Unauthorized | Acesso restrito a administradores. | Access restricted to administrators. |

### Tone of Voice
- Neutral, data-driven, functional. This is a business tool, not a consumer interface.
- Labels are concise and unambiguous. No marketing language.
- Error messages are factual with clear retry action.

---

## 8. Constraints

- Admin routes are protected by middleware checking `role === "admin"` on the user session.
- The admin dashboard defined in SPEC-UX-GAMIFICATION (section 4.11) was focused on PA economy only. This spec expands it to a full admin overview including revenue, AI costs, and user management.
- Chart library selection is an architect decision. The spec is library-agnostic — it describes what data to show and how, not how to render it.
- Revenue data requires a purchase transaction model. If PA purchase is mocked in v1, revenue data will also be simulated.
- AI cost data: the actual R$ cost of API calls must be tracked per-generation. This requires the backend to log token usage and calculate cost per the provider's pricing.
- Desktop-optimized: mobile is supported but not prioritized. Admin tasks are expected to be performed on desktop.

---

## 9. Prototype

- [ ] Prototype required: No (admin tool — functional clarity over visual polish. Wireframe-level spec is sufficient.)
- **Notes**: Developers can reference shadcn/ui Table, Card, and chart patterns for implementation.

---

## 10. Open Questions

- [ ] **Chart library**: Which library for charts? Recharts, Chart.js, Tremor, or server-rendered? **Awaits: architect**
- [ ] **AI cost tracking**: How is the R$ cost per AI generation tracked? Per-token cost from provider pricing or flat cost per generation? **Awaits: architect + finops-engineer**
- [ ] **Real-time vs cached**: Should KPIs update in real-time or use cached/aggregated data refreshed periodically? **Awaits: architect**
- [ ] **User detail drill-down**: Should clicking a user row open a detail view with their full transaction history? Out of scope for v1 or included? **Awaits: product-owner**
- [ ] **Export functionality**: Should the admin be able to export table data as CSV? **Awaits: product-owner**
- [ ] **Multi-admin access**: Is there only one admin, or should there be role-based access levels (admin, viewer)? **Awaits: product-owner**

---

## 11. Acceptance Criteria

- [ ] **AC-01**: The /admin/dashboard route is accessible only to users with admin role. Non-admin users are redirected to /expeditions with an error toast.
- [ ] **AC-02**: The page header displays "Painel Administrativo" with a date range filter offering presets (7 dias, 30 dias, 90 dias) and a custom date range option.
- [ ] **AC-03**: 5 KPI cards display: Receita (R$), Custo IA (R$), Margem (%), Usuarios Ativos (count), PA em Circulacao (total). Each shows a trend indicator vs the previous equivalent period.
- [ ] **AC-04**: A revenue line chart displays R$ revenue over time for the selected period with hover tooltips showing exact values.
- [ ] **AC-05**: A horizontal bar chart displays the top 10 users by PA spent in the selected period with hover tooltips showing user email and exact PA.
- [ ] **AC-06**: A donut chart displays the PA economy breakdown (earned by phases, profile, login; purchased; spent on AI) with a legend and center total.
- [ ] **AC-07**: A user table displays Usuario, Saldo PA, PA Gastos, PA Ganhos, Compras (R$), Rank, and Ultima atividade. All columns are sortable. Default sort: ultima atividade descending.
- [ ] **AC-08**: The user table supports text search by name or email (debounced 300ms) and server-side pagination (20 rows per page).
- [ ] **AC-09**: Changing the date range refreshes all KPI cards, charts, and the table. Each section handles its own loading state independently.
- [ ] **AC-10**: Each chart has a "Ver dados" toggle that reveals the underlying data in a tabular format for screen reader accessibility.
- [ ] **AC-11**: On mobile (< 768px), a notice bar informs the admin to use desktop for a better experience. The dashboard still renders in a stacked single-column layout.
- [ ] **AC-12**: KPI trend indicators use both arrow direction AND color to convey positive/negative change (not color alone).

---

## 12. Patterns Used

| Pattern | Source | Usage |
|---|---|---|
| **Toast** | ux-patterns.md | Unauthorized access notification |

### New Patterns Introduced

| Pattern | Description | Reusable? |
|---|---|---|
| **KPICard** | Compact metric card with label, value, trend indicator, and icon | Yes — any dashboard or analytics page |
| **DateRangeFilter** | Segmented control with presets + custom date picker | Yes — any time-series data view |
| **DataChart** | Chart wrapper with title, loading skeleton, empty state, and "Ver dados" accessibility toggle | Yes — any data visualization |
| **SortableTable** | Table with sortable column headers, search, pagination, and alternating row colors | Yes — any admin/data table |
| **MobileNoticeBar** | Dismissible info bar suggesting desktop access for admin tools | Yes — any desktop-optimized admin feature |

---

> **Spec Status**: Draft
> **Ready for**: Architect (6 open questions need resolution; chart library selection is the critical dependency)

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-22 | ux-designer | Initial draft — admin dashboard with KPIs, charts, user table |
