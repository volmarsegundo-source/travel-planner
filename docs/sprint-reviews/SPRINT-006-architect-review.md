# Sprint 6 -- Revisao Arquitetural

**Revisor**: architect
**Data**: 2026-03-04
**Branch**: `feat/sprint-6`
**Versao**: 0.6.0 (297 testes, 0 falhas)
**Status**: APROVADO COM OBSERVACOES

---

## 1. Decisoes Arquiteturais do Sprint 6

### 1.1 CSP Nonce per Request (T-038) -- APROVADO

**O que foi feito**: Geracao de nonce via `crypto.randomUUID()` no middleware Edge, injetado no header CSP por request e propagado ao layout via header customizado `x-nonce`.

**Avaliacao**:

- (+) `unsafe-eval` removido do `script-src` em producao -- elimina o risco CRITICO identificado na revisao do Sprint 5.
- (+) `unsafe-eval` mantido apenas em desenvolvimento (necessario para HMR/Turbopack) -- decisao correta e bem documentada no codigo.
- (+) Nonce gerado com `crypto.randomUUID()` -- disponivel nativamente no Edge Runtime, sem dependencia externa.
- (+) Estrategia de propagacao via `x-nonce` request header e padrao reconhecido no ecossistema Next.js.
- (+) Headers de seguranca adicionais configurados corretamente: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `HSTS` (somente producao).
- (!) `style-src` ainda contem `unsafe-inline` tanto em dev quanto em producao. Isso e uma limitacao conhecida do Tailwind CSS (estilos inline dinamicos) e nao existe solucao pratica no ecossistema atual sem impacto significativo de DX. Aceito como trade-off documentado.
- (!) O nonce e propagado via `x-nonce` header mas o `LocaleLayout` (`src/app/[locale]/layout.tsx`) nao o consome atualmente para adicionar `nonce` a tags `<script>`. Isso funciona porque o Next.js injeta scripts com mecanismo proprio, mas deve ser revisitado se scripts inline customizados forem adicionados futuramente.

**Conformidade com ADRs**: Sem desvio. Nenhum novo ADR necessario -- e uma correcao de implementacao, nao uma decisao arquitetural nova.

**Teste**: `tests/unit/middleware/csp.test.ts` -- 5 testes cobrindo: formato UUID do nonce, CSP de producao sem `unsafe-eval`, CSP de dev com `unsafe-eval`, ausencia de `unsafe-inline` em `script-src`, e unicidade de nonces. Cobertura adequada.

---

### 1.2 Rate Limiter Atomico com Lua Script (T-039) -- APROVADO

**O que foi feito**: Substituicao das chamadas separadas `INCR` + `EXPIRE` por um unico script Lua executado via `redis.eval()`.

**Avaliacao**:

- (+) Elimina a race condition documentada na revisao do Sprint 5 (ALTO). O script Lua `INCR` + condicional `EXPIRE` (se count == 1) e executado atomicamente pelo Redis em thread unica.
- (+) Interface publica mantida identica (`checkRateLimit(key, limit, windowSeconds)`) -- retrocompatibilidade total.
- (+) Fallback gracioso: se Redis estiver indisponivel, a requisicao e permitida (`allowed: true`). Isso e a decisao correta para um MVP -- preferir disponibilidade sobre protecao em caso de falha de infraestrutura.
- (+) Bucketing temporal via `Math.floor(now / (windowSeconds * 1000))` no nome da chave -- janelas fixas (tumbling window), simples e previsivel.
- (i) A estrategia de fixed window tem o problema classico de "burst na fronteira" (ate 2x o limite em janelas adjacentes). Para o MVP e volumes esperados, isso e aceitavel. Se necessario no futuro, migrar para sliding window log ou GCRA.

**Conformidade com ADRs**: Sem desvio. Corrige deficiencia documentada no Sprint 5.

**Teste**: `tests/unit/lib/rate-limit.test.ts` -- 8 testes cobrindo: allowed within limit, allowed at limit, blocked over limit, Lua script verification, atomicity assertion, fallback on Redis error, resetAt timestamp, e window key format. Cobertura excelente.

---

### 1.3 Rate Limit para generateChecklistAction (T-041) -- APROVADO

**O que foi feito**: Adicionado `checkRateLimit("ai:checklist:{userId}", 5, 3600)` no inicio do `generateChecklistAction`.

**Avaliacao**:

- (+) Resolve o risco ALTO de exposicao financeira a API Anthropic identificado na revisao do Sprint 5.
- (+) Limite de 5 req/hora/usuario e adequado para o caso de uso (checklist nao muda frequentemente).
- (+) Padroes consistentes com `generateTravelPlanAction` que ja tinha rate limit (10 req/hora).
- (+) BOLA check mantido apos rate limit -- ordem correta (rate limit antes de consulta ao banco).
- (+) Erro retornado como `errors.rateLimitExceeded` -- chave i18n disponivel em ambos os idiomas.

**Conformidade com ADRs**: Consistente com ADR-003 (Claude AI Integration).

**Teste**: `tests/unit/server/ai.actions.test.ts` -- 5 testes cobrindo ambas as actions (checklist e plan): verificacao de chave, limite, e comportamento quando bloqueado. Adequado.

---

### 1.4 Correcao ADR-005: JWT Sessions (T-040) -- APROVADO

**O que foi feito**: Texto do ADR-005 em `docs/architecture.md` corrigido de "database sessions" para "JWT session strategy". Explica que PrismaAdapter persiste User/Account mas sessions sao JWT stateless.

**Avaliacao**:

- (+) Elimina a inconsistencia documentacao-vs-codigo que estava gerando confusao (identificada nos Sprints 2 e 5).
- (+) Trade-offs bem documentados: sessions nao podem ser revogadas individualmente, mas ganho de performance e compatibilidade Edge.
- (+) Sugestao futura documentada (Redis deny-list para revogacao).
- (i) O titulo do ADR agora e "Auth.js JWT Session Strategy" com data revisada "revised 2026-03-04" -- formato adequado.

**Conformidade com ADRs**: Este item E a correcao do ADR. Status aceito.

---

### 1.5 Onboarding Wizard 3-Step (T-046) -- APROVADO COM OBSERVACOES

**O que foi feito**: Componente `OnboardingWizard.tsx` (Client Component) com 3 passos: boas-vindas, detalhes da viagem, estilo+orcamento. Integracao com `createTripAction` + `generateTravelPlanAction`. Redirect automatico de `/trips` para `/onboarding` quando usuario tem 0 viagens.

**Avaliacao arquitetural**:

- (+) Separacao correta de responsabilidades: `OnboardingPage` (Server Component) faz auth check e extrai dados de sessao; `OnboardingWizard` (Client Component) gerencia o estado do wizard.
- (+) Reutilizacao de actions existentes (`createTripAction`, `generateTravelPlanAction`) em vez de criar endpoints duplicados -- aderente ao principio de Single Responsibility.
- (+) `ProgressIndicator` extraido como componente proprio -- boa composicao.
- (+) `LoadingPlanAnimation` reutilizada do Sprint anterior -- DRY.
- (+) Skip funcional em todos os passos com `?from=onboarding` para evitar loop de redirect.
- (+) ARIA: `role="radiogroup"` com `role="radio"` + `aria-checked` para estilos de viagem; `aria-live="polite"` no container de step; `aria-describedby` nos campos de formulario com erro.
- (+) `motion-reduce:transition-none` -- respeita `prefers-reduced-motion`.
- (+) i18n completo em ambos os idiomas (namespace `onboarding`).

**Observacoes**:

1. **Estado local vs. form library**: O wizard usa `useState` puro para gerenciamento de formulario em vez de React Hook Form + Zod, que e o padrao definido no stack (ADR-001). Para um formulario de 4 campos com validacao simples, `useState` e aceitavel no contexto de onboarding. Porem, se o formulario crescer (Sprint futuro), deve ser migrado para React Hook Form + Zod para manter consistencia.

2. **Validacao apenas no cliente**: A validacao de Step 2 (`validateStep2()`) e puramente client-side. Os dados sao passados ao `createTripAction` que faz validacao via Zod server-side, entao nao ha risco de seguranca. Porem, duplicar a validacao client-side com o Zod schema existente (`TripCreateSchema` ou derivado) seria mais seguro contra regressoes.

3. **Spread no handleStep3Cta**: A chamada `createTripAction({...})` mapeia campos explicitamente -- bom, sem mass assignment.

4. **Tratamento de falha parcial**: Se `createTripAction` sucede mas `generateTravelPlanAction` falha, o wizard redireciona para `/trips/{id}/itinerary` (trip criada mas sem plano). Isso e a decisao correta -- o usuario pode gerar o plano manualmente depois. O codigo documenta isso com comentario inline.

5. **Back button no Step 3**: O botao "voltar" usa uma expressao condicional que sempre resulta em `\u2190` (seta esquerda). O codigo `t("step2.cta") === t("step2.cta") ? "\u2190" : "\u2190"` e um tautologia -- provavelmente resquicio de refatoracao. Funciona, mas o ternario e desnecessario. Deveria ser simplesmente `"\u2190"` ou melhor, uma chave i18n como `common.back`.

6. **Tipo `TravelStyle`**: Importado de `@/types/ai.types` -- correto, centralizado.

7. **PII na OnboardingPage**: O `userName` e derivado de `session.user.name` ou do local-part do email. O comentario documenta "Never expose full email in UI" -- bom.

**Conformidade com ADRs**: Consistente com ADR-006 (route group `(app)`) e ADR-003 (AI integration). O uso de `useRouter` de `next/navigation` em vez de `@/i18n/navigation` e um DESVIO MENOR -- funciona porque as rotas internas do wizard sao relativas e o locale ja esta no path, mas viola a convencao documentada.

---

### 1.6 Auth Layout com Header/Footer (T-048) -- APROVADO

**O que foi feito**: Layout `src/app/[locale]/auth/layout.tsx` atualizado para incluir `<Header />` e `<Footer />` em torno do conteudo de auth.

**Avaliacao**:

- (+) Estrutura limpa: `flex min-h-screen flex-col` garante que o footer nao flutue.
- (+) Header e Footer reutilizados (componentes da landing page) -- DRY e consistencia visual.
- (+) Layout centralizado com `flex-1 items-center justify-center` -- formulario permanece no centro.
- (+) Server Component async com `getTranslations` -- padrao correto.

**Conformidade com ADRs**: Sem desvio.

**Teste**: `tests/unit/app/auth-layout.test.tsx` -- 4 testes verificando presenca de Header (nav), Footer (copyright), children, e heading. Adequado.

---

### 1.7 Trust Signals (T-047) -- APROVADO COM OBSERVACAO

**O que foi feito**: Componente `TrustSignals` criado em `src/components/features/auth/TrustSignals.tsx` com icone de cadeado SVG inline, texto de privacidade, e link para exclusao de conta.

**Avaliacao**:

- (+) Componente leve, sem dependencias externas.
- (+) SVG com `aria-hidden="true"` -- acessivel.
- (+) Textos via i18n (namespace `trustSignals`).
- (!) O link "Delete my account" aponta para `/account/delete` usando `Link` de `next/link` em vez de `@/i18n/navigation`. Isso significa que o link NAO tera o prefixo de locale automaticamente (ex: `/en/account/delete`). Em producao, isso resultara em 404 ou redirect inesperado. **Deve ser corrigido no Sprint 7**.
- (!) A rota `/account/delete` nao existe ainda (planejada para Sprint 7, T-051). O link aponta para uma pagina inexistente. Aceitavel se o Sprint 7 implementar antes do deploy, mas deve ser monitorado.

**Conformidade com ADRs**: DESVIO MENOR -- uso de `next/link` em vez de `@/i18n/navigation` (ADR-004/convencao i18n).

---

### 1.8 Playwright Config Condicional (T-043) -- APROVADO

**O que foi feito**: `playwright.config.ts` atualizado com `workers: process.env.CI ? 1 : undefined` e `timeout: process.env.CI ? 90_000 : 45_000`.

**Avaliacao**:

- (+) Worker unico em CI evita contention em runners com recursos limitados.
- (+) Timeout mais generoso em CI (90s vs 45s local) acomoda variancia de performance.
- (+) `retries: process.env.CI ? 2 : 1` -- ja estava parcialmente configurado, agora consistente.

**Conformidade com ADRs**: Sem desvio. Melhoria operacional.

---

### 1.9 .env.example atualizado (T-044) -- APROVADO

**O que foi feito**: `REDIS_HOST` e `REDIS_PORT` documentados em `.env.example` com comentario explicativo.

**Avaliacao**:

- (+) Facilita onboarding de novos desenvolvedores.
- (i) Esses valores sao usados pelo `ioredis` client em `src/server/cache/redis.ts`, porem o codigo atual usa `env.REDIS_URL` (string de conexao completa) e nao `REDIS_HOST`/`REDIS_PORT` separadamente. Os valores no `.env.example` sao informativos/documentais, nao consumidos diretamente pelo codigo. Aceitavel para MVP.

---

## 2. Limites de Componentes e Implicacoes de Escalabilidade

### 2.1 Middleware -- Complexidade Crescente

O `src/middleware.ts` acumula agora 4 responsabilidades:
1. Autenticacao (NextAuth Edge)
2. i18n (next-intl routing)
3. Protecao de rotas (redirect para login)
4. Geracao de CSP nonce + headers de seguranca

O arquivo tem 123 linhas -- ainda gerenciavel. Porem, se mais responsabilidades forem adicionadas (ex: rate limiting no Edge, feature flags, A/B testing), o middleware deve ser refatorado para um pattern de chain-of-responsibility ou pipeline. **Nao e urgente no Sprint 7, mas deve ser monitorado**.

### 2.2 OnboardingWizard -- Componente Monolitico

O `OnboardingWizard.tsx` tem 397 linhas e gerencia 3 steps, validacao, chamadas a 2 actions, e estado de loading. Para o escopo atual, e aceitavel. Se novos steps forem adicionados (ex: selecao de atividades, upload de foto), o componente deve ser refatorado para:
- Step components individuais (`Step1Welcome.tsx`, `Step2TripDetails.tsx`, `Step3StyleBudget.tsx`)
- Hook customizado `useOnboardingWizard()` para logica de estado

### 2.3 Rate Limiter -- Escalabilidade Horizontal

O rate limiter com fixed window funciona bem para o MVP. Em cenarios de alta carga futura:
- **Problema**: burst de ate 2x o limite na fronteira entre janelas
- **Solucao futura**: migrar para sliding window counter (Redis sorted sets) ou GCRA
- **Quando**: quando o numero de usuarios ativos ultrapassar 1.000 simultaneos

### 2.4 Redis Singleton -- Correcao Parcial

O `src/server/cache/redis.ts` agora usa `globalThis` pattern para singleton, porem com a condicao `if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis`. Isso significa que em **producao** o singleton NAO e persistido em `globalThis`, o que pode causar multiplas conexoes Redis se o modulo for re-importado (cenario de cold start em serverless). Este e um item documentado como MEDIO na revisao do Sprint 5 e **permanece aberto**. Para Railway/Render (deploy target), isso e menos critico que para Vercel serverless, mas deve ser corrigido removendo a condicao de environment.

---

## 3. Desvios de ADRs

| ADR | Desvio | Severidade | Acao |
|-----|--------|-----------|------|
| ADR-004 (i18n) | `TrustSignals.tsx` usa `Link` de `next/link` em vez de `@/i18n/navigation` | Menor | Corrigir no Sprint 7 -- link para `/account/delete` nao tera prefixo de locale |
| ADR-004 (i18n) | `OnboardingWizard.tsx` usa `useRouter` de `next/navigation` em vez de `@/i18n/navigation` | Menor | Funciona no contexto atual mas viola convencao. Corrigir no Sprint 7 |
| Convencao (Forms) | OnboardingWizard usa `useState` puro em vez de React Hook Form + Zod | Menor | Aceitavel para 4 campos. Migrar se formulario crescer |

Nenhum desvio CRITICO ou ALTO identificado.

---

## 4. Divida Arquitetural

### 4.1 Divida Introduzida no Sprint 6

| ID | Item | Severidade | Sprint sugerido |
|----|------|-----------|-----------------|
| DT-010 | `TrustSignals.tsx` usa `next/link` em vez de `@/i18n/navigation` -- link quebrado em producao com locale | ALTO | Sprint 7 |
| DT-011 | `OnboardingWizard.tsx` usa `useRouter` de `next/navigation` em vez de `@/i18n/navigation` | MEDIO | Sprint 7 |
| DT-012 | OnboardingWizard monolitico (397 linhas, 3 steps + logica) -- extrair step components se crescer | BAIXO | Sprint 8+ |
| DT-013 | Botao "voltar" no Step 3 usa ternario tautologico em vez de chave i18n `common.back` | BAIXO | Sprint 7 |
| DT-014 | `TrustSignals` link para `/account/delete` aponta para rota inexistente (Sprint 7) | MEDIO | Sprint 7 |

### 4.2 Divida Herdada Resolvida no Sprint 6

| ID | Item | Status |
|----|------|--------|
| CRITICO | CSP com `unsafe-eval` + `unsafe-inline` em `script-src` | RESOLVIDO (T-038) |
| ALTO | `generateChecklistAction` sem rate limit | RESOLVIDO (T-041) |
| ALTO | Rate limiter race condition (INCR + EXPIRE nao atomico) | RESOLVIDO (T-039) |
| MEDIO | ADR-005 texto inconsistente (database vs JWT) | RESOLVIDO (T-040) |

### 4.3 Divida Herdada Nao Resolvida (pendente)

| ID | Item | Severidade | Sprint sugerido |
|----|------|-----------|-----------------|
| DT-004 | `updateTrip` usa spread implicito -- risco de mass assignment | ALTO | Sprint 7 |
| MEDIO | Redis singleton nao persistido em `globalThis` em producao | MEDIO | Sprint 7 |
| MEDIO | `getAnthropic()` bypassa `env.ts` (le `process.env` diretamente) | MEDIO | Sprint 8 |
| MEDIO | `auth.ts` usa `process.env` para Google credentials | MEDIO | Sprint 8 |
| ALTO | `ChecklistItem.priority` missing no Prisma schema | ALTO | Sprint 7 |

---

## 5. Analise de Seguranca Arquitetural

### 5.1 CSP -- Posicao Atual

```
Producao:
  default-src 'self'
  script-src 'self' 'nonce-{UUID}'        -- SEM unsafe-eval, SEM unsafe-inline
  style-src 'self' 'unsafe-inline'         -- necessario para Tailwind (trade-off aceito)
  img-src 'self' data: https:
  connect-src 'self' https:
  font-src 'self'
  + X-Frame-Options: DENY
  + X-Content-Type-Options: nosniff
  + Referrer-Policy: strict-origin-when-cross-origin
  + Permissions-Policy: camera=(), microphone=(), geolocation=()
  + HSTS: max-age=31536000; includeSubDomains

Desenvolvimento:
  script-src inclui 'unsafe-eval' (HMR)
  connect-src inclui ws: (WebSocket HMR)
```

Posicao significativamente melhor que no Sprint 5. O risco CRITICO de XSS via `unsafe-eval` em producao foi eliminado.

### 5.2 Rate Limiting -- Posicao Atual

| Endpoint | Limite | Janela | Status |
|----------|--------|--------|--------|
| `generateTravelPlanAction` | 10 req | 1 hora | Ativo (Sprint anterior) |
| `generateChecklistAction` | 5 req | 1 hora | Ativo (Sprint 6 -- T-041) |
| `registerAction` | 5 req | 15 min | Ativo (Sprint anterior) |
| `loginAction` | 10 req | 15 min | Ativo (Sprint anterior) |

Cobertura adequada para MVP. Nota: rate limits de API routes REST (`/api/v1/`) ainda nao implementados (nao ha endpoints REST ativos alem de health check).

---

## 6. Qualidade dos Testes

| Arquivo de teste | Testes | Cobertura |
|-----------------|--------|-----------|
| `tests/unit/middleware/csp.test.ts` | 5 | CSP build logic, nonce format, unicidade |
| `tests/unit/lib/rate-limit.test.ts` | 8 | Allowed/blocked, atomicity, fallback, key format |
| `tests/unit/server/ai.actions.test.ts` | 5 | Rate limit key, blocking, BOLA check (ambas actions) |
| `tests/unit/app/auth-layout.test.tsx` | 4 | Header, Footer, children, heading |
| `tests/unit/components/onboarding/OnboardingWizard.test.tsx` | 14 | Steps, navigation, validation, skip, AI integration, styles |

**Total Sprint 6**: ~36 novos testes. **Total projeto**: 297 testes, 0 falhas.

Observacao sobre o teste CSP: os testes replicam a logica do `buildCsp()` em vez de testar a funcao diretamente (nao exportada). Isso e fragil -- se `buildCsp()` mudar, os testes podem passar mesmo com regressao. Idealmente, `buildCsp()` deveria ser exportada e testada unitariamente. Menor prioridade.

---

## 7. Verificacao de Conformidade

| Criterio | Status |
|----------|--------|
| `src/server/` usa `import "server-only"` | OK -- `rate-limit.ts` e `ai.actions.ts` importam `server-only` |
| Prisma client apenas via `src/server/db/client.ts` | OK |
| Env vars via `env.ts` | PARCIAL -- Redis OK, mas items pendentes da divida herdada |
| Authorization ANTES de data access | OK -- rate limit > auth > BOLA check > data access |
| BOLA mitigation (userId em where clause) | OK -- `ai.actions.ts` verifica `tripId + userId` |
| Soft delete policy | OK -- nenhum hard delete introduzido |
| Error classes (AppError hierarchy) | OK -- `UnauthorizedError` usado |
| i18n via next-intl | OK -- namespaces `onboarding`, `trustSignals`, `auth` |
| CUID2 para IDs | OK -- nenhum novo modelo introduzido |
| Conventional Commits | Verificar com tech-lead |

---

## 8. Veredito Final

### APROVADO COM OBSERVACOES

O Sprint 6 entregou valor significativo em tres frentes:

1. **Seguranca**: Resolucao de 3 dos 4 itens de risco mais criticos do backlog de divida (CSP nonce, rate limiter atomico, rate limit checklist). A posicao de seguranca do projeto melhorou substancialmente.

2. **Funcionalidade**: Onboarding Wizard funcional com 3 passos, integracao IA, e redirect automatico. Trust signals e Header/Footer nas telas de auth completam a experiencia de primeiro acesso.

3. **Documentacao**: ADR-005 corrigido, `.env.example` atualizado, Playwright configurado por ambiente.

**Itens que devem ser enderecados no Sprint 7** (nao bloqueiam a aprovacao do Sprint 6):

1. **DT-010 (ALTO)**: Corrigir import de `next/link` para `@/i18n/navigation` em `TrustSignals.tsx` -- link quebrado em producao com locale.
2. **DT-011 (MEDIO)**: Corrigir import de `useRouter` em `OnboardingWizard.tsx` para `@/i18n/navigation`.
3. **DT-014 (MEDIO)**: Link `/account/delete` aponta para rota inexistente -- sera resolvido com T-051 (perfil).
4. **DT-004 (ALTO, herdado)**: `updateTrip` spread -- permanece pendente.
5. **Redis singleton em producao (MEDIO, herdado)**: Remover condicao de environment no `globalThis` assignment.

Nenhum bloqueio critico identificado. O sprint pode ser marcado como concluido.

---

*Revisao realizada pelo architect em 2026-03-04.*
*Proximo passo: revisoes dos demais agentes (security-specialist, devops-engineer, tech-lead, release-manager, finops-engineer).*
