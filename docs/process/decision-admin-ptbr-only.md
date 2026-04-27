# Decisão Arquitetural: Admin pages PT-only

**Data:** 2026-04-27
**Origem:** PO Walk-through #2 Sprint 46
**Decisor:** Volmar (PO)
**Status:** APPROVED
**Tipo:** Architectural Decision (não-ADR — decisão de produto, não código)
**Memória:** [`project_admin_locale_pt_br.md`](../../../C--travel-planner/memory/project_admin_locale_pt_br.md) (registrada na sessão Sprint 46 close)

---

## §1 Decisão

Admin pages (`/admin/*`) target audience único é o PO (Volmar). i18n EN **não é requerida** para admin surfaces. Mensagens de validação (V-01..V-08, W-01..W-04), admin help text, audit log displays e qualquer texto admin-only podem ser **PT-only**.

---

## §2 Razão

| Argumento | Peso |
|---|---|
| Admin é uma tela operacional para PO único, não usuário final | Alto |
| Atlas é multilíngue para usuários finais (público-facing PT/EN obrigatório) | Alto |
| Admin não tem ROI para investir em EN translation work | Alto |
| Reduz overhead de manutenção (i18n keys + reviews + tests bilíngues) | Médio |
| Sprint 47 B47-UI-DOD-DISCOVER scope reduz ~30% sem EN mirror trabalho | Médio |

---

## §3 Escopo

### §3.1 Aplica-se a

- **Rotas** `/admin/*` — toda hierarquia admin (dashboard, ai-governance, prompts, errors, feedback, analytics, ia)
- **Validações server-side** — mensagens V-01..V-08 + W-01..W-04 retornadas pela API
- **Admin help text in-editor** — Sprint 47 B47-UI-DOD-DISCOVER e futuros
- **Audit log displays** — Wave 5+ surfaces de read AuditLog
- **Configuration screens** — Wave 3+ model assignment, runtime config edit
- **Curadoria UI** — Wave 4 outputs review queue
- **Eval results UI** — Wave 5 Promptfoo integration

### §3.2 NÃO aplica-se a

- **Páginas público-facing** — `/`, `/destinations`, `/expeditions`, `/atlas`, `/onboarding`, `/auth/*`
- **Email templates** user-facing (welcome, reset password, verification, trip notifications)
- **Error pages** user-facing (404, 500 — visível para qualquer visitante)
- **Marketing/SEO content**
- **API errors** retornados para client público (responses fora de `/api/admin/*`)
- **Static OG/meta** tags

### §3.3 Caso de fronteira: AdminNav `navAi` key

A key `admin.navAi` está em ambos `messages/en.json` e `messages/pt-BR.json` (commit `a878f62`). Mantida assim por:
1. Convenção do código existente (todas keys do namespace `admin` estão mirrored)
2. Custo zero — string já existe; remoção exigiria refactor i18n com risco de regressão
3. Não-blocker: PT-only OK não significa **proibido** EN; é **não-obrigatório**

Não é necessário "limpar" EN keys já presentes em admin namespace. Apenas: **novas** strings admin-only podem ser PT-only sem mirror.

---

## §4 Implicações práticas

### §4.1 Sprint 47 — B47-UI-DOD-DISCOVER

Effort original: ~5h (5 sub-itens com EN mirror).
Effort revisado: ~3.5h (sub-itens PT-only, sem EN translation).

Sub-itens:
- §A Help text de sintaxe placeholder (~30 min, PT-only)
- §B Lista de obrigatórios reativa ao modelType (~1.5h, PT-only)
- §C Lista de forbidden visíveis (~30 min, PT-only)
- §D Validação real-time client-side (~2h, PT-only — pode deferir Wave 3+ se trade-off de complexidade)
- §E V-06/V-07/V-08 shape exemplos no help text (~30 min, PT-only)

### §4.2 Wave Close → Staging Ready checklist

`docs/qa/wave-close-staging-readiness.md` §4 evoluído:
- §4(a) Feature alcançável via primary nav — **binário**, OBRIGATÓRIO
- §4(b) Feature tem help text in-editor — **escala**:
  - Para admin pages: PT-only é aceitável (referenciar este doc)
  - Para user-facing: PT/EN obrigatório

### §4.3 Wave 3+ futuras

Admin features adicionadas em Wave 3+ (model config, kill-switch toggles, curadoria UI, eval UI) podem ser PT-only desde concepção — sem necessidade de adicionar EN keys preventivamente.

### §4.4 Tests

Tests de admin components NÃO precisam testar locale EN para mensagens admin-only. Testar PT-BR é suficiente.

User-facing components (componentes de `/expeditions/*`, `/atlas/*`, etc.) **continuam** com testes PT/EN obrigatórios.

### §4.5 Code review checklist

Reviewer deve perguntar: "esta string aparece em admin surface ou user-facing surface?"
- Admin → PT-only OK; reviewer não exige EN mirror
- User-facing → PT/EN obrigatório; reviewer rejeita PR sem EN

---

## §5 Reversibilidade

Decisão é **reversível** se ocorrer pelo menos um dos seguintes:

| Trigger | Probabilidade | Ação |
|---|---|---|
| Atlas adicionar admin user não-Brasileiro | Baixa (PO única no Sprint 46-47 horizon) | Revisitar decisão; backfill EN translations das strings admin existentes |
| Cliente externo (corporate) precisar admin EN | Baixa (modelo Atlas é B2C) | Revisitar; possivelmente criar admin-multilang feature flag |
| Equipe internacional incorporada com role admin | Média (post-Beta) | Revisitar; backfill EN |
| Compliance/regulação exigir admin bilíngue | Baixa | Revisitar |

**Custo de reverter:** estimado em ~4-8h (adicionar EN keys para todas admin strings + tests + review). Não é dívida técnica significativa porque decisão atual evita criar a dívida em primeiro lugar.

---

## §6 Audit trail

| Data | Evento | Reference |
|---|---|---|
| 2026-04-27 | PO walk-through #2 expõe F-WALK2-03 (mensagens PT em UI EN) | `docs/qa/sprint-46-walk-through-2-findings.md` §3.3 |
| 2026-04-27 | PO confirma decisão arquitetural admin PT-only | Esta sessão Sprint 46 close |
| 2026-04-27 | Memory entry registrada | `memory/project_admin_locale_pt_br.md` |
| 2026-04-27 | Doc canônico criado | Este arquivo |
| 2026-04-27 | F-WALK2-03 marcado won't-fix em findings-registry | `docs/qa/findings-registry.md` |
| 2026-04-27 | Sprint 46 release notes §8.1 referenciam decisão | `docs/sprint-reviews/sprint-46-release-notes.md` |

---

## §7 References

- **Origem walk-through #2:** `docs/qa/sprint-46-walk-through-2-findings.md` (commit `7da7f69`) §3.3
- **Sprint 46 release notes:** `docs/sprint-reviews/sprint-46-release-notes.md` §8.1
- **Wave Close checklist:** `docs/qa/wave-close-staging-readiness.md` §4 (atualizado nesta release)
- **Sprint 47 backlog:** `docs/specs/sprint-47-candidates/BACKLOG.md` B47-UI-DOD-DISCOVER (scope revisado)
- **Findings registry:** `docs/qa/findings-registry.md` F-WALK2-03 (won't-fix)
