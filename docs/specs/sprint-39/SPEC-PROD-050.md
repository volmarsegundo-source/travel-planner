---
spec_id: SPEC-PROD-050
title: Sprint 38 Carryover Fixes
version: 1.0.0
status: Draft
sprint: 39
owner: product-owner
created: 2026-03-23
updated: 2026-03-23
feature_flag: N/A (fixes sao para componentes que so aparecem com NEXT_PUBLIC_DESIGN_V2=true)
token_reference: docs/specs/sprint-38/UX-PARECER-DESIGN-SYSTEM.md
---

# SPEC-PROD-050: Sprint 38 Carryover Fixes

## Contexto

O Sprint 38 entregou a fundacao do design system (SPEC-PROD-046 e SPEC-PROD-047). Durante a validacao final do UX Designer, foram identificados 4 itens de baixa severidade que nao bloqueavam o merge do Sprint 38, mas que devem ser resolvidos antes da migracao visual comecar a ser usada por usuarios (Sprint 39+).

Todos os 4 itens afetam apenas os novos componentes `atlas-*` que so aparecem quando `NEXT_PUBLIC_DESIGN_V2=true`. Nenhum impacta o produto V1 em producao.

Estes fixes sao agrupados em uma unica spec por serem rapidos (estimativa total: 4-6h), correlacionados (todos em componentes do Sprint 38), e de baixa prioridade individual.

## Items

### FIX-001: AtlasChip — Duplicidade de aria-pressed

**Severidade**: LOW
**Componente afetado**: `src/components/ui/AtlasChip.tsx`

**Problema**: O componente AtlasChip renderiza `aria-pressed` em dois locais simultaneamente — tanto no elemento raiz (`<button>`) quanto em um elemento filho interno usado para estilizacao. Isso cria redundancia no accessibility tree: leitores de tela como NVDA/VoiceOver anunciam o estado "pressed" duas vezes para o mesmo chip.

**Comportamento esperado apos fix**:
- `aria-pressed` presente apenas no elemento interativo raiz (`<button>`)
- Elemento filho interno sem atributos ARIA redundantes
- Comportamento visual identico ao atual

**Nota tecnica**: Se o chip for usado como `role="checkbox"` em algum contexto (multipla selecao), usar `aria-checked` em vez de `aria-pressed`. Verificar o contexto de uso atual e alinhar com o UX Designer se necessario.

### FIX-002: AtlasPhaseProgress — Touch target mobile insuficiente

**Severidade**: LOW
**Componente afetado**: `src/components/ui/AtlasPhaseProgress.tsx` (ou nome equivalente do componente de progresso de fases do wizard)

**Problema**: Os circulos de fase no wizard tem 40px em viewport mobile. O UX Parecer (Secao 4.3 — Touch Targets) define minimo de 44px para todos os elementos interativos, alinhado com WCAG 2.5.5 (Target Size) e Apple HIG / Android Material Guidelines.

Em 40px, o alvo de toque esta 4px abaixo do minimo e pode causar toques errados em usuarios com dificuldade motora ou dedos maiores.

**Comportamento esperado apos fix**:
- Circulos de fase: `min-width: 44px; min-height: 44px` em viewport mobile (<768px)
- O circulo visual pode continuar sendo 40px (usando padding para expandir a area de toque alem do visual, ou aumentando o circulo diretamente para 44px)
- Verificar se o aumento quebra o layout do progress bar — ajustar espaco entre circulos se necessario
- Desktop: pode manter tamanho atual (nao ha restricao de touch em desktop)

### FIX-003: Token de sombra glow-primary ausente no globals.css

**Severidade**: LOW
**Arquivo afetado**: `src/app/globals.css` (ou onde os tokens CSS custom properties estao definidos)

**Problema**: O UX Parecer (Secao 1.5 — Sombras) define o token `atlas-shadow-glow-primary` com valor `0 0 12px rgba(4, 13, 27, 0.2)`. Este token foi aprovado e deve estar em `tailwind.config.ts` e como CSS custom property. O `atlas-shadow-glow-amber` foi implementado no Sprint 38, mas o `atlas-shadow-glow-primary` ficou pendente.

Sem este token, qualquer componente que precise do glow-primary (ex: botoes primary em estado hover) usa um fallback ou um valor hardcoded — ambos indesejados.

**Comportamento esperado apos fix**:
- CSS custom property `--shadow-glow-primary: 0 0 12px rgba(4, 13, 27, 0.2)` definida em `:root`
- Classe Tailwind `shadow-atlas-glow-primary` disponivel e funcional
- Verificar se algum componente do Sprint 38 ja usa fallback para este shadow e substituir pelo token correto

### FIX-004: ESLint rule nao detecta tokens hardcoded em cn() e cva()

**Severidade**: LOW
**Arquivo afetado**: ESLint rule customizada criada no Sprint 38 para detectar uso de classes Tailwind padrao sem prefixo `atlas-`

**Problema**: A regra ESLint atual detecta strings de classe diretamente em `className="..."`. Porem, quando o desenvolvedor usa os utilitarios `cn()` (class-names merger) ou `cva()` (class-variance-authority), os argumentos string dentro desses utilitarios nao sao capturados pela regra.

Exemplo de falso negativo (regra NAO detecta):
```tsx
// Deveria reportar warning: "amber-500" nao e token atlas
const styles = cva("bg-amber-500 text-white", { ... })
const classes = cn("bg-slate-900", props.className)
```

**Comportamento esperado apos fix**:
- A ESLint rule analisa os argumentos string dentro de chamadas a `cn()` e `cva()`
- Reporta warning para qualquer cor Tailwind sem prefixo `atlas-` encontrada
- Nao gera falsos positivos em strings que nao contem classes de cor
- A rule continua funcionando para `className` direto (comportamento atual preservado)

**Escopo de implementacao**: A rule deve verificar chamadas de funcao onde o nome e `cn` ou `cva`, e percorrer os argumentos do tipo `StringLiteral` e `TemplateLiteral` aplicando a mesma logica de deteccao de cor que ja existe para `className`.

## Acceptance Criteria

### FIX-001: AtlasChip aria-pressed

- [ ] AC-001: Dado o AtlasChip renderizado, quando inspecionado no accessibility tree, entao `aria-pressed` aparece apenas uma vez por elemento chip
- [ ] AC-002: Dado o AtlasChip, quando testado com NVDA ou VoiceOver (ou simulado via axe-core), entao o estado do chip e anunciado apenas uma vez
- [ ] AC-003: Dado o AtlasChip com fix aplicado, quando os testes unitarios existentes sao executados, entao todos continuam passando (comportamento visual nao regride)

### FIX-002: PhaseProgress 44px mobile

- [ ] AC-004: Dado viewport mobile (<768px), quando o AtlasPhaseProgress e renderizado, entao cada circulo de fase tem area de toque de no minimo 44x44px
- [ ] AC-005: Dado viewport mobile, quando a secao de progress e renderizada, entao nao ha overflow horizontal nem quebra de layout nos circulos de fase
- [ ] AC-006: Dado viewport desktop (>=768px), quando o AtlasPhaseProgress e renderizado, entao o comportamento visual e identico ao Sprint 38 (sem regressao)

### FIX-003: Token glow-primary

- [ ] AC-007: Dado `tailwind.config.ts`, quando inspecionado, entao `atlas-shadow-glow-primary` esta definido com valor `0 0 12px rgba(4, 13, 27, 0.2)`
- [ ] AC-008: Dado `globals.css`, quando inspecionado, entao a CSS custom property `--shadow-glow-primary` esta presente em `:root`
- [ ] AC-009: Dado um componente usando `shadow-atlas-glow-primary`, quando renderizado, entao o shadow e aplicado corretamente no browser

### FIX-004: ESLint cn()/cva() detection

- [ ] AC-010: Dado codigo com `cn("bg-amber-500", ...)`, quando o linter e executado, entao um warning e reportado para `amber-500` (cor sem prefixo `atlas-`)
- [ ] AC-011: Dado codigo com `cva("bg-atlas-primary", ...)`, quando o linter e executado, entao nenhum warning e reportado (token `atlas-*` valido)
- [ ] AC-012: Dado codigo com `cn("flex items-center gap-4", ...)`, quando o linter e executado, entao nenhum warning e reportado (sem classes de cor)
- [ ] AC-013: Dado a ESLint rule atualizada, quando `npm run lint` e executado na base de codigo existente, entao nenhum novo warning espurio e introduzido

## Out of Scope

- Correcao de outros possiveis problemas de acessibilidade nos componentes Sprint 38 (escopo da validacao completa de a11y em sprint dedicado)
- Novos tokens de sombra alem do glow-primary
- Expansao da ESLint rule para outros utilitarios de classe (ex: `clsx`, `twMerge`) — avaliar em sprint futuro conforme adocao

## Success Metrics

- Zero axe-core violations relacionadas a aria-pressed duplo em AtlasChip
- Touch target compliance 100% nos circulos de fase em mobile (validado por Playwright no viewport 375px)
- `npm run lint` sem warnings de cor hardcoded no codigo dos Sprints 38 e 39 apos fix
- Nenhuma regressao visual (screenshot comparison)

## Estimativa

| Fix | Estimativa | Complexidade |
|-----|-----------|--------------|
| FIX-001: AtlasChip aria-pressed | 1h | XS |
| FIX-002: PhaseProgress 44px | 1h | XS |
| FIX-003: glow-primary token | 0.5h | XS |
| FIX-004: ESLint cn()/cva() | 2h | S |
| **Total** | **4.5h** | |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-23 | product-owner | Versao inicial — Sprint 39 carryover items do UX Parecer Sprint 38 |
