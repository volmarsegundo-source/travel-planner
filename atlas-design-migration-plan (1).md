# Atlas — Design Migration Plan: Stitch → Claude Code

> **Documento oficial de migração de design do Atlas Travel Planner**
> Versão: 2.0 | Data: 2026-03-23 | Autor: Product Owner
> Processo: SDD (Spec-Driven Development) + Guardrails | Sprints 38–41
> Baseline: v0.32.0 (Sprint 37) — 2480 unit tests, 120/130 E2E, 2 flaky

---

## Índice

1. [Visão Geral da Estratégia](#1-visão-geral)
2. [Passo a Passo: Stitch → Claude Code](#2-passo-a-passo)
3. [Construção dos Guardrails](#3-guardrails)
4. [Planejamento de Sprints](#4-sprints)
5. [Spec SDD: Design Migration](#5-spec-sdd)
6. [Riscos e Mitigações](#6-riscos)
7. [Checklist de Validação Final](#7-checklist)

---

## 1. Visão Geral da Estratégia

### Princípio Central

**Separar forma de função.** A migração de design NÃO altera lógica de negócio, rotas, APIs, ou estado. Apenas a camada de apresentação muda. Isso garante que a suite de 2480 testes unitários e 120 E2E continue sendo válida como rede de segurança.

### Estado Atual (pós Sprint 37)

- **Versão:** v0.32.0
- **Testes:** 2480 unit + 120/130 E2E (2 flaky, 8 skipped)
- **Staging:** travel-planner-eight-navy.vercel.app
- **DB:** Prisma migration `sprint36_purchase_and_role` aplicada (User.role + Purchase)
- **Test users:** 4 seeded (testuser, poweruser, newuser, admin)
- **Gamificação:** Purchase model + Purchase Flow + Admin Dashboard (KPIs, charts, CSV, margin alerts) — tudo live
- **Design exports:** 10 telas commitadas em `docs/design/stitch-exports/`
- **Design docs:** DESIGN.md + SCREEN-INDEX.md commitados

### Abordagem

```
Sprint 38 → Fundação (tokens, config, component library, guardrails)
Sprint 39 → Landing Page + Login (telas sem lógica complexa)
Sprint 40 → Fases 1–6 + Dashboard (migração do fluxo principal)
Sprint 41 → Polish, QA final, Beta Launch
```

### Pré-requisitos

- [x] Designs aprovados no Google Stitch (10 telas exportadas)
- [x] DESIGN.md exportado do Stitch e commitado
- [x] SCREEN-INDEX.md com mapa de telas oficiais e alternativas
- [ ] Conta Google Cloud com Stitch API habilitada (para MCP — opcional)
- [ ] Stitch API Key gerada (para MCP — opcional)

---

## 2. Passo a Passo: Stitch → Claude Code

### Fase A — Exportar Assets do Stitch (✅ CONCLUÍDA)

> Telas exportadas e commitadas em `docs/design/stitch-exports/` (commit `ab97c5e`).
>
> **Telas oficiais** (definidas no SCREEN-INDEX.md):
> - Landing Page → `atlas_landing_page_a_inspira_o/`
> - Dashboard → `atlas_user_dashboard_o_perfil_1/`
> - Phase 1 Wizard → `phase_1_a_inspira_o_wizard_1/`
> - Phase 3 O Preparo → `trip_planning_hub_o_preparo/`
> - Roteiro/Itinerário → `ai_powered_itinerary_roteiro/`
>
> **Extras exportados:** `diretrizes_de_ux_legal_e_privacidade.html`, `guia_de_imagens_e_melhorias_de_design.html`
>
> **Telas pendentes de geração no Stitch:** Login, Phase 2, Phase 4, Phase 5, Phase 6 detalhado, Sumário

---

### Fase B — Configurar Stitch MCP no Claude Code (Opcional)

> O MCP é um acelerador, não um blocker. Os arquivos HTML/CSS já estão no repositório.

#### B.1. Instalar o Stitch MCP CLI

```bash
npx @_davideast/stitch-mcp init
```

> **No WSL2:** Se o browser não abrir automaticamente, copie a URL OAuth do terminal e abra no browser do Windows.

#### B.2. Adicionar MCP Server ao Claude Code

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["@_davideast/stitch-mcp", "proxy"]
    }
  }
}
```

#### B.3. Instalar Stitch Skills

```bash
npx skills add google-labs-code/stitch-skills --skill stitch-design --global
npx skills add google-labs-code/stitch-skills --skill react:components --global
npx skills add google-labs-code/stitch-skills --skill design-md --global
```

#### B.4. Comandos MCP Úteis

| Comando MCP          | O que faz                                           |
|----------------------|-----------------------------------------------------|
| `get_screen_code`    | Puxa o HTML/CSS de uma tela do Stitch                |
| `get_screen_image`   | Baixa screenshot como base64                         |
| `build_site`         | Mapeia telas do Stitch para rotas do app             |
| `list_projects`      | Lista projetos no Stitch                             |
| `list_screens`       | Lista telas de um projeto                            |

---

### Fase C — Traduzir DESIGN.md para Código (Sprint 38)

#### C.1. Atualizar `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    colors: {
      navy: { DEFAULT: '#1a2332', light: '#243044', dark: '#111827' },
      amber: { DEFAULT: '#f59e0b', dark: '#d97706', light: '#fbbf24', 50: '#fffbeb' },
      teal: { DEFAULT: '#0d9488', light: '#14b8a6', dark: '#0f766e' },
      surface: { DEFAULT: '#fafafa', white: '#ffffff', gray: '#f5f5f5', border: '#e5e7eb' },
      success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
      text: { primary: '#1a2332', secondary: '#6b7280', muted: '#9ca3af', inverse: '#ffffff' },
      transparent: 'transparent', current: 'currentColor',
    },
    borderRadius: {
      none: '0', sm: '4px', DEFAULT: '8px', md: '12px', lg: '16px', full: '9999px',
    },
    fontSize: {
      'display-lg': ['48px', { lineHeight: '1.1', fontWeight: '700' }],
      'display': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
      'display-sm': ['30px', { lineHeight: '1.2', fontWeight: '700' }],
      'h1': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
      'h2': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
      'h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
      'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
      'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
      'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
      'label': ['14px', { lineHeight: '1.4', fontWeight: '600' }],
      'caption': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
    },
    fontFamily: {
      display: ['Outfit', 'Plus Jakarta Sans', 'Sora', 'sans-serif'],
      body: ['DM Sans', 'Nunito', 'sans-serif'],
    },
    boxShadow: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
      card: '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.06)',
    },
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
export default config
```

> **IMPORTANTE:** No Sprint 38, adicione os novos tokens como EXTENSÃO do config existente. Não remova tokens atuais — isso pode quebrar estilos do V1. A remoção dos tokens antigos acontece no Sprint 40 quando o V1 for eliminado.

#### C.2. Instalar Fontes

```bash
npm install @fontsource/outfit @fontsource/dm-sans
```

#### C.3. Variáveis CSS Globais

```css
/* globals.css — adicionar ao existente */
@layer base {
  :root {
    --input-height: 48px;
    --input-border-radius: 8px;
    --input-border-color: #e5e7eb;
    --input-focus-ring-color: #f59e0b;
    --section-padding-y: 80px;
    --section-padding-y-lg: 120px;
    --card-border-radius: 16px;
    --card-padding: 32px;
    --transition-fast: 150ms ease;
    --transition-normal: 300ms ease;
    --transition-slow: 500ms ease;
  }
}
```

---

## 3. Construção dos Guardrails

### Guardrail 1 — DESIGN.md como Spec Viva

O `DESIGN.md` em `docs/design/` é lido por todos os agentes. Contém: paleta de cores, tipografia, espaçamento, regras de componentes e proibições. O UX Designer agent é responsável por mantê-lo atualizado.

### Guardrail 2 — Component Library

```
src/components/ui/
  Button.tsx + Button.test.tsx       ← 3 variantes (primary, secondary, ghost)
  Input.tsx + Input.test.tsx         ← Com ícone, label, error state
  Card.tsx + Card.test.tsx           ← Shadow e padding padrão
  Chip.tsx + Chip.test.tsx           ← Selectable (single/multi)
  PhaseProgress.tsx + .test.tsx      ← 8 fases com estados
  StepperInput.tsx + .test.tsx       ← Contador +/- (passageiros)
  DateInput.tsx + .test.tsx          ← Com ícone de calendário
  AutocompleteInput.tsx + .test.tsx  ← Autocomplete com Mapbox
  Badge.tsx + Badge.test.tsx         ← Pontos, nível, status
  Modal.tsx + Modal.test.tsx
  index.ts                           ← Barrel export

src/components/features/
  landing/   ← HeroSection, HowItWorks, FeatureGrid, etc.
  phases/    ← PhaseLayout, Phase1Form, Phase2Form, etc.
```

### Guardrail 3 — ESLint Rules (Enforcement Automático)

Regras que bloqueiam cores e fontes fora do design system no `className`.

### Guardrail 4 — UX Designer Agent (Gate-keeper Obrigatório)

**O UX Designer é obrigatório em toda mudança visual.** Workflow:

```
PO define escopo → UX Designer analisa DESIGN.md + screenshots
→ UX emite parecer (dimensão UX da spec SDD)
→ Tech Lead planeja → Devs implementam
→ UX Designer valida componentes contra screen.png
→ Security review → Tech Lead merge
→ UX Designer aprovação final no staging
```

Regras para o UX Designer agent:
- Lê DESIGN.md e SCREEN-INDEX.md antes de qualquer parecer
- Valida fidelidade visual contra `screen.png` de cada tela oficial
- Verifica contraste WCAG 2.1 AA (mínimo 4.5:1 para texto)
- Garante touch targets ≥ 44px
- Verifica estados: hover, focus, disabled, error, loading
- Nenhum componente é mergeado sem aprovação do UX Designer
- Nenhuma tela V2 vai para staging sem validação do UX Designer

### Guardrail 5 — Feature Flags

```typescript
// src/lib/feature-flags.ts
export const FeatureFlags = {
  NEW_DESIGN_LANDING: process.env.NEXT_PUBLIC_NEW_DESIGN_LANDING === 'true',
  NEW_DESIGN_LOGIN: process.env.NEXT_PUBLIC_NEW_DESIGN_LOGIN === 'true',
  NEW_DESIGN_DASHBOARD: process.env.NEXT_PUBLIC_NEW_DESIGN_DASHBOARD === 'true',
  NEW_DESIGN_PHASE1: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE1 === 'true',
  NEW_DESIGN_PHASE2: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE2 === 'true',
  NEW_DESIGN_PHASE3: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE3 === 'true',
  NEW_DESIGN_PHASE4: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE4 === 'true',
  NEW_DESIGN_PHASE5: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE5 === 'true',
  NEW_DESIGN_PHASE6: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE6 === 'true',
} as const
```

Todas OFF por padrão. Ativação gradual: staging primeiro → produção depois.

### Guardrail 6 — Visual Regression Tests (Playwright)

Baselines do V1 tirados no Sprint 38. Atualizados após migração intencional com `npx playwright test --update-snapshots`.

### Guardrail 7 — Agent Prompts

Todos os agentes fullstack-dev devem ter no prompt:

```
## DESIGN SYSTEM RULES (MANDATORY)

Before ANY UI work:
1. Read docs/design/DESIGN.md
2. Read docs/design/SCREEN-INDEX.md
3. Read src/components/ui/index.ts

Rules:
- Use ONLY components from src/components/ui/
- Use ONLY color tokens from tailwind.config.ts
- Use ONLY font-display (headings) and font-body (text)
- All new UI components require UX Designer approval + SDD spec
- Every UI component must have .test.tsx
- Reference screen.png in docs/design/stitch-exports/ for accuracy
- NO UI merge without UX Designer validation
```

---

## 4. Planejamento de Sprints

### Sprint 38 — "Fundação do Design System"

**Objetivo:** Criar toda a infraestrutura de design sem mudar nenhum visual existente.
**Baseline:** v0.32.0 — 2480 unit tests, 120/130 E2E

| #  | Task                                          | Responsável      | Critério de Aceite                                  |
|----|-----------------------------------------------|------------------|-----------------------------------------------------|
| 1  | UX Designer analisa DESIGN.md + exports       | UX Designer      | Parecer UX emitido com tokens aprovados              |
| 2  | UX Designer define specs dos componentes ui/  | UX Designer      | Lista de componentes com variantes, estados, a11y    |
| 3  | Spec SDD aprovada (9 dimensões)               | PO + Tech Lead   | Spec em `docs/specs/sprint-38-design-foundation.md`  |
| 4  | Configurar Stitch MCP no Claude Code          | DevOps           | `list_projects` retorna projetos (ou skip se falhar) |
| 5  | Traduzir DESIGN.md → `tailwind.config.ts`     | Fullstack Dev 1  | Config compilando, tokens como extensão              |
| 6  | Instalar e configurar fontes (Outfit, DM Sans)| Fullstack Dev 1  | Fontes renderizando no browser                       |
| 7  | Criar variáveis CSS globais                   | Fullstack Dev 1  | `globals.css` atualizado, app renderizando           |
| 8  | Criar componente `Button` (3 variantes)       | Fullstack Dev 1  | Componente + testes + aprovação UX Designer          |
| 9  | Criar componente `Input` (com ícone/label)    | Fullstack Dev 2  | Componente + testes + aprovação UX Designer          |
| 10 | Criar componente `Card`                       | Fullstack Dev 2  | Componente + testes + aprovação UX Designer          |
| 11 | Criar componente `Chip` (selectable)          | Fullstack Dev 1  | Componente + testes + aprovação UX Designer          |
| 12 | Criar componente `Badge`                      | Fullstack Dev 2  | Componente + testes + aprovação UX Designer          |
| 13 | Criar componente `PhaseProgress`              | Fullstack Dev 1  | Componente + testes + aprovação UX Designer          |
| 14 | Criar componente `StepperInput`               | Fullstack Dev 2  | Componente + testes + aprovação UX Designer          |
| 15 | UX Designer valida todos os componentes       | UX Designer      | Parecer de aprovação ou lista de correções           |
| 16 | Implementar feature flag system               | Fullstack Dev 2  | Flags funcionando, todas OFF por padrão              |
| 17 | Atualizar agent prompts com design rules      | PO / Prompt Eng  | Prompts atualizados em `memory/`                     |
| 18 | Configurar ESLint rules de design             | Tech Lead        | Lint passa, cores fora do sistema geram erro         |
| 19 | Setup de visual regression tests              | QA Engineer      | Playwright screenshot baselines do V1 tirados        |
| 20 | Security review dos novos componentes         | Security Spec    | Nenhum XSS, inputs sanitizados, ARIA labels          |
| 21 | Rodar suite E2E completa (baseline)           | QA Engineer      | 120+ testes verdes = nada quebrou                    |
| 22 | UX Designer — aprovação final do sprint       | UX Designer      | Parecer formal: fundação aprovada                    |
| 23 | Sprint review + documentação                  | Tech Lead        | Sprint review em `docs/sprint-reviews/`              |

**Definition of Done Sprint 38:**
- [ ] Spec SDD aprovada com 9 dimensões (incluindo parecer UX)
- [ ] Todos componentes UI criados, testados e aprovados pelo UX Designer
- [ ] Tailwind config com tokens do design system (como extensão)
- [ ] Feature flags implementadas (todas OFF)
- [ ] ESLint rules bloqueando cores/fonts fora do sistema
- [ ] Visual regression baselines do V1 tirados
- [ ] Agent prompts atualizados com design rules
- [ ] 2480+ testes unitários passando
- [ ] 120+ E2E passando
- [ ] ZERO mudança visual na aplicação existente
- [ ] UX Designer aprovou o sprint

---

### Sprint 39 — "Landing Page + Login (Design V2)"

**Objetivo:** Migrar as telas de entrada usando os componentes do Sprint 38.

| #  | Task                                          | Responsável      | Critério de Aceite                                  |
|----|-----------------------------------------------|------------------|-----------------------------------------------------|
| 1  | Spec SDD Sprint 39 aprovada                   | PO + Tech Lead   | 9 dimensões, incluindo UX                            |
| 2  | UX Designer valida layout da Landing vs Stitch| UX Designer      | Checklist de fidelidade visual emitido               |
| 3  | Criar `LandingPageV2` — Hero Section          | Fullstack Dev 1  | Fiel ao screen.png do Stitch                         |
| 4  | Criar `LandingPageV2` — Social Proof Bar      | Fullstack Dev 1  | Números animados, responsivo                         |
| 5  | Criar `LandingPageV2` — How It Works          | Fullstack Dev 1  | 3 cards com glassmorphism, hover                     |
| 6  | Criar `LandingPageV2` — Feature Bento Grid    | Fullstack Dev 2  | 2x2 layout com previews                             |
| 7  | Criar `LandingPageV2` — CTA Banner            | Fullstack Dev 2  | Gradient amber, botão funcional                      |
| 8  | Criar `LandingPageV2` — Footer                | Fullstack Dev 2  | Links, social icons, LGPD compliance                 |
| 9  | Criar `LoginPageV2`                           | Fullstack Dev 1  | Form funcional com novos componentes UI              |
| 10 | UX Designer valida Landing V2 implementada    | UX Designer      | Comparação pixel-level com screen.png                |
| 11 | UX Designer valida Login V2 implementada      | UX Designer      | Fidelidade + a11y aprovada                           |
| 12 | Integrar feature flag `NEW_DESIGN_LANDING`    | Fullstack Dev 1  | Flag ON → V2, Flag OFF → V1                         |
| 13 | Integrar feature flag `NEW_DESIGN_LOGIN`      | Fullstack Dev 2  | Flag ON → V2, Flag OFF → V1                         |
| 14 | Visual regression baselines (V2)              | QA Engineer      | Screenshots tirados com flag ON                      |
| 15 | Teste responsivo (mobile 375px, tablet 768px) | QA Engineer      | Layout não quebra em nenhum breakpoint               |
| 16 | Ativar flags no staging                       | DevOps           | Staging mostrando design V2                          |
| 17 | Rodar suite E2E com flags ON                  | QA Engineer      | Todos E2E verdes (atualizar seletores se necessário) |
| 18 | Rodar suite E2E com flags OFF                 | QA Engineer      | Todos E2E verdes (V1 intacto)                        |
| 19 | UX Designer review visual no staging          | UX Designer      | Aprovação formal da Landing + Login no staging       |
| 20 | PO review visual no staging                   | PO               | Aprovação formal do design                           |
| 21 | Sprint review + documentação                  | Tech Lead        | Sprint review documentado                            |

**Definition of Done Sprint 39:**
- [ ] Landing V2 e Login V2 funcionando no staging
- [ ] Feature flags controlando V1 ↔ V2
- [ ] UX Designer aprovou fidelidade visual
- [ ] E2E verde com flags ON e OFF
- [ ] PO aprovou o visual
- [ ] Flags ainda OFF em produção

---

### Sprint 40 — "Migração das Fases 1–6 + Dashboard"

**Objetivo:** Migrar o fluxo principal da expedição.

| #  | Task                                          | Responsável      | Critério de Aceite                                  |
|----|-----------------------------------------------|------------------|-----------------------------------------------------|
| 1  | Gerar designs pendentes no Stitch (Fase 2,4,5,6, Login, Sumário) | PO | Screenshots + HTML exportados                  |
| 2  | UX Designer valida novos exports do Stitch    | UX Designer      | Parecer de consistência com design system            |
| 3  | Spec SDD Sprint 40 aprovada                   | PO + Tech Lead   | 9 dimensões                                         |
| 4  | Criar `PhaseLayoutV2` (wrapper das fases)     | Fullstack Dev 1  | PhaseProgress V2, breadcrumb, PA counter             |
| 5  | Criar `Phase1FormV2` — A Inspiração           | Fullstack Dev 1  | Autocomplete, chips, stepper, usando ui/             |
| 6  | Criar `Phase2FormV2` — O Perfil               | Fullstack Dev 2  | Chips/toggles de preferência com novo design         |
| 7  | Criar `Phase3V2` — O Preparo                  | Fullstack Dev 1  | Checklist AI com novo visual                         |
| 8  | Criar `Phase4V2` — A Logística                | Fullstack Dev 2  | 3 wizard steps com novo design                       |
| 9  | Criar `Phase5V2` — Guia do Destino            | Fullstack Dev 1  | Cards informativos com novo visual                   |
| 10 | Criar `Phase6V2` — Roteiro                    | Fullstack Dev 2  | Itinerário + mapa Leaflet com novo design            |
| 11 | Criar `DashboardV2` — Meu Atlas               | Fullstack Dev 1  | Lista de expedições com cards V2                     |
| 12 | Criar `SummaryPageV2` — Sumário               | Fullstack Dev 2  | Página de sumário com novo visual                    |
| 13 | UX Designer valida cada tela V2               | UX Designer      | Aprovação individual por tela                        |
| 14 | Integrar feature flags por fase               | Fullstack Dev 2  | Cada fase com flag independente                      |
| 15 | Visual regression baselines (todas as fases)  | QA Engineer      | Screenshots de todas as telas V2                     |
| 16 | E2E com todas flags ON no staging             | QA Engineer      | Suite completa verde                                 |
| 17 | E2E com todas flags OFF                       | QA Engineer      | Suite completa verde (V1 intacto)                    |
| 18 | Teste de fluxo completo V2 (ponta a ponta)    | QA Engineer      | Criar expedição do zero até roteiro no staging       |
| 19 | Accessibility review (contraste, ARIA labels) | Security Spec    | WCAG 2.1 AA compliance nos componentes V2            |
| 20 | Performance review (LCP, CLS)                 | Tech Lead        | LCP < 2.5s, CLS < 0.1 com design novo               |
| 21 | UX Designer review completo no staging        | UX Designer      | Fluxo ponta-a-ponta aprovado visualmente             |
| 22 | PO review de todas as telas no staging        | PO               | Aprovação formal de cada fase                        |
| 23 | Remover código V1 (após aprovação total)      | Fullstack Devs   | Código V1 removido, flags removidas                  |
| 24 | Sprint review + documentação                  | Tech Lead        | Sprint review documentado                            |

**Definition of Done Sprint 40:**
- [ ] Todas as fases migradas e aprovadas pelo UX Designer no staging
- [ ] Fluxo ponta-a-ponta funcionando com design V2
- [ ] E2E suite verde
- [ ] Performance dentro dos targets (LCP < 2.5s, CLS < 0.1)
- [ ] Código V1 removido (single code path)

---

### Sprint 41 — "Polish & Beta Launch"

**Objetivo:** Refinamentos finais e lançamento beta.

| #  | Task                                          | Responsável      | Critério de Aceite                                  |
|----|-----------------------------------------------|------------------|-----------------------------------------------------|
| 1  | Spec SDD Sprint 41 aprovada                   | PO + Tech Lead   | 9 dimensões                                         |
| 2  | Polish visual — ajustes finos pós-review      | Fullstack Devs   | Pixel-perfect com screenshots do Stitch              |
| 3  | Micro-animações e transições                  | Fullstack Dev 1  | Fade-in em cards, hover states polidos               |
| 4  | Empty states e loading skeletons              | Fullstack Dev 2  | Todas telas com empty/loading states V2              |
| 5  | Error states visuais                          | Fullstack Dev 2  | Toast notifications, form errors com novo design     |
| 6  | Gamificação visual (Pontos Atlas, badges)     | Fullstack Dev 1  | Visual integrado com design system                   |
| 7  | Dark mode (opcional — se tempo permitir)      | Fullstack Dev 1  | Toggle funcional, paleta dark definida               |
| 8  | SEO da Landing Page                           | Fullstack Dev 2  | Meta tags, OG image, structured data                 |
| 9  | UX Designer review de polish e animações      | UX Designer      | Micro-interações aprovadas                           |
| 10 | Manual test completo (54+ cenários)           | QA Engineer      | Checklist 100% verde                                 |
| 11 | E2E suite final                               | QA Engineer      | 100% verde no staging                                |
| 12 | Visual regression final                       | QA Engineer      | Nenhuma regressão visual                             |
| 13 | Security audit final                          | Security Spec    | Zero vulnerabilidades                                |
| 14 | Performance audit (Lighthouse)                | Tech Lead        | Score > 90 em todas categorias                       |
| 15 | FinOps review (custos com novo design)        | FinOps Eng       | Nenhum aumento inesperado de custos                  |
| 16 | UX Designer — aprovação final pré-launch      | UX Designer      | Parecer final: app pronto para Beta                  |
| 17 | Atualizar DESIGN.md com estado final          | UX Designer      | Documento reflete o estado real implementado          |
| 18 | Release notes e changelog                     | Release Manager  | Versão documentada                                   |
| 19 | Deploy produção                               | DevOps           | Beta live com design V2                              |
| 20 | Sprint review final                           | Tech Lead        | Documentação completa                                |

**Definition of Done Sprint 41:**
- [ ] Todas as telas com design V2 em produção
- [ ] UX Designer emitiu parecer final de aprovação
- [ ] Testes manuais + automatizados passando
- [ ] Performance, security e acessibilidade validados
- [ ] FinOps aprovou custos
- [ ] Beta Launch concluído

---

## 5. Spec SDD: Design Migration

### Dimensão PROD (Produto)

- **Objetivo:** Profissionalizar a interface do Atlas com design gerado no Google Stitch
- **Escopo:** Todas as telas do app (Landing, Login, Dashboard, 6 Fases, Sumário)
- **Fora do escopo:** Lógica de negócio, APIs, banco de dados, gamificação (já implementada)
- **Sucesso:** Usuários beta percebem o app como "profissional e confiável"

### Dimensão UX

- **Responsável:** UX Designer agent (gate-keeper obrigatório)
- **Source of truth:** `docs/design/DESIGN.md`
- **Referência visual:** Screenshots em `docs/design/stitch-exports/*/screen.png`
- **Índice de telas:** `docs/design/SCREEN-INDEX.md`
- **Componentes:** Library em `src/components/ui/`
- **Regra:** Nenhum componente UI ad-hoc. Nenhum merge sem aprovação UX.
- **Acessibilidade:** WCAG 2.1 AA obrigatório (contraste 4.5:1, touch targets 44px+)

### Dimensão TECH

- **Framework:** Next.js 15 + Tailwind CSS (existente)
- **Fontes:** Outfit (display) + DM Sans (body) via @fontsource (self-hosted)
- **Componentes:** React functional components com TypeScript
- **Feature flags:** Environment variables `NEXT_PUBLIC_NEW_DESIGN_*`
- **Build:** Zero warnings de TypeScript/ESLint
- **Baseline de testes:** 2480 unit + 120/130 E2E (Sprint 37)

### Dimensão SEC

- **Inputs:** Todos sanitizados (XSS prevention)
- **ARIA labels:** Em todos componentes interativos
- **CSP:** Content Security Policy permite fontes do @fontsource
- **LGPD:** Footer com links de privacidade e termos

### Dimensão AI

- **Sem impacto:** Design migration não altera prompts de AI nem uso do Claude API
- **Futuro:** Design do streaming response pode ser aprimorado visualmente

### Dimensão QA

- **Testes unitários:** Cada componente ui/ tem .test.tsx
- **E2E:** Suite existente (120/130) + visual regression tests
- **Manual:** Checklist de 54+ cenários atualizado para V2
- **Baselines:** Screenshots Playwright para cada tela
- **Test users:** 4 seeded (testuser, poweruser, newuser, admin)

### Dimensão INFRA

- **Fontes:** Self-hosted via @fontsource (sem CDN externo)
- **Bundle size:** Monitorar impacto das novas fontes (< 100KB total)
- **Stitch MCP:** Conexão apenas em desenvolvimento, não em produção
- **Staging:** travel-planner-eight-navy.vercel.app

### Dimensão RELEASE

- **Sprint 38:** v0.33.0 (fundação, sem mudança visual)
- **Sprint 39:** v0.34.0 (landing + login V2, flags OFF em prod)
- **Sprint 40:** v0.35.0-rc (todas fases V2, staging only)
- **Sprint 41:** v0.35.0 (Beta Launch com design V2)

### Dimensão COST

- **Google Stitch:** Gratuito (350 gerações/mês standard)
- **@fontsource:** Open source, custo zero
- **Bundle size:** Impacto mínimo em bandwidth (~50-100KB de fontes)
- **Tempo de desenvolvimento:** 4 sprints dedicados
- **Stitch MCP:** Sem custo adicional de infra
- **FinOps:** Validação obrigatória no Sprint 41

---

## 6. Riscos e Mitigações

| Risco                                    | Probabilidade | Impacto | Mitigação                                                |
|------------------------------------------|:------------:|:-------:|----------------------------------------------------------|
| E2E tests quebram com novo design         | Alta         | Médio   | Feature flags + atualizar seletores na mesma PR           |
| Design do Stitch não fica bom em código   | Média        | Alto    | UX Designer valida antes do merge + piloto Landing        |
| Performance degrada com fontes/animações  | Baixa        | Alto    | Lighthouse audit a cada sprint + font subsetting          |
| Agentes não respeitam design system       | Média        | Médio   | ESLint rules + agent prompts + UX Designer gate-keeping   |
| Stitch MCP falha/muda de API              | Baixa        | Baixo   | HTML/CSS já exportado como fallback, MCP é opcional       |
| Sprint 40 não cabe todas as 6 fases      | Média        | Médio   | Priorizar Fases 1-3, migrar 4-6 no Sprint 41 se preciso  |
| Design drift com o tempo pós-launch      | Alta         | Alto    | ESLint + visual regression CI + component library + UX    |
| Conflito entre gamificação e novo design  | Baixa        | Médio   | Sprint 41 dedica task específica para visual gamificação  |

---

## 7. Checklist de Validação Final (Beta Launch — Sprint 41)

### Design & UX
- [ ] UX Designer emitiu parecer final de aprovação
- [ ] Todas as telas correspondem aos screenshots do Stitch
- [ ] Paleta de cores consistente em todas as telas
- [ ] Tipografia (Outfit + DM Sans) renderizando corretamente
- [ ] Responsivo: Mobile (375px), Tablet (768px), Desktop (1440px)
- [ ] Animações suaves, sem jank
- [ ] WCAG 2.1 AA compliance em todos componentes

### Funcional
- [ ] Fluxo completo: Landing → Login → Criar Expedição → Fase 1-6 → Sumário
- [ ] Autocomplete de cidades funcionando
- [ ] Mapa Leaflet renderizando pins
- [ ] Streaming AI responses com novo design
- [ ] Gamificação (Pontos Atlas, badges, níveis) visual integrado
- [ ] Purchase model funcionando com novo design
- [ ] "Coming Soon" cards nas fases 7-8

### Qualidade
- [ ] 2480+ testes unitários passando
- [ ] 120+ E2E tests passando
- [ ] Visual regression tests passando
- [ ] Zero erros no console do browser
- [ ] Zero warnings de TypeScript/ESLint
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 90

### Segurança & Compliance
- [ ] Inputs sanitizados contra XSS
- [ ] ARIA labels em todos componentes interativos
- [ ] Footer LGPD compliant
- [ ] CSP headers permitindo fontes self-hosted
- [ ] 4 test users funcionando (testuser, poweruser, newuser, admin)

### SDD & Processo
- [ ] Specs aprovadas com 9 dimensões para Sprints 38-41
- [ ] UX Designer aprovou cada sprint
- [ ] DESIGN.md atualizado com estado final
- [ ] SCREEN-INDEX.md atualizado
- [ ] Sprint reviews documentados (38-41)
- [ ] Changelog publicado
- [ ] FinOps aprovou custos
- [ ] Component library documentada (props, variantes)
