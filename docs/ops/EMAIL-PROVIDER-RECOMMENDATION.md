# Recomendacao de Provider de Email Transacional

**Autor**: devops-engineer
**Data**: 2026-04-17
**Ref**: TODO T-003 em `src/server/services/auth.service.ts:145`
**Status**: Aguardando aprovacao do PO

---

## 1. Comparativo de Providers

| Criterio | Resend | Postmark | SendGrid (Twilio) | AWS SES |
|---|---|---|---|---|
| **Free tier** | 3.000/mes (100/dia) permanente | 100/mes permanente | Eliminado (trial 60 dias) | 3.000/mes por 12 meses |
| **Preco pago** | $20/mes (50k emails) | $15/mes (10k emails) | $19.95/mes (100k emails) | $0.10 por 1.000 emails |
| **SDK Node.js** | `resend` (nativo TS) | `postmark` | `@sendgrid/mail` | `@aws-sdk/client-ses` |
| **React Email** | Nativo (mesma empresa) | Compativel (manual) | Nao oficial | Nao oficial |
| **DKIM/SPF** | Sim (setup guiado) | Sim | Sim | Sim (manual) |
| **Webhooks bounce** | Sim (dashboard + API) | Sim (melhor da classe) | Sim | SNS (config extra) |
| **DX Next.js** | Excelente (template Vercel) | Boa | Media | Baixa |
| **Setup estimado** | 1-2h | 2-3h | 3-4h | 4-6h |
| **Deliverability** | Alta (IP compartilhado gerenciado) | Muito alta (foco transacional) | Media-alta | Alta (requer warmup) |

---

## 2. Recomendacao: Resend

**Resend e a escolha ideal para o Atlas.** O free tier de 3.000 emails/mes cobre com folga o volume pre-Beta (estimativa: 200 emails/mes), eliminando custo fixo ate escalar. A integracao nativa com React Email permite templates tipados em TSX com suporte a i18n (PT/EN) sem dependencias extras. A DX com Next.js 15 e Vercel e a melhor do mercado -- existe template oficial Vercel, SDK com types completos, e o envio funciona via Server Actions sem nenhum boilerplate.

---

## 3. Plano de Integracao

### 3.1 Env vars a adicionar

| Variavel | Descricao | Ambientes |
|---|---|---|
| `RESEND_API_KEY` | Chave da API Resend (`re_...`) | staging, prod |
| `EMAIL_FROM_ADDRESS` | Remetente verificado (ex: `suporte@atlas.travel`) | staging, prod |
| `EMAIL_CATCH_ALL` | Redirecionar todos emails para este endereco em dev | dev (opcional) |

### 3.2 Atualizacao em `src/lib/env.ts`

Adicionar no bloco `server`:

```typescript
RESEND_API_KEY: z.string().startsWith("re_").optional(),
EMAIL_FROM_ADDRESS: z.string().email().default("noreply@atlas.travel"),
```

Nota: `optional()` permite boot local sem a chave. O servico de email deve verificar a presenca da chave antes de enviar e fazer fallback para log quando ausente (comportamento atual).

### 3.3 Novo servico `src/server/services/email.service.ts`

Interface publica:

```typescript
// sendPasswordResetEmail(to: string, token: string, locale: string): Promise<void>
// sendEmailVerification(to: string, token: string, locale: string): Promise<void>
```

Regras:
- Importar `server-only` no topo (padrao do projeto)
- Se `RESEND_API_KEY` nao estiver definida, logar warning e retornar sem erro (graceful degradation)
- Nunca logar o token ou o email do usuario (PII) -- apenas `userIdHash` e `event: "email.sent"` ou `"email.skipped"`
- Retry: 1 tentativa com backoff de 1s (Resend tem retry interno; evitar duplicatas)

### 3.4 Modificacao em `auth.service.ts:145`

Substituir o `// TODO (T-003)` por:

```typescript
await EmailService.sendPasswordResetEmail(email, token, locale);
```

O parametro `locale` deve ser propagado desde a rota de request (header `Accept-Language` ou path prefix `/pt`, `/en`).

### 3.5 Templates de email

**Stack**: React Email (`@react-email/components`) -- componentes TSX tipados.

**Localizacao**: `src/emails/password-reset.tsx`

**Conteudo**:
- Logo Atlas (imagem hospedada ou inline SVG)
- Saudacao localizada (PT/EN baseado no `locale`)
- Link de reset: `{APP_URL}/{locale}/auth/reset-password?token={token}`
- Texto informando que o link expira em 1 hora
- Footer com texto legal e link de suporte

**i18n**: Usar objeto de traducoes inline no template (nao depender de `next-intl` server-side para emails). Manter simples com `locale === "pt" ? textoPT : textoEN`.

### 3.6 Ambientes

| Ambiente | Estrategia |
|---|---|
| **Dev local** | `RESEND_API_KEY` ausente -- email nao enviado, log no console. Alternativa: rodar MailHog (`docker compose` com servico extra) para capturar SMTP local |
| **Staging** | `RESEND_API_KEY` com dominio de teste (`onboarding@resend.dev` gratis) ou subdominio `staging.atlas.travel` |
| **Producao** | `RESEND_API_KEY` com dominio verificado `atlas.travel`, SPF/DKIM/DMARC configurados |

---

## 4. Setup de Dominio (DNS)

O PO ou responsavel pelo dominio `atlas.travel` deve criar os seguintes registros DNS:

| Tipo | Host | Valor | Finalidade |
|---|---|---|---|
| TXT | `atlas.travel` | `v=spf1 include:amazonses.com include:_spf.resend.com ~all` | SPF -- autoriza Resend a enviar em nome do dominio |
| CNAME | `resend._domainkey.atlas.travel` | (fornecido pelo Resend no dashboard) | DKIM -- assinatura criptografica dos emails |
| CNAME | `resend2._domainkey.atlas.travel` | (fornecido pelo Resend no dashboard) | DKIM -- chave secundaria (rotacao) |
| TXT | `_dmarc.atlas.travel` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@atlas.travel; pct=100` | DMARC -- politica de rejeicao + relatorios |
| MX | `atlas.travel` | `feedback-smtp.resend.com` (prioridade 10) | Bounce handling (se usar inbound) |

**Tempo de propagacao DNS**: 15 min a 48h (tipicamente < 2h para registros novos).

---

## 5. Monitoramento

### 5.1 Metricas no Sentry (ja integrado)

- Capturar excecoes do SDK Resend como breadcrumbs no Sentry
- Tag `email.type: "password_reset"` e `email.status: "sent" | "failed" | "skipped"`
- Alerta P1 se taxa de falha de envio > 5% em janela de 15 min

### 5.2 Webhooks Resend (fase 2, pos-Beta)

Configurar webhook no dashboard Resend apontando para `POST /api/webhooks/resend`:

| Evento | Acao |
|---|---|
| `email.bounced` | Log estruturado + incrementar metrica `email.bounce.count` |
| `email.complained` | Log + alerta P2 no Slack |
| `email.delivery_delayed` | Log apenas (informativo) |

Validar assinatura do webhook com `svix` (biblioteca usada pelo Resend).

### 5.3 Alertas

| Alerta | Severidade | Canal |
|---|---|---|
| Falha de envio > 5% (15 min) | P1 | Slack #incidents |
| Bounce rate > 2% (24h) | P2 | Slack #alerts |
| Resend API timeout > 10s | P2 | Slack #alerts |
| Free tier > 70% consumido (2.100 emails) | P2 | Slack #alerts |

---

## 6. Estimativas

| Item | Estimativa |
|---|---|
| **Esforco de implementacao** | **S (Small)** -- 4-6h para um dev fullstack (servico + template + env + testes) |
| **Propagacao DNS** | 15 min a 2h (caso tipico) |
| **Custo mensal (Beta, 100 usuarios)** | **$0** -- 200 emails/mes bem dentro do free tier de 3.000 |
| **Custo mensal (1.000 usuarios)** | **$0** -- ~2.000 emails/mes ainda no free tier |
| **Custo mensal (5.000+ usuarios)** | **$20/mes** -- upgrade para Resend Pro (50k emails) |

---

## 7. Pendencias para o PO Decidir

- [ ] **Dominio oficial**: confirmar se sera `atlas.travel` ou outro dominio. O remetente sugerido `suporte@atlas.travel` depende dessa decisao.
- [ ] **Quem configura DNS**: identificar responsavel com acesso ao registrar do dominio para criar os registros SPF/DKIM/DMARC.
- [ ] **Budget mensal aceitavel**: confirmar que $0 (free tier) e aceitavel para Beta, com upgrade para $20/mes se ultrapassar 3.000 emails/mes.
- [ ] **Remetente de email**: confirmar endereco (`suporte@atlas.travel`, `noreply@atlas.travel`, ou outro).
- [ ] **MailHog em dev**: decidir se adiciona MailHog ao `docker-compose.yml` para captura local de emails ou se o fallback para log e suficiente.

---

> Aguardando aprovacao do PO. Apos aprovacao, dev-fullstack-1 implementa com base neste plano.
