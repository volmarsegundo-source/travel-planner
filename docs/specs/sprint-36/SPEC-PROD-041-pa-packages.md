# SPEC-PROD-041: Pacotes de PA — Compra com Mock de Pagamento (Sprint 36)

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, ux-designer, architect, security-specialist, finops-engineer
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**Documento de economia**: `docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md` — Secao 2.3
**Spec pai**: `docs/specs/gamification/SPEC-PROD-GAMIFICATION.md` — Wave 3 antecipada

---

## 1. Problem Statement

O sistema PA esta visivel (Wave 1, Sprint 35) e badges estao sendo desbloqueados (Wave 2, Sprint 36). O proximo obstaculo de produto e: o que o usuario faz quando nao tem PA suficiente para usar as funcionalidades de IA?

Atualmente, o fluxo de saldo insuficiente exibe um modal com as opcoes "Comprar PA" e "Ver como ganhar PA gratis". A opcao "Comprar PA" navega para uma pagina de pacotes que ainda nao existe — resultando em um link quebrado na experiencia atual.

Este spec resolve o gap de duas formas:
1. **Sprint 36**: Implementar o fluxo completo de compra de PA com um **mock de pagamento** — o usuario seleciona um pacote, confirma, e o PA e creditado imediatamente sem gateway real. Isso valida o fluxo de UX e o modelo de dados sem exposicao a PCI-DSS.
2. **Sprint 37+**: Substituir o mock pelo gateway Stripe (SPEC-PROD futuro) quando a escolha do gateway for finalizada.

**Impacto de negocio**: o fluxo de compra mock e essencial para dois objetivos:
- **Validacao de UX**: identificar friccoes antes de integrar o gateway real, quando mudancas sao mais custosas.
- **Habilitacao de receita** (Sprint 37): toda a infra de modelo de dados, historico de compras e politica de reembolso estara pronta para a integracao do gateway real.

**Importante — sem dark patterns**: o mock de pagamento deve ser claramente sinalizando como "modo de teste" / "simulacao" no ambiente de staging. Em producao, o mock so e ativado via feature flag e deve exibir um banner claro indicando que nenhuma cobranca real sera efetuada.

---

## 2. User Story

As a @leisure-solo traveler with insufficient PA balance,
I want to purchase a PA package with a single clear transaction,
so that I can continue using AI features without friction.

### User Story — Transparencia

As a @leisure-solo traveler,
I want to see exactly how much PA I will receive, the price in BRL, and my post-purchase balance before confirming,
so that I never feel surprised or deceived by the purchase.

### User Story — Reembolso

As a @leisure-solo traveler who purchased PA and has not spent it,
I want to be able to request a refund within 7 days of purchase,
so that I feel safe buying PA knowing I have a consumer protection option.

### Traveler Context

- **Pain point**: O usuario tentou gerar seu roteiro (80 PA), descobriu que tem saldo insuficiente, clicou em "Comprar PA" e chegou em uma pagina em branco ou com erro 404. O momento de intencao de compra — o mais valioso — foi desperdicado.
- **Current workaround**: O usuario abandona o fluxo de IA ou tenta acumular PA organicamente (login diario, completar campos). Isso e valido, mas lento demais para o usuario que quer o roteiro agora.
- **Frequency**: Todo usuario que esgotar o bonus de boas-vindas (180 PA) antes de acumular PA organicamente suficiente. Estimativa: ~30% dos usuarios ativos na primeira semana.

---

## 3. Pacotes de PA (conforme ATLAS-GAMIFICACAO-APROVADO.md)

| Pacote | ID | PA | Preco (BRL) | PA/Real | Economia vs Explorador |
|---|---|---|---|---|---|
| Explorador | `pkg_explorador` | 500 PA | R$ 14,90 | 33,6 PA/R$ | — (referencia) |
| Navegador | `pkg_navegador` | 1.200 PA | R$ 29,90 | 40,1 PA/R$ | +19% |
| Cartografo | `pkg_cartografo` | 2.800 PA | R$ 59,90 | 46,7 PA/R$ | +39% |
| Embaixador | `pkg_embaixador` | 6.000 PA | R$ 119,90 | 50,0 PA/R$ | +49% |

**Regra critica**: PA comprado incrementa `availablePoints` APENAS — NAO incrementa `totalPoints`. Ranks sao calculados sobre `totalPoints` (pontos ganhos por atividade). Esta regra e inviolavel e deve ser verificada em todos os testes.

---

## 4. Requirements

### REQ-PA-001 — Pagina de Pacotes de PA

**MoSCoW**: Must Have
**Esforco**: S

Criar a pagina `/[locale]/(app)/atlas/comprar-pa` exibindo os 4 pacotes de PA em layout de cards comparativos.

**Conteudo de cada card**:
- Nome do pacote e quantidade de PA em destaque.
- Preco em BRL com 2 casas decimais.
- Taxa de PA/Real calculada e exibida.
- Economia percentual em relacao ao pacote menor (exceto Explorador).
- CTA: "Comprar agora".
- Destaque visual no pacote com melhor custo-beneficio (Cartografo ou Navegador — a ser definido pelo UX designer).

**Informacoes contextuais na pagina**:
- Saldo atual do usuario (PA disponivel) exibido no topo.
- "Com este pacote, seu saldo sera: [saldo_atual + PA_pacote]" — calculado dinamicamente ao hover/focus no card.
- Link para "Como funciona o PA?" (pagina de transparencia).
- Nota clara: "PA nao expira. PA comprado nao contribui para seu rank."

### REQ-PA-002 — Fluxo de Confirmacao de Compra

**MoSCoW**: Must Have
**Esforco**: S

Ao clicar "Comprar agora" em um pacote, exibir um modal de confirmacao antes de processar a transacao.

**Conteudo do modal**:
- Nome do pacote selecionado.
- Quantidade de PA a receber.
- Preco em BRL.
- Saldo atual e saldo apos a compra.
- Banner de aviso em staging/mock: "Modo de teste ativo — nenhuma cobranca sera realizada."
- Botao primario: "Confirmar compra".
- Botao secundario: "Cancelar".

**Comportamento apos confirmacao (mock)**:
- Creditar PA em `availablePoints` imediatamente.
- Registrar transacao em `PointTransaction` com tipo `purchase`, descricao do pacote e valor em BRL.
- Exibir toast: "Compra confirmada! +[X] PA adicionados ao seu saldo."
- Atualizar saldo no header em tempo real (sem reload).
- Redirecionar usuario para a pagina de origem (se veio do modal de saldo insuficiente, retorna ao fluxo de IA interrompido).

### REQ-PA-003 — Historico de Compras

**MoSCoW**: Must Have
**Esforco**: XS

Exibir compras de PA no historico de transacoes em "Meu Atlas" > "Meu Saldo", integrado ao historico geral de transacoes PA ja existente.

**Formato de linha de compra no historico**:
- Descricao: "Compra de PA — Pacote [Nome]"
- Valor: `+[X] PA` (em verde)
- Preco pago: `R$ [preco]` (em cinza, informativo)
- Data e hora da transacao
- Status: `Concluida` | `Reembolsada`

### REQ-PA-004 — Politica de Reembolso (7 dias, PA nao gasto)

**MoSCoW**: Should Have
**Esforco**: S

Implementar o fluxo de solicitacao de reembolso para compras de PA conforme a politica aprovada em `ATLAS-GAMIFICACAO-APROVADO.md`:

**Condicoes para reembolso elegivel**:
- Compra realizada ha <= 7 dias corridos.
- O PA do pacote comprado nao foi parcialmente gasto (o `availablePoints` atual deve ser >= ao PA do pacote comprado no momento do reembolso).

**Fluxo**:
1. No historico de transacoes, compras elegiveis exibem link "Solicitar reembolso".
2. Ao clicar, modal de confirmacao exibe as condicoes e pede confirmacao.
3. Apos confirmacao: PA e debitado de `availablePoints`, transacao de reembolso registrada, status da compra original atualizado para `Reembolsada`.
4. Mock: nenhuma transacao financeira real. Em Sprint 37+ o gateway processa o estorno.

**Compras nao elegiveis** (link "Solicitar reembolso" nao exibido):
- Compra com mais de 7 dias.
- PA parcialmente gasto (saldo atual < PA do pacote).
- Compra ja reembolsada.

### REQ-PA-005 — Redirecionamento de Saldo Insuficiente para Compra

**MoSCoW**: Must Have
**Esforco**: XS

O modal de saldo insuficiente (ja existente) deve ter o botao "Comprar PA" funcional, navegando para `/[locale]/(app)/atlas/comprar-pa` com o pacote sugerido pre-selecionado baseado no deficit de PA.

**Logica de pre-selecao**:
- Calcular deficit: `deficit = custo_feature - saldo_atual`.
- Pre-selecionar o menor pacote que cobre o deficit.
- Exemplo: usuario tem 20 PA e quer gerar roteiro (80 PA) — deficit = 60 PA. Pre-selecionar "Explorador" (500 PA, o menor pacote).

---

## 5. Acceptance Criteria

### AC-041-001: Pagina de pacotes — exibicao dos 4 pacotes
Given o usuario acessa `/atlas/comprar-pa`,
when a pagina carrega,
then os 4 pacotes (Explorador, Navegador, Cartografo, Embaixador) sao exibidos com nome, PA, preco em BRL e economia percentual.

### AC-041-002: Pagina de pacotes — saldo atual exibido
Given o usuario acessa a pagina de compra de PA,
when a pagina renderiza,
then o saldo PA disponivel atual do usuario e exibido no topo da pagina.

### AC-041-003: Pagina de pacotes — calculo de saldo pos-compra
Given o usuario foca ou passa o cursor sobre o card do pacote "Navegador" (1.200 PA) com saldo atual de 20 PA,
when a interacao ocorre,
then a pagina exibe "Seu saldo apos a compra: 1.220 PA".

### AC-041-004: Modal de confirmacao — conteudo correto
Given o usuario clica "Comprar agora" no pacote "Cartografo" (2.800 PA, R$ 59,90),
when o modal de confirmacao e exibido,
then o modal mostra: nome "Cartografo", "2.800 PA", "R$ 59,90", saldo atual, saldo apos compra e banner de modo de teste (em staging).

### AC-041-005: Confirmacao de compra — creditacao de PA
Given o usuario confirma a compra do pacote "Explorador" (500 PA),
when a transacao mock e processada,
then `availablePoints` do usuario e incrementado em 500 e `totalPoints` permanece inalterado.

### AC-041-006: Confirmacao de compra — totalPoints inalterado
Given o usuario tinha `totalPoints = 300` antes de comprar PA,
when qualquer pacote e comprado e confirmado,
then `totalPoints` continua sendo 300 (PA comprado nao contribui para rank).

### AC-041-007: Confirmacao de compra — registro em PointTransaction
Given a compra do pacote "Navegador" e confirmada,
when a transacao e processada,
then um registro e criado em `PointTransaction` com `type = "purchase"`, `amount = 1200`, descricao contendo o nome do pacote e preco em BRL.

### AC-041-008: Confirmacao de compra — toast de sucesso
Given a compra e processada com sucesso,
when o processamento e concluido,
then um toast exibe "+1.200 PA adicionados ao seu saldo" (para o pacote Navegador) por 4 segundos.

### AC-041-009: Confirmacao de compra — atualizacao do saldo no header
Given a compra e concluida,
when o toast de sucesso aparece,
then o saldo PA no header e atualizado em tempo real sem necessidade de recarregar a pagina.

### AC-041-010: Historico — compra exibida
Given o usuario realizou uma compra do pacote "Embaixador",
when o usuario acessa "Meu Atlas" > "Meu Saldo",
then o historico exibe uma linha "Compra de PA — Pacote Embaixador" com "+6.000 PA" e "R$ 119,90".

### AC-041-011: Reembolso — elegibilidade (dentro do prazo, PA nao gasto)
Given o usuario comprou o pacote "Explorador" (500 PA) ha 3 dias e ainda tem >= 500 PA disponivel,
when o usuario visualiza essa transacao no historico,
then o link "Solicitar reembolso" e exibido ao lado da transacao.

### AC-041-012: Reembolso — nao elegivel (apos 7 dias)
Given o usuario comprou o pacote "Explorador" ha 8 dias,
when o usuario visualiza essa transacao no historico,
then o link "Solicitar reembolso" NAO e exibido.

### AC-041-013: Reembolso — nao elegivel (PA gasto)
Given o usuario comprou 500 PA e ja gastou 100 PA (saldo atual < 500),
when o usuario visualiza essa transacao no historico,
then o link "Solicitar reembolso" NAO e exibido.

### AC-041-014: Reembolso — fluxo de confirmacao e execucao
Given o usuario clica "Solicitar reembolso" em uma compra elegivel de 500 PA,
when o usuario confirma no modal,
then `availablePoints` e decrementado em 500, a transacao original tem status atualizado para `Reembolsada` e uma nova transacao de debito de -500 PA com tipo `refund` e registrada.

### AC-041-015: Redirecionamento de saldo insuficiente com pre-selecao
Given o usuario tentou gerar roteiro (80 PA) com saldo de 20 PA (deficit de 60 PA),
when o usuario clica "Comprar PA" no modal de saldo insuficiente,
then o usuario e redirecionado para `/atlas/comprar-pa` com o card "Explorador" (500 PA — o menor pacote que cobre o deficit) visualmente destacado.

---

## 6. Scope

### In Scope

- Pagina `/atlas/comprar-pa` com os 4 pacotes
- Modal de confirmacao de compra com banner de modo mock
- Processamento mock: credita PA instantaneamente sem gateway de pagamento
- Registro de transacao de compra em `PointTransaction`
- Historico de compras em "Meu Atlas" > "Meu Saldo"
- Fluxo de reembolso (solicitacao e processamento mock)
- Pre-selecao de pacote ao vir do modal de saldo insuficiente
- Feature flag `ENABLE_MOCK_PAYMENT` para controle por ambiente

### Out of Scope (v1 — Sprint 36)

- Integracao com gateway de pagamento real (Stripe, Pagar.me ou equivalente — Sprint 37+)
- Nota fiscal eletronica (NF-e) — requer gateway real
- Parcelamento no cartao de credito — requer gateway real
- Pagamento por PIX — requer gateway real
- Programas de fidelidade ou cashback — fora do escopo MVP
- Compra de PA como presente para outro usuario — fora do escopo MVP
- Limite de compras por periodo (anti-fraude) — a ser definido com o gateway real em Sprint 37

---

## 7. Constraints (MANDATORY)

### Security

- O endpoint de credito de PA deve ser uma server action autenticada — nunca chamavel diretamente por cliente sem validacao de sessao.
- O valor de PA a ser creditado deve ser determinado pelo servidor com base no `packageId` — nunca aceitar o valor de PA enviado pelo cliente.
- O mock de pagamento deve ser ativado exclusivamente via `ENABLE_MOCK_PAYMENT=true` (variavel de ambiente) — nunca hardcoded em codigo.
- Em producao, `ENABLE_MOCK_PAYMENT` deve ser `false` por padrao.
- Registros de `PointTransaction` de compra devem ser imutaveis apos criacao (exceto o campo `status` para o fluxo de reembolso).

### Privacy (LGPD)

- Historico de compras e dado pessoal financeiro — deve ser incluido no export de dados LGPD (Art. 18).
- Nenhum dado de cartao de credito e armazenado no Sprint 36 (mock nao tem dados financeiros reais).
- O preco pago em BRL armazenado em `PointTransaction` e dado pessoal e deve ser anonimizado na exclusao de conta.

### Accessibility (WCAG 2.1 AA)

- Cards de pacotes devem ter `role="radio"` ou equivalente para indicar selecao mutualmente exclusiva.
- O pacote destacado deve ter indicacao textual de destaque (nao apenas visual) — ex: "Mais popular" com `aria-label` adequado.
- O modal de confirmacao deve ter focus trap e ser anunciado por `role="dialog"`.

### Performance

- A pagina de pacotes deve renderizar em <= 1s (LCP) — conteudo estatico, sem dependencias de dados complexas.
- A credito mock de PA deve completar em <= 500ms da confirmacao do usuario.

### i18n

- Preco em BRL e formatado conforme locale: `R$ 14,90` em pt-BR, `BRL 14.90` em en.
- Todos os textos da pagina, modal e historico devem ser chaves de traducao.

---

## 8. Dependencies

| Dependencia | Tipo | Notas |
|---|---|---|
| ATLAS-GAMIFICACAO-APROVADO.md (Secao 2.3) | Definicao de negocio | Tabela de pacotes, precos e politica de reembolso — fonte da verdade |
| PointTransaction (Prisma, Sprint 9) | Schema existente | Modelo de dados ja existe — adicionar campo `priceBrl` e `status` |
| REQ-GAMI-001 (Sprint 35) | Feature existente | Saldo PA no header ja implementado — deve atualizar em tempo real apos compra |
| SPEC-PROD-041 (este) | Predecessor de Sprint 37 | Sprint 37 substituira o mock por Stripe — a interface de servico deve ser desenhada para suportar essa troca |

---

## 9. Success Metrics

| Metrica | Baseline | Target (Sprint 36 + 4 semanas) |
|---|---|---|
| Conversao de "saldo insuficiente" para "compra completada" (mock) | 0% (link quebrado) | > 20% em staging/beta |
| Abandonos no fluxo de compra (pagina -> modal -> confirmacao) | Nao medido | < 30% |
| Tempo medio para completar uma compra (do clique ao credito) | N/A | < 60 segundos |
| Relatos de "nao entendi que era um mock" | N/A | 0 (banner claro obrigatorio) |

---

## 10. Nota sobre Sprint 37

Quando o gateway de pagamento for integrado (Sprint 37+), o `PurchaseService` deve substituir o mecanismo mock pelo gateway real sem alterar:
- O contrato da pagina de pacotes (UI permanece identica).
- O schema de `PointTransaction` (adicionar campos de gateway, nao remover existentes).
- A politica de reembolso (mesmas condicoes, diferente execucao financeira).

Esta spec deve ser revisada antes do Sprint 37 para garantir que as decisoes de design do mock nao criem debito tecnico na integracao real.

---

## 11. Change History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0.0 | 2026-03-22 | product-owner | Documento inicial — Sprint 36 planning. Mock de pagamento para os 4 pacotes de PA, fluxo de reembolso, historico de compras |
