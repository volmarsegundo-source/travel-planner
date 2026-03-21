# SPEC-PROD-GAMIFICATION — Sistema de Gamificacao Atlas PA

**ID**: SPEC-PROD-GAMIFICATION
**Versao**: 1.0.0
**Data**: 2026-03-21
**Autor**: product-owner
**Status**: APROVADO
**Sprints alvo**: Wave 1 = Sprint 35 | Wave 2 = Sprint 36 | Wave 3 = Sprint 37+
**Documento de economia**: `docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md`

---

## Contexto e Motivacao

O Atlas ja possui um backend de gamificacao funcional (PointsEngine, PhaseEngine, badges, ranks, transacoes). O que falta e a camada de produto: a UX que torna o sistema visivel, compreensivel e motivador para o viajante.

Esta spec define os requisitos de produto para expor o sistema PA ao usuario final. A economia esta definida e aprovada em `ATLAS-GAMIFICACAO-APROVADO.md` — esta spec nao redefine valores, apenas especifica o comportamento do produto.

### Premissas

1. O backend (PointsEngine, PhaseEngine) esta implementado e funcionando.
2. Os valores de PA (custos, ganhos) estao fixados em `gamification.types.ts` e `phase-config.ts`.
3. O WELCOME_BONUS atual e 500 PA (verificado em codigo).
4. Fases 7 e 8 nao estao ativas no MVP e nao devem aparecer no fluxo principal.

---

## User Stories por Wave

### Wave 1 — MVP Gamification (Sprint 35)

**Story principal:**
As a @leisure-solo traveler,
I want to see my PA balance and understand what it costs to use AI features,
so that I can plan my expedition without unexpected surprises.

**Story secundaria:**
As a new user,
I want a clear onboarding tutorial explaining the PA system,
so that I feel confident using AI features from my first session.

### Wave 2 — Full Gamification (Sprint 36)

As a @leisure-solo traveler,
I want to see my badge collection and rank progress,
so that I feel rewarded for completing each expedition phase.

### Wave 3 — Monetization (Sprint 37+)

As a @leisure-solo traveler,
I want to purchase PA packages when I run low,
so that I can continue using AI features without interruption.

---

## Wave 1 — MVP (Sprint 35)

### REQ-GAMI-001 — Exibicao do Saldo PA no Header

**MoSCoW**: Must Have
**Esforco**: S

O saldo de PA disponivel do usuario deve ser exibido de forma persistente no header da aplicacao para todos os usuarios autenticados.

#### Criterios de Aceite — REQ-GAMI-001

- [ ] **AC-001**: Dado que o usuario esta autenticado, quando acessa qualquer pagina da aplicacao, entao o saldo PA disponivel e exibido no header.
- [ ] **AC-002**: Dado que o usuario ganha ou gasta PA, quando a transacao e concluida, entao o saldo no header e atualizado sem recarregar a pagina inteira.
- [ ] **AC-003**: Dado que o saldo exibido, quando o usuario clica nele, entao e direcionado para o historico de transacoes em "Meu Atlas".
- [ ] **AC-004**: Dado que o usuario esta no mobile (375px), quando visualiza o header, entao o saldo PA e visivel sem truncamento ou sobreposicao com outros elementos.
- [ ] **AC-005**: Dado que o saldo e zero, quando exibido no header, entao e exibido "0 PA" (nao e ocultado).
- [ ] **AC-006 (Performance)**: O saldo PA deve ser renderizado em <= 500ms apos o carregamento da pagina.

#### Fora de Escopo — REQ-GAMI-001

- Animacao de incremento/decremento em tempo real no header (Wave 2).
- Exibicao do rank no header (considerada para Wave 2).

---

### REQ-GAMI-002 — Modal de Confirmacao Antes de Gasto de PA

**MoSCoW**: Must Have
**Esforco**: S

Antes de qualquer debito de PA, o usuario deve confirmar explicitamente a acao. Nenhum PA deve ser debitado silenciosamente.

#### Criterios de Aceite — REQ-GAMI-002

- [ ] **AC-007**: Dado que o usuario clica em um botao de feature de IA com saldo suficiente, quando o clique ocorre, entao um modal de confirmacao e exibido ANTES de qualquer chamada de IA ou debito de PA.
- [ ] **AC-008**: Dado que o modal de confirmacao e exibido, quando o usuario o visualiza, entao o modal mostra: (a) nome da feature, (b) custo em PA, (c) saldo atual do usuario, (d) saldo resultante apos o gasto.
- [ ] **AC-009**: Dado que o usuario confirma no modal, quando a confirmacao ocorre, entao o PA e debitado e a feature de IA e acionada.
- [ ] **AC-010**: Dado que o usuario cancela no modal, quando o cancelamento ocorre, entao nenhum PA e debitado e o usuario retorna ao estado anterior.
- [ ] **AC-011**: Dado que a chamada de IA falha apos o debito, quando a falha ocorre, entao o PA e estornado automaticamente e o usuario recebe mensagem de erro com confirmacao do estorno.
- [ ] **AC-012**: Dado que o modal e exibido, quando o usuario pressiona Escape ou clica fora do modal, entao o modal e fechado sem debito (equivalente a cancelar).
- [ ] **AC-013 (Acessibilidade)**: O modal de confirmacao deve ser acessivel via teclado (Tab para navegar, Enter para confirmar, Escape para cancelar) e ter aria-labels adequados.

#### Features de IA que requerem confirmacao (Wave 1)

- Gerar checklist de documentos (Fase 3) — 100 PA
- Gerar sugestoes de logistica (Fase 4) — 100 PA
- Gerar guia de destino (Fase 5) — 150 PA
- Gerar roteiro completo (Fase 6) — 150 PA
- Regenerar qualquer output de IA — 80 PA

#### Fora de Escopo — REQ-GAMI-002

- Opcao "nao mostrar novamente" no modal (potencialmente Wave 2 — requer analise de UX).

---

### REQ-GAMI-003 — Fluxo de Saldo Insuficiente

**MoSCoW**: Must Have
**Esforco**: S

Quando o usuario nao tem PA suficiente para uma feature, o sistema deve guia-lo de forma clara para opcoes de recuperacao.

#### Criterios de Aceite — REQ-GAMI-003

- [ ] **AC-014**: Dado que o usuario tem PA insuficiente para uma feature de IA, quando visualiza o botao da feature, entao o botao e exibido com estado visual distinto (desabilitado ou com indicador de aviso) e um label/tooltip indica "Saldo insuficiente — X PA necessarios".
- [ ] **AC-015**: Dado que o usuario com saldo insuficiente clica no botao de feature de IA, quando o clique ocorre, entao um modal de saldo insuficiente e exibido (nao o modal de confirmacao).
- [ ] **AC-016**: Dado que o modal de saldo insuficiente e exibido, quando o usuario o visualiza, entao o modal mostra: (a) PA necessario, (b) saldo atual, (c) diferenca faltante, (d) opcoes para resolver.
- [ ] **AC-017**: Dado que o modal de saldo insuficiente e exibido, quando o usuario clica em "Comprar PA", entao e direcionado para a pagina/modal de pacotes de PA (Wave 1: pagina placeholder; Wave 3: pagina real).
- [ ] **AC-018**: Dado que o modal de saldo insuficiente e exibido, quando o usuario clica em "Ver como ganhar PA gratis", entao e exibida uma lista personalizada de acoes disponiveis para o usuario especifico (campos de perfil nao preenchidos, fases incompletas, etc.).
- [ ] **AC-019**: Dado que o usuario tem campos de perfil nao preenchidos, quando visualiza o modal de saldo insuficiente, entao a lista de ganhos gratis mostra cada campo disponivel com o PA correspondente (25 PA cada).

---

### REQ-GAMI-004 — Pagina "Como Funciona o PA"

**MoSCoW**: Must Have
**Esforco**: S

Uma pagina de transparencia total sobre o sistema PA, acessivel a qualquer momento.

#### Criterios de Aceite — REQ-GAMI-004

- [ ] **AC-020**: Dado que o usuario acessa a pagina "Como Funciona o PA", quando a visualiza, entao a pagina contem: tabela de formas de ganhar PA, tabela de custos de IA, tabela de pacotes de compra, politica de expiracao e politica de reembolso.
- [ ] **AC-021**: Dado que a pagina existe, quando o usuario esta em qualquer modal relacionado a PA (confirmacao, saldo insuficiente), entao ha um link visivel para "Como Funciona o PA".
- [ ] **AC-022**: Dado que o usuario acessa a pagina via link direto ou navegacao, quando a pagina carrega, entao todos os valores de PA exibidos sao consistentes com `ATLAS-GAMIFICACAO-APROVADO.md` (sem hardcode de valores desatualizados).
- [ ] **AC-023 (i18n)**: A pagina deve estar disponivel em PT-BR e EN com todas as tabelas traduzidas.

---

### REQ-GAMI-005 — Tutorial de Boas-vindas (Modal de Onboarding PA)

**MoSCoW**: Must Have
**Esforco**: S

Um modal de 3 passos exibido uma unica vez no primeiro login apos o registro, apresentando o sistema PA.

#### Criterios de Aceite — REQ-GAMI-005

- [ ] **AC-024**: Dado que o usuario completou o registro e faz o primeiro login, quando acessa a aplicacao pela primeira vez, entao o modal de boas-vindas PA e exibido automaticamente.
- [ ] **AC-025**: Dado que o modal de boas-vindas e exibido, quando o usuario o visualiza, entao o modal tem 3 passos: (1) apresentacao do Atlas, (2) bonus de 500 PA recebido, (3) formas de ganhar mais PA.
- [ ] **AC-026**: Dado que o usuario esta no passo 2 do tutorial, quando o visualiza, entao o saldo de 500 PA e exibido de forma proeminente com mensagem celebratoria.
- [ ] **AC-027**: Dado que o usuario completa o passo 3, quando clica em "Comecar minha expedicao", entao o modal e fechado e o usuario e direcionado para criar sua primeira expedicao.
- [ ] **AC-028**: Dado que o modal foi exibido e dispensado, quando o usuario faz logout e login novamente, entao o modal NAO e reexibido.
- [ ] **AC-029**: Dado que o usuario esta no modal, quando pressiona Escape ou clica fora, entao o modal NAO e fechado (o tutorial deve ser completado pelo menos ate o passo 3 para ser marcado como visto).

---

## Wave 2 — Full Gamification (Sprint 36)

### REQ-GAMI-006 — Grade de Badges em "Meu Atlas"

**MoSCoW**: Should Have
**Esforco**: M

Exibicao visual de todos os badges conquistados e nao conquistados, com progresso para desbloqueio.

#### Criterios de Aceite — REQ-GAMI-006

- [ ] **AC-030**: Dado que o usuario acessa "Meu Atlas", quando visualiza a secao de badges, entao todos os 9 badges definidos em `BadgeKey` sao exibidos (exceto `host` que e legado e nao deve aparecer na UI).
- [ ] **AC-031**: Dado que um badge foi conquistado, quando exibido na grade, entao e mostrado com visual "desbloqueado" (imagem colorida + data de conquista).
- [ ] **AC-032**: Dado que um badge nao foi conquistado, quando exibido na grade, entao e mostrado com visual "bloqueado" (imagem em escala de cinza) e uma descricao do que e necessario para desbloquear.
- [ ] **AC-033**: Dado que o usuario tem o badge `identity_explorer` disponivel mas nao conquistado, quando o visualiza, entao o badge mostra progresso atual (ex: "3 de 5 categorias preenchidas").

---

### REQ-GAMI-007 — Notificacao de Conquista (Toast)

**MoSCoW**: Should Have
**Esforco**: S

Notificacao celebratoria quando o usuario conquista um badge ou sobe de rank.

#### Criterios de Aceite — REQ-GAMI-007

- [ ] **AC-034**: Dado que o usuario conquista um badge, quando a acao que o desbloqueia e concluida, entao um toast de conquista e exibido com o nome do badge e uma mensagem celebratoria.
- [ ] **AC-035**: Dado que o usuario sobe de rank, quando a promocao ocorre, entao um toast de rank-up e exibido com o novo rank e PA atual.
- [ ] **AC-036**: Dado que o toast e exibido, quando o usuario nao interage com ele, entao o toast e auto-dismissado apos 5 segundos sem bloquear a interface.
- [ ] **AC-037**: Dado que o usuario conquista badge e sobe de rank simultaneamente, quando os dois eventos ocorrem, entao os dois toasts sao exibidos em sequencia (badge primeiro, rank segundo).

---

### REQ-GAMI-008 — Historico de Transacoes PA

**MoSCoW**: Should Have
**Esforco**: M

Pagina de historico completo de transacoes PA acessivel em "Meu Atlas".

#### Criterios de Aceite — REQ-GAMI-008

- [ ] **AC-038**: Dado que o usuario acessa "Meu Atlas" > "Meu Saldo", quando visualiza o historico, entao todas as transacoes sao exibidas em ordem cronologica decrescente.
- [ ] **AC-039**: Dado que cada transacao e exibida, quando o usuario a visualiza, entao a transacao mostra: data/hora formatada, descricao legivel (nao o tipo enum), valor com sinal (+ para ganho, - para gasto) e saldo resultante.
- [ ] **AC-040**: Dado que o usuario tem mais de 20 transacoes, quando acessa o historico, entao as transacoes sao paginadas (20 por pagina) com controles de paginacao.
- [ ] **AC-041**: Dado que a descricao e exibida, quando o usuario a le, entao a descricao e em linguagem natural (ex: "Conclusao da Fase 3 — O Preparo", nao "phase_checklist").

---

### REQ-GAMI-009 — Animacao de Nivel (Level-Up)

**MoSCoW**: Could Have
**Esforco**: S

Animacao celebratoria quando o usuario atinge um novo rank.

#### Criterios de Aceite — REQ-GAMI-009

- [ ] **AC-042**: Dado que o usuario sobe de rank, quando a animacao e exibida, entao ela dura no maximo 3 segundos e nao bloqueia a interacao com a pagina.
- [ ] **AC-043**: Dado que o usuario tem a preferencia de movimento reduzido habilitada no sistema operacional (`prefers-reduced-motion`), quando sobe de rank, entao a animacao e suprimida e apenas o toast de rank-up e exibido.

---

### REQ-GAMI-010 — Sistema de Indicacao (Referral)

**MoSCoW**: Could Have
**Esforco**: L

Sistema de indicacao onde o usuario ganha 300 PA por cada amigo que se registra via seu link.

#### Criterios de Aceite — REQ-GAMI-010

- [ ] **AC-044**: Dado que o usuario acessa "Meu Atlas", quando visualiza a secao de indicacoes, entao um link unico de indicacao e exibido com opcoes de compartilhamento.
- [ ] **AC-045**: Dado que um novo usuario se registra via link de indicacao, quando completa o registro e o primeiro login, entao o indicador recebe 300 PA com descricao "Indicacao — [e-mail parcialmente mascarado do indicado]".
- [ ] **AC-046**: Dado que o mesmo usuario tenta usar o mesmo link de indicacao duas vezes, quando a segunda tentativa ocorre, entao os 300 PA NAO sao concedidos novamente (idempotencia por indicado).
- [ ] **AC-047 (Anti-fraude)**: O sistema de indicacao deve ter rate limiting: maximo de 10 indicacoes processadas por usuario por dia. Excesso e registrado para auditoria mas nao credita PA.

---

## Wave 3 — Monetizacao (Sprint 37+)

### REQ-GAMI-011 — Pagina de Compra de PA

**MoSCoW**: Must Have (para monetizacao)
**Esforco**: M

Pagina de compra de pacotes de PA com integracao de gateway de pagamento.

#### Criterios de Aceite — REQ-GAMI-011

- [ ] **AC-048**: Dado que o usuario acessa a pagina de compra de PA, quando a visualiza, entao os 4 pacotes sao exibidos com nome, PA incluido, preco em BRL e indicacao de economia para pacotes maiores.
- [ ] **AC-049**: Dado que o usuario seleciona um pacote, quando confirma a compra, entao o pagamento e processado pelo gateway e os PA sao creditados na conta dentro de no maximo 60 segundos.
- [ ] **AC-050**: Dado que o pagamento falha, quando a falha ocorre, entao nenhum PA e creditado, o usuario recebe mensagem de erro clara e a possibilidade de tentar novamente.
- [ ] **AC-051**: Dado que a compra e bem-sucedida, quando o PA e creditado, entao o usuario recebe uma notificacao toast de confirmacao e o saldo no header e atualizado imediatamente.
- [ ] **AC-052 (LGPD/Seguranca)**: Dados de cartao de credito NUNCA devem ser armazenados nos servidores do Atlas. Todo o processamento de pagamento deve ocorrer via tokens do gateway (PCI-DSS compliance — escopo do gateway, nao do Atlas).

---

### REQ-GAMI-012 — Dashboard Administrativo de PA

**MoSCoW**: Should Have (para gestao do produto)
**Esforco**: L

Dashboard interno para o dono do produto monitorar a saude da economia PA.

#### Criterios de Aceite — REQ-GAMI-012

- [ ] **AC-053**: Dado que o admin acessa o dashboard, quando o visualiza, entao ve: total de PA emitido, total de PA gasto, total de PA comprado, numero de usuarios por faixa de saldo e taxa de conversao de saldo insuficiente para compra.
- [ ] **AC-054**: Dado que o dashboard e acessado, quando os dados sao carregados, entao apenas usuarios com role `ADMIN` tem acesso (autorizacao server-side verificada).
- [ ] **AC-055**: Dado que o admin precisa emitir PA para um usuario especifico (ex: compensacao por bug), quando usa a funcao de emissao manual, entao a transacao e registrada com descricao obrigatoria e o ID do admin que autorizou.

---

### REQ-GAMI-013 — Relatorio de Receita PA

**MoSCoW**: Could Have
**Esforco**: M

Relatorio periodico de receita gerada por compras de PA.

#### Criterios de Aceite — REQ-GAMI-013

- [ ] **AC-056**: Dado que o admin acessa o relatorio de receita, quando o visualiza, entao ve: receita por pacote (diario/semanal/mensal), ticket medio, pacote mais vendido e churn de usuarios pagantes.
- [ ] **AC-057**: Dado que o relatorio e acessado por periodo, quando o admin filtra por data, entao os dados refletem exatamente as transacoes do periodo selecionado com precisao de timestamp UTC.

---

## Restricoes Transversais (todas as waves)

### Seguranca e Privacidade

- Saldo PA e historico de transacoes sao dados pessoais (LGPD Art. 5). Devem ser incluidos no export de dados do usuario.
- Na exclusao de conta, o historico de transacoes deve ser anonimizado (substituir userId por hash) — nao deletado, para integridade contabil.
- Nenhuma informacao de saldo PA deve aparecer em logs ou respostas de API alem do contexto autenticado do proprio usuario.
- Operacoes de debito de PA devem usar transacao atomica no banco (ja implementado via `db.$transaction`).

### Acessibilidade (WCAG 2.1 AA)

- Todos os modais devem ter `role="dialog"`, `aria-modal="true"` e `aria-labelledby` apontando para o titulo.
- O saldo PA no header deve ter `aria-label="Saldo: X Pontos Atlas"`.
- Badges bloqueados devem ter `aria-label` descrevendo o que e necessario para desbloquear.
- Animacoes devem respeitar `prefers-reduced-motion`.

### Performance

- Saldo PA deve carregar em <= 500ms (pode usar cache Redis com TTL de 30 segundos).
- Historico de transacoes: primeira pagina em <= 1 segundo.
- Modal de confirmacao: deve abrir em <= 200ms apos o clique.

### Internacionalizacao

- Todos os textos relacionados a PA devem estar no arquivo de traducoes (PT-BR e EN).
- Valores monetarios (pacotes) devem usar formatacao de moeda locale-aware.
- Datas no historico de transacoes devem usar formatacao de data locale-aware.

---

## Mapa de Dependencias entre Waves

```
Wave 1 (Sprint 35) — Prerequisitos:
  - Backend PA ja implementado (PointsEngine, PhaseEngine)
  - Header component existente
  - Modal system existente
  - "Meu Atlas" page existente

Wave 2 (Sprint 36) — Prerequisitos:
  - Wave 1 completa
  - Badge grid component (novo)
  - Toast notification system (verificar se ja existe)

Wave 3 (Sprint 37+) — Prerequisitos:
  - Wave 1 completa
  - Gateway de pagamento escolhido e contratado (decisao pendente)
  - PCI-DSS scope review com security-specialist
  - Admin role implementado no sistema de autorizacao
```

---

## Metricas de Sucesso

| Metrica | Target | Prazo |
|---|---|---|
| Tutorial concluido por novos usuarios | >= 85% | 30 dias apos Wave 1 |
| Usuarios que usam pelo menos 1 feature de IA | >= 60% | 30 dias apos Wave 1 |
| Abandono no modal de confirmacao de PA | <= 20% | 30 dias apos Wave 1 |
| Conversao de saldo insuficiente -> compra de PA | >= 5% | 30 dias apos Wave 3 |
| Usuarios que chegam ao rank Explorer | >= 40% | 60 dias apos Wave 1 |
| NPS relacionado a transparencia do sistema PA | >= 7/10 | 60 dias apos Wave 1 |

---

## Historico de Revisoes

| Versao | Data | Autor | Descricao |
|---|---|---|---|
| 1.0.0 | 2026-03-21 | product-owner | Spec inicial — 3 waves, 57 ACs |
