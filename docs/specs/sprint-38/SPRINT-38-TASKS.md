# Sprint 38 — Breakdown de Tarefas

**Versao**: 1.0.0
**Data**: 2026-03-23
**Autor**: product-owner
**Sprint**: 38 — "Fundacao do Design System"
**Versao alvo**: v0.33.0
**Budget**: 50h (Track 1: 20h | Track 2: 25h | Cross-cutting: 5h)
**Specs**: SPEC-PROD-046, SPEC-PROD-047
**Referencia de design**: docs/design/DESIGN.md, docs/design/SCREEN-INDEX.md

---

## Restricao Global

**NENHUMA tarefa deste sprint pode alterar visuais existentes.**

Toda mudanca de comportamento visual deve ser protegida por `NEXT_PUBLIC_DESIGN_V2=true`. Em staging e producao, a flag permanece `false`. O produto deve ser identico ao v0.32.0 do ponto de vista do usuario final.

Qualquer PR que altere um visual existente (verificado pelos screenshots de regressao) e **automaticamente rejeitado**, independentemente da qualidade do codigo.

---

## Track 1 — dev-fullstack-1: Design Tokens e Infraestrutura

**Spec**: SPEC-PROD-046 (REQ-DS-001 a REQ-DS-008)
**Estimativa total**: 20h
**Pode iniciar**: imediatamente (sem dependencia de Track 2)

---

### T1.1 — Extracao e Catalogacao dos Tokens do DESIGN.md

**Estimativa**: 1h
**Spec refs**: SPEC-PROD-046 (prerrequisito para T1.2)
**Assigned to**: dev-fullstack-1

**O que fazer**:
- Ler `docs/design/DESIGN.md` na integra
- Criar arquivo interno de referencia listando TODOS os valores a serem tokenizados:
  - 8 cores (navy-900, amber-500, amber-600, teal-600, white, gray-50, gray-200, gray-500)
  - 3 border-radius (card=16px, button=8px, badge=9999px)
  - 2 sombras (soft-layered, elevated-card)
  - 4 tamanhos de fonte (display=36px, h2=24px, body=16px, small=14px)
  - 3 valores de spacing (gutter-mobile=24px, gutter-desktop=80px, section=120px, card-padding=32px)
  - 2 familias de fonte (Outfit=heading, DM Sans=body)
- Documentar como cada token mapeia para a nomenclatura Tailwind
- **Output**: comentario de design no topo do `tailwind.config.ts` servindo como referencia

**Criterios de conclusao**:
- [ ] Todos os tokens do DESIGN.md estao catalogados com nome, valor e uso
- [ ] Mapeamento Tailwind definido (ex: `navy.900` = `#1a2332`)

---

### T1.2 — Atualizacao do tailwind.config.ts com Design Tokens

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-046 REQ-DS-001
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.1

**O que fazer**:
- Estender (nao substituir) a secao `theme.extend` do `tailwind.config.ts`
- Adicionar tokens de cor dentro de `colors`:
  - `navy`: `{ 900: '#1a2332' }` (e shades adicionais se necessarios para hover states)
  - `amber`: `{ 500: '#f59e0b', 600: '#d97706' }` (complementa os existentes do Tailwind)
  - `teal`: `{ 600: '#0d9488' }` (complementa os existentes do Tailwind)
- Adicionar tokens de border-radius dentro de `borderRadius`:
  - `card`: '16px'
  - `button`: '8px'
  - `badge`: '9999px'
- Adicionar tokens de sombra dentro de `boxShadow`:
  - `soft`: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
  - `elevated`: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
- Adicionar tokens de font-size dentro de `fontSize`:
  - `display`: ['36px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }]
  - `h2-atlas`: ['24px', { lineHeight: '1.3', fontWeight: '600' }]
  - `body-atlas`: ['16px', { lineHeight: '1.6', fontWeight: '400' }]
  - `small-atlas`: ['14px', { lineHeight: '1.4', fontWeight: '600' }]
- Adicionar tokens de font-family dentro de `fontFamily`:
  - `heading`: ['var(--font-outfit)', 'sans-serif']
  - `body`: ['var(--font-dm-sans)', 'sans-serif']
- Adicionar tokens de spacing dentro de `spacing`:
  - `gutter-mobile`: '24px'
  - `gutter-desktop`: '80px'
  - `section`: '120px'
  - `card-padding`: '32px'

**Criterios de conclusao**:
- [ ] `npm run build` passa sem erros apos a mudanca
- [ ] Classes como `bg-navy-900`, `shadow-soft`, `rounded-card`, `font-heading` funcionam
- [ ] Nenhuma classe Tailwind existente no codigo foi quebrada (nenhum `replace`, apenas `extend`)
- [ ] AC-001 e AC-002 de SPEC-PROD-046 sao verificaveis

---

### T1.3 — Instalacao e Configuracao de Fontes

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-046 REQ-DS-002
**Assigned to**: dev-fullstack-1
**Dependencia**: nenhuma (pode ser paralelo a T1.2)

**O que fazer**:
- Instalar as fontes Outfit e DM Sans via mecanismo de fonte otimizado do Next.js (next/font/google ou equivalente)
- Configurar com:
  - `subsets: ['latin']` (cobre PT-BR e EN adequadamente)
  - `display: 'swap'` (evita FOIT)
  - `variable`: CSS variables `--font-outfit` e `--font-dm-sans`
  - Weights necessarios:
    - Outfit: 700 (bold para headings)
    - DM Sans: 400 (regular) e 500 (medium para body)
- Aplicar as variaveis CSS no elemento `<html>` ou `<body>` no layout raiz
- Verificar que as fontes so serao carregadas quando os componentes que as usam estiverem ativos (tree-shaking de fontes)

**Importante**: as fontes devem ser configuradas mas as classes `font-heading` e `font-body` so serao aplicadas pelos novos componentes (com flag true). O layout raiz existente NAO deve ser alterado para aplicar as fontes como default.

**Criterios de conclusao**:
- [ ] Fontes carregam corretamente com `NEXT_PUBLIC_DESIGN_V2=true` em desenvolvimento local
- [ ] `font-display: swap` esta configurado (verificavel no Network tab do DevTools)
- [ ] AC-005 de SPEC-PROD-046 e verificavel com flag true
- [ ] Build continua limpo

---

### T1.4 — Variaveis CSS Globais em globals.css

**Estimativa**: 2h
**Spec refs**: SPEC-PROD-046 REQ-DS-003
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.3 (precisa das variaveis de fonte definidas)

**O que fazer**:
- Adicionar bloco `:root { }` em `src/app/globals.css` (ou equivalente) com:
  - Todas as 8 cores como variaveis CSS: `--color-navy-900: #1a2332;` etc.
  - Referencias de fonte: `--font-heading: var(--font-outfit);`, `--font-body: var(--font-dm-sans);`
  - Tokens de spacing criticos: `--spacing-card-padding: 32px;` etc.
  - Comentario indicando: "Design System v1 — refs: docs/design/DESIGN.md"
- Estrutura preparada para dark mode futuro com um bloco `[data-theme="dark"] { }` vazio e comentado

**Importante**: adicionar variaveis CSS ao `:root` e seguro — nao altera nenhum estilo existente pois nenhum codigo atual as usa.

**Criterios de conclusao**:
- [ ] Todas as 8 cores do DESIGN.md estao como variaveis CSS em `:root`
- [ ] AC-007 de SPEC-PROD-046 e verificavel (variaveis visiveis no DevTools)
- [ ] Build continua limpo

---

### T1.5 — Sistema de Feature Flag NEXT_PUBLIC_DESIGN_V2

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-046 REQ-DS-005
**Assigned to**: dev-fullstack-1
**Dependencia**: nenhuma

**O que fazer**:

Criar `src/lib/design-system.ts`:
```
// Feature flag para Design System v2
// Default: false — o app e identico ao v0.32.0 com flag off
export function isDesignV2Enabled(): boolean
export function useDesignV2(): boolean  // hook React
```

Criar `src/components/ui/DesignBranch.tsx`:
```
// Componente utilitario para renderizacao condicional
// <DesignBranch v2={<NovoComponente />} legacy={<ComponenteAntigo />} />
```

Adicionar `NEXT_PUBLIC_DESIGN_V2=false` ao arquivo `.env.example` e ao `.env.local` (se nao existir — sem sobrescrever)

Criar `src/components/ui/README.md` com:
- Secao "Feature Flag" explicando o mecanismo
- Como ativar localmente para desenvolvimento
- Aviso sobre nao ativar em staging/producao ate Sprint 39

**Criterios de conclusao**:
- [ ] `isDesignV2Enabled()` retorna `false` quando `NEXT_PUBLIC_DESIGN_V2` esta ausente ou `false`
- [ ] `isDesignV2Enabled()` retorna `true` apenas quando `NEXT_PUBLIC_DESIGN_V2=true`
- [ ] `useDesignV2()` hook funciona em componentes React client-side
- [ ] AC-009 e AC-010 de SPEC-PROD-046 sao verificaveis
- [ ] Testes unitarios cobrem ambos os branches da flag

---

### T1.6 — Regras ESLint para Tokens de Design

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-046 REQ-DS-006
**Assigned to**: dev-fullstack-1
**Dependencia**: T1.2 (tokens devem estar definidos para as regras fazerem sentido)

**O que fazer**:
- Pesquisar se o projeto ja tem plugin ESLint para Tailwind
- Configurar regras que emitam `warn` (nao `error`) quando:
  - Um valor de cor hex que corresponde a um token seja usado de forma arbitraria (ex: `text-[#1a2332]` -> sugere `text-navy-900`)
  - Um valor de font-size arbitrario que corresponde a um token seja usado
- As regras devem ser configuradas com severidade `warn` para nao bloquear o CI durante a fase de transicao
- Documentar as regras em `src/components/ui/README.md` (secao "Linting")

**Importante**: as regras serao `warn`, nao `error`. O CI continua passando. O objetivo e criar visibilidade do drift, nao bloquear o desenvolvimento.

**Criterios de conclusao**:
- [ ] `npm run lint` continua passando (sem novos errors)
- [ ] AC-011 de SPEC-PROD-046 e verificavel (warn aparece para valores hardcoded)
- [ ] A documentacao das regras esta em README.md

---

### T1.7 — Setup de Regressao Visual com Screenshots Playwright

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-046 REQ-DS-007
**Assigned to**: dev-fullstack-1
**Dependencia**: nenhuma para o setup inicial; screenshots de baseline requerem ambiente rodando

**O que fazer**:
- Configurar Playwright para captura de screenshots de baseline das paginas existentes:
  - Landing Page (`/en` ou `/pt`)
  - Dashboard / Expeditions (`/[locale]/(app)/expeditions`)
  - Phase 1 wizard (trip em andamento, fase 1)
  - Phase 3 checklist (trip em andamento, fase 3)
  - Phase 6 itinerary (trip em andamento, fase 6)
- Viewports: mobile (375x812) e desktop (1280x800)
- Screenshots salvas em `e2e/visual-regression/baseline/`
- Script de comparacao que falha se pixel diff > threshold (ex: 0.1%)
- Adicionar job `visual-regression` ao CI que so executa em PRs que tocam arquivos de UI (`src/components/`, `src/app/`, `*.css`, `tailwind.config.ts`)

**Criterios de conclusao**:
- [ ] Screenshots de baseline capturadas para as 5 paginas x 2 viewports = 10 screenshots
- [ ] Script de comparacao funciona e falha com diff simulado
- [ ] AC-012 e AC-013 de SPEC-PROD-046 sao verificaveis
- [ ] Screenshots de baseline commitadas no repositorio

---

### T1.8 — Testes Unitarios: Feature Flag e Utilitarios de Token

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
  - Comportamento igual a `isDesignV2Enabled()` em contexto React
- Testes para `DesignBranch`:
  - Renderiza `legacy` quando flag e `false`
  - Renderiza `v2` quando flag e `true`
  - Nenhum vazamento entre branches

**Criterios de conclusao**:
- [ ] Cobertura >= 80% para `src/lib/design-system.ts`
- [ ] Cobertura >= 80% para `src/components/ui/DesignBranch.tsx`
- [ ] Todos os testes passam

---

## Track 2 — dev-fullstack-2: Biblioteca de Componentes

**Spec**: SPEC-PROD-047
**Estimativa total**: 25h
**Dependencia de entrada**: T1.2 e T1.3 do Track 1 devem estar completos (tokens e fontes)

**Nota de coordenacao**: dev-fullstack-2 pode iniciar o Sprint lendo as specs e preparando a estrutura de pastas enquanto Track 1 finaliza T1.1-T1.3 (os primeiros 2-3 dias). A codificacao dos componentes inicia somente apos os tokens estarem disponiveis.

**Convencao de estrutura para todos os componentes**:
```
src/components/ui/[ComponentName]/
  index.ts              (re-export)
  [ComponentName].tsx   (implementacao)
  [ComponentName].test.tsx  (testes)
```

---

### T2.1 — Button Component

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-047 Section 3.1, AC-001 a AC-004
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- Props: `variant` (primary | secondary | outline | ghost | danger), `size` (sm | md | lg), `loading` (boolean), `iconLeft` (ReactNode), `iconRight` (ReactNode), `disabled` (boolean)
- Aceitar todos os atributos nativos HTML de `<button>` via spread
- Estado `loading`: spinner interno, `disabled=true`, `aria-busy="true"`
- Estado `disabled`: opacidade 50%, cursor not-allowed, preventDefault em click
- Usar exclusivamente tokens do design system (sem valores hardcoded)
- Controlado por feature flag — exportar tanto a versao nova quanto manter compatibilidade

**Testes obrigatorios**:
- Renderiza cada variant sem erros
- Renderiza cada size sem erros
- Estado `loading` impede click e tem aria-busy
- Estado `disabled` impede click
- iconLeft e iconRight renderizam corretamente
- Snapshot test para variant primary/md

**Criterios de conclusao**:
- [ ] Todos os estados e variants implementados
- [ ] Cobertura de testes >= 80%
- [ ] AC-001, AC-002, AC-003, AC-004 passam
- [ ] UX Designer aprovou

---

### T2.2 — Input Component

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-047 Section 3.2, AC-005 a AC-007
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- Props: `type` (text | email | password | search | tel | number), `label` (string), `helperText` (string, optional), `error` (string, optional), `disabled` (boolean), `readOnly` (boolean)
- Aceitar todos os atributos nativos de `<input>` via spread
- Associacao label-input via `htmlFor`/`id` automatica (gerar ID unico se nao fornecido)
- Mensagem de erro: associada via `aria-describedby`, substitui helperText quando presente
- Password toggle: botao com icone olho, aria-label localizado, alterna `type` interno
- Estado focus: ring amber-500
- Estado error: border e icone vermelho
- Estado disabled: background gray-50, cursor not-allowed

**Testes obrigatorios**:
- Renderiza label e input associados corretamente
- Estado error renderiza mensagem e aria-describedby correto
- Password toggle alterna tipo do input
- Estado disabled bloqueia interacao
- Valores de placeholder e helperText renderizam corretamente

**Criterios de conclusao**:
- [ ] Todos os estados e tipos implementados
- [ ] Cobertura de testes >= 80%
- [ ] AC-005, AC-006, AC-007 passam
- [ ] UX Designer aprovou

---

### T2.3 — Card Component

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-047 Section 3.3, AC-008 a AC-009
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- Props: `variant` (bordered | elevated), `header` (ReactNode, optional), `footer` (ReactNode, optional), `onClick` (function, optional), `loading` (boolean, optional)
- Quando `onClick` presente: role="button", tabIndex=0, responde a Enter e Space
- Estado `loading`: skeleton interno (linhas cinza animadas) substituindo o conteudo
- Padding: card-padding (32px) por padrao
- Border-radius: rounded-card (16px)

**Testes obrigatorios**:
- Variante bordered renderiza border, sem shadow
- Variante elevated renderiza shadow-elevated, sem border
- Card com onClick dispara evento em click, Enter e Space
- Estado loading renderiza skeleton
- Header e footer slots renderizam conteudo arbitrario

**Criterios de conclusao**:
- [ ] Todos os slots e variants implementados
- [ ] Cobertura de testes >= 80%
- [ ] AC-008, AC-009 passam
- [ ] UX Designer aprovou

---

### T2.4 — Chip Component

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-047 Section 3.4, AC-010 a AC-011
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- Props: `variant` (selectable | removable | colored), `value` (string), `label` (string), `selected` (boolean, para selectable), `color` (string, para colored), `size` (sm | md), `onChange` (callback para selectable), `onRemove` (callback para removable)
- Variant selectable: toggle de estado, emite onChange(value, !selected)
- Variant removable: botao X com aria-label="Remover [label]", emite onRemove(value)
- Border-radius: rounded-badge (9999px)
- Estado selected: border amber-500, background amber-50, texto amber-700

**Testes obrigatorios**:
- Chip selectable alterna entre selected e unselected
- Chip removable dispara onRemove ao click e ao Enter no botao X
- Chip colored aplica cor de fundo correta
- aria-label do botao X inclui o label do chip

**Criterios de conclusao**:
- [ ] Todos os variants implementados
- [ ] Cobertura de testes >= 80%
- [ ] AC-010, AC-011 passam
- [ ] UX Designer aprovou

---

### T2.5 — Badge Component

**Estimativa**: 3h
**Spec refs**: SPEC-PROD-047 Section 3.5, AC-012 a AC-013
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- Props: `type` (status | rank | pa), `status` (success | warning | error | info | locked — quando type=status), `rank` (novato | desbravador | navegador | capitao | aventureiro | lendario — quando type=rank), `amount` (number — quando type=pa), `size` (sm | md)
- Status badge: icones check/alert/x/info/lock com cores de status correspondentes
- Rank badge: label do rank com cor tematica (definir paleta por rank — usar ATLAS-GAMIFICACAO-APROVADO.md como referencia)
- PA badge: background navy-900, texto amber-500, formata amount com Intl.NumberFormat
- Border-radius: rounded-badge (9999px)
- Icones decorativos: aria-hidden="true"; icones funcionais: aria-label adequado

**Testes obrigatorios**:
- Badge status success renderiza icone e cores corretas
- Badge rank lendario renderiza label e estilo correto
- Badge PA formata 1500 como "1.500" (formato PT-BR)
- Badge PA formata 1000000 sem overflow visual

**Criterios de conclusao**:
- [ ] Todos os tipos e variantes implementados
- [ ] Cobertura de testes >= 80%
- [ ] AC-012, AC-013 passam
- [ ] UX Designer aprovou

---

### T2.6 — PhaseProgress Component

**Estimativa**: 5h
**Spec refs**: SPEC-PROD-047 Section 3.6, AC-014 a AC-015
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**Este e o componente mais complexo do sprint.** Estimativa maior contempla logica de estado, dois layouts, animacao e acessibilidade completa.

**O que implementar**:
- Props:
  - `phases`: array de `{ id, name, state: 'completed' | 'current' | 'locked' | 'available', completionPercent?: number }`
  - `layout`: 'horizontal' | 'vertical'
  - `onPhaseClick`: callback com id da fase clicada (chamado apenas para completed e current)
- Layout horizontal: 6 segmentos conectados por linha, para uso no topo do wizard
- Layout vertical: lista com icone, nome e status, para uso em sidebar/summary
- Estados visuais:
  - completed: teal-600, icone check
  - current: amber-500, animacao pulsante (CSS animation, nao JS)
  - locked: gray-200, icone cadeado, cursor not-allowed
  - available: outline navy-900, sem icone de lock
- Tooltip em hover para fases completed: "[Nome da Fase] — [X]% completo"
- Nomes canonicos das 6 fases do Atlas (hardcoded como default, mas sobrescriveis via prop):
  1. "O Chamado", 2. "O Explorador", 3. "O Preparo", 4. "A Logistica", 5. "Guia do Destino", 6. "O Roteiro"

**Acessibilidade**:
- `role="progressbar"` no container
- `aria-valuemin=0`, `aria-valuemax=6`, `aria-valuenow=[fases completadas]`
- `aria-label` descritivo: "Progresso da expedição: [N] de 6 fases concluídas"
- Fases locked: `aria-disabled="true"`
- Fase current: `aria-current="step"`

**Testes obrigatorios**:
- Renderiza 6 fases com estados corretos
- Fase locked nao dispara onPhaseClick
- Fase completed dispara onPhaseClick ao click e Enter
- aria-valuenow reflete numero de fases completed corretamente
- Layout horizontal e vertical renderizam sem erros

**Criterios de conclusao**:
- [ ] Layout horizontal e vertical implementados
- [ ] 4 estados visuais implementados
- [ ] Acessibilidade completa (role, aria-value*, aria-current, aria-disabled)
- [ ] Cobertura de testes >= 80%
- [ ] AC-014, AC-015 passam
- [ ] UX Designer aprovou (verificar mobile 375px especificamente)

---

### T2.7 — StepperInput Component

**Estimativa**: 4h
**Spec refs**: SPEC-PROD-047 Section 3.7, AC-016 a AC-017
**Assigned to**: dev-fullstack-2
**Dependencia**: T1.2 (tokens Tailwind)

**O que implementar**:
- Props: `value` (number), `min` (number, default: 0), `max` (number), `step` (number, default: 1), `label` (string), `subtitle` (string, optional), `onChange` (callback)
- Estrutura: label -> [botao -] [valor] [botao +] -> subtitle
- Botao `-` desabilitado (visualmente + aria-disabled) quando value === min
- Botao `+` desabilitado quando value === max
- Campo central: `role="spinbutton"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label=[label]`
- Long-press (500ms) em botoes ativa incremento continuo enquanto mantiver pressionado, para com mouseup/touchend
- Validacao on-blur: se o usuario editar o campo diretamente e digitar valor fora de [min, max], corrigir para o limite mais proximo

**Testes obrigatorios**:
- Botao `-` desabilitado em min
- Botao `+` desabilitado em max
- onChange chamado com valor correto ao incrementar/decrementar
- aria-valuenow reflete o valor atual
- aria-label dos botoes inclui o label do componente

**Criterios de conclusao**:
- [ ] Long-press implementado e testado
- [ ] Limites min/max respeitados
- [ ] Acessibilidade completa (spinbutton)
- [ ] Cobertura de testes >= 80%
- [ ] AC-016, AC-017 passam
- [ ] UX Designer aprovou

---

## Cross-cutting Tasks

### TC.1 — Atualizacao dos Prompts dos Agentes com Regras de Design System

**Estimativa**: 2h
**Assigned to**: tech-lead (com aprovacao do product-owner)
**Dependencia**: SPEC-PROD-046 e SPEC-PROD-047 aprovadas

**O que fazer**:
- Atualizar os prompts dos agentes `dev-fullstack-1`, `dev-fullstack-2` e `ux-designer` com as seguintes regras:
  - "Todos os componentes de UI devem usar tokens do design system (bg-navy-900, not bg-[#1a2332])"
  - "Novos componentes de apresentacao vao em src/components/ui/"
  - "Nenhuma mudanca visual pode ser feita sem feature flag ou aprovacao do ux-designer"
  - "Consultar docs/design/DESIGN.md antes de qualquer decisao de cor, tipografia ou spacing"
  - "Consultar docs/design/SCREEN-INDEX.md antes de implementar qualquer tela"
- Atualizar o `CLAUDE.md` se necessario para refletir as novas convencoes de design

**Criterios de conclusao**:
- [ ] Prompts dos 3 agentes atualizados com regras de design system
- [ ] Regras sao claras e acionaveis (nao ambiguas)

---

### TC.2 — Revisao do UX Designer

**Estimativa**: 2h
**Assigned to**: ux-designer
**Dependencia**: T2.1 a T2.7 completos (ou por componente, em rodadas)

**O que fazer**:
- Revisar cada um dos 7 componentes contra as telas exportadas do Stitch e o DESIGN.md
- Verificar os criterios especificos de cada componente listados em SPEC-PROD-047 Section 9
- Aprovar ou solicitar ajustes antes do merge de cada PR de componente
- Verificar especificamente que PhaseProgress funciona corretamente em 375px

**Criterios de conclusao**:
- [ ] Todos os 7 componentes aprovados pelo UX Designer
- [ ] Nenhum componente mergeado sem aprovacao do UX Designer

---

### TC.3 — Documento de Sprint Review

**Estimativa**: 1h
**Assigned to**: tech-lead
**Dependencia**: Sprint concluido

**O que fazer**:
- Criar `docs/sprint-reviews/SPRINT-38-review.md`
- Documentar: o que foi entregue, metricas (testes, cobertura, E2E), decisoes tomadas, dividas criadas, proximos passos

**Criterios de conclusao**:
- [ ] Documento commitado antes do sprint ser marcado como DONE

---

## Ordem de Execucao Recomendada

```
Dia 1-2:  T1.1, T1.3, T1.5 (paralelo) + T1.2
Dia 2-3:  T1.4, T1.8 (paralelo com T1.2 concluido)
           T2 pode iniciar preparacao (ler specs, estruturar pastas)
Dia 3-5:  T1.6, T1.7 (Track 1 finaliza)
           T2.1, T2.2, T2.3 (Track 2 inicia componentes com tokens disponiveis)
Dia 5-7:  T2.4, T2.5 (Track 2 continua)
           TC.2 (UX review Round 1: Button, Input, Card)
Dia 7-9:  T2.6, T2.7 (Track 2 finaliza — componentes mais complexos)
           TC.1 (agent prompts)
Dia 9-10: TC.2 (UX review Round 2: Chip, Badge, PhaseProgress, StepperInput)
           TC.3 (sprint review)
           Validacao final: build, lint, tests, E2E, visual regression
```

---

## Entregaveis do Sprint 38

| Arquivo/Artefato | Responsavel | Status esperado |
|------------------|-------------|-----------------|
| `tailwind.config.ts` (atualizado) | dev-fullstack-1 | Tokens completos do DESIGN.md |
| `src/app/globals.css` (atualizado) | dev-fullstack-1 | Variaveis CSS globais |
| `src/lib/design-system.ts` | dev-fullstack-1 | Feature flag + hook |
| `src/components/ui/DesignBranch.tsx` | dev-fullstack-1 | Renderizacao condicional |
| `src/components/ui/README.md` | dev-fullstack-1 | Documentacao completa |
| `e2e/visual-regression/baseline/` | dev-fullstack-1 | 10 screenshots de baseline |
| `src/components/ui/Button/` | dev-fullstack-2 | Implementado + testado |
| `src/components/ui/Input/` | dev-fullstack-2 | Implementado + testado |
| `src/components/ui/Card/` | dev-fullstack-2 | Implementado + testado |
| `src/components/ui/Chip/` | dev-fullstack-2 | Implementado + testado |
| `src/components/ui/Badge/` | dev-fullstack-2 | Implementado + testado |
| `src/components/ui/PhaseProgress/` | dev-fullstack-2 | Implementado + testado |
| `src/components/ui/StepperInput/` | dev-fullstack-2 | Implementado + testado |
| `docs/sprint-reviews/SPRINT-38-review.md` | tech-lead | Commitado pre-close |
