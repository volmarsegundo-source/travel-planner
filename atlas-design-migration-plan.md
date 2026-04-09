# Atlas — Design Migration Plan: Stitch → Claude Code

> **Documento oficial de migração de design do Atlas Travel Planner**
> Versão: 1.0 | Data: 2026-03-23 | Autor: Product Owner
> Processo: SDD (Spec-Driven Development) | Sprints 33–36

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

**Separar forma de função.** A migração de design NÃO altera lógica de negócio, rotas, APIs, ou estado. Apenas a camada de apresentação muda. Isso garante que a suite de 2172 testes unitários e 121+ E2E continue sendo válida como rede de segurança.

### Abordagem

```
Sprint 33 → Fundação (tokens, config, component library)
Sprint 34 → Landing Page + Login (telas sem lógica complexa)
Sprint 35 → Fases 1–6 (migração do fluxo principal)
Sprint 36 → Polish, QA final, Beta Launch
```

### Pré-requisitos

- [ ] Designs aprovados no Google Stitch (Landing + Fase 1 como piloto)
- [ ] DESIGN.md exportado do Stitch
- [ ] Conta Google Cloud com Stitch API habilitada (gratuito)
- [ ] Stitch API Key gerada em stitch.withgoogle.com → Settings → API Key

---

## 2. Passo a Passo: Stitch → Claude Code

### Fase A — Exportar Assets do Stitch (manual, no browser)

#### A.1. Exportar o DESIGN.md

No Stitch, após finalizar os designs:

1. Abra o projeto no canvas do Stitch
2. Clique no ícone de exportação (ou use o chat: "Generate a DESIGN.md file with all design tokens")
3. O Stitch gera um arquivo markdown com: paleta de cores, tipografia, espaçamentos, border-radius, shadows, e regras de layout
4. Baixe o arquivo ou copie o conteúdo

> **Se o Stitch não gerar automaticamente**, use este prompt no chat do Stitch:
> "Extract the complete design system from this project and generate a DESIGN.md file including: color palette with hex codes, typography scale, spacing system, border radius values, shadow definitions, and component-level design rules."

#### A.2. Exportar HTML/CSS das Telas

Para cada tela gerada:

1. Clique na tela no canvas
2. Use "Export front-end code" → selecione HTML/CSS
3. Salve cada arquivo com nome descritivo:
   - `stitch-landing-page.html`
   - `stitch-phase1-inspiracao.html`
   - (futuras telas seguem o mesmo padrão)

#### A.3. Exportar Screenshots (referência visual)

1. Para cada tela, use "Download as image" ou tire screenshot
2. Salve em formato PNG com nome correspondente
3. Esses servem como referência visual para os agentes e para QA

#### A.4. Organizar no Repositório Atlas

Crie a seguinte estrutura no projeto:

```
docs/
  design/
    DESIGN.md                          ← Design system (source of truth)
    stitch-exports/
      landing-page.html                ← HTML exportado do Stitch
      phase1-inspiracao.html
      ... (futuras telas)
    screenshots/
      landing-page.png                 ← Referência visual
      phase1-inspiracao.png
      ...
```

Commit: `docs: add Stitch design exports and DESIGN.md`

---

### Fase B — Configurar Stitch MCP no Claude Code

#### B.1. Instalar o Stitch MCP CLI

```bash
# Inicializa e configura autenticação OAuth com Google
npx @_davideast/stitch-mcp init
```

O wizard vai:
- Verificar se `gcloud` está instalado (instala se necessário)
- Autenticar via OAuth no browser
- Configurar o projeto Google Cloud
- Gerar as credenciais necessárias

> **No WSL2 (seu ambiente):** Se o browser não abrir automaticamente, copie a URL OAuth do terminal e abra manualmente no browser do Windows.

#### B.2. Adicionar MCP Server ao Claude Code

No arquivo de configuração do Claude Code (`.claude/settings.json` ou `claude_desktop_config.json`):

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

#### B.3. Verificar Conexão

No Claude Code, teste com:

```
Liste meus projetos no Stitch
```

O agente deve retornar a lista de projetos do Stitch via MCP.

#### B.4. Instalar Stitch Skills para Claude Code

```bash
# Skill principal de design
npx skills add google-labs-code/stitch-skills --skill stitch-design --global

# Skill de conversão para React components
npx skills add google-labs-code/stitch-skills --skill react:components --global

# Skill de DESIGN.md (import/export de design rules)
npx skills add google-labs-code/stitch-skills --skill design-md --global
```

#### B.5. Comandos MCP Úteis para os Agentes

Uma vez conectado, os agentes podem usar:

| Comando MCP          | O que faz                                           |
|----------------------|-----------------------------------------------------|
| `get_screen_code`    | Puxa o HTML/CSS de uma tela específica do Stitch     |
| `get_screen_image`   | Baixa screenshot da tela como base64                 |
| `build_site`         | Mapeia telas do Stitch para rotas do app             |
| `list_projects`      | Lista todos os projetos no Stitch                    |
| `list_screens`       | Lista todas as telas de um projeto                   |

---

### Fase C — Traduzir DESIGN.md para Código

Esta é a fase mais crítica. O DESIGN.md precisa virar configuração real no código.

#### C.1. Atualizar `tailwind.config.ts`

Baseado nos tokens do DESIGN.md, reescrever o config:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // ============================================
    // ATLAS DESIGN SYSTEM — Source: DESIGN.md
    // NÃO adicione cores/tokens fora deste sistema
    // ============================================

    colors: {
      // Brand
      navy: {
        DEFAULT: '#1a2332',
        light: '#243044',
        dark: '#111827',
      },
      amber: {
        DEFAULT: '#f59e0b',
        dark: '#d97706',
        light: '#fbbf24',
        50: '#fffbeb',
      },
      teal: {
        DEFAULT: '#0d9488',
        light: '#14b8a6',
        dark: '#0f766e',
      },

      // Surfaces
      surface: {
        DEFAULT: '#fafafa',
        white: '#ffffff',
        gray: '#f5f5f5',
        border: '#e5e7eb',
      },

      // Semantic
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',

      // Text
      text: {
        primary: '#1a2332',
        secondary: '#6b7280',
        muted: '#9ca3af',
        inverse: '#ffffff',
      },

      // Utility
      transparent: 'transparent',
      current: 'currentColor',
    },

    borderRadius: {
      none: '0',
      sm: '4px',
      DEFAULT: '8px',      // inputs, small elements
      md: '12px',
      lg: '16px',          // cards, modals
      full: '9999px',      // badges, chips, avatars
    },

    fontSize: {
      // Display
      'display-lg': ['48px', { lineHeight: '1.1', fontWeight: '700' }],
      'display': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
      'display-sm': ['30px', { lineHeight: '1.2', fontWeight: '700' }],

      // Headings
      'h1': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
      'h2': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
      'h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }],

      // Body
      'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
      'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
      'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],

      // Labels & Captions
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

    spacing: {
      // Manter escala padrão do Tailwind mas documentar uso
      // Seções: py-20 (80px) a py-32 (128px)
      // Cards padding: p-6 (24px) a p-8 (32px)
      // Form fields gap: space-y-6 (24px)
      // Inline elements: gap-2 (8px) a gap-4 (16px)
    },

    extend: {
      // Animations do design system
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

#### C.2. Instalar Fontes

```bash
npm install @fontsource/outfit @fontsource/dm-sans
```

No `layout.tsx` ou `globals.css`:

```css
@import '@fontsource/outfit/400.css';
@import '@fontsource/outfit/600.css';
@import '@fontsource/outfit/700.css';
@import '@fontsource/dm-sans/400.css';
@import '@fontsource/dm-sans/500.css';
@import '@fontsource/dm-sans/600.css';
```

#### C.3. Criar Variáveis CSS Globais

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Input dimensions */
    --input-height: 48px;
    --input-border-radius: 8px;
    --input-border-color: #e5e7eb;
    --input-focus-ring-color: #f59e0b;

    /* Section spacing */
    --section-padding-y: 80px;
    --section-padding-y-lg: 120px;

    /* Card */
    --card-border-radius: 16px;
    --card-padding: 32px;

    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-normal: 300ms ease;
    --transition-slow: 500ms ease;
  }
}
```

---

## 3. Construção dos Guardrails

### Guardrail 1 — DESIGN.md como Spec Viva

O `DESIGN.md` na raiz do projeto é lido por todos os agentes. Ele deve conter:

```markdown
# Atlas Design System

> Este documento é a fonte de verdade para decisões visuais.
> Gerado pelo Google Stitch, mantido pelo Product Owner.
> Última atualização: [DATA]

## Princípios

1. **Aventureiro mas confiável** — Premium sem ser frio
2. **Espaço para respirar** — Whitespace generoso sempre
3. **Consistência total** — Usar APENAS tokens definidos aqui
4. **Mobile-first** — Responsivo por padrão

## Paleta de Cores

| Token        | Hex       | Uso                                    |
|--------------|-----------|----------------------------------------|
| navy         | #1a2332   | Texto principal, fundos dark            |
| amber        | #f59e0b   | CTAs primários, estados ativos          |
| amber-dark   | #d97706   | Hover de CTAs                           |
| teal         | #0d9488   | Links, ações secundárias, sucesso       |
| surface      | #fafafa   | Fundo de página                         |
| surface-white| #ffffff   | Fundo de cards                          |
| border       | #e5e7eb   | Bordas de inputs e divisores            |

## Tipografia

| Elemento     | Font           | Size  | Weight | Line Height |
|-------------|----------------|-------|--------|-------------|
| Display     | Outfit         | 36px  | 700    | 1.2         |
| H1          | Outfit         | 28px  | 700    | 1.3         |
| H2          | Outfit         | 24px  | 600    | 1.3         |
| Body        | DM Sans        | 16px  | 400    | 1.6         |
| Label       | DM Sans        | 14px  | 600    | 1.4         |
| Caption     | DM Sans        | 12px  | 500    | 1.4         |

## Componentes — Regras

### Buttons
- Primário: bg-amber, text-white, rounded-lg, h-12, shadow-md, hover:bg-amber-dark
- Secundário: border-2 border-navy, text-navy, rounded-lg, h-12, hover:bg-navy hover:text-white
- Ghost: text-teal, hover:underline

### Inputs
- Altura: 48px (h-12)
- Border: 1px solid border (#e5e7eb)
- Border radius: 8px (rounded)
- Focus: ring-2 ring-amber
- Placeholder: text-text-muted
- Ícone à esquerda: text-text-secondary, 20px

### Cards
- Background: surface-white
- Border radius: 16px (rounded-lg)
- Shadow: shadow-card
- Padding: p-6 a p-8

### Chips / Pills
- Default: border border-border, rounded-full, px-4 py-2
- Selected: bg-amber, text-white, border-amber
- Multiple selection allowed

### Progress Bar (Fases)
- 8 nodes conectados por linhas
- Active: bg-amber com glow (ring-4 ring-amber/30)
- Completed: bg-teal com checkmark
- Upcoming: border-2 border-border, bg-transparent
- Locked: border-2 border-border, ícone de cadeado

## Espaçamento entre Seções

- Entre seções de página: 80–120px (py-20 a py-32)
- Padding interno de cards: 24–32px (p-6 a p-8)
- Gap entre form fields: 24px (space-y-6)
- Gap entre chips/pills: 8–12px (gap-2 a gap-3)

## Proibições

❌ NUNCA use cores fora da paleta definida
❌ NUNCA use Inter, Roboto, Arial, ou system fonts
❌ NUNCA use drop shadows harsh (shadow-xl+)
❌ NUNCA use border-radius menor que 8px em cards
❌ NUNCA crie componentes UI ad-hoc — use a library
```

### Guardrail 2 — Component Library

Estrutura da biblioteca de componentes UI:

```
src/
  components/
    ui/                          ← Design system components
      Button.tsx                 ← Botão com variantes (primary, secondary, ghost)
      Button.test.tsx
      Input.tsx                  ← Input com ícone, label, error state
      Input.test.tsx
      Card.tsx                   ← Card container com shadow e padding padrão
      Card.test.tsx
      Chip.tsx                   ← Chip selecionável (single/multi)
      Chip.test.tsx
      PhaseProgress.tsx          ← Barra de progresso das 8 fases
      PhaseProgress.test.tsx
      StepperInput.tsx           ← Contador +/- (passageiros)
      StepperInput.test.tsx
      DateInput.tsx              ← Input de data com ícone de calendário
      DateInput.test.tsx
      AutocompleteInput.tsx      ← Autocomplete com Mapbox
      AutocompleteInput.test.tsx
      Badge.tsx                  ← Badge de pontos, nível, status
      Badge.test.tsx
      Modal.tsx
      Modal.test.tsx
      index.ts                   ← Barrel export de todos componentes
    features/                    ← Componentes de feature (usam ui/)
      landing/
        HeroSection.tsx
        HowItWorksSection.tsx
        FeatureGrid.tsx
        ...
      phases/
        PhaseLayout.tsx          ← Layout wrapper de qualquer fase
        Phase1Form.tsx
        Phase2Form.tsx
        ...
```

**Exemplo de componente com design system embutido:**

```typescript
// src/components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-amber text-text-inverse hover:bg-amber-dark shadow-md active:shadow-sm',
  secondary: 'border-2 border-navy text-navy hover:bg-navy hover:text-text-inverse',
  ghost: 'text-teal hover:underline',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-body-sm',
  md: 'h-11 px-6 text-body',
  lg: 'h-12 px-8 text-body-lg font-semibold',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg',
          'font-body font-semibold',
          'transition-all duration-[var(--transition-fast)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber',
          'disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

### Guardrail 3 — ESLint Rules (Enforcement Automático)

Crie um plugin ESLint customizado para prevenir drift:

```typescript
// .eslintrc.js (regras adicionais)
module.exports = {
  rules: {
    // Proibir cores hardcoded em className
    'no-restricted-syntax': [
      'error',
      {
        // Bloqueia classes Tailwind com cores fora do design system
        selector: 'JSXAttribute[name.name="className"][value.value=/\\b(red|blue|green|purple|pink|indigo|violet|orange|cyan|lime|emerald|rose|fuchsia|sky)-\\d{2,3}\\b/]',
        message: '❌ Use apenas cores do design system Atlas (navy, amber, teal, surface, text). Consulte DESIGN.md.',
      },
      {
        // Bloqueia font families fora do sistema
        selector: 'JSXAttribute[name.name="className"][value.value=/\\bfont-(sans|serif|mono)\\b/]',
        message: '❌ Use font-display ou font-body do design system. Consulte DESIGN.md.',
      },
    ],
  },
}
```

### Guardrail 4 — Agent Prompts Atualizados

Adicione ao prompt de cada agente fullstack-dev no Claude Code:

```markdown
## DESIGN SYSTEM RULES (MANDATORY)

Before ANY UI work:
1. Read `DESIGN.md` in the project root
2. Read `src/components/ui/index.ts` to see available components

Rules:
- Use ONLY components from `src/components/ui/` — NEVER create ad-hoc styled elements
- Use ONLY color tokens defined in `tailwind.config.ts` — NO arbitrary colors
- Use ONLY font-display (headings) and font-body (text) — NO other fonts
- All new UI components require SDD spec approval (UX dimension)
- Every UI component must have a corresponding .test.tsx file
- Reference Stitch screenshots in `docs/design/screenshots/` for visual accuracy

If a component you need doesn't exist in ui/:
1. Stop implementation
2. Report the missing component to tech-lead
3. Wait for the component to be created and tested before proceeding
```

### Guardrail 5 — Feature Flags

Implemente um sistema simples de feature flags:

```typescript
// src/lib/feature-flags.ts
export const FeatureFlags = {
  NEW_DESIGN_LANDING: process.env.NEXT_PUBLIC_NEW_DESIGN_LANDING === 'true',
  NEW_DESIGN_PHASE1: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE1 === 'true',
  NEW_DESIGN_PHASE2: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE2 === 'true',
  NEW_DESIGN_PHASE3: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE3 === 'true',
  NEW_DESIGN_PHASE4: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE4 === 'true',
  NEW_DESIGN_PHASE5: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE5 === 'true',
  NEW_DESIGN_PHASE6: process.env.NEXT_PUBLIC_NEW_DESIGN_PHASE6 === 'true',
  NEW_DESIGN_DASHBOARD: process.env.NEXT_PUBLIC_NEW_DESIGN_DASHBOARD === 'true',
} as const

// Hook para uso em componentes
export function useNewDesign(feature: keyof typeof FeatureFlags): boolean {
  return FeatureFlags[feature]
}
```

```typescript
// Uso no componente
import { useNewDesign } from '@/lib/feature-flags'
import { LandingPageV1 } from '@/components/features/landing/LandingPageV1'
import { LandingPageV2 } from '@/components/features/landing/LandingPageV2'

export default function LandingPage() {
  const isNewDesign = useNewDesign('NEW_DESIGN_LANDING')
  return isNewDesign ? <LandingPageV2 /> : <LandingPageV1 />
}
```

```env
# .env.local (desenvolvimento)
NEXT_PUBLIC_NEW_DESIGN_LANDING=true
NEXT_PUBLIC_NEW_DESIGN_PHASE1=true
# ... ativa conforme vai migrando

# .env.staging (staging — todas ativas para teste)
NEXT_PUBLIC_NEW_DESIGN_LANDING=true
NEXT_PUBLIC_NEW_DESIGN_PHASE1=true
# ...

# .env.production (produção — liga gradualmente)
NEXT_PUBLIC_NEW_DESIGN_LANDING=false
NEXT_PUBLIC_NEW_DESIGN_PHASE1=false
# ...
```

### Guardrail 6 — Visual Regression Tests

Adicionar screenshot tests com Playwright:

```typescript
// e2e/visual-regression/landing.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Landing Page — Visual Regression', () => {
  test('hero section matches design', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="hero-section"]')).toHaveScreenshot(
      'landing-hero.png',
      { maxDiffPixelRatio: 0.02 } // 2% tolerance
    )
  })

  test('feature grid matches design', async ({ page }) => {
    await page.goto('/')
    const featureGrid = page.locator('[data-testid="feature-grid"]')
    await featureGrid.scrollIntoViewIfNeeded()
    await expect(featureGrid).toHaveScreenshot(
      'landing-features.png',
      { maxDiffPixelRatio: 0.02 }
    )
  })
})

// e2e/visual-regression/phase1.spec.ts
test.describe('Phase 1 — Visual Regression', () => {
  test('form card matches design', async ({ page }) => {
    // Login primeiro
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@test.com')
    await page.fill('[data-testid="password-input"]', 'Test1234!')
    await page.click('[data-testid="login-button"]')

    // Navegar para fase 1
    await page.goto('/expedicoes/nova')
    await expect(page.locator('[data-testid="phase1-form-card"]')).toHaveScreenshot(
      'phase1-form.png',
      { maxDiffPixelRatio: 0.02 }
    )
  })
})
```

Para atualizar os baselines após migração intencional:

```bash
npx playwright test --update-snapshots
```

---

## 4. Planejamento de Sprints

### Sprint 33 — "Fundação do Design System"

**Objetivo:** Criar toda a infraestrutura de design sem mudar nenhum visual existente.

| #  | Task                                          | Responsável      | Critério de Aceite                                  |
|----|-----------------------------------------------|------------------|-----------------------------------------------------|
| 1  | Importar DESIGN.md e exports do Stitch        | PO               | Arquivos em `docs/design/`, commitados               |
| 2  | Configurar Stitch MCP no Claude Code          | DevOps           | `list_projects` retorna projetos do Stitch           |
| 3  | Instalar Stitch Skills (react:components, etc)| DevOps           | Skills disponíveis no Claude Code                    |
| 4  | Traduzir DESIGN.md → `tailwind.config.ts`     | Fullstack Dev 1  | Config compilando, sem erros                         |
| 5  | Instalar e configurar fontes (Outfit, DM Sans)| Fullstack Dev 1  | Fontes renderizando no browser                       |
| 6  | Criar variáveis CSS globais                   | Fullstack Dev 1  | `globals.css` com tokens, app renderizando           |
| 7  | Criar componente `Button` (3 variantes)       | Fullstack Dev 1  | Componente + testes unitários passando               |
| 8  | Criar componente `Input` (com ícone/label)    | Fullstack Dev 2  | Componente + testes unitários passando               |
| 9  | Criar componente `Card`                       | Fullstack Dev 2  | Componente + testes unitários passando               |
| 10 | Criar componente `Chip` (selectable)          | Fullstack Dev 1  | Componente + testes unitários passando               |
| 11 | Criar componente `Badge`                      | Fullstack Dev 2  | Componente + testes unitários passando               |
| 12 | Criar componente `PhaseProgress`              | Fullstack Dev 1  | Componente + testes unitários passando               |
| 13 | Criar componente `StepperInput`               | Fullstack Dev 2  | Componente + testes unitários passando               |
| 14 | Implementar feature flag system               | Fullstack Dev 2  | Flags funcionando, todas desligadas por padrão       |
| 15 | Atualizar agent prompts com design rules      | PO / Prompt Eng  | Prompts atualizados em `memory/`                     |
| 16 | Configurar ESLint rules de design             | Tech Lead        | Lint passa, cores fora do sistema geram erro         |
| 17 | Adicionar setup de visual regression tests    | QA Engineer      | Playwright screenshot tests rodando (baselines antigos)|
| 18 | Security review dos novos componentes         | Security Spec    | Nenhum XSS, inputs sanitizados                       |
| 19 | Rodar suite E2E completa (baseline)           | QA Engineer      | 121+ testes verdes = nada quebrou                    |
| 20 | Sprint review + documentação                  | Tech Lead        | Sprint review em `docs/sprint-reviews/`              |

**Definition of Done Sprint 33:**
- [ ] Todos componentes UI criados com testes
- [ ] Tailwind config com tokens do design system
- [ ] Feature flags implementadas (todas OFF)
- [ ] Agent prompts atualizados
- [ ] E2E baseline verde (nenhum visual mudou)
- [ ] Zero impacto na aplicação existente

---

### Sprint 34 — "Landing Page + Login (Design V2)"

**Objetivo:** Migrar as telas de entrada usando os componentes do Sprint 33.

| #  | Task                                          | Responsável      | Critério de Aceite                                  |
|----|-----------------------------------------------|------------------|-----------------------------------------------------|
| 1  | Criar `LandingPageV2` — Hero Section          | Fullstack Dev 1  | Fiel ao screenshot do Stitch                         |
| 2  | Criar `LandingPageV2` — Social Proof Bar      | Fullstack Dev 1  | Números animados, responsivo                         |
| 3  | Criar `LandingPageV2` — How It Works          | Fullstack Dev 1  | 3 cards com glassmorphism, hover                     |
| 4  | Criar `LandingPageV2` — Feature Bento Grid    | Fullstack Dev 2  | 2x2 layout com previews                             |
| 5  | Criar `LandingPageV2` — CTA Banner            | Fullstack Dev 2  | Gradient amber, botão funcional                      |
| 6  | Criar `LandingPageV2` — Footer                | Fullstack Dev 2  | Links, social icons, LGPD                            |
| 7  | Criar `LoginPageV2`                           | Fullstack Dev 1  | Form funcional com novos componentes UI              |
| 8  | Integrar feature flag `NEW_DESIGN_LANDING`    | Fullstack Dev 1  | Flag ON → V2, Flag OFF → V1                         |
| 9  | Integrar feature flag `NEW_DESIGN_LOGIN`      | Fullstack Dev 2  | Flag ON → V2, Flag OFF → V1                         |
| 10 | Visual regression baselines (V2)              | QA Engineer      | Screenshots tirados com flag ON                      |
| 11 | Teste responsivo (mobile 375px, tablet 768px) | QA Engineer      | Layout não quebra em nenhum breakpoint               |
| 12 | Ativar flags no staging                       | DevOps           | Staging mostrando design V2                          |
| 13 | Rodar suite E2E com flags ON                  | QA Engineer      | Todos E2E verdes (atualizar seletores se necessário) |
| 14 | Rodar suite E2E com flags OFF                 | QA Engineer      | Todos E2E verdes (V1 intacto)                        |
| 15 | PO review visual no staging                   | PO               | Aprovação formal do design                           |
| 16 | Sprint review + documentação                  | Tech Lead        | Sprint review documentado                            |

**Definition of Done Sprint 34:**
- [ ] Landing V2 e Login V2 funcionando no staging
- [ ] Feature flags controlando V1 ↔ V2
- [ ] E2E verde com flags ON e OFF
- [ ] PO aprovou o visual
- [ ] Flags ainda OFF em produção

---

### Sprint 35 — "Migração das Fases 1–6"

**Objetivo:** Migrar o fluxo principal da expedição.

| #  | Task                                          | Responsável      | Critério de Aceite                                  |
|----|-----------------------------------------------|------------------|-----------------------------------------------------|
| 1  | Gerar designs das Fases 2–6 no Stitch         | PO               | Screenshots + HTML exportados para cada fase         |
| 2  | Criar `PhaseLayoutV2` (wrapper das fases)     | Fullstack Dev 1  | PhaseProgress V2, breadcrumb, PA counter             |
| 3  | Criar `Phase1FormV2` — A Inspiração           | Fullstack Dev 1  | Autocomplete, chips, stepper, usando componentes ui/ |
| 4  | Criar `Phase2FormV2` — O Perfil               | Fullstack Dev 2  | Chips/toggles de preferência com novo design         |
| 5  | Criar `Phase3V2` — O Preparo                  | Fullstack Dev 1  | Checklist AI com novo visual                         |
| 6  | Criar `Phase4V2` — A Logística                | Fullstack Dev 2  | 3 wizard steps com novo design                       |
| 7  | Criar `Phase5V2` — Guia do Destino            | Fullstack Dev 1  | Cards informativos com novo visual                   |
| 8  | Criar `Phase6V2` — Roteiro                    | Fullstack Dev 2  | Itinerário + mapa Leaflet com novo design            |
| 9  | Criar `DashboardV2` — Meu Atlas               | Fullstack Dev 1  | Lista de expedições com cards V2                     |
| 10 | Criar `SummaryPageV2` — Sumário               | Fullstack Dev 2  | Página de sumário com novo visual                    |
| 11 | Integrar feature flags por fase               | Fullstack Dev 2  | Cada fase com flag independente                      |
| 12 | Visual regression baselines (todas as fases)  | QA Engineer      | Screenshots de todas as telas V2                     |
| 13 | E2E com todas flags ON no staging             | QA Engineer      | Suite completa verde                                 |
| 14 | E2E com todas flags OFF                       | QA Engineer      | Suite completa verde (V1 intacto)                    |
| 15 | Teste de fluxo completo V2 (ponta a ponta)    | QA Engineer      | Criar expedição do zero até roteiro no staging       |
| 16 | Accessibility review (contraste, ARIA labels) | Security Spec    | WCAG 2.1 AA compliance nos componentes V2            |
| 17 | Performance review (LCP, CLS)                 | Tech Lead        | LCP < 2.5s, CLS < 0.1 com design novo               |
| 18 | PO review de todas as telas no staging        | PO               | Aprovação formal de cada fase                        |
| 19 | Remover V1 code (após aprovação total)        | Fullstack Devs   | Código V1 removido, flags removidas                  |
| 20 | Sprint review + documentação                  | Tech Lead        | Sprint review documentado                            |

**Definition of Done Sprint 35:**
- [ ] Todas as fases migradas e aprovadas no staging
- [ ] Fluxo ponta-a-ponta funcionando com design V2
- [ ] E2E suite verde
- [ ] Performance dentro dos targets
- [ ] Código V1 removido (single code path)

---

### Sprint 36 — "Polish & Beta Launch"

**Objetivo:** Refinamentos finais e lançamento beta.

| #  | Task                                          | Responsável      | Critério de Aceite                                  |
|----|-----------------------------------------------|------------------|-----------------------------------------------------|
| 1  | Polish visual — ajustes finos pós-review      | Fullstack Devs   | Pixel-perfect com screenshots do Stitch              |
| 2  | Micro-animações e transições                  | Fullstack Dev 1  | Fade-in em cards, hover states polidos               |
| 3  | Empty states e loading skeletons              | Fullstack Dev 2  | Todas telas com empty/loading states V2              |
| 4  | Error states visuais                          | Fullstack Dev 2  | Toast notifications, form errors com novo design     |
| 5  | Gamificação visual (Pontos Atlas, badges)     | Fullstack Dev 1  | Visual integrado com design system                   |
| 6  | Dark mode (opcional — se tempo permitir)      | Fullstack Dev 1  | Toggle funcional, paleta dark definida               |
| 7  | SEO da Landing Page                           | Fullstack Dev 2  | Meta tags, OG image, structured data                 |
| 8  | Manual test completo v2 (54 cenários)         | QA Engineer      | Checklist 100% verde                                 |
| 9  | E2E suite final                               | QA Engineer      | 100% verde no staging                                |
| 10 | Visual regression final                       | QA Engineer      | Nenhuma regressão visual                             |
| 11 | Security audit final                          | Security Spec    | Zero vulnerabilidades                                |
| 12 | Performance audit (Lighthouse)                | Tech Lead        | Score > 90 em todas categorias                       |
| 13 | FinOps review (custos de infra com novo design)| FinOps Eng      | Nenhum aumento inesperado de custos                  |
| 14 | Atualizar DESIGN.md com ajustes finais        | PO               | Documento reflete o estado real                      |
| 15 | Release notes e changelog                     | Release Manager  | v0.30.0 documentado                                 |
| 16 | Deploy produção                               | DevOps           | Beta live com design V2                              |
| 17 | Sprint review final                           | Tech Lead        | Documentação completa                                |

**Definition of Done Sprint 36:**
- [ ] Todas as telas com design V2 em produção
- [ ] Testes manuais + automatizados passando
- [ ] Performance, security, e acessibilidade validados
- [ ] Beta Launch concluído

---

## 5. Spec SDD: Design Migration

### Dimensão PROD (Produto)

- **Objetivo:** Profissionalizar a interface do Atlas com design gerado no Google Stitch
- **Escopo:** Todas as telas do app (Landing, Login, Dashboard, 6 Fases, Sumário)
- **Fora do escopo:** Lógica de negócio, APIs, banco de dados
- **Sucesso:** Usuários beta percebem o app como "profissional e confiável"

### Dimensão UX

- **Source of truth:** `docs/design/DESIGN.md`
- **Referência visual:** Screenshots em `docs/design/screenshots/`
- **Componentes:** Library em `src/components/ui/`
- **Regra:** Nenhum componente UI ad-hoc permitido

### Dimensão TECH

- **Framework:** Next.js 15 + Tailwind CSS (existente)
- **Fontes:** Outfit (display) + DM Sans (body) via @fontsource
- **Componentes:** React functional components com TypeScript
- **Feature flags:** Environment variables `NEXT_PUBLIC_NEW_DESIGN_*`
- **Build:** Zero warnings de TypeScript/ESLint

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
- **E2E:** Suite existente + visual regression tests
- **Manual:** Checklist de 54 cenários atualizado para V2
- **Baselines:** Screenshots Playwright para cada tela

### Dimensão INFRA

- **Fontes:** Self-hosted via @fontsource (sem CDN externo)
- **Bundle size:** Monitorar impacto das novas fontes (< 100KB total)
- **Stitch MCP:** Conexão apenas em desenvolvimento, não em produção

### Dimensão RELEASE

- **Sprint 33:** v0.28.0 (fundação, sem mudança visual)
- **Sprint 34:** v0.29.0 (landing + login V2, flags OFF em prod)
- **Sprint 35:** v0.30.0-rc (todas fases V2, staging only)
- **Sprint 36:** v0.30.0 (Beta Launch com design V2)

### Dimensão COST

- **Google Stitch:** Gratuito (350 gerações/mês standard)
- **@fontsource:** Open source, custo zero
- **Bundle size:** Impacto mínimo em bandwidth (~50-100KB de fontes)
- **Tempo de desenvolvimento:** 4 sprints dedicados
- **Stitch MCP:** Sem custo adicional de infra

---

## 6. Riscos e Mitigações

| Risco                                    | Probabilidade | Impacto | Mitigação                                                |
|------------------------------------------|:------------:|:-------:|----------------------------------------------------------|
| E2E tests quebram com novo design         | Alta         | Médio   | Feature flags + atualizar seletores na mesma PR           |
| Design do Stitch não fica bom em código   | Média        | Alto    | Piloto com 2 telas antes de comprometer o sprint plan     |
| Performance degrada com fontes/animações  | Baixa        | Alto    | Lighthouse audit a cada sprint + font subsetting          |
| Agentes não respeitam design system       | Média        | Médio   | ESLint rules + agent prompts + code review do tech-lead   |
| Stitch MCP falha/muda de API              | Baixa        | Baixo   | HTML/CSS já exportado como fallback, não depende do MCP   |
| Sprint 35 não cabe todas as 6 fases      | Média        | Médio   | Priorizar Fases 1-3, migrar 4-6 no Sprint 36 se preciso  |
| Design drift com o tempo pós-launch      | Alta         | Alto    | ESLint + visual regression em CI + component library       |

---

## 7. Checklist de Validação Final (Beta Launch)

### Visual
- [ ] Todas as telas correspondem aos screenshots do Stitch
- [ ] Paleta de cores consistente em todas as telas
- [ ] Tipografia (Outfit + DM Sans) renderizando corretamente
- [ ] Responsivo: Mobile (375px), Tablet (768px), Desktop (1440px)
- [ ] Dark mode funcional (se implementado)
- [ ] Animações suaves, sem jank

### Funcional
- [ ] Fluxo completo: Landing → Login → Criar Expedição → Fase 1-6 → Sumário
- [ ] Autocomplete de cidades funcionando
- [ ] Mapa Leaflet renderizando pins
- [ ] Streaming AI responses com novo design
- [ ] Gamificação (Pontos Atlas, badges) visual integrado
- [ ] "Coming Soon" cards nas fases 7-8

### Qualidade
- [ ] 2172+ testes unitários passando
- [ ] 121+ E2E tests passando
- [ ] Visual regression tests passando
- [ ] Zero erros no console do browser
- [ ] Zero warnings de TypeScript/ESLint
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 90
- [ ] WCAG 2.1 AA compliance

### Segurança & Compliance
- [ ] Inputs sanitizados contra XSS
- [ ] ARIA labels em todos componentes interativos
- [ ] Footer LGPD compliant
- [ ] CSP headers permitindo fontes self-hosted

### Documentação
- [ ] DESIGN.md atualizado com estado final
- [ ] Sprint reviews documentados (33-36)
- [ ] Changelog v0.30.0 publicado
- [ ] Component library documentada (props, variantes)
