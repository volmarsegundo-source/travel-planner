# Bug Report — Google OAuth DOB Submit shows "Algo deu errado"

**Data:** 2026-04-21
**Autor:** dev-fullstack-1 (investigação autorizada pelo PO)
**Status:** ⏸ Diagnóstico concluído — aguardando aprovação PO antes do fix
**Severidade:** bloqueante pré-Beta
**Componentes:** SPEC-AUTH-AGE-002 (Google OAuth + DOB gate)

---

## 1. Resumo

PO reproduziu manualmente em 2026-04-20: usuário adulto completa Google OAuth,
é redirecionado para `/pt-BR/auth/complete-profile`, preenche DOB `28/03/1982`
(44 anos, adulto válido), clica **Continuar**, e recebe banner vermelho
"Algo deu errado. Por favor, tente novamente." Usuário fica preso — não consegue
chegar ao dashboard.

Reprodução ocorreu contra **Staging** (onde Redis está atualmente offline).

## 2. Hipóteses avaliadas

| # | Hipótese | Resultado | Evidência |
|---|---|---|---|
| 1 | Sessão Google sem `user.id` | ❌ **Descartada** | `auth.config.ts:69-80` + `:94-112` populam `token.sub = user.id` e `session.user.id = token.sub` corretamente para provider OAuth. |
| 2 | Validação DOB rígida demais | ❌ **Descartada** | `<input type="date">` sempre emite `YYYY-MM-DD`. `DateOfBirthSchema` (`user.schema.ts:26`) aceita ISO. `isAdult("1982-03-28")` retorna `true` em 2026-04-21 (testei em `age-guard.ts:26`). |
| 3 | Cálculo de idade errado | ❌ **Descartada** | Mesma prova do #2. `computeAgeYears` é leap-year aware e retorna 44 para DOB 1982-03-28 na data atual. |
| 4 | Race condition pós-OAuth | ❌ **Descartada** | PrismaAdapter cria User row sincronamente durante o callback OAuth, antes de qualquer navegação para `/complete-profile`. FK constraint do `UserProfile.userId` deve satisfazer. |
| 5 | Rate-limit fail-closed + Redis down | ❌ **Descartada** | `completeProfileAction` (`profile.actions.ts:341`) chama `checkRateLimit` **sem** `failClosed: true`. Wave 1 aplicou fail-closed apenas em `register` e `pwd-reset` (confirmado em `git show 0175582`). Redis down → fail-open → request flui. |

## 3. Causa raiz confirmada

### BUG-A (drift spec↔código) — `updateSession` nunca é chamado

**Localização:** `src/server/actions/profile.actions.ts:329-383` (função `completeProfileAction`).

**Spec §Scenario 2 (linha 85 de `SPEC-AUTH-AGE-002.md`):**
> "And the session is refreshed with profileComplete = true"

**Spec §Implementation (linha 60):**
> "JWT callback: expose profileComplete boolean on the token, refreshed by the session after a successful DOB submission (via `unstable_update`)."

**Código atual (linhas 367-376):**
```ts
try {
  const birthDate = new Date(parsed.data.dateOfBirth);
  await db.userProfile.upsert({
    where: { userId },
    create: { userId, birthDate },
    update: { birthDate },
  });

  logger.info("auth.oauth.dobAccepted", { userIdHash: hashUserId(userId) });
  return { success: true };
}
```

**Nenhuma chamada a `updateSession` / `unstable_update`.** O JWT do usuário
permanece com `profileComplete: false` após o upsert bem-sucedido.

**Efeito no fluxo:**
1. DOB é persistido em `UserProfile.birthDate` (✅ DB OK)
2. Action retorna `{ success: true }`
3. Cliente faz `router.push("/expeditions")` (`CompleteProfileForm.tsx:55`)
4. Middleware (`middleware.ts:86-90`) lê JWT → `profileComplete === false` → redireciona para `/auth/complete-profile?callbackUrl=/pt-BR/expeditions`
5. Usuário vê o formulário DOB de novo — **loop infinito**

### BUG-B (provável, não reproduzível sem logs Staging) — upsert silenciosamente falha e `mapErrorToKey` mascara

O banner vermelho "Algo deu errado" só aparece se a action retornar uma chave
de erro, e o mapeamento que produz essa string é `errors.generic` — que vem
*exclusivamente* de `mapErrorToKey` (`action-utils.ts:4-9`) quando a exception
não é um `AppError` conhecido.

Portanto, no fluxo real do PO em Staging, **a exception ESTÁ ocorrendo** em
`db.userProfile.upsert`. Causas plausíveis que só podemos confirmar com logs:

- **Conexão Prisma caiu** (DB Staging paused/throttled após deploy Wave 1)
- **Migration desincronizada** (UserProfile.birthDate ausente em Staging)
- **FK violation** (edge case: User row criado pelo adapter mas sessão usa `token.sub` obsoleto de sessão anterior)
- **Transaction timeout** (Prisma default 5s + cold start Staging)

Observação crítica: `mapErrorToKey` engole o erro verdadeiro. O `logger.error`
é chamado (`profile.actions.ts:378`) com `hashUserId` mas o **stack trace real
nunca é exposto ao cliente** — daí a mensagem genérica.

## 4. Fix proposto (PENDENTE aprovação PO)

### Fix 1 — Refrescar JWT após DOB válido (corrige BUG-A e o loop)

**Arquivo:** `src/server/actions/profile.actions.ts`

```diff
-import { auth, signOut } from "@/lib/auth";
+import { auth, signOut, updateSession } from "@/lib/auth";
```

```diff
   try {
     const birthDate = new Date(parsed.data.dateOfBirth);
     await db.userProfile.upsert({
       where: { userId },
       create: { userId, birthDate },
       update: { birthDate },
     });

+    // SPEC-AUTH-AGE-002 §Scenario 2: refresh JWT so middleware allows passage.
+    await updateSession({ user: { profileComplete: true } });
+
     logger.info("auth.oauth.dobAccepted", { userIdHash: hashUserId(userId) });
     return { success: true };
   } catch (error) {
```

**Nota:** `updateSession` (alias de `unstable_update`) já está exportado em
`src/lib/auth.ts:48`. Os testes em `profile.complete-profile.test.ts` já
mockam `mockUpdateSession` (linhas 13, 22, 35, 67) — portanto o scaffolding
está pronto, só falta a chamada.

### Fix 2 — Expor a causa raiz nos logs de Staging (diagnostica BUG-B)

**Arquivo:** `src/server/actions/profile.actions.ts` linhas 377-382

```diff
   } catch (error) {
-    logger.error("auth.completeProfile.error", error, {
-      userIdHash: hashUserId(userId),
-    });
+    logger.error("auth.completeProfile.upsert.failed", error, {
+      userIdHash: hashUserId(userId),
+      errorName: (error as Error)?.name ?? "unknown",
+      errorCode: (error as { code?: string })?.code,
+    });
     return { success: false, error: mapErrorToKey(error) };
   }
```

Isto permite ver, em Staging, se é `PrismaClientKnownRequestError P2003` (FK)
vs `PrismaClientInitializationError` (DB down) vs `P2025` (row missing) sem
vazar PII.

## 5. Estimativa de esforço

| Atividade | Tempo |
|---|---|
| Aplicar Fix 1 + Fix 2 | 10 min |
| Ajustar `profile.complete-profile.test.ts` para asserir `updateSession` chamada | 10 min |
| Rodar suite completa (3632 testes) | 10 min |
| Deploy Staging + re-reproduzir | 15 min |
| Capturar log real do upsert (BUG-B) e decidir follow-up | 15 min |
| **TOTAL** | **~1h** |

## 6. Regras de parada avaliadas

- ✅ **Hipótese 5 (Redis down + fail-closed):** descartada → não preciso parar por infra.
- ✅ **Fix não toca lógica AGE-002 regulatória:** Fix 1 apenas cumpre o Scenario 2 já aprovado.
- ✅ **Fix não toca Google OAuth config:** zero alteração em env / provider config.
- ⏸ **Autorização PO:** fix <1h, aguardando sinal verde antes de aplicar.

## 7. Próximos passos (aguardando PO)

1. ✅ PO aprovou Fix 1 + Fix 2
2. ✅ Aplicado + testado + commit `9a45312`
3. ✅ Deploy Staging (Vercel via Git integration)
4. ✅ Reproduzido fluxo Google OAuth → DOB — banner persistiu
5. ❌ BUG-A era raiz única: **não**. Banner ainda aparece.
6. ✅ Log capturado — **ver seção 8**
7. ☐ qa-engineer valida Scenarios 2, 3, 4 do spec em Staging (bloqueado até schema drift resolver)

---

## 8. BUG-B causa raiz confirmada (2026-04-21 15:19 UTC)

### Evidência (Vercel Functions log, deployment `9a45312`)

```
prisma:error
Invalid `prisma.userProfile.upsert()` invocation:
The column `onboardingStep` does not exist in the current database.

errorCode:  P2022
errorName:  PrismaClientKnownRequestError
userIdHash: 94f9736e99d3
```

O enriquecimento de logger do Fix 2 funcionou: `errorCode` veio sem PII.

### Categoria: **Schema drift Staging ↔ código**

O banco Staging (Neon) está 3 migrations atrás do schema.prisma. Não é bug de código — é gap de deploy de migrations.

### 8.1 Migrations faltantes no Staging (cronológicas)

Confirmadas via `git ls-tree master -- prisma/migrations/` e `git log` dos commits-origem:

| # | Migration | Commit | Data | Colunas adicionadas |
|---|---|---|---|---|
| 1 | `20260418120000_onboarding_step_persistence` | `eabc9aa` | 2026-04-18 13:59 -0300 | `onboardingStep` INT NOT NULL DEFAULT 0, `onboardingData` JSONB, `onboardingCompletedAt` TIMESTAMP |
| 2 | `20260418130000_ai_consent_fields` | `7f93dce` | 2026-04-18 (depois de #1) | `aiConsentGiven` BOOLEAN, `aiConsentAt` TIMESTAMP, `aiConsentVersion` VARCHAR(10) |
| 3 | `20260418130100_ai_consent_backfill_legacy` | `7f93dce` | 2026-04-18 | UPDATE idempotente em `user_profiles` (grandfather legacy AI users) |

Todas estão em `prisma/schema.prisma:363-389` (model `UserProfile`) e são referenciadas em 11 arquivos de código (`onboarding.service.ts`, `ai-consent-guard.ts`, `consent.actions.ts`, etc.).

### 8.2 Estado da tabela em Staging (inferido sem acesso direto)

**Não confirmado** — preciso de `DATABASE_URL` Staging ou `npx prisma migrate status` contra Neon. Mas o log P2022 prova que `onboardingStep` não existe. Por transitividade (3 migrations mesmo dia, mesmo autor, mesmo blocker CI), é altamente provável que as 3 colunas e o backfill estejam ausentes. Validar antes do fix.

### 8.3 Processo de deploy de migrations — mapeado

`.github/workflows/deploy.yml`:
- `deploy-staging` (push para `master`): `run: npx prisma migrate deploy` com `DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}` (linhas 31-34)
- `deploy-production` (push para `production` ou workflow_dispatch): mesmo pattern com `PRODUCTION_DATABASE_URL` (linhas 58-61)

**Migrations DEVERIAM ser aplicadas automaticamente** em todo push para master. Processo está definido corretamente.

### 8.4 Por que não foram aplicadas — causa raiz do drift

Commit `26fd93e` (2026-04-19 19:34 -0300, docs em `docs/devops/deploy-yml-investigation-2026-04-19.md`):

> *"The `run:` value on line 64 contained `: ` (colon-space) inside the echo string, which YAML parsed as a mapping indicator. GitHub Actions rejected the workflow before creating any jobs, producing the 0s duration / no-log failure pattern observed across 10+ master pushes."*
>
> *"Impact: Prisma production migrations (silently skipped on every push until now) will resume executing."*

**Timeline:**
- 2026-04-18 13:59: migration #1 (`onboardingStep`) pushada em `eabc9aa` → deploy workflow rejeitado silenciosamente
- 2026-04-18 14:xx: migrations #2 e #3 (`aiConsent*`) pushadas em `7f93dce` → mesmo destino
- 2026-04-18 → 2026-04-19 19:34: **janela de ~30h em que qualquer push para master ignorou silenciosamente `prisma migrate deploy`** (10+ commits afetados)
- 2026-04-19 19:34: `26fd93e` corrige o YAML
- 2026-04-19 19:34 → 2026-04-21 (hoje): 20+ pushes subsequentes com workflow válido — mas **o workflow só aplica as migrations que ainda não estão na tabela `_prisma_migrations`** do Neon. Se o step `deploy-staging` dos pushes pós-fix rodou com sucesso, as 3 migrations já deveriam ter sido aplicadas *a partir de `26fd93e`*. Como não foram, **há um segundo blocker pós-26fd93e** que preciso diagnosticar antes do fix.

### 8.5 Estado de Produção

`origin/production` → commit `cef6b8c` ("chore: add beta_feedback_model migration"). Este commit é **anterior** a Sprint 41 e **NÃO contém** nenhuma das 3 migrations de 2026-04-18:

```bash
$ git log origin/production -- prisma/migrations/20260418120000_onboarding_step_persistence/
# (empty — migration não está no branch production)
```

Código em produção também não referencia `onboardingStep` (pré-Sprint 41 não tinha a feature). **Produção não tem o bug ainda**, mas:

- 🚨 **Quando `production` branch for promovido a partir de `master`** (cutover pre-Beta), `deploy-production` vai rodar `prisma migrate deploy` contra `PRODUCTION_DATABASE_URL`. Se esse job estiver com o mesmo blocker pós-CI-fix (a determinar), produção quebrará imediatamente ao servir OAuth users.
- 🚨 Backfill `20260418130100` faz `UPDATE user_profiles SET aiConsentGiven = true WHERE ...`. Idempotente (`AND aiConsentGiven IS NULL`), mas depende da #2 ter aplicado.

### 8.6 Bloqueios para diagnosticar o segundo blocker pós-`26fd93e`

Para identificar por que `prisma migrate deploy` continua não aplicando no Staging após o YAML fix, preciso de **um** dos seguintes:

- **A.** Output de `gh run list --workflow=deploy.yml --branch=master --limit=15` (ou screenshots da GitHub Actions UI) — para ver se `deploy-staging` está com ✅ ou ❌ nos últimos 20 runs e, se ❌, em que step
- **B.** `STAGING_DATABASE_URL` exposto temporariamente nesta sessão → rodo `npx prisma migrate status` contra o Neon e reporto quais migrations estão em `_prisma_migrations.applied` vs pendentes
- **C.** Acesso read-only à tabela `_prisma_migrations` via Neon console → PO cola o output aqui

### 8.7 Achados bônus (registrar — não tratar nesta sessão)

1. **Redis Staging offline**: log do PO mostra `getaddrinfo ENOTFOUND relevant-mudfish-66475.upstash.io`. Rate-limit de `completeProfileAction` está fail-open (Wave 1 só aplicou fail-closed em `register` e `pwd-reset`, confirmado em `git show 0175582 -- src/server/actions/`). **Não é blocker do BUG-B**, mas é uma regressão de segurança a catalogar para Wave 2C ou 3. ADR de fail-closed global pendente.
2. **Observabilidade**: `src/lib/logger.ts` usa `console.error` only; não forwardeia pra Sentry. `sentry.server.config.ts` existe mas só captura React ErrorBoundary, **não Server Action catch-blocked failures**. Para bugs como este (exception engolida por `mapErrorToKey`), só vemos o erro real porque o Fix 2 o adicionou explicitamente ao logger. Gap de observabilidade — registrar para `devops-engineer`.

---

## 9. Fix proposto (PENDENTE aprovação PO)

### 9.1 Pré-fix: diagnóstico necessário (15min)

- ☐ Desbloquear cenário A/B/C da seção 8.6 → confirmar **por que** pós-`26fd93e` o `deploy-staging` ainda não aplicou as migrations
- ☐ Confirmar estado exato de `_prisma_migrations` em Staging (3 pendentes? mais? em estado `failed`?)

### 9.2 Fix Staging (depois do diagnóstico; ~10–30min)

Três opções — escolha depende do blocker descoberto em 9.1:

| Opção | Descrição | Risco | Reversível? |
|---|---|---|---|
| **A. Re-rodar workflow** | `gh workflow run deploy.yml --ref master` ou via dashboard — força `prisma migrate deploy` novamente | Baixo | Sim (migrations são aditivas; nenhuma `DROP`) |
| **B. Migrate deploy local** | PO (ou devops) roda `DATABASE_URL=<staging> npx prisma migrate deploy` local | Baixo se só um operador | Sim |
| **C. SQL manual no Neon** | PO copia `migration.sql` das 3 pastas para o SQL editor do Neon, depois `INSERT INTO _prisma_migrations (...)` manualmente | Médio (risco de desincronizar `_prisma_migrations`) | Parcial |

**Recomendação inicial:** A — a menos que o diagnóstico da 9.1 mostre que o workflow está quebrado por outra razão (aí vamos para B ou C).

### 9.3 Guard-rail para produção (antes do cutover)

Antes do primeiro push futuro para branch `production`:
- ☐ `devops-engineer` adiciona step de validação `npx prisma migrate status --schema=./prisma/schema.prisma` ANTES do `prisma migrate deploy`, que falha o job se houver divergência — evita "silently skipped" novamente
- ☐ `qa-engineer` inclui smoke test `/api/v1/health` que tenta um `SELECT "onboardingStep" FROM user_profiles LIMIT 1` (ou uma upsert dry-run) — detecta schema drift em segundos

### 9.4 Riscos se nada for feito

- 🔴 **P0 Staging**: Google OAuth users 100% bloqueados de completar onboarding (qualquer DOB → banner "Algo deu errado")
- 🟡 **P1 Staging**: Fluxo AI consent também quebrado silenciosamente (tentativa de ler `aiConsentGiven` retorna P2022) — possivelmente mascarado por fallback mas já está em código de produção
- 🔴 **P0 Produção (futuro)**: cutover pre-Beta vai herdar o mesmo gap se não fix antes

---

## 10. Regras de parada (reavaliadas)

- ⏸ **NÃO vou rodar `prisma migrate deploy` em Staging sem aprovação PO** (regra explícita do briefing)
- ⏸ **NÃO vou tocar produção sob nenhuma circunstância** nesta sessão
- 🟢 Descobri múltiplas migrations atrasadas (3) em Staging — **reportando escala** antes de agir
- 🟢 Descobri que produção ainda não tem drift HOJE, mas herdará no próximo cutover se o blocker pós-`26fd93e` não for resolvido antes — **alertando PO como risco P0 potencial**

---

## 11. Resumo para o PO (TL;DR)

1. ✅ BUG-A (updateSession missing) — FIXADO em `9a45312`
2. 🎯 BUG-B raiz confirmada — schema drift: **3 migrations** faltantes em Staging desde 2026-04-18
3. 🔍 Janela de drift: pré-2026-04-19 19:34 (`26fd93e` corrigiu YAML bug que bloqueava workflow). **Mas alguma coisa ainda está bloqueando pós-fix** — precisa ver logs do `deploy-staging` job ou `_prisma_migrations` direto
4. 🚨 Produção não tem drift hoje, mas cutover pre-Beta vai reproduzir o bug se o blocker pós-26fd93e não for identificado antes
5. ⏸ **Aguardando PO**: escolher opção A/B/C da seção 8.6 para desbloquear o diagnóstico final, depois autorizar fix Staging (opção A/B/C da seção 9.2)

---

## 12. BUG-C — CSP bloqueando React hydration em /auth/complete-profile (SPEC-SEC-CSP-NONCE-001)

> **Descoberto 2026-04-20** após PO resolver BUG-B (STAGING_DATABASE_URL + migrations aplicadas).
> **Status**: 🟢 **Fix aplicado** — aguardando validação manual em Staging após deploy.

### 12.1 Sintoma

Após OAuth login com Google e redirect para `/auth/complete-profile`:
- Botão de submit não reage ao clique (React hydration quebrada)
- Console mostra `Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self' 'nonce-<uuid>'"`
- Também bloqueado: `https://vercel.live/_next-live/feedback/feedback.js` (widget Vercel Live em preview deployments)

### 12.2 Causa raiz

Latente desde Sprint 2 (`middleware.ts` adicionado em 2026-03-04). Três defeitos em cadeia:

1. **Nonce nunca propagado ao request** — o middleware gerava um `nonce = crypto.randomUUID()` e o injetava no header `Content-Security-Policy` da resposta, mas **nunca** o passava para os Server Components via request header `x-nonce`. Next.js usa `headers().get('x-nonce')` para stampar nonce em scripts inline que ele mesmo gera (hydration, chunk loader). Sem isso, browser bloqueia.
2. **CSP sem `'strict-dynamic'`** — em produção, browsers modernos que suportam CSP Level 3 ignoram host allowlists em `script-src` quando `'strict-dynamic'` está presente. Sem essa directive, scripts dinamicamente carregados via `<script nonce>` (padrão do Next.js) eram bloqueados.
3. **Vercel Live não allowlisted em preview** — `https://vercel.live` + `wss://ws-us3.pusher.com` são injetados pelo edge Vercel apenas em preview deployments, mas CSP não os permitia.

### 12.3 Fix aplicado (`SPEC-SEC-CSP-NONCE-001`)

**Arquivos**:
- `src/lib/csp.ts` (novo) — pure functions `buildCsp`, `applySecurityHeaders`, `propagateNonceToRequest` extraídas do middleware para testabilidade
- `src/middleware.ts` — refatorado: gera nonce up-front, propaga via `NextResponse.next({ request: { headers } })` OU via sentinel headers `x-middleware-override-headers` + `x-middleware-request-x-nonce` (quando `intlMiddleware` retorna rewrite/redirect)
- `src/lib/__tests__/csp.test.ts` (novo) — 12 testes unitários cobrindo per-request nonce, strict-dynamic prod vs dev, Vercel Live condicional, HSTS apenas fora de dev, propagação de sentinel headers

**Directive changes**:
- Dev: `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'` (react-refresh precisa de eval)
- Prod: `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
- Preview: `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live` + `connect-src 'self' https: https://vercel.live wss://ws-us3.pusher.com` + `frame-src 'self' https://vercel.live`

### 12.4 Gates locais

- ✅ `npx tsc --noEmit` — clean (exit 0)
- ✅ `npm test` — 258 files, **3644 tests passing** (+12 novos)
- ✅ `npm run lint` — sem warnings novos (pré-existentes mantidos)

### 12.5 Validação em Staging (bloqueador para fechamento)

☐ Deploy para Staging (via push para `master`)
☐ PO abre `/auth/complete-profile` em Staging, submete DOB válido
☐ Console devtools deve estar limpo (sem erros CSP)
☐ Botão submit deve reagir — UserProfile deve ser persistido
☐ Smoke test Playwright (opcional) após validação manual

## 13. BUG-C-F2 — Observabilidade aplicada, H1a confirmada (2026-04-22)

### 13.1 Patch de observabilidade (commit `7d42b60`)

Após BUG-C Partes 1 e 2 (CSP nonce + next-themes), o submit do DOB passou a
executar sem erro, mas o usuário continuava em loop em `/auth/complete-profile`.
Logs estruturados foram adicionados em `completeProfileAction` para isolar
H1a (updateSession silencioso) vs H1b (cookie gerado mas não commitado):

- `auth.completeProfile.updateSession.start` — `cookiesBefore`
- `auth.completeProfile.updateSession.end` — `cookiesAfter` + `profileCompleteAfter`

### 13.2 Evidência capturada (Staging, 2 tentativas)

```json
{ "event": "auth.completeProfile.updateSession.start",
  "cookiesBefore": ["NEXT_LOCALE","__Host-authjs.csrf-token","__Secure-authjs.callback-url","__Secure-authjs.session-token"] }
{ "event": "auth.completeProfile.updateSession.end",
  "cookiesAfter":  ["NEXT_LOCALE","__Host-authjs.csrf-token","__Secure-authjs.callback-url","__Secure-authjs.session-token"],
  "profileCompleteAfter": false }
```

`cookiesAfter === cookiesBefore` e `profileCompleteAfter: false` em ambas
tentativas → **H1a 100% confirmada**.

### 13.3 Root cause no código (não só sintomático)

- `node_modules/@auth/core/lib/actions/session.js` L18–20: `if (!sessionToken) return response;` com `response.cookies` vazio.
- `node_modules/next-auth/lib/actions.js` L73–86: `update()` monta `new Request` com headers de `next/headers`; em Server Actions do Next 15, o `SessionStore` interno não consegue reconstruir `sessionStore.value` a partir desse header Cookie → early-return → `cookieJar.set()` itera sobre array vazio → no-op silencioso.

### 13.4 Upstream (consultado em 2026-04-22)

- Latest: `next-auth@5.0.0-beta.31` + `@auth/core@0.41.2` (ambos 2026-04-14)
- Release notes beta.31: **"No changes to `next-auth`'s own source"** → upgrade não corrige
- Issues: [#11694](https://github.com/nextauthjs/next-auth/issues/11694), [#13205](https://github.com/nextauthjs/next-auth/issues/13205), [#13173](https://github.com/nextauthjs/next-auth/issues/13173), [#11853](https://github.com/nextauthjs/next-auth/issues/11853), [#7342](https://github.com/nextauthjs/next-auth/issues/7342) (feature ainda `unstable_` há 2+ anos)

## 14. BUG-C-F3 — Fix definitivo via cookie manual (2026-04-22)

### 14.1 Opções avaliadas

| Opção | Veredito |
|---|---|
| A. Escrita manual do cookie via `next-auth/jwt` | ✅ **Selecionada** |
| B. signOut + signIn silencioso | ❌ Bloqueada por design OAuth (Google exige redirect) |
| C. Upgrade beta.30 → beta.31 | ❌ Upstream explicitamente sem mudanças em `next-auth`'s source |
| D. Mover check para callback `jwt` com DB | ❌ `auth.config.ts` precisa ser Edge-safe (sem Prisma) |

### 14.2 Fix aplicado

- **Novo helper** `src/lib/auth/session-cookie.ts` — `patchSessionToken(patch)`:
  1. Lê `AUTH_SECRET` → retorna `no-secret` se ausente.
  2. Lê cookie `__Secure-authjs.session-token` (prod) ou `authjs.session-token` (dev) → retorna `no-cookie` se ausente.
  3. `decode({ token, secret, salt: cookieName })` → retorna `decode-failed` se inválido.
  4. Merge do patch no payload + `encode({ token, secret, salt, maxAge: 30d })`.
  5. `cookies().set(name, newToken, { httpOnly, sameSite: lax, path, secure, maxAge })`.
- **`completeProfileAction` refatorada**: remove `updateSession` + logs de observabilidade; chama `patchSessionToken({ profileComplete: true })`; em caso de falha apenas `logger.warn(...)` e segue (DB já consistente, UX degrada para 1 refresh manual).
- **Tests**: 5 unit tests novos no helper + 1 teste extra na action (fallback path).

### 14.3 Por que API é estável

`encode`/`decode` são exportados publicamente por `next-auth/jwt` (re-export de `@auth/core/jwt`), com signatures estáveis desde v4. O parâmetro `salt` é o nome do cookie — também estável. A documentação marca o módulo como "not recommended" para uso server-side mas nunca removeu nem quebrou as funções.

### 14.4 Gates locais

- ☐ `npx tsc --noEmit`
- ☐ `npm test`
- ☐ `npm run lint`

### 14.5 Validação em Staging (bloqueador para fechamento BUG-C)

☐ Deploy verde no Vercel
☐ PO repete fluxo Google OAuth + DOB em aba anônima
☐ Middleware **não** redireciona de volta para `/auth/complete-profile`
☐ Usuário aterrissa em `/expeditions` (ou rota protegida target)
☐ Log `auth.oauth.dobAccepted` presente; log `auth.completeProfile.patchCookie.failed` **ausente**

### 14.6 Follow-up (Sprint 46)

- Se upstream estabilizar `unstable_update` em versão futura, avaliar remoção do helper (item de SPEC-SEC-AUDIT-001).
- Adicionar logs opcionais dentro de `patchSessionToken` (não na action) se quisermos monitorar o helper em produção por 1 sprint — registro arquitetural mais coerente.

