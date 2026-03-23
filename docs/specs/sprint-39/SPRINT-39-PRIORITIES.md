# Sprint 39 — Prioridades e Decisoes de Escopo

**Versao**: 1.0.0
**Data**: 2026-03-23
**Autor**: product-owner
**Status do produto**: v0.33.0 (Sprint 38 completo — Design System Foundation) / v0.34.0 em planejamento
**Tema do sprint**: "Landing Page + Login V2"

---

## Contexto: A Primeira Reforma Visual

O Sprint 38 construiu os andaimes: 59 tokens `atlas-*`, 7 componentes, feature flag, ESLint rules, fontes carregadas, visual regression baseline. Nenhum usuario viu a diferenca — intencionalmente.

O Sprint 39 e onde a transformacao visual se torna visivel. Pela primeira vez, com `NEXT_PUBLIC_DESIGN_V2=true` em staging, um revisor pode navegar para `/` e ver a landing page do Atlas como ela foi projetada. Navegar para `/auth/login` e ver o formulario two-column premium com o glow teal e o floating card de "proxima viagem".

A escolha de comecar pela landing page e login e estrategica:
1. Sao as telas mais vistas por nao-usuarios (top of funnel)
2. Sao as mais desconexas do design atual — maior ganho visual por hora investida
3. Nao tocam em nenhuma logica de negocio, reducao de risco
4. Sao as telas mais fotografadas para marketing, press, e demos para investidores

A restricao critica se mantem: `NEXT_PUBLIC_DESIGN_V2=false` em staging e producao. O produto continua identico para todos os usuarios ate que o UX Designer aprove e o time decida o rollout.

---

## Visao Geral das Specs do Sprint 39

| Spec ID | Titulo | Estimativa | MoSCoW | Score |
|---------|--------|------------|--------|-------|
| SPEC-PROD-048 | Landing Page V2 | ~25h | Must Have | 4.50 |
| SPEC-PROD-049 | Login Page V2 | ~15h | Must Have | 4.25 |
| SPEC-PROD-050 | Sprint 38 Carryover Fixes | ~5h | Should Have | 3.80 |
| T2.4 (opcional) | Register Page V2 | ~5h | Could Have | 3.10 |

**Budget total**: 50h
**Reserva de risco**: 5h implicita na alocacao (ver distribuicao abaixo)

---

## Pontuacao de Prioridade (Scoring Matrix)

| Criterio | Peso | SPEC-PROD-048 | SPEC-PROD-049 | SPEC-PROD-050 |
|----------|------|---------------|---------------|---------------|
| Severidade da dor do viajante | 30% | 5 (primeira impressao, top of funnel) | 4 (segunda tela critica) | 2 (so afeta devs/componentes internos) |
| Impacto de receita / retencao | 25% | 5 (conversao da landing direto em registros) | 4 (retencao de usuarios recorrentes) | 2 (sem impacto direto em usuario final) |
| Esforco (inverso) | 20% | 3 (esforco alto — 6 secoes, responsivo, i18n) | 4 (esforco medio) | 5 (esforco baixo — 4 fixes independentes) |
| Alinhamento estrategico | 15% | 5 (roadmap aprovado Sprint 39) | 5 (roadmap aprovado Sprint 39) | 4 (qualidade da fundacao) |
| Diferenciacao competitiva | 10% | 5 (identidade visual premium diferenciada) | 3 (padrao de mercado, mas mais polido) | 2 (infraestrutura interna) |
| **Score ponderado** | | **4.50** | **4.25** | **3.80** |

---

## Decisoes de Escopo

### P0 — Must Have (nao sai do sprint)

**SPEC-PROD-048: Landing Page V2** (~25h)

Esta e a entrega mais importante do sprint. O impacto visual e imediato e demonstravel. E a justificativa visual para todo o trabalho de infraestrutura do Sprint 38. Se so uma coisa for entregue neste sprint, deve ser esta.

Criterio de saida: UX Designer aprova a fidelidade ao Stitch export e o E2E passa com flag ON e OFF.

**SPEC-PROD-049: Login Page V2** (~15h)

A segunda entrega obrigatoria. Completar a jornada de conversao: landing -> login. Sem o Login V2, o usuario teria uma experiencia fragmented (landing premium -> login generico).

Criterio de saida: Zero regressoes de autenticacao, UX Designer aprova, axe-core zerado.

### P1 — Should Have (sai se houver bloqueio critico)

**SPEC-PROD-050: Sprint 38 Carryover Fixes** (~5h)

Quatro fixes de baixa severidade, nenhum bloqueia usuarios. Estao aqui para limpar a divida tecnica de a11y e tokens antes que os componentes comecem a ser usados em producao no Sprint 40+. Se o sprint ficar apertado, podem escorregar para o Sprint 40 sem impacto.

### P2 — Could Have (bônus se sobrar budget)

**Register Page V2** (T2.4, ~5h)

Mesmo padrao visual que o Login V2. Aproveita o mesmo `LoginFormV2` como base. Incluido como opcional porque: a) o Register usa Auth.js com fluxo ligeiramente diferente (validacao de senha, termos), b) o budget ja esta no limite, c) nao e tao frequentemente vista quanto o login.

Criterio de entrada: Login V2 concluido E sobra >= 5h no budget.

### Won't Have (Sprint 39)

- ForgotPasswordPageV2 — baixa visibilidade, fluxo menos frequente
- DashboardV2 — Sprint 40 (scope separado, dependencias de sidebar e cards)
- Wizard Phases V2 — Sprints 40-41 (escopo separado)
- Animacoes de scroll reveal (landing) — avaliado Sprint 40
- Dark mode — nao no roadmap atual

---

## Alocacao por Track

### Track 1 — dev-fullstack-1: Landing Page V2 (~25h)

Responsavel por SPEC-PROD-048 completo.

Sequencia recomendada:
1. Estrutura do componente LandingPageV2 + DesignBranch integration (2h)
2. Hero section com imagem, overlay, badges, CTAs (4h)
3. Secao de 8 fases (grid de cards) (3h)
4. Secao AI Assistant (two-column, glass mockup) (3h)
5. Secao Gamification (badge cards com glow) (3h)
6. Secao Destinos (grid asimetrico, hover scale) (4h)
7. Footer V2 (4 colunas, dark bg) (2h)
8. Responsividade completa (375/768/1024/1440px) (2h)
9. i18n (chaves pt-BR e en) + unit tests + E2E (2h)

**Desbloqueio**: Pode comecar imediatamente. Todos os componentes Atlas (AtlasButton, AtlasCard, AtlasBadge) estao disponiveis do Sprint 38.

### Track 2 — dev-fullstack-2: Login V2 + Carryover (~20h)

Responsavel por SPEC-PROD-049 e SPEC-PROD-050.

Sequencia recomendada:
1. Sprint 38 carryover fixes (FIX-001 a FIX-004) (~5h) — iniciar aqui enquanto Track 1 monta a estrutura
2. LoginFormV2: layout two-column, painel esquerdo (4h)
3. LoginFormV2: formulario direito, campos AtlasInput, CTA AtlasButton (3h)
4. Social login condicional (Google/GitHub) (2h)
5. DesignBranch integration na rota de login (1h)
6. i18n, unit tests, E2E flag ON/OFF (3h)
7. Register Page V2 (se sobrar >= 5h) (2h skeleton)

**Desbloqueio**: Pode comecar nos carryover fixes imediatamente. O LoginFormV2 pode comecar em paralelo com Track 1 — usa AtlasInput/AtlasButton do Sprint 38.

### Cross-cutting (~5h)

| Tarefa | Responsavel | Estimativa |
|--------|-------------|-----------|
| UX Designer mid-sprint review (apos hero + login panel prontos) | ux-designer | 2h |
| UX Designer final validation (antes do merge) | ux-designer | 2h |
| Sprint review document | tech-lead | 1h |

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Fidelidade ao Stitch — implementacao diverge do design | MEDIA | ALTO | UX Designer review obrigatoria mid-sprint (nao esperar o final). Usar code.html como referencia linha a linha. |
| Imagens hero sem licenca aprovada | MEDIA | MEDIO | Usar imagens placeholder em desenvolvimento. Definir fonte de imagens (Unsplash com licenca) antes do merge. |
| Animacoes causando falhas nos testes E2E de screenshot | BAIXA | MEDIO | Desabilitar animacoes CSS nos testes via `prefers-reduced-motion` ou via env var nos testes. |
| AtlasInput incompatibilidades com Auth.js server actions | BAIXA | ALTO | Testar o formulario com o fluxo de autenticacao real desde o T2.3, nao so no final. |
| Budget estoura e Login V2 fica incompleto | BAIXA | MEDIO | Prioridade e entregar Landing V2 completa. Login V2 pode ter painel esquerdo simplificado se necessario. |

---

## Criterio de Aceite do Sprint

O Sprint 39 e considerado COMPLETO quando:

1. [ ] SPEC-PROD-048 entregue: LandingPageV2 com 6 secoes, flag ON/OFF funcionando, E2E passando, UX aprovado
2. [ ] SPEC-PROD-049 entregue: LoginFormV2 funcionando sem regressoes de autenticacao, axe-core zerado, UX aprovado
3. [ ] SPEC-PROD-050 entregue: 4 carryover fixes aplicados e testados
4. [ ] Zero regressoes visuais no produto V1 (flag OFF) — validado por screenshot baseline
5. [ ] `NEXT_PUBLIC_DESIGN_V2` permanece `false` em staging e producao
6. [ ] Sprint review document produzido

---

## Proximos Sprints (preview)

| Sprint | Tema | Specs |
|--------|------|-------|
| Sprint 40 | Visual Migration — Wizard Phases 1-3 | SPEC-PROD-051, SPEC-PROD-052, SPEC-PROD-053 |
| Sprint 41 | Visual Migration — Wizard Phases 4-6 + Summary | SPEC-PROD-054, SPEC-PROD-055, SPEC-PROD-056 |
| Sprint 42 | Visual Migration — Dashboard V2 | SPEC-PROD-057 |
| Sprint 43+ | Design V2 Rollout (flag ON em staging -> producao) | TBD |
