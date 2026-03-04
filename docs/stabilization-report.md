# Sprint 5B — Relatório de Estabilização

> Data: 2026-03-04
> Branch: `feat/sprint-5b`
> Versão base: 0.5.0

## Resumo

A Sprint 5B corrige 4 bugs encontrados nos testes manuais (Sprints 1-5) e atualiza
todos os testes E2E para refletir o novo fluxo de registro e as correções aplicadas.

---

## Bugs Corrigidos

| # | Bug | Arquivo(s) Afetado(s) | Status |
|---|-----|----------------------|--------|
| 1 | Campo "Confirmar senha" ausente no RegisterForm | `RegisterForm.tsx`, `messages/*.json` | Corrigido |
| 2 | Registro redirecionava para `/verify-email` em vez de `/auth/login?registered=true` com banner verde | `RegisterForm.tsx`, `LoginForm.tsx` | Corrigido |
| 3 | Breadcrumbs ausentes na página `/trips` | `trips/page.tsx` | Corrigido |
| 4 | Página 404 sem Header/Footer e sem i18n | `not-found.tsx`, `[...rest]/page.tsx` | Corrigido |

---

## Cobertura de Critérios de Aceitação

Total de ACs definidos: **25** (AC-001 a AC-503)

### Por grupo funcional:

| Grupo | ACs | Arquivos E2E | Status |
|-------|-----|-------------|--------|
| Landing Page | AC-001 a AC-005 | `landing-page.spec.ts` | Sem alterações (estável) |
| Registro | AC-101 a AC-106 | `registration.spec.ts` | Atualizado (confirmPassword + redirect) |
| Login | AC-201 a AC-206 | `login.spec.ts` | Atualizado (banner de sucesso) |
| Dashboard/Trips | AC-301 a AC-304 | `dashboard.spec.ts` | Corrigido via helper |
| Logout | AC-401 a AC-403 | `logout.spec.ts` | Corrigido via helper |
| Navegação | AC-501 a AC-503 | `navigation.spec.ts` | Atualizado (Header/Footer no 404) |
| Jornada Completa | Todos | `full-user-journey.spec.ts` | Atualizado |
| Trip Flow | — | `trip-flow.spec.ts` | Sem alterações |

---

## Alterações nos Testes E2E

### `tests/e2e/helpers.ts`
- `registerAndLogin()`: Adicionado `confirmPassword`, redirect para `/auth/login` (não mais `/verify-email`)
- Uso de `/^password$/i` para distinguir "Password" de "Confirm password"

### `tests/e2e/registration.spec.ts`
- **AC-101**: Verificação do campo "Confirm password"
- **AC-102**: Redirect para `/auth/login`, verificação do banner de sucesso
- **AC-103**: Preenchimento de `confirmPassword` nos dois registros
- **AC-104**: Preenchimento de `confirmPassword` + novo teste AC-104b (senhas diferentes)
- **AC-106**: Verificação de "Confirmar senha" em PT

### `tests/e2e/login.spec.ts`
- **AC-202**: Preenchimento de `confirmPassword` no registro, verificação do banner

### `tests/e2e/full-user-journey.spec.ts`
- Steps 3-5: `confirmPassword`, redirect automático para login, banner de sucesso

### `tests/e2e/navigation.spec.ts`
- **AC-503**: Verificação de Header/Footer na página 404

### `tests/e2e/dashboard.spec.ts` e `tests/e2e/logout.spec.ts`
- Corrigidos automaticamente via atualização do helper `registerAndLogin()`

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Testes unitários | 268 passando, 0 falhas |
| Testes E2E (arquivos) | 8 spec files |
| Testes E2E (cenários) | ~45 cenários |
| Build | Sucesso (0 erros, 0 warnings) |
| ACs cobertos por E2E | 25/25 |
| Bugs encontrados (manual) | 4 |
| Bugs corrigidos | 4 |
| Regressões | 0 |

---

## Pré-requisitos para Execução E2E

Antes de rodar `npx playwright test`:

1. Docker: `docker compose up -d` (PostgreSQL + Redis)
2. Banco: `npm run dev:setup`
3. Servidor: `npm run dev`
4. Playwright: `npx playwright install` (se necessário)

---

## Próximos Passos

- Validação manual pelo usuário (checklist em `memory/manual-test-checklist.md`)
- Iniciar Sprint 6 após aprovação: `npm run sprint:start 6`
