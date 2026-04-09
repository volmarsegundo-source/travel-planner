# PLAN-FASE3-BETA-TOOLING — Instrumentacao para Beta Launch

**Sprint**: 41 — Fase 3
**Tipo**: SPEC-INFRA
**Versao**: 0.36.0 → 0.37.0
**Autor**: tech-lead + architect
**Data**: 2026-04-08
**Status**: AGUARDANDO APROVACAO DO PO

---

## 0. Resumo Executivo

Instrumentar o Atlas para capturar erros, comportamento e feedback dos beta testers.
Tres pilares: **Sentry** (erros), **Vercel Analytics** (comportamento), **Feedback Widget** (canal direto).
Tudo em free tier. Nenhum dado sensivel capturado. LGPD respeitada.

**Entregaveis**:
1. Sentry integrado (client + server, source maps, contexto de usuario)
2. Vercel Analytics + Web Vitals habilitados
3. Evento customizado de tracking por fase (analytics leve, sem cookies)
4. Feedback widget flutuante + tabela no banco + pagina admin
5. Admin links para Sentry dashboard e Vercel Analytics

---

## Dimensao 1 — Sentry (Error Tracking)

### 1.1 Pacote e Configuracao

```bash
npx @sentry/wizard@latest -i nextjs
```

Isso cria automaticamente:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.ts` wrapper com `withSentryConfig()`
- `.env.local` additions

### 1.2 Configuracao Manual

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,         // 10% de transacoes — free tier friendly
  replaysSessionSampleRate: 0,   // Desabilitado — privacidade
  replaysOnErrorSampleRate: 0,   // Desabilitado — privacidade

  beforeSend(event) {
    // Remover dados sensiveis
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      for (const key of ["password", "token", "secret", "apiKey", "api_key"]) {
        if (key in data) data[key] = "[REDACTED]";
      }
    }
    return event;
  },
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,

  beforeSend(event) {
    // Redact PII from server errors
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      event.user.id = event.user.id; // manter apenas ID
    }
    return event;
  },
});
```

### 1.3 Contexto de Usuario

Adicionar no layout autenticado (AppShellLayout):

```typescript
import * as Sentry from "@sentry/nextjs";

// Apos obter a sessao:
if (session?.user?.id) {
  Sentry.setUser({ id: session.user.id });
}
```

Adicionar nos error boundaries:

```typescript
// src/app/[locale]/(app)/error.tsx
"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  // ... render ErrorBoundaryCard
}
```

### 1.4 Contexto de Expedicao

Nas paginas de fase, adicionar breadcrumb:

```typescript
Sentry.addBreadcrumb({
  category: "expedition",
  message: `Phase ${phaseNumber}`,
  data: { tripId, phase: phaseNumber },
  level: "info",
});
```

### 1.5 CSP — Sentry Script

O middleware.ts atual usa nonce-based CSP. O `@sentry/nextjs` com `withSentryConfig()` injeta o script via Next.js (que respeita nonces). Nenhuma mudanca no CSP necessaria.

Para `connect-src`, o CSP atual ja permite `https:`, que cobre `*.sentry.io`.

### 1.6 Source Maps

```typescript
// next.config.ts (dentro de withSentryConfig options)
{
  org: "atlas-travel",
  project: "atlas-web",
  silent: true,         // Nao poluir logs de build
  hideSourceMaps: true, // Nao expor source maps publicamente
  widenClientFileUpload: true,
}
```

### 1.7 Free Tier Limites

| Recurso | Limite Free | Estrategia |
|---------|------------|-----------|
| Eventos/mes | 5.000 | `tracesSampleRate: 0.1`, `beforeSend` filtra noise |
| Retencao | 30 dias | Suficiente para beta |
| Membros | 1 | PO como owner |
| Alertas | Ilimitados | Configurar email alert para erros novos |

### 1.8 Env Vars Sentry

| Variavel | Scope | Descricao |
|----------|-------|-----------|
| `SENTRY_DSN` | Server | DSN para erros server-side |
| `NEXT_PUBLIC_SENTRY_DSN` | Client | DSN para erros client-side |
| `SENTRY_AUTH_TOKEN` | Build-time | Upload de source maps (CI/CD) |
| `SENTRY_ORG` | Build-time | Organizacao no Sentry |
| `SENTRY_PROJECT` | Build-time | Projeto no Sentry |

**Nota**: `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` ja estao definidos como opcionais em `src/lib/env.ts`. Nao precisa de mudanca no schema de validacao.

---

## Dimensao 2 — Analytics (Comportamento)

### 2.1 Vercel Analytics + Web Vitals

```bash
npm install @vercel/analytics @vercel/speed-insights
```

Adicionar no root layout:

```typescript
// src/app/[locale]/layout.tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Custo**: Gratuito no Vercel Hobby. Sem cookies. Privacy-friendly.

### 2.2 Eventos Customizados de Fase

Para medir a jornada do usuario pelas 6 fases, usar `track()` do Vercel Analytics:

```typescript
import { track } from "@vercel/analytics";

// Em cada pagina de fase (server action ou client event):
track("phase_entered", { phase: 3, tripId: "..." });
track("phase_completed", { phase: 3, tripId: "..." });
track("ai_generation_started", { phase: 6, tripId: "..." });
track("ai_generation_completed", { phase: 6, duration_ms: 12000 });
```

### 2.3 Metricas Essenciais para Beta

| Metrica | Evento | Como Medir |
|---------|--------|-----------|
| Fase de abandono | `phase_entered` sem `phase_completed` | Funil no Vercel Analytics |
| Tempo por fase | `phase_entered` + `phase_completed` timestamps | Delta calculado |
| Taxa de geracao AI | `ai_generation_started` / total users | Conversao |
| Fluxo completo | `phase_completed` onde `phase=6` / total users | % conclusao |
| Dispositivos | Automatico (Vercel Analytics) | Dashboard Vercel |

### 2.4 Limite Free Tier

| Recurso | Limite | Notas |
|---------|--------|-------|
| Eventos customizados | 2.500/mes (Hobby) | Suficiente para < 50 beta testers |
| Page views | Ilimitados | Automatico |
| Web Vitals | Ilimitados | Automatico |

### 2.5 Implementacao: Hook `usePhaseTracking`

```typescript
// src/hooks/usePhaseTracking.ts
"use client";
import { useEffect, useRef } from "react";
import { track } from "@vercel/analytics";

export function usePhaseTracking(phase: number, tripId: string) {
  const enteredRef = useRef(false);

  useEffect(() => {
    if (!enteredRef.current) {
      enteredRef.current = true;
      track("phase_entered", { phase, tripId });
    }
  }, [phase, tripId]);

  const markCompleted = () => {
    track("phase_completed", { phase, tripId });
  };

  return { markCompleted };
}
```

Usar em cada PhaseXWizard: `const { markCompleted } = usePhaseTracking(3, tripId);`

---

## Dimensao 3 — Feedback Widget

### 3.1 Modelo Prisma

```prisma
model BetaFeedback {
  id          String   @id @default(cuid())
  userId      String
  type        String   @db.VarChar(20)  // "bug" | "suggestion" | "praise"
  message     String   @db.Text
  page        String   @db.VarChar(200) // URL/pathname onde o feedback foi enviado
  userAgent   String?  @db.VarChar(500)
  screenshotUrl String? @db.VarChar(500) // futura: URL de upload
  status      String   @default("new") @db.VarChar(20) // "new" | "reviewed" | "resolved"
  adminNotes  String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status, createdAt])
  @@index([userId, createdAt])
  @@index([type, createdAt])
  @@map("beta_feedbacks")
}
```

**Relacao**: Adicionar `feedbacks BetaFeedback[]` ao model User.

### 3.2 Componente FeedbackWidget

```
src/components/features/feedback/
  FeedbackWidget.tsx       — Botao flutuante + modal (client component)
  FeedbackForm.tsx         — Formulario (tipo, mensagem)
```

**Comportamento**:
- Botao flutuante no canto inferior direito (z-50)
- Somente visivel para usuarios autenticados
- Modal com: select de tipo (bug/sugestao/elogio), textarea de mensagem (max 1000 chars)
- Captura automatica: pathname, userAgent
- Submit via server action
- Toast de confirmacao apos envio
- Lazy loaded (`dynamic(() => import(...), { ssr: false })`)

### 3.3 Server Action

```typescript
// src/server/actions/feedback.actions.ts
"use server";

export async function submitFeedbackAction(data: {
  type: "bug" | "suggestion" | "praise";
  message: string;
  page: string;
}) {
  // Auth check (getServerSession)
  // Zod validation
  // Rate limit: 5 feedbacks/hora/usuario
  // db.betaFeedback.create(...)
  // Opcional: webhook notification
}
```

### 3.4 Validacao Zod

```typescript
// src/lib/validations/feedback.schema.ts
export const feedbackSchema = z.object({
  type: z.enum(["bug", "suggestion", "praise"]),
  message: z.string().min(10).max(1000),
  page: z.string().max(200),
});
```

### 3.5 Screenshot

**Fase 1 (agora)**: Sem screenshot — apenas texto. Simplifica o MVP.
**Fase futura**: Adicionar `html2canvas` ou upload de imagem.

### 3.6 Notificacao

**Opcao simples**: Log no console do servidor + visivel no admin.
**Opcao futura**: Webhook para Slack/Discord ou email via Resend.

---

## Dimensao 4 — Admin Pages

### 4.1 Pagina /admin/feedback

```
src/app/[locale]/(app)/admin/feedback/
  page.tsx          — Server component, busca feedbacks
  FeedbackList.tsx  — Client component, tabela com filtros
```

**Funcionalidades**:
- Tabela paginada (25 por pagina)
- Filtros: tipo (bug/sugestao/elogio), status (novo/revisado/resolvido)
- Colunas: data, tipo, usuario, pagina, mensagem (truncada), status
- Acao: marcar como "revisado" ou "resolvido", adicionar nota do admin
- Badge com contagem de feedbacks "new" no admin nav

### 4.2 Pagina /admin/analytics

**Abordagem simples**: Pagina com link externo para Vercel Analytics dashboard + resumo de metricas internas.

```
src/app/[locale]/(app)/admin/analytics/
  page.tsx — Links para Vercel Analytics + metricas do AiInteractionLog
```

Conteudo:
- Link para Vercel Analytics (abre em nova aba)
- Resumo de AI usage (dados ja existentes no AdminDashboardService)
- Metricas de expedicao: total de trips, fase media alcancada, % que completaram fase 6

### 4.3 Pagina /admin/errors

**Abordagem simples**: Link externo para Sentry dashboard.

```
src/app/[locale]/(app)/admin/errors/
  page.tsx — Link para Sentry + contagem de erros recentes (se API Sentry disponivel)
```

### 4.4 Admin Nav Update

Adicionar 3 novos itens ao nav do admin:
- Feedback (com badge de count "new")
- Analytics
- Errors

---

## Dimensao 5 — LGPD e Privacidade

### 5.1 O que coletamos

| Dado | Ferramenta | Retencao | Base Legal |
|------|-----------|----------|-----------|
| Erros com stack trace | Sentry | 30 dias | Interesse legitimo (qualidade do servico) |
| userId em erros | Sentry | 30 dias | Interesse legitimo (depuracao) |
| Page views (anonimos) | Vercel Analytics | 30 dias | Interesse legitimo (melhoria do produto) |
| Web Vitals (anonimos) | Vercel Speed Insights | 30 dias | Interesse legitimo |
| Eventos de fase | Vercel Analytics | 30 dias | Interesse legitimo |
| Texto de feedback | Banco de dados | Ate exclusao | Consentimento (usuario envia voluntariamente) |

### 5.2 O que NAO coletamos

- Emails em logs de erro (redacted no beforeSend)
- IP addresses (Sentry: removido; Vercel Analytics: nao coleta)
- Cookies de terceiros (nenhum)
- Session replay (desabilitado no Sentry)
- Dados de formularios sensíveis (passwords, API keys redacted)

### 5.3 Consentimento

- Sentry e Vercel Analytics nao requerem banner de cookies (sem cookies de terceiros)
- Feedback widget e opt-in (usuario escolhe enviar)
- Incluir nota na pagina de Privacidade sobre coleta de erros anonimos

---

## Dimensao 6 — Performance

### 6.1 Bundle Impact

| Pacote | Tamanho (gzipped) | Carregamento |
|--------|-------------------|-------------|
| `@sentry/nextjs` | ~30 KB | Automatico (tree-shaken) |
| `@vercel/analytics` | ~1 KB | Lazy |
| `@vercel/speed-insights` | ~1.5 KB | Lazy |
| `FeedbackWidget` | ~5 KB | `dynamic()` lazy loaded |

**Impacto total**: ~37.5 KB gzipped. Aceitavel para beta.

### 6.2 Mitigacoes

- Sentry `tracesSampleRate: 0.1` — reduz overhead de 90%
- Vercel Analytics carrega apos interacao (nao bloqueia LCP)
- FeedbackWidget lazy loaded — nao impacta TTI
- Nenhum SDK faz polling — todos baseados em eventos

---

## Dimensao 7 — Seguranca

### 7.1 Sentry

- DSN e publico por design (client-side) — nao e secret
- `beforeSend` remove dados sensiveis antes do envio
- Source maps uploadados apenas no build (SENTRY_AUTH_TOKEN e secret de CI)
- `hideSourceMaps: true` — source maps nao sao servidos publicamente

### 7.2 Feedback

- Rate limit: 5 feedbacks/hora/usuario (previne spam)
- Validacao Zod no server (mensagem max 1000 chars)
- Sanitizacao de HTML no render (React faz por padrao)
- BOLA: usuario so ve proprios feedbacks; admin ve todos

### 7.3 Admin

- Rotas admin protegidas por middleware + layout guard (ja existente)
- Acoes de admin (marcar feedback) validam role=admin

---

## Dimensao 8 — Testes

### 8.1 Testes Unitarios

| Componente | Testes |
|-----------|--------|
| `feedbackSchema` | Validacao de tipos, limites de caracteres |
| `submitFeedbackAction` | Auth check, rate limit, criacao no DB |
| `FeedbackWidget` | Render, abrir/fechar modal, submit |
| `FeedbackList` | Render com dados, filtros, paginacao |
| `usePhaseTracking` | Chamada de track no mount |

### 8.2 Testes de Integracao

- FeedbackWidget end-to-end: abrir → preencher → submit → toast
- Admin feedback page: listar → filtrar → marcar como revisado

### 8.3 O que NAO testar

- Sentry SDK (testado pela equipe do Sentry)
- Vercel Analytics SDK (testado pela Vercel)
- Integracao real com APIs externas

---

## Dimensao 9 — Plano de Execucao

### 9.1 Tarefas Ordenadas

| # | Tarefa | Agente | Prioridade |
|---|--------|--------|-----------|
| 1 | Migration Prisma: BetaFeedback model | dev-fullstack | P0 |
| 2 | Zod schema + server action de feedback | dev-fullstack | P0 |
| 3 | FeedbackWidget + FeedbackForm (lazy loaded) | dev-fullstack | P0 |
| 4 | Admin /feedback page (lista + filtros + acoes) | dev-fullstack | P0 |
| 5 | Instalar e configurar @sentry/nextjs | dev-fullstack | P1 |
| 6 | Integrar Sentry nos error.tsx existentes | dev-fullstack | P1 |
| 7 | Contexto de usuario + expedicao no Sentry | dev-fullstack | P1 |
| 8 | Instalar @vercel/analytics + @vercel/speed-insights | dev-fullstack | P1 |
| 9 | Hook usePhaseTracking + integrar em wizards | dev-fullstack | P2 |
| 10 | Admin /analytics page (links + metricas) | dev-fullstack | P2 |
| 11 | Admin /errors page (link Sentry) | dev-fullstack | P2 |
| 12 | Admin nav update (3 novos itens + badge) | dev-fullstack | P2 |
| 13 | Testes unitarios e integracao | dev-fullstack | P1 |
| 14 | Documentar env vars Sentry no DEPLOY.md | devops | P1 |

### 9.2 Dependencias

```
1 (migration) → 2 (action) → 3 (widget) → 4 (admin)
5 (sentry install) → 6 (error.tsx) → 7 (contexto)
8 (analytics install) → 9 (hook) → 10 (admin analytics)
5 → 11 (admin errors)
4, 10, 11 → 12 (admin nav)
```

### 9.3 Agrupamento para Paralelismo

**Batch A** (independentes, fazer em paralelo):
- Tarefa 1 (migration)
- Tarefa 5 (sentry install)
- Tarefa 8 (analytics install)

**Batch B** (depende de A):
- Tarefa 2 + 3 (feedback action + widget)
- Tarefa 6 + 7 (sentry integration)
- Tarefa 9 (phase tracking hook)

**Batch C** (depende de B):
- Tarefa 4 (admin feedback)
- Tarefa 10 + 11 + 12 (admin pages + nav)

**Batch D** (final):
- Tarefa 13 (testes)
- Tarefa 14 (docs)

---

## Env Vars Novas (Resumo)

| Variavel | Ja existe em env.ts? | Scope | Obrigatoria |
|----------|---------------------|-------|-------------|
| `SENTRY_DSN` | Sim (optional) | Server | Nao (graceful skip) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sim (optional) | Client | Nao |
| `SENTRY_AUTH_TOKEN` | Sim (optional) | Build/CI | Nao (source maps opcionais) |
| `SENTRY_ORG` | Nao | Build/CI | Nao |
| `SENTRY_PROJECT` | Nao | Build/CI | Nao |

**Nenhuma env var nova obrigatoria.** Tudo funciona sem Sentry configurado (graceful degradation).

---

## Decisoes Pendentes do PO

1. **Sentry org/project name**: Sugestao `atlas-travel` / `atlas-web`
2. **Webhook de feedback**: Configurar agora ou deixar para depois?
3. **Screenshot no feedback**: Incluir na Fase 3 ou deixar para iteracao futura?
4. **Limite de eventos customizados**: 2.500/mes no Vercel Hobby — suficiente para beta?

---

## Aprovacao

- [ ] PO aprova escopo e decisoes
- [ ] Architect confirma integracao Sentry + CSP
- [ ] Security confirma redacao de dados sensiveis
- [ ] DevOps confirma env vars e source maps CI

---

*Gerado por: tech-lead + architect*
*Sprint 41 — Fase 3: Beta Tooling*
