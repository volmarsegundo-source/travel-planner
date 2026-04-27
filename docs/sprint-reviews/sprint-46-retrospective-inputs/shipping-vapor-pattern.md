# Sprint 46 Retrospective Input — "Shipping Vapor" Pattern

**Author:** dev-fullstack-1 (autonomous Sprint 46.5)
**Date:** 2026-04-27
**Severity classification:** P2 systemic (per PO decision); BLOCKED for Sprint 46 specific case (per PO decision)
**Reconciliation:** Interpretação A confirmada — caso BLOCKED + padrão P2 operam em camadas diferentes

---

## §1 What happened

Sprint 46 marked Wave 1 (8/8) and Wave 2 (9/9) as **✅ shipped** based on three signals:
1. **Code committed and pushed** — 17 commits in the range `cb7df47..9fd8487`
2. **Tests passing** — 223/223 green across 13 test files (all using mock DB / mock fetch)
3. **Trust Score met** — 0.95 ≥ 0.93 close-gate threshold

**But walk-through PO em 27/abr/2026 revelou que Wave 1+2 estava NÃO-FUNCIONAL em Staging:**
- Env var `AI_GOVERNANCE_V2` nunca configurada em Vercel Staging
- Seed `seedAiGovernanceV2Defaults` (B-W1-003) nunca executado contra Staging DB
- AdminNav nunca estendida com link para `/admin/ia` (B-W1-006 honesty flag #4 ficou em Markdown sem ticket)
- PO foi para legacy `/admin/prompts` (PromptViewer — Sprint 7-8 era) achando que era o Wave 2 editor

**Resultado:** PO não conseguiu validar nenhuma das 17 features Wave 2. Walk-through gate falhou. Sprint 46 close BLOCKED.

## §2 Why it happened

### §2.1 Definition of Done estava incompleto

DoD de cada item Sprint 46 incluía:
- ✅ Code committed
- ✅ Tests passing
- ✅ Trust Score met

Não incluía:
- ❌ Env vars setadas no ambiente de target
- ❌ Migration aplicada no ambiente de target
- ❌ Seed executado quando aplicável
- ❌ Feature acessível via primary nav (discoverability)
- ❌ Walk-through manual em ambiente real

### §2.2 Honesty flags como "informação publicada" não "ação acionável"

Release note de **B-W1-006** (commit `04d8d8e`) declarou:
> "**AdminNav not extended.** The existing `AdminNav.tsx` does NOT yet show a link to `/admin/ia`. Users access via direct URL or future Wave 2 nav update. Intentional — keeps coupling minimal during Wave 1."

Esta flag **não foi traduzida em ticket** para Wave 2. Wave 2 (B-W2-006) declarou seu próprio honesty flag de "embedding deferred" mas não fechou o de Wave 1. **Resultado:** flag passou de Wave 1 → Sprint Close 46 → walk-through 27/abr **sem ser fechada**, sem owner, sem deadline.

### §2.3 Tests contra mock DB ≠ feature funcional

223 tests passaram com **mocked Prisma client**. Nenhum desses tests verificou:
- Existência das tabelas em ambiente real
- Migration deploy em pipeline real
- Configuração de feature flag em Vercel
- Renderização do link na AdminNav real

Os tests provam **correctness do código** mas não **operability do feature**.

### §2.4 Nenhum gate operacional pre-walk-through

O sprint não tinha checkpoint formal entre "all items merged" e "PO walk-through". Sem checklist, sem owner ops dedicado, o ambiente de Staging continuou no estado de Sprint 45 enquanto código de Sprint 46 era mergeado.

## §3 Severity (PO decision)

**P2 systemic.** Razão da classificação — proposta canônica (Interpretação A):

| Camada | Severidade | Justificativa |
|---|---|---|
| **Caso atual** (Wave 1+2 não funcional em Staging) | BLOCKED | Concreto, sem ambiguidade — Sprint 46 não fecha sem walk-through OK em Staging real. |
| **Padrão sistêmico** (deploy/ops gap) | P2 | Não justifica freeze de novas features. Resolvível via processo (checklist + retrospective + S47 backlog items) sem código adicional crítico. |

Interpretação A foi confirmada pelo PO no início do Sprint 46.5.

## §4 Process corrections (Sprint 47+)

### §4.1 Esta Sprint (46.5)

- **F-OPS-06 ✅** — `docs/qa/wave-close-staging-readiness.md` formaliza o checklist binário pré-Wave-Close.
- **F-FIX-05 ✅** — AdminNav extendida fechando B-W1-006 honesty flag #4 estruturalmente.
- **F-OPS-04 ✅** — script `seed:v2-only` idempotente para reuso em Staging/Prod.
- **F-OPS-03 pending** — PO action: rodar `npm run seed:v2-only` contra Staging DB.

### §4.2 Sprint 47 (B47-* items)

- **B47-FLAGS-REGISTRY (P2)** — registry formal `docs/qa/honesty-flags-registry.md`. Cada flag de qualquer commit ganha entry: ID, source commit, severity, owner, target sprint, status (open/resolved/wont-fix). Substitui menções ad-hoc em Markdown que ressoam sem ação.
- **B47-UI-DOD-DISCOVER (P2)** — atualizar Definition of Done de UI items para incluir "discoverability" explicitamente. Componentes UI devem ser alcançáveis via primary navigation, não apenas renderizáveis quando montados. Documenta em `docs/process/definition-of-done.md` (a criar).

### §4.3 Permanente — Sprint 48+

- **Wave Close → Staging Ready checklist** vira pré-requisito DEFAULT de qualquer Wave Close formal.
- **Walk-through em Staging** vira gate obrigatório (não opcional) entre "all items merged" e "Sprint Close declarativo".
- **Cross-Wave honesty flag tracking** — toda flag publicada em release note de Wave N tem que ter owner + target Sprint + estado tracked no registry; release-notes podem mencionar mas não substituem registry entry.

## §5 Lessons learned

1. **"Code shipped" ≠ "feature shipped".** Métricas Sprint precisam separar essas duas dimensões.
2. **Honesty flags em Markdown sem ticket são dívida invisível.** Toda flag P1/P2 vira ticket; P3 entra em registry mas não bloqueia close.
3. **PO factual verification antes de release decisions é essencial.** Investigações inferenciais podem ter blind spots; PO checking SQL/Vercel/etc fecha gaps que código sozinho não fecha.
4. **Tests com mocks são necessários mas insuficientes.** Para features que tocam ambiente, ao menos um smoke test em ambiente real é necessário pre-Sprint-Close.
5. **Cross-Wave audit é caro mas vale.** B-W1-006 honesty flag #4 não foi auditada por Wave 2. Cross-Wave reviews seriam pegos isso. Recomendo: tech-lead faz pass de honesty flags de Wave anterior antes de Wave seguinte iniciar.

## §6 Não foi tudo ruim — O que funcionou

- **Decomposição Wave 2 em 9 itens** facilitou paralelismo e tracking individual.
- **Compliance test B47-API-RBAC-CONVENTION** ativou no commit certo, pegou regex bug no primeiro handler, e foi resolvido inline.
- **TDD discipline per item** (RED → GREEN) produziu 223 tests verde sem regressões.
- **PO factual verification disciplina** transformou inferências v1 em conclusões v2 mais sólidas. Recomendo manter como padrão.
- **Sprint 46.5 como continuation, não novo Sprint** — preserva continuidade de tracking sem inflar contagem.

## §7 Items para registrar formalmente em Sprint 46 retrospective doc

Quando o Sprint 46 retrospective doc formal (5-agent format per execution-plan §9) for produzido:

**Stop:**
- Stop declaring Wave Close based only on commits/tests passing.
- Stop publishing honesty flags em Markdown sem follow-up ticket.

**Start:**
- Start adopting `docs/qa/wave-close-staging-readiness.md` checklist por padrão.
- Start tracking honesty flags em registry formal (B47-FLAGS-REGISTRY).
- Start exigindo PO walk-through em Staging real antes de close formal.

**Continue:**
- Continue TDD discipline per item.
- Continue compliance tests para conventions críticas.
- Continue PO factual verification antes de release decisions.

---

**Esta input integra a retrospective formal Sprint 46. PO + tech-lead + qa + sec + architect contribuem suas próprias inputs separadamente para evitar bias de single-author (per execution-plan §9.2-9.4).**
