# Sprint 5 — Architect Review

**Agente**: architect
**Sprint**: 5 — Navegacao Autenticada e Correcoes
**Branch**: `feat/sprint-5-authenticated-navigation`
**Data**: 2026-03-02
**Veredicto**: ⚠️ APROVADO com notas

---

## Resumo

Sprint 5 introduziu navegacao autenticada (AppShell, AuthenticatedNavbar, UserMenu, Breadcrumbs) e corrigiu exibicao de erros no LoginForm. A arquitetura esta solida: route group `(app)` isola rotas autenticadas corretamente, ADR-006 e ADR-007 documentam as decisoes de layout compartilhado e import path do LanguageSwitcher.

## Positivos

- Route group `(app)` implementado corretamente — separa rotas autenticadas sem alterar URLs publicas
- AppShellLayout como Server Component chamando `auth()` — padrao correto para Next.js 15
- ADR-006 (route group) e ADR-007 (LanguageSwitcher path) documentados em `docs/architecture.md`
- Breadcrumb component reutilizavel com configuracao por rota — escalavel para novas paginas
- LanguageSwitcher movido para `components/layout/` — posicionamento correto no grafo de componentes

## Findings

| ID | Severidade | Descricao | Acao |
|----|-----------|-----------|------|
| DT-008 | MEDIUM | Paginas 404 (`not-found.tsx`) nao estao internacionalizadas — exibem texto hardcoded em ingles | Backlog Sprint 6 |
| DT-010 | LOW | Import direto de `db` em alguns componentes sem alias `@/lib/db` — inconsistencia de path | Backlog Sprint 6 |
| DT-011 | LOW | ADR-005 menciona "database sessions" mas codigo usa JWT — desatualizado desde Sprint 2 | Backlog Sprint 6 |

## Arquivos Revisados

- `src/app/[locale]/(app)/layout.tsx` — AppShellLayout (Server Component)
- `src/components/layout/AuthenticatedNavbar.tsx` — navbar autenticada
- `src/components/layout/UserMenu.tsx` — dropdown de usuario com logout
- `src/components/layout/Breadcrumb.tsx` — breadcrumbs reutilizaveis
- `src/components/layout/LanguageSwitcher.tsx` — movido de `landing/`
- `src/components/features/auth/LoginForm.tsx` — fix de erro
- `docs/architecture.md` — ADR-006, ADR-007

## Itens para Sprint 6

- S6-003: Internacionalizar paginas 404
- S6-004: Corrigir ADR-005 (database sessions → JWT)

---

*Review conduzida em 2026-03-02 pelo architect.*
