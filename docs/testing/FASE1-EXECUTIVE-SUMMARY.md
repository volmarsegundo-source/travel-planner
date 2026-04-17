# FASE 1 — Executive Summary Pré-Beta v0.22.0

**Data**: 2026-04-17
**Build**: v0.22.0 (`master` @ `ad5501d`, análise estática)
**Analistas**: ux-designer, architect (dual-hat security), architect (dual-hat prompt-engineer + finops), qa-engineer
**Status desta sessão**: 6 commits em master (3 relatórios + 1 spec + 1 scaffolding Promptfoo + 1 checklist manual)

Documento consolida:
- [`UX-VALIDATION-REPORT.md`](./UX-VALIDATION-REPORT.md)
- [`SECURITY-OBSERVABILITY-REPORT.md`](./SECURITY-OBSERVABILITY-REPORT.md)
- [`AI-VALIDATION-REPORT.md`](./AI-VALIDATION-REPORT.md)

---

## 1. Veredito Beta

| Item | Status |
|------|--------|
| **Recomendação**: | **NO-GO** para beta **sem remediação dos 9 P0** (~6h de trabalho, 2 devs em paralelo em 1 dia). |
| Condição para GO: | Resolver 100% dos P0 (tabela §3) + executar `FULL-VALIDATION-CHECKLIST.md` em staging pós-fix + re-validação dos 3 reports pelos agentes originais. |
| Postura geral: | Base sólida (0 bugs BOLA novos, auth + middleware + CSP consistentes, paridade 100% pt/en, streams resilientes). Os P0 são **pontuais e de remediação rápida** — não são dívidas de arquitetura. |
| Risco pós-P0: | Baixo-Médio. Os P1 remanescentes (rate limit em CRUD, next-intl open redirect, acentuação em massa) são absorvíveis em sprint imediatamente após beta. |

**Justificativa do NO-GO**:

- 2 P0 bloqueiam segurança core (ENCRYPTION_KEY silencioso em prod + CVE Next.js DoS high).
- 3 P0 bloqueiam precisão AI/FinOps (Gemini 2.0 descontinuação em 45d, log de custo inflado 10x em plan, temperature default em tarefas estruturadas).
- 4 P0 de acentuação bloqueiam perception/first-impression no login e footer (primeira tela que beta user vê).
- Rodar checklist manual de 129 itens sobre estes P0 conhecidos desperdiça ciclos do PO e contamina severidades.

---

## 2. Top 10 Bugs por Severidade

> Ordenado por: (severidade) → (blast radius) → (menor esforço primeiro dentro da mesma severidade).
> Esforço: **XS** ≤ 15min, **S** ≤ 1h, **M** ≤ 4h, **L** > 4h.

| # | ID | Sev | Área | Bug | Impacto | Esforço | Fix |
|:-:|----|:---:|:----:|-----|---------|:-------:|-----|
| 1 | **BUG-AI-001** | P0 | AI | `gemini-2.0-flash` descontinuado em 2026-06-01 (45 dias) em `gemini.provider.ts:10-12` e `ai.service.ts:321-324`. | Em 45 dias, 100% das gerações IA via Gemini retornam 404. Se fallback Claude não estiver configurado em prod → app sem IA. | **S** | Trocar para `gemini-2.5-flash` em 4 constantes + `GEMINI_MODEL_ID_MAP`. Smoke em staging. |
| 2 | **ENV-001 / CRYPTO-001** | P0 | Security | `ENCRYPTION_KEY` marcada `optional` em `src/lib/env.ts`. Se ausente em prod, `encrypt()` lança em runtime, não em startup. | PII (passport, nationalId, bookingCode) **pode não ser criptografado silenciosamente**. Erro só aparece ao salvar uma Trip. | **S** | Refine Zod condicional: `.refine((v) => v.NODE_ENV !== "production" \|\| !!v.ENCRYPTION_KEY)`. |
| 3 | **DEP-001** | P0 | Security | CVE `GHSA-q4gf-8mx6-v5v3` (high) — DoS em Server Components no `next` 13.0.0-15.5.14. | Disponibilidade. Exploitable via tráfego maliciosamente estruturado. | **S** | `npm audit fix` → bump `next` >= 15.5.15 + smoke E2E. |
| 4 | **BUG-AI-002** | P0 | AI/FinOps | `CLAUDE_MODEL_ID_MAP.plan = "claude-sonnet-4-6"` em `ai.service.ts:315` **vs** provider real `PLAN_MODEL = "claude-haiku-4-5-20251001"` em `claude.provider.ts:13`. | `logTokenUsage()` calcula custo do plan com preço de Sonnet ($3/$15) em vez de Haiku ($1/$5). **Logs inflados ~10x** — qualquer dashboard FinOps aponta custos fantasma. | **XS** | Trocar string em `ai.service.ts:315` e atualizar docblock em `claude.provider.ts:229`. |
| 5 | **BUG-AI-003** | P0 | AI | Interface `AiProviderOptions` (ai-provider.interface.ts:26) não tem campo `temperature`. CHECKLIST v2 documenta `temperature 0.3 recommended` em `system-prompts.ts:121` mas **nunca aplica**. | Temperature default ≈ 1.0 em ambos providers → outputs estruturados variáveis → taxa de retry por schema violation maior que necessário. | **M** | Adicionar `temperature?: number` na interface; mapear guide=0.4 / plan=0.5 / checklist=0.3 nos construtores de `generationConfig` (Gemini) e `createParams` (Claude). |
| 6 | **UX P0-001..004** | P0 | UX | 4 acentos quebrados em telas críticas em `messages/pt-BR.json`: `auth.errors.oauthTitle` ("Autenticacao"), `auth.errors.oauthConfiguration` ("Ha"), `auth.errors.oauthAccessDenied` ("permissao"), `landing.footer.privacy` ("Politica"). | Primeira impressão do usuário nativo pt-BR na landing e no login. Percepção de falta de qualidade no produto. | **XS** | 4 edits pontuais em `messages/pt-BR.json`. |
| 7 | **CSP-001 / ROUTE-002** | P1 | Security | Middleware faz `return` antes de gerar CSP/HSTS/X-Frame para rotas `/api/*`. 9 rotas de API sem hardening de headers. | Integridade — rotas JSON sem hardening, facilita content-type confusion e MIME sniffing em respostas malformadas. | **S** | Mover lógica de headers para antes do `if (pathname.startsWith("/api")) return`, ou declarar `headers()` em `next.config.ts`. |
| 8 | **RL-001** | P1 | Security | ~40 server actions de CRUD sem rate limit: `expedition.actions` (~15), `trip.actions` (5), `checklist.actions` (3), `itinerary.actions` (5), **`deleteAccountAction`** (!), `gamification.actions` (5). | Disponibilidade + custo de DB. Pior caso: abuso de `deleteAccountAction` ou criação massiva de trips em loop. | **M** | `checkRateLimit()` em cada ação de escrita (60 req/min inicial). Priorizar `deleteAccountAction` (P0 subalterno). |
| 9 | **BUG-AI-004** | P1 | FinOps | `cost-calculator.ts:21-24` lista Haiku em `$0.80/$4.00` — preço do Claude 3.5 Haiku legado. Preço real `claude-haiku-4-5-20251001` = `$1.00/$5.00`. | Custo real subestimado em 20-25%. Combinado com BUG-AI-002, os logs de `ai.tokens.usage` ficam duplamente incorretos. | **XS** | Atualizar 2 números em `cost-calculator.ts`. |
| 10 | **UX P1-001 + P1-002** | P1 | UX | ~50 palavras sem acentuação em seções `expedition.*`, `gamification.*`, `errors.*`, `preferences.*`, `report`, `legal.privacy` + 3 tooltips em `en.json` admin KPI com "Pontos Atlas" em vez de "Atlas Points". | Percepção de qualidade degradada em 15+ telas pt-BR + 3 tooltips em EN. Não bloqueante mas notável. | **M** | Find-and-replace passada em `messages/pt-BR.json` (2h) + 3 substituições em `en.json` (10min). |

**Demais bugs documentados (não entram no top 10):**
- **P1**: `DEP-002` (next-intl open redirect), `OBS-001` (Sentry opcional em prod), `BOLA-002` (race condition em `spendPoints`), `BUG-AI-005` (~500 tokens lat/lon desperdiçados/plan), `P1-003` (contraste WCAG do CTA laranja), `BUG-S7-005` + `BUG-S7-006` (hardcoded "Traveler"/"Loading" en).
- **P2/P3**: 18 acentos em `admin.*`, `DEP-003` (hono), `ROUTE-001` (`/api/debug/flags`), `ENV-002` (SKIP_ENV_VALIDATION), `CRYPTO-002` (birthDate plaintext), `OBS-002` (alerta rate limit), `BUG-AI-006` (docblock obsoleto), `BUG-AI-007` (heurística flight), `LOG-001` (console.log analytics), `BOLA-001` (image action sem auth).

---

## 3. Resumo por Severidade

| Severidade | Total | Soma de esforço (min–max) | Dev dias* |
|:----------:|:-----:|--------------------------|:---------:|
| **P0** | 9 (4 UX acentos agrupados, 2 security, 3 AI) | ~5h–6h | 0.5–1 dev-day |
| **P1** | 13 | ~14h–20h | 2–3 dev-days |
| **P2** | 11 | ~12h–18h | 1.5–2.5 dev-days |
| **P3** | 4 | ~2h | <0.5 dev-day |

\* Estimativa conservadora de 1 dev focado; 2 devs em paralelo cortam os P0 em meio dia.

---

## 4. Must-Fix ANTES do Checklist Manual

> Critério: bug que, se presente durante a execução do `FULL-VALIDATION-CHECKLIST.md`, corromperia ou invalidaria itens do checklist — o PO testaria em cima de problemas conhecidos e registraria falsos positivos.

| # | Bug | Itens do checklist afetados | Motivo |
|:-:|-----|----------------------------|--------|
| 1 | **UX P0-001..004** (4 acentos em auth + footer) | A1–A7 (Login), B1–B6 (Registro), E3–E5 (Footer), D3 (Acentuação) | Se o PO vir "Autenticacao", vai registrar como bug D3 — mas já está no UX report. Checklist deve rodar com acentos corrigidos para encontrar **novos** bugs. **Esforço: XS (~15min).** |
| 2 | **BUG-AI-002** (CLAUDE_MODEL_ID_MAP.plan) | V1–V2 (FinOps), K1–K4 (AI guide), L6 (AI plan) | Item V2 do checklist diz literalmente "SE ainda reportando claude-sonnet-4-6 → registrar BUG-AI-002". Corrigir antes para V2 virar pass efetivo. **Esforço: XS (~15min).** |
| 3 | **BUG-AI-004** (preço Haiku) | V1 (Custo por expedition) | Se o item V1 for medido antes do fix, o cálculo de margem vai bater com o custo **errado** do log — confunde decisão de pricing. **Esforço: XS (~10min).** |
| 4 | **ENV-001 / CRYPTO-001** (ENCRYPTION_KEY) | L2 (Voo com bookingCode), O3 (mascaramento de bookingCode), S5 (`vercel env ls`) | Teste de bookingCode em staging pode dar erro de runtime **ou** salvar plaintext silenciosamente. Item S5 pede verificação da env — precisa existir. **Esforço: S (~1h), inclui setar a key em staging.** |
| 5 | **BUG-AI-001** (Gemini 2.0 descontinuação) | K1–K7, L6, N1–N4 (todas as gerações AI) | Se o staging já estiver rodando contra `gemini-2.0-flash`, as gerações funcionam hoje mas o teste não reflete a realidade de daqui a 45 dias. **Alternativa aceitável**: validar em staging que `AI_FALLBACK_PROVIDER=claude` está ligado e funciona — assim, o risco de descontinuação é absorvido pelo fallback mesmo sem o fix do Gemini model ID. **Esforço: S (~1h para migrar + smoke).** |

**Podem esperar até depois do checklist (mas entram no sprint imediatamente após)**:
- DEP-001 (Next.js CVE) — alto impacto mas **não afeta o que o PO vai testar manualmente**; a CVE é de DoS via tráfego especializado, não se reproduz no happy path. Entra no sprint de remediação P0 junto com os demais.
- BUG-AI-003 (temperature) — afeta variabilidade, não bloqueia teste funcional. Item R4 do checklist ainda pode rodar.
- UX P1-001 (~50 acentos em massa) — checklist já tem item D3 dedicado; o PO vai encontrar uma amostra e a contagem se mantém consistente com o UX report.

**Bloco mínimo de pré-checklist**: itens 1–5 acima ≈ **~3h de 1 dev focado** (os itens 1–3 são <40min somados; itens 4 e 5 dominam o tempo por demandarem verificação em staging).

---

## 5. Plano Sugerido de Execução

| Dia | Ação | Owner | Deliverable |
|:---:|------|-------|-------------|
| D+0 | Aprovar este summary + priorização | PO + tech-lead | Green light para fixes |
| D+1 AM | **Fixar 5 bloqueadores** da §4 (3h) | dev-fullstack-1 | PR com 5 fixes em 1 commit por bug (traceability) |
| D+1 PM | Smoke em staging + re-rodar UX grep | dev-fullstack-2 + ux-designer | Confirmação de P0 zerado |
| D+2 | PO executa `FULL-VALIDATION-CHECKLIST.md` (129 itens) | PO | Checklist preenchido + bugs novos registrados |
| D+3 AM | **Fixar P0 restantes** (DEP-001, BUG-AI-003, UX P0 restantes se houver) | dev-fullstack-1 + dev-fullstack-2 | PR |
| D+3 PM | Triagem de findings do checklist; decidir go/no-go Beta | tech-lead + PO | Decisão oficial |
| D+4 | Se GO: cut de release; se NO-GO: novo ciclo de fixes | release-manager | Tag v0.23.0-beta.1 ou novo plano |

---

## 6. Trilha Histórica

- `37bdbc4` `docs(ux): UX validation report pré-beta v0.22.0`
- `ef00cdf` `docs(security): security + observability static audit pre-beta v0.22.0`
- `bc6e263` `docs(ai): AI prompts + FinOps report pré-beta v0.22.0`
- `2749fee` `docs(specs): add SPEC-EVALS-V1 — Promptfoo methodology, composite trust score, quality gates`
- `7ffca2e` `test(evals): scaffold Promptfoo suite with datasets, graders, mock provider, and gate scripts`
- `0c2358a` `docs(testing): add FULL-VALIDATION-CHECKLIST with 129 items across 23 areas for staging validation`

---

**Assinaturas necessárias para fechamento de Fase 1:**

| Papel | Aprovação | Data |
|------|:---------:|------|
| Product Owner | [ ] | |
| Tech Lead | [ ] | |
| Security (architect dual-hat) | [ ] | |
| UX Designer | [ ] | |
| QA Engineer | [ ] | |
