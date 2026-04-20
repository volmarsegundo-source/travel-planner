# SPEC-TEST-FORGOTPW-RATE-LIMIT-001 — Phase 2 HTTP Probe

**Date:** 2026-04-20
**Owner:** qa-engineer (impersonated in this session)
**Related specs:** SPEC-AUTH-FORGOTPW-003, SPEC-TEST-FORGOTPW-RATE-LIMIT-001
**Target:** `https://travel-planner-eight-navy.vercel.app` (Staging, `VERCEL_ENV=preview`)

---

## 🚨 STOP CONDITION ACIONADO

**Probe-1 revelou:** Redis está com status `error` em Staging. De acordo com a regra
explícita do PO no briefing da Ação A:

> "Se Probe-1 revelar Redis fail-open → PARAR, reportar ao PO urgente (vulnerabilidade mais séria)"

**Probes 2 e 3 foram abortados.** Nenhum fix foi aplicado. Esta é uma vulnerabilidade
de segurança ativa em Staging que precisa de atenção imediata do PO e do devops-engineer
antes de qualquer outra ação sobre `SPEC-AUTH-FORGOTPW-003`.

---

## Sumário executivo (6 linhas)

1. **Phase 2 confirmou P1, não P0.** A causa raiz do bug relatado no Test 11a é
   **Redis indisponível em Staging** → `checkRateLimit` cai no `catch` e retorna
   `{ allowed: true }` para TODAS as requests, independentemente de contagem ou IP.
2. **Fix NÃO foi aplicado.** A vulnerabilidade de XFF parsing (P0) permanece latente,
   mas não é o que está causando o bypass atual em Staging.
3. **Trust Score IP layer (Staging, estado atual): 0.00** — rate limit completamente
   ineficaz enquanto Redis estiver down.
4. **Próxima ação do PO (sugerida):** acionar o devops-engineer para investigar
   `REDIS_URL` / provisioning no Vercel Staging. Só faz sentido re-rodar Probe-2 e
   Probe-3 depois de Redis voltar.
5. **Commits finais desta iteração:** apenas este documento (sem código modificado).
6. **Ação B (fix do `getClientIp`) permanece pendente** — aguardando Redis de volta +
   aprovação do PO + nova rodada de probes.

---

## Probe-1 — Redis availability ✅ EXECUTADO

### Método
3 chamadas ao endpoint `/api/v1/health` espaçadas em ~10 segundos para descartar falha
transitória. O endpoint executa `redis.ping()` via `Promise.allSettled` e reporta
`services.redis` como `"ok"` ou `"error"`.

### Comando
```bash
for i in 1 2 3; do
  curl -sS "https://travel-planner-eight-navy.vercel.app/api/v1/health"
  sleep 2
done
```

### Resultado
```json
Probe 1 (2026-04-20T16:17:56.644Z):
{"status":"degraded","services":{"database":"ok","redis":"error","ai":{"status":"ok","provider":"gemini","fallback":"anthropic"}}}

Probe 2 (2026-04-20T16:18:30.699Z):
{"status":"degraded","services":{"database":"ok","redis":"error","ai":{"status":"ok","provider":"gemini","fallback":"anthropic"}}}

Probe 3 (2026-04-20T16:18:43.777Z):
{"status":"degraded","services":{"database":"ok","redis":"error","ai":{"status":"ok","provider":"gemini","fallback":"anthropic"}}}
```

**Stability:** 3/3 probes retornaram `redis:"error"` durante ~60s. Não é flaky — é
persistente.

### Interpretação
`redis.ping()` está falhando consistentemente no runtime Vercel Staging. Possíveis
causas (para o devops-engineer investigar, fora do escopo deste relatório):
- `REDIS_URL` não configurada ou com credenciais expiradas no environment Vercel Preview.
- Instância Redis (Upstash/outro) pausada, deletada, ou com IP allowlist restritiva.
- Rede: VPC / firewall bloqueando saída da função serverless.
- Pool de conexões esgotado.

### Impacto de segurança
`src/lib/rate-limit.ts:38-42` tem um **fail-open deliberado**:

```ts
} catch {
  // If Redis is unavailable, allow the request through rather than blocking users.
  // This ensures registration and login work even when Redis is down.
  return { allowed: true, remaining: limit, resetAt: now + windowSeconds * 1000 };
}
```

Essa decisão foi tomada para não derrubar login/registro quando Redis falha. Mas o
efeito colateral é que **todos os rate limits** do sistema estão ineficazes em Staging
agora:
- `pwd-reset:ip:*` (5/h) — bypassado
- `pwd-reset:email:*` (3/h) — bypassado
- `register:*` (20/h) — bypassado
- `health:*` (60/min) — bypassado
- Qualquer outro rate limit baseado em `checkRateLimit`.

**Explica integralmente o Test 11a do PO:** as 6 requests passaram porque nenhuma
request é bloqueada enquanto Redis estiver down.

### Por que o Test 11b (email) "funcionou" na percepção do PO
Hipótese: o backend tem **anti-enumeration** que retorna `success: true` mesmo quando
o limite por email é atingido (`src/server/actions/auth.actions.ts:112-116`):

```ts
if (!emailLimit.allowed) {
  // Anti-enumeration: return success even when the per-email limit triggers,
  return { success: true };
}
```

Do ponto de vista da UI, um request "bem-sucedido pela primeira vez" e um request
"bloqueado pelo limite de email" retornam a MESMA resposta (`{success:true}` + tela
"Verifique seu e-mail"). Com Redis down, **ambos os casos retornam success:true mesmo
que o e-mail nunca seja enviado**, e o PO não tem como distinguir no UI.

Em outras palavras: **o "funcionou" do Test 11b é provavelmente um falso positivo
observacional** — o rate limit de email não está ativo, mas a UI é indistinguível.

---

## Probe-2 — Reproduzir bug com 6 requests ⛔ NÃO EXECUTADO

Abortado pela regra STOP. Se tivesse rodado com Redis em fail-open, todas as 6 requests
passariam trivialmente, o que **não distinguiria** P0 (XFF parsing) de P1 (fail-open).
Probe-2 só faz sentido depois que o devops-engineer restaurar Redis.

### Plano para quando Redis voltar
```bash
# Observar 6 requests via UI
npx playwright test tests/e2e/forgot-password-rate-limit.probe.spec.ts \
  --config=playwright.config.ts -c BASE_URL=https://travel-planner-eight-navy.vercel.app
```

**Asserts esperados (com Redis ok):**
- Requests 1–5 → página "Verifique seu e-mail".
- Request 6 → mensagem de erro visível (ou bloqueio detectável via toast / classe
  `role="alert"`).

Se Probe-2 **ainda** falhar com Redis ok, então P0 (XFF parsing) é a próxima hipótese
a testar.

---

## Probe-3 — Inspecionar XFF real ⛔ NÃO EXECUTADO

Abortado pela regra STOP. Investigação do valor real de `x-forwarded-for` que chega ao
backend Vercel só é útil se Redis estiver operacional — caso contrário, o XFF nem é
usado (o catch intercepta antes).

### Recomendação para Probe-3 pós-Redis
Adicionar endpoint temporário `/api/_debug/echo-headers` (acesso restrito por token)
que retorna os headers relevantes:

```ts
// src/app/api/_debug/echo-headers/route.ts (DELETAR após diagnóstico)
export async function GET(request: NextRequest) {
  if (request.headers.get("x-debug-token") !== process.env.DEBUG_TOKEN) {
    return new Response("forbidden", { status: 403 });
  }
  return NextResponse.json({
    "x-forwarded-for": request.headers.get("x-forwarded-for"),
    "x-real-ip": request.headers.get("x-real-ip"),
    "x-vercel-forwarded-for": request.headers.get("x-vercel-forwarded-for"),
    "x-vercel-id": request.headers.get("x-vercel-id"),
  });
}
```

Então 2 requests do mesmo cliente real → comparar strings. Se variarem, P0 é real.

---

## Conclusão e próximas decisões

### Causa confirmada
**P1: Redis fail-open em Staging.** Explicação única e suficiente para o Test 11a do PO.

### P0 (XFF parsing) — status
**Latente, não confirmado em produção.** Reproduz em teste sintético (unit/smoke level),
mas precisa de Phase 2 com Redis ok para validar na infra real. **Não é a causa atual
em Staging.** Pode ou não se manifestar depois que Redis voltar — depende do formato
real do XFF que o edge Vercel entrega ao runtime Node.

### Recomendação de priorização para o PO

| # | Ação | Responsável | Urgência |
|---|---|---|---|
| 1 | Restaurar Redis em Staging (verificar `REDIS_URL`, allowlist, provider) | devops-engineer | **P0 — agora** |
| 2 | Re-rodar Probe-2 e Probe-3 em Staging com Redis ok | qa-engineer | P1 — após #1 |
| 3 | **SE Probe-2 ainda falhar**: aplicar fix do `getClientIp` helper (Ação B do briefing) | dev-fullstack-1 | P2 — condicional |
| 4 | Considerar endurecer a política de fail-open: fail-closed (bloquear) em rotas sensíveis como `pwd-reset`, mantendo fail-open em `register`/`login` | security-specialist | P2 — discussão |

### Item adicional para consideração (fora do escopo original)
A política atual de `fail-open` universal tem uma assimetria perigosa: uma falha de
Redis em produção **silenciosamente desabilita toda a defesa de rate limit**, incluindo
proteção contra:
- Password-reset flooding (mailbox bomb).
- Account enumeration via timing.
- Credential stuffing (se houver endpoint de login protegido).

Proposta de arquitetura (security-specialist / tech-lead decidem):
```ts
// fail-closed para rotas sensíveis
const rl = await checkRateLimit(key, limit, window, { failClosed: true });
// fail-open permanece default para rotas não-sensíveis (registro, login)
```

**Sem decisão aqui** — registrado como discussão para backlog.

---

## Entregáveis desta iteração

- [x] `docs/qa/forgotpw-rate-limit-probe-2026-04-20.md` (este arquivo)
- [ ] ~~`src/lib/http/get-client-ip.ts`~~ — **não criado**, fix não autorizado pelo
      resultado de Phase 2
- [ ] ~~`src/lib/http/get-client-ip.test.ts`~~ — idem
- [ ] ~~`tests/smoke/forgot-password-rate-limit.smoke.test.ts` (atualizado)~~ — idem
- [ ] ~~Commit push origin/master~~ — apenas este doc será commitado

### Aguardando aprovação do PO antes de
- Acionar devops-engineer para restaurar Redis Staging.
- Re-rodar Probe-2 e Probe-3 após Redis voltar.
- Qualquer decisão sobre P0 (XFF parsing).
- Qualquer mudança na política fail-open vs fail-closed.
