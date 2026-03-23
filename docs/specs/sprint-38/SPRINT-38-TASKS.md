# Sprint 38 -- Breakdown de Tarefas (v2.0.0 -- UX Parecer Applied)

**Versao**: 2.0.0
**Data**: 2026-03-23
**Autor**: tech-lead (based on product-owner v1.0.0, corrected per UX Parecer)
**Sprint**: 38 -- "Fundacao do Design System"
**Versao alvo**: v0.33.0
**Budget**: 50h (Track 1: 22h | Track 2: 25h | Cross-cutting: 3h)
**Specs**: SPEC-PROD-046, SPEC-PROD-047
**Source of truth**: `docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md` (overrides DESIGN.md)
**Design reference**: UX Parecer > DESIGN.md > SCREEN-INDEX.md

---

## CORRECOES APLICADAS (v1.0.0 -> v2.0.0)

O UX Parecer revelou divergencias significativas entre o DESIGN.md e os exports Stitch reais. As seguintes correcoes foram aplicadas a TODAS as tarefas:

| # | Original (v1.0.0) | Corrigido (v2.0.0) | Justificativa |
|---|---|---|---|
| F1 | Fontes: Outfit + DM Sans | **Plus Jakarta Sans + Work Sans** | UX Parecer Secao 1.2: exports usam consistentemente Plus Jakarta Sans (headlines) e Work Sans (body). Outfit/DM Sans NAO aparecem nos exports. |
| F2 | 8 cores (navy-900, amber-500, etc.) | **40+ tokens com prefixo `atlas-`** (Material Design 3 palette) | UX Parecer Secao 1.1: DESIGN.md tem 7 tokens; exports usam 40+ tokens M3. Paleta completa obrigatoria. |
| F3 | CTA Button: texto branco sobre amber-500 | **Texto `atlas-primary` (#040d1b navy) sobre `atlas-secondary-container` (#fe932c)** | UX Parecer Secao 2.1: branco sobre laranja = 2.3:1 contrast ratio. FALHA WCAG AA. Navy sobre laranja = 7.5:1. PASSA. |
| F4 | Focus: nao especificado / exports usam focus:ring-0 | **Todos interativos: `focus-visible:ring-2 focus-visible:ring-atlas-secondary-container focus-visible:ring-offset-2`** | UX Parecer Secao 4.4: focus:ring-0 remove indicador de foco. Violacao WCAG 2.1 AA criterio 2.4.7. |
| F5 | Touch targets: nao especificado | **Todos elementos interativos >= 44px** | UX Parecer Secao 4.3: stepper buttons 32px, chips 28px, icon buttons 40px -- todos FALHAM. |
| F6 | 2 sombras (soft, elevated) | **8 sombras incluindo 2 glow effects** | UX Parecer Secao 1.5: exports usam 6+ sombras + glow amber/primary. |
| F7 | 3 border-radius | **6 niveis de border-radius** | UX Parecer Secao 1.4: exports usam 4px, 8px, 12px, 16px, 24px, 9999px. |
| F8 | 9 tokens semanticos ausentes | **warning, success, info, disabled, disabled-bg, focus-ring, warning-container, success-container, info-container ADICIONADOS** | UX Parecer Secao 1.1 (tokens adicionados pelo UX). |
| F9 | Tokens sem prefixo (navy.900, amber.500) | **Prefixo `atlas-` obrigatorio**: `atlas.primary`, `atlas.secondary-container` | UX Parecer Secao 5.1: evita colisao com classes Tailwind padrao. |
| F10 | prefers-reduced-motion nao mencionado | **Obrigatorio globalmente em globals.css** | UX Parecer Secao 4.5. |
| F11 | Tipografia: 4 tamanhos | **11 niveis tipograficos** (display 60-72px ate micro 10px) | UX Parecer Secao 1.2: exports usam 8+ tamanhos distintos. |

---

## Restricao Global

**NENHUMA tarefa deste sprint pode alterar visuais existentes.**

Toda mudanca de comportamento visual deve ser protegida por `NEXT_PUBLIC_DESIGN_V2=true`. Em staging e producao, a flag permanece `false`. O produto deve ser identico ao v0.32.0 do ponto de vista do usuario final.

Qualquer PR que altere um visual existente (verificado pelos screenshots de regressao) e **automaticamente rejeitado**, independentemente da qualidade do codigo.

---

## Track 1 -- dev-fullstack-1: Design Tokens e Infraestrutura

**Spec**: SPEC-PROD-046 (REQ-DS-001 a REQ-DS-008)
**Estimativa total**: 22h
**Pode iniciar**: imediatamente (sem dependencia de Track 2)

---

### T1.1 -- Extracao e Catalogacao de TODOS os Tokens do UX Parecer

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-046 (prerrequisito para T1.2)
**Assigned to**: dev-fullstack-1

**O que fazer**:
- Ler `docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md` na integra (SOURCE OF TRUTH)
- Criar arquivo de referencia listando TODOS os valores a serem tokenizados:
  - **40+ cores** da paleta M3 (Secao 1.1): primary, primary-container, primary-fixed, primary-fixed-dim, on-primary, on-primary-container, on-primary-fixed, on-primary-fixed-variant, inverse-primary, secondary, secondary-container, secondary-fixed, secondary-fixed-dim, on-secondary, on-secondary-container, on-secondary-fixed, on-secondary-fixed-variant, tertiary, tertiary-container, tertiary-fixed, tertiary-fixed-dim, on-tertiary, on-tertiary-container, on-tertiary-fixed, on-tertiary-fixed-variant, surface, surface-dim, surface-bright, surface-variant, surface-tint, surface-container-lowest, surface-container-low, surface-container, surface-container-high, surface-container-highest, background, on-surface, on-surface-variant, on-background, inverse-surface, inverse-on-surface, outline, outline-variant, error, error-container, on-error, on-error-container
  - **9 tokens semanticos adicionados pelo UX**: warning, warning-container, success, success-container, info, info-container, focus-ring, disabled, disabled-bg
  - **6 border-radius**: atlas-sm (4px), atlas-md (8px), atlas-lg (12px), atlas-xl (16px), atlas-2xl (24px), atlas-full (9999px)
  - **8 sombras + 2 glow**: atlas-shadow-xs through 2xl + glow-amber + glow-primary
  - **11 font-size levels**: display, h1, h2, h3, h4, body, body-medium, small, caption, micro, button
  - **15 spacing tokens**: 0.5 (2px) through 30 (120px) on 4px base
  - **2 font families**: Plus Jakarta Sans (headlines), Work Sans (body)
  - **5 transition tokens**: fast (150ms), base (200ms), slow (300ms), image (700ms), progress (1000ms)
- Documentar como cada token mapeia para a nomenclatura Tailwind com prefixo `atlas-`
- **Output**: `src/lib/design-tokens.ts` (exportable token catalog) + comment block in tailwind.config.ts

**Criterios de conclusao**:
- [ ] Todos os 40+ color tokens do UX Parecer catalogados com hex, nome Tailwind e uso
- [ ] 9 tokens semanticos (warning, success, info, disabled, focus-ring + containers) incluidos
- [ ] Mapeamento completo: token name -> Tailwind class -> CSS custom property

---

### T1.2 -- Atualizacao do tailwind.config.ts com Design Tokens Completos

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-046 REQ-DS-001
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.1

**O que fazer**:
- Estender (NAO substituir) a secao `theme.extend` do `tailwind.config.ts`
- **Cores** dentro de `colors.atlas`:
  ```
  atlas: {
    primary: '#040d1b',
    'primary-container': '#1a2332',
    'primary-fixed': '#dae3f7',
    'primary-fixed-dim': '#bec7db',
    'on-primary': '#ffffff',
    'on-primary-container': '#818a9d',
    'on-primary-fixed': '#131c2a',
    'on-primary-fixed-variant': '#3e4758',
    'inverse-primary': '#bec7db',
    secondary: '#904d00',
    'secondary-container': '#fe932c',
    'secondary-fixed': '#ffdcc3',
    'secondary-fixed-dim': '#ffb77d',
    'on-secondary': '#ffffff',
    'on-secondary-container': '#663500',
    'on-secondary-fixed': '#2f1500',
    'on-secondary-fixed-variant': '#6e3900',
    tertiary: '#00100d',
    'tertiary-container': '#002824',
    'tertiary-fixed': '#89f5e7',
    'tertiary-fixed-dim': '#6bd8cb',
    'on-tertiary': '#ffffff',
    'on-tertiary-container': '#1c9a8e',
    'on-tertiary-fixed': '#00201d',
    'on-tertiary-fixed-variant': '#005049',
    surface: '#f9f9f9',
    'surface-dim': '#dadada',
    'surface-bright': '#f9f9f9',
    'surface-variant': '#e2e2e2',
    'surface-tint': '#565f70',
    'surface-container-lowest': '#ffffff',
    'surface-container-low': '#f3f3f3',
    'surface-container': '#eeeeee',
    'surface-container-high': '#e8e8e8',
    'surface-container-highest': '#e2e2e2',
    background: '#f9f9f9',
    'on-surface': '#1a1c1c',
    'on-surface-variant': '#45474c',
    'on-background': '#1a1c1c',
    'inverse-surface': '#2f3131',
    'inverse-on-surface': '#f0f1f1',
    outline: '#75777d',
    'outline-variant': '#c5c6cc',
    error: '#ba1a1a',
    'error-container': '#ffdad6',
    'on-error': '#ffffff',
    'on-error-container': '#93000a',
    warning: '#f59e0b',
    'warning-container': '#fffbeb',
    success: '#10b981',
    'success-container': '#ecfdf5',
    info: '#3b82f6',
    'info-container': '#eff6ff',
    'focus-ring': '#fe932c',
    disabled: '#9ca3af',
    'disabled-bg': '#f3f4f6',
  }
  ```
- **Border-radius** dentro de `borderRadius`:
  - `'atlas-sm': '4px'`, `'atlas-md': '8px'`, `'atlas-lg': '12px'`, `'atlas-xl': '16px'`, `'atlas-2xl': '24px'`
  - (atlas-full = 9999px already covered by Tailwind's `rounded-full`)
- **Sombras** dentro de `boxShadow`:
  - `'atlas-xs'`, `'atlas-sm'`, `'atlas-md'`, `'atlas-lg'`, `'atlas-xl'`, `'atlas-2xl'`
  - `'atlas-glow-amber'`: `'0 0 12px rgba(254, 147, 44, 0.4)'`
  - `'atlas-glow-primary'`: `'0 0 12px rgba(4, 13, 27, 0.2)'`
- **Font-size** dentro de `fontSize`:
  - `'atlas-display'`: `['60px', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em' }]`
  - `'atlas-h1'`: `['36px', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em' }]`
  - `'atlas-h2'`: `['28px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }]`
  - `'atlas-h3'`: `['20px', { lineHeight: '1.3', fontWeight: '700' }]`
  - `'atlas-h4'`: `['18px', { lineHeight: '1.4', fontWeight: '700' }]`
  - `'atlas-body'`: `['16px', { lineHeight: '1.6', fontWeight: '400' }]`
  - `'atlas-body-medium'`: `['16px', { lineHeight: '1.6', fontWeight: '500' }]`
  - `'atlas-small'`: `['14px', { lineHeight: '1.5', fontWeight: '500' }]`
  - `'atlas-caption'`: `['12px', { lineHeight: '1.4', fontWeight: '600' }]`
  - `'atlas-micro'`: `['10px', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '0.1em' }]`
  - `'atlas-button'`: `['14px', { lineHeight: '1', fontWeight: '700' }]`
- **Font-family** dentro de `fontFamily`:
  - `'atlas-headline'`: `['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif']`
  - `'atlas-body'`: `['"Work Sans"', 'system-ui', '-apple-system', 'sans-serif']`
- **Spacing** dentro de `spacing`:
  - `'atlas-0.5': '2px'`, `'atlas-1': '4px'`, `'atlas-1.5': '6px'`, `'atlas-2': '8px'`, `'atlas-3': '12px'`, `'atlas-4': '16px'`, `'atlas-5': '20px'`, `'atlas-6': '24px'`, `'atlas-8': '32px'`, `'atlas-10': '40px'`, `'atlas-12': '48px'`, `'atlas-16': '64px'`, `'atlas-20': '80px'`, `'atlas-24': '96px'`, `'atlas-30': '120px'`
- **Transitions** dentro de `transitionDuration`:
  - `'atlas-fast': '150ms'`, `'atlas-base': '200ms'`, `'atlas-slow': '300ms'`, `'atlas-image': '700ms'`, `'atlas-progress': '1000ms'`

**Criterios de conclusao**:
- [ ] `npm run build` passa sem erros
- [ ] Classes como `bg-atlas-primary`, `text-atlas-on-surface`, `shadow-atlas-md`, `rounded-atlas-lg`, `font-atlas-headline` funcionam
- [ ] Nenhuma classe Tailwind existente quebrada (apenas `extend`, zero `replace`)
- [ ] 40+ color tokens + 9 semantic tokens configurados
- [ ] AC-001, AC-002, AC-003, AC-004 de SPEC-PROD-046 verificaveis

---

### T1.3 -- Instalacao e Configuracao de Fontes (Plus Jakarta Sans + Work Sans)

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-046 REQ-DS-002
**Assigned to**: dev-fullstack-1
**Dependencia**: nenhuma (pode ser paralelo a T1.2)

**O que fazer**:
- Instalar **Plus Jakarta Sans** e **Work Sans** via `next/font/google` (NAO via Google Fonts CDN -- UX Parecer Secao 5.5)
- Configurar com:
  - `subsets: ['latin']` (cobre PT-BR e EN)
  - `display: 'swap'` (evita FOIT)
  - `variable`: CSS variables `--font-plus-jakarta` e `--font-work-sans`
  - Weights:
    - Plus Jakarta Sans: 400, 500, 600, 700, 800 (UX Parecer Secao 1.2)
    - Work Sans: 400, 500
- Aplicar as variaveis CSS no elemento `<html>` ou `<body>` no layout raiz
- **IMPORTANTE**: As fontes sao configuradas mas as classes `font-atlas-headline` e `font-atlas-body` so serao aplicadas pelos novos componentes (com flag true). O layout raiz existente NAO deve mudar a fonte default.

**ATENCAO -- MUDANCA vs v1.0.0**: Fontes originais (Outfit + DM Sans) foram SUBSTITUIDAS por Plus Jakarta Sans + Work Sans conforme UX Parecer.

**Criterios de conclusao**:
- [ ] Plus Jakarta Sans e Work Sans carregam corretamente com `NEXT_PUBLIC_DESIGN_V2=true`
- [ ] `font-display: swap` configurado (verificavel no Network tab)
- [ ] CSS variables `--font-plus-jakarta` e `--font-work-sans` disponiveis
- [ ] AC-005, AC-019, AC-020 de SPEC-PROD-046 verificaveis com flag true
- [ ] Build continua limpo

---

### T1.4 -- Variaveis CSS Globais em globals.css

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-046 REQ-DS-003
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.3 (precisa das variaveis de fonte definidas)

**O que fazer**:
- Adicionar bloco `:root { }` em `src/app/globals.css` com:
  - Todas as 40+ cores como `--atlas-primary: #040d1b;` etc.
  - 9 tokens semanticos: `--atlas-warning: #f59e0b;` etc.
  - Referencias de fonte: `--atlas-font-headline: var(--font-plus-jakarta);`, `--atlas-font-body: var(--font-work-sans);`
  - Tokens de spacing criticos como custom properties
  - Comentario: "Design System v1 -- source: UX-PARECER-DESIGN-SYSTEM.md"
- Bloco `[data-theme="dark"] { }` vazio e comentado (prep para dark mode futuro)
- **OBRIGATORIO** (UX Parecer Secao 4.5): Adicionar bloco `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

**Criterios de conclusao**:
- [ ] 40+ cores + 9 tokens semanticos como variaveis CSS em `:root`
- [ ] prefers-reduced-motion media query implementada
- [ ] AC-007 de SPEC-PROD-046 verificavel (variaveis visiveis no DevTools)
- [ ] Build continua limpo

---

### T1.5 -- Sistema de Feature Flag NEXT_PUBLIC_DESIGN_V2

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-046 REQ-DS-005
**Assigned to**: dev-fullstack-1
**Dependencia**: nenhuma

**O que fazer**:

Criar `src/lib/design-system.ts`:
```
// Feature flag para Design System v2
// Default: false -- o app e identico ao v0.32.0 com flag off
export function isDesignV2Enabled(): boolean
export function useDesignV2(): boolean  // hook React
```

Criar `src/components/ui/DesignBranch.tsx`:
```
// Componente utilitario para renderizacao condicional
// <DesignBranch v2={<NovoComponente />} legacy={<ComponenteAntigo />} />
```

Adicionar `NEXT_PUBLIC_DESIGN_V2=false` ao `.env.example` e ao `.env.local` (sem sobrescrever)

Criar `src/components/ui/README.md` com:
- Secao "Feature Flag" explicando o mecanismo
- Como ativar localmente para desenvolvimento
- Aviso sobre nao ativar em staging/producao ate Sprint 39

**Criterios de conclusao**:
- [ ] `isDesignV2Enabled()` retorna `false` quando env ausente ou `false`
- [ ] `isDesignV2Enabled()` retorna `true` apenas quando `NEXT_PUBLIC_DESIGN_V2=true`
- [ ] `useDesignV2()` funciona em componentes React client-side
- [ ] AC-009, AC-010 de SPEC-PROD-046 verificaveis
- [ ] Testes unitarios cobrem ambos os branches

---

### T1.6 -- Regras ESLint para Tokens de Design

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-046 REQ-DS-006
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.2 (tokens devem estar definidos)

**O que fazer**:
- Configurar regras que emitam `warn` (NAO `error`) quando:
  - Valor de cor hex que corresponde a um token usado de forma arbitraria (ex: `text-[#040d1b]` -> sugere `text-atlas-primary`)
  - Valor de font-size arbitrario que corresponde a um token
  - Classes Tailwind padrao que mapeiam para tokens atlas (ex: `text-slate-900` -> sugere `text-atlas-primary`)
- Severidade `warn` para nao bloquear CI durante transicao
- Documentar regras em `src/components/ui/README.md` (secao "Linting")

**Criterios de conclusao**:
- [ ] `npm run lint` continua passando (sem novos errors)
- [ ] AC-011 de SPEC-PROD-046 verificavel (warn aparece para valores hardcoded)
- [ ] Documentacao das regras em README.md

---

### T1.7 -- Setup de Regressao Visual com Screenshots Playwright

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-046 REQ-DS-007
**Assigned to**: dev-fullstack-1
**Dependencia**: T2.1-T2.7 devem estar completos para baseline ser significativo

**O que fazer**:
- Configurar Playwright para captura de screenshots de baseline:
  - Landing Page (`/en` ou `/pt`)
  - Dashboard / Expeditions
  - Phase 1 wizard
  - Phase 3 checklist
  - Phase 6 itinerary
- Viewports: mobile (375x812) e desktop (1280x800)
- Screenshots salvas em `e2e/visual-regression/baseline/`
- Script de comparacao que falha se pixel diff > 0.1%
- Job `visual-regression` no CI: executa apenas em PRs que tocam UI files

**Criterios de conclusao**:
- [ ] 10 screenshots de baseline (5 paginas x 2 viewports)
- [ ] Script de comparacao funciona e falha com diff simulado
- [ ] AC-012, AC-013 de SPEC-PROD-046 verificaveis
- [ ] Screenshots commitadas no repositorio

---

### T1.8 -- Testes Unitarios: Feature Flag e Utilitarios de Token

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-046 AC-008, AC-009, AC-010
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.5

**O que fazer**:
- Testes para `isDesignV2Enabled()`:
  - Retorna `false` quando env nao definida
  - Retorna `false` quando `NEXT_PUBLIC_DESIGN_V2=false`
  - Retorna `true` quando `NEXT_PUBLIC_DESIGN_V2=true`
- Testes para `useDesignV2()`:
  - Comportamento igual em contexto React
- Testes para `DesignBranch`:
  - Renderiza `legacy` quando flag e `false`
  - Renderiza `v2` quando flag e `true`
  - Nenhum vazamento entre branches

**Criterios de conclusao**:
- [ ] Cobertura >= 80% para `src/lib/design-system.ts`
- [ ] Cobertura >= 80% para `src/components/ui/DesignBranch.tsx`
- [ ] Todos os testes passam

---

## Track 2 -- dev-fullstack-2: Biblioteca de Componentes

**Spec**: SPEC-PROD-047
**Estimativa total**: 25h
**Dependencia de entrada**: T1.2 e T1.3 do Track 1 devem estar completos (tokens e fontes)
**Source of truth**: UX Parecer Secao 2 (overrides DESIGN.md and SPEC-PROD-047 where they conflict)

**Nota de coordenacao**: dev-fullstack-2 pode iniciar lendo as specs e preparando a estrutura de pastas enquanto Track 1 finaliza T1.1-T1.3. Codificacao dos componentes inicia somente apos tokens estarem disponiveis.

**Convencao de estrutura**:
```
src/components/ui/[ComponentName]/
  index.ts              (re-export)
  [ComponentName].tsx   (implementacao)
  [ComponentName].test.tsx  (testes)
```

**Regras globais para TODOS os componentes (UX Parecer)**:
1. **NUNCA texto branco sobre atlas-secondary-container** -- usar atlas-primary (#040d1b)
2. **TODOS interativos**: `focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2`
3. **TODOS touch targets >= 44px** em mobile (md e lg sizes)
4. **NUNCA classes Tailwind padrao** (slate-500, amber-500) -- apenas tokens `atlas-*`
5. **NUNCA valores arbitrarios** (`bg-[#fe932c]`) -- apenas tokens
6. **TODAS animacoes**: devem respeitar prefers-reduced-motion
7. **ForwardRef**: todos componentes interativos
8. **cva ou equivalente** para gerenciar variantes

---

### T2.1 -- Button Component

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-047 Section 3.1, UX Parecer Secao 2.1
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- **7 variantes** (UX Parecer -- nao 5 como v1.0.0):
  - `primary`: bg `atlas-secondary-container`, texto **`atlas-primary` (#040d1b navy)** (NUNCA branco), shadow `atlas-shadow-md` + glow amber
  - `primary-dark`: bg `atlas-primary`, texto `atlas-on-primary` (branco), shadow `atlas-shadow-lg`
  - `secondary`: bg `atlas-surface-container-lowest`, texto `atlas-primary`, border `atlas-outline-variant`/20%, shadow `atlas-shadow-sm`
  - `ghost`: transparent, texto `atlas-on-surface-variant`, sem sombra
  - `glass`: white/10% + backdrop-blur, texto branco, border white/30% -- para uso sobre imagens
  - `icon-only`: transparent ou surface, icone `atlas-on-surface-variant`
  - `danger`: bg vermelho, texto branco, shadow `atlas-shadow-sm`
- **3 tamanhos**: sm (36px, desktop-only), md (44px min-height), lg (48px min-height)
- **Estados**: default, hover (opacity/shadow), active (scale-[0.98] duration-200), focus-visible (ring-2 atlas-focus-ring offset-2), disabled (opacity-50), loading (spinner + aria-busy)
- Aceitar todos atributos nativos de `<button>` via spread + forwardRef
- Icon-left e icon-right slots

**CORRECAO CRITICA vs v1.0.0**: Button primary variant DEVE usar texto navy (#040d1b) sobre laranja (#fe932c). A v1.0.0 especificava "texto branco" que FALHA WCAG AA (2.3:1 contrast ratio).

**Testes obrigatorios**:
- Renderiza cada uma das 7 variantes
- Renderiza cada size
- Estado loading: impede click, tem aria-busy="true"
- Estado disabled: impede click
- **Primary variant: texto NAO e branco** (assert color token)
- Focus-visible ring presente (assert class `focus-visible:ring-2`)
- Touch target: md e lg >= 44px
- iconLeft e iconRight renderizam
- active state: scale transform aplicado

**Criterios de conclusao**:
- [ ] 7 variantes implementadas (nao 5)
- [ ] Texto CTA primary = atlas-primary (#040d1b), NUNCA branco
- [ ] Touch targets: md >= 44px, lg >= 48px
- [ ] focus-visible:ring-2 em todas variantes
- [ ] Cobertura >= 80%
- [ ] AC-001 a AC-004 de SPEC-PROD-047 passam

---

### T2.2 -- Input Component

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-047 Section 3.2, UX Parecer Secao 2.2
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- Tipos: text, email, password, search, tel, number
- **Estilos (UX Parecer -- diferem de v1.0.0)**:
  - Default bg: `atlas-surface-container-low` (#f3f3f3), border transparent
  - Focus bg: `atlas-surface-container-lowest` (#fff), border `atlas-secondary-container` (#fe932c)
  - **Focus ring: `focus-visible:ring-2 focus-visible:ring-atlas-secondary-container focus-visible:ring-offset-2`** (CORRECAO: exports usam focus:ring-0 que VIOLA WCAG)
  - Error: border `atlas-error`, ring `atlas-error`
  - Disabled: bg `atlas-disabled-bg`, text `atlas-disabled`, cursor not-allowed
- **Height minima 44px** (touch target -- UX Parecer Secao 4.3)
- Label obrigatorio (associado via htmlFor/id, pode ser sr-only)
- Helper text e error message via aria-describedby
- Password toggle com aria-label localizado
- Search variant com icon left (pl-12)

**CORRECAO CRITICA vs v1.0.0**: v1.0.0 especificava "focus ring amber-500" e "border gray-200". UX Parecer corrige: bg muda de cinza para branco no focus, border usa atlas-secondary-container, ring OBRIGATORIO (exports removiam ring -- nao implementar focus:ring-0).

**Testes obrigatorios**:
- Label e input associados corretamente
- Estado error: aria-describedby correto, borda atlas-error
- Password toggle alterna tipo
- Estado disabled bloqueia interacao
- **Focus ring presente** (assert focus-visible:ring-2, NOT ring-0)
- Height >= 44px
- Placeholder e helperText renderizam

**Criterios de conclusao**:
- [ ] Focus usa ring-2 atlas-secondary-container (NUNCA ring-0)
- [ ] Height minima 44px
- [ ] Todos estados implementados com tokens atlas-*
- [ ] Cobertura >= 80%
- [ ] AC-005 a AC-007 passam

---

### T2.3 -- Card Component

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-047 Section 3.3, UX Parecer Secao 2.3
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- **Variantes (UX Parecer define 8, Sprint 38 implementa as 4 mais usadas)**:
  - `base`: bg atlas-surface-container-lowest, border atlas-outline-variant/10-20%, rounded-atlas-lg (12px), shadow atlas-shadow-sm
  - `elevated`: bg atlas-surface-container-lowest, sem border, rounded-atlas-xl (16px), shadow atlas-shadow-xl
  - `dark`: bg atlas-primary-container, sem border, rounded-atlas-xl, sem shadow
  - `interactive`: bg atlas-surface-container-lowest, border atlas-outline-variant/10%, rounded-atlas-xl, hover shadow atlas-shadow-md
- Slots: header (optional), children (body), footer (optional)
- Quando onClick: role="button", tabIndex=0, Enter/Space
- Estado loading: skeleton
- Padding: atlas-8 (32px) padrao
- Hover behavior: interactive cards shadow increase + translate-y-[-4px]

**Testes obrigatorios**:
- 4 variantes renderizam corretamente
- Card com onClick: click, Enter, Space disparam evento
- Loading: skeleton renderiza
- Header e footer slots
- focus-visible ring em cards interativos

**Criterios de conclusao**:
- [ ] 4 variantes implementadas
- [ ] Cobertura >= 80%
- [ ] AC-008, AC-009 passam

---

### T2.4 -- Chip Component

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-047 Section 3.4, UX Parecer Secao 2.4
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- Variantes: selectable, removable, colored
- **CORRECAO touch target (UX Parecer Secao 4.3)**: exports usam py-1.5 (~28px) que FALHA 44px. Implementar: `min-h-11 py-2.5` em mobile
- Selectable: role="checkbox" ou role="radio" + aria-checked (UX Parecer)
- Selected state: bg atlas-secondary-container, text white + **checkmark icon** (nao apenas cor -- UX Parecer)
- Unselected: bg atlas-surface-container-high, text atlas-on-surface-variant
- Removable: botao X com aria-label="Remover [label]"
- rounded-full (9999px)
- Arrow key navigation support dentro de grupos

**CORRECAO vs v1.0.0**: (1) Touch target 44px obrigatorio. (2) Estado selecionado DEVE ter indicador visual alem de cor (checkmark). (3) role="checkbox"/"radio" + aria-checked obrigatorio.

**Testes obrigatorios**:
- Selectable toggle + aria-checked
- Removable dispara onRemove
- Touch target >= 44px (min-h-11)
- Selected state tem indicador visual alem de cor
- Arrow key navigation

**Criterios de conclusao**:
- [ ] Touch target >= 44px em mobile
- [ ] aria-checked + checkmark no estado selecionado
- [ ] Cobertura >= 80%
- [ ] AC-010, AC-011 passam

---

### T2.5 -- Badge Component

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-047 Section 3.5, UX Parecer Secao 2.5
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- **7 variantes** (UX Parecer -- mais que v1.0.0):
  - `status`: success/warning/error/info/locked com cores semanticas atlas-*
  - `rank`: 6 niveis (novato through lendario), bg atlas-primary, text white
  - `pa`: bg atlas-surface-container-low, border atlas-outline-variant/10, text atlas-on-surface
  - `category-overline`: text atlas-secondary, font-bold, text-xs, uppercase, tracking-widest
  - `counter`: bg atlas-primary-container ou atlas-secondary-fixed, rounded-full, text micro
  - `ai-tip`: text atlas-secondary-fixed-dim, uppercase, tracking-widest
  - `notification`: bg atlas-secondary-container, text white, cap 99+
- PA badge: formata com Intl.NumberFormat (separador de milhar PT-BR)
- rounded-full (9999px)
- Icones decorativos: aria-hidden="true"; icones funcionais: aria-label
- **ATENCAO contraste**: Nunca texto branco sobre atlas-secondary-container (mesma regra do Button)

**Testes obrigatorios**:
- Status success: icone e cores corretas
- Rank lendario: estilo correto
- PA formata 1500 como "1.500"
- PA formata 1000000 sem overflow
- Notification cap 99+
- Contraste: nenhum texto branco sobre laranja

**Criterios de conclusao**:
- [ ] 7 variantes implementadas
- [ ] Cobertura >= 80%
- [ ] AC-012, AC-013 passam

---

### T2.6 -- PhaseProgress Component

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-047 Section 3.6, UX Parecer Secao 2.6
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- **DECISAO UX Parecer**: Padronizar em 2 variantes (NAO 3 como nos exports):
  - `unified` (para wizards): Circulos numerados conectados por linha, labels abaixo
  - `dashboard` (para cards): Segmentos finos horizontais (h-1.5), glow no ativo

- **4 estados por step** (UX Parecer):
  - completed: bg atlas-secondary-container, check icon, text white, linha filled
  - active: bg atlas-secondary-container, icon, ring 4px white + glow-amber, aria-current="step"
  - pending: bg white, border atlas-outline-variant, numero text slate -> atlas-on-surface-variant
  - locked: bg atlas-surface-container-low, lock icon, aria-disabled="true", cursor not-allowed

- Props: phases array, layout ('unified' | 'dashboard'), onPhaseClick callback
- Nomes default das 6 fases Atlas (sobrescriveis via prop)
- Tooltip em hover para completed: "[Nome] -- [X]% completo"
- Animacao pulse CSS no estado active (respeitando reduced-motion)

**Acessibilidade**:
- `role="progressbar"` ou `role="list"` com `role="listitem"`
- `aria-valuemin=0`, `aria-valuemax=6`, `aria-valuenow=[completed count]`
- `aria-label`: "Progresso da expedicao: [N] de 6 fases concluidas"
- Locked: `aria-disabled="true"`
- Active: `aria-current="step"`

**Testes obrigatorios**:
- Renderiza 6 fases com estados corretos
- Locked NAO dispara onPhaseClick
- Completed dispara onPhaseClick
- aria-valuenow correto
- Unified e dashboard layouts renderizam
- Active state tem pulse animation class
- focus-visible ring em fases clicaveis

**Criterios de conclusao**:
- [ ] 2 layouts (unified + dashboard) implementados
- [ ] 4 estados visuais implementados
- [ ] Acessibilidade completa
- [ ] Cobertura >= 80%
- [ ] AC-014, AC-015 passam

---

### T2.7 -- StepperInput Component

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-047 Section 3.7, UX Parecer Secao 2.7
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- Props: value, min (default 0), max, step (default 1), label, subtitle (optional), onChange
- Container: bg atlas-surface-container-low, rounded-atlas-md, p-3
- **CORRECAO touch target (UX Parecer Secao 4.3)**: exports usam w-8 h-8 (32px) que FALHA. Botoes DEVEM ser **w-11 h-11 (44px)** em mobile.
- Botao -: desabilitado em min (visualmente + aria-disabled)
- Botao +: desabilitado em max
- Campo central: role="spinbutton", aria-valuenow, aria-valuemin, aria-valuemax, aria-label
- Keyboard: Arrow Up/Down, Home (min), End (max)
- Long-press (500ms) incremento continuo
- Validacao on-blur: clamp para [min, max]
- Botoes: aria-label="Diminuir [label]" e "Aumentar [label]"

**CORRECAO CRITICA vs v1.0.0**: Botoes +/- DEVEM ter 44x44px em mobile (exports tem 32px -- FALHA WCAG touch target).

**Testes obrigatorios**:
- Botao - desabilitado em min
- Botao + desabilitado em max
- onChange com valor correto
- aria-valuenow reflete valor
- aria-label dos botoes inclui label
- **Touch targets >= 44px**
- Keyboard arrows, Home, End

**Criterios de conclusao**:
- [ ] Botoes +/- sao 44x44px em mobile
- [ ] Long-press implementado
- [ ] Limites min/max respeitados
- [ ] Acessibilidade spinbutton completa
- [ ] Cobertura >= 80%
- [ ] AC-016, AC-017 passam

---

## Cross-cutting Tasks

### TC.1 -- Atualizacao do SPEC-STATUS.md

**Estimativa**: 1h
**Assigned to**: tech-lead
**Dependencia**: SPEC-PROD-046 e SPEC-PROD-047 aprovadas

**O que fazer**:
- Adicionar Sprint 38 specs ao tracker: SPEC-PROD-046, SPEC-PROD-047, UX-PARECER (UX-047), UX-048
- Atualizar prompts dos agentes dev-fullstack-1, dev-fullstack-2, ux-designer com regras de design system

**Criterios de conclusao**:
- [ ] SPEC-STATUS.md atualizado com 4+ Sprint 38 entries

---

### TC.2 -- Documento de Sprint Review

**Estimativa**: 1h
**Assigned to**: tech-lead
**Dependencia**: Sprint concluido

**O que fazer**:
- Criar `docs/sprint-reviews/SPRINT-38-review.md`
- Documentar: entregaveis, metricas, decisoes, dividas, proximos passos

**Criterios de conclusao**:
- [ ] Documento commitado antes do sprint ser marcado como DONE

---

### TC.3 -- Validacao E2E (Zero Regressoes)

**Estimativa**: 1h
**Assigned to**: dev-fullstack-1 ou dev-fullstack-2
**Dependencia**: Sprint concluido

**O que fazer**:
- Executar suite E2E completa
- Verificar >= 120/130 testes passando (sem regressao)
- Executar visual regression comparison contra baseline

**Criterios de conclusao**:
- [ ] E2E suite >= 120/130 passando
- [ ] Visual regression: 0 diffs com flag false
- [ ] Build limpo

---

## Definition of Done -- Sprint 38

- [ ] tailwind.config.ts tem TODOS os tokens do UX Parecer (40+ cores, 9 semanticos, 8 sombras, 6 radius, 11 font-sizes, 15 spacings, 5 transitions)
- [ ] Plus Jakarta Sans + Work Sans instalados e funcionando via next/font
- [ ] CSS custom properties em globals.css (50+ variaveis --atlas-*)
- [ ] prefers-reduced-motion implementado globalmente
- [ ] Feature flag: NEXT_PUBLIC_DESIGN_V2=false -> zero visual diff
- [ ] 7 componentes construidos, testados, acessiveis (WCAG 2.1 AA)
- [ ] TODOS componentes usam focus-visible:ring-2 (NUNCA focus:ring-0)
- [ ] TODOS touch targets >= 44px (botoes, chips, steppers)
- [ ] CTA buttons: texto navy (#040d1b) sobre laranja (#fe932c) -- NUNCA branco
- [ ] ESLint warn em cores hardcoded
- [ ] 10 screenshots baseline capturados
- [ ] E2E suite green (>= 120/130 passando)
- [ ] Sprint review commitado
- [ ] Codigo review aprovado por tech-lead
- [ ] Cobertura >= 80% em todos componentes e utilitarios
- [ ] Nenhuma classe Tailwind padrao (slate-*, amber-*) nos novos componentes -- apenas atlas-*

---

## Entregaveis do Sprint 38

| Arquivo/Artefato | Responsavel | Status |
|---|---|---|
| `tailwind.config.ts` (tokens completos UX Parecer) | dev-fullstack-1 | Pendente |
| `src/app/globals.css` (50+ variaveis CSS + reduced-motion) | dev-fullstack-1 | Pendente |
| `src/lib/design-system.ts` (feature flag + hook) | dev-fullstack-1 | Pendente |
| `src/lib/design-tokens.ts` (token catalog) | dev-fullstack-1 | Pendente |
| `src/components/ui/DesignBranch.tsx` | dev-fullstack-1 | Pendente |
| `src/components/ui/README.md` | dev-fullstack-1 | Pendente |
| `e2e/visual-regression/baseline/` (10 screenshots) | dev-fullstack-1 | Pendente |
| `src/components/ui/Button/` (7 variantes) | dev-fullstack-2 | Pendente |
| `src/components/ui/Input/` | dev-fullstack-2 | Pendente |
| `src/components/ui/Card/` (4 variantes) | dev-fullstack-2 | Pendente |
| `src/components/ui/Chip/` | dev-fullstack-2 | Pendente |
| `src/components/ui/Badge/` (7 variantes) | dev-fullstack-2 | Pendente |
| `src/components/ui/PhaseProgress/` (2 layouts) | dev-fullstack-2 | Pendente |
| `src/components/ui/StepperInput/` (44px touch targets) | dev-fullstack-2 | Pendente |
| `docs/sprint-reviews/SPRINT-38-review.md` | tech-lead | Pendente |

---

## Change History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0.0 | 2026-03-23 | product-owner | Initial task breakdown |
| 2.0.0 | 2026-03-23 | tech-lead | Applied UX Parecer corrections: font change (Plus Jakarta Sans + Work Sans), 40+ color tokens, CTA contrast fix, focus-visible enforcement, 44px touch targets, 9 semantic tokens, atlas- prefix, prefers-reduced-motion, expanded variants |
