# SPEC-PROD-046: Design System Foundation

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, ux-designer, architect
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Sprint**: 38
**MoSCoW**: Must Have

---

## 1. Problem Statement

O Atlas Travel Planner possui atualmente ~2480 testes unitários e uma base funcional sólida entregue nos Sprints 1-37. No entanto, o frontend foi construído de forma incremental, sem um sistema de design formalizado: classes Tailwind são aplicadas diretamente em componentes sem tokens centralizados, fontes são as padrão do sistema, e não há mecanismo para controlar a introdução gradual de um novo visual.

O resultado é uma dívida visual acumulada que se tornará um obstáculo crítico nos Sprints 39+, quando o design exportado do Google Stitch (5 telas oficiais definidas em `docs/design/SCREEN-INDEX.md`) precisará ser aplicado ao produto real. Sem infraestrutura de design system, cada componente precisará ser refatorado de forma isolada, sem garantia de consistência visual e sem proteção contra regressão.

**Evidencias do problema:**
- Nenhum arquivo `tailwind.config.ts` contém tokens semânticos de cor (`navy-900`, `amber-500`, `teal-600`) alinhados ao `docs/design/DESIGN.md`
- Fontes `Outfit` (headings) e `DM Sans` (body) definidas no DESIGN.md não estão instaladas
- Nenhuma variável CSS global existe para suporte a temas futuros
- Nenhuma proteção de regressão visual (screenshots baseline) está configurada
- Qualquer desenvolvedor pode introduzir `bg-blue-600` ou `text-sm` arbitrários sem alerta de lint

Este sprint cria a **infraestrutura** completa do design system. Nenhuma tela existente será alterada. A feature flag `NEXT_PUBLIC_DESIGN_V2` permanece `false` por padrão em todos os ambientes.

---

## 2. User Stories

### Story Principal (Desenvolvedor)

As a developer on the Atlas team,
I want a centralized design token system and a component library aligned with DESIGN.md,
so that I can build visually consistent screens in Sprint 39+ without reinventing colors, spacing, or component logic from scratch.

### Story Secundária (Viajante — impacto futuro)

As a leisure traveler using Atlas,
I want a polished, professional interface that feels trustworthy and exciting,
so that I feel confident planning my expeditions on the platform.

**Nota**: o impacto direto ao viajante ocorrerá nos Sprints 39+. Este sprint é exclusivamente de infraestrutura — o viajante não verá nenhuma mudança visual.

### Traveler Context

- **Pain point**: A interface atual usa estilos ad-hoc inconsistentes. Botões com cores ligeiramente diferentes em fases distintas reduzem a percepção de qualidade e profissionalismo do produto.
- **Current workaround**: Desenvolvedores copiam classes de componentes próximos como referência visual informal, gerando drift acumulativo.
- **Frequency**: Toda implementação de UI introduce risco de inconsistência visual.

---

## 3. Requirements

### REQ-DS-001: Tokens de Design no Tailwind

O arquivo `tailwind.config.ts` deve ser estendido com todos os tokens definidos em `docs/design/DESIGN.md`:

- **Cores**: `navy.900` (#1a2332), `amber.500` (#f59e0b), `amber.600` (#d97706), `teal.600` (#0d9488), mais as cores de status e neutras definidas no DESIGN.md
- **Border radius**: aliases semânticos para `card` (16px), `button` (8px), `badge` (9999px)
- **Sombras**: `shadow-soft` e `shadow-elevated` conforme definido em DESIGN.md Section 4
- **Tipografia**: escalas de fonte para `display` (36px), `h2` (24px), `body` (16px), `small` (14px)
- **Spacing**: tokens de espaçamento para `gutter-mobile` (24px), `gutter-desktop` (80px), `section` (120px), `card-padding` (32px)

Os tokens devem estender (não substituir) os tokens padrão do Tailwind, garantindo compatibilidade total com o código existente.

### REQ-DS-002: Instalação e Configuração de Fontes

As fontes tipográficas definidas no DESIGN.md devem ser instaladas e configuradas:

- **Outfit**: fonte primária para headings (H1, H2, títulos de fase). Weight 700 (Bold). Tracking -0.02em.
- **DM Sans**: fonte para body text. Weights 400 (Regular) e 500 (Medium). Line-height 1.6.

As fontes devem ser carregadas de forma otimizada, com `font-display: swap` e subconjuntos de caracteres adequados para PT-BR e EN (Latin Extended).

Fontes devem ser referenciadas via variáveis CSS para permitir override em temas futuros.

### REQ-DS-003: Variáveis CSS Globais

Um arquivo de variáveis CSS globais deve ser criado/atualizado com:

- Todas as cores do DESIGN.md como variáveis CSS (`--color-navy-900`, `--color-amber-500`, etc.)
- Referências de fonte (`--font-heading`, `--font-body`)
- Tokens de espaçamento críticos
- Estrutura preparada para suporte a tema escuro no futuro (variáveis dentro de `:root`)

### REQ-DS-004: Biblioteca de Componentes

Sete componentes base devem ser criados em `src/components/ui/`. Cada componente deve:
- Usar exclusivamente tokens de design (sem valores hardcoded)
- Ser controlado pela feature flag `NEXT_PUBLIC_DESIGN_V2`
- Ter cobertura de testes >= 80%
- Ser acessível (WCAG 2.1 AA)
- Ter suporte a i18n (sem strings hardcoded em inglês ou português)

Os componentes são especificados em detalhe em SPEC-PROD-047.

### REQ-DS-005: Sistema de Feature Flag

Um mecanismo de feature flag deve ser implementado para controlar a ativação do novo design system:

- Variável de ambiente: `NEXT_PUBLIC_DESIGN_V2` (boolean, default: `false`)
- Hook/utility: `useDesignV2()` para uso em componentes React
- Componente condicional: capacidade de renderizar implementação antiga ou nova com base na flag
- Documentação: README em `src/components/ui/README.md` explicando o mecanismo

**Regra crítica**: com `NEXT_PUBLIC_DESIGN_V2=false` (padrão em todos os ambientes), nenhuma mudança visual deve ser perceptível. O app deve funcionar identicamente ao Sprint 37.

### REQ-DS-006: Regras ESLint para Tokens de Design

Regras de lint devem prevenir o uso de valores arbitrários quando tokens semânticos existem:

- Avisar ao usar valores hex hardcoded em classes Tailwind (ex: `bg-[#1a2332]` em vez de `bg-navy-900`)
- Avisar ao usar tamanhos de fonte arbitrários quando a escala tipográfica cobre o caso
- As regras devem ser configuradas como `warn` (não `error`) para não bloquear o CI durante a transição

### REQ-DS-007: Baseline de Regressão Visual

Screenshots de baseline devem ser capturadas das páginas existentes para proteger contra regressão visual:

- Páginas a capturar: Landing Page, Dashboard (`/expeditions`), Phase 1 wizard, Phase 3 checklist, Phase 6 itinerary
- Viewports: mobile (375px) e desktop (1280px)
- As screenshots são salvas como baseline e comparadas em cada PR
- Um PR que altere visuais existentes (com flag `false`) deve falhar na comparação de regressão

### REQ-DS-008: Zero Mudanças Visuais em Produção

Este é o critério mais crítico do sprint:

- Com `NEXT_PUBLIC_DESIGN_V2=false` (valor padrão), nenhum componente, página ou estilo existente deve ser alterado
- A suíte E2E (120/130 testes passando) deve continuar 120/130 ao final do sprint
- A comparação de screenshots de regressão visual deve aprovar todas as páginas existentes

---

## 4. Acceptance Criteria

- [ ] AC-001: Dado que `tailwind.config.ts` é atualizado, quando o desenvolvedor usa `bg-navy-900`, então a cor `#1a2332` é aplicada corretamente
- [ ] AC-002: Dado que `tailwind.config.ts` é atualizado, quando o desenvolvedor usa `bg-amber-500`, então a cor `#f59e0b` é aplicada corretamente
- [ ] AC-003: Dado que `tailwind.config.ts` é atualizado, quando o desenvolvedor usa `shadow-soft`, então a sombra layered do DESIGN.md é aplicada
- [ ] AC-004: Dado que `tailwind.config.ts` é atualizado, quando o desenvolvedor usa `shadow-elevated`, então a sombra elevated card do DESIGN.md é aplicada
- [ ] AC-005: Dado que as fontes estão instaladas, quando a página é carregada, então headings renderizam em Outfit Bold e body text renderiza em DM Sans Regular
- [ ] AC-006: Dado que as fontes estão instaladas, quando a conexão de rede está lenta, então o sistema de fallback de fonte garante que o texto seja legível (font-display: swap)
- [ ] AC-007: Dado que as variáveis CSS existem em `:root`, quando um desenvolvedor inspeciona qualquer elemento no DevTools, então as variáveis CSS de design estão disponíveis
- [ ] AC-008: Dado que `NEXT_PUBLIC_DESIGN_V2=false` (padrão), quando a aplicação é executada, então nenhuma diferença visual é observada em relação ao Sprint 37
- [ ] AC-009: Dado que `NEXT_PUBLIC_DESIGN_V2=true`, quando a aplicação é executada, então os novos componentes de `src/components/ui/` são renderizados em lugar dos existentes (apenas onde integrados)
- [ ] AC-010: Dado que `useDesignV2()` é chamado em um componente, quando a flag está `false`, então o hook retorna `false` e o branch de código legado é executado
- [ ] AC-011: Dado que uma regra ESLint é configurada, quando o desenvolvedor usa `bg-[#1a2332]`, então um aviso `warn` é emitido sugerindo `bg-navy-900`
- [ ] AC-012: Dado que screenshots de baseline são capturadas, quando o PR não altera nenhum estilo existente, então a comparação de regressão visual passa sem diferenças
- [ ] AC-013: Dado que um PR inadvertidamente altera um estilo existente, quando a comparação de regressão visual é executada, então o CI reporta a diferença visual com screenshot diff
- [ ] AC-014: Dado que os 7 componentes da biblioteca são criados, quando executado `npm run test`, então todos os testes dos componentes passam com cobertura >= 80%
- [ ] AC-015: Dado que os 7 componentes são criados, quando inspecionados com ferramentas de acessibilidade, então todos passam na auditoria WCAG 2.1 AA
- [ ] AC-016: Dado que o sprint é concluído, quando executada a suíte E2E, então o resultado é >= 120/130 testes passando (sem regressão)
- [ ] AC-017: Dado que o sprint é concluído, quando executado `npm run build`, então o build é bem-sucedido sem erros ou avisos críticos
- [ ] AC-018: Dado que a biblioteca de componentes é criada, quando o desenvolvedor consulta `src/components/ui/README.md`, então encontra documentação de uso de cada componente e instruções do sistema de feature flag
- [ ] AC-019: Dado que os tokens de fonte são configurados, quando o desenvolvedor usa `font-heading` em Tailwind, então a fonte Outfit é aplicada
- [ ] AC-020: Dado que os tokens de fonte são configurados, quando o desenvolvedor usa `font-body` em Tailwind, então a fonte DM Sans é aplicada

---

## 5. Scope

### In Scope

- Extensão do `tailwind.config.ts` com tokens de cor, tipografia, spacing, radius e shadow do DESIGN.md
- Instalação e configuração de Outfit e DM Sans via mecanismo de fonte otimizado do framework
- Criação de variáveis CSS globais em `globals.css`
- Implementação do sistema de feature flag `NEXT_PUBLIC_DESIGN_V2`
- Criação dos 7 componentes base em `src/components/ui/` (detalhados em SPEC-PROD-047)
- Configuração de regras ESLint como `warn` para uso de valores hardcoded
- Configuração do baseline de regressão visual com screenshots
- Documentação de uso em `src/components/ui/README.md`
- Atualização das instruções de agentes com as regras do design system

### Out of Scope (v1 — Sprint 38)

- Aplicação do novo design a qualquer tela ou componente existente (Sprint 39+)
- Migração de classes Tailwind hardcoded existentes para tokens semânticos
- Implementação de tema escuro (dark mode) — a estrutura de variáveis CSS prepara o terreno, mas não ativa
- Criação de telas pendentes no SCREEN-INDEX.md (Login, Phase 2, Phase 4, Phase 5, Phase 6, Summary)
- Storybook ou qualquer sistema de documentação de componentes além do README
- Integração dos novos componentes em páginas existentes (mesmo com flag `true`)

---

## 6. Constraints

### Security

- Nenhum token de design deve conter valores que possam ser injetados (todos são valores CSS/hex estáticos)
- A variável de ambiente `NEXT_PUBLIC_DESIGN_V2` é pública (prefixo `NEXT_PUBLIC_`) — não deve ser usada para controlar features de segurança, apenas visuais
- Nenhuma PII é envolvida neste sprint

### Accessibility

- WCAG 2.1 AA é o nível mínimo obrigatório para todos os componentes da biblioteca
- Contraste de cor: `navy-900` (#1a2332) sobre `white` (#ffffff) = ratio 15.5:1 (passa AAA). `amber-500` (#f59e0b) sobre `navy-900` deve ser validado para texto
- Todos os componentes interativos devem ser navegáveis por teclado (Tab, Enter, Space, Escape onde aplicável)
- Screen readers: todos os componentes devem ter atributos ARIA adequados
- O componente `PhaseProgress` deve ter texto alternativo descrevendo o estado atual para screen readers
- Nenhuma dependência de cor como único mecanismo de comunicação de estado

### Performance

- As fontes devem ser carregadas com `font-display: swap` para evitar FOIT (Flash of Invisible Text)
- Subconjuntos de caracteres: Latin Extended é suficiente para PT-BR e EN
- A adição de tokens ao `tailwind.config.ts` não deve aumentar o bundle CSS em produção (PurgeCSS/treeshaking remove classes não usadas)
- Screenshots de regressão visual não devem ser executadas no CI de cada commit — apenas em PRs que toquem arquivos de UI

### Architectural Boundaries

- Este sprint NÃO modifica nenhuma lógica de negócio, servidor, banco de dados ou API
- Os 7 componentes em `src/components/ui/` são componentes puros de apresentação sem dependências de servidor
- A feature flag é uma variável de ambiente de build-time (`NEXT_PUBLIC_`), não uma decisão runtime via banco de dados
- O sistema de feature flag não deve ser construído sobre Redis, banco de dados ou qualquer serviço externo — é estático por design neste sprint

---

## 7. Success Metrics

- **Zero regressões visuais**: screenshots de baseline aprovam 100% das páginas existentes com flag `false`
- **Zero regressões funcionais**: suíte E2E mantém >= 120/130 testes passando
- **Build limpo**: `npm run build` e `npm run lint` passam sem erros
- **Cobertura de testes**: >= 80% em todos os 7 componentes da biblioteca
- **Acessibilidade**: 100% dos componentes passam auditoria WCAG 2.1 AA
- **Tokens completos**: 100% das cores, sombras e border radii do DESIGN.md representados como tokens Tailwind
- **Velocidade de desenvolvimento no Sprint 39**: o time estima que aplicar o novo design a uma página completa levará < 4 horas (versus estimativa de 8+ horas sem a infraestrutura deste sprint)

---

## 8. Dependencies

- **docs/design/DESIGN.md**: fonte de verdade para todos os tokens (cores, tipografia, spacing, sombras, radii)
- **docs/design/SCREEN-INDEX.md**: contexto das telas que serão implementadas nos Sprints 39+
- **SPEC-PROD-047**: especificação detalhada dos 7 componentes da biblioteca
- **Sprint 37 (v0.32.0)**: baseline de comportamento funcional que não deve ser alterado
- **Playwright**: ferramenta de E2E existente, que será estendida para screenshots de regressão visual

---

## 9. Vendor Independence

Esta spec descreve O QUE deve ser entregue, não COMO implementar. Detalhes de implementação (qual plugin ESLint usar, como configurar Playwright screenshots, como estruturar o `tailwind.config.ts`) pertencem à especificação técnica correspondente (SPEC-ARCH).

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-23 | product-owner | Initial draft — Sprint 38 |
