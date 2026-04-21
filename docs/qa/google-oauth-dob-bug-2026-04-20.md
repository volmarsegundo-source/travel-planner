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

1. ☐ PO aprova Fix 1 + Fix 2
2. ☐ Aplicar + rodar testes + commit
3. ☐ Deploy Staging
4. ☐ Reproduzir fluxo Google OAuth → DOB
5. ☐ Se banner desaparecer: ✅ BUG-A era raiz única. Fechar.
6. ☐ Se banner persistir: inspecionar log `auth.completeProfile.upsert.failed.errorCode` → seguir para BUG-B (provavelmente migration/DB Staging).
7. ☐ qa-engineer valida Scenarios 2, 3, 4 do spec em Staging
