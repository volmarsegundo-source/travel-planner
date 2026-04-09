# Sprint 39 — Kickoff: Landing Page + Login V2

> **Baseline:** v0.33.0 (Sprint 38) — 2597 unit tests, 120/130 E2E
> **Objetivo:** Primeira migração visual usando os 7 componentes Atlas
> **Telas oficiais:** `atlas_landing_page_a_inspira_o/` + Login (a gerar no Stitch)
> **Feature flags:** `NEXT_PUBLIC_DESIGN_V2` controla V1 ↔ V2

---

## ETAPA 1 — PO reconcilia backlog

```
@product-owner

Estamos iniciando o Sprint 39 — "Landing Page + Login V2".

Contexto:
- Sprint 38 entregou a fundação: 59 tokens, 7 componentes Atlas, feature flag,
  ESLint rules, visual regression baselines. Tudo aprovado pelo UX Designer.
- Agora é hora de usar essa fundação para migrar as primeiras telas reais.

Objetivo deste sprint: Criar versões V2 da Landing Page e Login usando
os componentes Atlas, controladas por feature flag.

4 itens low-severity do Sprint 38 para incluir no backlog:
1. aria-pressed duplication on chips (minor a11y)
2. Wizard phase circles 40px on mobile (should be 44px)
3. Missing primary glow shadow token
4. ESLint doesn't catch cn() or cva() string args

Telas de referência:
- Landing Page → docs/design/stitch-exports/atlas_landing_page_a_inspira_o/
- Login → precisa ser gerada no Stitch (ou baseada nos componentes Atlas)

Deliverables esperados:
1. LandingPageV2 com: Hero, Social Proof, How It Works, Feature Grid, CTA Banner, Footer
2. LoginPageV2 com: form funcional usando AtlasInput + AtlasButton
3. Feature flags integrando V1 ↔ V2 (flag OFF por padrão)
4. E2E passando com flags ON e OFF
5. UX Designer aprovou fidelidade visual no staging
6. PO aprovou o visual no staging

Reconcilie o backlog e crie as tasks seguindo o processo SDD.
Todas as specs devem ter 9 dimensões aprovadas antes dos devs codarem.
```

---

## ETAPA 2 — UX Designer define critérios visuais

```
@ux-designer

Estamos iniciando o Sprint 39 — Landing Page + Login V2.

Antes de qualquer implementação:

1. Analise docs/design/stitch-exports/atlas_landing_page_a_inspira_o/
   - Leia o code.html (estrutura e estilos do Stitch)
   - Compare o screen.png com os componentes Atlas disponíveis
   
2. Para a Landing Page V2, defina:
   - Mapeamento de cada seção (Hero, Social Proof, How It Works, Feature Grid,
     CTA Banner, Footer) para os componentes Atlas (AtlasButton, AtlasCard, etc.)
   - Quais elementos precisam de componentes novos ou composições
   - Tokens de cor/tipografia/espaçamento específicos para cada seção
   - Breakpoints responsivos (mobile 375px, tablet 768px, desktop 1440px)
   - Animações e micro-interações esperadas

3. Para a Login Page V2, defina:
   - Layout (centrado, split-screen, etc.)
   - Composição com AtlasInput (email + password com toggle) + AtlasButton
   - Elementos visuais complementares (logo, ilustração, tagline)

4. Inclua os 4 fixes low-severity do Sprint 38 na sua análise

5. Produza um checklist de fidelidade visual que será usado para 
   validar cada seção implementada contra o screen.png.

Este checklist é pré-requisito para os devs começarem.
Siga o processo SDD — este parecer alimenta a dimensão UX da spec.
```

---

## ETAPA 3 — Tech Lead valida e planeja

```
@tech-lead

O PO criou as tasks do Sprint 39 — Landing Page + Login V2.
O UX Designer definiu o checklist de fidelidade visual.

Antes de começar:
1. Leia o checklist de fidelidade do UX Designer
2. Leia docs/design/stitch-exports/atlas_landing_page_a_inspira_o/code.html
3. Leia docs/design/SCREEN-INDEX.md
4. Leia atlas-design-migration-plan.md seção 4 (Sprint 39)

IMPORTANTE — PROCESSO SDD:
Spec com 9 dimensões aprovadas antes de codar.
Fonte de verdade: UX-PARECER-DESIGN-SYSTEM.md + checklist do UX para este sprint.

Contexto técnico:
- 7 componentes Atlas prontos em src/components/ui/
- Feature flag system pronto (NEXT_PUBLIC_DESIGN_V2 + DesignBranch)
- ESLint enforcing tokens do design system
- Visual regression baselines do V1 existentes

Distribuição sugerida:

Track 1 — dev-fullstack-1: Landing Page V2
  - Hero Section
  - Social Proof Bar
  - How It Works (3 cards)
  - LoginPageV2
  - Integração feature flag landing

Track 2 — dev-fullstack-2: Landing Page V2 (continuação)
  - Feature Bento Grid
  - CTA Banner
  - Footer (LGPD compliance)
  - Integração feature flag login
  - 4 fixes low-severity do Sprint 38

Cross-cutting:
  - UX Designer valida cada seção implementada
  - QA: E2E com flags ON e OFF
  - QA: Visual regression baselines V2
  - QA: Teste responsivo (375px, 768px, 1440px)

Valide o plano, ajuste se necessário, e inicie a execução.
```

---

## ETAPA 4 — Execução dos Devs

O tech-lead orquestra. Ordem de execução:

### 4.1 Landing Page V2 — Seções (ambos devs em paralelo)

**Fullstack Dev 1:**
- `src/components/features/landing/HeroSectionV2.tsx` — heading display, subheading, 
  2 CTAs (AtlasButton primary + secondary), background decorativo
- `src/components/features/landing/SocialProofBarV2.tsx` — métricas animadas, 
  ícones Lucide
- `src/components/features/landing/HowItWorksV2.tsx` — 3 AtlasCards com 
  glassmorphism e hover
- `src/components/features/landing/LoginPageV2.tsx` — AtlasInput (email + password) 
  + AtlasButton + logo + tagline

**Fullstack Dev 2:**
- `src/components/features/landing/FeatureGridV2.tsx` — bento grid 2x2 com 
  AtlasCards, previews de funcionalidades
- `src/components/features/landing/CTABannerV2.tsx` — gradient, heading branco, 
  AtlasButton
- `src/components/features/landing/FooterV2.tsx` — 3 colunas, links LGPD, 
  social icons, logo Atlas
- 4 fixes low-severity Sprint 38

**Cada seção deve:**
- Usar APENAS componentes de `src/components/ui/`
- Usar APENAS tokens do `tailwind.config.ts` (atlas-* prefix)
- Ter testes unitários
- Ser responsiva (mobile-first: 375px → 768px → 1440px)
- Referenciar `screen.png` para fidelidade visual
- Respeitar `prefers-reduced-motion` nas animações

### 4.2 Integração das páginas V2

```typescript
// src/app/page.tsx (ou equivalente)
import { DesignBranch } from '@/components/ui'
import { LandingPageV1 } from '@/components/features/landing/LandingPageV1'
import { LandingPageV2 } from '@/components/features/landing/LandingPageV2'

export default function HomePage() {
  return (
    <DesignBranch
      v1={<LandingPageV1 />}
      v2={<LandingPageV2 />}
    />
  )
}
```

### 4.3 UX Designer valida implementação (OBRIGATÓRIO)

Após os devs finalizarem:

```
@ux-designer

Os devs implementaram a Landing Page V2 e Login V2.

Valide contra seu checklist de fidelidade visual:

Para cada seção (Hero, Social Proof, How It Works, Feature Grid, CTA Banner, Footer):
1. Fidelidade visual com screen.png do Stitch — aceitável?
2. Componentes Atlas usados corretamente?
3. Tokens de cor/tipografia/espaçamento corretos?
4. Responsivo: mobile 375px, tablet 768px, desktop 1440px?
5. Animações suaves e respeitam prefers-reduced-motion?
6. Contraste WCAG AA em todos elementos?
7. Touch targets ≥ 44px em elementos interativos?

Para o Login V2:
1. AtlasInput com label, error state, password toggle?
2. AtlasButton com loading state?
3. Layout coerente com identidade Atlas?

Se algo não atende, liste correções. Nenhum merge sem sua aprovação.
Os 4 fixes low-severity do Sprint 38 foram implementados?
```

### 4.4 E2E com Feature Flags

```
@tech-lead

Teste o feature flag system:

1. NEXT_PUBLIC_DESIGN_V2=false → rodar E2E completo
   - Todos 120+ testes devem passar (V1 intacto)
   
2. NEXT_PUBLIC_DESIGN_V2=true → rodar E2E completo
   - Testes que dependem de seletores da Landing/Login podem precisar 
     de atualização (novos data-testid)
   - Atualizar seletores na mesma PR

3. Ativar flag no staging para review visual

Reporte resultados de ambas rodadas.
```

---

## ETAPA 5 — Validação Final

### 5.1 UX Designer — Aprovação final no staging

```
@ux-designer

Sprint 39 está em fase de validação final.
A Landing V2 e Login V2 estão live no staging com feature flag ativa.

Acesse travel-planner-eight-navy.vercel.app e valide:
1. Landing Page V2 — todas seções correspondem ao screen.png do Stitch?
2. Login V2 — fluxo funcional e visualmente coerente?
3. Responsivo — testar mobile e tablet no DevTools
4. Os 4 fixes low-severity do Sprint 38 foram resolvidos?
5. Algum ajuste fino necessário antes de fechar?

Emita parecer final de aprovação.
O sprint NÃO pode ser fechado sem sua aprovação.
```

### 5.2 PO review no staging

```
Acesse o staging e valide:
1. Landing Page V2 representa a identidade do Atlas?
2. Login V2 funciona corretamente?
3. A feature flag está funcionando (V1 intacto com flag OFF)?
4. Aprovação formal para prosseguir com Sprint 40.
```

### 5.3 Checklist de validação

```
@tech-lead

Valide o Sprint 39 com esta checklist:

TELAS V2:
- [ ] LandingPageV2 — Hero Section implementada e aprovada pelo UX
- [ ] LandingPageV2 — Social Proof Bar implementada e aprovada pelo UX
- [ ] LandingPageV2 — How It Works implementada e aprovada pelo UX
- [ ] LandingPageV2 — Feature Bento Grid implementada e aprovada pelo UX
- [ ] LandingPageV2 — CTA Banner implementada e aprovada pelo UX
- [ ] LandingPageV2 — Footer implementada e aprovada pelo UX (LGPD)
- [ ] LoginPageV2 implementada e aprovada pelo UX

FEATURE FLAGS:
- [ ] DesignBranch integrado na Landing Page
- [ ] DesignBranch integrado na Login Page
- [ ] Flag OFF → V1 renderiza (E2E verde)
- [ ] Flag ON → V2 renderiza (E2E verde)
- [ ] Flag OFF por padrão em produção

RESPONSIVO:
- [ ] Mobile 375px — layout não quebra
- [ ] Tablet 768px — layout não quebra
- [ ] Desktop 1440px — layout fiel ao Stitch

QUALIDADE:
- [ ] 2597+ testes unitários passando
- [ ] 120+ E2E passando com flag OFF
- [ ] E2E passando com flag ON (seletores atualizados)
- [ ] Visual regression baselines V2 tirados
- [ ] ZERO mudança visual com flag OFF
- [ ] 4 fixes low-severity Sprint 38 resolvidos

APROVAÇÕES:
- [ ] UX Designer aprovou fidelidade visual no staging
- [ ] PO aprovou o visual no staging
- [ ] Sprint review documentado

Reporte o status de cada item.
```

---

## ETAPA 6 — Fechar o Sprint

```
@tech-lead

Gere o sprint review do Sprint 39 — Landing Page + Login V2.
Inclua: seções implementadas, métricas de testes (antes/depois),
resultado do feature flag, parecer do UX Designer, e status para Sprint 40.
Salve em docs/sprint-reviews/SPRINT-39-REVIEW.md
```

```
@release-manager

Crie a release v0.34.0 com tag e changelog.
Título: "Landing Page + Login V2"
Escopo: Landing Page V2 (6 seções), Login V2, feature flag integration.
Nota: Design V2 controlado por feature flag — OFF em produção por padrão.
```

```bash
git push origin main --tags
```
