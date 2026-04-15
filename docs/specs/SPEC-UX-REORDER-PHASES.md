# SPEC-UX-REORDER-PHASES — Reordenacao das Fases da Expedicao

**Spec ID**: SPEC-UX-REORDER-PHASES
**Sprint**: 44
**Author**: ux-designer
**Status**: Draft
**Last Updated**: 2026-04-15
**Reviewers**: product-owner, architect, tech-lead

---

## 1. Contexto e Objetivo

O PO identificou que a ordem atual das fases de planejamento nao segue o fluxo mental natural do viajante. Hoje o usuario e empurrado para o Checklist (fase 3) antes mesmo de conhecer o destino em profundidade (Guia, fase 5) ou de ter um roteiro (fase 6). A reestruturacao propoe uma sequencia em que cada fase entrega contexto util para a proxima: **destino -> guia -> roteiro -> logistica -> preparo final**.

### 1.1 Mapeamento de fases

| Posicao hoje | Nome atual            | Nova posicao | Novo nome     | Motivo |
|--------------|-----------------------|--------------|---------------|--------|
| 1            | A Inspiracao          | 1            | A Inspiracao  | Mantem — ponto de entrada, define destino e datas |
| 2            | O Perfil              | 2            | O Perfil      | Mantem — alinha preferencias antes da IA |
| 3            | O Preparo (Checklist) | 6            | O Preparo     | Move para o final do planejamento: checklist so faz sentido quando logistica e roteiro existem |
| 4            | A Logistica           | 5            | A Logistica   | Move para penultima: transporte/hospedagem decorrem do roteiro |
| 5            | Guia do Destino       | 3            | Guia do Destino | Sobe: conhecer o destino eh pre-requisito para tudo |
| 6            | O Roteiro             | 4            | O Roteiro     | Sobe: roteiro usa o guia como insumo e alimenta logistica |
| 7            | A Expedicao           | 7            | A Expedicao   | Sem alteracao |
| 8            | O Legado              | 8            | O Legado      | Sem alteracao |

**Escopo desta spec**: apenas fases 3 a 6. Fases 1, 2, 7 e 8 nao mudam de posicao nem de rotulo.

### 1.2 Sequencia logica nova

```
1. Inspiracao (destino + datas)
   -> 2. Perfil (quem vai + preferencias)
       -> 3. Guia do Destino (conhecer o lugar) [IA]
           -> 4. Roteiro (o que fazer, quando) [IA]
               -> 5. Logistica (como chegar, onde dormir)
                   -> 6. Preparo (checklist final) [IA]
                       -> 7. Expedicao (viagem acontecendo)
                           -> 8. Legado (retrospectiva)
```

---

## 2. Personas Afetadas

| Persona | Impacto |
|---|---|
| `@leisure-solo` | **Positivo alto**. Fluxo narrativo: descobre o destino antes de preencher listas de bagagem. |
| `@leisure-family` | **Positivo**. Roteiro antes de logistica ajuda a dimensionar hospedagem (ex: 3 noites em cada cidade). |
| `@business-traveler` | **Neutro**. Geralmente pula direto para logistica — reordenacao nao atrapalha pois fases sao nao-bloqueantes em modo rapido. |
| `@bleisure` | **Positivo**. Guia e roteiro elevados incentivam extensao lazer. |
| `@group-organizer` | **Positivo**. Roteiro antes de logistica facilita decisoes de grupo sobre hoteis. |
| `@travel-agent` | **Atencao**. Expedicoes em andamento precisam de migracao suave — ver secao 9. |

---

## 3. Componentes e Arquivos Impactados

### 3.1 Componentes de UI
- `src/components/layout/DashboardPhaseProgressBar.tsx` — barra de progresso no card do dashboard (6 segmentos de planejamento)
- `src/components/layout/UnifiedProgressBar.tsx` — barra no topo de cada PhaseLayout
- `src/components/layout/PhaseShell.tsx` / `PhaseLayout` — container com header, breadcrumb, footer
- `src/components/features/expedition/ExpeditionSummary.tsx` — relatorio consolidado
- `src/components/features/expedition/ExpeditionCard.tsx` — card no dashboard de expedicoes
- `src/components/features/dashboard/NextStepsCard.tsx` — sugestoes "proximo passo"
- `src/components/features/expedition/Phase1Wizard.tsx` — sem mudanca funcional, apenas labels de "proxima fase"
- `src/components/features/expedition/Phase2Wizard.tsx` — idem
- `src/components/features/expedition/Phase3Wizard.tsx` (Checklist/Preparo) — agora eh a fase 6; CTA "Avancar" passa a apontar para Expedicao
- `src/components/features/expedition/Phase4Wizard.tsx` (Logistica) — agora eh a fase 5; CTA aponta para Preparo
- `src/components/features/expedition/Phase5Wizard.tsx` (Guia) — agora eh a fase 3; CTA aponta para Roteiro
- `src/components/features/expedition/Phase6Wizard.tsx` (Roteiro) — agora eh a fase 4; CTA aponta para Logistica
- `src/components/layout/Breadcrumb.tsx` — reusa i18n keys atualizadas

### 3.2 Configuracao / engines (fora do escopo UX, apenas referencia)
- `src/lib/engines/phase-config.ts` — `PHASE_DEFINITIONS` e `PHASE_TOOLS` precisam de reordenacao
- `src/lib/engines/phase-engine.ts` — regras de transicao e validacao de sequencia
- `src/lib/engines/next-steps-engine.ts` — proximos passos por fase
- `src/server/services/expedition-summary.service.ts` — ordem das secoes no relatorio

### 3.3 i18n
- `messages/pt.json` e `messages/en.json` — chaves em `gamification.phases.*`, `dashboard.tools.*`, `expedition.summary.*`

---

## 4. Barra de Progresso (DashboardPhaseProgressBar)

### 4.1 Ordem visual nova

```
[1 Inspiracao] — [2 Perfil] — [3 Guia] — [4 Roteiro] — [5 Logistica] — [6 Preparo]
```

Apenas as 6 fases de planejamento aparecem no card do dashboard. Fases 7 (Expedicao) e 8 (Legado) possuem visualizacao propria quando a viagem inicia.

### 4.2 Icones por fase (Lucide)

| # | Nome          | Icone          | Cor do border-left (card de ferramenta) |
|---|---------------|----------------|------------------------------------------|
| 1 | Inspiracao    | `Sparkles`     | `--color-primary` (#E8621A) |
| 2 | Perfil        | `UserCircle`   | `--color-secondary` (#1A3C5E) |
| 3 | Guia          | `BookOpen`     | `--color-accent` (#2DB8A0) |
| 4 | Roteiro       | `Map`          | `--color-accent` (#2DB8A0) |
| 5 | Logistica     | `Plane`        | `--color-secondary` (#1A3C5E) |
| 6 | Preparo       | `CheckSquare`  | `--color-primary` (#E8621A) |

Nota: Guia e Roteiro recebem a mesma cor accent (verde-azulado) porque sao as duas fases "inteligentes" de descoberta com IA. Logistica volta ao azul de confianca. Inspiracao e Preparo emolduram o fluxo com laranja (energia no inicio, energia na reta final).

### 4.3 Estados visuais

Reutiliza os 4 tokens de estado de fase definidos em SPEC-UX-026:

| Estado       | Token                    | Cor       | Semantica visual |
|--------------|--------------------------|-----------|------------------|
| `completed`  | `--color-phase-completed`| #10B981   | Preenchido verde + checkmark |
| `current`    | `--color-phase-current`  | #3B82F6   | Preenchido azul + pulse 600ms |
| `pending`    | `--color-phase-pending`  | #6B7280   | Outline cinza solido |
| `locked`     | `--color-phase-locked`   | #9BA8B5   | Outline cinza tracejado + cadeado |

### 4.4 Linha conectora

Linha horizontal de 2px entre segmentos:
- Entre duas fases `completed` -> verde solido (#10B981)
- Entre `completed` -> `current` -> gradiente verde-para-azul
- Demais transicoes -> cinza claro (#E5E7EB)

### 4.5 Labels

- **Desktop (>= 768px)**: nome completo abaixo do icone ("Guia", "Roteiro", "Logistica", "Preparo")
- **Mobile (< 768px)**: apenas numero + icone; nome completo em tooltip ao toque longo (aria-label sempre presente)
- Fases `completed` e `current` usam `#059669` (nao #10B981) para labels pequenos — garante WCAG AA em texto <= 12px

### 4.6 Regras de locked

Uma fase fica `locked` se:
- Qualquer fase anterior **bloqueante** nao foi completada
- Fases nao-bloqueantes (`nonBlocking: true`) nao bloqueiam as seguintes

Revisao de bloqueio apos reorder (abertas para architect validar):
- **1 Inspiracao** — bloqueante (como hoje)
- **2 Perfil** — bloqueante
- **3 Guia** — bloqueante? **Decisao UX: sim, bloqueante**. Guia alimenta Roteiro; sem guia, roteiro fica generico.
- **4 Roteiro** — bloqueante? **Decisao UX: nao-bloqueante**. Usuario pode pular roteiro e ir direto para logistica (caso ja tenha plano proprio).
- **5 Logistica** — nao-bloqueante (como hoje)
- **6 Preparo** — nao-bloqueante (como hoje)

> Ver secao 12 (decisoes pendentes PO).

---

## 5. Breadcrumb e Navegacao

### 5.1 Breadcrumb novo por fase

```
Expedicoes > {Nome da viagem} > Fase 3: Guia do Destino
Expedicoes > {Nome da viagem} > Fase 4: Roteiro
Expedicoes > {Nome da viagem} > Fase 5: Logistica
Expedicoes > {Nome da viagem} > Fase 6: Preparo
```

O breadcrumb eh derivado de `phase-config.ts`. Uma vez que a ordem numerica seja atualizada na config, o breadcrumb atualiza automaticamente via i18n key.

### 5.2 Transicoes entre fases (CTA "Avancar")

Ordem de redirecionamento no footer (WizardFooter):

| Wizard atual | Proxima fase (href) | Label do CTA |
|--------------|--------------------|--------------|
| Phase1Wizard | `/expedition/{id}/phase-2` | "Avancar para o Perfil" |
| Phase2Wizard | `/expedition/{id}/phase-3` (Guia) | "Avancar para o Guia" |
| Phase5Wizard (Guia) | `/expedition/{id}/phase-6` (Roteiro) | "Avancar para o Roteiro" |
| Phase6Wizard (Roteiro) | `/expedition/{id}/phase-4` (Logistica) | "Avancar para a Logistica" |
| Phase4Wizard (Logistica) | `/expedition/{id}/phase-3` (Preparo) | "Avancar para o Preparo" |
| Phase3Wizard (Preparo) | `/expedition/{id}/summary` | "Concluir planejamento" |

> Nota ao architect: se a decisao for **renumerar** as fases na DB (migrar `currentPhase` nos Trips), os paths passarao a refletir a nova numeracao (ex: Guia em `/phase-3`). Ver secao 12.

### 5.3 Botao "Voltar" no WizardFooter

Segue a regra ja definida em SPEC-UX-018: volta um step dentro da fase ou, no step 1, volta para a fase anterior **na nova ordem**.

---

## 6. Dashboard de Expedicoes (ExpeditionCard)

### 6.1 Mudancas visuais

O card de cada expedicao no /expeditions exibe a DashboardPhaseProgressBar com os 6 segmentos na nova ordem. Nenhuma alteracao estrutural — apenas a ordem dos segmentos e os labels.

### 6.2 Link rapido (quick-access)

A linha de links rapidos (SPEC-UX-025) abaixo do card tambem precisa reordenar para seguir a jornada:

**Ordem antiga**: Checklist | Guia | Roteiro | Relatorio
**Ordem nova**:   Guia | Roteiro | Checklist | Relatorio

Relatorio permanece sempre como ultimo link.

### 6.3 Status inferido

A legenda "Proxima etapa" no card passa a refletir a nova fase corrente (ex: "Proxima: Guia do Destino" quando esta no step 2 concluido).

---

## 7. Relatorio da Expedicao (ExpeditionSummary)

O ExpeditionSummary apresenta 6 cards de secao na ordem cronologica de planejamento. A nova ordem fisica das secoes:

```
[Hero: countdown + readiness bar]
[Next steps (1-3 acionaveis)]
[Secao 1: Inspiracao]     — destino, datas, cobertura de pre-trip
[Secao 2: Perfil]          — passageiros + preferencias
[Secao 3: Guia]            — resumo do destino
[Secao 4: Roteiro]         — dias/itinerario
[Secao 5: Logistica]       — transporte, hospedagem, mobilidade
[Secao 6: Preparo]         — checklist consolidado
[Action bar: print | export | share]
```

### 7.1 Icones do relatorio

`PHASE_ICONS` em `ExpeditionSummary.tsx` (linha 17) precisa ser reordenado:

**Antes** (U+1F9ED, U+1F50D, U+1F4CB, U+1F697, U+1F5FA, U+1F48E)
= compass, magnifier, clipboard, car, map, gem

**Depois** (compass, magnifier, **book**, **map**, **car**, **clipboard**)
correspondendo a Inspiracao, Perfil, Guia, Roteiro, Logistica, Preparo.

### 7.2 Accent border por secao

Cada card mantem `border-left: 4px solid` com a cor da fase definida em 4.2.

### 7.3 Impressao

`@media print`: todas as secoes forcadamente expandidas, na nova ordem, sem botoes interativos. Codigos de reserva mascarados (SPEC-UX-023).

---

## 8. PhaseLayout — Header e Labels

O PhaseShell/PhaseLayout renderiza no topo:
- Breadcrumb
- UnifiedProgressBar (6 segmentos)
- Titulo grande: "Fase {N}: {Nome}"
- Subtitulo: objetivo da fase em uma frase

Novos subtitulos sugeridos:

| Fase | Subtitulo |
|------|-----------|
| 3 Guia | "Conheca o destino em profundidade antes de planejar o que fazer." |
| 4 Roteiro | "Organize os dias com base no que aprendeu no guia." |
| 5 Logistica | "Agora que sabe o roteiro, organize transporte e hospedagem." |
| 6 Preparo | "Checklist final: bagagem, documentos, detalhes que nao podem ficar para tras." |

Esses microcopys reforcam **por que** cada fase vem naquela ordem — o viajante sente a sequencia.

---

## 9. Expedicoes Em Andamento — Migracao UX

### 9.1 Problema

Expedicoes existentes tem `currentPhase` apontando para o numero antigo (ex: `currentPhase = 3` significava Checklist, agora significa Guia). Uma migracao eh necessaria para preservar o progresso do viajante.

### 9.2 Estrategia recomendada (UX)

**Opcao A — Migracao silenciosa (recomendada)**
- Migration server-side remapeia `currentPhase` e `ExpeditionPhase.phaseNumber` para a nova ordem:
  - `3 (Preparo) -> 6`
  - `4 (Logistica) -> 5`
  - `5 (Guia) -> 3`
  - `6 (Roteiro) -> 4`
- Usuario ao abrir a expedicao ve um **banner informativo one-time** no topo do dashboard do card:
  > "Reorganizamos as fases para uma jornada mais natural. Seu progresso esta preservado — continue de onde parou."
  > [Entendi, obrigado]
- Banner dismissivel, persistido em `User.dismissedBanners` (JSON). Fecha ao clicar.
- Tom: explicativo, nao alarmante. Sem modal bloqueante.

**Opcao B — Modal bloqueante** (nao recomendada)
- Interrompe o fluxo. Cria fricao.

### 9.3 Banner — especificacao

- Posicao: topo do `/expeditions` (acima da grade) + topo do dashboard de cada expedicao afetada
- Icone: `Info` (Lucide), cor `--color-secondary`
- Background: `--color-secondary-light` (#E8F0F7)
- Padding: 16px
- CTA primario: "Entendi" (secundario visual, ghost button)
- CTA secundario: link "Ver o que mudou" -> abre pagina /ajuda/reorder-fases (fora do escopo desta spec; pode linkar para esta spec por enquanto)
- Acessibilidade: `role="status"` + `aria-live="polite"`
- Auto-dismiss: nao. Requer acao explicita.

### 9.4 Casos de borda

| Estado da expedicao (pre-migracao) | Comportamento pos-migracao |
|------------------------------------|----------------------------|
| `currentPhase = 1` (Inspiracao) | Sem impacto — nao mostra banner |
| `currentPhase = 2` (Perfil) | Sem impacto |
| `currentPhase = 3` (Preparo antigo) | Usuario ja completou muita coisa. Apos remap vira `currentPhase = 6`, todas anteriores ficam `COMPLETED`. Banner aparece. |
| `currentPhase = 4` (Logistica antiga) | Vira `currentPhase = 5`. Banner aparece. |
| `currentPhase = 5` (Guia antigo) | Vira `currentPhase = 3`. Banner aparece. |
| `currentPhase = 6` (Roteiro antigo) | Vira `currentPhase = 4`. Banner aparece. |
| Expedicao em fase 7 ou 8 | Sem alteracao — fases de execucao/legado nao mudam |

**Ponto sensivel**: se o usuario completou **Preparo** (antigo fase 3) mas nao completou **Guia** (antigo fase 5), apos a migracao ele tera fase 6 (Preparo) concluida mas fases 3, 4, 5 em aberto. A barra de progresso vai aparecer "furada" (verde, aberto, aberto, aberto, verde). **Isso eh aceitavel**: reflete fielmente o estado real. O banner explica a reorganizacao.

### 9.5 Telemetria

Emitir evento `expedition.phases.reordered.banner_shown` e `expedition.phases.reordered.banner_dismissed` para acompanhar adocao.

---

## 10. Landing Page

Verificacao necessaria: a landing page (`src/app/[locale]/(marketing)/page.tsx` ou equivalente) **pode** mencionar fases em secoes "Como funciona".

### 10.1 Acao UX

- Auditar secoes da landing que citem "Checklist primeiro, depois Guia" ou qualquer ordem especifica
- Atualizar copy para refletir a nova sequencia narrativa:
  > "1. Escolha o destino. 2. Conte quem viaja. 3. Descubra o lugar. 4. Monte o roteiro. 5. Reserve transporte e hospedagem. 6. Prepare a mala."
- Se houver ilustracao de timeline, reordenar
- Verificar screenshots estaticos em `public/images/landing/*` — podem precisar ser regerados

Dev responsavel deve rodar `grep -r "Checklist" src/app/**/page.tsx` e `grep -r "phase" messages/pt.json` para localizar tudo.

---

## 11. Acessibilidade

### 11.1 ARIA labels da progress bar

Cada segmento da barra:
```html
<button
  role="button" (ou div se nao clicavel)
  aria-label="Fase 3: Guia do Destino. Status: concluida."
  aria-current="step" (apenas no segmento current)
  aria-disabled="true" (apenas em locked)
>
```

### 11.2 Leitor de tela

A lista de 6 segmentos deve ser exposta como `role="list"` com cada segmento `role="listitem"`. Ao chegar em um segmento `current`, leitor anuncia:
> "Fase 3 de 6, Guia do Destino, etapa atual."

### 11.3 Navegacao por teclado

Se segmentos forem clicaveis (caso do /expedition/[tripId] dashboard):
- Tab navega entre segmentos na ordem 1-2-3-4-5-6
- Enter/Space ativa
- `prefers-reduced-motion`: desativa pulse do estado current

Se segmentos nao forem clicaveis (caso do card no /expeditions — SPEC-UX-025), sao `<div role="status">`.

### 11.4 Contraste

- Labels `completed` em texto pequeno usam #059669 sobre branco = 4.5:1 (AA)
- `current` azul (#3B82F6) sobre branco = 4.6:1 (AA)
- `locked` cinza tracejado + cadeado (icone) — informacao nao eh so cor

### 11.5 Banner de migracao

- `role="status"` + `aria-live="polite"` (anuncia mas nao interrompe)
- Botao "Entendi" tem `aria-label="Entendi, fechar aviso sobre reorganizacao das fases"`

---

## 12. Mobile — Responsividade da Barra

6 segmentos precisam caber em 320px (iPhone SE).

### 12.1 Breakpoint strategy

| Largura | Layout | Label |
|---------|--------|-------|
| >= 1024px | 6 circulos grandes (40px) + label completo + linhas 4px | "Guia do Destino" |
| 768-1023px | 6 circulos medios (32px) + label curto + linhas 3px | "Guia" |
| 375-767px | 6 circulos pequenos (28px) + apenas numero dentro + linhas 2px | aria-label apenas |
| < 375px | 6 circulos compactos (24px) + numero + linhas 1px | aria-label apenas |

### 12.2 Toque

Touch target minimo 44x44px em mobile: o circulo visivel pode ser 28px, mas a area clicavel eh expandida para 44x44 via padding invisivel (seguindo padrao WCAG 2.5.5).

### 12.3 Overflow

Se o container for muito estreito (< 320px, raro), a barra vira carrossel horizontal com scroll-snap e `overflow-x: auto`. Indicador visual de scroll (sombra direita fade).

### 12.4 Card do dashboard em mobile

No /expeditions, cada card ja eh full-width. A barra de 6 segmentos cabe confortavelmente em 28px cada + 5 linhas de 8px = 6*28 + 5*8 = 208px. Sobra espaco.

---

## 13. Wireframes Descritivos

### 13.1 Nova DashboardPhaseProgressBar (desktop, card de expedicao)

```
+---------------------------------------------------------------------------+
|  [cover gradient]  Viagem a Lisboa                           [...]        |
|                    15-22 set 2026 - 7 dias                                |
|                                                                           |
|  (o)---(o)---(o)---[BLUE current]---(_)---(_)                             |
|   1     2     3        4              5     6                            |
|  Insp  Perf  Guia   ROTEIRO         Log   Prep                            |
|   v     v     v      (pulse)                                              |
|                                                                           |
|  [Guia] [Roteiro] [Checklist] [Relatorio]                                 |
|  quick-access row                                                         |
+---------------------------------------------------------------------------+
```

Legenda:
- `(o)` verde preenchido = completed
- `[BLUE current]` azul pulsante = fase ativa
- `(_)` cinza outline = pending
- Linhas entre 1-2-3-4 sao verde (path completo); 4-5-6 sao cinza claro

### 13.2 Novo ExpeditionSummary (relatorio)

```
+---------------------------------------------------------------------------+
|  HERO                                                                     |
|  [Viagem a Lisboa]                         [15-22 set 2026 | 152 dias]   |
|  Readiness: [==================60%=====            ]                     |
|                                                                           |
|  PROXIMOS PASSOS                                                          |
|  > [1] Complete o Guia do Destino  [Ir para fase]                        |
|  > [2] Comece o Roteiro             [Ir para fase]                        |
|                                                                           |
|  [compass icon] Fase 1: A Inspiracao               [concluida] [Editar]  |
|  Lisboa, Portugal - 7 dias, 2 adultos                                     |
|                                                                           |
|  [user icon] Fase 2: O Perfil                       [concluida] [Editar]  |
|  2 adultos, ritmo tranquilo, estilo gastronomico                          |
|                                                                           |
|  [book icon] Fase 3: Guia do Destino                [atual]     [Abrir]  |
|  Ainda nao gerado                                                         |
|                                                                           |
|  [map icon] Fase 4: O Roteiro                       [bloqueada] [--]     |
|  Complete o Guia antes                                                    |
|                                                                           |
|  [car icon] Fase 5: A Logistica                     [aberta]    [Abrir]  |
|  Opcional - pode preencher a qualquer momento                             |
|                                                                           |
|  [checklist icon] Fase 6: O Preparo                 [aberta]    [Abrir]  |
|  Checklist gerado apos roteiro                                            |
|                                                                           |
|  [Imprimir] [Exportar PDF] [Compartilhar]                                |
+---------------------------------------------------------------------------+
```

### 13.3 Banner de migracao (topo do /expeditions)

```
+---------------------------------------------------------------------------+
|  [i] Reorganizamos as fases para uma jornada mais natural.      [Entendi]|
|      Seu progresso esta preservado.  [Ver o que mudou]                   |
+---------------------------------------------------------------------------+
```

Azul claro (#E8F0F7), texto navy, 16px padding, border radius 8px.

### 13.4 PhaseLayout header (fase 3 - Guia)

```
+---------------------------------------------------------------------------+
|  Expedicoes > Viagem a Lisboa > Fase 3: Guia do Destino                  |
|                                                                           |
|  (v)---(v)---[BLUE 3]---(_)---(_)---(_)                                   |
|   1     2      3         4     5     6                                   |
|                                                                           |
|  Fase 3: Guia do Destino                                                  |
|  Conheca o destino em profundidade antes de planejar o que fazer.         |
|                                                                           |
|  [... conteudo do wizard ...]                                             |
|                                                                           |
|  [Voltar]                                [Avancar para o Roteiro] >      |
+---------------------------------------------------------------------------+
```

---

## 14. Patterns Reutilizados

- **UnifiedProgressBar** (SPEC-UX-019, SPEC-UX-026) — sem mudanca estrutural, apenas data
- **WizardFooter** (SPEC-UX-033) — sem mudanca; i18n keys CTAs atualizados
- **PhaseShell** (SPEC-UX-019) — sem mudanca
- **SaveDiscardDialog** (SPEC-UX-041) — sem mudanca
- **EditModeBanner** (SPEC-UX-017) — sem mudanca
- **ExpeditionCard quick-access links** (SPEC-UX-025) — ordem reajustada

---

## 15. Acceptance Criteria (UX)

- [ ] DashboardPhaseProgressBar exibe 6 segmentos na ordem: Inspiracao, Perfil, Guia, Roteiro, Logistica, Preparo
- [ ] Icones corretos por fase (Sparkles, UserCircle, BookOpen, Map, Plane, CheckSquare)
- [ ] UnifiedProgressBar no topo do PhaseLayout usa a mesma ordem
- [ ] Breadcrumb em cada fase mostra "Fase N: {Nome}" na nova numeracao
- [ ] WizardFooter "Avancar" leva a proxima fase na nova ordem logica
- [ ] ExpeditionSummary exibe 6 secoes na nova ordem cronologica
- [ ] PHASE_ICONS em ExpeditionSummary reordenados
- [ ] Quick-access links no card da expedicao seguem nova ordem (Guia > Roteiro > Checklist > Relatorio)
- [ ] Landing page copy atualizado (se mencionava ordem antiga)
- [ ] Banner "Reorganizamos as fases" aparece uma vez para expedicoes existentes em fase 3-6
- [ ] Banner eh dismissivel e persistente (nao reaparece)
- [ ] Todas as strings novas/alteradas existem em `pt.json` e `en.json`
- [ ] Contraste WCAG AA verificado em todos os novos estados de label
- [ ] Navegacao por teclado funcional em todos os segmentos clicaveis
- [ ] Leitor de tela anuncia corretamente "Fase N de 6, {nome}, {status}"
- [ ] Mobile: 6 segmentos cabem em 320px sem overflow
- [ ] prefers-reduced-motion desativa pulse do segmento current e transicoes de banner

---

## 16. Decisoes Pendentes — PO / Architect

1. **[ARCH] Renumeracao vs remapeamento visual**: A ordem logica muda nos componentes, mas os numeros na DB (`ExpeditionPhase.phaseNumber`, `Trip.currentPhase`) devem tambem mudar, ou apenas a UI? Recomendacao UX: **renumerar na DB**, para que breadcrumbs, URLs (`/phase-3`) e telemetria reflitam a nova ordem. Implica migration.

2. **[PO] Roteiro (fase 4) deve ser bloqueante ou nao-bloqueante?** Decisao UX preliminar: **nao-bloqueante**, para permitir que viajantes com plano proprio pulem o wizard de roteiro. PO precisa confirmar impacto de gamification (pontos).

3. **[PO] Impacto em pontos de gamificacao**: a ordem muda quanto aos `pointsReward` por fase? Hoje O Preparo da 75pts e Guia da 40pts; faz sentido manter ou reequilibrar ja que agora Guia vem antes e eh pre-requisito de Roteiro? Sugestao UX: manter rewards atuais para nao quebrar UserProgress existente; ajustar em sprint futuro se necessario.

4. **[PO] Expedicoes em fase 7 ou 8** no momento da migracao: confirmar que nao sao afetadas (recomendacao UX).

5. **[PO] Pagina /ajuda/reorder-fases**: criar ou linkar para changelog? UX sugere changelog publico suficiente.

6. **[ARCH] Caminhos de URL**: se renumerar, os paths fisicos (`/expedition/[id]/phase-3`) representam qual fase apos o reorder? Recomendacao UX: o path segue a **nova** numeracao (phase-3 = Guia). Requer redirect 301 para links antigos se existirem em emails/historico.

7. **[PROMPT-ENGINEER] Prompts de IA**: os prompts de Guia e Roteiro fazem referencia entre si? Se o Guia agora precede o Roteiro, o prompt do Roteiro pode usar o output do Guia como contexto — oportunidade de melhorar qualidade.

8. **[DATA-ENGINEER] Telemetria**: eventos `phase_started`, `phase_completed` hoje carregam `phaseNumber`. Queries historicas precisarao de um flag `pre_reorder` / `post_reorder` ou coluna de versao do schema de fases.

9. **[QA] Teste de regressao**: todas as expedicoes de teste em fixtures precisam ser reexaminadas. SPEC-UX deve ser seguida por SPEC-QA com casos por estado pre/pos-migracao.

---

## 17. Riscos UX

| Risco | Severidade | Mitigacao |
|-------|------------|-----------|
| Viajante confuso pensa que "perdeu" progresso por ver Preparo voltar para a direita | Media | Banner explicativo + label claro ("Seu progresso esta preservado") |
| Expedicao com fase 6 (Preparo antigo) completa e fases 3-5 abertas ficara "furada" na barra | Baixa | Aceitavel — reflete realidade; banner explica |
| Links externos (emails, compartilhamentos) apontam para paths antigos | Media | Arch deve implementar redirects 301 |
| Screenshots em docs/marketing desatualizados | Baixa | Ticket paralelo para regenerar assets |
| Usuario em meio a wizard no momento do deploy | Media | Feature flag gradual + migration idempotente; ao recarregar, cai na nova ordem |

---

## 18. Change History

| Data | Versao | Autor | Descricao |
|------|--------|-------|-----------|
| 2026-04-15 | 1.0.0 | ux-designer | Spec inicial — Sprint 44 reestruturacao das fases 3-6 |

---

> WARNING Blocked on: decisao 1 (renumeracao DB vs visual) — architect precisa pronunciar-se antes de implementacao. Demais decisoes podem ser resolvidas durante sprint planning.
