# SPEC-RELEASE-007: v0.32.0 Release Plan -- Sprint 37

**Version**: 1.0.0
**Status**: Draft
**Author**: release-manager
**Reviewers**: tech-lead, security-specialist, devops-engineer
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Sprint**: 37
**Baseline**: v0.31.0 (Sprint 36, 2408 unit tests, 122/130 E2E)
**Assessment ID**: CIA-007

---

## 1. Version

**v0.31.0 --> v0.32.0** (MINOR bump)

**Rationale SemVer**: Todas as mudancas sao aditivas ou substituicoes internas de implementacao. O `MockPaymentProvider` permanece funcional via variavel de ambiente `PAYMENT_PROVIDER=mock`. Nenhum Server Action existente muda de assinatura. Nenhum schema de banco e alterado. A nova dependencia `stripe` e aditiva. O Admin dashboard recebe melhorias incrementais (agregacao real, CSV, graficos, alertas) sem alterar a rota ou contrato existente.

- **MAJOR**: Nao aplicavel -- nenhum contrato existente e quebrado
- **MINOR**: Nova funcionalidade backward-compatible (Stripe provider, webhook endpoint, checkout API, admin enhancements)
- **PATCH**: Nao aplicavel -- nao e apenas bugfix

---

## 2. Change Impact Assessment (CIA-007)

**Verdict**: ✅ Non-Breaking

### 2.1 Resumo da Mudanca

O Sprint 37 substitui o `MockPaymentProvider` por um `StripePaymentProvider` real para processar pagamentos de pacotes PA via Stripe Checkout. A troca e controlada pela variavel de ambiente `PAYMENT_PROVIDER` (valores: `mock` | `stripe`), mantendo o mock como fallback para desenvolvimento e testes. Dois novos endpoints de API sao adicionados (`/api/webhooks/stripe` e `/api/checkout/create-session`). O admin dashboard e aprimorado com agregacao real de dados, exportacao CSV, graficos e alertas de margem.

### 2.2 API Contract Changes

| Tipo | Mudanca | Breaking? | Razao |
|---|---|---|---|
| Endpoint adicionado | `POST /api/webhooks/stripe` | ✅ Nao | Aditivo -- endpoint novo consumido exclusivamente pelo Stripe |
| Endpoint adicionado | `POST /api/checkout/create-session` | ✅ Nao | Aditivo -- endpoint novo para criar sessoes de checkout |
| Server Action alterada | Nenhuma | ✅ Nao | `createPurchaseAction` e `confirmPurchaseAction` mantem mesma assinatura |
| Provider substituido | `MockPaymentProvider` --> `StripePaymentProvider` (condicional) | ✅ Nao | Controlado por env var; mock permanece disponivel |
| Comportamento alterado | Purchase page redireciona para Stripe Checkout | ✅ Nao | UX muda mas nao quebra contratos de API |
| Endpoint existente | `GET /api/packages` | ✅ Nao | Sem alteracao de contrato |
| Endpoint existente | `GET /api/purchases` | ✅ Nao | Sem alteracao de contrato |

### 2.3 Database Schema Changes

| Mudanca | Breaking? | Migration? |
|---|---|---|
| Nenhuma alteracao de schema | ✅ Nao | Nao necessario |

O modelo `Purchase` (criado no Sprint 36) ja possui todos os campos necessarios para integracao Stripe: `paymentRef` (armazena `cs_xxxx` do Stripe), `status`, `amountCents`, `currency`. Nenhuma migration e necessaria.

### 2.4 Environment Variable Changes

| Variavel | Tipo | Obrigatoria? | Default | Descricao |
|---|---|---|---|---|
| `PAYMENT_PROVIDER` | Existente | Nao | `mock` | Agora aceita `stripe` alem de `mock` |
| `STRIPE_SECRET_KEY` | Nova | Condicional | -- | Obrigatoria quando `PAYMENT_PROVIDER=stripe` |
| `STRIPE_PUBLISHABLE_KEY` | Nova | Condicional | -- | Chave publica para Stripe.js client-side |
| `STRIPE_WEBHOOK_SECRET` | Nova | Condicional | -- | HMAC para verificacao de webhooks (`whsec_xxxx`) |
| `STRIPE_PIX_ENABLED` | Nova | Nao | `false` | Habilita PIX como metodo de pagamento no checkout |

**Nota**: Quando `PAYMENT_PROVIDER=mock` (default), nenhuma variavel Stripe e necessaria. A aplicacao continua funcionando identicamente ao Sprint 36.

### 2.5 Dependency Changes

| Dependencia | Tipo | Versao | Licenca | Risco |
|---|---|---|---|---|
| `stripe` | Nova (npm) | ^17.x | MIT | Baixo -- SDK oficial do Stripe, amplamente adotado |

---

## 3. Affected Consumers

| Consumidor | Tipo | Impacto | Acao Necessaria |
|---|---|---|---|
| `dev-fullstack-1` (payment service) | Interno | Implementa `StripePaymentProvider` + endpoints | Seguir interface `PaymentProvider` existente |
| `dev-fullstack-2` (admin dashboard) | Interno | Implementa agregacao real, CSV, graficos | Usar `admin-dashboard.service.ts` existente |
| `devops-engineer` (infra) | Interno | Configurar secrets do Stripe em environments | Adicionar 3-4 env vars no GitHub Actions/hosting |
| `security-specialist` | Interno | Auditar webhook handler e key management | Revisar HMAC verification e PCI scope |
| Usuarios finais (compradores de PA) | Externo | UX muda de mock instantaneo para Stripe Checkout redirect | Nenhuma -- melhoria transparente |
| Usuarios admin | Externo | Dashboard com dados reais e novas funcionalidades | Nenhuma -- melhoria aditiva |

---

## 4. Risk Matrix

| ID | Risco | Probabilidade | Impacto | Severidade | Mitigacao |
|---|---|---|---|---|---|
| RISK-S37-001 | Stripe webhook nao entregue ou duplicado | Media | Alto | MEDIO | Idempotencia via `paymentRef` unique constraint; retry logic no Stripe dashboard; dead letter alerting |
| RISK-S37-002 | PIX indisponivel no modo de teste do Stripe | Media | Baixo | MEDIO | Feature flag `STRIPE_PIX_ENABLED`; fallback para cartao de credito; documentar limitacoes de test mode |
| RISK-S37-003 | Performance de agregacao do admin dashboard com volume de dados | Baixa | Medio | BAIXO | Indices existentes em `Purchase` (userId, status, createdAt); Redis cache para KPIs; paginacao |
| RISK-S37-004 | Stripe SDK bundle size impacta client build | Baixa | Baixo | BAIXO | `stripe` SDK e server-only; client usa apenas redirect URL |
| RISK-S37-005 | Stripe secret key exposta em logs ou erro | Baixa | Critico | MEDIO | `server-only` import; env validation em `env.ts`; nunca logar request/response raw |
| RISK-S37-006 | Webhook endpoint acessivel sem verificacao HMAC | Baixa | Critico | MEDIO | `stripe.webhooks.constructEvent()` com `STRIPE_WEBHOOK_SECRET`; rejeitar 400 se assinatura invalida |
| RISK-S37-007 | Race condition entre webhook e polling de status | Baixa | Medio | BAIXO | Status update idempotente; `paymentRef` como chave de deduplicacao |
| RISK-S37-008 | Checkout session expira antes do usuario completar | Media | Baixo | BAIXO | TTL padrao de 30min no Stripe; UI mostra feedback claro; Purchase fica em `pending` |

**Risco Geral: MEDIO** -- principal preocupacao e a confiabilidade de webhooks e a disponibilidade de PIX em test mode.

---

## 5. Changelog (Keep a Changelog format)

```markdown
## [0.32.0] -- 2026-MM-DD

### Added
- Integracao real com Stripe para pagamentos de pacotes PA -- Stripe Checkout session com redirect e webhook de confirmacao
- `StripePaymentProvider` implementando a interface `PaymentProvider` existente -- substitui mock quando `PAYMENT_PROVIDER=stripe`
- Endpoint `POST /api/webhooks/stripe` para receber notificacoes de pagamento do Stripe com verificacao HMAC
- Endpoint `POST /api/checkout/create-session` para criar sessoes de Stripe Checkout com redirect
- Suporte a PIX como metodo de pagamento (condicional via `STRIPE_PIX_ENABLED`)
- Admin dashboard: agregacao real de dados de receita, usuarios e custos AI a partir do banco de dados
- Admin dashboard: exportacao de relatorios em formato CSV
- Admin dashboard: graficos de tendencia (receita diaria, usuarios ativos, margem)
- Admin dashboard: alertas visuais quando margem cai abaixo do threshold configurado
- Dependencia `stripe` SDK oficial (MIT license)

### Changed
- Pagina de compra de PA agora redireciona para Stripe Checkout em vez de confirmar instantaneamente (quando `PAYMENT_PROVIDER=stripe`)
- Factory `getPaymentProvider()` agora resolve provider com base em `PAYMENT_PROVIDER` env var (`mock` | `stripe`)
- Admin dashboard KPIs agora calculados a partir de dados reais (antes: dados mock/placeholder)

### Security
- Webhook Stripe protegido por verificacao de assinatura HMAC via `stripe.webhooks.constructEvent()`
- Chaves Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) validadas em `env.ts` apenas quando `PAYMENT_PROVIDER=stripe`
- `stripe` SDK importado exclusivamente em contexto `server-only` -- chave secreta nunca exposta ao client
```

---

## 6. Migration Notes (v0.31.0 --> v0.32.0)

### 6.1 Database

**Nenhuma migration necessaria.** O modelo `Purchase` criado no Sprint 36 ja contem todos os campos necessarios para a integracao Stripe. O campo `paymentRef` armazenara o ID da Checkout Session do Stripe (`cs_xxxx`).

### 6.2 Environment Variables

```bash
# Adicionar ao .env.local para habilitar Stripe:

# Trocar de mock para stripe (OBRIGATORIO para pagamentos reais)
PAYMENT_PROVIDER=stripe

# Chaves do Stripe (obter em https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx

# Webhook secret (obter ao registrar webhook em https://dashboard.stripe.com/webhooks)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Opcional: habilitar PIX (pode nao estar disponivel em test mode)
STRIPE_PIX_ENABLED=false
```

**Para manter comportamento do Sprint 36** (mock): nenhuma acao necessaria. O default de `PAYMENT_PROVIDER` permanece `mock`.

### 6.3 Stripe Dashboard Setup

Para ambientes de staging e producao:

1. Criar conta Stripe (ou usar conta de teste existente)
2. Obter `STRIPE_SECRET_KEY` e `STRIPE_PUBLISHABLE_KEY` em API Keys
3. Registrar webhook endpoint: `{{API_ENDPOINT}}/api/webhooks/stripe`
4. Selecionar eventos: `checkout.session.completed`, `checkout.session.expired`
5. Copiar `STRIPE_WEBHOOK_SECRET` (comeca com `whsec_`)
6. Configurar secrets no GitHub Actions / hosting provider

### 6.4 Stripe Webhook Registration

```
URL: https://{{DOMAIN}}/api/webhooks/stripe
Events:
  - checkout.session.completed
  - checkout.session.expired
Mode: Test (staging) / Live (production)
```

### 6.5 npm Dependencies

```bash
npm install stripe
```

---

## 7. Breaking Changes Assessment Detail

### 7.1 PaymentProvider Interface

A interface `PaymentProvider` definida em `src/server/services/payment/payment-provider.interface.ts` **nao muda**. O `StripePaymentProvider` implementa a mesma interface com os mesmos 3 metodos:

```typescript
// Interface existente -- SEM ALTERACAO
export interface PaymentProvider {
  createIntent(amountCents: number, currency: string, metadata?: Record<string, string>): Promise<PaymentIntent>;
  confirmIntent(intentId: string): Promise<PaymentConfirmation>;
  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
}
```

O `StripePaymentProvider` traduz internamente:
- `createIntent()` --> `stripe.checkout.sessions.create()`
- `confirmIntent()` --> busca status da session via `stripe.checkout.sessions.retrieve()`
- `verifyWebhookSignature()` --> `stripe.webhooks.constructEvent()`

### 7.2 Purchase Flow UX Change

| Aspecto | v0.31.0 (mock) | v0.32.0 (stripe) |
|---|---|---|
| Confirmacao | Instantanea (200ms delay simulado) | Redirect para Stripe Checkout --> callback |
| Feedback | Sucesso imediato na mesma pagina | Redirect de volta com status (success/cancel) |
| Metodos de pagamento | Nenhum (mock) | Cartao de credito, PIX (condicional) |
| Tempo total | ~1 segundo | 30s a 5min (depende do usuario) |

Esta mudanca de UX **nao e breaking** no sentido de API -- nenhum contrato muda. E uma melhoria funcional controlada por env var.

---

## 8. Rollback Plan

### 8.1 Rollback Imediato (< 5 minutos)

| Trigger | Acao |
|---|---|
| Stripe webhook endpoint com erro 500 | Alterar `PAYMENT_PROVIDER=mock` e redeployar |
| Cobranca duplicada detectada | Pausar webhooks no Stripe dashboard; investigar idempotencia |
| Admin dashboard com erro de agregacao | Reverter para tag `v0.31.0` |

### 8.2 Rollback de Versao

```bash
# 1. Reverter para v0.31.0
git checkout v0.31.0

# 2. Alterar env var
PAYMENT_PROVIDER=mock

# 3. Redeployar
# O modelo Purchase permanece no banco sem impacto (mock provider continua funcional)
# Compras ja confirmadas via Stripe permanecem com status=completed (dados validos)
# Compras pendentes ficam em status=pending (sem impacto -- mock nao as processa)
```

### 8.3 Dados em Caso de Rollback

- **Purchase records criados via Stripe**: permanecem no banco com `paymentRef` do Stripe. Dados validos.
- **PA creditado via Stripe**: permanece no `availablePoints` do usuario. Sem reversao automatica.
- **Webhooks pendentes**: Stripe continuara enviando retries por ate 3 dias. Com `PAYMENT_PROVIDER=mock`, o endpoint `/api/webhooks/stripe` pode retornar 404 (Stripe marcara como falha e parara apos retries).
- **Admin dashboard enhancements**: funcionalidades novas ficam indisponiveis, mas dados nao sao perdidos.

### 8.4 Rollback Parcial (feature flags)

A arquitetura permite rollback granular sem reverter toda a release:

| Feature | Flag | Rollback |
|---|---|---|
| Stripe payments | `PAYMENT_PROVIDER=mock` | Mock reativado, Stripe desabilitado |
| PIX | `STRIPE_PIX_ENABLED=false` | PIX desabilitado, cartao permanece |
| Admin CSV export | -- | Revert de componente especifico |
| Admin charts | -- | Revert de componente especifico |

---

## 9. Pre-Release Checklist

### 9.1 Specs e Qualidade

- [ ] Todas as specs do Sprint 37 em status "Implemented"
- [ ] Spec conformance audit by QA (QA-CONF-037)
- [ ] Security review completado (webhook HMAC, key management, PCI scope)
- [ ] Nenhum item P0/P1 de spec drift aberto
- [ ] Todos os commits referenciam spec IDs
- [ ] Entradas de changelog referenciam spec IDs

### 9.2 Testes

- [ ] Contagem de testes unitarios aumentou (baseline: 2408)
- [ ] Contagem de testes E2E aumentou (baseline: 122/130)
- [ ] Testes do `StripePaymentProvider` com mocks do Stripe SDK
- [ ] Testes do webhook handler (assinatura valida, invalida, evento duplicado)
- [ ] Testes do checkout session creation
- [ ] Testes de admin dashboard aggregation
- [ ] Testes de CSV export
- [ ] Build limpo (`npm run build` zero erros)
- [ ] Lint limpo (`npm run lint` zero erros)
- [ ] Eval gate passa (trust score >= 0.85)

### 9.3 Integracao Stripe

- [ ] Stripe SDK instalado e lockfile atualizado
- [ ] `STRIPE_SECRET_KEY` configurado em staging
- [ ] `STRIPE_PUBLISHABLE_KEY` configurado em staging
- [ ] `STRIPE_WEBHOOK_SECRET` configurado em staging
- [ ] Webhook registrado no Stripe dashboard (staging)
- [ ] Stripe CLI configurado para teste local (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- [ ] Pagamento de teste end-to-end com cartao `4242 4242 4242 4242`
- [ ] Teste de webhook delivery no Stripe dashboard

### 9.4 Seguranca

- [ ] `stripe` importado com `server-only` -- chave secreta nunca no client bundle
- [ ] `STRIPE_SECRET_KEY` nunca logado em nenhum cenario (incluindo erros)
- [ ] Webhook rejeita payload sem assinatura HMAC valida (HTTP 400)
- [ ] Env validation em `env.ts` atualizada (Stripe vars condicionais)
- [ ] Rate limit no endpoint de checkout (SEC-036-012 estendido)
- [ ] Nenhum secret commitado no repositorio

### 9.5 Infra e Deploy

- [ ] `.env.example` atualizado com novas variaveis Stripe
- [ ] GitHub Actions secrets configurados para staging
- [ ] GitHub Actions secrets configurados para producao (quando aplicavel)
- [ ] `CHANGELOG.md` atualizado
- [ ] `package.json` version bumped para `0.32.0`
- [ ] i18n: todas as novas chaves em `en.json` e `pt-BR.json`

---

## 10. Post-Release Verification

### 10.1 Smoke Tests (PAYMENT_PROVIDER=stripe)

1. Navegar para pagina de compra de PA --> verificar que os 4 pacotes renderizam
2. Selecionar pacote "Explorador" --> verificar redirect para Stripe Checkout
3. Completar pagamento com cartao de teste `4242 4242 4242 4242` --> verificar redirect de volta
4. Verificar que `Purchase` foi criado com `status=completed` e `paymentRef` preenchido
5. Verificar que `availablePoints` incrementou em 500 PA (Explorador)
6. Verificar que `totalPoints` NAO foi incrementado
7. Verificar historico de compras na pagina do usuario
8. Verificar webhook delivery no Stripe dashboard (evento `checkout.session.completed`)

### 10.2 Smoke Tests (PAYMENT_PROVIDER=mock -- regressao)

9. Alterar env para `mock` --> verificar que fluxo mock continua funcionando
10. Compra via mock --> sucesso instantaneo sem redirect

### 10.3 Smoke Tests (Admin Dashboard)

11. Login como admin --> navegar para `/admin/dashboard` --> verificar KPIs reais
12. Verificar grafico de receita diaria renderiza com dados
13. Clicar em exportar CSV --> verificar download com dados corretos
14. Verificar alertas de margem (se threshold configurado)
15. Login como usuario normal --> navegar para `/admin/dashboard` --> verificar redirect 403

### 10.4 Monitoramento Pos-Deploy

- [ ] Stripe webhook delivery rate > 99% nas primeiras 24h
- [ ] Nenhum erro 500 no endpoint `/api/webhooks/stripe`
- [ ] Nenhum erro 500 no endpoint `/api/checkout/create-session`
- [ ] Tempo de resposta do admin dashboard < 2s
- [ ] Nenhuma cobranca duplicada detectada

---

## 11. Open Risks from Prior Sprints

| ID | Sprint | Descricao | Status | Bloqueia v0.32.0? |
|---|---|---|---|---|
| RISK-005 | 2 | `deploy.yml` e placeholder | Aberto | Nao (sem deploy real em producao) |
| RISK-008 | 2 | Schema diagram desatualizado em architecture.md | Aberto | Nao |
| RISK-010 | 6 | API security headers perdidos | Aberto | Sim -- novos endpoints `/api/webhooks/stripe` e `/api/checkout/create-session` NAO terao headers de seguranca |
| RISK-015 | 7 | Footer links 404 | Aberto | Nao |
| SEC-S34-001 | 34 | OAuth redirect URI | Aberto | Nao |

### RISK-010 Agravamento

**ATENCAO**: O RISK-010 (headers de seguranca ausentes em rotas `/api/*`) e agravado neste sprint. Os dois novos endpoints (`/api/webhooks/stripe` e `/api/checkout/create-session`) NAO receberao headers de seguranca (CSP, X-Frame-Options, etc.) pelo mesmo motivo do RISK-010 original. Embora o webhook Stripe nao necessite de CSP (nao retorna HTML), o endpoint de checkout session sim deveria ter headers basicos.

**Recomendacao**: Priorizar resolucao do RISK-010 no Sprint 37 ou Sprint 38.

---

## 12. Decisoes de Escopo que Impactam Release

| Decisao | Impacto | Referencia |
|---|---|---|
| `MockPaymentProvider` mantido como fallback | Baixo risco de regressao -- testes existentes continuam validos | SPEC-ARCH-030 Section 2.4 |
| Purchase model reutilizado sem alteracao | Zero risk de migration -- campo `paymentRef` ja existe | SPEC-ARCH-030 Section 3 |
| Stripe PIX sob feature flag | PIX pode nao funcionar em test mode; flag permite desabilitar | RISK-S37-002 |
| Admin dashboard queries diretas (sem materialized views) | Performance aceitavel para volume atual; revisitar se dados crescerem | RISK-S37-003 |

---

## 13. PCI DSS Scope Note

A integracao via Stripe Checkout (redirect) minimiza o escopo PCI DSS:

- **Dados de cartao**: processados inteiramente pelo Stripe. Nenhum dado de cartao trafega pelo nosso servidor.
- **SAQ-A eligible**: como usamos Stripe Checkout (hosted payment page), o Travel Planner se qualifica para SAQ-A (o nivel mais simples de conformidade PCI).
- **Nao armazenar**: nenhum PAN, CVV, ou data de expiracao e armazenado no nosso banco. Apenas `paymentRef` (ID da session Stripe).

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-23 | Criacao inicial -- v0.32.0 release plan para Sprint 37 |
