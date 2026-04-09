# Sprint 38 — Passo a Passo de Execução

> Guia prático para executar o Sprint 38 (Fundação do Design System) no Claude Code.
> Baseline: v0.32.0 (Sprint 37) — 2480 unit tests, 120/130 E2E, 2 flaky
> Pré-requisito: Stitch exports commitados em `docs/design/` (commit `ab97c5e`)

---

## ETAPA 1 — Iniciar o Sprint no Claude Code

### 1.1 Abra o Claude Code no projeto Atlas

```bash
cd C:\travel-planner
claude
```

### 1.2 Instrua o PO Agent a reconciliar o backlog

Cole este prompt no Claude Code:

```
@product-owner

Estamos iniciando o Sprint 38 — "Fundação do Design System".

Contexto: Exportamos os designs do Google Stitch para docs/design/stitch-exports/ 
(10 telas), com DESIGN.md e SCREEN-INDEX.md commitados.

O plano completo está em atlas-design-migration-plan.md.

O objetivo deste sprint é criar toda a infraestrutura de design SEM mudar 
nenhum visual existente na aplicação. Ao final do sprint, devemos ter:

1. Tailwind config atualizado com tokens do DESIGN.md
2. Fontes instaladas (Outfit + DM Sans)
3. Variáveis CSS globais
4. Component library em src/components/ui/ (Button, Input, Card, Chip, Badge, 
   PhaseProgress, StepperInput) — todos com testes
5. Feature flag system implementado
6. ESLint rules de design
7. Visual regression test setup com Playwright
8. Agent prompts atualizados com design rules
9. Suite E2E rodando verde (nada quebrou)

Por favor reconcilie o backlog e crie as tasks para este sprint.
Lembre-se: o UX Designer agent deve participar ativamente deste sprint.
```

---

## ETAPA 2 — UX Designer analisa os exports do Stitch

Antes do tech-lead planejar, o UX Designer precisa validar o material de design:

```
@ux-designer

Estamos iniciando o Sprint 38 — Fundação do Design System.

Antes de qualquer implementação, preciso que você:

1. Leia docs/design/DESIGN.md (nosso design system exportado do Google Stitch)
2. Leia docs/design/SCREEN-INDEX.md (mapa das telas oficiais vs alternativas)
3. Analise o code.html e screen.png de cada tela oficial em docs/design/stitch-exports/
4. Valide se o DESIGN.md está completo e consistente:
   - Paleta de cores tem todos os tokens necessários?
   - Escala tipográfica está coerente?
   - Regras de espaçamento, border-radius e shadows estão claras?
   - Há conflitos ou inconsistências entre telas?
5. Produza um parecer UX com:
   - Tokens aprovados para implementação no Tailwind config
   - Lista de componentes UI necessários com specs de variantes
   - Ajustes ou correções necessárias no DESIGN.md
   - Guidelines de acessibilidade (contraste WCAG AA, tamanhos mínimos de touch target)

Este parecer será a base para os devs implementarem. Nenhum componente 
será criado sem sua aprovação.

Siga o processo SDD — este parecer alimenta a dimensão UX da spec.
```

---

## ETAPA 3 — Tech Lead valida e planeja

Depois que o PO criar as tasks e o UX Designer aprovar o material:

```
@tech-lead

O PO criou as tasks do Sprint 38 — Fundação do Design System.
O UX Designer já analisou e aprovou os tokens de design.

Antes de começar:
1. Leia docs/design/DESIGN.md para entender os tokens de design
2. Leia docs/design/SCREEN-INDEX.md para ver as telas oficiais
3. Leia o parecer do UX Designer (ajustes e guidelines de acessibilidade)
4. Leia atlas-design-migration-plan.md seção 3 (Guardrails) e seção 4 (Sprint 38)

IMPORTANTE — PROCESSO SDD:
A spec deste sprint precisa ter as 9 dimensões aprovadas 
(PROD, UX, TECH, SEC, AI, QA, INFRA, RELEASE, COST) antes dos devs 
começarem a codar. A dimensão UX já foi preenchida pelo UX Designer.
Templates em docs/specs/.

Valide o plano técnico e distribua as tasks entre os dois fullstack devs.

Prioridade de execução:
- Primeiro: Tailwind config + fontes + CSS globals (fundação)
- Segundo: Component library (depende do tailwind config)
- Terceiro: Feature flags + ESLint rules (pode ser paralelo)
- Quarto: Visual regression setup (depende dos componentes)
- Por último: E2E baseline (validação final)

Confirme o plano e inicie a execução.
```

---

## ETAPA 4 — Execução dos Devs (Fullstack Dev 1 e 2)

O tech-lead vai orquestrar, mas estas são as tasks em ordem:

### 4.1 Tailwind Config + Fontes (Fullstack Dev 1)

O dev precisa:
- Ler `docs/design/DESIGN.md` 
- Atualizar `tailwind.config.ts` com todos os tokens (cores, tipografia, border-radius, shadows)
- Instalar fontes: `npm install @fontsource/outfit @fontsource/dm-sans`
- Configurar imports no `globals.css` ou `layout.tsx`
- Criar variáveis CSS globais (input height, card radius, transitions)
- TESTAR: `npm run build` deve compilar sem erros

### 4.2 Component Library (ambos devs em paralelo)

**Fullstack Dev 1 cria:**
- `src/components/ui/Button.tsx` + `Button.test.tsx`
- `src/components/ui/Chip.tsx` + `Chip.test.tsx`
- `src/components/ui/PhaseProgress.tsx` + `PhaseProgress.test.tsx`
- `src/components/ui/index.ts` (barrel export)

**Fullstack Dev 2 cria:**
- `src/components/ui/Input.tsx` + `Input.test.tsx`
- `src/components/ui/Card.tsx` + `Card.test.tsx`
- `src/components/ui/Badge.tsx` + `Badge.test.tsx`
- `src/components/ui/StepperInput.tsx` + `StepperInput.test.tsx`

Cada componente deve:
- Usar APENAS tokens do `tailwind.config.ts`
- Ter variantes definidas via props (variant, size)
- Ter testes unitários cobrindo todas variantes
- Referenciar `screen.png` das telas oficiais para fidelidade visual

### 4.3 UX Designer valida os componentes (OBRIGATÓRIO)

Após os devs criarem os componentes, o UX Designer DEVE validar antes de seguir:

```
@ux-designer

Os devs criaram os componentes da library em src/components/ui/.

Por favor valide cada componente contra o DESIGN.md e as telas oficiais 
em docs/design/stitch-exports/:

Para cada componente (Button, Input, Card, Chip, Badge, PhaseProgress, StepperInput):
1. As variantes estão corretas? (cores, tamanhos, estados)
2. Os tokens do Tailwind config estão sendo usados corretamente?
3. A fidelidade visual com os screen.png do Stitch está aceitável?
4. Contraste WCAG AA está respeitado em todas as variantes?
5. Touch targets têm tamanho mínimo de 44px?
6. Estados de hover, focus e disabled estão definidos?

Se algum componente não atende, liste as correções necessárias.
Nenhum componente segue para o merge sem aprovação do UX Designer.

Siga o processo SDD — sua validação alimenta a dimensão UX da spec.
```

### 4.4 Feature Flags (Fullstack Dev 2)

- Criar `src/lib/feature-flags.ts` com flags por tela
- Flags lidas de `process.env.NEXT_PUBLIC_NEW_DESIGN_*`
- Todas as flags OFF por padrão
- Criar hook `useNewDesign()` para uso em componentes

### 4.5 ESLint Rules (Tech Lead)

- Adicionar regras que bloqueiam cores fora do design system
- Adicionar regras que bloqueiam fonts fora do design system
- TESTAR: `npm run lint` deve passar sem erros

### 4.6 Visual Regression Setup (QA Engineer)

- Configurar Playwright screenshot tests
- Tirar baselines das telas atuais (V1) — esses baselines servem como referência
- Criar pasta `e2e/visual-regression/`
- TESTAR: `npx playwright test` deve gerar screenshots sem falhas

### 4.7 Agent Prompts (PO + Prompt Engineer)

- Atualizar prompts dos agentes fullstack-dev em `memory/`
- Adicionar regras mandatórias de design system (seção de Guardrail 4 do plano)
- Incluir regra: "Toda criação/alteração de UI deve passar pela validação do UX Designer"

---

## ETAPA 5 — Validação Final do Sprint

### 5.1 Rodar testes unitários

```
@tech-lead

Rode a suite completa de testes unitários. 
Todos os 2480+ testes existentes devem continuar verdes.
Os novos testes dos componentes ui/ também devem passar.
Reporte o resultado.
```

### 5.2 Rodar E2E

```
@tech-lead

Rode a suite E2E completa no staging.
Todos os 120+ testes devem passar — nenhum visual mudou neste sprint.
Se algum E2E falhou, investigue e corrija antes de fechar o sprint.
```

### 5.3 UX Designer — Aprovação final

```
@ux-designer

Sprint 38 está em fase de validação final.

Por favor faça a revisão final de tudo que foi construído:
1. Os tokens no tailwind.config.ts correspondem ao DESIGN.md?
2. Todos os componentes ui/ passaram na sua validação anterior?
3. As correções que você solicitou foram implementadas?
4. O DESIGN.md precisa de alguma atualização com base no que foi implementado?

Emita um parecer final de aprovação ou liste pendências.
O sprint NÃO pode ser fechado sem a aprovação do UX Designer.
```

### 5.4 Checklist de validação do Sprint 38

Use esta checklist para validar antes de fechar:

```
@tech-lead

Valide o Sprint 38 com esta checklist:

SDD & DESIGN:
- [ ] Spec do Sprint 38 aprovada com as 9 dimensões (PROD, UX, TECH, SEC, AI, QA, INFRA, RELEASE, COST)
- [ ] UX Designer aprovou o parecer inicial dos tokens
- [ ] UX Designer aprovou os componentes implementados
- [ ] UX Designer deu aprovação final do sprint
- [ ] DESIGN.md atualizado se houve ajustes

FUNDAÇÃO:
- [ ] tailwind.config.ts atualizado com tokens do DESIGN.md
- [ ] Fontes Outfit e DM Sans instaladas e renderizando
- [ ] globals.css com variáveis CSS do design system

COMPONENT LIBRARY:
- [ ] Button component criado com 3 variantes + testes
- [ ] Input component criado com ícone/label + testes
- [ ] Card component criado + testes
- [ ] Chip component criado (selectable) + testes
- [ ] Badge component criado + testes
- [ ] PhaseProgress component criado + testes
- [ ] StepperInput component criado + testes
- [ ] index.ts barrel export de todos componentes ui/

GUARDRAILS:
- [ ] Feature flags implementadas (todas OFF)
- [ ] ESLint rules bloqueando cores/fonts fora do sistema
- [ ] Visual regression baselines tirados (V1)
- [ ] Agent prompts atualizados com design rules + validação UX obrigatória

QUALIDADE:
- [ ] 2480+ testes unitários passando
- [ ] 120+ E2E passando
- [ ] ZERO mudança visual na aplicação existente
- [ ] Sprint review documentado em docs/sprint-reviews/

Reporte o status de cada item.
```

---

## ETAPA 6 — Fechar o Sprint

### 6.1 Sprint Review

```
@tech-lead

Gere o sprint review do Sprint 38 — Fundação do Design System.
Inclua: tasks completadas, métricas de testes (antes/depois), 
componentes criados, parecer do UX Designer, e status para o Sprint 39.
Salve em docs/sprint-reviews/SPRINT-38-REVIEW.md
```

### 6.2 Release Tag

```
@release-manager

Crie a release v0.33.0 com tag e changelog.
Título: "Design System Foundation"
Escopo: infraestrutura de design, component library, feature flags.
Nenhuma mudança visual — apenas fundação para sprints 39-41.
```

### 6.3 Push

```bash
git push origin main --tags
```

---

## ETAPA 7 — Preparar Sprint 39

Após fechar o Sprint 38, o próximo passo é o Sprint 39 (Landing Page + Login V2).

Nesse momento:
1. Os componentes ui/ já existem e estão testados e aprovados pelo UX Designer
2. Os feature flags estão prontos
3. Os devs podem começar a montar as telas V2 usando os componentes
4. O UX Designer valida cada tela V2 contra os screen.png do Stitch
5. As telas são ativadas com feature flag no staging para teste
6. O UX Designer faz review visual final no staging
7. Quando aprovadas (UX + QA + PO), as flags são ligadas em produção

---

## Dicas Importantes

### Se algo quebrar
- Todos os testes existentes devem continuar verdes neste sprint
- Se um teste falhou, é regressão — corrija ANTES de continuar
- O sprint 38 tem risco zero se seguido corretamente (nenhum visual muda)

### Sobre o Stitch MCP
- A configuração do MCP no Claude Code é uma task do DevOps neste sprint
- Se der problema na configuração OAuth/WSL2, não bloqueie o sprint
- O fallback são os arquivos HTML/CSS já commitados em docs/design/

### Sobre as fontes
- Use @fontsource (self-hosted) em vez de Google Fonts CDN
- Isso evita dependência externa e melhora performance
- Fonts são servidas do próprio bundle

### Sobre o Tailwind config
- NÃO exclua tokens existentes abruptamente — pode quebrar estilos atuais
- Adicione os novos tokens como extensão primeiro
- A substituição completa acontece nos Sprints 40-41 quando as telas V2 entram

### Sobre o UX Designer Agent
- O UX Designer é gate-keeper obrigatório para toda mudança visual
- Workflow: Devs criam → UX valida → Tech-lead faz merge (nunca pule o UX)
- O parecer do UX Designer alimenta a dimensão UX da spec SDD
- Nos Sprints 39-41, o UX Designer compara cada tela V2 com o screen.png do Stitch
- Se o UX Designer solicitar correções, os devs devem implementar ANTES do merge

### Sobre o processo SDD
- TODA task de design migration segue o SDD — spec aprovada antes de codar
- As 9 dimensões devem ser preenchidas (templates em docs/specs/)
- O DESIGN.md é a referência da dimensão UX
- O atlas-design-migration-plan.md é a referência das dimensões TECH, QA e RELEASE
- Nenhum guardrail pode ser ignorado — eles existem para proteger o projeto
