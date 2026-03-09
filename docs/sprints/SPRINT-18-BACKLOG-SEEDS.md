# Sprint 18 -- Backlog Seeds

> Gerado pelo tech-lead em 2026-03-09, apos merge do Sprint 17.

## Condicoes de Seguranca do Sprint 17 (P0)

As seguintes condicoes foram identificadas pelo security-specialist na revisao do Sprint 17 (docs/security/SPRINT-17-SECURITY-REVIEW.md) e devem ser tratadas como P0 no Sprint 18.

### SEC-S17-003 (MEDIUM): Limpeza completa de dados na exclusao de conta

**Problema:** A transacao de exclusao de conta em `account.actions.ts` faz soft-delete do User e limpa Account/Session, mas NAO remove dados de gamificacao (UserProgress, PointTransaction, UserBadge, ExpeditionPhase) nem UserProfile. Esses dados ficam orfaos e contem informacoes comportamentais e pessoais potencialmente sensiveis.

**Impacto LGPD:** UserProfile contem campos criptografados (passportNumber, nationalId) com chave de encriptacao compartilhada -- dados continuam decifraveis apos exclusao da conta.

**Acao requerida:** Dentro da transacao de exclusao, adicionar:
```typescript
await tx.userProfile.deleteMany({ where: { userId: user.id } });
await tx.userBadge.deleteMany({ where: { userId: user.id } });
await tx.pointTransaction.deleteMany({ where: { userId: user.id } });
await tx.userProgress.deleteMany({ where: { userId: user.id } });
// ExpeditionPhase depende de tripId, nao userId diretamente
const userTripIds = await tx.trip.findMany({
  where: { userId: user.id },
  select: { id: true },
});
await tx.expeditionPhase.deleteMany({
  where: { tripId: { in: userTripIds.map(t => t.id) } },
});
```

**Arquivos:** `src/server/actions/account.actions.ts`, `tests/unit/server/account.actions.test.ts`
**Estimativa:** 2h

---

### SEC-S17-004 (MEDIUM): Hash userId em trip.actions.ts

**Problema:** `src/server/actions/trip.actions.ts` ainda loga `userId: session.user.id` em texto claro em 5 pontos de logger.error (linhas 40, 75, 108, 132, 151). Este arquivo estava no escopo original de T-S17-004 mas nao foi corrigido.

**Acao requerida:**
1. Importar `hashUserId` de `@/lib/hash`
2. Substituir `userId: session.user.id` por `userIdHash: hashUserId(session.user.id)` em todas as 5 ocorrencias

**Arquivos:** `src/server/actions/trip.actions.ts`
**Estimativa:** 0.5h

---

### SEC-S17-005 (MEDIUM): Hash userId em auth.service.ts

**Problema:** `src/server/services/auth.service.ts` loga `userId` em texto claro em 5 pontos de logger.info (linhas 61, 86, 114, 142, 173). Esses logs cobrem fluxos criticos de seguranca (registro, verificacao de email, reset de senha).

**Acao requerida:**
1. Importar `hashUserId` de `@/lib/hash`
2. Substituir todas as ocorrencias de userId raw em logger calls por `hashUserId()`

**Arquivos:** `src/server/services/auth.service.ts`
**Estimativa:** 0.5h

---

### SEC-S17-006 (LOW): Hash userId em profile.service.ts

**Problema:** `src/server/services/profile.service.ts:68` loga `userId` raw em `logger.info("profile.fieldsUpdated", { userId, ... })`.

**Acao requerida:** Substituir por `hashUserId()`.

**Arquivos:** `src/server/services/profile.service.ts`
**Estimativa:** 0.25h

---

## Total estimado para condicoes de seguranca: ~3.25h
