---
spec_id: SPEC-ROTEIRO-REGEN-INTELIGENTE
title: "Regeneracao Inteligente do Roteiro — Phase 6 (Preservacao de Atividades Manuais)"
version: 1.0.0
status: Draft
sprint: 41
owner: product-owner
reviewers: [tech-lead, ux-designer, architect, prompt-engineer, finops-engineer]
created: 2026-03-30
updated: 2026-03-30
moscow: Should Have
effort: L
personas: [leisure-solo, leisure-family, bleisure, group-organizer]
gamification_reference: docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md
parent_specs: [SPEC-PROD-055, SPEC-PROD-PHASE6-REDESIGN, SPEC-PHASE6-REDESIGN-BRIEF]
---

# SPEC-ROTEIRO-REGEN-INTELIGENTE: Regeneracao Inteligente do Roteiro

> Este documento define o comportamento de regeneracao do itinerario na Phase 6 com
> preservacao de atividades inseridas manualmente pelo usuario. Ele complementa
> SPEC-PROD-055 (geracao manual) e SPEC-PROD-PHASE6-REDESIGN (layout do roteiro V2).
> Em caso de conflito com specs pai, escalar ao PO antes de implementar.

---

## 1. Declaracao do Problema

O roteiro gerado por IA em Phase 6 e um ponto de partida — nao um artefato final imutavel.
Na pratica, o viajante frequentemente adiciona atividades proprias: um jantar em restaurante
que um amigo recomendou, um show com data e horario fixo comprado com antecedencia, uma visita
familiar ja agendada. Estas atividades sao compromissos reais com hora marcada.

O problema atual apresenta-se em dois cenarios:

**Cenario 1 — Nenhuma diferenciacao entre atividades de IA e manuais**
O sistema trata todas as atividades da mesma forma. O usuario nao tem visibilidade de quais
atividades foram sugeridas pelo AI e quais ele mesmo adicionou. Ao querer entender ou
revisar o roteiro, ele nao sabe o que e recomendacao e o que e compromisso.

**Cenario 2 — Regeneracao destroi customizacoes do usuario**
O usuario que adiciona atividades manualmente e depois clica em "Regenerar Roteiro" perde
todas as suas customizacoes. O AI regenera do zero, ignorando os compromissos que o usuario
havia inserido. Perder um jantar agendado ou um show comprado dentro do roteiro e um
momento de frustracao severa — e um motivo direto para abandono do produto.

---

## 2. User Story

As a @leisure-family who has manually added a concert ticket and a family dinner reservation
to their AI-generated itinerary,
I want the AI to regenerate the rest of the itinerary around my manually added activities,
so that my confirmed commitments are preserved and the AI fills in the remaining time
slots intelligently.

### Contexto do Viajante

- **Pain point**: O viajante investiu tempo adicionando compromissos reais (show, jantar,
  visita) ao roteiro gerado por IA. Ao clicar em "Regenerar Roteiro" para obter um roteiro
  mais alinhado com seus interesses atualizados, ele descobre que todas as suas atividades
  manuais foram apagadas. Alem da perda de dados, o viajante perde confianca no produto.
- **Workaround atual**: O usuario evita usar o botao de regeneracao por medo de perder as
  customizacoes. O roteiro fica com conteudo inicial de IA desatualizado porque o usuario
  prefere a seguranca de nao perder o que adicionou. Ou o usuario reinsere manualmente as
  atividades apos cada regeneracao — processo tedioso e propenso a erros.
- **Frequencia**: Estimativa de 50-70% dos usuarios que chegam a Phase 6 adicionam pelo
  menos uma atividade manual antes de tentar uma regeneracao. A perda de dados em
  regeneracao e o segundo feedback negativo mais frequente em testes de Phase 6, depois
  da falta de estrutura visual (endereçada em SPEC-PROD-PHASE6-REDESIGN).

---

## 3. Modelo de Dados

### 3.1 Campo necessario no modelo Activity

O modelo `Activity` requer um campo adicional para distinguir atividades inseridas pelo AI
das atividades inseridas manualmente pelo usuario:

| Campo | Tipo | Padrao | Descricao |
|-------|------|--------|-----------|
| `isManual` | Boolean | `false` | `true` se a atividade foi criada diretamente pelo usuario; `false` se foi gerada pelo AI. Imutavel apos criacao — o campo nao muda de valor depois que a atividade e criada. |

**Nota de produto para o architect**: Este campo requer uma migration de banco de dados.
Todas as atividades existentes devem receber `isManual = false` como valor padrao
(retrocompatibilidade). A migration nao deve afetar atividades em producao.

### 3.2 Comportamento de escrita do campo

- Atividades criadas pelo AI durante a geracao ou regeneracao: `isManual = false`.
- Atividades criadas pelo usuario via interface de adicao manual: `isManual = true`.
- O campo NAO pode ser editado pelo usuario diretamente — ele reflete a origem da
  atividade e e imutavel apos criacao.

---

## 4. Indicador Visual de Origem

Cada atividade no roteiro exibe um badge de origem que identifica sua fonte ao usuario.

| Origem | Badge | Estilo |
|--------|-------|--------|
| Gerada por IA | "IA" | Chip pequeno, fundo `atlas-on-tertiary-container` (#1c9a8e, teal), texto branco. Exibido como pill de 2-3 caracteres. |
| Inserida manualmente | "Manual" | Chip pequeno, fundo `atlas-primary-container`, texto `atlas-on-primary-container`. Exibido como pill. |

Os badges sao exibidos em todos os cartoes de atividade, independentemente de o usuario
estar em processo de regeneracao ou apenas visualizando o roteiro. Eles sao informativos —
nao sao clicaveis nem filtraveleis em v1.

---

## 5. Fluxo de Regeneracao Inteligente

### 5.1 Ponto de entrada

O usuario tem um roteiro ja gerado (estado de conteudo em cache ou apos geracao bem-sucedida)
e clica no botao "Regenerar Roteiro (-80 PA)" (definido em SPEC-PROD-055, Secao 5.2).

### 5.2 Deteccao de atividades manuais

Antes de exibir qualquer dialogo, o sistema verifica se existem atividades com `isManual = true`
para este `tripId`.

- Se NAO existem atividades manuais: o sistema inicia a regeneracao diretamente, sem exibir
  o dialogo de confirmacao. O comportamento e identico ao definido em SPEC-PROD-055.
- Se EXISTEM atividades manuais: o sistema exibe o dialogo de confirmacao (Secao 5.3).

### 5.3 Dialogo de confirmacao

O dialogo e um modal que bloqueia a interacao com o restante da pagina ate o usuario escolher
uma das opcoes ou fechar o modal.

**Titulo**: "Voce tem atividades adicionadas manualmente"

**Corpo**: "Encontramos [N] atividade(s) que voce adicionou ao roteiro. O que voce prefere
fazer?"

Onde [N] e o numero de atividades com `isManual = true` no roteiro atual.

**Opcao A (acao primaria, padrao)**: "Manter minhas atividades"
- Descricao contextual: "O AI vai gerar novos horarios e sugestoes ao redor das suas
  atividades."
- Estilo: AtlasButton variante primaria.

**Opcao B**: "Regenerar tudo"
- Descricao contextual: "O AI vai gerar um roteiro completamente novo. Suas atividades
  manuais serao removidas."
- Estilo: AtlasButton variante secundaria ou terciaria (menor destaque visual que Opcao A).

**Fechar / Cancelar**: Um X no canto superior do modal cancela a acao sem iniciar regeneracao
e sem debitar PA.

### 5.4 Fluxo — Opcao A: "Manter minhas atividades"

1. O usuario clica em "Manter minhas atividades".
2. O modal e fechado.
3. O sistema coleta as atividades com `isManual = true` do roteiro atual, registrando para
   cada uma: `dayNumber`, `title`, `startTime`, `endTime`.
4. O sistema verifica `availablePoints >= 80` no servidor.
5. Se saldo insuficiente: exibe mensagem de erro inline. Nenhuma chamada de IA iniciada.
6. Se saldo suficiente: o conteudo do roteiro e substituido por skeleton loader
   (estrutura de timeline dia-a-dia definida em SPEC-PROD-PHASE6-REDESIGN).
7. Uma chamada de IA e iniciada com o prompt enriquecido (ver Secao 6).
8. Ao receber resposta bem-sucedida:
   a. O novo roteiro e renderizado, incluindo as atividades manuais nas posicoes e horarios
      originais, com o restante dos slots preenchidos pelo AI.
   b. 80 PA sao debitados do `availablePoints` do usuario.
   c. Notificacao inline: "Roteiro atualizado! -80 PA"
9. Ao receber erro:
   a. O conteudo anterior do roteiro e restaurado (nenhuma atividade e perdida).
   b. Mensagem: "Nao foi possivel atualizar o roteiro. Tente novamente."
   c. Nenhum PA debitado.

### 5.5 Fluxo — Opcao B: "Regenerar tudo"

1. O usuario clica em "Regenerar tudo".
2. O modal e fechado.
3. O sistema inicia uma regeneracao completa — identica ao fluxo de SPEC-PROD-055 sem
   nenhum contexto de atividades manuais.
4. TODAS as atividades existentes (manuais e de IA) sao substituidas pelo novo conteudo.
5. O debito de PA (80 PA) ocorre somente apos geracao bem-sucedida.
6. Em caso de erro, o conteudo anterior e restaurado e nenhum PA e debitado.

---

## 6. Instrucoes para o Prompt de IA

Esta secao define OS DADOS que devem ser passados ao prompt de IA quando o usuario escolhe
"Manter minhas atividades". A estrutura exata do prompt e responsabilidade do prompt-engineer;
esta spec define os INSUMOS que o produto deve fornecer.

### 6.1 Dados adicionais que o prompt de regeneracao inteligente deve receber

Alem dos dados das Phases 1-5 ja usados na geracao inicial, o prompt deve receber:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `manualActivities` | `array` | Lista de objetos representando atividades manuais fixas. Cada objeto contem: `dayNumber` (inteiro), `title` (string), `startTime` (string no formato HH:MM), `endTime` (string no formato HH:MM). |
| `updatedPreferences` | `object` | Preferencias atualizadas da Phase 2 (caso o usuario tenha revisado Phase 2 apos a ultima geracao do roteiro). |
| `guideContext` | `string` | Resumo do conteudo do guia Phase 5 (se disponivel), para que o AI gere atividades consistentes com as recomendacoes do guia. |

### 6.2 Instrucao de sistema recomendada (insumo para o prompt-engineer)

A instrucao de sistema deve incluir a seguinte logica, que o prompt-engineer deve traduzir
em linguagem eficiente para o modelo de IA:

- "O viajante fixou as seguintes atividades em seu roteiro: {lista formatada de atividades
  manuais com dia, horario de inicio e fim}. Estas atividades SAO IMUTAVEIS — nao podem ser
  movidas, removidas, ou sobrepostas por outras atividades."
- "Gere atividades para os blocos de tempo NAO ocupados pelas atividades fixas em cada dia."
- "Use as preferencias de viagem atualizadas do viajante como referencia para as novas
  atividades: {dados de Phase 2}."
- "O guia do destino gerado em Phase 5 contem recomendacoes para este destino. Use-as como
  inspiracao para as novas atividades: {resumo do guia}."

### 6.3 Contexto das Phases anteriores

A regeneracao inteligente deve usar o contexto MAIS ATUAL das fases, nao o contexto da
geracao original do roteiro. Isso significa:
- Preferencias de Phase 2 na versao atual (o usuario pode ter editado preferencias).
- Dados de Phase 4 (transporte/hospedagem) para inferir disponibilidade de horarios.
- Conteudo de Phase 5 (guia) como base de recomendacoes de atrações.

---

## 7. Criterios de Aceite

- [ ] AC-001: Dado que uma atividade e criada pelo AI durante a geracao do roteiro, quando a
  atividade e persistida, entao o campo `isManual` e `false`. Dado que uma atividade e criada
  diretamente pelo usuario via interface de adicao manual, quando a atividade e persistida,
  entao o campo `isManual` e `true`.

- [ ] AC-002: Dado que o roteiro esta visivel e contem atividades (manuais e/ou de IA), quando
  os cartoes de atividade sao renderizados, entao cada atividade exibe um badge "IA" (teal
  `atlas-on-tertiary-container`) se `isManual = false` ou um badge "Manual" (usando
  `atlas-primary-container`) se `isManual = true`.

- [ ] AC-003: Dado que o usuario clica em "Regenerar Roteiro (-80 PA)" e o roteiro NAO contem
  nenhuma atividade com `isManual = true`, quando o botao e clicado, entao o dialogo de
  confirmacao NAO e exibido e a regeneracao completa e iniciada diretamente (comportamento
  identico ao SPEC-PROD-055).

- [ ] AC-004: Dado que o usuario clica em "Regenerar Roteiro (-80 PA)" e o roteiro contem pelo
  menos uma atividade com `isManual = true`, quando o botao e clicado, entao o dialogo de
  confirmacao e exibido com: o titulo correto, o numero exato de atividades manuais detectadas
  [N], as duas opcoes ("Manter minhas atividades" e "Regenerar tudo"), e um controle de
  fechamento sem acao.

- [ ] AC-005: Dado o dialogo de confirmacao visivel, quando o usuario clica em "Manter minhas
  atividades" e o saldo de `availablePoints` >= 80, entao a regeneracao e iniciada com o
  prompt enriquecido que inclui as atividades manuais como pontos fixos, e o skeleton loader
  e exibido.

- [ ] AC-006: Dado que a regeneracao com "Manter minhas atividades" e concluida com sucesso,
  quando o novo roteiro e renderizado, entao todas as atividades com `isManual = true`
  presentes no roteiro anterior estao presentes no novo roteiro no mesmo `dayNumber`,
  `startTime` e `endTime` originais, sem alteracao.

- [ ] AC-007: Dado que a regeneracao com "Manter minhas atividades" e concluida com sucesso,
  quando o novo roteiro e renderizado, entao: (a) 80 PA sao debitados do `availablePoints`,
  (b) a notificacao "Roteiro atualizado! -80 PA" e exibida, e (c) atividades AI geradas nos
  slots ao redor das atividades manuais exibem o badge "IA".

- [ ] AC-008: Dado o dialogo de confirmacao visivel, quando o usuario clica em "Regenerar
  tudo", entao uma regeneracao completa e iniciada sem preservacao de nenhuma atividade
  manual, o novo roteiro substitui completamente o anterior apos geracao bem-sucedida,
  e 80 PA sao debitados somente apos sucesso.

- [ ] AC-009: Dado o dialogo de confirmacao visivel, quando o usuario clica no controle de
  fechamento (X ou fora do modal), entao o modal e fechado sem iniciar nenhuma chamada de IA,
  sem debitar nenhum PA, e o roteiro permanece no estado anterior.

- [ ] AC-010: Dado que a regeneracao falhou (timeout ou erro do provedor de IA), independente
  da opcao escolhida ("Manter atividades" ou "Regenerar tudo"), quando o erro e tratado,
  entao: (a) o conteudo ANTERIOR do roteiro e restaurado incluindo todas as atividades
  manuais, (b) nenhum PA e debitado, e (c) a mensagem "Nao foi possivel atualizar o roteiro.
  Tente novamente." e exibida com o botao "Tentar novamente (-80 PA)".

- [ ] AC-011: Dado que o usuario ja realizou 5 regeneracoes para a expedicao atual (limite
  de BR-007), quando o roteiro renderiza, entao o botao "Regenerar Roteiro" esta desabilitado
  com o label "Limite atingido (5/5)" e uma mensagem explicativa e exibida.

- [ ] AC-012: Dado qualquer estado da Phase 6, quando o produto e exibido em pt-BR, entao
  todos os textos do dialogo de confirmacao, badges de atividade, mensagens de estado e
  labels de botao usam o idioma pt-BR. Dado o produto em en, entao todos os textos usam
  o idioma en. Chaves de i18n registradas em `messages/pt-BR.json` e `messages/en.json`.

- [ ] AC-013: Dado que o usuario clica em "Manter minhas atividades" ou "Regenerar tudo" com
  `availablePoints` < 80, quando o sistema verifica o saldo no servidor, entao nenhuma
  chamada de IA e iniciada, uma mensagem de erro "PA insuficientes para regenerar o roteiro"
  e exibida, e o link "Comprar Pontos Atlas" e visivel.

---

## 8. Escopo

### Em Escopo

- Campo `isManual` (Boolean, default `false`) no modelo `Activity` com migration de banco.
- Badge visual "IA" / "Manual" em todos os cartoes de atividade no roteiro.
- Deteccao de atividades manuais antes de iniciar regeneracao.
- Dialogo de confirmacao com opcao "Manter minhas atividades" e "Regenerar tudo".
- Fluxo de regeneracao inteligente: prompt enriquecido com atividades manuais como pontos
  fixos.
- Fluxo de regeneracao completa (Opcao B): comportamento identico ao SPEC-PROD-055.
- Preservacao do conteudo anterior em caso de falha de geracao (atividades manuais nunca
  sao perdidas por falha de IA).
- Uso de contexto atualizado das Phases 2 e 5 no prompt de regeneracao.
- Verificacao de saldo no servidor antes de iniciar qualquer chamada de IA.
- Limite de 5 regeneracoes por expedicao.
- Suporte a pt-BR e en (chaves i18n).

### Fora de Escopo (v1)

- Interface de adicao manual de atividades (CRUD de atividades pelo usuario) — esta spec
  define o comportamento para atividades que JA sao manuais; a interface para adicionar
  atividades manualmente e coberta pelo SPEC-PROD-PHASE6-REDESIGN (AC de adicao de
  atividade).
- Filtro visual por tipo de atividade (IA vs Manual) na visualizacao do roteiro — deferred.
- Historico de versoes do roteiro (ver versao anterior apos regeneracao) — deferred.
- Reordenacao de atividades manuais via drag-and-drop — deferred para v2.
- Exportacao do roteiro com marcacao de atividades manuais vs IA — deferred.
- Notificacoes por email sobre regeneracao.

---

## 9. Regras de Negocio

| # | Regra | Detalhes |
|---|-------|----------|
| BR-001 | Custo de regeneracao: 80 PA | A regeneracao inteligente custa o mesmo 80 PA da regeneracao completa, definido em SPEC-PROD-055. A escolha de "Manter atividades" nao tem desconto — o custo e o mesmo. |
| BR-002 | PA debitado somente apos sucesso | O debito de 80 PA ocorre exclusivamente apos confirmacao de resposta completa e bem-sucedida do provedor de IA. Qualquer falha (timeout, erro, resposta incompleta) nao gera debito. |
| BR-003 | Atividades manuais NAO podem ser perdidas por falha de IA | Em nenhum cenario de falha, as atividades com `isManual = true` podem ser apagadas. O rollback em caso de erro deve restaurar o estado anterior incluindo todas as atividades manuais. |
| BR-004 | isManual e imutavel apos criacao | O campo `isManual` e definido no momento de criacao da atividade e nao pode ser alterado posteriormente — nem pela UI, nem pela API. Uma atividade manual nunca se torna uma atividade de IA e vice-versa. |
| BR-005 | Contexto atualizado das Phases anteriores | A regeneracao inteligente usa os dados ATUAIS das Phases 2 e 5 — nao os dados do momento da ultima geracao. Isso garante que o novo roteiro reflita eventuais ajustes feitos pelo usuario em fases anteriores. |
| BR-006 | Guia de Phase 5 como contexto de IA | Se um guia ja foi gerado em Phase 5 para o mesmo tripId, seu conteudo (especialmente a secao `mustSee`) e incluido como contexto no prompt de regeneracao do roteiro. Isso cria coerencia entre guia e roteiro. |
| BR-007 | Limite de 5 regeneracoes por expedicao | O contador de regeneracoes e compartilhado com o limite definido em SPEC-PROD-055 para a regeneracao padrao de Phase 6. Ao atingir o limite, o botao "Regenerar Roteiro" fica desabilitado. |

---

## 10. Restricoes

### Seguranca

- A verificacao de `availablePoints >= 80` deve ocorrer no servidor, nunca exclusivamente
  no cliente. O usuario nao pode contornar a verificacao de saldo via manipulacao de estado.
- O `tripId` deve ser validado contra o `userId` da sessao autenticada antes de qualquer
  leitura ou escrita de atividades (BOLA guard). Um usuario nao pode acessar ou modificar
  atividades de outro usuario.
- Os dados de atividades manuais enviados ao prompt de IA devem ser sanitizados pelo
  prompt-engineer antes da inclusao no prompt (prevencao de prompt injection via titulos
  de atividades com conteudo malicioso).
- A migration do campo `isManual` deve ser reversivel e nao destrutiva — todos os registros
  existentes devem receber `false` como valor padrao sem interrupcao de servico.

### Acessibilidade

- O dialogo de confirmacao deve ser um modal verdadeiro (role="dialog", aria-modal="true",
  aria-labelledby apontando para o titulo do modal) com foco preso dentro do modal enquanto
  aberto (focus trap).
- Ao fechar o modal (qualquer opcao), o foco deve retornar ao elemento que abriu o modal
  (botao "Regenerar Roteiro").
- Os badges "IA" e "Manual" nao podem usar cor como UNICO meio de comunicacao. O texto
  do badge ("IA" / "Manual") deve estar presente como texto legivel por leitores de tela.
- A opcao padrao "Manter minhas atividades" deve ser comunicada via `aria-describedby`
  ou texto contextual que explique que ela e a acao recomendada.
- WCAG 2.1 AA: contraste de ambos os badges ("IA" em teal e "Manual" em primary-container)
  deve passar auditoria axe-core sem violacoes.
- O estado de loading (skeleton) deve anunciar via `aria-live` region que o roteiro esta
  sendo atualizado.

### Performance

- O dialogo de confirmacao deve abrir em < 200ms apos o clique no botao de regeneracao —
  e uma operacao puramente de estado do cliente (a deteccao de atividades manuais pode ser
  feita com os dados ja carregados no contexto da fase).
- A selecao de opcao no dialogo (clicar em "Manter" ou "Regenerar tudo") deve responder em
  < 100ms com feedback visual imediato antes de iniciar a chamada de rede.
- Os badges "IA" / "Manual" nao devem causar layout shift visivel nos cartoes de atividade
  — eles devem ser calculados no render inicial, nao adicionados apos a renderizacao.

### Integridade da Economia PA e Dados

- O finops-engineer deve validar os ACs de debito (AC-007 e AC-008) antes do merge.
- O QA deve incluir testes de regressao especificos para o cenario de falha: confirmar que
  atividades manuais NAO sao apagadas quando a geracao falha.
- A migration do modelo `Activity` deve ser revisada pelo architect e pelo security-specialist
  antes de aplicacao em staging.

---

## 11. Metricas de Sucesso

| Metrica | Meta |
|---------|------|
| Taxa de preservacao de atividades manuais em regeneracao | 100% (zero perda de atividades manuais por qualquer causa tecnica) |
| Taxa de uso da opcao "Manter minhas atividades" | Monitorar — expectativa de >= 70% das regeneracoes quando atividades manuais existem |
| Debitos de PA em regeneracoes com falha | 0 (zero tolerancia) |
| Taxa de abandono apos dialogo de confirmacao | < 15% (usuarios que fecham o modal sem escolher uma opcao) |
| Satisfacao qualitativa com o roteiro | Reducao de feedbacks negativos sobre perda de customizacoes em sessoes de teste |

---

## 12. Dependencias

| Dependencia | Status | Notas |
|---|---|---|
| SPEC-PROD-055 (Geracao Manual) | Aprovado | O botao "Regenerar Roteiro (-80 PA)" e o fluxo de geracao/falha definidos ali sao a base desta spec. O dialogo de confirmacao e uma interceptacao ANTES do fluxo de SPEC-PROD-055. |
| SPEC-PROD-PHASE6-REDESIGN | Draft — Sprint 40 | O dialogo de confirmacao e os badges "IA"/"Manual" usam os tokens e componentes definidos naquele spec. A interface de adicao de atividades manuais pelo usuario deve ser implementada la. |
| ATLAS-GAMIFICACAO-APROVADO.md v1.1.0 | Aprovado | Fonte autoritativa para o valor de 80 PA. |
| Activity model (DB) | Requer migration | Campo `isManual Boolean @default(false)` deve ser adicionado. O architect deve validar impacto na migration antes do sprint. |
| prompt-engineer | Colaboracao necessaria | Deve receber os insumos da Secao 6 desta spec e traduzir em prompt template para o modelo de IA, incluindo instrucoes de atividades fixas e sanitizacao de input. |
| SPEC-GUIA-PERSONALIZACAO | Draft | Se o usuario tiver personalizado o guia (categorias + notas), esses dados tambem devem ser considerados no contexto de regeneracao do roteiro em versoes futuras. Em v1, apenas o conteudo final do guia Phase 5 e usado. |

---

## 13. Vendor Independence

Esta spec define O QUE o usuario ve e O QUE acontece no negocio — nao COMO e implementado.
Nao faz referencia a React, Next.js, Prisma, ou qualquer biblioteca especifica.
Detalhes de implementacao (migration SQL, componente de modal, estrutura do prompt) pertencem
ao SPEC-ARCH correspondente, a ser criado pelo architect.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-30 | product-owner | Draft inicial — Regeneracao inteligente com preservacao de atividades manuais |
