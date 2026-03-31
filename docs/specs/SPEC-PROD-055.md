---
spec_id: SPEC-PROD-055
title: "Geracao de IA Manual — Phase 5 (Guia do Destino) e Phase 6 (O Roteiro)"
version: 1.0.0
status: Approved
sprint: 40
owner: product-owner
created: 2026-03-30
updated: 2026-03-30
moscow: Must Have
effort: M
personas: [leisure-solo, leisure-family, bleisure, business-traveler]
gamification_reference: docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md
parent_specs: [SPEC-PROD-053, SPEC-PROD-PHASE5-REDESIGN, SPEC-PROD-PHASE6-REDESIGN]
---

# SPEC-PROD-055: Geracao de IA Manual — Phase 5 (Guia do Destino) e Phase 6 (O Roteiro)

> Este documento define a mudanca de comportamento de geracao automatica para geracao manual nas
> Phases 5 e 6 do wizard de expedicao. Esta spec complementa SPEC-PROD-053,
> SPEC-PROD-PHASE5-REDESIGN e SPEC-PROD-PHASE6-REDESIGN: ela nao altera os criterios de aceite
> visuais daqueles specs — ela redefine o QUANDO e o COMO o conteudo de IA se torna visivel
> para o usuario. Em caso de conflito com os specs pai sobre o comportamento de geracao, este
> documento prevalece.

---

## 1. Declaracao do Problema

### 1.1 Comportamento Atual (problema)

Nas Phases 5 e 6, ao acessar a fase, o sistema inicia automaticamente uma chamada de IA sem
nenhuma acao do usuario. Este comportamento causa tres categorias de problemas:

**Problema 1 — Falhas silenciosas e inesperadas**
Timeouts, respostas incompletas e erros de provedor de IA acontecem enquanto o usuario esta
passivo, sem contexto e sem capacidade de decisao. O usuario ve uma tela de erro ou conteudo
truncado sem entender por que gastou PA (ou se gastou) e sem saber o que fazer a seguir.

**Problema 2 — Gasto de PA sem consentimento explicito**
O principio fundamental da economia PA do Atlas e "consentimento antes do gasto" (definido em
`docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md`, Secao 1.2). A geracao automatica
viola este principio: o usuario acessa a fase e o sistema debita (ou tenta debitar) 50 ou 80
PA sem que o usuario tenha clicado em um botao de confirmacao.

**Problema 3 — Ausencia de visibilidade de custo**
O usuario que acessa a fase pela primeira vez nao ve o custo de PA antes de a geracao
comecar. Isso impede a tomada de decisao informada — especialmente relevante para usuarios
com saldo baixo ou que ainda nao entenderam a economia de PA.

### 1.2 Evidencias do Problema

- Sprints 26-39: reports recorrentes de "guia incompleto" e "roteiro vazio" em sessoes de
  teste manual, atribuidos a timeouts de IA que nao foram recuperados pela UI.
- SPEC-PROD-053 Out of Scope declara explicitamente: "PA cost deduction for AI generation"
  como fora de escopo visual — reconhecendo que o comportamento de custo precisa de uma spec
  dedicada.
- ATLAS-GAMIFICACAO-APROVADO.md Principio 2: "Consentimento antes do gasto — Nenhum PA e
  debitado sem confirmacao explicita do usuario." A geracao automatica e uma violacao direta
  deste principio aprovado.

---

## 2. Decisao de Produto

**Mudanca aprovada**: As Phases 5 e 6 passam de geracao automatica para geracao manual.

O usuario deve clicar explicitamente em um botao primario para iniciar a geracao de conteudo
de IA. O sistema exibe o custo de PA antes da acao, verifica o saldo, e so inicia a chamada
de IA apos o clique confirmado. PA e debitado somente apos geracao bem-sucedida.

Esta mudanca e retro-compativel: se o conteudo ja foi gerado e persistido para o trip
especifico, ele e exibido imediatamente sem nenhum estado vazio e sem nenhum botao de
geracao.

---

## 3. User Stories

### US-A: Gerar o Guia do Destino pela primeira vez

As a @leisure-solo starting Phase 5 of their expedition for the first time,
I want to see a clear empty state that shows me the cost before I generate the destination guide,
so that I can decide when to spend my Atlas Points and feel in control of my expedition planning.

### US-B: Gerar o Roteiro pela primeira vez

As a @leisure-family who has completed Phases 1-4 and is ready to see their itinerary,
I want to explicitly trigger the AI itinerary generation after confirming I understand the cost,
so that I am never surprised by a PA deduction and always know what I am getting in return.

### US-C: Recuperar de uma falha de geracao

As a @bleisure traveler whose guide or itinerary generation failed due to a timeout,
I want to see a clear error message and a retry button without having been charged any PA,
so that I can try again with confidence that my points are safe until the content is
successfully delivered.

---

## 4. Contexto do Viajante

- **Pain point**: O usuario acessa uma fase esperando ver conteudo ou controles claros. Ver
  um spinner seguido de erro — sem ter feito nada — gera frustracao e desconfianca no
  produto. Pior: o usuario nao sabe se foi cobrado PA.
- **Workaround atual**: Usuarios recarregam a pagina, tentando re-triggar a geracao
  automatica. Cada recarga pode gerar uma nova chamada de IA, potencialmente duplicando
  custos e degradando a experiencia.
- **Frequencia**: Toda expedicao que chega a Phase 5 ou Phase 6 pela primeira vez passa por
  este fluxo. Para usuarios com multiplas expedicoes, o fluxo de "ja gerado" (cache) e o
  mais frequente — mas o fluxo de geracao inicial e o mais critico para a impressao de
  qualidade do produto.

---

## 5. Comportamento Especificado

### 5.1 Phase 5 — "Guia do Destino"

#### Estado: Conteudo nao gerado (primeira visita)

O usuario acessa Phase 5 e nenhum `guideContent` existe para este `tripId`.

A fase exibe um estado vazio estruturado contendo:

1. **Titulo**: "Guia do Destino: [nome do destino da expedicao]"
   - O nome do destino e lido do campo `destination` do Trip — nunca um placeholder generico.
2. **Descricao**: "Gere um guia personalizado com informacoes essenciais sobre [nome do
   destino]: seguranca, custos medios, atracacoes e dicas culturais."
3. **Indicador de custo de PA**: "Custo: 50 Pontos Atlas"
   - Exibido em destaque, usando o token de cor `atlas-on-tertiary-container` (#1c9a8e) — a
     cor semantica de IA no design system — para criar associacao visual com o recurso de IA.
   - O valor 50 PA vem da constante `AI_COSTS.ai_accommodation` definida em
     `ATLAS-GAMIFICACAO-APROVADO.md`. Qualquer alteracao neste valor deve atualizar esta spec.
4. **Botao primario de CTA**: "Gerar Guia do Destino"
   - Estilo: `AtlasButton` variante primaria — fundo `atlas-secondary-container` (#fe932c),
     texto `atlas-primary` (#040d1b). Par de contraste WCAG 4.5:1 aprovado.
   - Estado habilitado: usuario tem saldo de `availablePoints` >= 50 PA.
   - Estado desabilitado: usuario tem `availablePoints` < 50 PA. O botao e desabilitado
     visualmente e exibe o texto "PA insuficientes" em lugar do label padrao.
5. **Link secundario** (quando botao desabilitado): "Comprar Pontos Atlas" — link inline que
   navega para a tela de compra de PA (`/meu-atlas/comprar-pa`).

#### Estado: Geracao em progresso

Apos o clique no botao primario, a fase entra em estado de carregamento:

- O botao de CTA e removido da view ou substituido por um indicador de progresso inline.
- Um skeleton loader e exibido no lugar onde o conteudo do guia sera renderizado. O skeleton
  deve refletir a estrutura do bento-grid definido em SPEC-PROD-PHASE5-REDESIGN (card
  principal largo + 4 cards de categoria).
- Uma mensagem de status contextual e exibida: "Gerando seu guia personalizado para
  [destino]..."
- O usuario NAO pode navegar para outra fase usando os controles de stepper enquanto a
  geracao esta em progresso (navegacao bloqueada por estado de loading ativo).

#### Estado: Conteudo gerado com sucesso

- O conteudo do guia e renderizado conforme definido em SPEC-PROD-PHASE5-REDESIGN.
- O botao de "Gerar Guia do Destino" NAO e mais exibido.
- **Debito de PA**: 50 PA sao debitados do `availablePoints` do usuario somente neste
  momento — apos confirmacao de resposta bem-sucedida do provedor de IA.
- Uma notificacao inline confirma: "Guia gerado! -50 PA"

#### Estado: Conteudo ja persistido (revisita)

O usuario acessa Phase 5 e `guideContent` ja existe para este `tripId`.

- O conteudo e exibido imediatamente, sem estado vazio, sem skeleton, sem botao de geracao.
- Nenhum PA e debitado.
- Um botao secundario "Regenerar Guia" e exibido no rodape da fase, com label que inclui o
  custo: "Regenerar Guia (-50 PA)". Este botao esta sujeito ao mesmo check de saldo que o
  botao inicial. Clicar em "Regenerar Guia" substitui o conteudo existente pelo novo conteudo
  gerado.

#### Estado: Falha na geracao

Se a chamada de IA retorna erro (timeout, erro de provedor, resposta vazia):

- O skeleton e removido.
- Uma mensagem de erro e exibida: "Nao foi possivel gerar o guia agora. Tente novamente."
- Um botao "Tentar novamente" e exibido, com o mesmo custo indicado: "Tentar novamente
  (-50 PA)".
- **Nenhum PA e debitado** em caso de falha. O `availablePoints` do usuario permanece
  inalterado.
- O erro deve ser registrado internamente para monitoramento de taxa de falha de IA, mas a
  mensagem exibida ao usuario nao expoe detalhes tecnicos (sem stack trace, sem codigo de
  erro HTTP).

---

### 5.2 Phase 6 — "O Roteiro"

O padrao de comportamento e identico ao de Phase 5. As diferencas sao apenas nos valores de
dominio especificos da fase.

#### Estado: Conteudo nao gerado (primeira visita)

A fase exibe um estado vazio estruturado contendo:

1. **Titulo**: "O Roteiro: [nome do destino da expedicao]"
2. **Descricao**: "Gere um roteiro dia-a-dia personalizado para sua expedicao em [nome do
   destino], com atividades, horarios e dicas baseados no seu perfil de viagem."
3. **Indicador de custo de PA**: "Custo: 80 Pontos Atlas"
   - O valor 80 PA vem da constante `AI_COSTS.ai_itinerary` definida em
     `ATLAS-GAMIFICACAO-APROVADO.md`.
   - Mesmo token de cor `atlas-on-tertiary-container` (#1c9a8e) do Phase 5.
4. **Botao primario de CTA**: "Gerar Roteiro com IA"
   - Mesmo estilo e regras de estado do Phase 5: habilitado se `availablePoints` >= 80 PA,
     desabilitado com label "PA insuficientes" caso contrario.
5. **Link secundario** (quando desabilitado): "Comprar Pontos Atlas"

#### Estado: Geracao em progresso

- Skeleton loader refletindo a estrutura de timeline dia-a-dia definida em
  SPEC-PROD-PHASE6-REDESIGN (blocos de dia com nodes de atividade).
- Mensagem de status: "Gerando seu roteiro para [destino]..."
- Navegacao bloqueada durante loading.

#### Estado: Conteudo gerado com sucesso

- O roteiro e renderizado conforme SPEC-PROD-PHASE6-REDESIGN.
- **Debito de PA**: 80 PA debitados somente apos resposta bem-sucedida.
- Notificacao inline: "Roteiro gerado! -80 PA"

#### Estado: Conteudo ja persistido (revisita)

- Conteudo exibido imediatamente.
- Botao secundario no rodape: "Regenerar Roteiro (-80 PA)". Sujeito ao mesmo check de saldo.

#### Estado: Falha na geracao

- Mensagem de erro: "Nao foi possivel gerar o roteiro agora. Tente novamente."
- Botao: "Tentar novamente (-80 PA)"
- **Nenhum PA e debitado** em caso de falha.

---

## 6. Regras de Negocio

| # | Regra | Detalhes |
|---|---|---|
| BR-001 | PA debitado somente apos sucesso | O debito de PA ocorre exclusivamente apos confirmacao de resposta completa e bem-sucedida do provedor de IA. Falhas nao geram debito. |
| BR-002 | Verificacao de saldo antes da geracao | O sistema deve verificar `availablePoints >= custo_da_fase` antes de iniciar a chamada de IA. Se o saldo for insuficiente no momento da chamada (race condition), a geracao nao deve ser iniciada e nenhum PA e debitado. |
| BR-003 | Regeneracao custa o mesmo que geracao | Substituir um guia ou roteiro ja gerado custa o mesmo PA que a geracao inicial (50 PA para Phase 5, 80 PA para Phase 6). Nao ha desconto por regeneracao. |
| BR-004 | Conteudo em cache e exibido sem custo | Se `guideContent` (Phase 5) ou o conteudo de itinerario (Phase 6) ja existe no banco de dados para o `tripId`, ele e exibido imediatamente sem nenhuma chamada de IA e sem nenhum debito de PA. |
| BR-005 | Custo exibido antes da acao | O indicador de custo de PA deve estar visivel ANTES do usuario clicar no botao de geracao. O custo nunca e revelado apenas apos o clique. |
| BR-006 | Valores de PA sao autoritativos do documento economico | Os valores 50 PA e 80 PA derivam de `ATLAS-GAMIFICACAO-APROVADO.md`. Qualquer alteracao nos custos de IA exige: (1) atualizacao do documento economico, (2) atualizacao desta spec, (3) atualizacao da UI simultaneamente. |
| BR-007 | Retrocompatibilidade com V1 | Com `NEXT_PUBLIC_DESIGN_V2=false`, o comportamento de geracao tambem muda para manual. Esta mudanca de comportamento e independente do feature flag de design — ela e uma correcao de produto que se aplica a ambas as versoes. |

---

## 7. Criterios de Aceite

### Phase 5 — Estado vazio

- [ ] AC-001: Dado que o usuario acessa Phase 5 e nenhum `guideContent` existe para o `tripId`, quando a fase renderiza, entao o titulo exibido e "Guia do Destino: [nome do destino]" onde o nome do destino e o valor real do campo `destination` do Trip — nunca um placeholder como "seu destino".

- [ ] AC-002: Dado o estado vazio de Phase 5, quando a fase renderiza, entao o indicador de custo exibe exatamente "Custo: 50 Pontos Atlas" e esta visivel ANTES de qualquer interacao do usuario.

- [ ] AC-003: Dado o estado vazio de Phase 5 e o usuario tem `availablePoints` >= 50, quando a fase renderiza, entao o botao "Gerar Guia do Destino" esta habilitado, e clicavel, e exibe o label correto.

- [ ] AC-004: Dado o estado vazio de Phase 5 e o usuario tem `availablePoints` < 50, quando a fase renderiza, entao o botao exibe o label "PA insuficientes", esta desabilitado (nao clicavel), e um link "Comprar Pontos Atlas" esta visivel na mesma area de conteudo.

### Phase 5 — Fluxo de geracao

- [ ] AC-005: Dado o estado vazio de Phase 5 e o usuario clica em "Gerar Guia do Destino", quando a geracao inicia, entao um skeleton loader com a estrutura bento-grid (1 card largo + 4 cards menores) e exibido e a navegacao para outras fases via stepper fica bloqueada.

- [ ] AC-006: Dado que a geracao de Phase 5 foi concluida com sucesso, quando o conteudo e exibido, entao exatamente 50 PA sao debitados do `availablePoints` do usuario e uma notificacao inline confirma o debito.

- [ ] AC-007: Dado que a geracao de Phase 5 falhou (timeout ou erro do provedor de IA), quando o erro e tratado, entao: (a) nenhum PA e debitado, (b) a mensagem "Nao foi possivel gerar o guia agora. Tente novamente." e exibida, (c) um botao "Tentar novamente (-50 PA)" esta visivel e habilitado se o saldo e suficiente.

### Phase 5 — Conteudo em cache

- [ ] AC-008: Dado que o usuario acessa Phase 5 e `guideContent` ja existe para o `tripId`, quando a fase renderiza, entao o conteudo do guia e exibido imediatamente sem estado vazio, sem skeleton, e sem botao "Gerar Guia do Destino".

- [ ] AC-009: Dado Phase 5 com conteudo ja gerado, quando a fase renderiza, entao um botao secundario "Regenerar Guia (-50 PA)" esta visivel no rodape e esta sujeito ao mesmo check de saldo: desabilitado com label "PA insuficientes" se `availablePoints` < 50.

### Phase 6 — Estado vazio

- [ ] AC-010: Dado que o usuario acessa Phase 6 e nenhum conteudo de itinerario existe para o `tripId`, quando a fase renderiza, entao o titulo exibido e "O Roteiro: [nome do destino]" e o indicador de custo exibe exatamente "Custo: 80 Pontos Atlas" antes de qualquer interacao.

- [ ] AC-011: Dado o estado vazio de Phase 6 e o usuario tem `availablePoints` >= 80, quando a fase renderiza, entao o botao "Gerar Roteiro com IA" esta habilitado e clicavel.

- [ ] AC-012: Dado o estado vazio de Phase 6 e o usuario tem `availablePoints` < 80, quando a fase renderiza, entao o botao exibe "PA insuficientes", esta desabilitado, e o link "Comprar Pontos Atlas" esta visivel.

### Phase 6 — Fluxo de geracao

- [ ] AC-013: Dado que a geracao de Phase 6 foi concluida com sucesso, quando o conteudo e exibido, entao exatamente 80 PA sao debitados do `availablePoints` do usuario — nao antes, nao durante, somente apos confirmacao de resposta completa.

- [ ] AC-014: Dado que a geracao de Phase 6 falhou, quando o erro e tratado, entao nenhum PA e debitado e o botao "Tentar novamente (-80 PA)" e exibido com o mesmo comportamento de check de saldo.

### Regras transversais

- [ ] AC-015: Dado qualquer das Phases 5 ou 6, quando `NEXT_PUBLIC_DESIGN_V2=false`, entao o comportamento de geracao manual (estado vazio, check de saldo, debito apenas apos sucesso) e identico ao comportamento com `NEXT_PUBLIC_DESIGN_V2=true`. A geracao automatica NAO deve ocorrer em nenhuma configuracao de flag.

---

## 8. Escopo

### Em Escopo

- Remocao da geracao automatica de IA ao entrar nas Phases 5 e 6.
- Estado vazio com titulo, descricao, indicador de custo de PA e botao de CTA.
- Verificacao de saldo de PA antes de habilitar o botao de geracao.
- Estado de loading com skeleton correspondente a estrutura de cada fase.
- Debito de PA somente apos geracao bem-sucedida.
- Estado de erro com botao "Tentar novamente" sem debito de PA.
- Estado de cache: exibicao imediata de conteudo ja gerado.
- Botao "Regenerar" para substituir conteudo existente.
- Aplicacao do comportamento em ambas as versoes de design (V1 e V2).

### Fora de Escopo

- Alteracoes nos prompts de IA enviados para o provedor (responsabilidade do prompt-engineer).
- Alteracoes na arquitetura de streaming (responsabilidade do architect + SPEC-ARCH correspondente).
- Alteracoes nos valores de PA (requer revisao de `ATLAS-GAMIFICACAO-APROVADO.md` antes desta spec).
- Historico de transacoes de PA na tela de Meu Atlas (ja coberto por SPEC-PROD-035+).
- Geracao de Phase 3 (checklist) — comportamento de Phase 3 e diferente: o checklist e gerado por IA mas nao tem o mesmo custo de PA nem a mesma logica de empty state. Se necessario, uma spec separada deve ser criada.
- Notificacoes por email sobre geracao de conteudo.

---

## 9. Restricoes

### Seguranca

- O check de saldo de PA deve ocorrer no servidor, nunca apenas no cliente. Um usuario nao deve conseguir contornar o check de `availablePoints` manipulando o estado do cliente.
- O debito de PA e a chamada de IA devem ser operacoes atomicas do ponto de vista do usuario: ou ambas acontecem (sucesso) ou nenhuma acontece (falha). O sistema nao deve debitar PA e entao falhar na chamada de IA.
- O `tripId` usado para buscar e persistir o `guideContent` deve ser validado contra o `userId` da sessao autenticada (guard BOLA). Um usuario nao pode gerar conteudo para o trip de outro usuario.

### Acessibilidade

- O botao de CTA desabilitado deve comunicar seu estado a leitores de tela via `aria-disabled` e uma descricao acessivel que explique o motivo ("Pontos Atlas insuficientes para gerar o guia").
- O indicador de custo de PA nao pode usar cor como unico meio de comunicacao — o texto "Custo: 50 Pontos Atlas" deve estar presente como texto legivel por leitores de tela.
- O estado de loading deve anunciar ao usuario via `aria-live` region que a geracao esta em andamento.
- O estado de erro deve receber foco automatico (ou mover foco para o elemento de erro) para que usuarios de teclado e leitores de tela sejam notificados sem necessidade de inspecao visual.
- WCAG 2.1 AA: todos os estados (vazio, loading, sucesso, erro) devem passar auditoria axe-core sem violacoes.

### Performance

- O estado vazio deve renderizar em < 300ms (sem chamadas de IA, apenas leitura do campo `destination` do Trip ja carregado).
- A verificacao de saldo de PA nao deve bloquear a renderizacao do estado vazio — o botao pode renderizar em estado de loading brevemente enquanto o saldo e verificado, mas o restante do estado vazio deve estar visivel imediatamente.
- O skeleton de loading de Phase 5 e Phase 6 nao deve introduzir animacoes que violem `prefers-reduced-motion`.

### Integridade da Economia PA

- Esta spec esta sujeita a auditoria do finops-engineer para garantir que o debito de PA so ocorra apos geracao bem-sucedida. O finops-engineer deve validar os ACs de debito (AC-006 e AC-013) antes do merge.
- Qualquer alteracao nos valores de custo de PA (50 PA ou 80 PA) requer aprovacao do product-owner e atualizacao simultanea de `ATLAS-GAMIFICACAO-APROVADO.md`, desta spec, e da UI.

---

## 10. Metricas de Sucesso

| Metrica | Baseline atual | Meta apos esta spec |
|---|---|---|
| Taxa de erro na geracao de Phase 5 (visto pelo usuario) | Desconhecida (erros silenciosos) | < 5% das tentativas de geracao iniciadas pelo usuario |
| Taxa de erro na geracao de Phase 6 (visto pelo usuario) | Desconhecida (erros silenciosos) | < 5% das tentativas de geracao iniciadas pelo usuario |
| Debitos de PA em geracoes falhas | > 0 (bug atual) | 0 (zero tolerancia) |
| Taxa de abandono de Phase 5 (saida sem gerar) | Desconhecida | Monitorar na primeira sprint apos deploy; meta < 15% |
| Taxa de abandono de Phase 6 (saida sem gerar) | Desconhecida | Monitorar na primeira sprint apos deploy; meta < 10% |
| Satisfacao qualitativa com o fluxo | Feedback negativo recorrente sobre falhas | Zero mencoes de "gastei PA sem ver conteudo" em sessoes de teste |

---

## 11. Justificativa — Por que Geracao Manual e a Decisao Correta

### 11.1 Elimina surpresas negativas

Geracao automatica cria uma expectativa implicita: "ao entrar na fase, algo vai acontecer". Quando
esse "algo" falha, o usuario nao apenas perde conteudo — ele perde confianca no produto. Com
geracao manual, o usuario esta no controle: ele decide quando esta pronto para gerar. Nenhuma
surpresa negativa e possivel porque o usuario e o agente da acao.

### 11.2 O usuario controla quando gastar PA

PA tem valor real para o usuario — ele ganhou pontos ao longo de sua jornada ou os comprou com
dinheiro. A decisao de gastar 50 ou 80 PA deve ser consciente e intencional. Um clique de botao
cria um momento de micro-decisao que respeita o investimento do usuario.

### 11.3 Visibilidade de custo antes da acao

O principio de "consentimento antes do gasto" (ATLAS-GAMIFICACAO-APROVADO.md) nao e apenas
etico — e estrategico. Usuarios que entendem e aceitam o custo antes de gastar PA reportam maior
satisfacao com o resultado, mesmo quando o conteudo poderia ser melhor. A percepao de "eu escolhi
isto" aumenta a tolerancia a imperfeicoes de IA.

### 11.4 Recuperacao de erros e trivial

Com geracao manual, um erro de IA e simplesmente "o botao nao funcionou desta vez". O usuario
entende o que aconteceu, ve um botao claro para tentar novamente, e sabe que nao perdeu PA. Sem
o trauma de "a pagina travou e nao sei o que aconteceu", a recuperacao e rapida e o usuario
permanece no fluxo.

---

## 12. Dependencias

| Dependencia | Status | Notas |
|---|---|---|
| SPEC-PROD-PHASE5-REDESIGN | Draft — Sprint 40 | Esta spec complementa os ACs visuais de Phase 5; o estado vazio e o skeleton devem usar os tokens e componentes definidos naquele spec |
| SPEC-PROD-PHASE6-REDESIGN | Draft — Sprint 40 | Mesmo que acima para Phase 6 |
| ATLAS-GAMIFICACAO-APROVADO.md v1.1.0 | Aprovado | Fonte autoritativa para valores de PA (50 PA Phase 5, 80 PA Phase 6) |
| Engine de debito de PA (PointsEngine) | Implementado Sprint 9 | Deve suportar debito condicional apos confirmacao de sucesso de IA — verificar se a logica atual ja suporta ou requer ajuste de comportamento |

---

## 13. Vendor Independence

Esta spec define O QUE o usuario ve e O QUE acontece no negocio — nao COMO e implementado.
Nao faz referencia a React, Next.js, Prisma, ou qualquer biblioteca especifica.
Detalhes de implementacao pertencem ao SPEC-ARCH correspondente, a ser criado pelo architect.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-30 | product-owner | Initial version — aprovada. Mudanca de geracao automatica para manual em Phases 5 e 6 |
