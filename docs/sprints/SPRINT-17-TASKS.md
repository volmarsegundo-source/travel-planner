# Sprint 17 -- Kickoff Plan: Hardening & Production Readiness

> **Tech-Lead:** tech-lead
> **Data de inicio:** 2026-03-09
> **Capacidade:** ~40h (2 devs full-stack, ~20h cada)
> **Estimativa P0:** ~22h | **Buffer:** ~18h (45%)
> **Branch:** `feat/sprint-17`
> **Baseline:** 1142 testes, v0.10.0
> **Tema:** Hardening -- zerar divida P0 acumulada desde Sprint 6

---

## 1. Validacao do Plano do Product-Owner

### Ranking de prioridade -- Aprovado com ajustes

O PO priorizou 9 tasks P0 totalizando ~22h. A priorizacao por scoring esta **correta** e coerente com a estrategia de hardening. Ajustes:

1. **T-S17-001 (mass assignment) deve ser a primeira task de dev-1.** Score mais alto (4.40) e a vulnerabilidade mais critica. A correcao esta no `TripService.updateTrip` (camada de servico), nao apenas na action -- atualmente `data` e repassado direto ao Prisma `update` em `trip.service.ts:149` sem whitelist de campos. Embora o `TripUpdateSchema` no Zod ja filtre campos na action, o servico deve ter sua propria defesa (defense-in-depth).

2. **T-S17-003 -- PlanGeneratorWizard JA USA `@/i18n/navigation`.** Verificacao direta no arquivo `src/components/features/itinerary/PlanGeneratorWizard.tsx:3` confirma: `import { useRouter } from "@/i18n/navigation"`. O PO listou IMP-001 como pendente, mas aparentemente foi corrigido em sprint anterior. A task se reduz a TripCard.tsx (IMP-002). Verificacao de TrustSignals.tsx: **nenhum import de `next/link`** encontrado. **Reducao de escopo: apenas TripCard.tsx precisa de correcao.** Estimativa reduzida para 1h.

3. **T-S17-004 -- Escopo real e mais amplo.** Alem de `updateUserProfileAction` (linha 81), o `logger.error` na linha 87-89 tambem loga `userId` em texto claro. Adicionalmente, todas as actions em `trip.actions.ts` logam `userId: session.user.id` nos blocos de erro (linhas 39, 74, 107, 131, 150). E `ai.actions.ts` loga `userId: session.user.id` nos blocos de erro (linhas 195, 256). **Escopo expandido**: aplicar `hashUserId` em TODOS os logger calls de server actions.

4. **T-S17-009 pode ser absorvido por dev-1 como warmup antes de T-S17-008.** Muito pequeno (1h) e toca o mesmo dominio.

### Estimativas -- Ajustadas

| Task | PO | Tech-Lead | Justificativa |
|---|---|---|---|
| T-S17-001 | 3h | 3h | Correto. Whitelist no servico + testes |
| T-S17-002 | 3h | 3h | Correto. Transacao Prisma + testes |
| T-S17-003 | 2h | 1h | Reduzido. Apenas TripCard.tsx precisa correcao |
| T-S17-004 | 1h | 2h | Expandido. userId em 7+ logger calls |
| T-S17-005 | 3h | 3h | Correto. Schema + integracao + testes |
| T-S17-006 | 2h | 2h | Correto. Helper + integracao |
| T-S17-007 | 4h | 4h | Correto. 3 paginas + i18n |
| T-S17-008 | 3h | 3h | Correto. Lookup table + testes |
| T-S17-009 | 1h | 1h | Correto. Validacao simples |
| **TOTAL** | **22h** | **22h** | |

### Distribuicao por dev -- Redistribuida

**PO original:** dev-1 ~13h, dev-2 ~9h (desbalanceado).

**Ajuste tech-lead:** Mover T-S17-004 para dev-2 (ja expandido para 2h) e manter T-S17-003 reduzido (1h). Resultado mais equilibrado:

| dev-fullstack-1 (~13h) | dev-fullstack-2 (~9h) |
|---|---|
| T-S17-001: Mass assignment (3h) | T-S17-003: Navigation import fix (1h) |
| T-S17-002: OAuth cleanup (3h) | T-S17-004: Hash userId em logs (2h) |
| T-S17-005: Zod server-side AI (3h) | T-S17-006: calculateEstimatedCost (2h) |
| T-S17-009: apiKey empty guard (1h) | T-S17-007: Footer pages (4h) |
| T-S17-008: Cyrillic homoglyphs (3h) | |

**Nota:** A carga fica 13h vs 9h. A diferenca de 4h e aceitavel porque:
- dev-1 tem tasks de seguranca que requerem mais atencao no code review
- dev-2 tem T-S17-007 (footer pages) que pode expandir se o conteudo legal precisar revisao
- O buffer de 18h absorve qualquer rebalanceamento necessario

---

## 2. Mapa de Dependencias

```
dev-fullstack-1 (seguranca + AI)          dev-fullstack-2 (UX + observabilidade)
================================          =====================================

T-S17-001 (mass assignment)               T-S17-003 (navigation import)
    |  [nenhuma dep]                          |  [nenhuma dep]
    v                                         v
T-S17-002 (OAuth cleanup)                T-S17-004 (hash userId em logs)
    |  [nenhuma dep]                          |  [nenhuma dep]
    v                                         v
T-S17-005 (Zod server-side)              T-S17-006 (calculateEstimatedCost)
    |  [nenhuma dep]                          |  [nenhuma dep]
    v                                         v
T-S17-009 (apiKey guard)                 T-S17-007 (footer pages)
    |  [nenhuma dep]
    v
T-S17-008 (Cyrillic homoglyphs)
```

**Dependencias cruzadas: ZERO.** Todas as 9 tasks sao independentes entre si. Cada dev pode executar em qualquer ordem. Nenhum arquivo e modificado por ambos os devs simultaneamente.

**Verificacao de conflitos de arquivo:**
- `trip.service.ts` -- apenas T-S17-001
- `account.actions.ts` -- T-S17-002 (transacao) e T-S17-004 (logs) -- **potencial conflito**
  - **Mitigacao:** T-S17-004 (dev-2) modifica apenas as linhas de logger. T-S17-002 (dev-1) modifica o bloco `$transaction`. Sem sobreposicao real, mas devs devem comunicar se trabalharem simultaneamente.
- `injection-guard.ts` -- apenas T-S17-008
- `ai.service.ts` -- apenas T-S17-006
- `claude.provider.ts` -- apenas T-S17-009

---

## 3. Cronograma Sugerido

| Dia | dev-fullstack-1 | dev-fullstack-2 |
|---|---|---|
| 1 | T-S17-001 (mass assignment) | T-S17-003 (import) + T-S17-004 (userId hash) |
| 2 | T-S17-002 (OAuth cleanup) | T-S17-006 (cost helper) |
| 3 | T-S17-005 (Zod server-side AI) | T-S17-007 (footer pages) |
| 4 | T-S17-009 (apiKey) + T-S17-008 (Cyrillic) | T-S17-007 (conclusao) |
| 5 | Buffer + code review cruzado | Buffer + stretch goals |

---

## 4. Tarefas P0

### 4.1 Backend -- Seguranca (dev-fullstack-1)

#### T-S17-001: Corrigir mass assignment em TripService.updateTrip
- **Dev:** dev-fullstack-1
- **Tamanho:** M (~3h)
- **Dependencia:** Nenhuma (primeira task)
- **Origem:** DT-004 (Sprint 2, 15+ sprints pendente)
- **Revisao de seguranca:** SIM -- security-specialist
- **Status:** [ ] Pendente

**Problema identificado:**
Em `src/server/services/trip.service.ts:147-149`, o metodo `updateTrip` repassa `data` (tipo `TripUpdateInput`) diretamente ao Prisma `update`:
```typescript
const updated = await db.trip.update({
  where: { id: tripId },
  data,  // <-- spread sem whitelist no servico
  select: TRIP_SELECT,
});
```
Embora o `TripUpdateSchema` em `src/lib/validations/trip.schema.ts:46-62` limite os campos a `title`, `destination`, `description`, `startDate`, `endDate`, `coverGradient`, `coverEmoji`, `status`, `visibility`, o servico nao tem defesa propria. Se qualquer outro caller (futuro) chamar `TripService.updateTrip` sem passar pelo Zod, campos como `userId`, `deletedAt`, `expeditionMode`, `currentPhase`, `tripType` poderiam ser alterados.

**Arquivos a modificar:**
- `src/server/services/trip.service.ts` -- adicionar whitelist explicita de campos no `updateTrip`
- `tests/unit/server/services/trip.service.test.ts` -- testes de mass assignment

**Criterios de aceite:**
- [ ] `TripService.updateTrip` extrai explicitamente apenas os campos permitidos de `data` antes de passar ao Prisma: `title`, `destination`, `description`, `startDate`, `endDate`, `coverGradient`, `coverEmoji`, `status`, `visibility`
- [ ] Campos nao listados no whitelist sao silenciosamente ignorados (sem erro)
- [ ] Testes unitarios verificam que passar `userId`, `deletedAt`, `expeditionMode`, `currentPhase`, `tripType` em `data` nao altera esses campos no banco
- [ ] Coverage >= 80% no `trip.service.ts`
- [ ] O `TripUpdateSchema` continua como esta (nao e necessario alterar)

---

#### T-S17-002: Limpar OAuth tokens e sessions na exclusao de conta
- **Dev:** dev-fullstack-1
- **Tamanho:** M (~3h)
- **Dependencia:** Nenhuma
- **Origem:** SEC-S7-001 (Sprint 7, 10 sprints pendente)
- **Revisao de seguranca:** SIM -- security-specialist
- **Status:** [ ] Pendente

**Problema identificado:**
Em `src/server/actions/account.actions.ts:135-153`, a transacao de exclusao de conta faz soft-delete do user e cascade em trips, mas NAO remove registros das tabelas `Account` (OAuth tokens) e `Session`. Apos exclusao, tokens OAuth do Google ficam orfaos no banco -- violacao LGPD (dados pessoais devem ser eliminados).

**Arquivos a modificar:**
- `src/server/actions/account.actions.ts` -- adicionar `tx.account.deleteMany` e `tx.session.deleteMany` na transacao
- `tests/unit/server/actions/account.actions.test.ts` -- testes verificando cleanup

**Criterios de aceite:**
- [ ] Transacao em `deleteUserAccountAction` inclui (antes do soft-delete do user):
  - `tx.account.deleteMany({ where: { userId: user.id } })`
  - `tx.session.deleteMany({ where: { userId: user.id } })`
- [ ] Ordem: deletar accounts e sessions ANTES de anonimizar o user (evita FK violation se houver cascade)
- [ ] Testes unitarios verificam que `account.deleteMany` e `session.deleteMany` sao chamados na transacao
- [ ] Verificar se existem outros dados orfaos: `UserProgress`, `PointTransaction`, `UserBadge`, `ExpeditionPhase`, `UserProfile` -- se houver relacao com userId, incluir na transacao
- [ ] Coverage >= 80%

---

#### T-S17-005: Zod validation server-side para AI params
- **Dev:** dev-fullstack-1
- **Tamanho:** M (~3h)
- **Dependencia:** Nenhuma
- **Origem:** FIND-S8-M-001 (Sprint 8)
- **Revisao de seguranca:** Nao necessaria
- **Status:** [ ] Pendente

**Problema identificado:**
Em `src/server/actions/ai.actions.ts`, as actions `generateTravelPlanAction` e `generateChecklistAction` recebem `params` do cliente sem validacao Zod server-side para `travelStyle`, `budgetTotal`, `budgetCurrency`, `travelers`, `language`. A validacao existe apenas no client-side (wizard forms). Um atacante pode chamar a action diretamente com valores invalidos.

**Arquivos a modificar/criar:**
- `src/lib/validations/ai.schema.ts` -- criar schema Zod server-side para params de AI
- `src/server/actions/ai.actions.ts` -- aplicar validacao Zod antes de processar
- `tests/unit/server/actions/ai.actions.test.ts` -- testes de validacao

**Criterios de aceite:**
- [ ] Schema Zod valida: `travelStyle` (enum: luxurious/comfortable/budget/backpacker), `budgetTotal` (numero positivo), `budgetCurrency` (string ISO 4217, 3 chars uppercase), `travelers` (inteiro >= 1), `language` (enum: en/pt)
- [ ] `generateTravelPlanAction` aplica `.safeParse()` nos params antes de sanitizacao
- [ ] `generateChecklistAction` aplica `.safeParse()` nos params antes de sanitizacao
- [ ] Valores invalidos retornam `{ success: false, error: "errors.invalidInput" }` (nao crash)
- [ ] Testes cobrindo: travelStyle invalido, budgetTotal negativo, budgetCurrency invalido, travelers = 0
- [ ] Coverage >= 80%

---

#### T-S17-009: Guard contra apiKey vazia no singleton Anthropic
- **Dev:** dev-fullstack-1
- **Tamanho:** S (~1h)
- **Dependencia:** Nenhuma
- **Origem:** FIND-S8-M-003 (Sprint 8)
- **Revisao de seguranca:** SIM -- security-specialist
- **Status:** [ ] Pendente

**Problema identificado:**
Em `src/server/services/providers/claude.provider.ts:20-21`, o singleton Anthropic aceita `apiKey: process.env.ANTHROPIC_API_KEY ?? ""`. Se a env var estiver definida mas vazia (`ANTHROPIC_API_KEY=""`), o SDK inicializa sem erro mas todas as chamadas falham com `AuthenticationError`. A API key deve ser validada no momento da inicializacao.

**Arquivos a modificar:**
- `src/server/services/providers/claude.provider.ts` -- validar apiKey antes de criar singleton
- `tests/unit/server/services/providers/claude.provider.test.ts` -- teste do cenario

**Criterios de aceite:**
- [ ] `getAnthropic()` lanca erro explicito se `ANTHROPIC_API_KEY` e `undefined` ou string vazia (`""`, `"  "`)
- [ ] Mensagem de erro: `"ANTHROPIC_API_KEY is not configured"` (nao expor o valor)
- [ ] Teste unitario cobre cenario de apiKey vazia
- [ ] Teste unitario cobre cenario de apiKey com espacos

---

#### T-S17-008: Transliteracao de homoglyphs Cyrilicos no injection guard
- **Dev:** dev-fullstack-1
- **Tamanho:** M (~3h)
- **Dependencia:** Nenhuma
- **Origem:** SEC-S16-001 (MEDIUM, Sprint 16 security review)
- **Revisao de seguranca:** SIM -- security-specialist
- **Status:** [ ] Pendente

**Problema identificado:**
Em `src/lib/prompts/injection-guard.ts:100-106`, `normalizeText()` aplica NFKD mas isso NAO translittera caracteres Cyrilicos visualmente identicos a Latin. Exemplo: `а` (U+0430) permanece Cyrilico apos NFKD. Portanto, "ignоrе previous instructions" (com Cyrilicos `о` e `е`) escapa da deteccao.

**Arquivos a modificar:**
- `src/lib/prompts/injection-guard.ts` -- adicionar lookup table Cyrilico->Latin em `normalizeText()`
- `tests/unit/lib/prompts/injection-guard.test.ts` -- testes de homoglyphs

**Criterios de aceite:**
- [ ] Lookup table mapeia os ~30 homoglyphs Cyrilicos mais comuns para equivalentes Latin (minusculos e maiusculos): a, c, e, o, p, x, y, B, H, K, M, T etc.
- [ ] `normalizeText()` aplica transliteracao APOS NFKD e ANTES de strip combining marks
- [ ] "ignоrе previous instructions" (com Cyrilicos) e detectado como injection
- [ ] "Отель в Москве" (texto Cyrilico real em travelNotes) NAO gera false positive -- transliteracao converte mas o resultado nao match patterns de injection
- [ ] Testes cobrindo: homoglyphs individuais, mixed Latin+Cyrillic injection, texto Cyrilico legitimo
- [ ] Coverage >= 80% no `injection-guard.ts`

---

### 4.2 Frontend + Observabilidade (dev-fullstack-2)

#### T-S17-003: Corrigir import de navegacao em TripCard
- **Dev:** dev-fullstack-2
- **Tamanho:** S (~1h)
- **Dependencia:** Nenhuma
- **Origem:** IMP-002 / DEBT-S16-002 (Sprint 8, 9 sprints pendente)
- **Revisao de seguranca:** Nao necessaria
- **Status:** [ ] Pendente

**Problema identificado:**
- `src/components/features/trips/TripCard.tsx:2` -- usa `import Link from "next/link"` em vez de `import { Link } from "@/i18n/navigation"`. Links gerados pelo TripCard nao incluem locale prefix, causando redirecionamento incorreto em contexto i18n.
- **IMP-001 (PlanGeneratorWizard)** ja foi corrigido -- `src/components/features/itinerary/PlanGeneratorWizard.tsx:3` ja usa `@/i18n/navigation`.
- **TrustSignals.tsx** nao tem import de `next/link` -- descartado.

**Arquivos a modificar:**
- `src/components/features/trips/TripCard.tsx` -- trocar import de `next/link` para `@/i18n/navigation`
- `tests/unit/components/features/trips/TripCard.test.tsx` -- atualizar mock se necessario

**Criterios de aceite:**
- [ ] `TripCard.tsx` importa `Link` de `@/i18n/navigation` (nao de `next/link`)
- [ ] Verificacao com grep: zero imports de `next/link` em `src/components/` (exceto excecoes documentadas)
- [ ] Testes existentes continuam passando
- [ ] Links no TripCard incluem locale prefix corretamente

---

#### T-S17-004: Hash userId em TODOS os logs de server actions
- **Dev:** dev-fullstack-2
- **Tamanho:** S (~2h)
- **Dependencia:** Nenhuma
- **Origem:** RISK-013 / BUG-S7-001 (Sprint 7)
- **Revisao de seguranca:** Nao necessaria (melhoria de privacidade)
- **Status:** [ ] Pendente

**Problema identificado:**
Multiplas server actions logam `userId: session.user.id` em texto claro. A funcao `hashUserId()` ja existe em `account.actions.ts:28-30` e e usada no `deleteUserAccountAction`, mas nao nos demais logs. Locais afetados:
1. `account.actions.ts:81` -- `logger.info("account.profileUpdated", { userId: session.user.id })`
2. `account.actions.ts:87-89` -- `logger.error("account.updateProfile.error", ..., { userId: session.user.id })`
3. `account.actions.ts:172-174` -- `logger.error("account.deleteAccount.error", ..., { userId: session.user.id })`
4. `trip.actions.ts:39,74,107,131,150` -- todos os `logger.error` com `userId: session.user.id`
5. `ai.actions.ts:195,256` -- `logger.error` com `userId: session.user.id`

**Arquivos a modificar:**
- `src/server/actions/account.actions.ts` -- usar `hashUserId()` nos logs restantes
- `src/server/actions/trip.actions.ts` -- importar/criar `hashUserId()` e substituir em todos os logs
- `src/server/actions/ai.actions.ts` -- importar/criar `hashUserId()` e substituir em todos os logs
- Considerar: extrair `hashUserId()` para `src/lib/hash-utils.ts` (modulo compartilhado) para reutilizacao

**Criterios de aceite:**
- [ ] Zero ocorrencias de `userId: session.user.id` em logger calls em todas as server actions
- [ ] Todos os logs usam `userIdHash: hashUserId(session.user.id)` ou equivalente
- [ ] `hashUserId` e extraido para modulo compartilhado (nao duplicado em cada action)
- [ ] Auditoria com grep confirma: `grep -rn 'userId: session' src/server/actions/` retorna zero resultados
- [ ] Nota: `ai.service.ts:logTokenUsage` tambem loga `userId` -- verificar e corrigir se necessario

---

#### T-S17-006: Implementar calculateEstimatedCost em logTokenUsage
- **Dev:** dev-fullstack-2
- **Tamanho:** S (~2h)
- **Dependencia:** Nenhuma
- **Origem:** DEBT-S16-001 (Sprint 16)
- **Revisao de seguranca:** Nao necessaria
- **Status:** [ ] Pendente

**Problema identificado:**
Em `src/server/services/ai.service.ts:202-219`, `logTokenUsage()` registra tokens mas nao calcula custo estimado (campo `estimatedCostUsd` ausente). O `calculateEstimatedCost` estava no spec original de T-S16-003 mas foi deferido.

**Arquivos a modificar:**
- `src/server/services/ai.service.ts` -- implementar `calculateEstimatedCost()` e integrar em `logTokenUsage()`
- `tests/unit/server/services/ai.service.test.ts` -- testes do helper

**Tabela de precos (Anthropic, marco 2026):**
| Modelo | Input $/MTok | Output $/MTok |
|---|---|---|
| claude-sonnet-4-6 (plan) | 3.00 | 15.00 |
| claude-haiku-4-5 (checklist, guide) | 0.25 | 1.25 |
| Cache read (qualquer modelo) | 50% do input price | N/A |

**Criterios de aceite:**
- [ ] `calculateEstimatedCost(model, inputTokens, outputTokens, cacheReadTokens?, cacheWriteTokens?)` retorna custo em USD
- [ ] Custo calculado com 6 casas decimais (ex: `0.004500` para 1500 input tokens Sonnet)
- [ ] Cache read tokens calculados com 50% de desconto sobre input price
- [ ] Cache write tokens calculados com preco full de input (criacao de cache tem custo)
- [ ] `logTokenUsage()` inclui campo `estimatedCostUsd` no log estruturado
- [ ] Testes cobrindo: Sonnet sem cache, Haiku sem cache, Sonnet com cache, modelo desconhecido (fallback para Sonnet pricing)
- [ ] Coverage >= 80%

---

#### T-S17-007: Criar paginas /terms, /privacy, /support
- **Dev:** dev-fullstack-2
- **Tamanho:** M (~4h)
- **Dependencia:** Nenhuma
- **Origem:** RISK-015 / BUG-S7-004 (Sprint 7, 10 sprints pendente)
- **Revisao de seguranca:** Nao necessaria (conteudo estatico)
- **Status:** [ ] Pendente

**Problema identificado:**
Footer links `/terms`, `/privacy`, `/support` retornam 404. Os links estao no `src/components/layout/Footer.tsx` (linhas 28, 34, 40) com hrefs corretos mas as paginas nao existem.

**Arquivos a criar:**
- `src/app/[locale]/(app)/terms/page.tsx` -- Termos de Uso
- `src/app/[locale]/(app)/privacy/page.tsx` -- Politica de Privacidade
- `src/app/[locale]/(app)/support/page.tsx` -- Suporte
- `src/messages/en.json` -- adicionar chaves de traducao
- `src/messages/pt.json` -- adicionar chaves de traducao

**Criterios de aceite:**
- [ ] `/en/terms`, `/pt/terms` retornam 200 com conteudo de Termos de Uso
- [ ] `/en/privacy`, `/pt/privacy` retornam 200 com Politica de Privacidade
- [ ] `/en/support`, `/pt/support` retornam 200 com pagina de Suporte
- [ ] Todas as paginas usam layout consistente (dentro do route group `(app)` com Header + Footer)
- [ ] Conteudo bilingue via next-intl (`useTranslations`)
- [ ] `/privacy` inclui disclosure sobre: (a) uso de Anthropic Claude para geracao de conteudo, (b) dados enviados para a API, (c) PII masking aplicado antes do envio
- [ ] Links no Footer funcionam corretamente (sem 404)
- [ ] Paginas sao Server Components (conteudo estatico, sem interatividade)
- [ ] Conteudo pode ser placeholder estruturado (MVP) -- nao precisa ser texto legal final

---

## 5. Revisores por Task

| Task | Code Review | Security Review |
|---|---|---|
| T-S17-001 (mass assignment) | tech-lead | security-specialist |
| T-S17-002 (OAuth cleanup) | tech-lead | security-specialist |
| T-S17-003 (navigation import) | tech-lead | -- |
| T-S17-004 (hash userId) | tech-lead | -- |
| T-S17-005 (Zod server-side) | tech-lead | -- |
| T-S17-006 (estimatedCost) | tech-lead + finops-engineer | -- |
| T-S17-007 (footer pages) | tech-lead | -- |
| T-S17-008 (Cyrillic homoglyphs) | tech-lead | security-specialist |
| T-S17-009 (apiKey guard) | tech-lead | security-specialist |

---

## 6. P1 Stretch Goals (se P0 terminar antes)

Ranking por ratio valor/esforco:

| Rank | Task | Descricao | Horas | Score | Ratio | Dev sugerido |
|---|---|---|---|---|---|---|
| 1 | T-S17-012 | Documentar ADR-008 | 1h | 2.90 | 2.90 | qualquer |
| 2 | T-S17-010 | ErrorCard reutilizavel | 2h | 3.20 | 1.60 | dev-2 |
| 3 | T-S17-013 | Unificar AppError/TripError | 2h | 2.85 | 1.43 | dev-2 |
| 4 | T-S17-011 | CSP sem unsafe-inline | 3h | 3.10 | 1.03 | dev-1 |
| 5 | T-S17-014 | OPT-008 Output guardrails | 3h | 2.80 | 0.93 | dev-1 |

**Recomendacao:** Se dev-2 terminar T-S17-007 antes do previsto, pegar T-S17-012 (1h, documentacao) e T-S17-010 (2h, refactor simples). Se dev-1 terminar antes, pegar T-S17-011 (CSP, high security value).

---

## 7. Definition of Done -- Sprint 17

- [ ] Todas as 9 tasks P0 marcadas como concluidas
- [ ] Code review aprovado pelo tech-lead para cada task
- [ ] Security review aprovado pelo security-specialist para T-S17-001, 002, 008, 009
- [ ] Cobertura de testes >= 80% em todos os arquivos modificados
- [ ] Zero testes quebrados (regressao zero)
- [ ] >= 30 novos testes (1170+ total)
- [ ] Verificacao final:
  - [ ] `grep -rn 'userId: session' src/server/actions/` retorna zero resultados
  - [ ] `grep -rn 'from "next/link"' src/components/` retorna zero (exceto excecoes documentadas)
  - [ ] `grep -rn 'from "next/navigation"' src/components/` retorna apenas LoginForm (excecao documentada)
- [ ] Merged via PR para master -- nenhum commit direto
- [ ] Version bump para v0.11.0

---

## 8. Briefing dev-fullstack-1

### Resumo
Voce e responsavel por **5 tasks de seguranca e robustez** neste sprint. O foco e eliminar vulnerabilidades conhecidas e fortalecer defesas. Todas as suas tasks serao revisadas pelo security-specialist alem do tech-lead.

### Ordem de execucao recomendada

1. **T-S17-001** (M, 3h) -- Mass assignment fix
   - **Prioridade maxima** -- vulnerabilidade ativa mais antiga do projeto (15+ sprints)
   - Arquivo principal: `src/server/services/trip.service.ts:129-154`
   - Acao: no metodo `updateTrip`, extrair apenas os campos permitidos de `data` com destructuring explicito antes de passar ao Prisma
   - Padrao: criar objeto `safeData` com apenas: `title`, `destination`, `description`, `startDate`, `endDate`, `coverGradient`, `coverEmoji`, `status`, `visibility`
   - NAO alterar `src/lib/validations/trip.schema.ts` -- o Zod schema ja esta correto
   - Testes: verificar que passar `{ title: "New", userId: "hacker", deletedAt: null, expeditionMode: false }` resulta em update apenas de `title`

2. **T-S17-002** (M, 3h) -- OAuth cleanup na exclusao
   - Arquivo principal: `src/server/actions/account.actions.ts:135-153`
   - Acao: dentro da transacao `db.$transaction`, adicionar ANTES do soft-delete:
     ```typescript
     await tx.account.deleteMany({ where: { userId: user.id } });
     await tx.session.deleteMany({ where: { userId: user.id } });
     ```
   - Verificar tabelas Prisma: checar se `UserProgress`, `PointTransaction`, `UserBadge`, `ExpeditionPhase`, `UserProfile` tem relacao com userId e precisam de cleanup
   - Lembrete: `redirect()` FORA do try/catch (FIND-M-001)

3. **T-S17-005** (M, 3h) -- Zod server-side AI params
   - Criar `src/lib/validations/ai.schema.ts` com schemas para `GeneratePlanParams` e `GenerateChecklistParams`
   - Aplicar `.safeParse()` em `ai.actions.ts` logo apos auth check e BOLA check, ANTES da sanitizacao
   - Valores invalidos retornam `{ success: false, error: "errors.invalidInput" }` (sem crash, sem detalhes)
   - Referencia: ver como `TripUpdateSchema.safeParse()` e usado em `trip.actions.ts:55`

4. **T-S17-009** (S, 1h) -- apiKey guard
   - Arquivo: `src/server/services/providers/claude.provider.ts:17-25`
   - Acao: antes de `new Anthropic()`, validar que `process.env.ANTHROPIC_API_KEY` existe e nao e vazio
   - Usar `.trim()` para detectar string com apenas espacos
   - Lembrete: limpar `globalThis._anthropic` no teste (`beforeEach`)

5. **T-S17-008** (M, 3h) -- Cyrillic homoglyphs
   - Arquivo: `src/lib/prompts/injection-guard.ts:100-106`
   - Acao: adicionar mapa de transliteracao em `normalizeText()`. Sugestao de implementacao:
     ```typescript
     const CYRILLIC_TO_LATIN: Record<string, string> = {
       '\u0430': 'a', '\u0410': 'A',  // а -> a
       '\u0441': 'c', '\u0421': 'C',  // с -> c
       '\u0435': 'e', '\u0415': 'E',  // е -> e
       '\u043E': 'o', '\u041E': 'O',  // о -> o
       '\u0440': 'p', '\u0420': 'P',  // р -> p
       '\u0445': 'x', '\u0425': 'X',  // х -> x
       '\u0443': 'y', '\u0423': 'Y',  // у -> y
       '\u041D': 'H', '\u041A': 'K',  // Н -> H, К -> K
       '\u041C': 'M', '\u0422': 'T',  // М -> M, Т -> T
       '\u0412': 'B',                  // В -> B
       // Adicionar mais conforme necessario
     };
     ```
   - Aplicar APOS NFKD e ANTES de strip combining marks
   - Testar com texto Cyrilico real (nomes russos em travelNotes) para confirmar zero false positives

### Dependencias da outra trilha
- Nenhuma. Todas as suas tasks sao independentes das tasks de dev-2.
- Atencao: `account.actions.ts` tambem sera modificado por dev-2 (T-S17-004, logs). Comunique quando for trabalhar em T-S17-002 para evitar conflitos de merge.

### Expectativa de testes
- ~15-20 testes novos estimados
- Foco: `trip.service.test.ts` (mass assignment), `account.actions.test.ts` (OAuth cleanup), `ai.actions.test.ts` (Zod validation), `claude.provider.test.ts` (apiKey), `injection-guard.test.ts` (homoglyphs)

### Arquivos-chave para referencia
- `src/server/services/trip.service.ts` -- TripService (mass assignment)
- `src/server/actions/account.actions.ts` -- deleteUserAccountAction (OAuth)
- `src/server/actions/ai.actions.ts` -- AI actions (Zod validation)
- `src/server/services/providers/claude.provider.ts` -- Anthropic singleton (apiKey)
- `src/lib/prompts/injection-guard.ts` -- injection guard (Cyrillic)
- `src/lib/validations/trip.schema.ts` -- referencia para padrao Zod

---

## 9. Briefing dev-fullstack-2

### Resumo
Voce e responsavel por **4 tasks de UX e observabilidade** neste sprint. O foco e corrigir bugs de navegacao, eliminar PII de logs, habilitar FinOps, e criar paginas legais obrigatorias.

### Ordem de execucao recomendada

1. **T-S17-003** (S, 1h) -- Navigation import fix
   - Arquivo unico: `src/components/features/trips/TripCard.tsx:2`
   - Trocar `import Link from "next/link"` por `import { Link } from "@/i18n/navigation"`
   - NOTA: `Link` de `@/i18n/navigation` e named export (com chaves), nao default export
   - Atualizar mocks nos testes se necessario (`vi.mock("@/i18n/navigation", ...)`)
   - Validacao final: `grep -rn 'from "next/link"' src/components/` deve retornar zero

2. **T-S17-004** (S, 2h) -- Hash userId em logs
   - Primeiro: extrair `hashUserId()` de `account.actions.ts:28-30` para `src/lib/hash-utils.ts`
   - Depois: importar e aplicar em todas as server actions:
     - `account.actions.ts` (linhas 81, 87-89, 172-174)
     - `trip.actions.ts` (linhas 39, 74, 107, 131, 150)
     - `ai.actions.ts` (linhas 195, 256)
   - Padrao: `{ userIdHash: hashUserId(session.user.id) }` em vez de `{ userId: session.user.id }`
   - **ATENCAO:** `ai.service.ts:logTokenUsage` (linhas 210-218) tambem loga `userId`. Verificar e corrigir.
   - Validacao: `grep -rn 'userId: session' src/server/actions/` deve retornar zero

3. **T-S17-006** (S, 2h) -- calculateEstimatedCost
   - Arquivo: `src/server/services/ai.service.ts:196-219`
   - Criar funcao `calculateEstimatedCost(model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens)` retornando `number`
   - Precos: ver tabela na descricao da task acima
   - Mapear modelo: if model includes "sonnet" -> Sonnet pricing, if "haiku" -> Haiku pricing, else fallback Sonnet
   - NOTA: o parametro `model` em `logTokenUsage` e `params.provider` que e `"claude"` (nome do provider, nao do modelo). Sera necessario passar o `generationType` (que e o `ModelType`) para determinar pricing. Ajustar assinatura conforme necessario.
   - Adicionar campo `estimatedCostUsd` ao log

4. **T-S17-007** (M, 4h) -- Footer pages
   - Criar 3 paginas dentro de `src/app/[locale]/(app)/`:
     - `terms/page.tsx` -- Server Component com `getTranslations("terms")`
     - `privacy/page.tsx` -- Server Component com `getTranslations("privacy")`
     - `support/page.tsx` -- Server Component com `getTranslations("support")`
   - Adicionar chaves de traducao em `src/messages/en.json` e `src/messages/pt.json`
   - Paginas devem ter estrutura: titulo, subtitulos, paragrafos de conteudo
   - `/privacy` deve incluir secao sobre AI: "Usamos Claude (Anthropic) para gerar itinerarios. Dados pessoais sao mascarados antes do envio."
   - Footer links ja existem e apontam para `/terms`, `/privacy`, `/support` -- devem funcionar com o locale prefix automatico do route group

### Dependencias da outra trilha
- Nenhuma. Todas as suas tasks sao independentes.
- Atencao: `account.actions.ts` tambem sera modificado por dev-1 (T-S17-002, transacao). Comunique se houver conflito de timing.

### Expectativa de testes
- ~10-15 testes novos estimados
- Foco: `TripCard.test.tsx` (import fix), `hash-utils.test.ts` (novo modulo), `ai.service.test.ts` (cost calculation)
- Footer pages: podem nao precisar de testes unitarios (Server Components estaticos), mas verificar se smoke tests existentes cobrem

### Arquivos-chave para referencia
- `src/components/features/trips/TripCard.tsx` -- TripCard (import)
- `src/server/actions/account.actions.ts` -- hashUserId() original (linhas 28-30)
- `src/server/actions/trip.actions.ts` -- logger calls com userId
- `src/server/actions/ai.actions.ts` -- logger calls com userId
- `src/server/services/ai.service.ts` -- logTokenUsage (cost helper)
- `src/components/layout/Footer.tsx` -- links existentes
- `src/messages/en.json` / `src/messages/pt.json` -- traducoes

---

## 10. Riscos Monitorados

| Risco | Probabilidade | Impacto | Mitigacao | Owner |
|---|---|---|---|---|
| T-S17-002 FK violations ao deletar accounts/sessions | Baixa | Alto | Verificar schema Prisma para cascades. Ordem: delete accounts/sessions antes de anonimizar user | dev-1 |
| T-S17-004 escopo maior que estimado (mais arquivos com userId) | Media | Baixo | Grep abrangente. Se encontrar em mais arquivos, incluir | dev-2 |
| T-S17-007 conteudo legal precisa revisao juridica | Media | Baixo | Conteudo e placeholder MVP, nao texto legal final | dev-2 |
| T-S17-008 false positives em texto Cyrilico real | Baixa | Alto | Testar com 10+ exemplos de texto russo/ucraniano | dev-1 + security |
| Conflito de merge em account.actions.ts | Baixa | Baixo | Devs comunicam antes de modificar | ambos |

---

## 11. Meta de Testes

| Area | Testes atuais | Novos estimados | Total estimado |
|---|---|---|---|
| trip.service.ts | existentes | +4 (mass assignment) | existentes + 4 |
| account.actions.ts | existentes | +3 (OAuth cleanup) | existentes + 3 |
| ai.actions.ts | existentes | +5 (Zod validation) | existentes + 5 |
| claude.provider.ts | existentes | +2 (apiKey guard) | existentes + 2 |
| injection-guard.ts | existentes | +6 (homoglyphs) | existentes + 6 |
| hash-utils.ts | 0 | +3 (novo modulo) | 3 |
| ai.service.ts (cost) | existentes | +5 (cost calculation) | existentes + 5 |
| TripCard.test.tsx | existentes | +1 (import verify) | existentes + 1 |
| **Total novos** | | **~29-30** | **1170+ total** |

---

*Plano elaborado pelo tech-lead em 2026-03-09 com base no backlog priorizado do product-owner, security review do Sprint 16, e inspecao direta do codigo-fonte.*
