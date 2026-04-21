# Sprint 45 — Coverage-Mode Flaky Tests Consolidation

**Date:** 2026-04-20
**Owner:** dev-fullstack-1 (impersonated)
**Decision:** PO (Volmar, 2026-04-20) — não bloquear Sprint 45. Segregar para Sprint 46 ou pós-Beta.
**Follow-up spec:** SPEC-TESTS-COVERAGE-FLAKY-001 (a criar)
**Related:** FLAKY-TRIAGE-app-shell-layout-2026-04-20.md (triagem original do item #1)

---

## Sumário executivo (5 linhas)

1. Dois testes passam de forma determinística em `npm test` mas **falham ou ficam lentos** em `npm run test:coverage`.
2. Hipótese primária: **overhead do instrumentador v8 + módulo reload** inflando tempos acima do `testTimeout=5000ms`.
3. **Nenhum é bug de produção.** Ambos os caminhos testados estão corretos — o problema é exclusivamente do harness sob coverage.
4. **Decisão PO**: não bloquear Sprint 45. Para medir coverage final, excluímos esses dois arquivos do pool via flag CLI (não via `vitest.config.ts`).
5. **Follow-up**: SPEC-TESTS-COVERAGE-FLAKY-001 em Sprint 46/pós-Beta investiga root cause e remove exclusão.

---

## Testes afetados

### 1. `tests/unit/app/app-shell-layout.test.tsx`

| Modo | Resultado | Duração típica |
|---|---|---|
| `npm test` (serial, isolado) | ✅ 9/9 pass, 10/10 runs | ~33 s/arquivo |
| `npm test` (full suite) | ✅ 9/9 pass (sessão 2026-04-20 22h) | ~33 s |
| `npm run test:coverage` | ⚠️ variável — timeout intermitente sob concorrência | >60 s suspeita |

**Triagem original:** `FLAKY-TRIAGE-app-shell-layout-2026-04-20.md` concluiu "slow, not flaky" em modo normal. Sob coverage, a lentidão baseline (~33s) é empurrada além do orçamento quando outras suítes competem por CPU/memória.

**Hotspot suspeito:** import chain `AppShellLayout → next-auth → prisma → next-intl → full user context tree`. Cada `it(...)` re-importa a cadeia em jsdom.

### 2. `tests/unit/server/services/ai-provider-factory.test.ts`

| Modo | Resultado | Duração típica |
|---|---|---|
| `npm test` (full suite) | ✅ 4/4 pass (sessão 2026-04-20 22h) | ~30 ms |
| `npm run test:coverage` (mesma sessão) | ❌ timeout 5000ms no primeiro `it(...)` | bloqueado |

**Evidência:**
```
FAIL tests/unit/server/services/ai-provider-factory.test.ts
  > AI Provider Factory > returns ClaudeProvider when AI_PROVIDER is 'anthropic'
Error: Test timed out in 5000ms.
  at line 72 — it("returns ClaudeProvider when AI_PROVIDER is 'anthropic'", async () => {
  at line 74 — vi.resetModules();
  at line 76 — const { getProvider } = await import("@/server/services/ai.service");
```

**Hotspot suspeito:** `vi.resetModules()` + dynamic `import("@/server/services/ai.service")` dentro do test. Sob coverage, o instrumentador v8 reinjeta transform hooks a cada re-import e o timeout padrão de 5s fica apertado. Em `npm test` o mesmo teste termina em ~30 ms.

---

## Hipóteses de causa raiz (compartilhada)

| # | Hipótese | Probabilidade | Como validar |
|---|---|---:|---|
| H1 | Coverage instrumentation (v8 provider) adiciona ~3–10× CPU aos imports dinâmicos | **Alta** | `test:coverage` com `--testTimeout=30000`; se passam, H1 confirma |
| H2 | `vi.resetModules()` invalida caches do instrumentador, forçando re-transform | Alta | Reescrever para não usar `resetModules` e verificar duração |
| H3 | Fake timers + framer-motion animation loops (app-shell) ressonam com instrumentador | Média | `--coverage=false` para só este arquivo confirma/descarta |
| H4 | jsdom setup caro (pulling `next-auth` + `prisma` graph) compete com outras suítes | Média | Rodar isolado sob coverage 10x — se 10/10 pass, H4 se confirma |
| H5 | Ordering flake (pollution entre testes) | Baixa | `--sequence.shuffle=false --isolate=true` não muda comportamento |

**H1 é o candidato dominante** — o timeout só dispara sob coverage e o teste em questão é dominado por módulo-import síncrono.

---

## Decisão do PO (2026-04-20)

> "Não bloquear Sprint 45 por isso. Excluir ambos da medição de coverage final via flag CLI. Criar SPEC-TESTS-COVERAGE-FLAKY-001 para Sprint 46 ou pós-Beta investigar."

### Aplicação prática nesta sprint

- Medição de coverage final de Sprint 45 usou:
  ```
  npx vitest run --coverage --testTimeout=30000 \
    --exclude='tests/unit/server/services/ai-provider-factory.test.ts' \
    --exclude='tests/unit/app/app-shell-layout.test.tsx'
  ```
- **`vitest.config.ts` NÃO foi alterado** — nenhum novo item de allowlist persistente. A exclusão é one-shot, só para medir branches%.
- Nos commits de Sprint 45, esses dois testes permanecem habilitados no pool padrão do CI (já passam em `npm test`).

---

## Follow-up: SPEC-TESTS-COVERAGE-FLAKY-001

**Escopo proposto (Sprint 46 ou pós-Beta):**

1. Instrumentar `test:coverage` com `--reporter=verbose` para medir duração por teste.
2. Validar H1/H2 com run controlado (coverage on/off, `resetModules` on/off).
3. Refatorar `ai-provider-factory.test.ts` para não depender de `vi.resetModules()` + dynamic import (usar `vi.doMock` + static import ou exportar factory explicitamente).
4. Investigar se vale trocar `@vitest/coverage-v8` por `@vitest/coverage-istanbul` (menor overhead em alguns cenários).
5. Para `app-shell-layout.test.tsx`: avaliar mock mais agressivo de `AppShellLayout` ou splitting em testes unitários menores por `it(...)`.
6. Restaurar inclusão no pool de coverage do CI.

**Critério de saída:** ambos os testes passam em `npm run test:coverage` em 10/10 runs sequenciais, cada um em <15s.

**Esforço estimado:** 4–6h (Sprint 46 budget).

---

## Audit trail

- **Branch:** `master` (pré-Wave 2 commits de Sprint 45)
- **Vitest:** 4.0.18, `@vitest/coverage-v8`
- **Node:** 20+
- **Sessões de evidência:** 2026-04-20 22h (full test suite pass) + 23h (coverage run fail)
- **Docs correlacionadas:** `FLAKY-TRIAGE-app-shell-layout-2026-04-20.md` (triagem original)

---

**Fim do documento. Não bloqueia Sprint 45.**
