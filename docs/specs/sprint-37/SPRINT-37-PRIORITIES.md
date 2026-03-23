# Sprint 37 — Prioridades e Decisoes de Escopo

**Versao**: 1.0.0
**Data**: 2026-03-23
**Autor**: product-owner
**Status do produto**: v0.31.0 (Sprint 36 completo — Gamification Wave 2) / v0.32.0 em planejamento
**Tema do sprint**: "Gamification Wave 3 — Monetizacao"

---

## Contexto: O Sprint que Ativa a Receita

O Sprint 36 entregou o fluxo de compra de PA completo com mock de pagamento: o usuario seleciona um pacote, confirma, e o PA e creditado instantaneamente sem cobranca real. O fluxo foi validado de ponta a ponta em staging. O dashboard administrativo foi construido com dados de PA e usuarios.

Sprint 37 e o sprint de monetizacao: o mock e substituido pelo **Stripe** (gateway real, suporte a cartao de credito e PIX no Brasil), o fluxo de compra recebe os ajustes de UX necessarios para a transicao entre dominios (stripe.com), e o dashboard administrativo e aprimorado com **metricas de rentabilidade por usuario** — essenciais para operar com um gateway real.

Este e o sprint mais critico do roadmap ate o momento por tres razoes:

1. **Receita real**: pela primeira vez, o produto gera dinheiro. A decisao de pricing, o modelo de custo de IA e a margem projetada passam do papel para o teste de mercado.
2. **Responsabilidade financeira**: transacoes reais exigem webhook confiavel, idempotencia, atomicidade e seguranca PCI-DSS. Erros aqui tem impacto financeiro direto.
3. **Confianca do usuario**: o redirect para stripe.com e um momento de atrito critico. Se o usuario nao entender o que esta acontecendo, abandona. A UX do fluxo de compra e tao importante quanto o backend.

**Budget**: 50 horas uteis (2 devs full-stack, sprint de 2 semanas, descontando code review, testes e integracao com pre-requisitos operacionais Stripe).

---

## Visao Geral das Specs do Sprint 37

| Spec ID | Titulo | Estimativa | Prioridade | Categoria |
|---------|--------|------------|------------|-----------|
| SPEC-PROD-043 | Integracao de Pagamento Stripe | ~20h | P0 | Monetizacao — backend critico |
| SPEC-PROD-045 | Fluxo de Compra de PA — UX para Gateway Real | ~12h | P0 | Monetizacao — frontend critico |
| SPEC-PROD-044 | Dashboard Administrativo Aprimorado | ~16h | P1 | Visibilidade financeira |
| **TOTAL** | | **~48h** | | |

**Folga**: ~2h (~4%) — margem intencional estreita porque os pre-requisitos operacionais Stripe (criacao de conta, chaves de API, registro de webhook) devem ser concluidos pela equipe ANTES do inicio do sprint. Qualquer atraso nesses pre-requisitos e o principal risco de bloqueio.

---

## Hierarquia de Prioridade

```
P0 — SPEC-PROD-043 (Stripe Payment Integration) + SPEC-PROD-045 (Purchase Flow UX)
      Estes dois specs formam uma unidade inseparavel: o backend de pagamento
      sem a UX de redirect nao e utilizavel; a UX sem o backend e uma pagina morta.
      Devem ser desenvolvidos em paralelo (Dev-1 backend, Dev-2 frontend)
      com integracao no final da semana 1.

      SPEC-PROD-043 e o backend critico:
      - Webhook com idempotencia e verificacao de assinatura (risco de seguranca)
      - Atomicidade credito PA + update Purchase (risco de inconsistencia de dados)
      - Modo de teste vs. producao (risco operacional)
      Estimativa conservadora: 20h (StripeProvider + webhook + pagina de sucesso
      + tratamento de erros + extensao do modelo + testes de integracao).

      SPEC-PROD-045 e o frontend critico:
      - Cards aprimorados com ratio e equivalencias
      - Modal de confirmacao com comunicacao de redirect
      - Pagina de sucesso com polling
      - Contexto de retorno (parametros, banner, CTA especifico)
      Estimativa: 12h (cards + modal + pagina de sucesso + contexto de retorno
      + ponto de acesso proativo + testes de componente).
      |
      v
P1 — SPEC-PROD-044 (Enhanced Admin Dashboard)
      Necessario para operar com gateway real:
      sem metricas de rentabilidade, o PO e o finops-engineer
      nao podem monitorar se o modelo economico esta funcionando.
      Nao bloqueia o lançamento do gateway, mas deve estar disponivel
      no dia seguinte ao lançamento (inicio da semana 2).
      Pode ser desenvolvido em paralelo por Dev-1 na semana 2,
      apos concluir SPEC-PROD-043.
      Estimativa: 16h (tabela financeira + KPIs aprimorados + 4 graficos
      + alertas de margem + exportacao CSV + filtro de periodo + testes).
```

---

## Detalhamento de Esforco por Spec

### SPEC-PROD-043 — Stripe Payment Integration (~20h)

| Componente | Estimativa | Responsavel |
|---|---|---|
| StripeProvider — implementacao da interface | 3h | Dev-1 |
| Criacao de Checkout Session (server action) | 3h | Dev-1 |
| Webhook `/api/webhooks/stripe` (verificacao + idempotencia + atomicidade) | 5h | Dev-1 |
| Pagina de sucesso (verificacao de sessao + polling) | 3h | Dev-1 |
| Tratamento de cancelamento e erros | 1h | Dev-1 |
| Extensao do modelo Purchase (campos Stripe) | 1h | Dev-1 |
| Testes de integracao (mock Stripe SDK em testes) | 4h | Dev-1 |
| **Total** | **20h** | |

### SPEC-PROD-045 — Purchase Flow UX (~12h)

| Componente | Estimativa | Responsavel |
|---|---|---|
| Cards aprimorados (ratio, equivalencias, tags) | 3h | Dev-2 |
| Modal de confirmacao atualizado (redirect Stripe, loading, erro) | 3h | Dev-2 |
| Pagina de sucesso (layout, polling de saldo, CTAs contextuais) | 3h | Dev-2 |
| Contexto de retorno (parametros URL, banner, validacao de redirect) | 2h | Dev-2 |
| Ponto de acesso proativo em "Meu Atlas" | 1h | Dev-2 |
| **Total** | **12h** | |

### SPEC-PROD-044 — Enhanced Admin Dashboard (~16h)

| Componente | Estimativa | Responsavel |
|---|---|---|
| Tabela de usuarios aprimorada (colunas financeiras, ordenacao, busca) | 5h | Dev-1 (semana 2) |
| Cards de KPIs financeiros (receita, custo, margem, ARPU, ARPPU) | 3h | Dev-1 |
| Alertas de margem (banners + filtro "alto risco") | 2h | Dev-1 |
| Quatro graficos (receita, chamadas IA, distribuicao rank, top destinos) | 4h | Dev-1 |
| Exportacao CSV (server action + download + rate limiting) | 2h | Dev-1 |
| **Total** | **16h** | |

---

## Paralelizacao Sugerida

### Semana 1 (Foco: Monetizacao)

**Dev-fullstack-1 — SPEC-PROD-043 (backend Stripe)**:
- Dia 1-2: StripeProvider + Checkout Session server action + extensao do modelo Purchase.
- Dia 3-4: Webhook (verificacao de assinatura + idempotencia + atomicidade) — o componente de maior risco tecnico.
- Dia 5: Pagina de sucesso (verificacao de sessao) + testes de integracao.

**Dev-fullstack-2 — SPEC-PROD-045 (frontend compra)**:
- Dia 1-2: Cards aprimorados (ratio, equivalencias, tags) + modal de confirmacao atualizado.
- Dia 3-4: Pagina de sucesso (layout + polling de saldo + CTAs contextuais).
- Dia 5: Contexto de retorno (parametros URL, banner, validacao) + ponto de acesso proativo.

**Integracao Dev-1 + Dev-2 (Dia 4-5)**:
Conectar o frontend (modal de confirmacao) com o backend (server action de criacao de sessao). Testar o fluxo completo em staging com Stripe em modo de teste.

### Semana 2 (Foco: Dashboard e Estabilizacao)

**Dev-fullstack-1 — SPEC-PROD-044 (admin dashboard)**:
- Dia 6-7: Tabela de usuarios aprimorada (colunas financeiras + ordenacao + busca) + KPIs financeiros.
- Dia 8: Alertas de margem + graficos (receita + chamadas IA).
- Dia 9: Graficos (distribuicao rank + top destinos) + exportacao CSV.
- Dia 10: Testes + ajustes.

**Dev-fullstack-2 — Estabilizacao e testes**:
- Dia 6-7: Testes de componente para SPEC-PROD-045 (cobertura >= 80%).
- Dia 8-9: Teste E2E do fluxo completo em staging (do modal de saldo insuficiente ao PA creditado no header).
- Dia 10: Ajustes finais, bug fixes, preparacao para QA sign-off.

---

## Avaliacao de Riscos

### Risco 1 — Delay em Pre-Requisitos Operacionais Stripe (ALTO)

**Descricao**: a criacao da conta Stripe com suporte a PIX, a habilitacao do pagamento BRL e a obtencao das chaves de API exigem verificacao de identidade empresarial que pode levar dias. Se esses pre-requisitos nao estiverem prontos no Dia 1 do sprint, o desenvolvimento do SPEC-PROD-043 fica bloqueado.

**Mitigacao**: os pre-requisitos operacionais listados em SPEC-PROD-043 (Secao 10) devem ser iniciados ANTES do inicio do sprint. O PO e responsavel por iniciar esse processo imediatamente apos a aprovacao deste documento.

**Contingencia**: se a conta Stripe nao estiver pronta no Dia 1, Dev-1 inicia com a implementacao do webhook (usando uma chave de teste local gerada pelo Stripe CLI) e o StripeProvider, enquanto aguarda as chaves de producao. O fluxo completo so sera testado em staging quando as chaves estiverem disponiveis.

### Risco 2 — Complexidade do Webhook (MEDIO)

**Descricao**: o webhook de SPEC-PROD-043 e o componente de maior risco tecnico — requer verificacao de assinatura, idempotencia, atomicidade de banco de dados e resposta em <= 5s. Erros aqui resultam em PA creditado duas vezes (double-credit) ou nao creditado (usuario pagou mas nao recebeu PA).

**Mitigacao**: dedicar 5h para o webhook (o maior bloco de tempo individual do sprint). Escrever testes de integracao cobrindo: webhook valido, webhook com assinatura invalida, webhook duplicado (idempotencia), e rollback de transacao.

**Contingencia**: se o webhook nao estiver pronto ate o final da semana 1, deferir o suporte a PIX (que tem comportamento de webhook diferente do cartao) e lançar apenas com cartao de credito. PIX e adicionado em Sprint 38.

### Risco 3 — Dados Financeiros Ausentes no Dashboard no Lancamento (BAIXO)

**Descricao**: SPEC-PROD-044 depende do modelo Purchase com campos Stripe (SPEC-PROD-043). Se SPEC-PROD-043 demorar mais que o esperado, o dashboard pode ser construido com dados mock antes de ter dados reais.

**Mitigacao**: SPEC-PROD-044 e desenvolvido na semana 2, quando SPEC-PROD-043 ja deve estar concluido. A dependencia e sequencial e ha margem de uma semana.

**Contingencia**: se os dados reais do Stripe nao estiverem disponiveis na semana 2, o dashboard pode ser construido contra o esquema final do modelo (usando dados de teste) e validado com dados reais apos o lançamento.

### Risco 4 — Taxa de Abandono Alta no Stripe Checkout (MEDIO)

**Descricao**: o redirect para stripe.com e um ponto de atrito nao controlado. Se a UX de preparacao (modal de confirmacao) nao comunicar adequadamente o que vai acontecer, a taxa de abandono pode superar 50%.

**Mitigacao**: SPEC-PROD-045 define explicitamente a comunicacao de redirect no modal. O QA deve testar o fluxo completo com usuarios reais (beta testers) antes do lançamento para capturar confusao.

**Contingencia**: se os testes com beta testers identificarem confusao no redirect, adicionar uma pagina intermediaria "Preparando seu pagamento..." de 2-3 segundos antes do redirect — isso da tempo para o usuario ler a mensagem e entender o que vai acontecer.

---

## Ordem de Sacrificio (se o budget de 50h estourar)

Na seguinte ordem, diferir para Sprint 38:

**1. SPEC-PROD-044 — Exportacao CSV (REQ-ADMIN-010)**
Os KPIs e alertas de margem sao suficientes para operacao. O CSV e util mas nao critico na primeira semana de gateway real. Economia: ~2h.

**2. SPEC-PROD-044 — Filtro de Periodo Customizado (REQ-ADMIN-011)**
Os periodos pre-definidos (hoje / 7 dias / 30 dias) cobrem 90% das necessidades operacionais. O periodo customizado e conveniente mas nao urgente. Economia: ~2h.

**3. SPEC-PROD-045 — Indicador de Metodos de Pagamento na Pagina (REQ-UX-007)**
Feature de baixo impacto (Could Have). Os metodos ja aparecem no modal de confirmacao. Economia: ~1h.

**4. SPEC-PROD-043 — Suporte a PIX (parcial em REQ-STRIPE-002)**
Lançar apenas com cartao de credito e retirar PIX do `payment_method_types` na Checkout Session. PIX e adicionado em Sprint 38. Economia: ~2h de teste (o codigo em si e minimal — um item na lista de metodos).

**Nao sacrificaveis sob nenhuma circunstancia**:

- SPEC-PROD-043: StripeProvider + Checkout Session + webhook (idempotencia + atomicidade + verificacao de assinatura) + pagina de sucesso + tratamento de cancelamento + extensao do modelo Purchase. Este e o core da monetizacao. Sem isso, o sprint nao atinge seu objetivo.
- SPEC-PROD-043: modo de teste (staging com `sk_test_*`) vs. producao (live keys). Lançar em producao com chaves de staging seria um erro operacional grave.
- SPEC-PROD-045: modal de confirmacao com comunicacao de redirect (REQ-UX-002). Sem isso, taxa de abandono no Stripe Checkout provavelmente ultrapassara 50%.
- SPEC-PROD-045: contexto de retorno do modal de saldo insuficiente (REQ-UX-004). E o ponto de maior intencao de compra — perder o contexto aqui equivale a perder a conversao.
- SPEC-PROD-044: KPIs financeiros + alertas de margem (REQ-ADMIN-006 a REQ-ADMIN-009). Operar um gateway de pagamento real sem visibilidade de rentabilidade e irresponsavel.

---

## Dependencias Pre-Sprint

Antes de iniciar Sprint 37, confirmar:

- [ ] Sprint 36 completo: Wave 2 entregue (badges, mock de pagamento funcional, dashboard esqueleto operacional)
- [ ] **Conta Stripe criada com suporte a BRL/Brasil** — BLOQUEADOR se ausente
- [ ] **PIX habilitado no painel Stripe** (requer verificacao empresarial) — se nao disponivel no Dia 1, lançar sem PIX (ver Ordem de Sacrificio item 4)
- [ ] **Chaves Stripe para staging** (`sk_test_*`, `pk_test_*`) disponiveis no Dia 1
- [ ] **Endpoint de webhook registrado no Stripe** para staging com `STRIPE_WEBHOOK_SECRET` gerado
- [ ] Feature flag `ENABLE_MOCK_PAYMENT` confirmada como `true` em staging e `false` em producao
- [ ] `Purchase` model com `stripeSessionId`, `stripePaymentIntentId`, `paymentMethod`, `receiptUrl`, `processedAt` — definidos pelo architect em SPEC-ARCH correspondente antes do Dia 3
- [ ] Valor de `custo_por_pa_usd` definido pelo finops-engineer em `docs/finops/COST-LOG.md` antes do inicio de SPEC-PROD-044
- [ ] Taxa de cambio USD/BRL configurada pelo finops-engineer para o dashboard
- [ ] Security-specialist revisou SPEC-PROD-043 (webhook, assinatura, atomicidade, PCI-DSS scope) antes do inicio de implementacao
- [ ] Architect cria SPEC-ARCH para extensao do modelo Purchase e implementacao do StripeProvider antes do Dia 3
- [ ] UX designer cria SPEC-UX para layout dos cards aprimorados e pagina de sucesso antes do Dia 3

---

## Specs Criadas neste Sprint Planning

| Spec ID | Titulo | Status | Arquivo |
|---------|--------|--------|---------|
| SPEC-PROD-043 | Integracao de Pagamento Stripe | Draft | `docs/specs/sprint-37/SPEC-PROD-043-stripe-payment-integration.md` |
| SPEC-PROD-044 | Dashboard Administrativo Aprimorado | Draft | `docs/specs/sprint-37/SPEC-PROD-044-enhanced-admin-dashboard.md` |
| SPEC-PROD-045 | Fluxo de Compra de PA — UX para Gateway Real | Draft | `docs/specs/sprint-37/SPEC-PROD-045-purchase-flow-ux.md` |

---

## Criterio de GO para Sprint 37 (Definition of Done)

| Criterio | Threshold |
|---|---|
| SPEC-PROD-043: fluxo de pagamento completo em staging (Stripe modo de teste) | Pagamento mock completo em staging para os 4 pacotes, PA creditado corretamente |
| SPEC-PROD-043: webhook — idempotencia | 0 creditos duplicados em 20 testes de reenvio simulado |
| SPEC-PROD-043: `totalPoints` inalterado apos compra | 0 violacoes em todos os testes |
| SPEC-PROD-043: webhook responde em <= 5s | p95 <= 5s em ambiente de staging |
| SPEC-PROD-043: verificacao de assinatura rejeita payloads invalidos | 100% dos payloads sem assinatura valida retornam 400 |
| SPEC-PROD-045: fluxo completo testado em staging | Do card de pacote ao saldo atualizado no header — testado manualmente por QA |
| SPEC-PROD-045: contexto de retorno funcional | Usuario retorna a fase correta apos compra em 100% dos cenarios testados |
| SPEC-PROD-044: metricas de rentabilidade corretas | Receita, custo e margem verificados contra queries manuais — 100% de precisao |
| SPEC-PROD-044: alertas de margem ativados nos thresholds corretos | Testado com dados sinteticos para os tres thresholds (>80%, 50-80%, <50%) |
| SPEC-PROD-044: nenhum dado financeiro sensivelmente identificavel exposto | 0 ocorrencias de email nao mascarado ou Stripe ID exposto no dashboard |
| Taxa de aprovacao geral de testes | >= 95% (continuidade dos Sprints 32-36) |
| Zero P0 bugs novos | 0 regressoes nos fluxos criticos existentes (especialmente fluxo PA e wizard phases) |
| Chaves Stripe de producao configuradas e testadas | Pelo menos um pagamento real de R$ 0,50 em producao antes do lançamento oficial |

---

## Conexao com o Roadmap

| Sprint | Tema | Produto |
|--------|------|---------|
| Sprint 35 (completo) | Gamification Wave 1 — PA Visivel | v0.30.0 |
| Sprint 36 (completo) | Gamification Wave 2 — Full Gamification | v0.31.0 |
| **Sprint 37 (este)** | **Gamification Wave 3 — Monetizacao** | **v0.32.0** |
| Sprint 38 | Admin Dashboard completo + controles de PA + alertas automaticos + reembolso automatizado | v0.33.0 |
| Sprint 39 | Tier Premium (Claude Sonnet) + funcionalidades exclusivas + upgrade flow | v0.34.0 |

Com o Sprint 37 entregue, o Atlas sera um produto comercialmente operacional:
- PA como moeda virtual com economia funcional (Waves 1-2)
- Gateway de pagamento real com suporte a cartao e PIX (Wave 3 — este sprint)
- Visibilidade financeira para o time operacional

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-23 | product-owner | Documento inicial — Sprint 37 planning com 3 specs (SPEC-PROD-043 a 045). Tema: Gamification Wave 3 Monetizacao |
