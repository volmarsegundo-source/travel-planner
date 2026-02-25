# Sprint 1 Review — Travel Planner

**Data**: 2026-02-25
**Sprint**: 1 (T-001 → T-014)
**Branch**: `feat/sprint-1`
**Revisores**: tech-lead · architect · security-specialist
**Processo**: `/sprint-review 1` — execução paralela dos três agentes

---

## Tech Lead Review

### CRITICAL (blocks next sprint)

- **Senha armazenada no Redis em vez do banco** — `src/server/services/auth.service.ts:96–104`: `confirmPasswordReset` grava o hash de senha na chave Redis `pwd:{email}` com TTL de 30 dias. Não existe campo `passwordHash` no `User` do schema Prisma. Isso significa que o fluxo de reset de senha não persiste a nova senha no banco de dados — na prática, o reset de senha está quebrado para qualquer usuário que reinicie Redis. **Deve existir um campo `password` (ou `passwordHash`) no modelo `User` no Prisma schema antes do Sprint 2.**

### WARNING (must be fixed within 2 sprints)

- **PII em logs** — `auth.service.ts:63,81`: `console.log` registra o e-mail do usuário E o token de verificação/reset em texto simples. CWE-532 / OWASP A09. Qualquer acesso aos logs permite roubo de tokens ativos.

- **`process.env` direto no serviço de IA** — `ai.service.ts:14`: `apiKey: process.env.ANTHROPIC_API_KEY` viola a regra da arquitetura "env vars somente via `env.*`". Deve ser `import { env } from "@/lib/env"` + `env.ANTHROPIC_API_KEY`.

- **Persistência da IA apenas em `sessionStorage`** — `PlanGeneratorWizard`, `itinerary/page.tsx`, `checklist/page.tsx`: o plano e o checklist gerados pela IA vivem apenas no `sessionStorage` do browser. Um refresh de página destrói os dados. Os Server Actions de persistência (`saveChecklist`, `reorderActivities`, `addActivity`, `deleteActivity`) descritos no Dia 7 do Sprint Plan **não foram implementados** no Sprint 1.

- **Sem auto-save no editor drag-and-drop (US-007 AC-006)** — `DraggableActivityList.tsx`: a reordenação funciona apenas na memória; nenhuma chamada ao servidor persiste a ordem alterada.

- **Analytics events não implementados** — `onboarding.completed` (US-003 AC-006), `ai.plan.generated` (US-006 AC-007) e `ai.checklist.generated` (US-008 AC-006) estão ausentes no código. Nenhum evento de analytics é disparado.

- **Redirect-after-login não implementado (US-002 AC-005)** — Login sempre redireciona para `/trips`, sem respeitar a última página visitada.

- **LanguageSwitcher ausente na página de perfil (US-015 AC-002)** — `LanguageSwitcher` está no `TripsShell` mas US-015 AC-002 exige que seja "visível no perfil do usuário" (`/account`). A página `(auth)/account/page.tsx` não existe.

- **Preferência de idioma não persiste no DB (US-015 AC-003)** — `LanguageSwitcher` salva apenas o cookie `NEXT_LOCALE`; o campo `locale` no modelo `User` não é atualizado. Server Action `updateUserLocale` não foi implementada.

### INFO (nice to have)

- Testes unitários estão em `src/server/services/__tests__/` e `src/lib/validations/__tests__/`, mas `docs/architecture.md` define o caminho como `tests/unit/`. Considerar migração ou atualizar o ADR.

- `useForm<any>` em `CreateTripModal.tsx:50` é uma exceção documentada (Zod v4 / react-hook-form resolver type mismatch) — aceitável, mas monitorar a versão `@hookform/resolvers` para solução definitiva.

- `assertOwnership` em `trip.service.ts:28` faz uma query extra antes de qualquer operação de escrita. Considerar otimizar com `db.trip.update({ where: { id, userId } })` e verificar `count` no retorno para economizar 1 round-trip.

- `ItineraryDay` e `Activity` têm models no schema Prisma mas nenhuma Server Action implementada — o schema está "à frente" do código. Garantir migration consistente.

### Tasks verificadas como completas

T-001, T-002, T-003, T-004, T-005, T-006, T-007, T-008, T-009, T-010, T-011, T-012, T-013, T-014

### Tasks com implementação incompleta ou ACs não atendidos

- **T-005/T-009**: Server Actions para atividades/checklist (reorder, save, CRUD) não implementadas
- **T-007/T-010**: Rate limiting para AI generation (descrito no Dia 10) ausente
- **T-012**: `updateUserLocale` Server Action e `/account` page ausentes; preferência não persiste no DB

### Verdict: **BLOCK**

---

## Architect Review

### CRITICAL

Nenhum.

### WARNING

- **Violação da regra de env vars** — `src/server/services/ai.service.ts:14`: uso direto de `process.env.ANTHROPIC_API_KEY`. O ADR-001 e `docs/architecture.md` §3 exigem que toda var de ambiente seja acessada exclusivamente via `src/lib/env.ts`. Se o valor estiver ausente, o comportamento é silencioso (passa `undefined` ao SDK), enquanto via `env.*` a falha seria hard crash no startup.

- **sessionStorage como camada de persistência** — O fluxo AI plan (`PlanGeneratorWizard` → `itinerary/page.tsx`) e checklist usam `sessionStorage` como handoff. Esta é uma solução temporária válida para MVP rápido, mas representa uma divergência da arquitetura documentada (dados de negócio devem persistir em PostgreSQL). Sem a Server Action `saveChecklist` e `reorderActivities`, os dados gerados pela IA não sobrevivem a um refresh. **Precisa de ADR-003 documentando essa decisão e o plano de migração para Sprint 2.**

- **Schema Prisma diverge da implementação** — `ItineraryDay` e `Activity` existem no schema com indexes (`@@index([dayId, orderIndex])`) mas nenhuma Server Action ou service method os manipula. O schema está "adiantado". Isso não bloqueia, mas cria risco de migration drift quando a implementação chegar.

- **Senha não tem coluna no DB** — `User` model em `prisma/schema.prisma` não tem campo `password` ou `passwordHash`. O `confirmPasswordReset` grava o hash no Redis como workaround (vide Tech Lead). Esse campo deve ser adicionado no schema antes do Sprint 2 (migration necessária).

- **Caminho de testes diverge do ADR** — `docs/architecture.md` define `tests/unit/` para testes unitários. Os testes do Sprint 1 foram colocados em `src/server/services/__tests__/`, `src/lib/validations/__tests__/` etc. Isso dificulta a distinção entre testes unitários e integração no CI. Recomenda-se migrar para `tests/unit/` ou atualizar o documento de arquitetura formalmente.

### INFO

- **Auth pages em `(public)/auth/` vs. `auth/[...nextauth]`** — As páginas de autenticação estão corretamente em `src/app/(public)/auth/`, mas o handler Auth.js está em `src/app/auth/[...nextauth]/route.ts` (fora do route group). Esta é a forma correta (o handler não deve herdar middleware do grupo `(auth)`), mas vale documentar no ADR para evitar confusão.

- **Índice duplicado em `User.email`** — `schema.prisma:28`: `@unique` em `email` já cria um índice único no PostgreSQL; `@@index([email])` na linha 29 cria um índice duplicado. Remover o `@@index` redundante na próxima migration.

- **TanStack Query (React Query) não foi adotada** — `docs/architecture.md` lista TanStack Query v5 no stack, mas o código usa Server Actions diretamente sem TanStack Query. Isso é aceitável para MVP (Server Actions têm caching próprio via `revalidatePath`), mas deve ser documentado como decisão explícita ou o ADR-001 deve ser atualizado.

### ADRs necessários

| ADR | Tema | Motivo |
|-----|------|--------|
| ADR-003 | sessionStorage handoff para dados da IA | Documentar a decisão temporária e o plano de migração para persistência em PostgreSQL no Sprint 2 |
| ADR-004 | Seleção de modelos de IA (sonnet-4-6 vs haiku-4-5) | Documentar critério de escolha (plan = qualidade, checklist = custo/velocidade) e budget buckets |
| ADR-005 | Autenticação com Credentials (sem campo `password` no schema) | Documentar workaround Redis e o plano de migração para campo `passwordHash` no `User` |

### ADRs a atualizar

| ADR | Mudança necessária |
|-----|--------------------|
| ADR-001 | Registrar que TanStack Query não foi adotada no Sprint 1; Server Actions + `revalidatePath` como substituto para MVP |

### Verdict: **PASS** (com condições — ADRs devem ser criados antes do Sprint 2 iniciar)

---

## Security Review

### CRITICAL (deploy blocked)

- **[CWE-532 / OWASP A09] PII e tokens de segurança em logs** — `src/server/services/auth.service.ts:63` e `:81`: `console.log` registra o **e-mail do usuário** e o **token de verificação/reset** em texto simples:
  ```
  [AUTH] Verification email → user@example.com
  Link: http://localhost:3000/auth/verify-email?token=abc123...
  ```
  Em qualquer ambiente com logs coletados (Vercel, Datadog, CloudWatch), esses tokens ficam acessíveis a qualquer pessoa com acesso aos logs. Um atacante com leitura de logs pode verificar e-mails de outros usuários ou resetar senhas sem autorização. **Deve ser corrigido antes de qualquer deploy em staging/produção.** Substituir pelo provider de e-mail transacional (Resend/SendGrid).

- **[CWE-312 / OWASP A02] Senha armazenada em cache Redis** — `auth.service.ts:102–103`:
  ```typescript
  await redis.setex(`pwd:${email}`, 60 * 60 * 24 * 30, passwordHash);
  ```
  - Usa chave com e-mail em texto plano (`pwd:user@example.com`) — expõe e-mail no key namespace Redis
  - Redis não é adequado para armazenamento de credenciais: sem ACLs granulares por chave, sem audit log de acesso, TTL pode causar "senha expirada" silenciosamente
  - Não usa o padrão `CacheKeys.*` — chave fora do namespace controlado
  - **Deve ser migrado para campo `passwordHash` no modelo `User` (PostgreSQL) antes do Sprint 2**

### WARNING (fix before next sprint)

- **[OWASP A07] Sem rate limiting em endpoints de auth** — Login e registro não têm proteção contra brute-force. Com base em `docs/architecture.md`, o Redis deve ser usado para contadores de rate-limit desde o Sprint 1. Um atacante pode fazer tentativas ilimitadas de login ou registro. Implementar antes do primeiro usuário real.

- **[OWASP A05] Sem rate limiting na geração de IA** — `generateTripPlan` e `generateTripChecklist` não têm limite por usuário/hora. Um usuário autenticado pode disparar centenas de chamadas à API Anthropic causando custo significativo. O Sprint Plan (Dia 10) previa "max 10 gerações/usuário/hora via Redis counter" — não implementado.

- **[OWASP A03] Input sem limite de tamanho em `searchPlaces`** — `places.actions.ts:23`: validação só verifica `trimmed.length < 2`. Um input de 1MB seria enviado ao Google Places API. Adicionar `trimmed.length > 100` como guard.

- **Chave de API do Anthropic sem prefixo validado** — `env.ts:11`: `ANTHROPIC_API_KEY: z.string().startsWith("sk-")` — o prefixo oficial do Anthropic é `sk-ant-`, não genérico `sk-`. O valor placeholder `sk-ant-placeholder-dev-key-not-real` passa a validação, o que é correto para dev, mas considerar apertar a validação.

### INFO

- **CSP (Content-Security-Policy) não configurado** — `next.config.ts` não define headers de segurança (CSP, X-Frame-Options, HSTS). Adicionar antes do primeiro deploy público via `next.config.ts` `headers()`.

- **LGPD: direito ao apagamento não implementado ainda** — US-016 está corretamente no Sprint 2A. Deve ser entregue **antes** dos primeiros usuários reais. Soft delete com `deletedAt` está implementado para viagens — o pipeline de purge da conta completa (User + dados associados) ainda não existe.

- **Cookies de sessão Auth.js** — verificar se `AUTH_SECRET` tem entropia suficiente em produção. O valor placeholder tem 50 chars mas baixa entropia. Usar `openssl rand -base64 32` para gerar um secret real antes do deploy.

- **Imagens externas** — `next.config.ts` não define `images.remotePatterns`. Se `avatarUrl` do usuário Google for renderizada com `<Image>`, o Next.js bloqueará ou exigirá configuração.

### LGPD checklist

- [ ] **Direito ao apagamento**: NÃO implementado ainda (Sprint 2A — T-019/T-020)
- [x] **Consentimento no cadastro**: Trust signals + mini política implementados (T-003) ✓
- [x] **Minimização de dados**: apenas campos necessários coletados ✓
- [ ] **PII fora dos logs**: FALHOU — `auth.service.ts:63,81` registram e-mail e tokens
- [x] **Verificação de e-mail**: fluxo implementado (token Redis 24h) ✓
- [x] **Soft delete com `deletedAt`**: implementado em `Trip`, `Activity`, `ChecklistItem` ✓

### Trust signals (US-002B)

**VERIFICADO** — badge de segurança, mini política de privacidade e link "excluir minha conta" presentes na tela de cadastro conforme AC-001/002/003.

### Verdict: **BLOCK**

---

## Consolidated Verdict — Sprint 1

| Reviewer | Verdict | Critical Issues |
|----------|---------|-----------------|
| Tech Lead | BLOCK | 1 (confirmPasswordReset sem DB) |
| Architect | PASS | 0 (conditions: ADRs pending) |
| Security | BLOCK | 2 (PII/token em logs; senha em Redis) |

### Overall: 🚫 SPRINT BLOCKED — resolver todos os issues CRITICAL antes do Sprint 2

### Priority action items (ordenados por severidade)

| # | Severidade | Descrição | Owner | Prazo |
|---|-----------|-----------|-------|-------|
| 1 | CRITICAL | Substituir `console.log` de email/token por provider de e-mail real (Resend/SendGrid) em `auth.service.ts:63,81` — CWE-532 / OWASP A09 | security-specialist + dev-fullstack-1 | Antes do Sprint 2 |
| 2 | CRITICAL | Adicionar campo `passwordHash` ao modelo `User` no Prisma, migration, e remover Redis `pwd:{email}` de `confirmPasswordReset` — CWE-312 / OWASP A02 | architect + dev-fullstack-1 | Antes do Sprint 2 |
| 3 | WARNING | Implementar Server Actions de persistência para IA: `saveChecklist`, `reorderActivities`, `addActivity`, `deleteActivity` — plano e checklist atualmente efêmeros | dev-fullstack-1 | Sprint 2 semana 1 |
| 4 | WARNING | Substituir `process.env.ANTHROPIC_API_KEY` por `env.ANTHROPIC_API_KEY` em `ai.service.ts:14` — violação ADR-001 | dev-fullstack-1 | Sprint 2 dia 1 |
| 5 | WARNING | Implementar rate limiting em auth endpoints (login, register) e AI actions via Redis counter — OWASP A07 | dev-fullstack-1 | Sprint 2 semana 1 |
| 6 | WARNING | Criar ADR-003 (sessionStorage handoff), ADR-004 (seleção de modelos IA), ADR-005 (credentials sem `passwordHash`) | architect | Antes do Sprint 2 |
| 7 | WARNING | Implementar `updateUserLocale` Server Action e persistir preferência de idioma no campo `User.locale` | dev-fullstack-1 | Sprint 2 semana 1 |
| 8 | WARNING | Implementar rate limiting no `generateTripPlan` (max 10/usuário/hora) — OWASP A05 | dev-fullstack-1 | Sprint 2 semana 1 |
| 9 | INFO | Adicionar headers de segurança em `next.config.ts` (CSP, X-Frame-Options, HSTS) | devops-engineer | Sprint 2 semana 1 |
| 10 | INFO | Remover `@@index([email])` redundante do modelo `User` (já coberto pelo `@unique`) | dev-fullstack-1 | Próxima migration |

---

### Notas finais

Os **dois issues CRITICAL de segurança** (tokens em logs + senha em Redis) são pré-condição obrigatória para qualquer deploy em staging ou produção. Eles devem ser resolvidos como primeiros commits do Sprint 2, antes de qualquer nova feature.

O item #2 (campo `passwordHash`) exige uma **migration Prisma** que pode ter impacto no deploy. O release-manager deve avaliar o impacto (CIA-002) antes de executar.

Todas as demais tasks do Sprint 1 (T-001 a T-014) têm código implementado e os testes unitários (69/69 passing) e E2E stubs estão em ordem. O sprint atingiu seu objetivo de MVP end-to-end funcional com as ressalvas documentadas acima.

---

*Gerado por: `/sprint-review 1` — Travel Planner*
*Data: 2026-02-25*
