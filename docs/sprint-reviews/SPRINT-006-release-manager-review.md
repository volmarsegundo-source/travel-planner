# Sprint 6 -- Release Manager Review

**Agente**: release-manager
**Sprint**: 6 -- Debitos Tecnicos + Onboarding Wizard + Auth UX
**Branch**: `feat/sprint-6` -> `master` via PR #7
**Data**: 2026-03-04
**Veredicto**: APROVADO com acoes obrigatorias antes do merge

---

## 1. Resumo

Sprint 6 entrega 10 tarefas (T-038 a T-044, T-046 a T-048) que incluem: CSP com nonce dinamico por request, rate limiter atomico via Lua script, rate limit na `generateChecklistAction`, correcao de ARIA no UserMenu, atualizacao de Playwright config, novas variaveis de ambiente no `.env.example`, correcao de documentacao ADR-005, Onboarding Wizard completo com 3 etapas, trust signals nas paginas de auth, e Header/Footer no layout de autenticacao. A versao `package.json` permanece em 0.5.0 e precisa ser atualizada.

---

## 2. Breaking Changes -- Analise de Impacto

### 2.1 CSP Nonce Dinamico (T-038)

| Aspecto | Detalhe |
|---------|---------|
| O que mudou | Headers de seguranca (CSP, X-Frame-Options, etc.) migrados de `next.config.ts` (estatico) para `middleware.ts` (dinamico, com nonce por request) |
| Breaking? | **Nao** -- os headers sao os mesmos; a CSP agora e MAIS restritiva (remove `unsafe-eval` e `unsafe-inline` de scripts em producao, substitui por nonce) |
| Impacto | Scripts inline sem o atributo `nonce` serao bloqueados em producao. Scripts de terceiros (analytics, chat widgets) precisarao do nonce ou serem adicionados ao `script-src` |
| Risco | MEDIO -- se alguma dependencia futura injetar scripts inline sem nonce, sera bloqueada silenciosamente |
| Acao necessaria | Nenhuma imediata -- nao ha scripts de terceiros no projeto atual. Documentar requisito de nonce para futuras integracoes |

**Nota tecnica importante**: O nonce e passado via header `x-nonce` do middleware para o layout, mas o `src/app/[locale]/layout.tsx` atual **nao le esse header** para injeta-lo nas tags `<script>`. Isso significa que, por ora, o nonce esta disponivel mas nao e propagado para o HTML. Nao e breaking porque Next.js gerencia seus proprios scripts internamente, mas e um item de atencao para Sprint 7+ quando scripts inline forem necessarios.

### 2.2 Rate Limiter Atomico (T-039)

| Aspecto | Detalhe |
|---------|---------|
| O que mudou | `checkRateLimit()` migrou de `INCR` + `EXPIRE` (2 comandos separados) para Lua script atomico (`INCR` + condicional `EXPIRE` em 1 round-trip) |
| Breaking? | **Nao** -- a interface publica (`checkRateLimit(key, limit, windowSeconds) -> RateLimitResult`) permanece identica |
| Impacto | Correcao de race condition: antes, se o Redis falhasse entre `INCR` e `EXPIRE`, a chave ficaria sem TTL (memory leak + bloqueio permanente). Agora e atomico |
| Risco | BAIXO -- melhoria interna de robustez |

### 2.3 Rate Limit em generateChecklistAction (T-041)

| Aspecto | Detalhe |
|---------|---------|
| O que mudou | `generateChecklistAction` agora tem rate limit de 5 chamadas/hora/usuario (chave `ai:checklist:{userId}`) |
| Breaking? | **Nao para integracao** -- a assinatura da Server Action nao mudou. **Sim para comportamento** -- usuarios que antes podiam chamar a action ilimitadamente agora recebem `{ success: false, error: "errors.rateLimitExceeded" }` apos 5 chamadas/hora |
| Impacto | Mudanca de comportamento server-side, mas nao e breaking no sentido de SemVer (a interface e a mesma, o contrato de erro ja existia no tipo `ActionResult`) |
| Risco | BAIXO -- protecao contra abuso de API do Anthropic; o `generateTravelPlanAction` ja tinha rate limit (10/hora) desde Sprint 1 |

### 2.4 Redirect /trips -> /onboarding para novos usuarios (T-046)

| Aspecto | Detalhe |
|---------|---------|
| O que mudou | `/trips` agora redireciona para `/onboarding` se o usuario tem 0 viagens, exceto quando `?from=onboarding` esta presente (evita loop) |
| Breaking? | **Nao** -- e uma melhoria de UX para first-time users. Usuarios existentes com viagens nao sao afetados |
| Impacto | Mudanca de fluxo de navegacao para novos usuarios |
| Risco | BAIXO -- a protecao contra loop (`?from=onboarding`) esta implementada. Sem risco de redirect infinito |

### 2.5 Header/Footer no Auth Layout (T-048)

| Aspecto | Detalhe |
|---------|---------|
| O que mudou | `src/app/[locale]/auth/layout.tsx` agora inclui `<Header />` e `<Footer />` envolvendo o conteudo das paginas de login/registro |
| Breaking? | **Nao** -- mudanca visual que adiciona navegacao consistente nas paginas de auth |
| Impacto | As paginas de login e registro agora mostram Header e Footer, alinhando com o resto da aplicacao |
| Risco | MINIMO -- puramente visual |

### 2.6 Trust Signals no LoginForm (T-047)

| Aspecto | Detalhe |
|---------|---------|
| O que mudou | Componente `<TrustSignals />` adicionado no final do `LoginForm` |
| Breaking? | **Nao** -- aditivo, componente novo |
| Impacto | Melhora de confianca do usuario nas paginas de auth (badge de seguranca, link de privacidade) |

### 2.7 next.config.ts -- Remocao de headers() estaticos

| Aspecto | Detalhe |
|---------|---------|
| O que mudou | Funcao `headers()` removida do `next.config.ts` -- os mesmos headers agora sao setados dinamicamente no middleware |
| Breaking? | **Nao** -- os headers de seguranca continuam presentes nas respostas, apenas mudou o mecanismo de injecao |
| Impacto | Respostas de API (`/api/*`) podem nao receber mais os headers de seguranca porque o middleware faz `return` antes de processa-las (`if (pathname.startsWith("/api")) return;`). Isso e um **ponto de atencao** |
| Risco | MEDIO -- endpoints `/api/v1/health` e futuros endpoints REST nao terao CSP, X-Frame-Options etc. nos headers da resposta |

**ATENCAO**: Rotas `/api/*` nao recebem mais headers de seguranca. No Sprint 2, esses headers eram aplicados via `next.config.ts headers()` a TODAS as rotas (`source: "/(.*)"`) incluindo `/api/*`. Agora, o middleware faz `return` antes de chegar ao codigo que seta os headers. Recomendo tratar isso como item de acao para Sprint 7.

---

## 3. Versao -- Recomendacao de Bump

| Campo | Valor |
|-------|-------|
| Versao anterior | 0.5.0 |
| Nova versao recomendada | **0.6.0** |
| Tipo de bump | **MINOR** |
| Justificativa | Novas funcionalidades user-facing (Onboarding Wizard completo, Trust Signals, Header/Footer em auth) + melhorias internas (CSP nonce, rate limiter atomico, rate limit em checklist). Nenhum breaking change de API ou schema |

**SemVer rationale**: Pre-1.0 (0.x.y). O Sprint 6 adiciona funcionalidades significativas novas (onboarding wizard com 3 etapas, trust signals) e muda comportamento de seguranca (CSP com nonce). Nao remove nem altera interfaces existentes. MINOR e o bump correto.

**ACAO OBRIGATORIA**: `package.json` ainda contem `"version": "0.5.0"`. Deve ser atualizado para `"0.6.0"` antes do merge.

---

## 4. Notas de Migracao

### 4.1 Variaveis de Ambiente Novas

| Variavel | Obrigatoria? | Valor padrao | Onde usar | Descricao |
|----------|-------------|--------------|-----------|-----------|
| `REDIS_HOST` | Nao (fallback existe) | `localhost` | `.env.local` | Host do Redis para conexao ioredis |
| `REDIS_PORT` | Nao (fallback existe) | `6379` | `.env.local` | Porta do Redis para conexao ioredis |

**Impacto**: As variaveis ja existiam implicitamente no codigo do ioredis client. O `.env.example` agora as documenta explicitamente. Ambientes existentes que usam `REDIS_URL` continuam funcionando. **Nenhuma acao obrigatoria** para ambientes existentes.

### 4.2 Migracao de Schema de Banco de Dados

**Nenhuma migracao necessaria**. Sprint 6 nao altera o schema Prisma. Sem colunas adicionadas, removidas ou renomeadas.

### 4.3 Dependencias

**Nenhuma dependencia nova adicionada ou removida**. O `package.json` nao sofreu alteracoes de dependencias neste Sprint.

---

## 5. Changelog -- Proposta de Entrada

```markdown
## [0.6.0] - 2026-03-04

### Added
- Onboarding Wizard completo com 3 etapas: boas-vindas, dados da viagem (destino, datas, viajantes), e personalizacao (estilo de viagem, orcamento, moeda) — novos usuarios sao redirecionados automaticamente na primeira visita
- Componente `TrustSignals` com badge de seguranca e link de privacidade exibido nas paginas de login e registro
- Header e Footer adicionados ao layout de autenticacao (`/auth/*`) para consistencia visual com o resto da aplicacao
- Rate limit de 5 chamadas/hora/usuario na action `generateChecklistAction` para protecao contra abuso de API
- CSP (Content Security Policy) com nonce dinamico por request — scripts inline em producao agora requerem atributo `nonce` valido
- Variaveis de ambiente `REDIS_HOST` e `REDIS_PORT` documentadas no `.env.example`
- 23 arquivos modificados, incluindo novos testes unitarios para middleware CSP, rate limiter, ai.actions e auth layout

### Changed
- Rate limiter refatorado para usar Lua script atomico (`INCR` + `EXPIRE` em um unico round-trip), eliminando race condition que podia causar bloqueio permanente de usuarios
- Headers de seguranca (CSP, X-Frame-Options, HSTS, etc.) migrados de `next.config.ts` (estatico) para `middleware.ts` (dinamico) para suportar nonce por request
- ADR-005 corrigido: documentacao agora reflete corretamente a estrategia JWT (nao database sessions) usada pelo Auth.js
- Playwright config atualizado com novos projetos de teste (desktop-1280, firefox, webkit, Mobile Chrome, smoke)
- Onboarding Wizard agora inclui formulario funcional (destino, datas, viajantes, estilo, orcamento) em vez de telas placeholder

### Fixed
- Race condition no rate limiter onde `INCR` podia suceder mas `EXPIRE` falhar, deixando chave sem TTL no Redis (memory leak + bloqueio permanente do usuario)
- ADR-005 incorretamente documentava "database session strategy" quando o codigo usa JWT
```

---

## 6. Consistencia de Ambiente

### 6.1 `.env.example` vs `.env.local`

| Variavel | `.env.example` | Status |
|----------|---------------|--------|
| `REDIS_HOST` | `localhost` | NOVA -- documentada neste sprint |
| `REDIS_PORT` | `6379` | NOVA -- documentada neste sprint |
| Demais variaveis | Sem alteracao | OK |

**Acao**: Desenvolvedores que ja possuem `.env.local` **nao precisam** adicionar `REDIS_HOST`/`REDIS_PORT` se ja usam `REDIS_URL`. As novas variaveis sao opcionais.

### 6.2 Paridade Local/Staging/Producao

| Item | Status | Nota |
|------|--------|------|
| Schema Prisma | OK | Sem alteracoes neste sprint |
| Migrations | OK | Nenhuma migration necessaria |
| Variaveis de ambiente | OK | Novas vars sao opcionais |
| Headers de seguranca | ATENCAO | Rotas `/api/*` perderam headers de seguranca -- ver secao 2.7 |
| Dependencias | OK | Sem alteracoes |
| Docker Compose | OK | Sem alteracoes |
| CI/CD | OK | Sem alteracoes |

### 6.3 Riscos Herdados de Sprints Anteriores

Os seguintes riscos do registro `docs/release-risk.md` permanecem abertos:

| Risk ID | Severidade | Status |
|---------|-----------|--------|
| RISK-003 | ALTO | ABERTO -- `avatarUrl` removido sem verificar dados existentes |
| RISK-004 | ALTO | ABERTO -- Health check 503, monitors nao atualizados |
| RISK-005 | ALTO | ABERTO -- `deploy.yml` ainda e placeholder |
| RISK-006 | ALTO | ABERTO -- GitHub Actions secrets nao confirmados |
| RISK-007 | MEDIO | ABERTO -- `next-auth` fixado em beta |
| RISK-008 | MEDIO | ABERTO -- Diagrama de schema desatualizado |
| RISK-009 | BAIXO | ABERTO -- `typedRoutes` desabilitado |

---

## 7. Novos Riscos Identificados (Sprint 6)

| Risk ID | Severidade | Categoria | Descricao | Owner | Prazo |
|---------|-----------|-----------|-----------|-------|-------|
| RISK-010 | MEDIO | Seguranca | Rotas `/api/*` nao recebem mais headers de seguranca (CSP, X-Frame-Options, etc.) porque o middleware faz `return` antes de seta-los. No Sprint 2 esses headers eram aplicados via `next.config.ts headers()` a todas as rotas | dev-fullstack-1 | Sprint 7 |
| RISK-011 | BAIXO | Seguranca | CSP nonce gerado no middleware mas nao propagado para o HTML (layout nao le header `x-nonce`). Quando scripts inline forem necessarios, sera preciso ler o nonce do header e injeta-lo | dev-fullstack-1 | Quando necessario |
| RISK-012 | BAIXO | UX | Onboarding Wizard usa `useRouter` de `next/navigation` (linha 5 do OnboardingWizard.tsx) em vez de `@/i18n/navigation` -- pode causar navegacao sem locale prefix em edge cases | dev-fullstack-1 | Sprint 7 |

---

## 8. Acoes Obrigatorias Pre-Merge

| ID | Acao | Responsavel | Status |
|----|------|-------------|--------|
| ACT-001 | Atualizar `package.json` version de `0.5.0` para `0.6.0` | dev-fullstack-1 | PENDENTE |
| ACT-002 | Adicionar entrada `[0.6.0] - 2026-03-04` no `CHANGELOG.md` com conteudo da secao 5 acima | dev-fullstack-1 | PENDENTE |
| ACT-003 | Adicionar link `[0.6.0]` no rodape do `CHANGELOG.md` | dev-fullstack-1 | PENDENTE |
| ACT-004 | Atualizar `docs/release-risk.md` com RISK-010, RISK-011, RISK-012 | release-manager | PENDENTE |

---

## 9. Rollback Plan

1. Revert merge commit do PR #7 em `master`
2. Nenhuma migration de banco necessaria -- Sprint 6 nao alterou schema
3. Headers de seguranca voltam a ser servidos via `next.config.ts headers()` (comportamento anterior)
4. Sem impacto em dados persistidos -- nenhuma alteracao de schema
5. Rate limit da `generateChecklistAction` sera removido (comportamento anterior: sem limite)

---

## 10. Veredicto Final

**APROVADO com acoes obrigatorias** (ACT-001 a ACT-004 devem ser concluidas antes do merge).

Justificativa: Sprint 6 e um release MINOR (0.5.0 -> 0.6.0) com funcionalidades novas significativas e melhorias de seguranca. Nao ha breaking changes de API ou schema. Os riscos identificados (RISK-010 a RISK-012) sao de severidade media/baixa e nao bloqueiam o merge, mas devem ser priorizados no Sprint 7.

Ponto de atencao principal: a perda de headers de seguranca em rotas `/api/*` (RISK-010) deve ser tratada no proximo sprint, antes de qualquer endpoint REST adicional ser exposto.

---

*Review conduzida em 2026-03-04 pelo release-manager.*
