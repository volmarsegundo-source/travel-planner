---
spec-id: SPEC-PROD-026
title: Completion Engine Fixes — Estados de Fase, Auto-conclusao e Avisos de Dados Incompletos
version: 1.0.0
status: Draft
author: product-owner
sprint: 32
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-026: Completion Engine Fixes — Estados de Fase, Auto-conclusao e Avisos de Dados Incompletos

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-19
**Sprint**: 32
**Relacionado a**: SPEC-PROD-023 (Phase Completion Logic — Sprint 31), SPEC-PROD-016 (Phase Navigation Engine)
**Bugs cobertos**: P0-002, P0-003, P0-007
**Melhorias UX cobertas**: UX-006, UX-008

---

## Contexto: Por que Este Documento Existe

O motor de conclusao de fases foi introduzido em SPEC-PROD-023 (Sprint 31). Os testes de v0.26.0 revelaram que a implementacao nao cobre todos os cenarios especificados:

- **P0-002**: O estado de conclusao nao reverte quando o usuario desmarca itens obrigatorios (comportamento esperado: descompleta a fase automaticamente).
- **P0-003**: Phase 4 ("A Logistica") e marcada como COMPLETED sem dados reais — o criterio de "fase acessada" esta sendo usado erroneamente como criterio de conclusao.
- **P0-007**: Quando todas as 6 fases atingem COMPLETED, a auto-conclusao da expedicao nao e disparada (o campo `trip.status` nao muda para COMPLETED).

Alem dos bugs, dois comportamentos desejados foram identificados em validacao de UX:

- **UX-006**: Phase 6 deveria ser marcada como COMPLETED automaticamente no momento em que o itinerario e gerado, sem acao adicional do usuario.
- **UX-008**: Antes de permitir o avanco para a proxima fase, o sistema deve exibir aviso quando a fase atual tem dados incompletos que impactarao a qualidade do planejamento subsequente.

Este spec unifica os 5 itens porque todos operam sobre a mesma camada: o motor de calculo de estados de fase.

---

## 1. Problem Statement

O motor de conclusao de fases apresenta tres falhas de comportamento que comprometem a integridade dos dados da expedicao:

1. **Irreversibilidade incorreta** (P0-002): Fases marcadas como COMPLETED nao revertem para IN_PROGRESS quando o usuario remove dados que eram os criterios de conclusao. O usuario ve uma fase "concluida" que na realidade esta incompleta.

2. **Conclusao prematura** (P0-003): Phase 4 e marcada como COMPLETED pelo simples fato de ser acessada, mesmo sem nenhum dado de transporte ou acomodacao. Qualquer usuario que abre Phase 4 e sai sem preencher nada ve a fase como concluida.

3. **Auto-conclusao ausente** (P0-007): A logica de auto-conclusao da expedicao (disparar quando fases 1–6 = COMPLETED) nao esta ativa. Expedicoes com todas as fases concluidas permanecem com `status = IN_PROGRESS`.

---

## 2. User Story

As a @leisure-solo or @leisure-family,
I want accurate phase completion tracking so that I know exactly what is done and what needs attention,
so that I can trust the progress indicators, identify gaps in my planning, and have my expedition automatically marked complete when I finish all phases.

### Contexto do Traveler

- **Pain point**: A barra de progresso e os badges de fase mostram "concluido" para fases que nao estao realmente concluidas. O viajante confia no indicador visual, avanca, e descobre mais tarde que dados criticos estao ausentes (ex: nenhum transporte registrado, checklist pendente).
- **Workaround atual**: Nenhum efetivo. O viajante nao tem como saber que o estado exibido e incorreto — o proprio sistema esta confirmando erroneamente.
- **Frequencia**: P0-003 afeta 100% dos usuarios que acessam Phase 4 sem preencher dados. P0-002 afeta qualquer usuario que revisa e remove dados de uma fase ja concluida.

---

## 3. Acceptance Criteria

### P0-002 — Regressao de estado ao desmarcar itens obrigatorios

- [ ] **AC-001**: Dado uma expedicao com Phase 3 em estado COMPLETED (todos os itens REQUIRED marcados), quando o usuario desmarca pelo menos 1 item com `priority = REQUIRED`, entao o estado de Phase 3 reverte imediatamente para IN_PROGRESS.
- [ ] **AC-002**: Dado uma expedicao com Phase 3 em estado COMPLETED, quando o usuario desmarca e remarca todos os itens REQUIRED (restaura o estado original), entao o estado de Phase 3 retorna para COMPLETED.
- [ ] **AC-003**: Dado uma expedicao com Phase 1 em estado COMPLETED, quando o usuario apaga o valor do campo `destination` (deixa vazio), entao o estado de Phase 1 reverte para IN_PROGRESS.
- [ ] **AC-004**: Dado uma expedicao com Phase 2 em estado COMPLETED, quando o usuario remove todas as preferencias salvas (resultando em 0 categorias preenchidas), entao o estado de Phase 2 reverte para IN_PROGRESS.
- [ ] **AC-005**: Dado qualquer fase em estado COMPLETED, quando o usuario remove dados que eram necessarios para a conclusao dessa fase (conforme criterios de SPEC-PROD-023), entao o estado da fase reverte para IN_PROGRESS — este comportamento e universal para todas as 6 fases ativas.

### P0-003 — Phase 4 nao conclui apenas por ser acessada

- [ ] **AC-006**: Dado um viajante que abre Phase 4 pela primeira vez sem preencher nenhum dado de transporte ou acomodacao, quando o viajante sai de Phase 4 (via "Voltar", via menu lateral, ou via dashboard), entao o estado de Phase 4 e IN_PROGRESS (nao COMPLETED).
- [ ] **AC-007**: Dado um viajante que nunca abriu Phase 4, entao o estado de Phase 4 e NOT_STARTED.
- [ ] **AC-008**: Dado um viajante que registrou pelo menos 1 entrada de transporte em Phase 4, entao o estado de Phase 4 e COMPLETED (criterio correto conforme SPEC-PROD-023 AC-008).
- [ ] **AC-009**: Dado um viajante que registrou pelo menos 1 entrada de acomodacao (sem transporte), entao o estado de Phase 4 e COMPLETED.
- [ ] **AC-010**: Dado um viajante que abriu Phase 4, nao preencheu nada, e retornou em outra sessao para preencher 1 entrada de transporte, entao o estado muda de IN_PROGRESS para COMPLETED no momento do salvamento do registro.

### P0-007 — Auto-conclusao da expedicao quando todas as fases atingem COMPLETED

- [ ] **AC-011**: Dado uma expedicao onde as fases 1, 2, 3, 4, e 5 estao em COMPLETED e o viajante acaba de completar Phase 6, quando o sistema detecta que todas as 6 fases ativas estao em COMPLETED, entao `trip.status` e automaticamente atualizado para COMPLETED sem acao manual do usuario.
- [ ] **AC-012**: Dado uma expedicao com `trip.status = COMPLETED` (auto-concluida), quando o usuario acessa o dashboard, entao a expedicao e exibida com indicador visual de "concluida" distinto do indicador de "em andamento".
- [ ] **AC-013**: Dado uma expedicao com `trip.status = COMPLETED`, quando o usuario revisita uma fase e remove dados que fazem aquela fase regredir para IN_PROGRESS, entao `trip.status` reverte de COMPLETED para IN_PROGRESS automaticamente.
- [ ] **AC-014**: Dado que a auto-conclusao e disparada, quando o evento ocorre, entao o motor de pontuacao de gamificacao credita os pontos de conclusao de expedicao ao usuario (conforme logica de `PointsEngine`).

### UX-006 — Phase 6 marca como COMPLETED ao gerar itinerario

- [ ] **AC-015**: Dado um viajante em Phase 6 que solicita a geracao do itinerario, quando a geracao e concluida com sucesso (pelo menos 1 `ItineraryDay` criado), entao o estado de Phase 6 muda para COMPLETED automaticamente — sem que o usuario precise clicar em "Concluir" ou qualquer botao adicional.
- [ ] **AC-016**: Dado Phase 6 em estado COMPLETED (itinerario ja gerado), quando o viajante edita manualmente o itinerario, entao o estado permanece COMPLETED (edicoes manuais nao regridem o estado).
- [ ] **AC-017**: Dado Phase 6 em estado COMPLETED, quando o viajante regenera o itinerario (nova chamada de geracao AI), entao o estado permanece COMPLETED durante e apos a geracao.

### UX-008 — Aviso antes de avancar com dados incompletos

- [ ] **AC-018**: Dado um viajante em Phase 4 com estado IN_PROGRESS (fase acessada mas sem transporte ou acomodacao registrados), quando o viajante clica em "Proximo" para avancar para Phase 5, entao o sistema exibe um aviso inline (nao modal bloqueante) informando que Phase 4 nao esta concluida e que dados de transporte e acomodacao melhoram a qualidade do guia e do roteiro.
- [ ] **AC-019**: Dado o aviso de dados incompletos (AC-018), entao o aviso inclui dois botoes: "Continuar mesmo assim" (avanca para a proxima fase) e "Completar agora" (permanece na fase atual).
- [ ] **AC-020**: Dado o aviso de dados incompletos, quando o viajante clica em "Continuar mesmo assim", entao o sistema permite o avanco para a proxima fase normalmente — o aviso e informativo, nao bloqueante.
- [ ] **AC-021**: Dado uma fase em estado COMPLETED, quando o viajante clica em "Proximo", entao nenhum aviso de dados incompletos e exibido — o aviso so aparece para fases em IN_PROGRESS.
- [ ] **AC-022**: Dado uma fase em estado NOT_STARTED, quando o viajante tenta avancar sem ter acessado a fase, entao o comportamento e definido pelas regras de desbloqueio de SPEC-PROD-016 (fases bloqueadas nao exibem aviso — exibem o estado de bloqueio correto).
- [ ] **AC-023**: Dado o aviso de dados incompletos, entao o texto do aviso e exibido no locale do usuario (PT-BR ou EN) — nao pode ser texto hardcoded.

---

## 4. Scope

### In Scope

- Calculo bidirecional de estados de fase (progresso E regressao)
- Correcao do criterio de conclusao de Phase 4 (exige dado salvo, nao apenas acesso)
- Trigger de auto-conclusao da expedicao (todas as 6 fases em COMPLETED → `trip.status = COMPLETED`)
- Regressao de `trip.status` quando uma fase regressa de COMPLETED para IN_PROGRESS
- Marcacao automatica de Phase 6 como COMPLETED no momento da geracao do itinerario
- Aviso informativo (nao bloqueante) ao tentar avancar de fase com estado IN_PROGRESS
- Credito de pontos de gamificacao ao auto-completar a expedicao (AC-014)

### Out of Scope

- Notificacoes por email ou push quando a expedicao e auto-concluida (roadmap futuro)
- Aviso de dados incompletos para fases alem de Phase 4 na v1 deste spec — avaliar extensao para Phase 2 e Phase 3 em Sprint 33 com base no feedback de beta
- Desfazer auto-conclusao de expedicao (nao existe mecanismo de "desfazer" — o usuario pode apenas editar os dados de uma fase para regredi-la)
- Logica de estados para Phase 7 e Phase 8 (roadmap futuro, fora do MVP)

---

## 5. Constraints (MANDATORY)

### Security

- O calculo de estado de fase e sempre autoritario no servidor — o cliente pode exibir o estado, mas nao pode defini-lo sem validacao server-side
- A auto-conclusao de expedicao (`trip.status = COMPLETED`) deve verificar que o `userId` da sessao corresponde ao `trip.userId` antes de atualizar (prevencao de BOLA/IDOR)
- Operacoes de update em cascata (`trip.status` ao completar todas as fases) devem ser atomicas — usar transacao de banco de dados para evitar estados intermediarios invalidos

### Accessibility

- O aviso de dados incompletos (UX-008, AC-018) deve ser anunciado por screen readers (role="alert" ou aria-live="polite" — nao "assertive", pois e informativo e nao critico)
- Os botoes "Continuar mesmo assim" e "Completar agora" devem ser acessiveis por teclado com foco gerenciado corretamente
- O indicador visual de expedicao "concluida" no dashboard deve ter alternativa textual alem da cor (WCAG 1.4.1 — uso de cor nao pode ser o unico diferenciador)

### Performance

- O recalculo de estado de fase deve ocorrer em menos de 200ms (p95) — e uma operacao de leitura + calculo simples, nao um processo pesado
- A trigger de auto-conclusao nao deve bloquear a resposta ao usuario — pode ser processada de forma assincrona com atualizacao otimista na UI
- Nenhuma query N+1 deve ser introduzida para o calculo de estados — carregar todos os dados necessarios de uma expedicao em uma unica query

### Architectural Boundaries

- Este spec opera exclusivamente sobre as regras de negocio de estados — a implementacao tecnica do motor de estado pertence ao SPEC-ARCH correspondente
- Os criterios de conclusao por fase sao os definidos em SPEC-PROD-023 — este spec nao redefine esses criterios, apenas corrige sua implementacao
- O aviso de UX-008 e um componente de UI informativo — nao altera as regras de navegacao definidas em SPEC-PROD-016

---

## 6. Success Metrics

| Metrica | Baseline (v0.26.0) | Meta (Sprint 32) | Prazo |
|---------|-------------------|-----------------|-------|
| Phase 4 incorretamente em COMPLETED sem dados | Ocorre em 100% dos acessos sem preenchimento | 0 ocorrencias | Sprint 32 QA |
| Fases que nao revertem ao remover dados | Presente (bug confirmado) | 0 ocorrencias em testes de regressao | Sprint 32 QA |
| Expedicoes com todas as 6 fases COMPLETED mas status != COMPLETED | Presente (bug confirmado) | 0 | Sprint 32 QA |
| Expedicoes com auto-conclusao correta (6 fases OK → status COMPLETED) | 0% (feature nao funciona) | 100% | Sprint 32 QA |
| Reducao de reportes "minha expedicao nao esta concluindo" em beta | N/A (beta nao lancado) | 0 reportes relacionados a estes bugs | Sprint 33 |

---

## 7. Dependencies

- **SPEC-PROD-023** (Phase Completion Logic, Sprint 31): os criterios de conclusao por fase definidos neste spec sao a especificacao autoritaria que este fix deve implementar corretamente — SPEC-PROD-026 corrige a implementacao, nao redefine os criterios
- **SPEC-PROD-016** (Phase Navigation Engine): os guards de navegacao consomem os estados calculados — uma correcao aqui afeta diretamente quais fases ficam acessiveis
- **SPEC-PROD-025** (Phase Transition Fixes): ambos os specs operam sobre o motor de fases — implementar nesta ordem: SPEC-PROD-025 primeiro (transicoes funcionando), depois SPEC-PROD-026 (estados corretos sobre transicoes corretas)

---

## 8. Vendor Independence

- Este spec descreve O QUE o motor de estados deve fazer, nao COMO implementar o calculo.
- A escolha de onde o calculo ocorre (server action, middleware, hook de cliente, trigger de banco de dados) e decisao tecnica do architect.
- A solucao tecnica deve ser documentada em SPEC-ARCH correspondente antes da implementacao.

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | product-owner | Documento inicial — Sprint 32 stabilization, bugs P0-002/P0-003/P0-007 e melhorias UX-006/UX-008 |
