# SPEC-SPRINT-45-FASE-1 — Fail-Closed Rate Limit Proposal

**Date:** 2026-04-20
**Owner:** qa-engineer (impersonated)
**Scope:** Propor endurecimento da política `fail-open` universal de `checkRateLimit` — adicionando opção `failClosed` para rotas sensíveis, mantendo `fail-open` default para rotas não-críticas.
**Related:** SPEC-AUTH-FORGOTPW-003, SPEC-SEC-RATE-LIMIT-FAIL-CLOSED-001 (proposed)

---

## Sumário executivo (5 linhas)

1. **Problema identificado em Staging (2026-04-20):** Redis indisponível + política fail-open universal = **todos** os rate limits do sistema silenciosamente desabilitados, incluindo password-reset, login, AI generation, admin export.
2. **Gravidade:** alta. Um operador malicioso que consiga derrubar Redis (DoS, saturação de conexão) desabilita simultaneamente toda a defesa de rate-limit.
3. **Proposta:** manter default `fail-open` (não quebrar UX em falha transitória) mas adicionar opção explícita `failClosed: true` que rotas sensíveis usam.
4. **Esforço:** 45 min de código + testes + migração de 6 sites sensíveis.
5. **Prioridade:** Wave 1 (segurança). Pode ser feito em paralelo com XFF fix.

---

## Call sites de `checkRateLimit` — classificação proposta

| # | Arquivo | Key prefix | Sensibilidade | Política proposta |
|---|---|---|---|---|
| 1 | `src/server/actions/auth.actions.ts:24` | `register:ip` | **Alta** (sign-up spam, enumeração) | **fail-closed** |
| 2 | `src/server/actions/auth.actions.ts:94` | `pwd-reset:ip` | **Alta** (mailbox bomb) | **fail-closed** |
| 3 | `src/server/actions/auth.actions.ts:111` | `pwd-reset:email` | **Alta** (mailbox bomb, anti-enum) | **fail-closed** |
| 4 | `src/app/api/auth/[...nextauth]/route.ts:25` | `login:ip` | **Alta** (credential stuffing) | **fail-closed** |
| 5 | `src/app/api/admin/export-csv/route.ts:19` | `admin-export-csv:*` | **Alta** (data exfil) | **fail-closed** |
| 6 | `src/server/actions/purchase.actions.ts:40` | `purchase:*` | **Alta** (payment flood) | **fail-closed** |
| 7 | `src/server/actions/ai.actions.ts:88` | `ai:plan:userId` | Média (custo Anthropic) | **fail-open** + monitor |
| 8 | `src/server/actions/ai.actions.ts:222` | `ai:checklist:userId` | Média (custo) | **fail-open** + monitor |
| 9 | `src/app/api/ai/plan/stream/route.ts:121` | `ai:plan:userId` | Média (custo) | **fail-open** + monitor |
| 10 | `src/app/api/ai/guide/stream/route.ts:165` | `ai:guide:userId` | Média (custo) | **fail-open** + monitor |
| 11 | `src/server/services/ai-governance/policies/rate-limit.policy.ts:27` | varia | Governance (alto custo se falhar) | **fail-closed** (governance precisa ser defensiva) |
| 12 | `src/server/actions/feedback.actions.ts:89` | `feedback:*` | Baixa (comentários) | fail-open |
| 13 | `src/server/actions/profile.actions.ts:341` | `complete-profile:userId` | Baixa (update de perfil) | fail-open |
| 14 | `src/app/api/v1/health/route.ts:16` | `health:ip` | Baixa (liveness) | fail-open |
| 15 | `src/app/api/destinations/search/route.ts:37` | `geocoding:*` | **Média** (custo upstream Nominatim) | **fail-closed** (promovido na Wave 2B) |

**Total fail-closed final (Wave 1 + Wave 2B): 8 sites.** Total fail-open mantido: 7 sites.

### Atualização Wave 2B (2026-04-20)

O site #15 (`destinations/search`) foi promovido de fail-open para **fail-closed** após o endosso de segurança do `architect` (arquivo `SECURITY-ENDORSEMENT-WAVE1-2026-04-20.md`, ponto 3): um flood de cache-miss sustentado contra esta rota autenticada pode exaurir a cota IP do provider Nominatim e causar ban upstream que afeta todos os usuários. Mantido o rate limit existente (10 req / 5 s por userId) — apenas adicionado `{ failClosed: true }`. Tests novos em `tests/unit/app/api/destinations/search-route.test.ts` (6 cases).

---

## Design proposto

### Ampliar `checkRateLimit` com flag opcional

```ts
// src/lib/rate-limit.ts
export type CheckRateLimitOptions = {
  /**
   * When true, Redis failures cause `allowed: false` (defensive).
   * When false or omitted, Redis failures cause `allowed: true` (permissive).
   * Use `failClosed: true` for security-sensitive routes (auth, payment, admin).
   */
  failClosed?: boolean;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options?: CheckRateLimitOptions,
): Promise<RateLimitResult> {
  const now = Date.now();
  try {
    const count = await redis.eval(RATE_LIMIT_SCRIPT, 1, key, windowSeconds) as number;
    const allowed = count <= limit;
    return { allowed, remaining: Math.max(0, limit - count), resetAt: now + windowSeconds * 1000 };
  } catch (err) {
    if (options?.failClosed) {
      logger.error("rate-limit.redis.unavailable.failClosed", err, { key });
      return { allowed: false, remaining: 0, resetAt: now + windowSeconds * 1000 };
    }
    logger.warn("rate-limit.redis.unavailable.failOpen", { key });
    return { allowed: true, remaining: limit, resetAt: now + windowSeconds * 1000 };
  }
}
```

### Migração dos 7 sites sensíveis

```ts
// auth.actions.ts (registerAction)
const rl = await checkRateLimit(`register:${ip}`, 20, 3600, { failClosed: true });

// auth.actions.ts (requestPasswordResetAction — IP e email)
const ipLimit = await checkRateLimit(`pwd-reset:ip:${ip}`, 5, 3600, { failClosed: true });
const emailLimit = await checkRateLimit(`pwd-reset:email:${emailKey}`, 3, 3600, { failClosed: true });

// [...nextauth]/route.ts (login)
const rl = await checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT, LOGIN_WINDOW_SECONDS, { failClosed: true });

// admin/export-csv/route.ts
const rl = await checkRateLimit(key, 5, 3600, { failClosed: true });

// purchase.actions.ts
const rateLimit = await checkRateLimit(key, 10, 3600, { failClosed: true });
```

### Mensagens de erro

Quando `failClosed: true` dispara, retornar erro i18n diferenciado:
- Login/register: `errors.serviceUnavailable` — "Nosso sistema está temporariamente indisponível. Tente novamente em alguns minutos."
- Password reset: idem anti-enum (retorna `success: true` para não vazar estado)

---

## Trade-off e mitigação

**Risco:** em falha de Redis prolongada, login/registro/pwd-reset ficam 100% bloqueados para usuários legítimos.

**Mitigações:**
1. **Alerta agressivo** — devops-engineer deve ser acordado imediatamente por Redis degradado (Sentry alert + PagerDuty).
2. **Circuit breaker** (futuro) — após N falhas Redis seguidas, abrir circuito por 30s em vez de cada request tentar.
3. **Documentação operacional** — playbook "Redis down → rate limit engineering response" em `docs/runbooks/`.

**Observação:** a probabilidade de Redis prolongado ser mais crítica para o negócio do que o risco de um atacante derrubar Redis propositalmente para bypassar rate-limits **deve ser avaliada pelo security-specialist**. Esta proposta assume que rotas sensíveis merecem fail-closed; o security-specialist pode discordar ou ampliar a lista.

---

## Estimativa de esforço

| Tarefa | Esforço |
|---|---|
| Ampliar `checkRateLimit` com `failClosed` option | 15 min |
| Atualizar unit tests em `rate-limit.test.ts` (fail-closed branch) | 15 min |
| Migrar 7 sites sensíveis | 15 min |
| **Total** | **45 min** |

---

## Aprovações necessárias

- [ ] **security-specialist** — endosso da classificação sensível vs não-sensível.
- [ ] **tech-lead** — revisão da abordagem (opção vs nova função).
- [ ] **PO** — aprovação para entrar no escopo da Fase 2 (execução).

**Sem aprovações, este documento permanece como proposta técnica.**
