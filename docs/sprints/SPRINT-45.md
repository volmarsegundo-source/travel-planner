# Sprint 45 — Saneamento Técnico + Qualidade

**Tipo**: Sprint de Estabilização
**Status**: Planned (kickoff após Beta)
**Owner**: tech-lead
**Co-owners**: devops-engineer, qa-engineer, security-specialist
**Data prevista**: Imediatamente após conclusão do Beta Fechado (Sprint 44)
**Referência**: `docs/specs/tech-debt/SPEC-TECHDEBT-CI-001.md`

> ⚠️ **Reordenação**: Em 2026-04-19 o PO (Volmar) aprovou a troca do escopo original desta sprint — que era "Central de Governança de IA" — para priorizar o saneamento técnico. A governança de IA foi realocada para Sprint 46 (`docs/specs/sprint-46/`).

---

## 1. Objetivo

Eliminar **712 erros pré-existentes de CI** (`749` totais - `37` corrigidos em Ação 2 do desbloqueio) e remover a allowlist temporária criada em `3302b74..HEAD` pós-desbloqueio Beta. Restabelecer disciplina de "CI 100% verde sem exceções" como pré-requisito para qualquer merge.

## 2. Escopo

### 2.1 Dentro do escopo

| Item | Qtd | Origem |
|---|---|---|
| Typecheck errors (`tsc --noEmit`) | **632 restantes** | 669 inicial - 37 blockers resolvidos |
| Test files com falhas | **13 arquivos (55 testes)** | mocks desatualizados, drift pós-refactor |
| Lint errors (`@typescript-eslint/no-unused-vars`) | **21 erros** | imports e vars mortos |
| Lint warnings (`atlas-design/no-raw-tailwind-colors`) | **~135 warnings** | migração design system incompleta |
| Remoção da allowlist temporária | 1 config | `.eslintrc.techdebt-allowlist.*` + `tsconfig.techdebt.json` |
| Smoke-tests CI sem bypass | 1 gate | Confirmar gates verdes sem allowlist |

### 2.2 Fora do escopo

- Novas features
- Refactors não relacionados aos erros catalogados
- Upgrade de dependências MAJOR (incluindo `next-intl 3→4`) — ver Sprint 47+

## 3. Critérios de Aceite

- [ ] `npm run type-check` termina com **0 erros** em `master`
- [ ] `npm run test` reporta **0 falhas** em `master` (todos 3461 verdes)
- [ ] `npm run lint` reporta **0 erros** (warnings aceitos se justificados)
- [ ] Allowlist removida: `.eslintrc.techdebt-allowlist.*` e `tsconfig.techdebt.json` deletados
- [ ] CI pipeline verde em 3 execuções consecutivas sem retry
- [ ] `docs/specs/tech-debt/SPEC-TECHDEBT-CI-001.md` marcado como RESOLVED

## 4. Planejamento

| Semana | Foco | Dev | QA |
|---|---|---|---|
| 1 | Typecheck sweep (files com >30 erros) | dev-fullstack-1 + dev-fullstack-2 | monitora |
| 2 | Test mocks refactor (13 arquivos) | dev-fullstack-2 | `qa-engineer` valida cobertura |
| 3 | Lint cleanup + remoção allowlist | devops-engineer | `qa-engineer` valida sign-off final |

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Test mocks desatualizados escondem regressões | `qa-engineer` revisa cada ajuste de mock contra o código real |
| Typecheck fix preguiçoso via `any` explícito | `security-specialist` audita toda adição de `any` — vedado em `server/*` |
| Allowlist remove item que ainda não foi corrigido | CI falha imediatamente; reverter remoção é cheap |
| Scope creep (devs querem refactor extra) | Gate: qualquer mudança fora do catálogo → nova issue, não bloqueia |

## 6. Deliverables

1. Branch principal com **0 falhas** em todos os gates
2. Allowlist deletada e commits referenciados em changelog
3. Relatório final `docs/sprints/SPRINT-45-REVIEW.md` atualizando a contagem de 712→0

## 7. Histórico

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0.0 | 2026-04-19 | devops-engineer | Criação inicial pós-aprovação PO para troca de escopo |
