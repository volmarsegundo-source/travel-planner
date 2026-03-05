# Sprint 6 --- Security Specialist Review

**Sprint**: 6 --- Debitos Tecnicos + Onboarding Wizard
**Branch**: `feat/sprint-6`
**Reviewer**: security-specialist
**Data**: 2026-03-04
**Escopo avaliado**: CSP nonce, rate limiter atomico, rate limit checklist, ARIA fix, Onboarding Wizard, trust signals, auth layout
**Testes**: 297 passando, 0 falhas, build limpo

---

## Veredicto

**APROVADO COM NOTAS** --- Nenhum bloqueador critico. Sprint 6 resolve dois dos findings mais importantes levantados em sprints anteriores (CSP e rate limiter). Restam observacoes de severidade MEDIA e BAIXA documentadas abaixo.

---

## 1. Analise de Autenticacao e Autorizacao

### 1.1 Middleware de protecao de rotas (`src/middleware.ts`)

**Status**: ADEQUADO

O middleware continua usando o padrao correto: `NextAuth(authConfig)` com a config Edge-safe (sem Prisma/ioredis). A verificacao de rotas protegidas usa `pathname.includes(segment)` contra `PROTECTED_PATH_SEGMENTS`. Pontos positivos:

- `/onboarding` foi adicionado ao array `PROTECTED_PATH_SEGMENTS` (linha 25) --- corretamente protegido.
- A rota `/api` e Server Actions com header `next-action` continuam sendo ignoradas pelo middleware de i18n (evita o bug conhecido do Next.js #84504).
- A verificacao de autenticacao (`!req.auth`) redireciona para `/auth/login` com `callbackUrl` preservado.

**Observacao [BAIXA]**: A verificacao `pathname.includes(segment)` e liberal. Uma rota futura como `/public-trips` casaria com o segmento `/trips` e seria bloqueada indevidamente. Recomendo migrar para verificacao de prefixo com delimitador (`pathname.startsWith(\`/${locale}/trips\`) || pathname === "/trips"`) ou regex de segmento. Nao e bloqueador agora, pois todas as rotas existentes estao corretas.

### 1.2 Onboarding --- server-side auth guard (`src/app/[locale]/(app)/onboarding/page.tsx`)

**Status**: ADEQUADO

A pagina de onboarding esta dentro do route group `(app)`, que ja tem `AppShellLayout` com `auth()`. Alem disso, a propria pagina faz `const session = await auth()` e redireciona se nao autenticado (linha 10-12). Dupla verificacao --- defensivo e correto.

O `userName` e derivado de `session.user.name` ou da parte local do email (antes do `@`). Nao expoe o email completo na UI --- padrao correto de PII minimization.

### 1.3 AI Actions --- autorizacao + BOLA (`src/server/actions/ai.actions.ts`)

**Status**: ADEQUADO

Ambas as actions (`generateTravelPlanAction` e `generateChecklistAction`) seguem o padrao correto:
1. `await auth()` como primeira instrucao
2. Rate limit check com `session.user.id`
3. BOLA check com `db.trip.findFirst({ where: { id: tripId, userId: session.user.id, deletedAt: null } })`

O `userId` nunca vem de input do usuario. As verificacoes estao na ordem correta: auth -> rate limit -> BOLA -> business logic.

### 1.4 Trip Actions --- autorizacao (`src/server/actions/trip.actions.ts`)

**Status**: ADEQUADO (pre-existente, sem alteracao no Sprint 6)

`createTripAction` chama `auth()` primeiro, valida com Zod, e delega para `TripService.createTrip(session.user.id, parsed.data)`. O `userId` vem exclusivamente da sessao.

### 1.5 LoginForm --- fluxo de credenciais (`src/components/features/auth/LoginForm.tsx`)

**Status**: ADEQUADO

O fix do Sprint 5 (catch block no `signIn`) continua presente (linha 103-106). O `signIn("credentials", { redirect: false })` e chamado corretamente. O estado de erro nao expoe detalhes do backend --- usa chave i18n generica `errors.invalidCredentials`.

### 1.6 Auth layout (`src/app/[locale]/auth/layout.tsx`)

**Status**: ADEQUADO

Layout simples com `Header` e `Footer`. Nao expoe dados de sessao. Nao faz auth check (correto, pois paginas de auth sao publicas). A estrutura de card com `rounded-xl border bg-white p-8 shadow-sm` nao introduz risco.

---

## 2. Validacao de Dados

### 2.1 Onboarding Wizard --- input handling (`src/components/features/onboarding/OnboardingWizard.tsx`)

**Status**: PARCIALMENTE ADEQUADO --- com observacoes

**Pontos positivos:**
- Validacao client-side no step 2: destination nao vazio, datas obrigatorias, endDate >= startDate, travelers >= 1
- Formulario usa `noValidate` + validacao JS customizada (nao depende de validacao nativa do browser)
- `type="number"` com `min={1}` e `max={20}` para travelers
- Budget com `min={100}` e `step={100}`
- Currency limitada a `<select>` com opcoes fixas (USD, EUR, BRL, GBP) --- nao aceita input livre
- Travel style limitada a constante `TRAVEL_STYLES` com valores tipados `TravelStyle`

**Finding SEC-S6-001 [MEDIO] --- Validacao apenas no client para onboarding**:

A validacao do step 2 (destination, datas, travelers) ocorre exclusivamente no client (`validateStep2()`). Os dados sao enviados diretamente para `createTripAction` e `generateTravelPlanAction`. Embora `createTripAction` valide via `TripCreateSchema.safeParse()`, a action `generateTravelPlanAction` recebe `params` como `Omit<GeneratePlanParams, "userId">` **sem validacao Zod explicita no server**. Um atacante que invoque o Server Action diretamente (via HTTP POST com action ID) pode enviar valores arbitrarios para `destination`, `travelStyle`, `budgetTotal`, etc.

**Impacto**: Prompt injection na chamada AI (destination com instrucoes maliciosas); budget com valores negativos ou extremos que podem causar comportamento inesperado no prompt.

**Recomendacao**: Adicionar Zod schema no server para `generateTravelPlanAction` params --- pelo menos: destination (string, max 256 chars, trim), startDate/endDate (date strings validas), travelStyle (enum), budgetTotal (number, min 0, max 1_000_000), budgetCurrency (enum), travelers (int, min 1, max 100), language (enum).

**Finding SEC-S6-002 [BAIXO] --- `parseInt(e.target.value) || 1` nao rejeita valores negativos**:

Na linha 281, `parseInt(e.target.value) || 1` aceita valores negativos (ex: `-5` e parseado como `-5`, que e truthy). Isso e mitigado pela validacao `if (tripForm.travelers < 1)` no `validateStep2()`, mas apenas no client. O server action `createTripAction` nao valida `travelers` (nao e campo do `TripCreateSchema`). O `travelers` e passado diretamente ao AI como parametro --- um valor negativo geraria prompt incoerente mas nao e um risco de seguranca critico.

**Finding SEC-S6-003 [BAIXO] --- Budget sem limite superior no client**:

O campo budget aceita qualquer valor numerico (sem `max` no `<Input>`). Um usuario pode enviar budget de 999.999.999, que seria repassado ao prompt AI. O impacto e baixo (nao causa dano alem de um prompt estranho), mas uma validacao `max` no server reduziria surface area.

### 2.2 TrustSignals --- sem inputs

**Status**: ADEQUADO

Componente puramente visual. Usa `useTranslations` para texto, sem inputs ou dados dinamicos. O link para `/account/delete` usa `next/link` import direto (deveria usar `@/i18n/navigation` Link para consistencia com i18n, mas nao e risco de seguranca).

### 2.3 Trip schemas (`src/lib/validations/trip.schema.ts`)

**Status**: ADEQUADO (pre-existente)

`TripCreateSchema` usa `.strip()` por padrao do Zod (campos nao declarados sao removidos). Campos com limites de tamanho (`MAX_TRIP_TITLE_LENGTH`, etc.). `coverGradient` limitado a 50 chars, `coverEmoji` a 10 chars. Sem `.passthrough()`.

---

## 3. Gestao de Segredos

### 3.1 Validacao de env vars (`src/lib/env.ts`)

**Status**: ADEQUADO

- `AUTH_SECRET` e `NEXTAUTH_SECRET`: validados com `z.string().min(32)` --- garante forca minima
- `ANTHROPIC_API_KEY`: validado com `z.string().startsWith("sk-ant-")` --- previne uso acidental de chave errada
- `MAPBOX_SECRET_TOKEN`: validado com `z.string().startsWith("sk.")` --- previne exposicao de token publico no lugar errado
- `DATABASE_URL`: validado como URL
- `REDIS_URL`: validado como URL com refinamento condicional para TLS via `REDIS_TLS_REQUIRED`
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`: opcionais (correto, pois Google OAuth e opcional)
- `SKIP_ENV_VALIDATION`: so funciona quando explicitamente `"true"` (nao e truthy generica)

**Nenhum segredo novo adicionado no Sprint 6.**

### 3.2 auth.config.ts --- leitura direta de `process.env`

**Status**: PRE-EXISTENTE [MEDIO] --- nao corrigido no Sprint 6

`auth.config.ts` (linhas 17-19) le `process.env.GOOGLE_CLIENT_ID` e `process.env.GOOGLE_CLIENT_SECRET` diretamente, sem passar por `env.ts`. Tambem `auth.ts` (linha 29) faz o mesmo. Isso foi documentado como finding em sprints anteriores. Nao e bloqueador mas deve ser corrigido para consistencia.

### 3.3 .env.example

**Status**: ADEQUADO

Nenhum valor real. Todos os placeholders estao genericos. `NEXTAUTH_SECRET` tem valor placeholder obviamente invalido. `REDIS_HOST`/`REDIS_PORT` adicionados conforme backlog do Sprint 5 (S6-008).

---

## 4. Analise de Dependencias (CVEs)

### 4.1 Dependencias adicionadas no Sprint 6

**Nenhuma nova dependencia foi adicionada no Sprint 6.** O `package.json` permanece identico ao Sprint 5 em termos de dependencias. Isso e positivo --- reduz a surface area de supply chain.

### 4.2 Dependencias existentes com observacoes

| Dependencia | Versao | Status |
|---|---|---|
| `next-auth` | `^5.0.0-beta.30` | **Beta** --- pre-release. Risco inerente de bugs nao documentados. Sem CVEs publicados ate a data deste review. Monitorar releases. |
| `bcryptjs` | `^3.0.3` | OK --- sem CVEs conhecidos |
| `ioredis` | `^5.4.1` | OK --- sem CVEs conhecidos |
| `@anthropic-ai/sdk` | `^0.78.0` | OK --- sem CVEs conhecidos |
| `next` | `^15.1.0` | OK --- verificar CVE-2024-51479 (corrigido em 15.0.4+) |
| `zod` | `^3.25.76` | OK --- sem CVEs conhecidos |
| `prisma` | `^6.0.0` | OK --- sem CVEs conhecidos |

**Recomendacao**: Executar `npm audit` periodicamente no CI. O projeto ainda nao tem `npm audit` configurado no pipeline de CI (finding pre-existente).

---

## 5. Vulnerabilidades Introduzidas

### Resumo: zero vulnerabilidades criticas ou altas introduzidas no Sprint 6.

O Sprint 6 foi primariamente de correcao de debitos tecnicos, o que **reduziu** a superficie de ataque. As unicas vulnerabilidades identificadas sao de severidade MEDIA e BAIXA:

| ID | Severidade | Descricao | Componente |
|---|---|---|---|
| SEC-S6-001 | MEDIO | Parametros do AI action sem validacao Zod no server | `ai.actions.ts` |
| SEC-S6-002 | BAIXO | parseInt permite negativos no campo travelers (client) | `OnboardingWizard.tsx` |
| SEC-S6-003 | BAIXO | Budget sem limite superior (client + server) | `OnboardingWizard.tsx` |
| SEC-S6-004 | BAIXO | TrustSignals usa `next/link` em vez de `@/i18n/navigation` Link | `TrustSignals.tsx` |
| SEC-S6-005 | INFO | `auth.config.ts` le process.env diretamente (pre-existente) | `auth.config.ts` |

---

## 6. CSP --- Avaliacao da Politica Implementada

### 6.1 Resolucao do finding critico pre-existente

**Status**: RESOLVIDO --- CSP significativamente fortalecida

O Sprint 6 resolve o finding critico SEC-PRE-001 (CSP com `unsafe-eval` + `unsafe-inline` em `script-src`).

**Antes (Sprint 5)**:
```
script-src 'self' 'unsafe-eval' 'unsafe-inline'
```
Essa politica era efetivamente nula para protecao XSS --- qualquer script inline ou eval seria executado.

**Depois (Sprint 6, producao)**:
```
script-src 'self' 'nonce-{UUID}'
style-src 'self' 'unsafe-inline'
default-src 'self'
img-src 'self' data: https:
connect-src 'self' https:
font-src 'self'
```

### 6.2 Avaliacao por diretiva

| Diretiva | Valor (producao) | Avaliacao |
|---|---|---|
| `default-src` | `'self'` | ADEQUADO --- fallback restritivo |
| `script-src` | `'self' 'nonce-{UUID}'` | **BOM** --- remove unsafe-eval e unsafe-inline. Nonce por request via `crypto.randomUUID()`. Scripts inline so executam com nonce correto. |
| `style-src` | `'self' 'unsafe-inline'` | **ACEITAVEL** --- `unsafe-inline` para estilos e necessario com Tailwind CSS que injeta estilos inline. Risco residual: CSS injection, mas impacto e limitado comparado a script injection. Padrao da industria para apps com Tailwind/CSS-in-JS. |
| `img-src` | `'self' data: https:` | ACEITAVEL --- `https:` e amplo mas necessario para imagens externas (avatars Google, Mapbox tiles). `data:` necessario para imagens inline em base64. |
| `connect-src` | `'self' https:` | **OBSERVACAO** --- `https:` permite conexao a qualquer dominio HTTPS. Quando Mapbox e Sentry forem integrados, restringir a `'self' https://*.mapbox.com https://*.sentry.io`. |
| `font-src` | `'self'` | ADEQUADO |
| `frame-src` | nao definido (herda `default-src 'self'`) | ADEQUADO |
| `object-src` | nao definido (herda `default-src 'self'`) | **RECOMENDACAO**: Adicionar `object-src 'none'` explicitamente. Embora `default-src 'self'` cubra, a diretiva explicita e uma pratica recomendada contra plugins (Flash, Java) e PDFs embutidos. |
| `base-uri` | nao definido | **RECOMENDACAO**: Adicionar `base-uri 'self'` para prevenir ataques de base-tag injection. |
| `form-action` | nao definido | **RECOMENDACAO**: Adicionar `form-action 'self'` para restringir destinos de form submission. |

### 6.3 Nonce implementation

**Status**: CORRETO

- Nonce gerado via `crypto.randomUUID()` no Edge runtime (linha 75) --- fonte criptograficamente segura
- Nonce unico por request (nao reutilizado entre requests)
- Nonce propagado para o layout via header `x-nonce` (linha 79) --- padrao documentado pelo Next.js
- Nonce incluido na diretiva `script-src` do header CSP

**Observacao [BAIXO]**: `crypto.randomUUID()` gera UUIDs v4 (122 bits de entropia) --- suficiente para nonces CSP. A especificacao CSP Level 3 recomenda pelo menos 128 bits de entropia com codificacao base64. UUIDs v4 com 122 bits estao marginalmente abaixo da recomendacao, mas na pratica sao adequados. Se desejado, pode-se trocar por `crypto.getRandomValues(new Uint8Array(16))` convertido para base64 (128 bits exatos).

### 6.4 Development vs Production split

**Status**: ADEQUADO

O `isDev` flag corretamente mantem `unsafe-eval` apenas em desenvolvimento (necessario para Turbopack HMR). Em producao, `unsafe-eval` e removido. O `ws:` em `connect-src` tambem so aparece em dev (WebSocket para HMR).

### 6.5 Security headers adicionais

**Status**: ADEQUADO

Todos os headers de seguranca sao setados no middleware (linhas 100-114):
- `X-Frame-Options: DENY` --- previne clickjacking
- `X-Content-Type-Options: nosniff` --- previne MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` --- limita vazamento de URL em referrer
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` --- desabilita APIs sensibles
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` --- HSTS (apenas em producao)

**Observacao [BAIXO]**: HSTS `max-age` esta em 31536000 (1 ano). Recomendacao do docs/security.md e 63072000 (2 anos) com `preload`. Ajustar para `max-age=63072000; includeSubDomains; preload` quando preparar para submissao na HSTS preload list.

---

## 7. Rate Limiter --- Avaliacao da Implementacao Atomica

### 7.1 Resolucao do finding pre-existente

**Status**: RESOLVIDO --- race condition eliminada

O Sprint 6 resolve o finding SEC-PRE-002 (INCR + EXPIRE nao atomicos).

**Antes (Sprint 5)**:
```typescript
// Duas chamadas separadas --- race condition possivel
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, windowSeconds);
```
Se o processo morresse entre `incr` e `expire`, a chave ficaria sem TTL --- bloqueio permanente.

**Depois (Sprint 6)**:
```lua
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count
```
Executado via `redis.eval()` --- atomico no Redis.

### 7.2 Avaliacao do Lua script

**Status**: CORRETO

| Aspecto | Avaliacao |
|---|---|
| Atomicidade | **SIM** --- `redis.eval()` executa o script como operacao atomica. INCR e EXPIRE nao podem ser separados por outra operacao. |
| TTL race | **ELIMINADO** --- EXPIRE so e chamado quando `count == 1` (primeira requisicao na janela). Se o script falhar, o Redis faz rollback automatico. |
| Memory leak | **PREVENIDO** --- toda chave tera TTL. Nao e possivel criar chave sem expiracao. |
| Key structure | `ratelimit:{key}:{Math.floor(now / (windowSeconds * 1000))}` --- fixed window baseado em epoch. Adequado para o caso de uso. |

### 7.3 Fallback quando Redis esta indisponivel

**Status**: ACEITAVEL --- decisao de design documentada

```typescript
catch {
  return { allowed: true, remaining: limit, resetAt: ... };
}
```

Quando Redis esta fora do ar, o rate limiter permite a requisicao (fail-open). Isso e uma decisao de design valida para um MVP --- prioriza disponibilidade sobre protecao contra abuso. O trade-off e que, durante uma falha Redis, o rate limit fica desabilitado.

**Observacao [MEDIO] --- SEC-S6-006**: O catch block silencia **todos** os erros, incluindo erros de programacao (script Lua invalido, tipo de retorno inesperado). Recomendo logar o erro antes de retornar o fallback:

```typescript
catch (error) {
  logger.warn("rateLimit.redis.fallback", error, { key });
  return { allowed: true, remaining: limit, resetAt: ... };
}
```

Sem esse log, uma falha no script Lua passaria completamente despercebida em producao --- o rate limiter estaria efetivamente desligado sem alerta nenhum.

### 7.4 Rate limits configurados

| Action | Limite | Janela | Avaliacao |
|---|---|---|---|
| `generateTravelPlanAction` | 10 req | 1 hora | ADEQUADO --- ~$0.50/hora por usuario no pior caso |
| `generateChecklistAction` | 5 req | 1 hora | ADEQUADO --- mais restritivo, ~$0.05/hora por usuario |

**Sprint 6 corrige S6-005**: `generateChecklistAction` agora tem rate limit (5/hora/usuario), resolvendo o finding do Sprint 5 sobre exposicao financeira ao Anthropic.

### 7.5 Cobertura de testes

**Status**: ADEQUADO

- `tests/unit/lib/rate-limit.test.ts`: 7 testes cobrindo allowed/blocked, boundary, Lua script verification, Redis fallback, resetAt, e key structure
- `tests/unit/server/ai.actions.test.ts`: 5 testes cobrindo rate limit key format, rejection quando limite excedido, e BOLA check apos rate limit

Os testes verificam corretamente que o `redis.eval` e chamado com o script Lua (nao chamadas separadas) --- isso previne regressao para a implementacao nao-atomica.

---

## 8. Findings Pre-existentes --- Status de Resolucao

| Finding | Sprint Origem | Status Sprint 6 |
|---|---|---|
| SEC-PRE-001: CSP com unsafe-eval/unsafe-inline | Sprint 2 | **RESOLVIDO** --- nonce implementation |
| SEC-PRE-002: Rate limiter race condition | Sprint 2 | **RESOLVIDO** --- Lua script atomico |
| SEC-PRE-003: generateChecklistAction sem rate limit | Sprint 5 | **RESOLVIDO** --- 5 req/hora |
| SEC-PRE-004: auth.config.ts le process.env diretamente | Sprint 2 | NAO RESOLVIDO --- backlog |
| SEC-PRE-005: Redis singleton sem globalThis em prod | Sprint 2 | **RESOLVIDO** --- `redis.ts` agora usa `globalForRedis` |
| SEC-PRE-006: updateTrip usa spread implicito | Sprint 2 | NAO RESOLVIDO --- backlog |
| SEC-PRE-007: Session strategy mismatch (ADR-005 vs codigo) | Sprint 2 | NAO RESOLVIDO --- backlog |

**3 de 7 findings pre-existentes resolvidos neste sprint.** Progresso significativo.

---

## 9. Checklist de Seguranca --- Sprint 6

### Segredos e Configuracao
- [x] Nenhuma credencial, API key, ou token hardcoded no diff
- [x] Nenhuma variavel `NEXT_PUBLIC_` nova expondo segredo
- [x] Nenhum arquivo `.env` commitado
- [x] `.env.example` atualizado com variaveis documentadas

### Autenticacao e Autorizacao
- [x] `generateChecklistAction` chama `auth()` como primeira instrucao
- [x] `generateTravelPlanAction` chama `auth()` como primeira instrucao
- [x] Queries de trip incluem `userId` no `where` (BOLA check)
- [x] Nenhum role/permission vem de input do usuario
- [x] Onboarding page valida sessao server-side

### Validacao de Input
- [x] `createTripAction` valida com Zod (`TripCreateSchema.safeParse`)
- [ ] `generateTravelPlanAction` **falta** validacao Zod server-side dos params (SEC-S6-001)
- [ ] `generateChecklistAction` **falta** validacao Zod server-side dos params (SEC-S6-001)
- [x] Nenhum `dangerouslySetInnerHTML` adicionado
- [x] Nenhum `passthrough()` em schemas

### Exposicao de Dados
- [x] PII minimizada na UI do onboarding (local part do email, nao email completo)
- [x] Erros nao expoem stack traces ou detalhes internos
- [x] Trust signals nao expoem dados sensibles

### Dependencias
- [x] Nenhuma dependencia nova adicionada
- [x] `next-auth` em beta monitorado

### CSP e Headers
- [x] `unsafe-eval` removido de producao
- [x] Nonce por request via `crypto.randomUUID()`
- [x] X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS presentes
- [x] Permissions-Policy bloqueia camera, microphone, geolocation

---

## 10. Recomendacoes para Sprint 7

| Prioridade | Acao | Justificativa |
|---|---|---|
| **MEDIO** | Adicionar Zod schema server-side para parametros de AI actions (SEC-S6-001) | Previne prompt injection e valores invalidos via Server Action direct invocation |
| **MEDIO** | Logar erros no catch do rate limiter (SEC-S6-006) | Sem log, falha silenciosa desliga rate limit sem alerta |
| BAIXO | Adicionar `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` ao CSP | Hardening adicional conforme OWASP recomendacoes |
| BAIXO | Restringir `connect-src` para dominios especificos quando Mapbox/Sentry integrados | Reduz superficie de exfiltration |
| BAIXO | Corrigir HSTS para `max-age=63072000; includeSubDomains; preload` | Preparacao para HSTS preload list |
| BAIXO | Migrar `auth.config.ts` para usar `env.ts` (pre-existente) | Consistencia na validacao de env vars |
| BAIXO | TrustSignals: trocar `next/link` por `@/i18n/navigation` Link | Consistencia de i18n routing |

---

## 11. Conclusao

O Sprint 6 foi primariamente focado em correcao de debitos tecnicos de seguranca, e entregou melhoria substancial na postura de seguranca do projeto:

1. **CSP fortalecida** --- A mudanca de `unsafe-eval`/`unsafe-inline` para nonce-based CSP e a melhoria de seguranca mais significativa ate agora. Elimina a classe mais comum de ataques XSS.

2. **Rate limiter robusto** --- A migracao para Lua script atomico elimina a race condition e previne tanto memory leaks quanto bloqueios permanentes.

3. **Exposicao financeira controlada** --- O rate limit em `generateChecklistAction` (5/hora) fecha a lacuna de custo reportada no Sprint 5.

4. **Zero novas vulnerabilidades criticas** --- O unico finding MEDIO novo (SEC-S6-001: falta de validacao Zod no server para AI params) e mitigado parcialmente pelo rate limit e autenticacao, e deve ser resolvido no Sprint 7.

**Resultado: APROVADO para merge.**

---

*Review conduzida por security-specialist em 2026-03-04.*
*Proxima review obrigatoria: fim do Sprint 7.*
