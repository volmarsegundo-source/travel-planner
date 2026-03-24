# Sprint 40 — Task Breakdown

**Versao**: 1.0.0
**Data**: 2026-03-24
**Autor**: product-owner
**Sprint Theme**: "Migracao Visual Completa — Shell, Fases 1-6, Dashboard"
**Budget**: 50h (43h alocados + 7h buffer)
**Target version**: v0.35.0

---

## Estrutura de Tracks

O sprint opera em duas tracks paralelas de ~25h cada. A Track 1 e a dependencia critica: o `PhaseShellV2` (T1.1-T1.5) deve estar aprovado antes que qualquer fase seja integrada ao shell na Track 2.

```
Track 1 (dev-fullstack-1)        Track 2 (dev-fullstack-2)
  SPEC-PROD-051 (Shell)            SPEC-PROD-053 (Fases 4-6 + Summary)
  SPEC-PROD-052 (Fases 1-3)        SPEC-PROD-054 (Dashboard)
        |                                 |
        +------------- Merge gate --------+
                  (shell aprovado)
```

---

## Track 1 — dev-fullstack-1 (~25h)

### Fase A: SPEC-PROD-051 — Phase Shell V2 + Authenticated Nav V2

**Prerequisito de TUDO. Iniciar no dia 1 do sprint.**

| ID | Tarefa | Estimativa | Spec | Criterio de Conclusao |
|----|--------|------------|------|-----------------------|
| T1.1 | Criar `PhaseShellV2` — estrutura base: sidebar desktop, slot de conteudo principal, integracao com `DesignBranch` no app layout autenticado | 2h | SPEC-PROD-051 AC-01 | Shell renderiza em rota de fase com flag ON; V1 inalterado com flag OFF |
| T1.2 | Implementar `AuthenticatedNavbarV2` — logo, PA badge (atlas-secondary-container), user menu (extend UserMenu existente), language switcher | 2h | SPEC-PROD-051 AC-05, AC-06, AC-07 | Navbar V2 renderiza; PA badge navega para `/atlas/purchases`; dropdown funciona; V1 inalterado com flag OFF |
| T1.3 | PhaseShellV2 sidebar: `AtlasPhaseProgress` com estados completed/active/locked, secao de PA balance na base, breadcrumb com nav semantico | 2h | SPEC-PROD-051 AC-02, AC-03, AC-04, AC-11 | Sidebar visivel em >= 1024px; progress states corretos; breadcrumb com `<nav aria-label>` |
| T1.4 | PhaseShellV2 responsive: ocultar sidebar em < 1024px, renderizar barra horizontal de progresso no topo; navbar mobile compacta (< 768px) | 1h | SPEC-PROD-051 AC-08, AC-09 | Breakpoints 375/768/1024/1440 validados; touch targets >= 44px |
| T1.5 | Unit tests SPEC-PROD-051 + E2E flag ON/OFF + axe-core audit | 1h | SPEC-PROD-051 AC-10, AC-12 | >= 80% coverage; E2E verde flag ON e OFF; zero axe violations AA |

**Gate de shell**: Revisao de UX Designer e aprovacao tecnica do tech-lead requeridas antes de iniciar T1.6.

---

### Fase B: SPEC-PROD-052 — Wizard Phases 1-3 V2

**Inicia apos gate de shell (T1.5 aprovado).**

| ID | Tarefa | Estimativa | Spec | Criterio de Conclusao |
|----|--------|------------|------|-----------------------|
| T1.6 | Phase 1 V2 — Step 1 (personal info): `AtlasInput` para nome e data de nascimento; card com `atlas-surface-container-lowest` bg e `atlas-outline-variant` border | 1h | SPEC-PROD-052 AC-01, AC-02 | Inputs rendem com estados corretos (default, focus, error, disabled) |
| T1.7 | Phase 1 V2 — Step 2 (destino): `DestinationAutocomplete` V2 com dropdown `atlas-surface-container-low`, item selecionado `atlas-secondary-fixed` | 1h | SPEC-PROD-052 AC-03 | Autocomplete funciona; seleção visualmente correta; debounce 300ms preservado |
| T1.8 | Phase 1 V2 — Step 3 (datas): date range picker com fill `atlas-secondary-container` e texto `atlas-primary` | 1h | SPEC-PROD-052 AC-04 | Range visualmente correto; keyboard-operable |
| T1.9 | Phase 1 V2 — Step 4 (confirmação): `AtlasCard` summary + `AtlasButton` CTA (atlas-secondary-container bg / atlas-primary text) | 1h | SPEC-PROD-052 AC-05 | Card renderiza; botao CTA com par de cores aprovado WCAG 4.5:1 |
| T1.10 | Phase 2 V2 — preferences chips (`AtlasChip` selected/unselected states), budget cards (border states), pasta UX Designer inline review gate | 2h | SPEC-PROD-052 AC-07, AC-09 | Chips e cards com estados corretos; UX aprovado antes do merge |
| T1.11 | Phase 2 V2 — `AtlasStepperInput` para passengers (adults/children/infants/seniors), acessibilidade chips grupo (`aria-label`, `aria-pressed`) | 2h | SPEC-PROD-052 AC-08, AC-10, AC-12 | Steppers funcionam; grupos de chips acessiveis; 375px 2-column reflow |
| T1.12 | Phase 3 V2 — checklist item toggles (atlas-success checked / atlas-outline-variant unchecked / strikethrough), category completion badge (`AtlasBadge`) | 2h | SPEC-PROD-052 AC-13, AC-15 | Toggle states corretos; strikethrough presente; badge appends when all checked |
| T1.13 | Phase 3 V2 — AI loading skeleton (`atlas-surface-container-high` animated), tablet 768px single-column layout | 1h | SPEC-PROD-052 AC-14, AC-16 | Skeleton renderiza durante AI load; tablet layout correto |
| T1.14 | Unit tests SPEC-PROD-052 + E2E flag ON/OFF (Phases 1-3) + axe-core audit | 3h | SPEC-PROD-052 AC-06, AC-11, AC-17, AC-18 | >= 80% coverage; todos os E2E V1 verdes com flag OFF; zero axe violations AA |

---

## Track 2 — dev-fullstack-2 (~25h)

**Componentes de Phase 4-6 e Dashboard podem ser desenvolvidos em paralelo com Track 1. Integracao ao shell aguarda gate T1.5.**

### Fase C: SPEC-PROD-053 — Wizard Phases 4-6 V2 + Expedition Summary V2

| ID | Tarefa | Estimativa | Spec | Criterio de Conclusao |
|----|--------|------------|------|-----------------------|
| T2.1 | Phase 4 V2 — 3-step layout (Transport/Accommodation/Mobility): `AtlasCard` containers, step headings | 1h | SPEC-PROD-053 AC-01 | Cards renderizam com tokens corretos; step navigation funciona |
| T2.2 | Phase 4 V2 — transport segment row (atlas-secondary-fixed bg, edit icon), accommodation row (masked booking code, reveal toggle) | 2h | SPEC-PROD-053 AC-02, AC-03 | Rows rendem corretamente; booking code mascarado; reveal toggle funciona; 375px full-width |
| T2.3 | Phase 4 V2 — mobility `AtlasChip` (selected: atlas-secondary-container, unselected: atlas-surface-container-high), 375px layout | 1h | SPEC-PROD-053 AC-04, AC-06 | Chips com estados corretos; touch targets >= 44px |
| T2.4 | Phase 5 V2 — bento-grid layout: 1 featured card (full-width mobile) + 4 category cards (2x2 desktop); `AtlasCard` com icon atlas-on-tertiary-container (#1c9a8e) | 2h | SPEC-PROD-053 AC-07, AC-08 | Bento grid renderiza corretamente; icones com cor teal; tablet single-column |
| T2.5 | Phase 5 V2 — AI loading skeleton bento-grid (atlas-surface-container-high placeholders); keyboard navigation logica de DOM order | 1h | SPEC-PROD-053 AC-09, AC-10, AC-12 | Skeleton cobre areas esperadas; tabs/focus em ordem correta |
| T2.6 | Phase 6 V2 — timeline estrutura: day headers (`atlas-text-h3` + atlas-secondary-container left-border); activity nodes (time slot, activity name, location AtlasChip atlas-primary-fixed bg) | 3h | SPEC-PROD-053 AC-13, AC-14 | Timeline estrutura semantica com `<section>` por dia; heading acessivel |
| T2.7 | Phase 6 V2 — streaming progressive render: cada day block aparece incrementalmente; `prefers-reduced-motion` respeitado; activity detail modal/panel com focus trap | 2h | SPEC-PROD-053 AC-15, AC-16, AC-18 | Stream preservado; animacoes desativadas com prefers-reduced-motion; modal fecha com Escape |
| T2.8 | Expedition Summary V2 — 6 section cards (`AtlasCard` + `AtlasBadge` status + edit link), hero summary bar (`atlas-primary-container` bg / `atlas-on-primary` text) | 2h | SPEC-PROD-053 AC-19, AC-20 | Todos os 6 secoes presentes; hero bar com tokens corretos |
| T2.9 | Unit tests SPEC-PROD-053 + E2E flag ON/OFF (Phases 4-6 + Summary) + axe-core audit | 3h | SPEC-PROD-053 AC-05, AC-11, AC-17, AC-21 | >= 80% coverage; E2E V1 verdes com flag OFF; zero axe violations AA |

---

### Fase D: SPEC-PROD-054 — Dashboard "Meu Atlas" V2

**P1 — iniciar apos T2.9 aprovado. Se budget apertar, escorrega para Sprint 41.**

| ID | Tarefa | Estimativa | Spec | Criterio de Conclusao |
|----|--------|------------|------|-----------------------|
| T2.10 | Dashboard V2 — expedition list: `AtlasCard` com trip name, destination `AtlasBadge`, date range, `AtlasPhaseProgress` inline; grid 1/2/3 col por breakpoint | 3h | SPEC-PROD-054 AC-02, AC-03, AC-07, AC-08, AC-09 | Cards rendem corretamente nos 3 breakpoints; progress states corretos |
| T2.11 | Dashboard V2 — empty state: ilustracao/icone atlas-on-tertiary-container, heading atlas-text-h2, CTA `AtlasButton`; regra max 20 trips (CTA desabilitado quando atingido) | 1h | SPEC-PROD-054 AC-04 | Empty state renderiza; CTA desabilitado com mensagem informativa ao atingir limite |
| T2.12 | Dashboard V2 — filter/sort controls: `AtlasChip` pills para status; mobile bottom sheet collapse; PA balance header com "Comprar PA" `AtlasButton` | 2h | SPEC-PROD-054 AC-05, AC-06, AC-07 | Filtros funcionam client-side; bottom sheet mobile com focus trap; PA balance visivel |
| T2.13 | Unit tests SPEC-PROD-054 + E2E flag ON/OFF (Dashboard) + axe-core audit | 2h | SPEC-PROD-054 AC-10 | >= 80% coverage; E2E V1 verdes com flag OFF; zero axe violations AA |

---

## Tarefas Cross-Track

| ID | Tarefa | Responsavel | Estimativa | Momento |
|----|--------|-------------|------------|---------|
| TX.1 | UX Designer mid-sprint review — shell aprovado (T1.5) + Phase 1 rascunho (T1.9) | ux-designer | 2h | Dia 5-6 do sprint |
| TX.2 | UX Designer final review — todas as specs antes do merge | ux-designer | 2h | Dia 9-10 do sprint |
| TX.3 | Sprint review document | tech-lead | 1h | Dia 10 (final) |
| TX.4 | Buffer: ajustes de fidelidade identificados em TX.1 / TX.2 | Track 1 + Track 2 | 2h | Distribuido |

---

## Ordem de Sacrificio (se o budget estourar)

A ordem de corte, caso o sprint fique apertado, e:

1. **Cortar primeiro**: T2.13 (Dashboard E2E) — pode ser completado no inicio do Sprint 41 sem bloquear merge do Dashboard
2. **Cortar segundo**: SPEC-PROD-054 inteiro (Dashboard V2, P1) — escorrega para Sprint 41 com spec pronta
3. **Cortar terceiro**: T2.8 (Expedition Summary V2) — pode ser mantido em V1 dentro do shell V2 temporariamente
4. **Jamais cortar**: SPEC-PROD-051 (shell — prerequisito absoluto), SPEC-PROD-052 (Fases 1-3), SPEC-PROD-053 core (Fases 4-6 sem summary)

---

## Definition of Done (Sprint 40)

Uma tarefa e considerada DONE quando:

- [ ] Implementacao usa apenas tokens `atlas-*` (zero `slate-*`, `amber-*`, `green-*` inline em codigos V2)
- [ ] Feature flag `NEXT_PUBLIC_DESIGN_V2` gateando corretamente (flag OFF = zero alteracao visual V1)
- [ ] Unit tests cobrindo >= 80% das linhas do componente V2
- [ ] E2E passando com flag ON e flag OFF
- [ ] axe-core sem violacoes AA no componente
- [ ] UX Designer aprovou a fidelidade ao design system (Stitch export ou inline review)
- [ ] PR referencia o Spec ID correto no titulo (`[SPEC-PROD-0XX]: ...`)
- [ ] Sem regressoes no Playwright screenshot baseline (flag OFF)

---

## Dependencias Externas

| Dependencia | Status | Owner | Notas |
|-------------|--------|-------|-------|
| AtlasButton, AtlasInput, AtlasCard, AtlasChip, AtlasBadge, AtlasPhaseProgress, AtlasStepperInput (Sprint 38) | COMPLETO | dev-fullstack | Disponivel em `src/components/ui/` |
| `DesignBranch` component (Sprint 38-39) | COMPLETO | dev-fullstack | Padrao estabelecido |
| Gamification PA balance API (Sprint 35-36) | COMPLETO | dev-fullstack | Disponivel para fetch server-side |
| Stitch exports: Phase 1, Phase 3, Phase 6, Dashboard | DISPONIVEL | ux-designer | Ver `docs/design/SCREEN-INDEX.md` |
| Stitch exports: Phase 2, Phase 4, Phase 5, Summary | NAO EXISTE | ux-designer | Design inline — requer review UX antes de T1.10, T2.1, T2.4, T2.8 |
| Sprint 39 SPEC-PROD-048/049 completos | EM ANDAMENTO | dev-fullstack | Necessario para consistencia visual mas nao bloqueia T1.1 |
