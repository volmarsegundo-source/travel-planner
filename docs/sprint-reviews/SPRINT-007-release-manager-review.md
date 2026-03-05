## Release Manager Review

**Reviewer**: release-manager
**Date**: 2026-03-05
**Sprint**: 7
**Branch**: `feat/sprint-7` (2 commits: `02bd891`, `53bac30`)
**Verdict**: APPROVED WITH CONDITIONS

---

### Version Assessment

| Item | Valor |
|------|-------|
| Versao atual em `package.json` | 0.6.0 |
| Versao recomendada | **0.7.0** |
| Tipo de bump | MINOR |

**Justificativa SemVer**: Sprint 7 adiciona funcionalidade nova backward-compatible (perfil de usuario, exclusao de conta, loading skeletons, error boundaries, script de automacao de plano de testes). Nenhuma API publica existente foi alterada ou removida. A migration de banco adiciona uma coluna nullable -- nao quebra nada. Pre-1.0, MINOR e o bump correto para novas features sem breaking changes.

**CONDICAO**: Antes do merge, `package.json` deve ser atualizado de `"version": "0.6.0"` para `"version": "0.7.0"`. Observacao critica: a entrada `[0.6.0]` referente ao Sprint 6 NUNCA foi adicionada ao `CHANGELOG.md` (item pendente do SPRINT-006-release-manager-review). Ambas as entradas (0.6.0 e 0.7.0) devem ser adicionadas antes do merge.

---

### Breaking Changes

**Nenhuma breaking change identificada.**

Analise detalhada:

| Mudanca | Tipo | Breaking? | Razao |
|---------|------|-----------|-------|
| `User.preferredLocale` adicionado ao schema | Schema (coluna nullable com default) | Nao | Coluna nova, nullable, com `DEFAULT 'pt-BR'` -- codigo existente nao referencia este campo |
| Server Actions `updateUserProfileAction` e `deleteUserAccountAction` | Funcionalidade nova | Nao | Endpoints novos -- nenhum consumidor existente afetado |
| `Footer` recebe prop `variant` | Interface de componente | Nao | Prop opcional com default `"public"` -- chamadas existentes sem prop continuam funcionando |
| `UserMenu` adiciona link `/account` | UI | Nao | Aditivo -- dropdown ganha item novo, itens existentes inalterados |
| Loading skeletons e error boundaries | Paginas novas | Nao | Arquivos novos em rotas existentes -- Next.js App Router os consome automaticamente |
| `npm run test:plan` adicionado ao `package.json` | Script novo | Nao | Aditivo -- nenhum script existente foi alterado |

---

### Migration Notes

#### Migration de banco de dados (obrigatoria)

A migration `20260305014239_add_user_preferred_locale` adiciona uma coluna ao modelo `User`:

```sql
ALTER TABLE "users" ADD COLUMN "preferredLocale" VARCHAR(10) DEFAULT 'pt-BR';
```

**Risco**: BAIXO. Coluna nullable com valor default. Nao requer downtime. Compativel com rollback (coluna pode ser removida sem afetar codigo anterior).

**Procedimento antes do deploy**:
```bash
npx prisma migrate deploy
```

#### Variaveis de ambiente

Nenhuma variavel de ambiente nova. O `.env.example` nao foi alterado no Sprint 7. Todas as funcionalidades novas utilizam variaveis ja existentes.

#### Dependencias

Nenhuma dependencia nova adicionada em `package.json`. As dependencias existentes nao sofreram bump de versao neste sprint.

---

### Changelog

**ALERTA**: O `CHANGELOG.md` esta desatualizado. A entrada `[0.6.0]` referente ao Sprint 6 nunca foi adicionada (verificado: o arquivo pula de `[0.5.0]` direto). Antes do merge, as seguintes entradas devem ser adicionadas:

#### Entrada 0.6.0 (Sprint 6 -- pendente)

```markdown
## [0.6.0] - 2026-03-04

### Added
- Onboarding Wizard de 3 passos para novos usuarios (welcome, destino, estilo+IA)
- Indicador visual de progresso (`ProgressIndicator`) para o wizard
- Trust Signals badge com aviso de privacidade (LGPD) na tela de registro
- Layout dedicado para paginas de autenticacao (`auth/layout.tsx`) com Header e Footer
- Rate limiter atomico com script Lua para Redis (`src/lib/rate-limit.ts`)

### Changed
- CSP (Content-Security-Policy) migrado de `next.config.ts` para middleware com nonce per-request via `crypto.randomUUID()`
- Total de testes unitarios: 258 -> 297
```

#### Entrada 0.7.0 (Sprint 7)

```markdown
## [0.7.0] - 2026-03-05

### Added
- Pagina de perfil do usuario (`/account`) com edicao de nome e idioma preferido
- Exclusao de conta com anonimizacao de PII (LGPD) — fluxo em 2 passos com confirmacao por email, soft delete + anonimizacao em transacao atomica
- Campo `preferredLocale` no modelo `User` (migration: `20260305014239_add_user_preferred_locale`)
- Link "Minha conta" no `UserMenu` dropdown com navegacao para `/account`
- Footer persistente em todas as paginas autenticadas (variante `authenticated` com links Terms, Privacy, Support)
- 4 loading skeletons: `/trips`, `/trips/[id]`, `/account`, e app-level — todos com `role="status"` e `aria-label`
- 2 error boundaries: app-level e trip-level — com botao "Tentar novamente" e link "Voltar"
- Skeleton animado para geracao de checklist com mensagens rotativas (`ChecklistGeneratingSkeleton`)
- Skeleton e spinner no botao "Adicionar dia" do editor de itinerario
- Estilizacao "trip not found" com card AlertCircle em 4 paginas de detalhe de viagem
- Script `generate-test-plan.js` para automacao de planos de teste por sprint (`npm run test:plan`)
- Documentacao de testes atualizada (`docs/dev-testing-guide.md`)
- 152 testes novos (total: 297 -> 449)
- Chaves i18n completas para perfil e erros em PT-BR e EN (namespace `account`, `errors.boundary`, `errors.tripNotFound`)

### Changed
- Total de testes unitarios: 297 -> 449 (adicionados 152 testes para perfil, exclusao de conta, skeletons, error boundaries, loading states e script de plano de testes)

### Fixed
- `OnboardingWizard` agora importa `useRouter` de `@/i18n/navigation` em vez de `next/navigation` (correcao de RISK-012)
```

---

### Environment Consistency

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| `.env.example` | OK | Nenhuma variavel nova -- template atualizado |
| Migration versionada | OK | `20260305014239_add_user_preferred_locale` presente em `prisma/migrations/` |
| `migration_lock.toml` | OK | Atualizado corretamente |
| Docker Compose | OK | Sem alteracoes -- Postgres + Redis inalterados |
| CI/CD (`ci.yml`) | OK | Sem alteracoes neste sprint |
| Deploy (`deploy.yml`) | PENDENTE | Ainda placeholder (RISK-005 -- pre-existente, nao introduzido neste sprint) |
| Build de producao | OK | Confirmado pelo QA (QA-REL-007) |
| Paridade local/staging/prod | ATENCAO | A migration deve ser aplicada em staging/prod antes do deploy. Sem a migration, queries a `preferredLocale` falharao |

---

### Riscos Abertos -- Atualizacao do Risk Register

#### Riscos resolvidos neste sprint

| Risk ID | Descricao | Resolucao |
|---------|-----------|-----------|
| RISK-012 | OnboardingWizard usa `useRouter` de `next/navigation` | Corrigido -- agora importa de `@/i18n/navigation` (confirmado via grep) |

#### Riscos ainda abertos (pre-existentes, nao introduzidos neste sprint)

| Risk ID | Severidade | Status |
|---------|-----------|--------|
| RISK-003 | ALTO -- `avatarUrl` removido sem verificar dados existentes | Aberto |
| RISK-004 | ALTO -- Health check 503 monitors nao atualizados | Aberto |
| RISK-005 | ALTO -- `deploy.yml` placeholder | Aberto |
| RISK-006 | ALTO -- GitHub Actions secrets nao confirmados | Aberto |
| RISK-007 | MEDIO -- `next-auth` pinned em beta (agora `5.0.0-beta.30`) | Aberto |
| RISK-008 | MEDIO -- Diagrama de schema desatualizado em architecture.md | Aberto (agravado: `preferredLocale` tambem ausente agora) |
| RISK-009 | BAIXO -- `typedRoutes` desabilitado | Aberto |
| RISK-010 | MEDIO -- Rotas `/api/*` sem headers de seguranca | Aberto (middleware.ts nao foi alterado neste sprint) |
| RISK-011 | BAIXO -- CSP nonce nao propagado para HTML | Aberto |

#### Novos riscos identificados neste sprint

| Risk ID | Severidade | Categoria | Descricao | Owner | Prazo |
|---------|-----------|-----------|-----------|-------|-------|
| RISK-013 | BAIXO | PII/Logging | `logger.info("account.profileUpdated", { userId: session.user.id })` loga userId em texto claro. Deveria usar hash como faz o `deleteUserAccountAction`. Documentado como BUG-S7-001 pelo QA | dev-fullstack-1 | Sprint 8 |
| RISK-014 | BAIXO | UX/i18n | Label "Portugues (Brasil)" em `ProfileForm.tsx` esta sem acento (falta til no "e"). BUG-S7-002 | dev-fullstack-1 | Sprint 8 |
| RISK-015 | MEDIO | UX/Navegacao | Footer autenticado linka para `/terms`, `/privacy`, `/support` que resultam em 404. BUG-S7-004 | dev-fullstack-1 | Sprint 8 |
| RISK-016 | BAIXO | i18n | `aria-label="Loading"` hardcoded em ingles nos 4 loading skeletons -- deveria usar chave i18n. BUG-S7-006 | dev-fullstack-1 | Sprint 8 |

---

### Validacao QA

O documento QA-REL-007 (`docs/test-results/QA-REL-007.md`) foi revisado:

- 449 testes unitarios passando, 0 falhas
- Build de producao limpo
- Lint sem erros (1 warning pre-existente)
- Type check sem erros
- i18n check sem chaves faltando
- 7 bugs conhecidos documentados, todos S3-Medium ou inferior
- Checklist de seguranca completo (auth guard, BOLA, Zod, PII anonymization)

**Avaliacao**: QA sign-off e adequado. Nenhum bloqueador identificado.

---

### Condicoes para Merge

1. **OBRIGATORIO**: Atualizar `"version"` em `package.json` de `"0.6.0"` para `"0.7.0"`
2. **OBRIGATORIO**: Adicionar entradas `[0.6.0]` e `[0.7.0]` ao `CHANGELOG.md` conforme descrito na secao Changelog acima
3. **OBRIGATORIO**: Atualizar `docs/release-risk.md` com: fechamento de RISK-012, adicao de RISK-013 a RISK-016, e registro do CIA-004/Sprint 7 na tabela de assessments
4. **RECOMENDADO**: Atualizar versioning history em `docs/release-risk.md` com a entrada `0.7.0 | 2026-03-05 | MINOR | Perfil de usuario, exclusao de conta (LGPD), loading/error states, test automation -- sem breaking changes`

---

### Versioning History Update

| Versao | Data | Tipo de Bump | Justificativa |
|--------|------|-------------|---------------|
| 0.7.0 | 2026-03-05 | MINOR | Perfil de usuario, exclusao de conta (LGPD), loading/error states, test automation -- sem breaking changes |

---

> APPROVED WITH CONDITIONS -- non-breaking, version bump: MINOR (0.6.0 -> 0.7.0). Condicoes: (1) bump de versao em package.json, (2) entradas 0.6.0 e 0.7.0 no CHANGELOG.md, (3) atualizacao do release-risk.md. Sem breaking changes, sem migration destrutiva, sem variaveis de ambiente novas.
