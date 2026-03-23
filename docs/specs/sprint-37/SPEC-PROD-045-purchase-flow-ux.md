# SPEC-PROD-045: Fluxo de Compra de PA — UX para Gateway Real

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, ux-designer, security-specialist
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Sprint**: 37
**Predecessor**: `docs/specs/sprint-36/SPEC-PROD-041-pa-packages.md` (compra com mock)
**Complementar a**: `docs/specs/sprint-37/SPEC-PROD-043-stripe-payment-integration.md` (backend)
**Documento de economia**: `docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md` — Secao 2.3

---

## 1. Problem Statement

O Sprint 36 entregou a pagina de pacotes de PA com fluxo de compra mock (SPEC-PROD-041). Com o gateway Stripe sendo ativado no Sprint 37 (SPEC-PROD-043), tres ajustes de UX tornam-se necessarios:

1. **O fluxo de compra muda fundamentalmente**: no mock, o usuario clicava "Confirmar" e o PA aparecia instantaneamente. Com Stripe, o usuario e **redirecionado para outro site** (stripe.com), preenche seus dados de pagamento, e retorna ao Atlas. Esta transicao entre dominios e um momento de atrito e potencial abandono — precisa de comunicacao clara.

2. **Os cards de pacotes precisam de mais inteligencia**: o Sprint 36 definiu cards basicos com nome, PA e preco. Para o gateway real, os cards precisam comunicar valor mais efetivamente: qual pacote e "Mais popular", qual tem "Melhor custo-beneficio", e o ratio PA/R$ que permite ao usuario comparar objetivamente. Dados de mercado de checkout indicam que uma escolha recomendada reduz tempo de decisao em ~40% e aumenta conversao.

3. **Os pontos de entrada para compra de PA estao fragmentados**: atualmente, o usuario so chega na pagina de pacotes via modal de saldo insuficiente. No Sprint 37, o fluxo tambem deve ser acessivel diretamente de "Meu Atlas" (aba "Meu Saldo"), criando um ponto de acesso proativo alem do reativo.

SPEC-PROD-045 foca exclusivamente na **experiencia do usuario** ao longo do fluxo de compra — do card de pacote ao retorno pos-pagamento. O backend (criacao de sessao Stripe, webhook, credito de PA) esta em SPEC-PROD-043.

---

## 2. User Story

### Historia Principal — Selecao de Pacote

As a @leisure-solo traveler browsing PA packages,
I want to see clear pricing, value ratios, and a recommended package,
so that I can make a confident purchase decision in under 30 seconds.

### Historia — Transicao para Stripe

As a @leisure-solo traveler who clicked "Comprar agora",
I want to understand clearly that I will be redirected to a secure payment page before leaving the Atlas site,
so that I do not feel surprised or suspicious when I land on stripe.com.

### Historia — Retorno pos-pagamento

As a @leisure-solo traveler who just completed payment,
I want to see immediate confirmation that my PA was credited and a clear path back to my expedition,
so that I can resume planning without confusion or delay.

### Historia — Acesso proativo

As a @leisure-solo traveler checking my balance on "Meu Atlas",
I want to be able to buy PA even when I still have some balance remaining,
so that I can top up proactively rather than waiting to run out mid-expedition.

### Traveler Context

- **Pain point**: O usuario chega no Stripe sem aviso previo — a transicao abrupta entre dominios cria desconfianca ("Isso e seguro? Onde estou?"). Outro ponto: com o mock, o usuario nem percebia que estava "comprando" PA de verdade porque acontecia instantaneamente. Agora, com pagamento real, a comunicacao de valor antes da confirmacao e critica.
- **Current workaround**: N/A — no Sprint 36 o mock nao tinha esse problema porque nao havia redirecionamento externo.
- **Frequency**: Todo usuario que tentar comprar PA no Sprint 37+. Para usuarios que vieram do modal de saldo insuficiente, e o momento de maior intencao de compra — qualquer friccao aqui e abandono direto.

---

## 3. Requirements

### REQ-UX-001 — Cards de Pacotes Aprimorados

**MoSCoW**: Must Have
**Esforco**: S

Redesenhar os cards de pacotes da pagina `/atlas/comprar-pa` para comunicar valor de forma mais eficaz para o gateway real.

**Conteudo de cada card** (atualizado em relacao ao Sprint 36):

| Elemento | Descricao |
|---|---|
| Nome do pacote | "Explorador", "Navegador", "Cartografo", "Embaixador" |
| Quantidade de PA | Em destaque visual (tamanho de fonte maior) |
| Preco | Em BRL com 2 casas decimais |
| Ratio PA/Real | Calculado e exibido: ex. "33,6 PA por real" |
| Economia vs. menor pacote | Badge percentual: ex. "+19% mais PA" (exceto Explorador) |
| Equivalencia em features de IA | Quantas vezes o usuario pode usar cada feature com esse pacote |
| CTA | Botao "Comprar agora" |
| Tag de destaque | Um card recebe tag "Mais popular" (Navegador); outro recebe "Melhor custo" (Embaixador) |

**Equivalencia em features de IA** (calculo com base em ATLAS-GAMIFICACAO-APROVADO.md):

| Pacote | PA | Checklists (30 PA) | Guias (50 PA) | Roteiros (80 PA) |
|---|---|---|---|---|
| Explorador | 500 | 16x | 10x | 6x |
| Navegador | 1.200 | 40x | 24x | 15x |
| Cartografo | 2.800 | 93x | 56x | 35x |
| Embaixador | 6.000 | 200x | 120x | 75x |

Exibir a equivalencia como: "Gere ate 6 roteiros completos" (exibir apenas a feature de maior valor — roteiro = 80 PA).

**Calculo de saldo pos-compra**:
- Ao focar ou passar o cursor sobre um card: exibir dinamicamente "Seu novo saldo: [saldo_atual + PA_pacote] PA".
- Em mobile (sem hover): exibir a projecao de saldo permanentemente abaixo do valor do PA.

**Nota importante sobre as tags de destaque**: "Mais popular" e "Melhor custo" sao designacoes fixas de produto — Navegador e "Mais popular" por ter melhor equilibrio de PA e preco para usuarios casuais; Embaixador e "Melhor custo" por ter o maior ratio PA/Real. Essas designacoes devem ter indicacao textual acessivel, nao apenas visual.

### REQ-UX-002 — Modal de Confirmacao com Comunicacao do Redirect Stripe

**MoSCoW**: Must Have
**Esforco**: S

Ao clicar "Comprar agora", exibir um modal de confirmacao que prepara o usuario para o redirect Stripe.

**Conteudo do modal** (diferente do Sprint 36 onde era apenas confirmacao de mock):

- Resumo da compra: nome do pacote, PA a receber, preco em BRL.
- Saldo atual e saldo apos a compra (projetado).
- **Comunicacao do redirect** (novo — critico para reducao de atrito):
  - Icone de cadeado + texto: "Voce sera redirecionado para o ambiente seguro do Stripe para concluir o pagamento."
  - SubTexto: "Apos o pagamento, voce voltara automaticamente para o Atlas e seu saldo sera atualizado."
  - Logo do Stripe (ou texto "Stripe" em destaque) para reforcar a identidade do gateway.
- Metodos de pagamento aceitos: icones de cartao de credito (Visa, Mastercard) e PIX.
- Botao primario: "Ir para o pagamento seguro".
- Botao secundario: "Cancelar".
- Nota rodape: "PA nao expira. Reembolso disponivel em 7 dias se nao utilizado."

**Comportamento do botao primario apos clique**:
- Exibir estado de loading ("Preparando pagamento...") enquanto a Checkout Session e criada no backend.
- Se a criacao da sessao falhar: exibir mensagem de erro e manter o modal aberto com opcao de tentar novamente.
- Se bem-sucedido: redirecionar para a URL da Checkout Session Stripe.
- O botao deve ser desabilitado apos o primeiro clique para prevenir criacao de multiplas sessoes.

### REQ-UX-003 — Pagina de Sucesso com Confirmacao Visual Clara

**MoSCoW**: Must Have
**Esforco**: S

A pagina `/comprar-pa/sucesso` (definida tecnicamente em SPEC-PROD-043) deve ter uma UX que confirme o sucesso da compra de forma inequivoca e direcione o usuario de volta ao fluxo de planeamento.

**Layout e conteudo**:

1. **Icone de sucesso**: icone visual grande indicando conclusao (ex: checkmark em circulo verde).
2. **Titulo**: "Compra concluida com sucesso!"
3. **Resumo da compra**: nome do pacote, PA recebido (ex: "+1.200 PA"), preco pago.
4. **Novo saldo**: "Seu saldo atual: [X] PA" — com o saldo ja atualizado.
5. **CTA principal**: botao "Continuar planejando minha expedicao" — redireciona para `/expeditions` (ou para a fase especifica se o usuario veio do modal de saldo insuficiente com contexto de retorno).
6. **CTA secundario**: link "Ver historico de transacoes" — redireciona para "Meu Atlas" > "Meu Saldo".
7. **Link para recibo**: "Ver recibo do pagamento" — abre URL do recibo Stripe em nova aba (quando disponivel).

**Estado de loading (enquanto webhook processa)**:
- Se o saldo ainda nao foi atualizado quando o usuario chega na pagina de sucesso:
  - Exibir o resumo da compra normalmente (nome do pacote, valor).
  - Substituir o saldo por um indicador de loading com texto: "Atualizando seu saldo... (pode levar alguns segundos)".
  - Fazer polling a cada 2 segundos por ate 30 segundos.
  - Se o saldo atualizar antes dos 30 segundos: exibir o saldo com uma animacao suave de entrada.
  - Se o saldo nao atualizar em 30 segundos: exibir mensagem "Seu saldo sera atualizado em breve. Se nao atualizar em alguns minutos, entre em contato com o suporte." com link para suporte.

**Nota de design**: a pagina de sucesso e o momento de maior satisfacao no fluxo de compra — a UX deve ser celebratoria mas nao exagerada. O foco e na clareza e na proxima acao.

### REQ-UX-004 — Contexto de Retorno apos Pagamento

**MoSCoW**: Must Have
**Esforco**: S

Quando o usuario chega na pagina de pacotes a partir do modal de saldo insuficiente (contexto de IA bloqueada), a pagina e o fluxo pos-compra devem preservar esse contexto para retornar o usuario ao ponto exato onde estava.

**Comportamento com contexto de retorno**:
1. Ao navegar do modal de saldo insuficiente para `/comprar-pa`, adicionar parametros de contexto: `/comprar-pa?returnTo=/expedition/[tripId]/phase/[phaseId]&feature=[aiFeature]`.
2. A pagina de pacotes exibe um banner contextual: "Voce precisa de [X] PA para [nome da feature]. Com o pacote [Recomendado], voce tera [saldo_esperado] PA."
3. O card recomendado (menor que cobre o deficit) e exibido com borda destacada e label "Recomendado para voce".
4. Apos a compra bem-sucedida, o botao principal na pagina de sucesso e "Voltar para [nome da fase]" em vez de "Continuar para expedicoes".
5. Ao clicar "Voltar para [nome da fase]", o usuario e redirecionado para a fase especifica, com o modal de custo de IA ja pronto para ser acionado (sem necessidade de navegar novamente ate o botao de IA).

**Validacao de contexto**: o `returnTo` deve ser validado no servidor para garantir que aponta para uma rota Atlas valida — nunca redirecionar para URLs externas (prevencao de open redirect).

### REQ-UX-005 — Ponto de Acesso Proativo em "Meu Atlas"

**MoSCoW**: Must Have
**Esforco**: XS

Na pagina "Meu Atlas", aba "Meu Saldo", adicionar um botao "Comprar mais PA" acessivel mesmo quando o usuario tem saldo positivo.

**Posicionamento**: proximo ao card de saldo atual, abaixo do saldo disponivel. Nao deve ser o elemento mais proeminente da pagina (o saldo e o elemento principal), mas deve ser visivelmente acessivel.

**Texto do botao**: "Comprar PA" (sem "mais" — simplicidade).

**Comportamento**: navega para `/comprar-pa` sem contexto de retorno (compra proativa, sem feature bloqueada).

**Nota de produto**: este ponto de acesso proativo serve usuarios que querem garantir PA antes de iniciar uma expedicao longa, ou usuarios que identificaram organicamente que precisarao de PA em fases futuras. Dados de mercado de produtos freemium indicam que 20-30% das compras sao proativas (usuario comprando antes de esgotar). Este botao captura essa intencao.

### REQ-UX-006 — Tratamento de Cancelamento com Retencao

**MoSCoW**: Should Have
**Esforco**: S

Quando o usuario cancela o pagamento no Stripe e retorna ao Atlas (`/comprar-pa?status=cancelled`), a experiencia deve minimizar o abandono definitivo sem pressionar o usuario.

**Comportamento apos cancelamento**:
1. Exibir banner informativo (nao intrusivo): "Pagamento nao concluido. Sem cobrancas foram realizadas."
2. Os cards de pacotes permanecem visiveis — o usuario pode tentar novamente imediatamente.
3. Se o usuario veio de um contexto de saldo insuficiente (parametro `returnTo` presente): exibir link "Voltar para a expedicao" e link secundario "Ver como ganhar PA gratis".
4. **Nao** exibir nenhuma mensagem de urgencia artificial ("Oferta por tempo limitado!") ou pressao social ("X usuarios compraram agora") — vedado pela politica "Sem dark patterns" de ATLAS-GAMIFICACAO-APROVADO.md.

### REQ-UX-007 — Indicador de Metodo de Pagamento Disponivel

**MoSCoW**: Could Have
**Esforco**: XS

Na pagina de pacotes, exibir discretamente quais metodos de pagamento sao aceitos.

**Posicionamento**: rodape da pagina ou abaixo dos cards (area nao intrusiva).

**Conteudo**: texto "Formas de pagamento:" seguido de icones de Cartao de Credito e PIX.

**Objetivo**: reduzir a ansiedade de usuarios que chegam na pagina sem saber se poderão usar PIX.

---

## 4. Acceptance Criteria

### AC-045-001: Cards — conteudo completo exibido
Given o usuario acessa `/atlas/comprar-pa`,
when a pagina carrega,
then cada um dos 4 cards exibe: nome, quantidade de PA, preco em BRL, ratio PA/Real, badge de economia percentual (exceto Explorador) e equivalencia em roteiros.

### AC-045-002: Cards — tag "Mais popular" no Navegador
Given a pagina de pacotes e exibida,
when o card "Navegador" e renderizado,
then ele exibe uma tag "Mais popular" com indicacao textual acessivel via `aria-label`.

### AC-045-003: Cards — tag "Melhor custo" no Embaixador
Given a pagina de pacotes e exibida,
when o card "Embaixador" e renderizado,
then ele exibe uma tag "Melhor custo" com indicacao textual acessivel.

### AC-045-004: Cards — projecao de saldo ao focar
Given o usuario com saldo atual de 50 PA foca no card "Cartografo" (2.800 PA),
when o focus ou hover e detectado,
then a pagina exibe "Seu novo saldo: 2.850 PA" de forma visivel.

### AC-045-005: Modal de confirmacao — comunicacao do redirect
Given o usuario clica "Comprar agora" no pacote "Navegador",
when o modal de confirmacao e exibido,
then o modal contem texto explicando o redirect para Stripe, icone de seguranca, metodos de pagamento aceitos (cartao e PIX) e botao "Ir para o pagamento seguro".

### AC-045-006: Modal — estado de loading apos clique em "Ir para pagamento"
Given o usuario clica "Ir para o pagamento seguro",
when a Checkout Session esta sendo criada no backend,
then o botao exibe estado de loading ("Preparando pagamento...") e fica desabilitado para prevenir cliques duplos.

### AC-045-007: Modal — tratamento de erro na criacao da sessao
Given a criacao da Checkout Session falhou (ex: erro de rede),
when o erro ocorre,
then o modal exibe mensagem de erro descritiva, o botao "Ir para o pagamento seguro" e reabilitado para nova tentativa e o usuario nao e redirecionado.

### AC-045-008: Pagina de sucesso — layout de confirmacao
Given o pagamento foi concluido com sucesso e o webhook processou o credito,
when o usuario acessa `/comprar-pa/sucesso`,
then a pagina exibe: icone de sucesso, titulo "Compra concluida com sucesso!", nome do pacote, PA recebido, preco pago, novo saldo e botao "Continuar planejando".

### AC-045-009: Pagina de sucesso — saldo atualizado em tempo real
Given o webhook ja processou o credito de PA antes do usuario chegar na pagina de sucesso,
when a pagina renderiza,
then o saldo exibido na pagina de sucesso e igual ao saldo no header (ja atualizado).

### AC-045-010: Pagina de sucesso — retorno contextual
Given o usuario comprou PA apos vir do modal de saldo insuficiente na Fase 6 de uma expedicao especifica,
when a pagina de sucesso e exibida,
then o botao principal exibe "Voltar para O Roteiro" (nome da Fase 6) em vez de "Continuar para expedicoes".

### AC-045-011: Contexto de retorno — banner na pagina de pacotes
Given o usuario chegou em `/comprar-pa` via modal de saldo insuficiente (Fase 6, deficit de 60 PA),
when a pagina de pacotes carrega,
then um banner exibe "Voce precisa de 60 PA para gerar O Roteiro" e o card "Explorador" (menor que cobre o deficit) esta com borda destacada e label "Recomendado para voce".

### AC-045-012: Contexto de retorno — validacao de URL de retorno
Given o parametro `returnTo` contem uma URL externa (ex: `https://malicious.com`),
when o servidor valida o parametro,
then o redirecionamento e bloqueado e o usuario e redirecionado para `/expeditions` como fallback seguro.

### AC-045-013: Ponto de acesso proativo — botao em "Meu Atlas"
Given o usuario acessa "Meu Atlas" > aba "Meu Saldo" com saldo positivo,
when a aba e renderizada,
then um botao "Comprar PA" e visivel proximo ao card de saldo, funcionando como link para `/atlas/comprar-pa`.

### AC-045-014: Cancelamento — banner sem dark patterns
Given o usuario cancelou o pagamento no Stripe e retornou a `/comprar-pa?status=cancelled`,
when a pagina renderiza,
then um banner exibe "Pagamento nao concluido. Sem cobrancas foram realizadas." sem qualquer mensagem de urgencia ou pressao social.

### AC-045-015: Cancelamento — retorno contextual disponivel
Given o usuario cancelou e havia chegado na pagina de pacotes vindo de uma fase especifica (parametro `returnTo` presente),
when a pagina de pacotes e exibida apos o cancelamento,
then um link "Voltar para a expedicao" e exibido ao lado do link "Ver como ganhar PA gratis".

---

## 5. Scope

### In Scope

- Redesenho dos cards de pacotes com ratio PA/Real, equivalencia em features de IA, tags "Mais popular" e "Melhor custo"
- Modal de confirmacao atualizado com comunicacao de redirect Stripe, icone de seguranca e metodos de pagamento
- Estado de loading e tratamento de erro no botao de confirmacao
- Pagina de sucesso `/comprar-pa/sucesso` com layout celebratorio, polling de saldo e link para recibo
- Contexto de retorno do modal de saldo insuficiente (parametros `returnTo` e `feature`, banner contextual, card recomendado, CTA de retorno na pagina de sucesso)
- Botao "Comprar PA" proativo em "Meu Atlas" > "Meu Saldo"
- Tratamento de cancelamento com banner informativo e links de retorno
- Indicador de metodos de pagamento aceitos na pagina (cartao e PIX)

### Out of Scope (Sprint 37)

- Redesenho completo da pagina "Meu Atlas" — apenas adicao do botao "Comprar PA" na aba "Meu Saldo"
- Animacoes elaboradas de celebracao apos compra (confetti, etc.) — avaliar se adiciona valor vs. distrai em Sprint 38
- Comparativo de pacotes interativo (slider de quantidade, calculadora de PA) — deferido Sprint 39
- Avaliacao de pacote pelo usuario (rating apos compra) — deferido Sprint 39
- Email customizado de confirmacao de compra — o Stripe cuida dos recibos; email personalizado Atlas deferido Sprint 38
- Fluxo de reembolso via UI do Atlas para o usuario final — deferido Sprint 38 (Sprint 37 usa reembolso manual via Stripe Dashboard)

---

## 6. Constraints (MANDATORY)

### Security

- O parametro `returnTo` deve ser validado no servidor — apenas URLs relativas dentro do dominio Atlas sao aceitas. URLs absolutas ou externas devem ser ignoradas com fallback para `/expeditions`.
- O estado de "pacote recomendado" (pre-selecao baseada no deficit) deve ser calculado no servidor com base no saldo do usuario autenticado — nunca aceitar o `paAmount` ou `packageId` como parametro de URL sem validacao.
- As paginas `/comprar-pa` e `/comprar-pa/sucesso` requerem autenticacao — usuarios nao autenticados devem ser redirecionados para login com retorno configurado.

### Ethics (Anti-Dark Patterns)

- Nenhum elemento de urgencia artificial: sem countdown timers, sem "Oferta valida por X horas", sem "Apenas Y pacotes disponiveis".
- Nenhuma pressao social artificial: sem "X usuarios compraram este pacote hoje".
- As tags "Mais popular" e "Melhor custo" devem refletir dados reais ou criterios objetivos declarados (ratio PA/R$) — nao podem ser labels de marketing sem fundamento.
- O botao "Cancelar" no modal de confirmacao deve ser igualmente acessivel que o botao primario — nao pode ser estilizado de forma a esconder ou dificultar o cancelamento (padrao de confirmshaming e vedado).

### Accessibility (WCAG 2.1 AA)

- Tags de destaque ("Mais popular", "Melhor custo") devem ter indicacao textual, nao apenas visual — usar `aria-label` ou texto oculto para leitores de tela.
- O modal de confirmacao deve ter focus trap: ao abrir, o foco vai para o primeiro elemento interativo do modal; ao fechar (qualquer metodo), o foco retorna para o botao que abriu o modal.
- O banner de cancelamento deve ser anunciado por `aria-live="polite"` para leitores de tela.
- A pagina de sucesso deve anunciar o status de conclusao via `aria-live="assertive"` ou `role="alert"` para garantir que leitores de tela capturem o evento de sucesso.
- A projecao de saldo dinamica (ao focar no card) deve ser anunciada por `aria-live="polite"`.
- Contraste minimo de 4.5:1 em todos os textos dos cards e banners.

### Performance

- A pagina de pacotes deve carregar em <= 1s (LCP) — conteudo majoritariamente estatico.
- A criacao da Checkout Session (acionada pelo clique de confirmacao) deve completar em <= 3s — feedback de loading obrigatorio enquanto espera.
- O polling de saldo na pagina de sucesso (a cada 2s) deve usar requisicoes leves (apenas o campo `availablePoints` do usuario, nao um endpoint de dados completos).

### i18n

- Precos exibidos conforme locale: `R$ 14,90` em pt-BR, `BRL 14.90` em en.
- Equivalencias de features de IA devem usar os nomes das features no locale correto (ex: "roteiros" em pt-BR, "itineraries" em en).
- O parametro `returnTo` armazenado na URL deve incluir o locale correto.

---

## 7. Success Metrics

| Metrica | Baseline (Sprint 36 — mock) | Target (Sprint 37 — 4 semanas) |
|---|---|---|
| Taxa de conversao da pagina de pacotes (clique em "Comprar") | Nao medido (mock sem dados reais) | >= 30% dos visitantes da pagina |
| Abandono no modal de confirmacao (clique "Cancelar" ou fecha o modal) | Nao medido | < 25% |
| Abandono no Stripe Checkout (usuario abre mas nao completa) | Nao medido | < 35% (benchmark industria: 30-40%) |
| Usuarios que retornam ao fluxo de IA apos compra bem-sucedida | Nao medido | >= 80% (via botao "Voltar para a fase") |
| Relatos de confusao sobre o redirect para o Stripe | N/A | 0 nos primeiros 30 dias |
| Tempo medio do fluxo completo (clique "Comprar" ate saldo atualizado no header) | N/A | < 3 minutos |

---

## 8. Dependencies

| Dependencia | Tipo | Notas |
|---|---|---|
| SPEC-PROD-041 (Sprint 36) | Predecessor | Pagina de pacotes base, modal de confirmacao base, historico de compras — este spec aprimora esses componentes |
| SPEC-PROD-043 (Sprint 37) | Mesmo sprint | Backend Stripe — a UX deste spec depende dos endpoints de criacao de sessao e da pagina de sucesso definidos em SPEC-PROD-043 |
| REQ-GAMI-001 (Sprint 35) | Feature existente | Saldo PA no header — deve atualizar em tempo real apos polling confirmar o credito |
| ATLAS-GAMIFICACAO-APROVADO.md (Sec 2.3 e 6) | Definicao de negocio | Precos dos pacotes, politica "sem dark patterns", fluxo de saldo insuficiente |
| UX Designer | Colaboracao | SPEC-UX correspondente deve definir os layouts detalhados dos cards aprimorados e da pagina de sucesso |

---

## 9. Change History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0.0 | 2026-03-23 | product-owner | Documento inicial — Sprint 37 planning. UX do fluxo de compra real com Stripe: cards aprimorados, modal com comunicacao de redirect, pagina de sucesso com polling, contexto de retorno, ponto de acesso proativo |
