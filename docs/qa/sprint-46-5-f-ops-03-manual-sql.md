# F-OPS-03 — SQL Manual para Execução PO em Neon Staging

**Sprint:** 46.5 fix bundle — Operação alternativa
**Date:** 2026-04-27
**Origin:** PO operational constraint (no local execution) substituiu `npm run seed:v2-only` por SQL direto em Neon Console.
**Author:** dev-fullstack-1 (autonomous Sprint 46.5 — F-OPS-03 alternative path)
**Source files:**
- `prisma/seed-ai-governance-v2.ts` (canonical seed function)
- `prisma/seed-v2-only.ts` (idempotent wrapper, F-OPS-04)
- `prisma/migrations/20260424120000_ai_governance_v2/migration.sql` (table definitions)

---

## §1 Summary

SQL idempotente fielmente mapeado de `seedAiGovernanceV2Defaults` para execução manual em Neon SQL Editor (branch `production` do projeto Staging `quiet-butterfly-95446147`). 16 registros total: 3 em `model_assignments` + 13 em `ai_runtime_configs`. Re-execução é safe (ON CONFLICT DO NOTHING). `prompt_templates` (3 rows pré-existentes em Staging) preservados — SQL não toca essa tabela.

---

## §2 Pré-requisitos

1. **Acesso a Neon Console** — branch `production` do projeto `quiet-butterfly-95446147`, db `neondb`.
2. **SQL Editor aberto** com a branch correta selecionada (não archived).
3. **Conexão UTF-8** (default em Neon) — descriptions usam em-dash (`—`) que precisa de encoding UTF-8.
4. **Permissão de escrita** na conexão (não read-replica).

---

## §3 Instruções de execução (3 passos)

### Passo 1 — Pre-flight (verificar estado atual)

**Cole este SQL primeiro** para confirmar estado pré-seed:

```sql
SELECT 'model_assignments' AS table_name, COUNT(*) AS rows FROM model_assignments
UNION ALL
SELECT 'ai_runtime_configs', COUNT(*) FROM ai_runtime_configs
UNION ALL
SELECT 'prompt_templates', COUNT(*) FROM prompt_templates;
```

**Estado esperado antes do seed:**

| table_name | rows |
|---|---:|
| `model_assignments` | `0` |
| `ai_runtime_configs` | `0` |
| `prompt_templates` | `3` (preservar) |

Se algum desses três tiver outro valor, **PARE** e reporte para Claude Code analisar antes de prosseguir.

### Passo 2 — Executar SQL idempotente

**Cole o bloco completo abaixo no Neon SQL Editor e execute como uma transação única.** A transação `BEGIN/COMMIT` garante rollback automático se qualquer parte falhar.

```sql
-- Sprint 46.5 F-OPS-03 alternativo: seed V2 governance defaults em Staging
-- Idempotente via ON CONFLICT DO NOTHING.
-- Fidelidade: prisma/seed-ai-governance-v2.ts @ commit 04b1f3f.

BEGIN;

-- ============================================
-- model_assignments — 3 registros (phases plan/checklist/guide)
-- Source: MODEL_ASSIGNMENT_DEFAULTS em prisma/seed-ai-governance-v2.ts
-- Unique key: "phase"
-- ============================================

INSERT INTO model_assignments
  ("id", "phase", "primaryProvider", "primaryModelId", "primaryTimeoutMs",
   "fallbackProvider", "fallbackModelId", "fallbackTimeoutMs",
   "createdAt", "updatedAt")
VALUES
  ('seed_ma_plan',
   'plan',
   'anthropic',
   'claude-haiku-4-5-20251001',
   30000,
   'gemini',
   'gemini-2.0-flash',
   25000,
   NOW(), NOW()),

  ('seed_ma_checklist',
   'checklist',
   'anthropic',
   'claude-haiku-4-5-20251001',
   20000,
   NULL,
   NULL,
   NULL,
   NOW(), NOW()),

  ('seed_ma_guide',
   'guide',
   'anthropic',
   'claude-haiku-4-5-20251001',
   25000,
   NULL,
   NULL,
   NULL,
   NOW(), NOW())
ON CONFLICT ("phase") DO NOTHING;

-- ============================================
-- ai_runtime_configs — 13 registros (SPEC §5.3.1 allowlist)
-- Source: AI_RUNTIME_CONFIG_DEFAULTS em prisma/seed-ai-governance-v2.ts
-- Unique key: "key"
-- value column é TEXT contendo JSON.stringify(value):
--   números → '2048', '0.7' (string contendo o número)
--   booleans → 'false', 'true' (string contendo a literal)
-- ============================================

INSERT INTO ai_runtime_configs
  ("id", "key", "value", "description", "createdAt", "updatedAt")
VALUES
  -- maxTokens (3) — range 256-16384
  ('seed_arc_maxtokens_plan',
   'maxTokens.plan',
   '2048',
   'Max output tokens for plan generation (range 256-16384)',
   NOW(), NOW()),

  ('seed_arc_maxtokens_checklist',
   'maxTokens.checklist',
   '2048',
   'Max output tokens for checklist generation (range 256-16384)',
   NOW(), NOW()),

  ('seed_arc_maxtokens_guide',
   'maxTokens.guide',
   '4096',
   'Max output tokens for guide generation (range 256-16384)',
   NOW(), NOW()),

  -- temperature (3) — range 0.0-2.0
  ('seed_arc_temperature_plan',
   'temperature.plan',
   '0.7',
   'Sampling temperature for plan generation (range 0.0-2.0)',
   NOW(), NOW()),

  ('seed_arc_temperature_checklist',
   'temperature.checklist',
   '0.3',
   'Sampling temperature for checklist generation (range 0.0-2.0)',
   NOW(), NOW()),

  ('seed_arc_temperature_guide',
   'temperature.guide',
   '0.7',
   'Sampling temperature for guide generation (range 0.0-2.0)',
   NOW(), NOW()),

  -- killSwitch (4) — boolean
  ('seed_arc_killswitch_global',
   'killSwitch.global',
   'false',
   'Global AI kill-switch — disables all AI generation when true',
   NOW(), NOW()),

  ('seed_arc_killswitch_plan',
   'killSwitch.plan',
   'false',
   'Per-phase kill-switch for plan generation',
   NOW(), NOW()),

  ('seed_arc_killswitch_checklist',
   'killSwitch.checklist',
   'false',
   'Per-phase kill-switch for checklist generation',
   NOW(), NOW()),

  ('seed_arc_killswitch_guide',
   'killSwitch.guide',
   'false',
   'Per-phase kill-switch for guide generation',
   NOW(), NOW()),

  -- rateLimitPerHour (3) — range 1-100
  ('seed_arc_ratelimit_plan',
   'rateLimitPerHour.plan',
   '10',
   'Max plan generations per hour per user (range 1-100)',
   NOW(), NOW()),

  ('seed_arc_ratelimit_checklist',
   'rateLimitPerHour.checklist',
   '5',
   'Max checklist generations per hour per user (range 1-100)',
   NOW(), NOW()),

  ('seed_arc_ratelimit_guide',
   'rateLimitPerHour.guide',
   '5',
   'Max guide generations per hour per user (range 1-100)',
   NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

COMMIT;
```

### Passo 3 — Post-flight (verificar resultado)

**Cole este SQL** depois do COMMIT para confirmar:

```sql
SELECT 'model_assignments' AS table_name, COUNT(*) AS rows FROM model_assignments
UNION ALL
SELECT 'ai_runtime_configs', COUNT(*) FROM ai_runtime_configs
UNION ALL
SELECT 'prompt_templates', COUNT(*) FROM prompt_templates;
```

**Estado esperado depois:**

| table_name | rows |
|---|---:|
| `model_assignments` | `3` |
| `ai_runtime_configs` | `13` |
| `prompt_templates` | `3` (não alterado) |

**Detalhamento opcional** (se quiser ver os valores que foram inseridos):

```sql
-- Confirmar 3 phases de model_assignments
SELECT phase, "primaryProvider", "primaryModelId", "primaryTimeoutMs",
       "fallbackProvider", "fallbackModelId", "fallbackTimeoutMs"
FROM model_assignments
ORDER BY phase;

-- Confirmar 13 keys de ai_runtime_configs
SELECT key, value, description
FROM ai_runtime_configs
ORDER BY key;
```

### Passo 4 — Verificar health endpoint

Após execução SQL, fazer GET no health endpoint Staging:

```
https://travel-planner-eight-navy.vercel.app/api/health/ai-config
```

**Esperado (resposta JSON):**

```json
{
  "status": "ok",
  "source": "database",
  "checkedAt": "<ISO-8601>",
  "phases": [
    { "phase": "plan",      "hasAssignment": true, "provider": "anthropic", "modelId": "claude-haiku-4-5-20251001" },
    { "phase": "checklist", "hasAssignment": true, "provider": "anthropic", "modelId": "claude-haiku-4-5-20251001" },
    { "phase": "guide",     "hasAssignment": true, "provider": "anthropic", "modelId": "claude-haiku-4-5-20251001" }
  ]
}
```

Se ainda retornar `"status": "degraded"` ou `"source": "fallback"`, o seed não populou corretamente — re-rodar Passo 3 query verification para diagnose.

---

## §4 Re-run safety (idempotência)

O SQL é **completamente idempotente**:

- Cada `INSERT` tem `ON CONFLICT (...) DO NOTHING` no campo unique (`phase` ou `key`)
- Re-execução não duplica registros nem sobrescreve valores admin-tuned
- Counts pós-seed permanecem iguais
- Nenhum erro é gerado em re-run

**Cenário "executei pela metade e quero re-rodar":** safe. Se algumas rows já existem, ON CONFLICT skip; se outras faltam, INSERT executa. Convergência idempotente.

---

## §5 Em caso de erro

A transação BEGIN/COMMIT garante atomicidade — se qualquer parte falhar, **nada é commitado**.

### Erros comuns e diagnóstico

| Erro | Causa provável | Ação |
|---|---|---|
| `relation "model_assignments" does not exist` | Migration B-W1-002 não rodou em Staging | PARE — investigar migration state antes de re-tentar |
| `column "primaryProvider" of relation ... does not exist` | Migration parcial OU schema drift | PARE — confirmar migration aplicada completa |
| `duplicate key value violates unique constraint` (sem ON CONFLICT triggering) | Bug no SQL gerado | PARE — reportar para Claude Code |
| `permission denied for table model_assignments` | Conexão read-only | Trocar para conexão write em Neon |
| `invalid byte sequence` | Encoding não-UTF8 na conexão | Forçar UTF-8 em Neon connection settings |

**Em todos os casos:** copiar mensagem completa do erro + linha + reportar. **NÃO tentar fix manual** sem entender a raiz.

---

## §6 Caveats conhecidos

### §6.1 IDs determinísticos com prefixo `seed_*`

Os IDs inseridos seguem padrão `seed_ma_<phase>` e `seed_arc_<key>` em vez de cuids gerados pelo Prisma. Razões:

- O Prisma client gera cuids antes do INSERT (`@default(cuid())` é client-side, não DB-side). O migration SQL `"id" TEXT NOT NULL` não tem DEFAULT — SQL manual deve fornecer ID.
- Cuids começam com `c` seguido de 24 chars; meus IDs começam com `seed_` — sem colisão possível com cuids futuros gerados pelo client.
- Identidades estáveis facilitam future debugging ("essa row veio do seed manual") e re-runs.

**Implicação:** se a UI admin V2 mostrar o ID do registro, será `seed_ma_plan` em vez de algo tipo `clxabc...`. Não-ambiguidade visual mas potencialmente surpreendente. Documentado.

### §6.2 Em-dash (—) em descriptions

A description do `killSwitch.global` contém um em-dash UTF-8 (`—`) — fielmente copiado do TypeScript original. Neon usa UTF-8 por padrão; nenhum problema esperado. Se a conexão for forçada para outro encoding, o em-dash pode virar `?` ou erro.

**Mitigação:** confirmar que Neon SQL Editor mostra o caractere corretamente em uma query de teste antes de executar (cole `SELECT '—' AS dash;` para validar).

### §6.3 Schema drift entre seed TS e SQL

Se o schema Prisma adicionar campos a `model_assignments` ou `ai_runtime_configs` em Sprint 47+ ANTES de F-OPS-03 ser executado, este SQL falhará — colunas obrigatórias novas não estarão no INSERT.

**Mitigação:** F-OPS-03 deve ser executado **agora**, não procrastinado. Se Sprint 47 começar antes da execução, regenerar o SQL contra o schema atualizado.

### §6.4 `updatedAt` é `NOW()` em vez de timestamp do source TS

A função TS usa `db.modelAssignment.upsert(...)` que delega `updatedAt` ao Prisma client (geralmente `new Date()` no momento do INSERT). O SQL usa `NOW()` que é equivalente em PostgreSQL — não há drift semântico.

### §6.5 Ordem de execução dos passos

O SQL **deve** ser executado como uma transação única (`BEGIN/COMMIT` envolvendo ambos INSERT). Não fragmente os INSERTs em janelas separadas — se um INSERT falhar e outro succeed, ficamos com estado parcial sem ON CONFLICT proteção entre eles.

### §6.6 Não toca `prompt_templates`

Por design — Staging tem 3 rows pré-existentes desde Sprint 7-8 era. O seed full (`prisma/seed.ts`) faria upsert nelas avançando `updatedAt`; este SQL não. Se Wave 4 ou Wave 5 precisar de templates V2 específicos, um SQL separado deve ser gerado.

---

## §7 Audit trail

Após execução bem-sucedida, recomendo PO registrar:

1. **Timestamp de execução** (data + hora UTC)
2. **Resultado do Passo 3 query** (counts pós-seed)
3. **Resposta do health endpoint** (JSON completo)
4. **Em onde**: comentário no docs do Sprint 46 close (Sprint 46.5 progress note)

Trecho sugerido para release notes:

```markdown
## F-OPS-03 execution
- Executed: 2026-04-27 HH:MM UTC
- Source: docs/qa/sprint-46-5-f-ops-03-manual-sql.md
- Pre-state: model_assignments=0, ai_runtime_configs=0, prompt_templates=3
- Post-state: model_assignments=3, ai_runtime_configs=13, prompt_templates=3
- Health endpoint: {"status":"ok","source":"database",...}
- Sprint 46 close gate §3 unblocked.
```

---

## §8 Fidelidade ao TypeScript — verificação final

| Source TS | SQL gerado |
|---|---|
| 3 entries em `MODEL_ASSIGNMENT_DEFAULTS` | 3 INSERTs em `model_assignments` |
| 13 entries em `AI_RUNTIME_CONFIG_DEFAULTS` | 13 INSERTs em `ai_runtime_configs` |
| `phase` campo único | `ON CONFLICT ("phase")` |
| `key` campo único | `ON CONFLICT ("key")` |
| `JSON.stringify(value)` para AiRuntimeConfig | Valor literal correspondente em VARCHAR (e.g. `'2048'`, `'false'`) |
| `update: {}` no upsert (preserve admin values) | `DO NOTHING` (mesma semântica) |
| Prisma `@updatedAt` semantics | `NOW()` no SQL |
| Prisma `@default(now())` para `createdAt` | `NOW()` no SQL (também poderia omitir; explicit é mais claro) |
| 3 phases × 7 fields ModelAssignment | 7 colunas no INSERT statement |
| 13 keys × 4 fields AiRuntimeConfig | 4 colunas no INSERT statement (id, key, value, description) + 2 timestamps |

**Total: 16 registros, fielmente mapeados, idempotência preservada.**

---

## §9 Próximos passos depois desta execução

1. **F-OPS-03 ✅** marcado como done no Sprint 46.5 progress
2. **Walk-through #2** PO em Staging (último gate antes de Sprint 46 close formal):
   - Acessar `/{locale}/admin/ia` (link agora aparece em AdminNav após deploy de `a878f62`)
   - Validar tab "Prompts" exibe `PromptsTab` editor
   - Criar template draft e exercitar V-XX validations
3. **Sprint 46 close formal** — referenciar este doc + execution audit trail
4. **Plano Prod 4-fases** — Phase 0 audit Prod state, depois aplicar mesmo padrão lá

---

**Author final:** dev-fullstack-1 (Claude Code, autonomous Sprint 46.5 — F-OPS-03 alternative)
**Reviewer:** PO (Volmar) — antes de executar contra Staging
**Related:**
- Source TS: `prisma/seed-ai-governance-v2.ts`
- Wrapper TS: `prisma/seed-v2-only.ts` (F-OPS-04)
- Migration: `prisma/migrations/20260424120000_ai_governance_v2/migration.sql`
- Walk-through investigation: `docs/qa/sprint-46-walk-through-investigation-v2.md`
- Sprint 46.5 checklist: `docs/qa/wave-close-staging-readiness.md`
