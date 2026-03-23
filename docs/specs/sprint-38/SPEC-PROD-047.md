# SPEC-PROD-047: Component Library v1

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

O Atlas precisa de uma biblioteca de componentes base alinhada ao design system definido em `docs/design/DESIGN.md`. Atualmente, componentes semelhantes (botões, inputs, badges) são implementados de forma independente em cada feature, resultando em inconsistência visual, duplicação de lógica de acessibilidade e ausência de estados padronizados (loading, disabled, error).

Sete componentes core cobrem os padrões de interação mais frequentes da aplicação e serão o alicerce para a migração visual dos Sprints 39+:

1. **Button** — ação primária e secundária em todo o wizard de fases
2. **Input** — campos de texto em fases 1, 2, 3, 4
3. **Card** — container de conteúdo em dashboard, guide cards, summary
4. **Chip** — seleção múltipla em preferências (Phase 2), filtros
5. **Badge** — status de fase, rank do usuário, saldo de PA
6. **PhaseProgress** — indicador das 6 fases da expedição
7. **StepperInput** — seleção numérica para passageiros (Phase 2), quantidade de itens

Todos os componentes são criados neste sprint mas **não são integrados a nenhuma página existente**. A integração ocorre nos Sprints 39+, controlada pela feature flag `NEXT_PUBLIC_DESIGN_V2`.

---

## 2. User Stories

### Story Principal (Desenvolvedor)

As a developer implementing Sprint 39+ screens,
I want a typed, accessible, and tested component library in `src/components/ui/`,
so that I can compose screens quickly without building primitive components from scratch or worrying about accessibility compliance.

### Story Secundária (UX Designer)

As a UX designer reviewing Sprint 39 implementations,
I want components that faithfully implement DESIGN.md tokens and behaviors,
so that the screen implementations match the Google Stitch exports without requiring manual pixel correction.

### Traveler Context

- **Pain point**: Inconsistência visual na interface atual reduz a percepção de qualidade do produto — botões ligeiramente diferentes entre fases, inputs sem estados de erro padronizados, badges sem hierarquia clara.
- **Current workaround**: Cada fase implementou seus próprios padrões visuais, gerando drift acumulativo.
- **Frequency**: Todo fluxo do wizard (6 fases) é afetado. Impacto em 100% das sessões de usuário.

---

## 3. Component Specifications

### 3.1 Button

**Localização**: `src/components/ui/Button/`

**Variantes de tipo** (prop `variant`):
- `primary`: background amber-500, texto branco, hover amber-600, shadow-md — para CTAs principais ("Continuar", "Gerar Roteiro")
- `secondary`: background navy-900, texto branco, hover navy-800 — para ações secundárias confirmadas
- `outline`: border navy-900, texto navy-900, background transparente, hover background navy-50 — para ações alternativas
- `ghost`: sem borda, texto navy-900, hover background gray-50 — para ações de baixa ênfase ("Cancelar", "Voltar")
- `danger`: background vermelho de status, texto branco — para ações destrutivas ("Excluir expedição")

**Variantes de tamanho** (prop `size`):
- `sm`: padding 8px 16px, font-size-small (14px), border-radius button (8px)
- `md`: padding 12px 24px, font-size-body (16px), border-radius button (8px) — padrão
- `lg`: padding 16px 32px, font-size-h2 (24px), border-radius button (8px)

**Estados**:
- `loading`: exibe spinner interno, texto desaparece ou é substituído por texto de carregamento, button é `disabled`
- `disabled`: opacidade 50%, cursor not-allowed, não dispara eventos
- `icon-left` / `icon-right`: slots para ícone antes ou após o label

**Comportamento**:
- Deve aceitar todos os atributos nativos de `<button>` (type, onClick, aria-label, etc.)
- O estado `loading` deve ter aria-busy="true" e aria-label adequado para screen readers

---

### 3.2 Input

**Localização**: `src/components/ui/Input/`

**Estrutura** (sempre renderiza):
- `label`: texto descritivo acima do campo (obrigatório para acessibilidade — pode ser `sr-only` se visualmente oculto)
- `input`: o campo em si — altura 48px, border gray-200, border-radius button (8px), focus ring amber-500
- `helper-text`: texto de apoio abaixo do campo (ex: "Insira seu email de cadastro")
- `error-message`: mensagem de erro substituindo o helper-text quando inválido

**Tipos suportados** (prop `type`): `text`, `email`, `password`, `search`, `tel`, `number`

**Estados**:
- `default`: border gray-200
- `focus`: border amber-500, ring amber-500/20
- `error`: border vermelho de status, `error-message` visível, ícone de erro
- `disabled`: background gray-50, texto gray-400, cursor not-allowed
- `readonly`: sem borda ativa, texto navy-900

**Acessibilidade**:
- `label` e `input` devem ser associados via `htmlFor` / `id` ou `aria-labelledby`
- `error-message` deve ser associado via `aria-describedby`
- Campo `password` deve ter botão de toggle de visibilidade com aria-label

---

### 3.3 Card

**Localização**: `src/components/ui/Card/`

**Slots**:
- `header` (opcional): título e ações do card
- `body` (obrigatório): conteúdo principal
- `footer` (opcional): ações do card, estatísticas, metadados

**Variantes** (prop `variant`):
- `bordered`: background branco, border gray-200, border-radius card (16px), sem sombra — para cards em listas
- `elevated`: background branco, sem border, border-radius card (16px), shadow-elevated — para cards de destaque

**Comportamento**:
- Pode ser clicável (`onClick`) — quando clicável, deve ter role="button", tabIndex=0, e responder a teclado (Enter/Space)
- Deve suportar estado `loading` com skeleton interno
- Padding padrão: card-padding (32px) — pode ser reduzido via prop para contextos densos

---

### 3.4 Chip

**Localização**: `src/components/ui/Chip/`

**Uso principal**: seleção múltipla em categorias de preferências (Phase 2), tags de filtro

**Variantes** (prop `variant`):
- `selectable`: estado unselected (border gray-200, texto gray-500) e selected (border amber-500, background amber-50, texto amber-700)
- `removable`: chip com botão "X" para remoção — usado em listas de tags ativas
- `colored`: chip com cor de fundo sólida baseada em prop `color` — para categorias com cores distintas

**Tamanhos**: `sm` e `md`

**Border radius**: badge (9999px — fully rounded) conforme DESIGN.md

**Comportamento**:
- `selectable`: toggle no click, emite `onChange(value, selected)`
- `removable`: botão X com aria-label="Remover [label]", emite `onRemove(value)`
- Suporte a grupos de chips com seleção múltipla (via componente pai — o Chip não gerencia estado de grupo)

---

### 3.5 Badge

**Localização**: `src/components/ui/Badge/`

**Tipos** (prop `type`):

**Status Badge** — indica estado de uma entidade:
- `success`: background teal-50, texto teal-600, ícone check — para fases completadas, documentos ok
- `warning`: background amber-50, texto amber-600, ícone alert — para itens pendentes
- `error`: background vermelho-50, texto vermelho-600, ícone x — para erros, itens faltando
- `info`: background azul-50, texto azul-600, ícone info — para informações neutras
- `locked`: background gray-100, texto gray-400, ícone cadeado — para fases bloqueadas

**Rank Badge** — exibe o rank gamificado do usuário:
- Cor e label dinâmicos baseados nos 6 ranks definidos no ATLAS-GAMIFICACAO-APROVADO.md
- Ranks: novato, desbravador, navegador, capitao, aventureiro, lendario
- Deve aceitar prop `rank` com esses valores e aplicar o estilo correspondente

**PA Badge** — exibe saldo de pontos de aventura:
- Background navy-900, texto amber-500, ícone PA (estrela/moeda)
- Aceita prop `amount` (number) e formata com separador de milhar

**Tamanho**: `sm` e `md`. Border radius: badge (9999px) conforme DESIGN.md

---

### 3.6 PhaseProgress

**Localização**: `src/components/ui/PhaseProgress/`

**Propósito**: indicador visual do progresso do usuário nas 6 fases da expedição (O Chamado, O Explorador, O Preparo, A Logistica, Guia do Destino, O Roteiro)

**Estados por fase** (prop `phases: Phase[]`):
- `completed`: cor teal-600, ícone check — fase finalizada
- `current`: cor amber-500, pulsante/animado — fase em andamento
- `locked`: cor gray-200, ícone cadeado — fase ainda não desbloqueada
- `available`: cor navy-900 outline — fase desbloqueada mas não iniciada

**Layouts**:
- `horizontal`: barra de progresso com 6 segmentos — para uso no topo do wizard
- `vertical`: lista vertical com labels — para uso em sidebar ou summary

**Comportamento**:
- Cada fase deve ser clicável quando em estado `completed` ou `current` (navega para a fase)
- Fases `locked` não são clicáveis
- Hover em fases completadas exibe tooltip com nome da fase e percentual de conclusão

**Acessibilidade**:
- O componente deve ter `role="progressbar"`, `aria-valuemin=0`, `aria-valuemax=6`, `aria-valuenow=[fases completadas]`
- Um texto alternativo descritivo deve estar disponível: "Expedição: 3 de 6 fases concluídas. Fase atual: O Preparo."

---

### 3.7 StepperInput

**Localização**: `src/components/ui/StepperInput/`

**Uso principal**: seleção de quantidade de passageiros (Phase 2), quantidade de itens em checklists

**Estrutura**:
- Botão decrementar (`-`)
- Campo numérico de exibição (readonly ou editável diretamente)
- Botão incrementar (`+`)
- Label descritivo acima (ex: "Adultos", "Crianças")
- Subtítulo opcional abaixo (ex: "Acima de 12 anos")

**Props**:
- `value`: valor atual
- `min`: valor mínimo (padrão: 0)
- `max`: valor máximo
- `step`: incremento (padrão: 1)
- `label`: texto descritivo
- `subtitle`: texto de apoio opcional
- `onChange`: callback com novo valor

**Comportamento**:
- Botão `-` desabilitado quando `value === min`
- Botão `+` desabilitado quando `value === max`
- Digitação direta no campo valida contra `min`/`max` ao perder foco
- Long-press (500ms) nos botões ativa incremento contínuo

**Acessibilidade**:
- O campo central deve ter `role="spinbutton"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- Botões devem ter `aria-label="Diminuir [label]"` e `aria-label="Aumentar [label]"`

---

## 4. Acceptance Criteria

### Button

- [ ] AC-001: Dado que o Button é renderizado com `variant="primary"`, quando visualizado, então exibe background amber-500, texto branco e border-radius 8px
- [ ] AC-002: Dado que o Button está em estado `loading`, quando renderizado, então exibe spinner, está `disabled` e tem `aria-busy="true"`
- [ ] AC-003: Dado que o Button está em estado `disabled`, quando o usuário clica, então o evento `onClick` não é disparado
- [ ] AC-004: Dado que o Button tem `variant="danger"`, quando renderizado, então a cor comunica visualmente ação destrutiva

### Input

- [ ] AC-005: Dado que o Input recebe prop `error="Mensagem de erro"`, quando renderizado, então exibe borda vermelha e a mensagem de erro associada via `aria-describedby`
- [ ] AC-006: Dado que o Input recebe prop `label`, quando renderizado, então label e input estão corretamente associados para screen readers
- [ ] AC-007: Dado que o Input tem `type="password"`, quando o usuário clica no toggle de visibilidade, então o campo alterna entre `type="password"` e `type="text"`

### Card

- [ ] AC-008: Dado que o Card recebe `variant="elevated"`, quando renderizado, então exibe shadow-elevated sem border
- [ ] AC-009: Dado que o Card recebe prop `onClick`, quando o usuário pressiona Enter com foco no card, então o onClick é disparado

### Chip

- [ ] AC-010: Dado que o Chip `selectable` é clicado, quando estava unselected, então transita para estado selected com border amber-500
- [ ] AC-011: Dado que o Chip `removable` tem foco e o usuário pressiona Enter, então `onRemove` é chamado

### Badge

- [ ] AC-012: Dado que o Badge recebe `type="success"`, quando renderizado, então exibe as cores e ícone de sucesso do design system
- [ ] AC-013: Dado que o Badge recebe `type="rank" rank="lendario"`, quando renderizado, então exibe o estilo do rank lendario

### PhaseProgress

- [ ] AC-014: Dado que o PhaseProgress renderiza com 3 fases completed, 1 current e 2 locked, quando inspecionado por screen reader, então o texto alternativo descreve corretamente o estado
- [ ] AC-015: Dado que o usuário clica em uma fase `locked`, quando a fase não está desbloqueada, então nenhuma navegação ocorre e o cursor indica estado não-interativo

### StepperInput

- [ ] AC-016: Dado que o StepperInput está em `value=min`, quando o usuário clica em diminuir, então o botão está desabilitado e o valor não muda
- [ ] AC-017: Dado que o StepperInput recebe `label="Adultos"`, quando renderizado com botão de incremento, então `aria-label="Aumentar Adultos"` está presente

### Gerais

- [ ] AC-018: Dado que todos os 7 componentes são criados, quando executado `npm run test`, então nenhum teste falha e cobertura >= 80% para cada componente
- [ ] AC-019: Dado que `NEXT_PUBLIC_DESIGN_V2=false`, quando todos os 7 componentes existem em `src/components/ui/`, então nenhuma página existente renderiza os novos componentes
- [ ] AC-020: Dado que qualquer componente é auditado com ferramenta de acessibilidade, quando verificado contraste de cor, então a relação de contraste atende WCAG 2.1 AA (mínimo 4.5:1 para texto normal, 3:1 para texto grande)

---

## 5. Scope

### In Scope

- Os 7 componentes listados nesta spec, em `src/components/ui/`
- Testes unitários para cada componente (cobertura >= 80%)
- Documentação de uso em `src/components/ui/README.md`
- Verificação de acessibilidade (WCAG 2.1 AA) em cada componente
- Suporte a i18n (sem strings hardcoded)

### Out of Scope (v1 — Sprint 38)

- Integração dos componentes em qualquer página ou feature existente
- Componentes além dos 7 listados (ex: Modal, Toast, Dropdown, DatePicker — Sprint 39+)
- Storybook ou sistema de documentação interativa
- Testes de snapshot visual dos componentes isolados (coberto pelo sistema de regressão de SPEC-PROD-046)
- Suporte a tema escuro

---

## 6. Constraints

### Security

- Nenhum componente deve aceitar ou renderizar conteúdo HTML arbitrário (risco XSS) — use props tipadas
- O componente Input `type="password"` deve nunca logar ou expor o valor em console
- Nenhum componente deve fazer chamadas a APIs externas ou internas

### Accessibility

- WCAG 2.1 AA obrigatório para todos os componentes
- Todos os componentes interativos devem ser navegáveis por teclado
- Todos os ícones decorativos devem ter `aria-hidden="true"`
- Todos os ícones funcionais devem ter `aria-label` descritivo
- Estados de foco devem ser visivelmente distintos (outline amber-500 ou equivalente de alto contraste)
- Nenhuma informação deve ser comunicada exclusivamente por cor

### Performance

- Cada componente deve ser um módulo independente (tree-shakeable) — nenhum import de barrel que inclua todos os 7 componentes de uma vez
- Sem dependências externas além do que já existe no projeto (Tailwind, React)
- O bundle size total dos 7 componentes não deve exceder 15kb gzipped

### Architectural Boundaries

- Componentes em `src/components/ui/` são componentes de apresentação pura — sem acesso a servidor, banco de dados, APIs ou contextos de autenticação
- Props de internacionalização (strings de label, aria-labels) devem ser recebidas via props — os componentes não fazem chamadas a `useTranslations()` internamente
- Os componentes devem ser compatíveis com Server Components do Next.js quando renderizados sem interatividade (sem `"use client"` desnecessário)

---

## 7. Success Metrics

- **Cobertura de testes**: >= 80% em cada um dos 7 componentes
- **Acessibilidade**: 0 violações WCAG 2.1 AA em auditoria automatizada
- **Adoção no Sprint 39**: >= 5 dos 7 componentes utilizados na primeira tela migrada
- **Velocidade de revisão do UX Designer**: revisão de um componente não leva mais de 30 minutos (design tokens garantem alinhamento imediato)
- **Zero issues de contraste**: todas as combinações de cor (texto sobre fundo) atendem ratio mínimo de 4.5:1

---

## 8. Dependencies

- **SPEC-PROD-046**: os tokens de design (REQ-DS-001 a REQ-DS-003) devem estar implementados antes dos componentes — os componentes dependem dos tokens Tailwind e variáveis CSS
- **docs/design/DESIGN.md**: fonte de verdade para valores de cor, tipografia, border-radius e sombras usados em cada componente
- **docs/design/SCREEN-INDEX.md**: as telas exportadas do Stitch fornecem contexto de como os componentes serão compostos no Sprint 39

---

## 9. UX Designer Participation

O `ux-designer` deve revisar cada componente antes da aprovação do PR:

| Componente | Critério de revisão do UX Designer |
|------------|-------------------------------------|
| Button | Verificar que todos os 5 variants comunicam claramente hierarquia de ação |
| Input | Verificar que estados de erro são visualmente distintos e não apenas colorísticos |
| Card | Verificar que o padding e o border-radius criam a "respiração visual" do DESIGN.md |
| Chip | Verificar que o estado selected é imediatamente perceptível sem dependência de cor |
| Badge | Verificar que rank badge e PA badge têm hierarquia visual coerente com o sistema de gamificação |
| PhaseProgress | Verificar que a distinção entre completed/current/locked é clara em mobile 375px |
| StepperInput | Verificar que o tamanho dos alvos de toque (botões + e -) atende mínimo de 44x44px |

---

## 10. Vendor Independence

Esta spec descreve O QUE cada componente deve fazer, não COMO implementar. Decisões como estrutura de arquivos, sistema de variantes, padrão de composition vs. props pertencem à especificação técnica (SPEC-ARCH).

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-23 | product-owner | Initial draft — Sprint 38 |
