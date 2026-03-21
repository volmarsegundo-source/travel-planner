# SPEC-PROD-036: Respecificacao das Regras de Conclusao da Fase 3 — O Preparo (REQ-PHASE3-001)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, architect, ux-designer
**Created**: 2026-03-21
**Last Updated**: 2026-03-21
**Sprint**: 34
**Spec anterior**: SPEC-PROD-030 (Sprint 33) — este spec corrige e substitui as regras de conclusao daquele

---

## 1. Problem Statement

A Fase 3 "O Preparo" e o checklist de documentos da expedicao. O feedback de usuarios e os testes de aceitacao do Sprint 33 revelaram dois problemas criticos com a implementacao atual das regras de conclusao:

**Problema 1 — Bloqueio indevido por itens opcionais**: O sistema atual calcula o status "Concluida" com base em todos os checkboxes, incluindo itens opcionais (ex: "Cartao de credito adicional", "Adapatador de tomada"). Usuarios que nao precisam de determinados itens para a sua viagem especifica ficam bloqueados em status "Em andamento" indefinidamente, mesmo tendo preenchido todos os itens relevantes para eles.

**Problema 2 — Semantica incorreta dos estados**: A Fase 3 pode ser concluida com "Em andamento" de forma permanente quando o usuario marca apenas alguns itens obrigatorios, mesmo que esses itens sejam suficientes para a viagem em questao. A semantica atual nao reflete a intencao real do usuario.

**Problema 3 — Ausencia de retorno a fase**: O sistema atual nao permite ao usuario retornar a Fase 3 para atualizar o checklist conforme se aproxima a data da viagem (ex: obteu o visto, tirou a vacina).

Esses problemas causam abandono do wizard, pois o usuario nao consegue "terminar" a Fase 3 mesmo tendo feito tudo que e relevante para sua viagem.

---

## 2. User Story

As a @leisure-solo traveler planning an international trip,
I want the checklist phase to reflect MY preparation progress accurately,
so that I can advance to the next phase without being blocked by items that do not apply to my trip.

### Traveler Context

- **Pain point**: O viajante marca todos os documentos que precisa para sua viagem (passaporte, visto, vacinas), mas o sistema continua mostrando "Em andamento" porque nao marcou "Cartao de fidelidade da companhia aerea" — um item opcional que ele nao tem e nao precisa.
- **Current workaround**: O usuario marca checkboxes que nao se aplicam a ele apenas para "passar de fase", inserindo dados falsos no sistema.
- **Frequency**: Afeta diretamente viajantes internacionais (maioria do publico-alvo), que tem mais itens no checklist. Estimativa: >= 60% dos usuarios do fluxo de planejamento internacional.

---

## 3. Acceptance Criteria

### AC-001: Status "Concluida" — definicao correta
Given a Fase 3 esta aberta e o checklist de documentos foi renderizado,
when o usuario marca TODOS os checkboxes de itens obrigatorios como concluidos,
then o status da Fase 3 deve ser atualizado para "Concluida" independentemente do estado dos itens opcionais.

### AC-002: Status "Em andamento" — definicao correta
Given a Fase 3 esta aberta,
when o usuario marcou pelo menos 1 checkbox (obrigatorio ou opcional) mas NAO marcou todos os obrigatorios,
then o status da Fase 3 deve ser "Em andamento".

### AC-003: Status "Pendente" — definicao correta
Given a Fase 3 foi acessada pela primeira vez ou foi aberta sem nenhum checkbox marcado,
when nenhum checkbox esta marcado,
then o status da Fase 3 deve ser "Pendente".

### AC-004: Identificacao visual de itens obrigatorios vs opcionais
Given o checklist da Fase 3 esta renderizado,
when o usuario visualiza a lista de itens,
then os itens obrigatorios devem ter identificacao visual clara distinguindo-os dos itens opcionais (ex: asterisco, label "Obrigatorio", ou agrupamento separado).

### AC-005: Itens opcionais nao bloqueiam conclusao
Given o usuario marcou todos os itens obrigatorios e deixou itens opcionais sem marcar,
when o usuario clica "Avancar" no rodape padronizado,
then o sistema deve permitir a navegacao para a Fase 4 sem exibir mensagem de bloqueio.

### AC-006: Itens opcionais contribuem para progresso mas nao para conclusao
Given o usuario marcou todos os obrigatorios e alguns opcionais,
when o progresso da fase e calculado,
then os itens opcionais marcados devem contribuir para a porcentagem de progresso exibida, mas a fase deve ser considerada "Concluida" com apenas os obrigatorios marcados.

### AC-007: Retorno a fase permitido apos conclusao
Given a Fase 3 foi concluida (todos os obrigatorios marcados) e o usuario ja avancou para a Fase 4,
when o usuario navega de volta para a Fase 3 (via progress bar ou botao "Voltar"),
then o sistema deve permitir o acesso a fase, exibindo o estado atual do checklist com as marcacoes salvas.

### AC-008: Atualizacao em tempo real no progress bar
Given a tela de qualquer fase esta sendo exibida com o progress bar visivel,
when o usuario marca ou desmarca um checkbox na Fase 3,
then o status da Fase 3 no progress bar deve ser atualizado de forma imediata e visivel, sem necessidade de salvar ou navegar.

### AC-009: Persistencia das marcacoes ao retornar
Given o usuario marcou checkboxes na Fase 3 e navegou para outra fase,
when o usuario retorna a Fase 3 (seja na mesma sessao ou em sessao posterior),
then todas as marcacoes anteriores devem estar visiveis e persistidas exatamente como foram deixadas.

### AC-010: Indicador de progresso numerico
Given a Fase 3 esta aberta,
when o usuario visualiza a tela,
then deve ser exibido um indicador do tipo "X de Y itens obrigatorios concluidos" (ex: "3 de 5 documentos obrigatorios verificados").

### AC-011: Avanco bloqueado sem nenhum obrigatorio marcado
Given a Fase 3 esta em status "Pendente" (nenhum checkbox marcado),
when o usuario clica "Avancar" no rodape padronizado,
then o sistema deve exibir mensagem explicando que ao menos os itens obrigatorios precisam ser verificados, sem navegar para a Fase 4.

### AC-012: Classificacao de itens obrigatorios por tipo de viagem
Given a viagem foi classificada como "internacional" (baseado na origem e destino da Fase 1),
when o checklist da Fase 3 e renderizado,
then os itens especificos de viagem internacional (passaporte, visto se aplicavel, vacinas se aplicavel) devem ser marcados como obrigatorios.

### AC-013: Classificacao de itens opcionais
Given qualquer tipo de viagem,
when o checklist e renderizado,
then itens como "Cartao de fidelidade de companhia aerea", "Adapatador de tomada", "Seguro de bagagem" devem ser classificados como opcionais e NAO devem impedir a conclusao da fase.

---

## 4. Scope

### In Scope

- Redefinicao da logica de calculo de status da Fase 3 (Pendente / Em andamento / Concluida)
- Separacao clara entre itens obrigatorios e opcionais no checklist
- Identificacao visual de itens obrigatorios vs opcionais
- Indicador de progresso numerico ("X de Y obrigatorios concluidos")
- Persistencia e retorno a fase apos conclusao
- Atualizacao em tempo real do status no progress bar ao marcar/desmarcar checkboxes
- Regra de avanco: bloqueio somente quando zero obrigatorios marcados

### Out of Scope (v1)

- Personalizacao do checklist pelo usuario (adicionar/remover itens) — deferido
- Checklist gerado por IA baseado no perfil do viajante — deferido para sprint futuro
- Notificacoes push/email lembrando o usuario de completar itens — fora do escopo do MVP
- Integracao com sistemas externos para verificacao automatica de documentos — fora do escopo do MVP
- Suporte a viagens com multiplos destinos (checklist por pais) — deferido

---

## 5. Constraints (MANDATORY)

### Security

- A logica de classificacao de itens (obrigatorio/opcional) deve ser definida no servidor, nao manipulavel pelo cliente.
- O status da fase calculado pelo cliente deve ser reconciliado com o servidor ao salvar (prevencao de manipulacao de estado).
- Nenhum dado do usuario (documentos, status de vacinas) deve ser registrado em logs.

### Accessibility

- Checkboxes devem ter labels associados visiveis (nao apenas aria-label escondido).
- O indicador de progresso numerico deve ser legivel por screen readers via aria-live quando atualizado.
- A distincao entre obrigatorio e opcional nao pode ser exclusivamente por cor — deve haver elemento textual ou icone com label.
- Conformidade WCAG 2.1 AA obrigatoria.

### Performance

- A atualizacao do status no progress bar ao marcar um checkbox deve ocorrer em < 100ms (resposta visual imediata — operacao client-side).
- A persistencia das marcacoes (ao clicar "Salvar" no rodape) deve completar em < 1.5s.
- O calculo de completude da fase nao deve bloquear a renderizacao da tela.

### Architectural Boundaries

- A classificacao de itens como obrigatorio/opcional pertence ao dominio de negocio e deve ser definida em configuracao no servidor (nao hardcoded no cliente).
- A logica de calculo de status (Pendente/Em andamento/Concluida) e responsabilidade da Phase Completion Engine (SPEC-PROD-023/SPEC-PROD-026).
- Este spec define O QUE as regras sao; o SPEC-ARCH correspondente define COMO sao implementadas.

---

## 6. Success Metrics

- Taxa de conclusao da Fase 3 (status "Concluida"): aumento de >= 40% em relacao ao Sprint 33
- Taxa de usuarios que marcam checkboxes opcionais "apenas para passar de fase": reducao para < 5% (monitorado via analytics)
- Relatos de suporte "nao consigo avancar da Fase 3": reducao >= 90%
- Taxa de retorno a Fase 3 para atualizacao apos avanco: aumento (indica que o usuario esta usando o checklist como ferramenta real, nao apenas como obstaculo)

---

## 7. Dependencies

- SPEC-PROD-030 (Sprint 33): especificacao base das regras de conclusao da Fase 3 — este spec corrige e refina
- SPEC-PROD-023 (Sprint 31): Phase Completion Logic — motor de calculo de status que sera ajustado
- SPEC-PROD-035 (Sprint 34): rodape padronizado — o botao "Avancar" deste rodape deve invocar as validacoes definidas neste spec
- SPEC-PROD-026 (Sprint 32): Completion Engine Fixes — verificar que as correcoes do Sprint 32 sao compativeis com as novas regras

---

## 8. Vendor Independence

- Este spec descreve WHAT as regras de conclusao sao, nao HOW sao implementadas.
- Nenhuma referencia a bibliotecas ou frameworks especificos.
- A implementacao tecnica pertence ao SPEC-ARCH correspondente para Sprint 34.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | product-owner | Versao inicial — respecificacao completa das regras de conclusao da Fase 3 com 13 ACs, separacao obrigatorio/opcional, e semantica correta dos 3 estados |
