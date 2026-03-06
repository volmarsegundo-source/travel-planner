# Sprint 9 Review — Atlas Gamification Pivot (Backend-only)

**Data**: 2026-03-06
**Branch**: `feat/atlas`
**Versão**: 0.8.0 → 0.9.0 (MINOR bump)
**Testes**: 588 passando (48 suites), 0 falhas
**Build**: Limpo
**Migration**: `20260306143505_atlas_gamification_models` — aplicada com sucesso

---

## Escopo Entregue

### Novos Modelos Prisma (4)
- **UserProgress**: pontos, rank, streak, login diário — 1:1 com User
- **ExpeditionPhase**: 8 fases por trip, status (locked/active/completed) — N:1 com Trip
- **PointTransaction**: audit trail append-only (earn/spend) — N:1 com User
- **UserBadge**: selos de passaporte, idempotente via unique constraint — N:1 com User

### Alterações em Modelos Existentes
- **Trip**: `expeditionMode` (bool, default true), `currentPhase` (int, default 1), relação `phases`
- **User**: relações `progress`, `badges`, `pointTransactions`

### Engine Layer (`src/lib/engines/`)
- **phase-config.ts**: configuração declarativa das 8 fases (isomorphic, sem server-only)
- **points-engine.ts**: gestão de pontos, badges, ranks, streak, histórico
- **phase-engine.ts**: ciclo de vida da expedição (init, complete, reset, AI usage)

### Tipos e Validação
- **gamification.types.ts**: Rank, BadgeKey, PhaseStatus, PhaseNumber, interfaces, constantes
- **gamification.schema.ts**: 3 Zod schemas (CompletePhase, SpendPoints, UseAiInPhase)

### Testes
- 119 novos testes unitários (4 suites)
- phase-config: 11 testes | points-engine: 42 testes | phase-engine: 46 testes | schemas: 20 testes

---

## Revisões dos Agentes

### 1. Architect — APROVADO COM OBSERVAÇÕES

**Avaliação Geral**: Implementação sólida e pragmática para MVP. Engines como static class methods são efetivamente namespaces — adequado para o estágio atual.

**Pontos Positivos:**
- phase-config.ts corretamente isomorphic (sem server-only) para futuro import no cliente
- PhaseEngine.completePhase usa `db.$transaction` para atomicidade total
- Badge idempotency via `@@unique([userId, badgeKey])`
- Phase ordering enforced via `trip.currentPhase === phaseNumber`
- 119 testes unitários cobrindo happy path e edge cases

**Débitos Técnicos Identificados:**

| ID | Severidade | Descrição |
|----|-----------|-----------|
| DT-S9-001 | ALTO | `spendPoints()` tem race condition TOCTOU — read-then-write sem transaction permite saldo negativo sob concorrência |
| DT-S9-002 | MÉDIO | Trip type + TRIP_SELECT não atualizados com `expeditionMode`/`currentPhase` — gap de integração |
| DT-S9-003 | MÉDIO | ADR-008 pendente — formalizar convenção `src/lib/engines/` vs `src/server/services/` |
| DT-S9-004 | MÉDIO | Inconsistência: Trip usa Prisma enums, gamification usa string columns |
| DT-S9-005 | BAIXO | Welcome bonus usa tipo `"purchase"` — deveria ser `"welcome_bonus"` |
| DT-S9-006 | BAIXO | `getTransactionHistory` sem cap de `pageSize` (max 100 por convenção) |
| DT-S9-007 | BAIXO | `recordDailyLogin` tem potencial double-award sob concorrência |
| DT-S9-008 | BAIXO | `AI_COSTS` e `SpendPointsSchema.type` enum podem divergir |

**Recomendação**: expeditionMode defaults true em ALL trips (incluindo pré-existentes) — aceitável apenas para MVP. Testes de integração com DB real adicionariam confiança.

---

### 2. Tech Lead — APROVADO COM CONDIÇÕES

**Qualidade de Código**: ALTA
- Padrão consistente com codebase existente (static class, server-only, db singleton)
- BOLA guards presentes em todos os métodos públicos do PhaseEngine
- Logger structured com chaves consistentes (`gamification.*`)
- TypeScript strict — zero `any`, todas as interfaces tipadas

**Débitos Identificados:**

| ID | Severidade | Descrição |
|----|-----------|-----------|
| DEBT-S9-001 | CRÍTICO | `spendPoints()` sem `$transaction` — TOCTOU permite double-spending |
| DEBT-S9-002 | MÉDIO | Tipo `Tx` duplicado em points-engine.ts e phase-engine.ts — extrair para shared |
| DEBT-S9-003 | MÉDIO | `useAiInPhase` fallback `"ai_itinerary"` para fases sem mapeamento — pode mascarar bugs |
| DEBT-S9-004 | BAIXO | Migration pode não estar commitada — verificar (NOTA: confirmada commitada) |

**Cobertura de Testes:**
- 119/119 testes passando
- Mocking pattern consistente com `account.actions.test.ts`
- Transaction mock pattern correto (`mockImplementation(async fn => fn(mockTx))`)

**Condição para aprovação**: DEBT-S9-001 (spendPoints race condition) DEVE ser resolvido antes de qualquer integração com UI que permita gastos de pontos.

---

### 3. DevOps Engineer — APROVADO

**Avaliação**: Sprint puramente backend com zero impacto em infraestrutura.

**Migration:**
- Aditiva — apenas `ADD COLUMN` e `CREATE TABLE`
- Nenhuma alteração destrutiva (sem DROP, ALTER TYPE, ou remoção de colunas)
- Índices adequados: `tripId` em expedition_phases, composite em point_transactions
- Foreign keys com `ON DELETE CASCADE` — consistente com padrão existente

**CI/CD:**
- Nenhuma mudança em pipeline necessária
- `npx prisma migrate deploy` é suficiente para staging/production
- Sem novas variáveis de ambiente
- Sem novas dependências

**Observações:**
- `point_transactions` é append-only — monitorar crescimento em produção
- Índice `[userId, createdAt]` adequado para queries paginadas
- Sem impacto em Docker, Vercel config, ou GitHub Actions

---

### 4. Release Manager — NON-BREAKING MINOR (0.9.0)

**Classificação da Mudança**: MINOR — nova funcionalidade, sem breaking changes

**Impacto:**
- 4 novas tabelas no banco (aditivo)
- 2 novas colunas em `trips` (com defaults, aditivo)
- 3 novas relações em `users` (aditivo)
- Zero alterações em APIs existentes
- Zero alterações em UI existentes

**Ações Requeridas:**
1. Criar entrada CHANGELOG [0.8.0] (Sprint 8 — nunca documentado)
2. Criar entrada CHANGELOG [0.9.0] (Sprint 9)
3. Bump `package.json` version para `0.9.0`
4. Executar `npx prisma migrate deploy` em staging antes de merge

**Riscos de Release:**
- `expeditionMode: true` como default afeta trips pré-existentes na próxima migration — aceitável para MVP (sem users reais)
- Nenhum consumer externo afetado (engines são internos, sem API routes expostas)

**Backward Compatibility**: 100% — nenhuma interface existente alterada

---

### 5. Security Specialist — APROVADO COM CONDIÇÕES

**Avaliação Geral**: Arquitetura de segurança sólida com BOLA guards consistentes. 3 findings de severidade ALTA requerem atenção.

**Pontos Positivos:**
- BOLA guards em todos os métodos públicos do PhaseEngine (trip.userId === userId via findFirst)
- `import "server-only"` previne import acidental no cliente
- Badge idempotency via unique constraint — sem race condition para duplicatas
- `ForbiddenError` com mensagem genérica (sem leak de informação)
- Points nunca negativos no totalPoints (apenas availablePoints decrementado)

**Findings:**

| ID | Severidade | Descrição | Recomendação |
|----|-----------|-----------|--------------|
| SEC-S9-001 | ALTO | `getPhaseStatus()` sem BOLA guard — aceita tripId sem verificar ownership | Adicionar userId param + findFirst guard |
| SEC-S9-002 | ALTO | `metadata` em CompletePhaseSchema aceita `z.record(z.unknown())` sem limites — JSON injection, DoS via payload grande | Adicionar `.max()` em keys, validar depth, limitar tamanho |
| SEC-S9-003 | ALTO | `spendPoints()` TOCTOU — race condition permite saldo negativo | Wrapping em `$transaction` com `WHERE availablePoints >= amount` |
| SEC-S9-004 | MÉDIO | `userId` logado em cleartext no logger — padrão do projeto exige SHA-256 hash | Usar hash em todos os logger.info calls |
| SEC-S9-005 | MÉDIO | `initializeProgress` e `recordDailyLogin` sem proteção contra concorrência | Usar upsert ou unique constraint guard |
| SEC-S9-006 | BAIXO | `getTransactionHistory` sem rate limiting — enumeration risk | Adicionar rate limit quando exposto via API |

**Condição para aprovação**: SEC-S9-001 e SEC-S9-003 DEVEM ser resolvidos antes de expor qualquer endpoint de gamification na API.

---

### 6. FinOps Engineer — APROVADO COM RESERVAS

**Impacto Financeiro do Sprint**: ZERO (sem chamadas AI, sem novas infra)

**Análise de Crescimento de Dados:**
- `point_transactions`: append-only, ~10-15 registros por trip completa
- Estimativa: 1000 users × 5 trips × 15 tx = 75.000 rows/mês
- Índices `[userId, createdAt]` e `[userId, type]` adequados para este volume
- **Recomendação**: definir política de retenção (ex: 12 meses) antes de 10k users

**Análise da Economia de Pontos:**
- Welcome bonus: 500 pts
- Expedição completa: +2.100 pts (sum de 8 fases)
- AI costs por expedição: -350 pts (máximo, se usar AI em fases 3, 4, 5)
- **Saldo após 1ª expedição**: +2.250 pts (bastante generoso)
- **Risco**: economia inflacionária se não houver sinks adicionais — considerar consumíveis premium

**Findings:**

| ID | Severidade | Descrição |
|----|-----------|-----------|
| OPT-S9-001 | MÉDIO | `point_transactions` sem política de retenção — crescimento linear infinito |
| OPT-S9-002 | BAIXO | Economia de pontos muito generosa — risco de inflação a longo prazo |
| OPT-S9-003 | CRÍTICO | `spendPoints` sem atomicidade — possível exploração para pontos infinitos |

**Recomendação**: OPT-S9-003 é MANDATORY antes de produção. Exploração de spendPoints pode gerar custos AI ilimitados.

---

## Consenso Cross-Agente

### Findings CRÍTICOS (consenso de 4+ agentes)

| Finding | Agentes | Ação |
|---------|---------|------|
| `spendPoints()` TOCTOU race condition | Architect, Tech Lead, Security, FinOps | **MUST FIX** antes de integração com UI/API |

### Findings ALTOS (consenso de 2+ agentes)

| Finding | Agentes | Ação |
|---------|---------|------|
| `getPhaseStatus()` sem BOLA guard | Architect, Security | Fix antes de expor via API |
| `metadata` schema sem limites | Security | Adicionar validação de tamanho/depth |

### Débito Técnico Aceito para MVP

| Débito | Justificativa |
|--------|---------------|
| `expeditionMode: true` default em todos os trips | Sem users reais em produção |
| String columns vs Prisma enums | Flexibilidade > type safety neste estágio |
| Tx type duplicado | Refatorar quando engines crescerem |
| Welcome bonus como "purchase" | Cosmético, não afeta lógica |

---

## Checklist de Sprint Review

- [x] `architect` review completado e documentado
- [x] `security-specialist` review completado e documentado
- [x] `devops-engineer` review completado e documentado
- [x] `tech-lead` review completado e documentado
- [x] `release-manager` review completado e documentado
- [x] `finops-engineer` review completado e documentado
- [x] Todos os blockers identificados e catalogados
- [x] Documento commitado ao repositório

---

## Ações para Próximo Sprint

1. **MUST**: Resolver `spendPoints()` TOCTOU — wrapping em `$transaction` com conditional update
2. **MUST**: Adicionar BOLA guard em `getPhaseStatus()` (ou marcar como private/internal)
3. **SHOULD**: Limitar `metadata` schema (max keys, max depth, max size)
4. **SHOULD**: Criar entradas CHANGELOG [0.8.0] e [0.9.0]
5. **SHOULD**: Bump package.json para 0.9.0
6. **COULD**: Escrever ADR-008 (engines vs services convention)
7. **COULD**: Extrair tipo `Tx` para shared module
8. **COULD**: Definir política de retenção para `point_transactions`

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Testes totais | 588 (469 existentes + 119 novos) |
| Suites | 48 |
| Falhas | 0 |
| Novos arquivos | 9 |
| Arquivos modificados | 2 |
| Novos modelos Prisma | 4 |
| Cobertura engines | ≥ 90% (estimada) |
| Build status | Limpo |
| Migration status | Aplicada |
