# Sprint 20 Security Review

**Reviewer:** security-specialist
**Date:** 2026-03-10
**Branch:** feat/sprint-20
**Scope:** T-S20-003, T-S20-004/005, T-S20-006, T-S20-009, T-S20-011

---

## Executive Summary

Sprint 20 resolve o finding LOW SEC-S19-001 (raw userId em logs de gamification engines) de forma completa e correta. Todos os 9 locais identificados no Sprint 19 agora usam `hashUserId()`. A nova funcionalidade de profile persistence (T-S20-004/005) segue o padrao BOLA existente -- o perfil e buscado exclusivamente via `session.user.id` no server component e apenas dados nao-senssiveis sao passados como props ao client component. O schema de preferences (T-S20-006) usa Zod com enums fechados que previnem injecao de valores arbitrarios. O schema de passageiros (T-S20-009) valida corretamente a estrutura, embora sem cap total de passageiros (observacao, nao finding). Os novos modelos de transporte e acomodacao (T-S20-011) usam `onDelete: Cascade` no schema e foram adicionados a transacao de exclusao de conta. Booking codes sao armazenados como `bookingCodeEnc` (campo TEXT para ciphertext AES-256-GCM). Nenhum finding MEDIUM ou superior foi identificado.

---

## Review Results

### SEC-CHECK-001: userId Hashing (T-S20-003)

**Status:** PASS
**Files reviewed:** `src/lib/engines/phase-engine.ts`, `src/lib/engines/points-engine.ts`, `src/server/services/itinerary-plan.service.ts`

**Verification:**

1. **phase-engine.ts:** Todos os 4 locais anteriormente com raw userId agora usam `hashUserId(userId)`:
   - Linha 53: `gamification.expeditionInitialized` -- `userIdHash: hashUserId(userId)` PASS
   - Linhas 287-294: `gamification.phaseCompleted` -- `userIdHash: hashUserId(userId)` PASS
   - Linhas 373-378: `gamification.phaseAdvanced` -- `userIdHash: hashUserId(userId)` PASS
   - Linha 464: `gamification.expeditionReset` -- `userIdHash: hashUserId(userId)` PASS

2. **points-engine.ts:** Todos os 4 locais corrigidos:
   - Linha 49: `gamification.progressInitialized` -- `userIdHash: hashUserId(userId)` PASS
   - Linhas 125-130: `gamification.pointsEarned` -- `userIdHash: hashUserId(userId)` PASS
   - Linhas 165-170: `gamification.pointsSpent` -- `userIdHash: hashUserId(userId)` PASS
   - Linha 229: `gamification.dailyLogin` -- `userIdHash: hashUserId(userId)` PASS
   - Linha 262-266: `gamification.profileFieldAwarded` -- `userIdHash: hashUserId(userId)` PASS
   - Linha 284: `gamification.rankUpdated` -- `userIdHash: hashUserId(userId)` PASS
   - Linha 308: `gamification.badgeAwarded` -- `userIdHash: hashUserId(userId)` PASS

3. **itinerary-plan.service.ts:** 1 local corrigido:
   - Linha 43: `itineraryPlan.created` -- `userIdHash: hashUserId(userId)` PASS

4. **Import verificado:** `import { hashUserId } from "@/lib/hash"` presente em todos os 3 arquivos.

5. **Grep completo em src/:** Nenhum logger call com raw userId encontrado em todo o codebase. Todas as ocorrencias usam `hashUserId()`, `hashForLog()`, ou `hid` (variavel local pre-hashed em ai.service.ts).

**Conclusao:** SEC-S19-001 esta **RESOLVIDO**. Zero raw userId em logger calls em todo o codebase.

---

### SEC-CHECK-002: Profile Persistence BOLA (T-S20-004/005)

**Status:** PASS
**Files reviewed:** `src/components/features/expedition/Phase1Wizard.tsx`, `src/app/[locale]/(app)/expedition/new/page.tsx`

**Verification:**

1. **BOLA protection:** O server component `ExpeditionNewPage` (expedition/new/page.tsx) verifica autenticacao em linhas 14-19 (`session?.user?.id`). O fetch do perfil e feito via `db.userProfile.findUnique({ where: { userId: session.user.id } })` (linha 33). Apenas o perfil do usuario autenticado e acessado -- nenhum parametro externo influencia o userId.

2. **Dados passados como props:** O server component usa `select` explicito (linhas 35-42) para buscar apenas: `passportExpiry`, `country`, `birthDate`, `phone`, `city`, `bio`. Nenhum campo sensivel (passportNumberEnc, nationalIdEnc) e passado ao client component. PASS.

3. **Cross-user leakage:** Impossivel -- o `userId` vem exclusivamente de `session.user.id`. Nao ha query params ou form data que possam alterar o userId da busca. PASS.

4. **Profile skip logic:** A funcao `isProfileComplete()` (Phase1Wizard.tsx linhas 41-46) verifica `birthDate`, `country`, `city`. E uma funcao pura no client que opera sobre os props recebidos. Nao faz requests adicionais. PASS.

5. **Exposicao de PII no client:** Os dados enviados como props sao: birthDate (formato date string), phone, country, city, bio. Sao dados do proprio usuario sendo exibidos de volta para ele. O passportExpiry e usado apenas para o warning de validade, convertido para ISO string. Nenhum campo criptografado e exposto. PASS.

6. **Graceful degradation:** O bloco try/catch (linhas 44-46) garante que se a tabela user_profiles nao existir, o wizard funciona normalmente sem pre-populacao. PASS.

---

### SEC-CHECK-003: Preferences Schema Validation (T-S20-006)

**Status:** PASS
**Files reviewed:** `src/lib/validations/preferences.schema.ts`, `src/server/services/preferences.service.ts`, `src/server/actions/profile.actions.ts`

**Verification:**

1. **Zod validation com enums fechados:** O `PreferencesSchema` usa `z.enum()` para todos os campos single-select e `z.array(z.enum())` para multi-select. Isso rejeita qualquer valor que nao esteja na lista pre-definida. Exemplo: `z.enum(TRAVEL_PACE_OPTIONS)` aceita apenas "relaxed", "moderate", "intense". Tentativas de injecao como `"<script>"` ou `{"$ne": null}` sao rejeitadas pelo Zod. PASS.

2. **JSON injection prevention:** O schema Zod nao aceita campos extras (strict by default em z.object()). Campos como `__proto__`, `constructor`, ou qualquer propriedade arbitraria sao removidos pelo parse. O resultado validado e tipado como `UserPreferences`. PASS.

3. **Scoped ao usuario autenticado:** Em `savePreferencesAction` (profile.actions.ts linha 234-235), a sessao e verificada e `userId` vem de `session.user.id`. O upsert em `preferences.service.ts` linha 34 usa `where: { userId }`. PASS.

4. **XSS vectors:** Os valores de preferencia sao enums string pre-definidos (ex: "vegetarian", "hostel"). Nao ha campo de texto livre. Valores renderizados no UI sao traduzidos via i18n keys, nao exibidos diretamente. Risco de XSS via preferences: nulo. PASS.

5. **Backward compatibility:** `parsePreferences()` (linha 94-102) trata `null`, `undefined`, e dados invalidos graciosamente, retornando defaults. Perfis existentes sem preferences continuam funcionando. PASS.

6. **Idempotencia de pontos:** `savePreferencesAction` verifica `pointTransaction.findFirst()` antes de premiar (linhas 270-273), prevenindo duplicacao de pontos. PASS.

---

### SEC-CHECK-004: Passenger Data Validation (T-S20-009)

**Status:** PASS
**Files reviewed:** `src/lib/validations/trip.schema.ts`

**Verification:**

1. **Estrutura validada:** `PassengersSchema` valida:
   - `adults`: int, min 1, max 20. PASS.
   - `children.count`: int, min 0, max 20. PASS.
   - `children.ages`: array de int (0-17). PASS.
   - `seniors`: int, min 0, max 20. PASS.
   - `infants`: int, min 0, max 20. PASS.

2. **Refinement ages/count:** A refinement `.refine()` (linhas 102-108) verifica que `children.ages.length === children.count`. Isso previne inconsistencias entre contagem declarada e idades fornecidas. PASS.

3. **Nota sobre cap total:** O schema NAO impoe um limite total de passageiros (adults + children + seniors + infants). Com max 20 por tipo, o maximo teorico e 80. A task description original mencionava "total <= 9" mas a acceptance criteria no documento de tasks nao inclui essa restricao, e o schema permite ate 20 por tipo. Isso nao e um finding de seguranca (nao ha risco de injecao ou overflow), mas e uma observacao funcional.

4. **Tipo Json no Prisma:** O campo `passengers` e `Json?` no Trip, armazenado como JSONB no PostgreSQL. O Zod schema valida antes de persistir. PASS.

5. **Backward compatibility:** O campo e nullable (`Json?`), trips existentes com `null` continuam funcionando e o fallback e para `groupSize`. PASS.

---

### SEC-CHECK-005: Transport/Accommodation Models (T-S20-011)

**Status:** PASS
**Files reviewed:** `prisma/schema.prisma`, `prisma/migrations/20260310130000_add_transport_and_accommodation/migration.sql`, `src/lib/validations/transport.schema.ts`, `src/server/actions/account.actions.ts`

**Verification:**

1. **onDelete: Cascade no schema:**
   - `TransportSegment`: `trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)` (schema.prisma linha 394). PASS.
   - `Accommodation`: `trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)` (schema.prisma linha 429). PASS.

2. **FK Cascade na migration:** SQL confirma:
   - `transport_segments_tripId_fkey ... ON DELETE CASCADE` (migration.sql linha 53). PASS.
   - `accommodations_tripId_fkey ... ON DELETE CASCADE` (migration.sql linha 54). PASS.

3. **Account deletion transaction atualizada:** Em `account.actions.ts` linhas 196-201:
   ```
   await tx.transportSegment.deleteMany({ where: { tripId: { in: tripIds } } });
   await tx.accommodation.deleteMany({ where: { tripId: { in: tripIds } } });
   ```
   Ambos os novos modelos sao explicitamente deletados dentro da transacao de exclusao de conta. PASS.

4. **Booking code encryption:** O schema define `bookingCodeEnc String? @db.Text` (nao `bookingCode`). O Zod schema (`transport.schema.ts`) aceita `bookingCode` como plaintext com max 200 chars (linhas 40, 56), indicando que a criptografia deve ser aplicada na camada de servico antes de persistir. Como T-S20-011 e apenas schema (sem UI ou service layer), a criptografia sera implementada no Sprint 21 quando a UI for criada. O campo de armazenamento e corretamente nomeado com sufixo `Enc`. PASS (schema-level).

5. **Zod schemas:** Todos os campos com constraints adequados:
   - `transportType`: enum fechado (6 valores). PASS.
   - `accommodationType`: enum fechado (6 valores). PASS.
   - `estimatedCost`: nonnegative, max 99999999.99. PASS.
   - `currency`: string length 3 (ISO). PASS.
   - `notes`: max 500. PASS.
   - `bookingCode`: max 200. PASS.

6. **localMobility:** Implementado como `String[] @default([])` no schema e `z.array(z.enum(LOCAL_MOBILITY_OPTIONS))` no Zod -- enum fechado com 7 opcoes. PASS.

7. **Migration sem PII:** As 3 migrations (preferences, passengers, transport) contem apenas DDL (ALTER TABLE, CREATE TABLE, indexes, FK). Nenhum dado de usuario, seed, ou secret. PASS.

---

### SEC-CHECK-006: General Security

**Status:** PASS

**Verification:**

1. **Raw userId em logs -- scan completo:**
   - Grep por `logger\.\w+\(.*userId[^H]` em `src/`: zero matches. PASS.
   - Todos os novos arquivos (preferences.service.ts, profile.actions.ts savePreferencesAction) usam `hashUserId()`. PASS.

2. **Nenhuma nova API route:** `git diff master..HEAD --name-only -- 'src/app/api/'` retorna vazio. Todas as funcionalidades foram implementadas via server actions. PASS.

3. **console.log em server code:** Unico `console.log` encontrado e o audit event em `account.actions.ts` (pre-existente, documentado como "per spec"). Nenhum novo `console.log` adicionado no Sprint 20. PASS.

4. **Import conventions:** Phase1Wizard.tsx usa `import { useRouter } from "@/i18n/navigation"` (linha 4). PASS.

5. **Rate limiting:** Nenhuma nova API route foi criada, portanto nenhuma nova superficie de rate limiting necessaria. As server actions existentes mantem seus guards. PASS.

6. **Secrets em migrations:** Nenhum segredo, PII, ou dado sensivel nas 3 migrations. PASS.

---

## Findings Summary

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| SEC-S19-001 | LOW | Raw userId em logger calls em phase-engine.ts (4), points-engine.ts (4), itinerary-plan.service.ts (1) | **RESOLVED** (T-S20-003) |
| SEC-S20-OBS-001 | INFO | PassengersSchema nao impoe cap total de passageiros (max teorico 80). Considerar adicionar `.refine()` com total <= N se necessario por regra de negocio | OBSERVACAO |
| SEC-S20-OBS-002 | INFO | Transport booking code encryption sera implementada no Sprint 21 (service layer). Schema `bookingCodeEnc` esta pronto para receber ciphertext | OBSERVACAO |

---

## Verdict

**APPROVED**

Nenhum finding MEDIUM ou superior. SEC-S19-001 (ultima divida tecnica de seguranca conhecida com severidade LOW) foi corretamente resolvido. Todos os novos schemas usam Zod com enums fechados. Profile persistence mantem BOLA. Modelos de transporte e acomodacao incluidos na cascade deletion. Nenhuma regressao de seguranca identificada.
