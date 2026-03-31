# SPEC-FASE4-AINDA-NAO-DECIDI-DEFINITIVO

> **Versão**: 1.0.0 | **Status**: APROVADO | **Data**: 2026-03-30 | **Spec ID**: SPEC-FASE4-AND-001

---

## Histórico de Mudanças

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-30 | Product Owner | Especificação definitiva — terceira e última solicitação de correção |

---

## Contexto e Motivação

Esta é a especificação **definitiva** do comportamento do checkbox "Ainda não decidi" na Fase 4 ("A Logística"). O bug foi reportado **3 vezes** e corrigido parcialmente 2 vezes porque não havia uma especificação precisa como fonte de verdade. Este documento é essa fonte.

### Problemas Estruturais Identificados no Código Atual

1. **`syncPhaseStatus` não conhece o status `pending`** — mapeia resultado do engine para apenas `"completed"` ou `"active"`. Quando o engine retorna `"in_progress"` (caso undecided), salva `"active"` — indistinguível de fase não iniciada.

2. **`advanceFromPhaseAction` ignora flags undecided para pontos** — `prerequisitesMet` só verifica `needsCarRental`/`cnhResolved`. Se todos undecided + sem carro, concede 50 PA incorretamente.

3. **`collectPendingItems` ignora flags undecided** — Sumário exibe alertas incorretos para itens que o usuário explicitamente marcou como "ainda não decidi".

4. **`calculateCompletionPercentage` penaliza undecided** — Percentual conta segmentos/acomodações como zero quando undecided, travando progresso.

5. **Flags undecided não carregam na revisita** — `loadData()` em `Phase4WizardV2` busca segmentos, acomodações e mobilidade mas **NÃO** busca flags undecided do `ExpeditionPhase.metadata`. Checkboxes iniciam sempre como `false`.

---

## User Story

> Como viajante de lazer,
> quero avançar pela Fase 4 mesmo quando não decidi sobre transporte, hospedagem ou mobilidade,
> para continuar planejando minha expedição sem travar, recebendo um lembrete claro das pendências.

---

## CENÁRIO A — Não preenche e não marca "Ainda não decidi"

**Resultado**: BLOQUEIO com mensagem de validação.

### Critérios de Aceite

- [ ] **AC-A-001**: Step Transporte vazio + checkbox desmarcado → clique em "Próximo" mostra banner de validação e permanece no step
- [ ] **AC-A-002**: Step Hospedagem vazio + checkbox desmarcado → clique em "Próximo" mostra banner e permanece no step
- [ ] **AC-A-003**: Step Mobilidade vazio + checkbox desmarcado → clique em "Avançar Fase" mostra banner e não navega para Fase 5
- [ ] **AC-A-004**: Banner usa token de cor warning (amarelo), não erro crítico (vermelho)
- [ ] **AC-A-005**: Mensagens em português, específicas por step:
  - Transporte: "Adicione pelo menos um segmento de transporte ou marque 'Ainda não decidi'"
  - Hospedagem: "Adicione pelo menos uma hospedagem ou marque 'Ainda não decidi'"
  - Mobilidade: "Selecione pelo menos uma opção de mobilidade ou marque 'Ainda não decidi'"
- [ ] **AC-A-006**: Banner tem `role="alert"` para leitores de tela

---

## CENÁRIO B — Marca "Ainda não decidi" em 1+ steps

**Resultado**: AVANÇO permitido, fase com status PENDENTE, sem pontos.

### Critérios de Aceite

- [ ] **AC-B-001**: Undecided marcado no Transporte → clique em "Próximo" avança para step 2 sem erro
- [ ] **AC-B-002**: Pelo menos 1 step undecided → clique em "Avançar Fase" salva flags e navega para Fase 5
- [ ] **AC-B-003**: Fase 4 avançada com undecided → barra de progresso exibe círculo AMBER (não verde, não checkmark)
- [ ] **AC-B-004**: Fase 4 avançada com undecided → sumário exibe badge "Pendente" (amber) no card
- [ ] **AC-B-005**: Transporte undecided → sumário exibe "Transporte: ainda não decidido" como lembrete (não erro)
- [ ] **AC-B-006**: Transporte undecided + Hospedagem preenchida → sumário exibe dados da hospedagem normalmente junto ao lembrete
- [ ] **AC-B-007**: 50 PA da Fase 4 **NÃO** são creditados quando qualquer undecided está ativo
- [ ] **AC-B-008**: Todos 3 steps undecided → Fase 4 aparece como "Pendente" na listagem de expedições
- [ ] **AC-B-009**: Itens undecided aparecem em seção "Decisões pendentes" separada, NÃO na lista de "itens pendentes críticos"
- [ ] **AC-B-010**: Badge "Pendente" tem `aria-label` descritivo
- [ ] **AC-B-011**: Percentual de conclusão reflete contribuição parcial (50%) por step undecided

---

## CENÁRIO C — Preenche TODOS os campos obrigatórios nos 3 steps

**Campos obrigatórios**:
- Transporte: tipo, origem, destino, data/hora partida, data/hora chegada
- Hospedagem: tipo, check-in, check-out
- Mobilidade: pelo menos uma opção selecionada

**Resultado**: Fase CONCLUÍDA, 50 PA concedidos.

### Critérios de Aceite

- [ ] **AC-C-001**: 3 steps completos + nenhum undecided → clique em "Avançar Fase" concede 50 PA e navega para Fase 5
- [ ] **AC-C-002**: Fase 4 concluída → barra de progresso exibe círculo verde com ✓
- [ ] **AC-C-003**: Fase 4 concluída → sumário exibe badge "Concluída" (verde)
- [ ] **AC-C-004**: Fase 4 concluída → sumário NÃO exibe nenhum alerta ou lembrete de pendência
- [ ] **AC-C-005**: Códigos de reserva exibidos mascarados (ex: "BOOK-****-XY7"), nunca em claro
- [ ] **AC-C-006**: Mobilidade satisfeita com qualquer seleção válida (incluindo "a pé")
- [ ] **AC-C-007**: Pré-requisito carro/CNH verificado separadamente — ambos (steps completos + pré-requisito) devem ser satisfeitos

---

## CENÁRIO D — Retorna, desmarca "Ainda não decidi" e preenche

**Resultado**: Status muda de PENDENTE para CONCLUÍDA; 50 PA concedidos retroativamente.

### Critérios de Aceite

- [ ] **AC-D-001**: Fase 4 PENDENTE → retorna, desmarca, preenche e salva → sistema aceita sem erro
- [ ] **AC-D-002**: Todos steps preenchidos após revisita → status muda de PENDENTE para CONCLUÍDA
- [ ] **AC-D-003**: Status mudou via revisita → 50 PA concedidos retroativamente
- [ ] **AC-D-004**: Se 50 PA já foram concedidos → NÃO concede segunda vez (idempotência)
- [ ] **AC-D-005**: Status mudou para CONCLUÍDA → barra de progresso atualiza para verde com ✓
- [ ] **AC-D-006**: Fluxo de revisita NÃO exige recomeçar a fase do zero

---

## Analogia com a Fase 3

| Conceito Fase 3 | Equivalente Fase 4 |
|---|---|
| Item de checklist não marcado | Step com checkbox "Ainda não decidi" marcado |
| `allRequiredDone = false` | `anyUndecided = true` |
| Status `in_progress` (exibido como PENDENTE) | Status `in_progress` (exibido como PENDENTE) |
| Avança sem pontos de fase | Avança sem 50 PA da Fase 4 |
| Sumário: "X/Y itens" | Sumário: badge PENDENTE + lista de steps |
| Revisita: marcar itens → conclusão | Revisita: preencher steps → conclusão |

**O comportamento visual deve ser IDÊNTICO ao da Fase 3 quando tem checklist incompleto.**

---

## Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| RN-01 | Step PREENCHIDO = pelo menos um registro válido nos campos obrigatórios |
| RN-02 | Step UNDECIDED = checkbox marcado, independentemente de ter dados |
| RN-03 | UNDECIDED tem precedência sobre dados parciais |
| RN-04 | Fase 4 é CONCLUÍDA somente quando TODOS os 3 steps estão PREENCHIDOS e NENHUM é UNDECIDED |
| RN-05 | Fase 4 é PENDENTE quando PELO MENOS UM step é UNDECIDED |
| RN-06 | 50 PA só são concedidos quando fase atinge status CONCLUÍDA |
| RN-07 | Concessão dos 50 PA é idempotente — nunca mais de uma vez por fase por expedição |
| RN-08 | Pré-requisito carro/CNH é verificado separadamente dos steps |
| RN-09 | Steps UNDECIDED contribuem 50% para o percentual de conclusão da fase |
| RN-10 | Sumário não exibe steps UNDECIDED como erros críticos — são "decisões pendentes" |

---

## Casos de Borda

| Caso | Comportamento |
|------|---------------|
| Undecided marcado + dados preenchidos no mesmo step | UNDECIDED tem precedência (RN-03). Step tratado como undecided. |
| Todos 3 steps undecided | Válido. Fase avança como PENDENTE sem pontos. |
| Retorno após Fase 6 concluída | Revisita funciona normalmente. Pontos retroativos. Status reavaliado. |
| Desmarcar undecided sem preencher dados | Cenário A ativado na tentativa de avançar. |
| Mobilidade undecided + car_rental salvo | Pré-requisito de carro ocultado quando `mobilityUndecided` está marcado. |
| Checkbox undecided nunca pré-selecionado por padrão | Sempre inicia como `false` em nova expedição. |

---

## Cenários de Teste Obrigatórios

### Testes Unitários (engine)

| ID | Descrição | Status Esperado |
|----|-----------|-----------------|
| UT-01 | transport=1, accom=1, mobility=selecionada, nenhum undecided | `completed` |
| UT-02 | transport=0, accom=0, mobility=[], nenhum undecided | `pending` |
| UT-03 | transport=1, accom=1, transportUndecided=true | `in_progress` (exibido PENDENTE) |
| UT-04 | todos undecided=true, dados zerados | `in_progress` (exibido PENDENTE) |
| UT-05 | transport=1, accommodationUndecided=true | `in_progress` (exibido PENDENTE) |
| UT-06 | requirements inclui labels corretos dos steps undecided | requirements[] |

### Testes de Integração (action)

| ID | Descrição |
|----|-----------|
| IT-01 | advanceFromPhaseAction: todos preenchidos + needsCarRental=false → 50 PA concedidos |
| IT-02 | advanceFromPhaseAction: transportUndecided=true → 50 PA NÃO concedidos |
| IT-03 | advanceFromPhaseAction: todos undecided → 50 PA NÃO concedidos |
| IT-04 | Flags undecided persistidos corretamente em ExpeditionPhase.metadata |
| IT-05 | Carga dos flags undecided no modo revisita reflete estado salvo |

### Testes de Sumário (service)

| ID | Descrição |
|----|-----------|
| ST-01 | collectPendingItems: transportUndecided=true → severity "info", não "required" |
| ST-02 | calculateCompletionPercentage: step undecided contribui 50% do valor do step |
| ST-03 | calculateCompletionPercentage: todos preenchidos = contribuição total da Fase 4 |

### Testes de Componente (UI)

| ID | Descrição |
|----|-----------|
| CT-01 | Checkbox undecided marcado → botão "Próximo" funciona sem validar campos |
| CT-02 | Checkbox desmarcado + campos vazios → botão "Próximo" exibe erro |
| CT-03 | Estado inicial do checkbox carrega corretamente do banco (não inicia false na revisita) |
| CT-04 | Banner de validação exibe mensagem correta por step |

---

## Pontos de Entrada no Código (5 correções)

1. **`Phase4WizardV2.loadData()`** — não carrega flags undecided do metadata
2. **`advanceFromPhaseAction`** — `prerequisitesMet` ignora undecided para pontos
3. **`syncPhaseStatus`** — não mapeia `in_progress` para status visual distinto
4. **`collectPendingItems`** — não respeita flags undecided
5. **`calculateCompletionPercentage`** — não contabiliza contribuição parcial

---

## Métricas de Sucesso

- Taxa de avanço Fase 4 → Fase 5 aumenta ≥15% (menos abandono por bloqueio)
- Zero novos reports do bug "Ainda não decidi não funciona"
- Taxa de retorno à Fase 4 para completar: meta ≥30% dos que avançaram como PENDENTE

---

## Restrições

- Checkbox "Ainda não decidi" NUNCA pré-selecionado por padrão
- Badge no sumário usa "Pendente", não "Incompleto" — viajante tomou decisão consciente
- Fora do escopo: notificações de lembrete, bloqueio de Fases 5/6 quando Fase 4 está PENDENTE

---

## Critérios de Aprovação

1. Todos os critérios de aceite (AC-A-001 a AC-D-006) verificados
2. Todos os cenários de teste existem e passam
3. Sem regressão nas Fases 1, 2, 3, 5 e 6
4. Teste manual do Cenário D completo em staging
5. Comparação visual: Fase 3 pendente vs Fase 4 pendente = IDÊNTICAS

---

*Refs: `advanceFromPhaseAction` em `expedition.actions.ts`, `evaluatePhase4` em `phase-completion.engine.ts`, `collectPendingItems` em `expedition-summary.service.ts`, `loadData` em `Phase4WizardV2.tsx`*
