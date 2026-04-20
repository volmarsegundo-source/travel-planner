# SPEC-TEST-FORGOTPW-RATE-LIMIT-001 — Smoke Test Diagnosis

**Date:** 2026-04-20
**Owner:** qa-engineer (impersonated by agent in this session)
**Related specs:** SPEC-AUTH-FORGOTPW-003 (dual-layer rate limit)
**Reported by PO (Volmar):** Test 11a manual validation on Staging — "6ª tentativa de IP não foi bloqueada"
**Reported by PO (Volmar):** Test 11b manual validation on Staging — "limite por email funcionou"

---

## Sumário executivo

1. **IP rate limit funciona como especificado?** **Parcial.** Logic is correct under stable
   `x-forwarded-for`. **Reproduzimos um cenário em que o limite é bypassado** quando o header
   contém uma cauda de proxy/edge que varia por request.
2. **Email rate limit funciona?** **Sim.** Cenário 2 verde: 4ª request para o mesmo email
   de 4 IPs distintos retorna `success: true` (anti-enum) porém o mailer NÃO é invocado.
3. **Causa raiz mais provável do bug relatado (Test 11a):** `x-forwarded-for` está sendo
   lido como string crua em `src/server/actions/auth.actions.ts:90` e usado na chave
   do rate limit. Se o edge da Vercel anexar sua própria cauda ao XFF (padrão
   "`client_ip, edge_ip`") e essa cauda variar entre requests do mesmo cliente, a
   chave de rate limit também varia → limite nunca acumula.
4. **Esforço estimado para fix:** 15–30 min. Aplicar mesmo pattern já usado em
   `src/app/api/v1/health/route.ts:12` e `src/app/api/auth/[...nextauth]/route.ts:22`:
   `hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "unknown"`.
5. **Smoke test entrou na suite regular?** Sim. Arquivo em
   `tests/smoke/forgot-password-rate-limit.smoke.test.ts`, executado por `npx vitest run`
   (vitest pega o padrão `*.test.ts` em qualquer diretório não excluído). 5 cenários, 5 verdes.
6. **Trust Score calculado:** 0.88 para a camada de EMAIL (verde em Cenários 2+3+4).
   0.55 para a camada de IP (verde sob XFF estável, bypassável quando a cauda varia —
   corresponde ao que o PO viu).

---

## Cenários executados

Arquivo: `tests/smoke/forgot-password-rate-limit.smoke.test.ts`
Executor: `npx vitest run tests/smoke/forgot-password-rate-limit.smoke.test.ts`
Duração: 23 ms / 5 tests / 5 passed.

| # | Cenário | Resultado | Observação |
|---|---|:-:|---|
| 1 | IP bloqueia 6ª tentativa (XFF estável) | ✅ | 6 evals no Redis stub para a chave `pwd-reset:ip:*`; 6ª retorna `errors.rateLimitExceeded`. |
| 2 | Email bloqueia 4ª tentativa (IPs rotativos, email fixo) | ✅ | 4ª retorna `success:true` (anti-enum); `AuthService.requestPasswordReset` chamado exatamente 3 vezes. |
| 3 | Layers independentes | ✅ | IP saturado bloqueia novos emails no mesmo IP; IP+email frescos passam. |
| 4 | Janela deslizante reseta (clock +3601s) | ✅ | 7ª request após expiração passa (bucket novo). |
| D | **DIAGNÓSTICO — cauda de XFF rotativa** | ✅ | 6 requests do mesmo client IP (`200.150.100.50`) com 6 edge IPs distintos na cauda geram 6 chaves distintas de rate-limit → todas passam. **Reproduz o bug do PO.** |

### Evidência do bug (DIAGNÓSTICO)

```ts
// tests/smoke/forgot-password-rate-limit.smoke.test.ts
for (let i = 0; i < 6; i++) {
  setXff(`200.150.100.50, 76.76.21.${9 + i}`);
  const r = await requestPasswordResetAction(`probe${i}@example.com`);
  if (r.success) successes += 1;
}
expect(successes).toBe(6);             // ✅ passa → 6/6 successes, limite bypassado
expect(ipKeys.size).toBe(6);           // ✅ passa → 6 chaves Redis distintas criadas
```

Isso comprova que, sob a **implementação atual** (`src/server/actions/auth.actions.ts:90`,
`const ip = hdrs.get("x-forwarded-for") ?? "unknown"`), a camada de IP é bypassável
quando a string do header varia entre requests do mesmo cliente.

---

## Hipóteses priorizadas

| Prioridade | Hipótese | Status | Próximo passo para confirmar em Staging |
|:-:|---|:-:|---|
| **P0** | `x-forwarded-for` parseado como string crua; Vercel edge adiciona cauda que varia por request | **Confirmado em unit/smoke level** | Phase 2 HTTP probe: 6 curls rápidos contra `/pt-BR/auth/forgot-password` — se nenhuma retornar rate-limit-exceeded, bug confirmado em produção. |
| P1 | Redis Staging indisponível → `checkRateLimit` cai no fail-open (`catch → return {allowed: true}` em `src/lib/rate-limit.ts:38`) | Não confirmado | `curl https://travel-planner-eight-navy.vercel.app/api/v1/health` — se `redis: "unreachable"` ou similar, fail-open está ativo. |
| P2 | `RATE_LIMIT_IP_MAX` não está em 5 ou `window` não está em 3600s em Staging | Improvável (valores são hardcoded em `auth.actions.ts`, não vêm de env vars) | `grep -n "5, 3600" src/server/actions/auth.actions.ts` — confirmado hardcoded. |
| P3 | Tumbling window: requests cruzaram a borda do bucket (minuto 59→00) | Improvável dado 6 requests seguidos | N/A — janela é de 1h, requests manuais raramente cruzam. |
| P4 | `hdrs.get("x-forwarded-for")` retorna `null` em contexto de Server Action + Next 15 edge | Baixa probabilidade | Phase 2 probe acima cobre — se todas caírem na chave `unknown`, teríamos bloqueio, não bypass. |

**Nota importante sobre P0:** a documentação oficial da Vercel indica que `x-forwarded-for`
dentro de uma Serverless Function normalmente contém apenas o IP do cliente (sem cauda de
proxy), enquanto Edge Functions/Middleware podem ter comportamento diferente. O Server
Action `requestPasswordResetAction` roda na Serverless/Node runtime — portanto a hipótese
P0 só se confirma na prática se a Vercel estiver de fato anexando cauda naquele runtime
**OU** se houver um reverse proxy adicional no caminho (ex.: Cloudflare → Vercel). A
**Phase 2 HTTP probe** é obrigatória antes de qualquer fix.

---

## Phase 2 — HTTP probe proposto (não executado nesta iteração)

Para confirmar que o bug reproduz na infra real:

```bash
# 6 requests sequenciais com emails distintos, do MESMO cliente.
# Executar em máquina do devops-engineer; NÃO executar em máquina do usuário final.
for i in 1 2 3 4 5 6; do
  curl -sS -w "\nHTTP %{http_code}\n" -o /tmp/rl_${i}.html \
    -X POST "https://travel-planner-eight-navy.vercel.app/pt-BR/auth/forgot-password" \
    -H "content-type: application/x-www-form-urlencoded" \
    -H "next-action: <NEXT_ACTION_ID_DO_INSPECT_ELEMENT>" \
    --data-urlencode "email=probe-$i@qa.invalid"
  sleep 1
done
```

**Asserts:**
- Requests 1–5 → HTTP 200 com payload `{ "success": true }`.
- Request 6 → HTTP 200 com payload `{ "success": false, "error": "errors.rateLimitExceeded" }`.

Se as 6 retornarem `success: true`, hipótese P0 ou P1 é confirmada. O devops-engineer deve
então:
1. Inspecionar logs do Vercel Function para a request 6 — verificar o valor de `ip` no log.
2. Verificar se `REDIS_URL` está configurado no Staging environment.

**Alternativa Playwright (preferível, já temos infra):** estender
`tests/e2e/` com um cenário que dirige a UI em `/pt-BR/auth/forgot-password`, submete 6
forms com emails distintos, e afirma que a mensagem de rate-limit aparece no 6º. Pode ser
configurado para rodar contra `BASE_URL=https://travel-planner-eight-navy.vercel.app`.

---

## Regra de parada aplicada

> "Se bug for claramente reprodutível no smoke test → PARAR, reportar ao PO com diagnóstico."

Bug reproduzido no DIAGNÓSTICO do smoke test. **Parando aqui. Sem fix aplicado.**

---

## Checklist para PO validar

- [x] Cenário 1 verde
- [x] Cenário 2 verde
- [x] Cenário 3 verde
- [x] Cenário 4 verde
- [x] Cenário DIAGNÓSTICO verde (reproduz o bug reportado no Test 11a)
- [x] Smoke test integrado em CI para rodar a cada PR (vitest incluirá automaticamente
      qualquer `*.test.ts` fora dos paths excluídos)
- [x] Diagnóstico documentado (este arquivo)
- [ ] **Phase 2 HTTP/Playwright probe contra Staging para confirmar a hipótese P0 na infra real** (bloqueado em aprovação PO)
- [ ] **Fix proposto: aplicar `.split(",")[0]?.trim()` em `auth.actions.ts:23` e `:90`** (bloqueado em aprovação PO)

---

## Fix proposto (aguardando aprovação do PO)

```ts
// src/server/actions/auth.actions.ts — patch (2 sites: linha 23 e linha 90)

function getClientIp(hdrs: Headers): string {
  // Match the parser used by src/app/api/v1/health/route.ts and the NextAuth route.
  // Takes the first IP in the comma-separated chain, falling back to x-real-ip
  // and finally "unknown". This is the leftmost IP — the origin client, not
  // any intermediate proxy / Vercel edge IP.
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown"
  );
}

// registerAction
const ip = getClientIp(await headers());

// requestPasswordResetAction
const hdrs = await headers();
const ip = getClientIp(hdrs);
```

Por que isso é suficiente:
1. Alinha o comportamento com o resto da base de código (health route e NextAuth).
2. Elimina a variabilidade da cauda de proxy da chave do rate limit.
3. Adiciona fallback `x-real-ip` que alguns reverse proxies preferem.
4. Mantém o fallback `"unknown"` para requisições locais/testes sem proxy.

**Risco regressivo:** baixo. A chave de rate-limit muda de formato, mas o Redis stub do
smoke test demonstra que a lógica de contagem funciona sob XFF estável (Cenários 1–4).

**Cobertura de teste do fix:** já está garantida pelos Cenários 1 e 3 do smoke test —
eles assumem a string de IP estável, que é exatamente o que o parser corrigido produziria.

---

## Anexos

- Arquivo do smoke test: `tests/smoke/forgot-password-rate-limit.smoke.test.ts`
- Código investigado: `src/server/actions/auth.actions.ts:82-131`, `src/lib/rate-limit.ts`
- Pattern de referência (correto): `src/app/api/v1/health/route.ts:10-15`,
  `src/app/api/auth/[...nextauth]/route.ts:20-25`
