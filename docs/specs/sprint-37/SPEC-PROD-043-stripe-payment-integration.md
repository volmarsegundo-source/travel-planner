# SPEC-PROD-043: Integracao de Pagamento Stripe

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, architect, security-specialist, finops-engineer
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Sprint**: 37
**Documento de economia**: `docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md` — Secao 2.3
**Predecessor direto**: `docs/specs/sprint-36/SPEC-PROD-041-pa-packages.md` (mock de pagamento)

---

## 1. Problem Statement

O Sprint 36 entregou um fluxo de compra de PA completo, validado e testado com um mock de pagamento (`ENABLE_MOCK_PAYMENT=true`). O usuario consegue selecionar um pacote, confirmar a compra e ver o PA creditado imediatamente — mas nenhuma cobranca financeira real ocorre.

Para o Atlas gerar receita, o mock precisa ser substituido por um gateway de pagamento real. A escolha do gateway e **Stripe**, por tres razoes objetivas:

1. **Suporte nativo ao Brasil**: Stripe suporta PIX e cartao de credito para clientes brasileiros com processamento local (Stripe Brazil entity), eliminando problemas de conversao cambial para pagamentos domiciliados.
2. **Interface de desenvolvedor madura**: Stripe Checkout Session reduz o escopo de PCI-DSS do Atlas a SAQ A (o nivel mais baixo possivel), pois nenhum dado de cartao transita pelo servidor do Atlas.
3. **Webhooks confiables**: o modelo de webhook do Stripe com assinatura criptografica e idempotency keys e o padrao da industria para confirmar pagamentos de forma segura e sem race conditions.

Com SPEC-PROD-043 entregue, o Atlas passa de produto beta sem receita para produto comercialmente operacional no Brasil.

**Impacto financeiro**: cada pacote vendido gera entre R$14,90 e R$119,90 de receita. O modelo de custo de IA (PA) foi projetado para gerar margem positiva acima de 80% (ver SPEC-PROD-042 — margem operacional). O lançamento do gateway e o evento de monetizacao que valida todo o modelo economico desenhado desde o Sprint 9.

**Escopo de PCI-DSS**: ao usar Stripe Checkout Session (redirect para dominio stripe.com), o Atlas **nunca toca dados de cartao de credito**. O escopo de conformidade e SAQ A — apenas confirmar que o site usa HTTPS e redireciona para uma pagina de pagamento segura. Nenhuma certificacao PCI-DSS nivel 1 e necessaria.

---

## 2. User Story

### Historia Principal — Compra com Cartao de Credito

As a @leisure-solo traveler with insufficient PA balance,
I want to purchase a PA package using my credit card via a secure payment flow,
so that I can immediately continue using AI features after a successful payment.

### Historia Secundaria — Compra com PIX

As a @leisure-solo traveler,
I want to pay for a PA package using PIX,
so that I can complete the purchase without needing a credit card, using the payment method I prefer.

### Historia — Confirmacao e Credito

As a @leisure-solo traveler who completed a payment,
I want to see my PA balance updated immediately after payment confirmation,
so that I never feel uncertain about whether my purchase was processed.

### Historia — Transparencia de Falha

As a @leisure-solo traveler whose payment failed or was cancelled,
I want to receive a clear explanation and a retry option,
so that I understand what happened and can choose to try again.

### Traveler Context

- **Pain point**: O usuario quer gerar seu roteiro (80 PA), nao tem saldo suficiente, clica "Comprar PA" e chega em uma pagina que exibe "Modo de teste — nenhuma cobranca sera realizada". Ele precisa pagar de verdade para continuar.
- **Current workaround**: Sem workaround disponivel — o usuario acumula PA organicamente (lento) ou abandona a plataforma.
- **Frequency**: Todo usuario que esgotar seu saldo apos o bonus de boas-vindas. Estimativa: 30-40% dos usuarios ativos na segunda semana de uso, crescendo conforme a base de usuarios amadurece.

---

## 3. Fluxo de Pagamento (Modelo Conceitual)

O fluxo completo de compra com gateway real segue este modelo:

```
[Usuario clica "Comprar agora"]
        |
        v
[Atlas cria Checkout Session no Stripe]
        |
        v
[Usuario e redirecionado para stripe.com]
        |
   [Insere dados de cartao OU gera PIX]
        |
        v
[Stripe processa o pagamento]
        |
   +----+----+
   |         |
[Sucesso]  [Falha/Cancela]
   |         |
   |         v
   |    [Stripe redireciona para /comprar-pa?status=cancelled]
   |
   v
[Stripe redireciona para /comprar-pa/sucesso?session_id=XXX]
        |
        v
[Atlas verifica session_id com Stripe API]
        |
        v
[Stripe envia webhook POST /api/webhooks/stripe]
        |
        v
[Atlas verifica assinatura do webhook]
        |
        v
[Atlas credita PA ao usuario (idempotente)]
        |
        v
[Usuario ve PA atualizado no header]
```

**Decisao de design critica — dupla verificacao**: o credito de PA e acionado pelo **webhook**, nao pela URL de retorno de sucesso. A URL de retorno exibe confirmacao visual imediata (otimismo de UX), mas o credito definitivo ocorre somente apos a verificacao do webhook. Isso previne credito de PA sem pagamento real (fraude ou race condition de rede).

---

## 4. Requirements

### REQ-STRIPE-001 — Substituicao do MockPaymentProvider por StripeProvider

**MoSCoW**: Must Have
**Esforco**: M

O `PaymentProvider` interface (definido no Sprint 36) deve ter uma implementacao `StripeProvider` que substitui o `MockPaymentProvider` em producao.

**Comportamento por ambiente**:
- `production`: sempre usa `StripeProvider`. Qualquer tentativa de usar `MockPaymentProvider` em producao deve gerar erro de inicializacao e alerta de monitoramento.
- `staging`: usa `StripeProvider` apontando para o **modo de teste do Stripe** (chaves `sk_test_*`). Nenhuma cobranca real ocorre.
- `development`: pode usar `MockPaymentProvider` OU `StripeProvider` em modo de teste — controlado por `ENABLE_MOCK_PAYMENT`.

**Variaveis de ambiente obrigatorias**:
- `STRIPE_SECRET_KEY` — chave secreta da API Stripe (formato `sk_live_*` em prod, `sk_test_*` em staging).
- `STRIPE_PUBLISHABLE_KEY` — chave publica Stripe (usada no cliente para inicializar Stripe.js se necessario).
- `STRIPE_WEBHOOK_SECRET` — segredo de assinatura do webhook (formato `whsec_*`), gerado no painel Stripe ao registrar o endpoint.

**Ausencia de variaveis**: se `STRIPE_SECRET_KEY` nao estiver definida em producao, a aplicacao nao deve inicializar — deve falhar com erro explicito durante o boot, nao silenciosamente em runtime.

### REQ-STRIPE-002 — Criacao de Checkout Session

**MoSCoW**: Must Have
**Esforco**: S

Quando o usuario confirmar a compra de um pacote, o Atlas deve criar uma **Stripe Checkout Session** com os parametros corretos e redirecionar o usuario para a URL de checkout retornada pelo Stripe.

**Parametros obrigatorios da Checkout Session**:
- Produto: nome do pacote (ex: "Pacote Navegador — 1.200 PA"), quantidade 1, preco em centavos BRL.
- `success_url`: `/[locale]/atlas/comprar-pa/sucesso?session_id={CHECKOUT_SESSION_ID}` — Stripe substitui `{CHECKOUT_SESSION_ID}` automaticamente.
- `cancel_url`: `/[locale]/atlas/comprar-pa?status=cancelled` — usuario retorna a pagina de pacotes com mensagem de cancelamento.
- `metadata`: `{ userId, packageId, paAmount, locale }` — necessario para correlacionar o webhook ao usuario correto.
- `payment_method_types`: `["card", "pix"]` — habilitar PIX e cartao para o mercado brasileiro.
- `currency`: `"brl"`.
- `customer_email`: email do usuario autenticado (pre-preenche o formulario no Stripe).
- `expires_at`: 30 minutos a partir da criacao (evitar sessoes abertas indefinidamente).
- `idempotency_key`: `purchase_${userId}_${packageId}_${timestamp}` — evitar sessoes duplicadas em caso de double-click.

**Nota sobre `payment_method_types` e PIX**: PIX no Stripe requer que o valor minimo seja R$0,50 e o maximo seja R$500.000,00. Todos os pacotes Atlas estao dentro desse range. A janela de pagamento PIX expira em 10 minutos por padrao no Stripe — exibir essa informacao ao usuario quando PIX for selecionado.

### REQ-STRIPE-003 — Webhook `/api/webhooks/stripe`

**MoSCoW**: Must Have
**Esforco**: M

Implementar o endpoint `POST /api/webhooks/stripe` que recebe e processa eventos do Stripe.

**Eventos tratados**:

| Evento Stripe | Acao no Atlas |
|---|---|
| `checkout.session.completed` | Creditar PA ao usuario (se `payment_status = "paid"`) |
| `checkout.session.expired` | Registrar timeout no log; nenhuma acao de PA |
| `payment_intent.payment_failed` | Registrar falha no log; nenhuma acao de PA |

**Verificacao de assinatura obrigatoria**: o endpoint deve verificar a assinatura de cada webhook usando `STRIPE_WEBHOOK_SECRET` antes de processar qualquer evento. Webhooks sem assinatura valida ou com assinatura incorreta devem retornar `400 Bad Request` e ser logados como tentativa suspeita.

**Idempotencia obrigatoria**: o processamento de `checkout.session.completed` deve ser idempotente. Se o mesmo `session_id` for recebido duas vezes (Stripe reenvio por timeout), o credito de PA so deve ocorrer uma vez. Implementar verificacao: se `Purchase.stripeSessionId` ja existe no banco com `status = "completed"`, retornar `200 OK` sem creditar novamente.

**Atomicidade**: o credito de PA e o update de `Purchase.status` devem ocorrer em uma unica transacao de banco de dados. Se o credito de PA falhar, o status da compra deve permanecer `pending`. Se o status update falhar apos o credito, o PA deve ser estornado automaticamente (rollback transacional).

**Timeout do webhook**: o endpoint deve responder em menos de 5 segundos para evitar reenvio pelo Stripe. O processamento pesado (queries de banco) deve ser concluido dentro desse limite ou executado de forma assincrona com uma flag de processamento.

**Resposta esperada**: `200 OK` para eventos processados com sucesso (mesmo que sejam eventos que o Atlas nao precise tratar — nunca retornar `4xx` para eventos desconhecidos, pois o Stripe pode desativar o webhook apos muitos erros).

### REQ-STRIPE-004 — Pagina de Sucesso `/comprar-pa/sucesso`

**MoSCoW**: Must Have
**Esforco**: S

Criar a pagina de confirmacao de compra bem-sucedida, acessada apos o redirect do Stripe.

**Comportamento da pagina**:
1. Verificar `session_id` na query string com a API Stripe para confirmar que a sessao foi paga (verificacao client-side adicional, complementar ao webhook).
2. Exibir confirmacao visual: nome do pacote comprado, quantidade de PA, saldo atual (que pode ja ter sido atualizado pelo webhook se ele chegou antes do redirect).
3. Exibir botao "Continuar para minhas expedicoes" — redireciona para `/expeditions`.
4. Se `session_id` for invalido, ausente ou a sessao nao estiver `paid`: exibir mensagem de erro e link para `/comprar-pa`.
5. Se o webhook ainda nao processou (saldo nao atualizado): exibir mensagem "Seu saldo esta sendo atualizado... isso leva alguns segundos" com um indicador visual. Fazer polling do saldo do usuario a cada 2 segundos por no maximo 30 segundos.

**Importante**: a pagina de sucesso nao credita PA diretamente — apenas exibe confirmacao. O credito e responsabilidade exclusiva do webhook (REQ-STRIPE-003). Isso e correto por design (evitar double-credit).

### REQ-STRIPE-005 — Tratamento de Falha e Cancelamento

**MoSCoW**: Must Have
**Esforco**: S

Quando o usuario cancela o pagamento no Stripe ou o pagamento falha, o Stripe redireciona para `cancel_url` (`/comprar-pa?status=cancelled`).

**Comportamento ao retornar com `status=cancelled`**:
- Exibir banner informativo: "Pagamento nao concluido. Voce pode tentar novamente quando quiser."
- Os cards de pacote devem permanecer visiveis e funcionais — o usuario pode tentar comprar novamente imediatamente.
- O saldo PA do usuario nao e alterado.
- Nenhum registro de `Purchase` e criado para tentativas canceladas (a Checkout Session expirada no Stripe e suficiente como audit trail).

**Comportamento para falha de pagamento dentro do Stripe Checkout**:
- O Stripe exibe a mensagem de erro de pagamento diretamente na sua propria interface (ex: "Cartao recusado"). O Atlas nao precisa tratar esse caso separadamente — o usuario tenta novamente dentro do Stripe ou cancela.

**Timeout de sessao (30 minutos)**:
- Se o usuario abre o checkout mas nao completa em 30 minutos, a sessao expira.
- O Stripe dispara `checkout.session.expired` (tratado por REQ-STRIPE-003 — apenas log).
- Se o usuario retornar ao Atlas via `cancel_url` apos a expiracao, o mesmo comportamento de cancelamento e aplicado.

### REQ-STRIPE-006 — Atualizacao do Modelo de Dados de Compra

**MoSCoW**: Must Have
**Esforco**: S

O modelo `Purchase` (criado no Sprint 36) deve ser extendido para armazenar dados da transacao Stripe.

**Campos adicionais necessarios** (a serem adicionados pelo architect em SPEC-ARCH correspondente):

| Campo | Tipo | Descricao |
|---|---|---|
| `stripeSessionId` | String (unico) | ID da Checkout Session do Stripe — chave de idempotencia |
| `stripePaymentIntentId` | String (nullable) | ID do PaymentIntent — disponivel apos pagamento confirmado |
| `paymentMethod` | Enum (`card`, `pix`) | Metodo de pagamento utilizado |
| `stripeCustomerId` | String (nullable) | ID do Customer no Stripe — para compras futuras mais rapidas |
| `receiptUrl` | String (nullable) | URL do recibo gerado automaticamente pelo Stripe |
| `processedAt` | DateTime (nullable) | Timestamp de quando o webhook foi processado |

**Transicao de status**:
- `pending` → Checkout Session criada, aguardando pagamento.
- `completed` → Webhook `checkout.session.completed` recebido e PA creditado.
- `cancelled` → Sessao expirada ou usuario cancelou (sem cobranca).
- `failed` → Pagamento falhou dentro do Stripe (registro para auditoria, sem cobranca).
- `refunded` → Reembolso processado (mantido do Sprint 36).

### REQ-STRIPE-007 — Recibo de Pagamento

**MoSCoW**: Must Have
**Esforco**: XS

O Stripe gera automaticamente um recibo por email para o usuario apos cada pagamento bem-sucedido (feature nativa da plataforma).

**Comportamento esperado do Atlas**:
- Nao implementar sistema de envio de email customizado para recibos no Sprint 37 — o Stripe cuida disso.
- Armazenar a `receiptUrl` (URL do recibo web do Stripe) no modelo `Purchase` para exibir no historico de transacoes.
- No historico de compras em "Meu Atlas" > "Meu Saldo", exibir link "Ver recibo" para compras com `receiptUrl` preenchida.

**Configuracao no Stripe Dashboard**: habilitar "Customer emails — Successful payments" no painel Stripe. Este e um pre-requisito operacional, nao de codigo.

### REQ-STRIPE-008 — Reembolso Manual via Dashboard Stripe

**MoSCoW**: Should Have
**Esforco**: S

Implementar o fluxo de reembolso real (em substituicao ao reembolso mock do Sprint 36).

**Abordagem para o Sprint 37**: reembolso manual via painel administrativo do Stripe para as primeiras semanas de operacao. O time de operacoes processa reembolsos diretamente no Stripe Dashboard, e o Atlas e notificado via webhook.

**Evento Stripe para reembolso**: `charge.refunded`.

**Comportamento ao receber `charge.refunded`**:
1. Identificar o `Purchase` correspondente via `stripePaymentIntentId`.
2. Verificar se o usuario ainda tem saldo suficiente para a reversao (seguindo a politica dos 7 dias e PA nao gasto — mesmos criterios do mock Sprint 36).
3. Se elegivel: debitar PA de `availablePoints`, atualizar `Purchase.status` para `refunded`, registrar transacao de debito em `PointTransaction` com `type = "refund"`.
4. Se nao elegivel (PA ja gasto): manter o PA creditado, atualizar `Purchase.status` para `refunded_partial`, registrar log de auditoria. A equipe de operacoes decide o tratamento manual.

**Reembolso automatizado completo** (via dashboard Atlas, sem entrar no Stripe Dashboard) e deferido para Sprint 38+.

---

## 5. Acceptance Criteria

### AC-043-001: Variaveis de ambiente — boot fail sem STRIPE_SECRET_KEY em producao
Given a aplicacao esta configurada para o ambiente `production` e `STRIPE_SECRET_KEY` nao esta definida,
when a aplicacao tenta inicializar,
then a inicializacao falha com erro explicito indicando a variavel ausente e a aplicacao nao sobe.

### AC-043-002: Checkout Session — criacao com parametros corretos
Given o usuario autenticado clica "Confirmar compra" para o pacote "Navegador" (R$ 29,90),
when a Checkout Session e criada no Stripe,
then a session contem: `amount = 2990` (centavos), `currency = "brl"`, `payment_method_types = ["card", "pix"]`, `metadata.userId`, `metadata.packageId = "pkg_navegador"`, `metadata.paAmount = 1200`, `success_url` e `cancel_url` corretos.

### AC-043-003: Checkout Session — redirect para Stripe
Given a Checkout Session foi criada com sucesso,
when o usuario confirma a compra,
then o usuario e redirecionado para a URL de checkout Stripe (dominio `checkout.stripe.com`) dentro de 2 segundos.

### AC-043-004: Webhook — rejeicao de assinatura invalida
Given o endpoint `/api/webhooks/stripe` recebe um POST sem header `Stripe-Signature` ou com assinatura invalida,
when o webhook e processado,
then o endpoint retorna `400 Bad Request` e registra um log de tentativa suspeita.

### AC-043-005: Webhook — processamento de checkout.session.completed
Given o Stripe envia um webhook `checkout.session.completed` com `payment_status = "paid"` e `metadata.userId` e `metadata.packageId` validos,
when o webhook e processado,
then `availablePoints` do usuario e incrementado com o `paAmount` correspondente ao pacote, `totalPoints` permanece inalterado, `Purchase.status` e atualizado para `completed` e `Purchase.processedAt` e preenchido.

### AC-043-006: Webhook — idempotencia (reenvio pelo Stripe)
Given o Atlas ja processou um webhook `checkout.session.completed` para `stripeSessionId = "cs_abc123"`,
when o Stripe reenvia o mesmo webhook (mesmo `session_id`),
then o endpoint retorna `200 OK`, nenhum PA adicional e creditado e nenhum registro duplicado e criado.

### AC-043-007: Webhook — atomicidade (falha no update de status)
Given o credito de PA em `availablePoints` ocorreu mas o update de `Purchase.status` falhou devido a erro de banco,
when a transacao e revertida,
then `availablePoints` retorna ao valor anterior (rollback atomico) e o erro e registrado para reprocessamento.

### AC-043-008: totalPoints inalterado apos compra real
Given o usuario tem `totalPoints = 700` (rank Navegador) antes de comprar o pacote "Embaixador" (6.000 PA),
when o pagamento e confirmado e o webhook processado,
then `totalPoints` continua sendo 700 e o rank do usuario permanece "Navegador".

### AC-043-009: Pagina de sucesso — validacao da session
Given o usuario acessa `/comprar-pa/sucesso?session_id=cs_abc123` e a Checkout Session esta `paid`,
when a pagina renderiza,
then a pagina exibe o nome do pacote comprado, a quantidade de PA recebida e um botao "Continuar para minhas expedicoes".

### AC-043-010: Pagina de sucesso — polling de saldo
Given o usuario acessa a pagina de sucesso mas o webhook ainda nao foi processado (saldo nao atualizado),
when a pagina carrega,
then a pagina exibe "Seu saldo esta sendo atualizado..." e faz polling do saldo do usuario a cada 2 segundos por no maximo 30 segundos.

### AC-043-011: Pagina de sucesso — session_id invalido
Given o usuario acessa `/comprar-pa/sucesso` sem `session_id` ou com `session_id` inexistente,
when a pagina renderiza,
then a pagina exibe uma mensagem de erro e um link para retornar a `/comprar-pa`.

### AC-043-012: Cancelamento — retorno para pagina de pacotes
Given o usuario cancelou o pagamento no Stripe e foi redirecionado para `/comprar-pa?status=cancelled`,
when a pagina renderiza,
then um banner exibe "Pagamento nao concluido. Voce pode tentar novamente." e os cards de pacotes estao visiveis e funcionais.

### AC-043-013: Cancelamento — nenhum PA creditado
Given o usuario cancelou o pagamento no Stripe,
when o usuario retorna ao Atlas,
then o saldo PA do usuario e identico ao saldo antes de iniciar o fluxo de compra.

### AC-043-014: Recibo — link disponivel no historico
Given uma compra foi completada e a `receiptUrl` foi armazenada,
when o usuario acessa "Meu Atlas" > "Meu Saldo",
then a linha da compra exibe o link "Ver recibo" que abre a URL do recibo do Stripe em nova aba.

### AC-043-015: Staging — modo de teste ativo
Given a aplicacao esta em ambiente `staging` com chaves `sk_test_*`,
when o usuario completa uma compra em staging,
then nenhuma cobranca real e efetuada (transacao de teste no Stripe Dashboard), PA e creditado normalmente e o historico registra a transacao corretamente.

---

## 6. Scope

### In Scope

- Substituicao de `MockPaymentProvider` por `StripeProvider` usando a interface existente do Sprint 36
- Stripe Checkout Session com suporte a cartao de credito e PIX (mercado brasileiro)
- Webhook `POST /api/webhooks/stripe` com verificacao de assinatura e idempotencia
- Pagina de sucesso `/comprar-pa/sucesso` com polling de saldo
- Tratamento de cancelamento e retorno para pagina de pacotes
- Extensao do modelo `Purchase` com campos Stripe (`stripeSessionId`, `stripePaymentIntentId`, `paymentMethod`, `receiptUrl`, `processedAt`)
- Recibo via Stripe (configuracao no painel Stripe, link armazenado no Atlas)
- Reembolso manual via Stripe Dashboard + processamento via webhook `charge.refunded`
- Modo de teste (`sk_test_*`) para staging — sem cobrancas reais

### Out of Scope (Sprint 37)

- Reembolso automatizado iniciado pelo usuario via dashboard Atlas — deferido Sprint 38
- Parcelamento no cartao de credito — requer configuracao especifica no Stripe e revisao de preco dos pacotes
- Nota fiscal eletronica (NF-e) — requer integracao com SEFAZ ou intermediario fiscal
- Multiplos metodos de pagamento adicionais (boleto, carteiras digitais) — avaliar em Sprint 39+
- Gestao de assinatura recorrente (subscription) — modelo de negocio atual e compra avulsa
- Compra de PA como presente para outro usuario — fora do escopo MVP
- Stripe Customer Portal para o usuario gerenciar seus metodos de pagamento — deferido Sprint 39+
- Limite de compras anti-fraude (rate limiting por usuario) — deferido Sprint 38; implementar como operacao manual via Stripe Radar no Sprint 37

---

## 7. Constraints (MANDATORY)

### Security (CRITICO — PCI-DSS e Autenticacao)

- **Escopo PCI-DSS**: o Atlas opera em SAQ A ao usar Stripe Checkout Session (redirect). Nenhum dado de cartao de credito deve transitar pelo servidor Atlas, ser armazenado em banco de dados ou aparecer em logs.
- **HTTPS obrigatorio**: todas as URLs de `success_url` e `cancel_url` devem usar HTTPS em producao. O Stripe rejeita `success_url` com HTTP em modo live.
- **Webhook — autenticacao de assinatura**: a verificacao da assinatura Stripe (`Stripe-Signature` header + `STRIPE_WEBHOOK_SECRET`) e **obrigatoria** para cada requisicao ao endpoint de webhook. Sem essa verificacao, qualquer atacante pode creditar PA fraudulento enviando um payload forjado.
- **Valor de PA determinado pelo servidor**: o `paAmount` a ser creditado deve ser lido da tabela de pacotes no servidor (baseado no `packageId` da metadata do webhook), nunca do payload do webhook diretamente. Um atacante nao pode creditar mais PA do que o pacote define.
- **STRIPE_SECRET_KEY em variaveis de ambiente**: nunca hardcoded em codigo, nunca exposta em logs, nunca retornada em respostas de API.
- **Rate limiting no endpoint de checkout**: maximo 5 tentativas de criacao de Checkout Session por usuario por hora para prevenir abuso.
- **Validacao de sessao autenticada**: a criacao de Checkout Session deve ser uma server action autenticada — o `userId` e lido da sessao do servidor, nunca de parametro de request do cliente.

### Privacy (LGPD)

- Historico de compras com dados financeiros (valor em BRL, data, pacote) e dado pessoal — incluir no export LGPD (Art. 18) e anonimizar na exclusao de conta.
- O email do usuario enviado ao Stripe como `customer_email` e dado pessoal compartilhado com terceiro — deve estar documentado na politica de privacidade do Atlas (Stripe e processador de dados, nao controlador).
- Dados de cartao de credito: nao sao armazenados pelo Atlas (responsabilidade exclusiva do Stripe). Documentar isso na politica de privacidade como garantia ao usuario.
- `stripeCustomerId`, se armazenado para compras futuras, e dado pessoal financeiro — tratar com as mesmas regras de criptografia aplicadas a outros campos sensiveis (ex: `bookingCode`).

### Accessibility (WCAG 2.1 AA)

- O botao "Comprar agora" e o modal de confirmacao devem manter os requisitos de acessibilidade definidos em SPEC-PROD-045.
- A pagina de sucesso deve anunciar o status da compra para leitores de tela (ex: `role="status"` ou `aria-live="polite"` no indicador de polling).
- O banner de cancelamento deve ter contraste >= 4.5:1 e ser anunciado por `aria-live`.

### Performance

- A criacao da Checkout Session deve completar em <= 3s (inclui chamada API ao Stripe). Se a API Stripe nao responder em 5s, exibir erro ao usuario com opcao de retry.
- O endpoint de webhook deve responder em <= 5s para evitar reenvio automatico pelo Stripe (Stripe aguarda 5s antes de considerar timeout).
- A pagina de sucesso deve renderizar o conteudo basico (skeleton/loading) em <= 1s, independente do estado do webhook.

### Architectural Boundaries

- Este spec nao define a implementacao tecnica do `StripeProvider` — isso pertence ao SPEC-ARCH correspondente.
- Este spec nao define o schema Prisma exato — os campos adicionais em `Purchase` sao requisitos de produto; a implementacao pertence ao architect.
- O `PaymentProvider` interface do Sprint 36 deve ser respeitado. Se o Sprint 37 exigir mudancas na interface, o PO deve ser consultado antes de alterar a interface.

---

## 8. Success Metrics

| Metrica | Baseline (Sprint 36 — mock) | Target (Sprint 37 — 4 semanas) |
|---|---|---|
| Taxa de conversao de "clique em Comprar" para "pagamento concluido" | N/A (mock, 100% simulado) | >= 60% (industria: 65-75% para fluxos de checkout simples) |
| Taxa de abandono na pagina de pacotes (sem clicar em nenhum pacote) | Nao medido | < 40% |
| Tempo medio de processamento do webhook (criacao do evento ate PA creditado) | N/A | < 3s (p95) |
| Zero creditos duplicados de PA por reenvio de webhook | N/A | 0 ocorrencias em 30 dias |
| Receita mensal recorrente (MRR) — primeiros 30 dias | R$ 0 | >= R$ 500 (validacao de mercado) |
| Margem bruta por pacote vendido | Estimada em 80%+ (modelo) | Confirmada >= 80% (dado real) |

---

## 9. Dependencies

| Dependencia | Tipo | Notas |
|---|---|---|
| SPEC-PROD-041 (Sprint 36 — Mock Payment) | Predecessor | Interface `PaymentProvider`, modelo `Purchase`, fluxo de UX validado |
| SPEC-PROD-045 (Sprint 37 — Purchase Flow UX) | Mesmo sprint | A UX da pagina de pacotes e tratada em SPEC-PROD-045; esta spec define apenas o backend e o fluxo de pagamento |
| ATLAS-GAMIFICACAO-APROVADO.md (Secao 2.3) | Definicao de negocio | Tabela de pacotes, precos (fonte da verdade para valores de checkout) |
| Stripe (servico externo) | Gateway de pagamento | Conta Stripe com suporte ao Brasil deve ser criada antes do Sprint 37 |
| SPEC-ARCH-XXX (a ser criado) | Tecnico | Architect deve criar spec tecnica para implementacao do StripeProvider e extensao do modelo Purchase |
| SPEC-PROD-044 (Sprint 37 — Admin Dashboard) | Mesmo sprint | Dashboard precisa exibir dados de compras reais; coordenar campos de `Purchase` necessarios para metricas de receita |

---

## 10. Pre-Requisitos Operacionais (Nao de Codigo)

Os seguintes itens devem ser concluidos pela equipe de operacoes **antes** de iniciar a implementacao tecnica do Sprint 37:

- [ ] Criar conta Stripe com entidade brasileira (Stripe Brazil) ou habilitar pagamentos BRL na conta existente.
- [ ] Habilitar PIX como metodo de pagamento no painel Stripe (requer verificacao de identidade empresarial).
- [ ] Gerar chaves de API (`sk_live_*`, `pk_live_*`) para producao e (`sk_test_*`, `pk_test_*`) para staging.
- [ ] Registrar o endpoint de webhook `/api/webhooks/stripe` no painel Stripe para os ambientes de producao e staging, obtendo o `STRIPE_WEBHOOK_SECRET`.
- [ ] Configurar "Customer emails — Successful payments" no Stripe para envio automatico de recibos.
- [ ] Definir politica de reembolso no painel Stripe (7 dias, conforme ATLAS-GAMIFICACAO-APROVADO.md Secao 2.3).
- [ ] Testar um pagamento PIX de ponta a ponta em modo de teste no staging antes de ir a producao.

---

## 11. Nota sobre o Modelo Economico

Esta spec implementa o ponto de monetizacao central do Atlas. O modelo de custo de IA projetado indica margem >= 80% por PA vendido (ver SPEC-PROD-042 e `docs/finops/COST-LOG.md`). O finops-engineer deve acompanhar os primeiros 30 dias pos-lancamento com atualizacoes semanais no `COST-LOG.md` para confirmar que o modelo real corresponde ao projetado.

Se a margem real cair abaixo de 80% nas primeiras 4 semanas, o PO deve ser notificado para revisar os precos dos pacotes ou os custos de IA antes de Sprint 38.

---

## 12. Change History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0.0 | 2026-03-23 | product-owner | Documento inicial — Sprint 37 planning. Integracao Stripe real (cartao + PIX), webhook com idempotencia, pagina de sucesso, reembolso via webhook |
