---
spec-id: SPEC-PROD-025
title: Phase Transition Fixes — Erros P0-001 e P0-006 em Transicoes de Fase
version: 1.0.0
status: Draft
author: product-owner
sprint: 32
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-025: Phase Transition Fixes — Erros P0-001 e P0-006 em Transicoes de Fase

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-19
**Sprint**: 32
**Relacionado a**: SPEC-PROD-016 (Phase Navigation Engine), SPEC-PROD-023 (Phase Completion Logic)
**Bugs cobertos**: P0-001 (erro em Phase 2→3 e Phase 5→6), P0-006 (navegacao 2→3 apos retorno de fase avancada)

---

## Contexto: Por que Este Documento Existe

Os testes de v0.26.0 identificaram dois bugs P0 que bloqueiam a progressao do viajante dentro da expedicao. Em combinacao, eles tornam impossivel completar o fluxo padrao da expedicao sem intervencao manual (retornar ao dashboard e reentrar na fase):

- **P0-001**: As transicoes Phase 2→3 e Phase 5→6 resultam em uma tela de erro generica ("Algo deu errado"). O usuario nao recebe contexto sobre o problema e precisa navegar manualmente de volta ao dashboard para continuar. A transicao pelo botao "Proximo" na fase de origem dispara o erro.

- **P0-006**: Quando o usuario percorre o fluxo em sentido inverso (Phase 6→5→4→3→2) e em seguida tenta avancar Phase 2→3, a transicao falha. A navegacao de retrocesso em si funciona corretamente; o problema e especifico ao avancar apos ter retrocedido ate a Phase 2.

A hipotese tecnica inicial aponta para estado inconsistente do motor de navegacao apos navegacao bidirecional, mas a causa raiz e de responsabilidade do architect e dos desenvolvedores. Este spec define os requisitos comportamentais esperados sem prescrever a solucao tecnica.

---

## 1. Problem Statement

Viajantes nao conseguem completar suas expedicoes de forma sequencial. As transicoes Phase 2→3 e Phase 5→6 — que ocorrem no caminho critico de toda expedicao — resultam em erro, interrompendo o fluxo de planejamento. O impacto e total: nenhum viajante que inicia do zero consegue chegar a Phase 6 sem encontrar ao menos um dos erros reportados.

Taxa de falha observada em testes manuais de v0.26.0: 100% das tentativas de avancar Phase 2→3 via fluxo direto.

---

## 2. User Story

As a @leisure-solo or @leisure-family,
I want to advance between expedition phases without encountering errors,
so that I can complete my trip planning seamlessly from Phase 1 through Phase 6.

### Contexto do Traveler

- **Pain point**: O usuario clica no botao de avancar em Phase 2 ou Phase 5 e ve uma tela de erro generica. Nao sabe o que aconteceu, nao sabe como continuar, e perde confianca no produto.
- **Workaround atual**: Navegar manualmente ao dashboard e clicar no card da fase seguinte. Requer conhecimento do workaround — viajantes de primeira vez provavelmente abandonam.
- **Frequencia**: Afeta 100% das expedicoes no caminho critico (Phase 2→3 e Phase 5→6 ocorrem em toda expedicao).

---

## 3. Acceptance Criteria

### Transicoes diretas (fluxo sequencial)

- [ ] **AC-001**: Dado um viajante em Phase 2 com dados validos preenchidos, quando o viajante clica em "Proximo" (ou equivalente), entao o sistema transita para Phase 3 sem exibir tela de erro.
- [ ] **AC-002**: Dado um viajante em Phase 5 com guia do destino gerado, quando o viajante clica em "Proximo", entao o sistema transita para Phase 6 sem exibir tela de erro.
- [ ] **AC-003**: Dado um viajante iniciando uma expedicao nova, quando o viajante avanca sequencialmente pelas fases 1→2→3→4→5→6 clicando apenas em "Proximo", entao cada transicao completa com sucesso e o viajante chega a Phase 6 sem ver tela de erro em nenhuma fase.

### Transicoes apos navegacao reversa (P0-006)

- [ ] **AC-004**: Dado um viajante que navegou de Phase 6 de volta ate Phase 2 usando o botao "Voltar" (percurso 6→5→4→3→2), quando o viajante clica em "Proximo" estando em Phase 2, entao o sistema transita para Phase 3 sem erro.
- [ ] **AC-005**: Dado um viajante que usou o menu lateral ou barra de progresso para saltar diretamente para Phase 2 a partir de qualquer outra fase, quando o viajante clica em "Proximo" em Phase 2, entao o sistema transita para Phase 3 sem erro.
- [ ] **AC-006**: Dado qualquer sequencia valida de navegacao (direta, reversa, ou com saltos), quando o viajante tenta avancar de qualquer fase para a proxima, entao nenhuma tela de erro e exibida se o estado da expedicao e valido.

### Ausencia de regressoes

- [ ] **AC-007**: Dado as transicoes Phase 1→2, Phase 3→4 e Phase 4→5 que funcionavam corretamente em v0.26.0, quando implementada a correcao para P0-001 e P0-006, entao essas transicoes continuam funcionando sem regressao.
- [ ] **AC-008**: Dado a navegacao reversa de qualquer fase para fase anterior (ex: Phase 4→3, Phase 3→2), quando o viajante clica em "Voltar", entao a navegacao ocorre corretamente sem erro.

### Experiencia de erro (caso de erro residual)

- [ ] **AC-009**: Dado um erro genuino de sistema durante uma transicao de fase (ex: falha de rede, timeout de banco de dados), quando o erro ocorre, entao o sistema exibe uma mensagem de erro contextualizada (nao generica) com opcao de tentar novamente — nunca uma tela de erro sem saida.
- [ ] **AC-010**: Dado um erro de transicao, quando o viajante clica em "Tentar novamente", entao o sistema reattempta a transicao sem perda dos dados da fase atual.

### Animacao de transicao

- [ ] **AC-011**: Dado uma transicao de fase bem-sucedida, quando o sistema muda de uma fase para outra, entao a animacao de transicao (definida em SPEC-UX-003) e exibida corretamente — sem flickering, sem tela em branco intermediaria.

### Performance

- [ ] **AC-012**: Dado uma transicao de fase valida, quando o viajante clica em "Proximo", entao a proxima fase e renderizada em menos de 2 segundos em conexao padrao (sem contar carregamento de conteudo AI, que tem seu proprio indicador de progresso).

---

## 4. Scope

### In Scope

- Correcao dos erros de transicao Phase 2→3 e Phase 5→6 (P0-001)
- Correcao da falha de transicao 2→3 apos navegacao reversa (P0-006)
- Garantia de que o estado do motor de navegacao e consistente independente da sequencia de navegacao anterior do usuario
- Mensagem de erro contextualizada para erros genuinos de sistema (substitui "Algo deu errado" generico)
- Botao "Tentar novamente" em estados de erro de transicao

### Out of Scope

- Redesign do fluxo de navegacao entre fases (escopo de SPEC-PROD-016)
- Regras de desbloqueio de fases (escopo de SPEC-PROD-023)
- Animacoes de transicao (escopo de SPEC-UX-003 — apenas garantir que nao regridam)
- Tratamento de erros em fases especificas (geracao de checklist, guia, itinerario) — apenas erros de transicao de fase

---

## 5. Constraints (MANDATORY)

### Security

- A correcao nao deve alterar as regras de autorizacao de acesso a fases — apenas o usuario dono da expedicao pode transitar entre suas proprias fases (BOLA: verificar `trip.userId === session.userId` em toda operacao de navegacao)
- Nenhuma informacao de erro interno (stack trace, query SQL, ids internos) deve ser exposta na mensagem de erro exibida ao usuario
- O estado de navegacao persistido nao deve ser manipulavel via parametros de URL sem validacao server-side

### Accessibility

- Conformidade WCAG 2.1 AA: mensagens de erro de transicao devem ser anunciadas por screen readers (role="alert" ou aria-live="assertive")
- O botao "Tentar novamente" deve ser acessivel por teclado (foco automatico apos erro)
- A animacao de transicao deve respeitar `prefers-reduced-motion`

### Performance

- Transicoes de fase devem completar (render da proxima fase visivel para o usuario) em menos de 2 segundos em conexao 4G padrao
- A correcao nao deve introduzir chamadas adicionais ao banco de dados no caminho critico de transicao alem das ja existentes

### Architectural Boundaries

- A correcao deve respeitar o modelo de estados definido em SPEC-PROD-016 (NOT_STARTED / IN_PROGRESS / COMPLETED / CURRENT)
- Nenhuma logica de navegacao deve ser duplicada no cliente sem correspondente validacao no servidor
- A correcao nao deve depender de estado persistido no cliente (localStorage, sessionStorage) para funcionar — o estado de navegacao e autoritario no servidor

---

## 6. Success Metrics

| Metrica | Baseline (v0.26.0) | Meta (Sprint 32) | Prazo |
|---------|-------------------|-----------------|-------|
| Taxa de sucesso em Phase 2→3 (testes manuais) | ~0% (falha em 100% dos testes) | 100% | Sprint 32 QA |
| Taxa de sucesso em Phase 5→6 (testes manuais) | Falha reportada | 100% | Sprint 32 QA |
| Taxa de sucesso em ciclo completo 1→6 sem erro | 0% | >= 95% | Sprint 32 QA |
| Taxa de sucesso em fluxo reverse+forward (6→2→3) | 0% | 100% | Sprint 32 QA |
| Incidencias de "Algo deu errado" em testes manuais | Frequente | 0 durante transicao normal | Sprint 32 QA |

---

## 7. Dependencies

- **SPEC-PROD-016** (Phase Navigation Engine): a correcao opera sobre o motor de navegacao implementado neste spec — deve estar na versao que foi entregue em Sprint 29/30
- **SPEC-PROD-023** (Phase Completion Logic): as regras de conclusao de fase afetam quais transicoes sao permitidas — implementar SPEC-PROD-023 antes de validar AC-001 a AC-006 garante base consistente
- Nenhuma dependencia externa nova e esperada para este fix

---

## 8. Vendor Independence

- Este spec descreve O QUE deve funcionar, nao COMO implementar a correcao.
- A causa raiz tecnica (estado inconsistente do motor de navegacao, race condition, problema de hidratacao SSR/CSR) e de responsabilidade do architect e dos desenvolvedores.
- A solucao tecnica deve ser documentada em um SPEC-ARCH correspondente antes da implementacao.

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | product-owner | Documento inicial — Sprint 32 stabilization, bugs P0-001 e P0-006 |
