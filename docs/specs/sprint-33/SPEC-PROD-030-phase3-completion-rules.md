# SPEC-PROD-030: Regras de Conclusao da Fase 3 — O Preparo (IMP-002)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, ux-designer, architect
**Created**: 2026-03-20
**Last Updated**: 2026-03-20

---

## 1. Problem Statement

A Fase 3 ("O Preparo") e o checklist de documentos da viagem. Atualmente, as regras de conclusao dessa fase estao imprecisas: ha ambiguidade sobre quais itens sao obrigatorios para marcar a fase como "Concluida", e o sistema pode estar bloqueando o avanco para a Fase 4 de forma incorreta.

O checklist de documentos tem natureza diferente das demais fases: itens como "tirar visto" ou "renovar passaporte" dependem de fatores externos (prazos, consulados) que o viajante pode nao conseguir resolver de imediato. Bloquear o avanco porque o viajante ainda nao tirou o visto seria uma friccao injustificada — o viajante precisa continuar planejando a logistica enquanto resolve os documentos em paralelo.

A regra correta e: o viajante PODE avancar a qualquer momento, mas a fase so e marcada "Concluida" quando os itens obrigatorios (checkbox marcado como obrigatorio pelo sistema) estiverem todos confirmados.

## 2. User Story

As a @leisure-family,
I want to be able to advance to Phase 4 even if I haven't completed all document checklist items,
so that I can continue planning my trip logistics while I work on obtaining documents in parallel.

### Traveler Context

- **Pain point**: O viajante preenche destino, datas e preferencias com entusiasmo, chega na Fase 3 e se depara com itens que ainda nao pode marcar (ex.: "visto solicitado" — prazo de 30 dias). O sistema bloqueia o avanco e o viajante abandona o fluxo.
- **Current workaround**: O viajante marca o item como feito sem ter feito, apenas para desbloquear o avanco — comprometendo a integridade dos dados do checklist.
- **Frequency**: Toda vez que o viajante planeja uma viagem internacional ou que exija documentos com prazo longo. Estima-se que 60-70% das viagens internacionais tenham pelo menos um item com dependencia externa.

## 3. Acceptance Criteria

- [ ] AC-001: Dado que o usuario esta na Fase 3, ele pode clicar em "Avancar" a qualquer momento, independentemente de quantos itens do checklist estao marcados — incluindo zero itens.
- [ ] AC-002: Dado que o usuario avancou sem completar todos os itens obrigatorios, o sistema registra o status da Fase 3 como "Em andamento" (nao como "Concluida").
- [ ] AC-003: Dado que o usuario marcou TODOS os itens classificados como obrigatorios pelo sistema, o status da Fase 3 muda automaticamente para "Concluida".
- [ ] AC-004: Dado que um item do checklist nao foi marcado, ele permanece com status "Pendente" — nao como erro ou bloqueio, apenas como indicador de pendencia.
- [ ] AC-005: Dado que o usuario retorna a Fase 3 apos ter avancado, todos os itens que ele marcou anteriormente permanecem marcados — o estado e persistido.
- [ ] AC-006: Dado que o usuario marca um item que era o ultimo obrigatorio pendente, o status da fase muda para "Concluida" imediatamente e o usuario ve o indicador visual de fase concluida sem precisar recarregar a pagina.
- [ ] AC-007: Dado que o usuario desmarca um item obrigatorio que estava marcado, o status da fase reverte de "Concluida" para "Em andamento" automaticamente.
- [ ] AC-008: Dado que a fase esta "Em andamento" (itens pendentes), o dashboard exibe o contador de itens pendentes ao lado do nome da fase (ex.: "3 pendencias").
- [ ] AC-009: Itens nao-obrigatorios (opcionais) nunca bloqueiam a transicao para "Concluida" — a fase pode ser "Concluida" mesmo com itens opcionais nao marcados.
- [ ] AC-010: O sistema diferencia visivelmente itens obrigatorios de itens opcionais no checklist (ex.: indicador visual como asterisco ou badge "Obrigatorio").
- [ ] AC-011: Dado que nenhum item foi tocado (zero marcacoes), o status da Fase 3 e "Nao iniciada" — nao "Em andamento".

## 4. Scope

### In Scope

- Regras de calculo de status da Fase 3 ("Nao iniciada", "Em andamento", "Concluida")
- Liberacao do botao "Avancar" na Fase 3 sem dependencia de itens marcados
- Diferenciacao visual entre itens obrigatorios e opcionais
- Contador de pendencias no dashboard
- Persistencia do estado dos checkboxes ao revisitar a fase

### Out of Scope

- Definicao de quais itens especificos sao obrigatorios vs opcionais (responsabilidade do SPEC de conteudo do checklist, existente em spec legada de Sprint 11-12)
- Adicao ou remocao de itens do checklist pelo usuario (feature futura)
- Integracoes externas para verificacao automatica de documentos (ex.: API de vistos)
- Notificacoes de lembrete para itens pendentes (feature futura — SPEC-PROD-035+)

## 5. Constraints (MANDATORY)

### Security

- A atualizacao do status da fase deve verificar BOLA — usuario so pode alterar checkboxes da propria expedicao
- O status "Concluida" nao deve poder ser forcado por parametro de requisicao; deve ser calculado server-side a partir do estado real dos checkboxes

### Accessibility

- WCAG 2.1 AA obrigatorio
- Checkboxes devem ser nativamente acessiveis com `<input type="checkbox">` ou equivalente ARIA (`role="checkbox"`)
- O indicador de "Obrigatorio" deve ser comunicado por texto (nao apenas por cor ou simbolo visual) para leitores de tela
- A mudanca de status da fase (ex.: "Fase concluida!") deve ser anunciada via `aria-live`

### Performance

- A atualizacao do status da fase apos marcar/desmarcar um item deve refletir na UI em menos de 500ms
- O recalculo do status pode ser feito client-side (otimista) e confirmado server-side em background

### Architectural Boundaries

- O motor de calculo de status de fase (completedPhases, phase status) ja existe em SPEC-PROD-026 e SPEC-ARCH-018 — esta spec define o COMPORTAMENTO especifico para Fase 3, nao reescreve o motor
- Nao introduzir um campo de banco de dados separado para "obrigatorio" se o checklist ja possui esse atributo — reutilizar estrutura existente

## 6. Success Metrics

- Taxa de abandono na Fase 3: reducao >= 30% em relacao ao baseline de Sprint 32 (estimado pelo numero de sessoes que chegam a Fase 3 mas nao avancam)
- Integridade dos dados: reducao de 100% em marcacoes falsas (usuarios que marcam itens nao feitos para desbloquear avanco) — medido por survey de beta
- Taxa de conclusao da Fase 3: percentual de usuarios que retornam a Fase 3 para completar itens pendentes apos ter avancado — meta >= 40%

## 7. Dependencies

- SPEC-PROD-026: Completion Engine Fixes — a logica de status de fase definida ali e a base para as regras desta spec
- SPEC-PROD-029: Standardized Footer — o botao "Avancar" da Fase 3 segue o comportamento global definido naquela spec
- Definicao de conteudo do checklist (itens obrigatorios vs opcionais) — deve existir no banco de dados antes da implementacao desta spec

## 8. Vendor Independence

- Este spec descreve WHAT the feature does, not HOW it is implemented.
- Must NOT reference specific libraries, frameworks, or vendor products.
- Implementation details belong in the corresponding SPEC-ARCH-XXX.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-20 | product-owner | Rascunho inicial — Sprint 33 IMP-002 |
