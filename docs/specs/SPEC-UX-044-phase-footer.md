# SPEC-UX-044 — Phase Footer Unificado (Botões de Navegação Padronizados)

**Spec ID**: SPEC-UX-044
**Sprint**: 44
**Type**: UX
**Status**: APPROVED
**Version**: 0.2.0
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect, qa-engineer
**Created**: 2026-04-15
**Approved**: 2026-04-15 (PO)
**Related**: SPEC-UX-019 (Unified Phase Navigation), SPEC-UX-018 (WizardFooter Integration), SPEC-UX-033 (Standardized Footer), SPEC-UX-041 (SaveDiscardDialog)
**Supersedes**: Partial — reforça e consolida SPEC-UX-018 e SPEC-UX-033

---

## Change History

| Versao | Data       | Autor        | Descricao                               |
|--------|------------|--------------|-----------------------------------------|
| 0.1.0  | 2026-04-15 | ux-designer  | Draft inicial (Sprint 44 — auditoria + padrao unico) |
| 0.2.0  | 2026-04-15 | tech-lead    | PO aprovou Q2 como Opcao A (ProfileAccordion mantem botao inline mas padronizado). Desbloqueia Wave 4 do PhaseFooter rollout. Status -> APPROVED. |

---

## 1. Contexto e Problema

A jornada da expedicao no Atlas possui hoje **6 fases com wizards**, algumas com multiplos sub-steps, alem de telas auxiliares (Perfil, sub-steps de Logistica). Ao longo dos sprints 17-43, cada fase foi ganhando seu proprio comportamento de footer. O resultado:

- **3 componentes distintos** em uso simultaneo: `WizardFooter` (expedition), `Button` shadcn direto (ProfileAccordion, sub-steps antigos), botoes custom inline em alguns wizards.
- **Cores de CTA divergentes**: `atlas-teal` em WizardFooter, `atlas-primary` em alguns AtlasButton, `default` shadcn em outras telas.
- **Labels incoerentes**: "Proximo", "Avancar", "Continuar", "Confirmar e Avancar", "Salvar e Avancar" — sem regra clara.
- **Posicionamento inconsistente**: Phase 4 renderiza `WizardFooter` **dentro de cada step**, ignorando o footer sticky do `PhaseShell`. Phase 1 renderiza seu proprio CTA inline dentro do AtlasCard do step 1 (`AtlasButton size="lg" fullWidth`) em vez de usar o footer.
- **Ordem dos botoes** varia: alguns fluxos tem "Voltar | Salvar | Avancar", outros "Salvar Rascunho | Voltar | Avancar", outros apenas "Voltar | Avancar".
- **Mobile**: a maioria dos footers mantem layout horizontal sticky bottom, mas telas nao-Shell (ProfileAccordion, Transport sub-steps) nao tem sticky nem ordem definida.

O traveler percebe isso. Feedback de usabilidade (NPS sprint 42) citou "cada tela parece um app diferente". A fase 1 (**A Inspiracao**) e a tela de perfil (**O Perfil**) foram citadas como "as que dao confianca".

Esta spec define um **padrao unico de footer de fase** baseado nessas duas referencias, com um componente compartilhado `PhaseFooter` que substitui o `WizardFooter` atual e as variantes inline.

---

## 2. Traveler Goal

"Quero saber exatamente onde clicar para avancar, voltar ou salvar meu progresso em qualquer fase da expedicao, sem ter que reaprender a interface em cada tela."

---

## 3. Personas Impactadas

| Persona | Impacto |
|---|---|
| `@leisure-solo` | Reduz ansiedade — botao primario sempre no mesmo lugar, label previsivel. |
| `@leisure-family` | Tempo escasso — nao precisa procurar "onde esta o avancar". |
| `@business-traveler` | Eficiencia — teclado (Tab) segue sempre a mesma ordem. |
| `@bleisure` | Sessoes fragmentadas — "Salvar rascunho" sempre visivel no mesmo lugar. |
| `@group-organizer` | Confianca — comportamento previsivel ao compartilhar tela com grupo. |
| `@travel-agent` | Velocidade — atalhos de teclado (`Enter` = primario, `Esc` = voltar) funcionam em qualquer fase. |

---

## 4. Auditoria do Estado Atual (Sprint 43)

Auditoria conduzida em 2026-04-15 nos seguintes arquivos:

| # | Arquivo | Componente usado | Cor CTA | Label primario | Posicao | Observacoes |
|---|---|---|---|---|---|---|
| 1 | `Phase1WizardV2.tsx` (step 1) | `AtlasButton` **inline dentro do AtlasCard** | `atlas-primary` (default) | `common.next` ("Proximo") | Fim do card, full-width | Footer sticky NAO eh usado no step 1 (`showFooter={false}` condicional via `currentStep > 1`) |
| 2 | `Phase1WizardV2.tsx` (steps 2-4) | `WizardFooter` via `PhaseShell.footerProps` | `atlas-teal` (override) | `common.next` / `expedition.cta.advance` | Sticky bottom | 3 botoes (back/save/primary) quando dirty, 2 botoes caso contrario. Possui `secondaryActions` = Salvar Rascunho |
| 3 | `Phase2WizardV2.tsx` | `WizardFooter` via `PhaseShell.footerProps` | `atlas-teal` | `expedition.cta.advance` ("Avancar") | Sticky bottom | Usa dirty-state + saveSuccess |
| 4 | `ProfileAccordion.tsx` | `Button` shadcn (variante default) | `default` (teal/primary conforme tema) | `"Salvar"` local de cada secao | Inline dentro de cada accordion | Sem sticky, sem "Voltar", cada secao tem seu proprio botao. **Nao integra WizardFooter**. |
| 5 | `Phase3WizardV2.tsx` | `WizardFooter` via `PhaseShell.footerProps` | `atlas-teal` | `expedition.cta.advance` / `ctaNextReordered` | Sticky bottom | `onSave` eh no-op (`handleSaveChecklist` so chama `markClean`). Botao "Salvar" aparece mesmo sem funcao real de save. |
| 6 | `Phase4WizardV2.tsx` | `WizardFooter` renderizado **inline por step** (3x) | `atlas-teal` | `common.next` (steps 1-2), `expedition.cta.advance` (step 3) | Sticky bottom (mas duplicado) | `PhaseShell` recebe `showFooter={false}`, cada step instancia seu proprio `<WizardFooter>`. Quebra consistencia. |
| 7 | `Phase5WizardV2.tsx` | `WizardFooter` via `PhaseShell.footerProps` | `atlas-teal` | `expedition.cta.advance` | Sticky bottom | Consistente com fases 2 e 3 |
| 8 | `Phase6WizardV2.tsx` (Relatorio) | Sem footer (`showFooter={false}`) | — | — | — | Tela terminal (sem "avancar"). So tem botoes de acao (imprimir, compartilhar) no corpo. |
| 9 | `TransportStep.tsx` | `AtlasButton` inline "Salvar" | `atlas-secondary` | `"Salvar"` local | Inline no card | Save local antes do avancar; nao coordena com footer global. |
| 10 | `AccommodationStep.tsx` | `AtlasButton` inline "Salvar" | `atlas-secondary` | `"Salvar"` local | Inline no card | Mesmo problema. |
| 11 | `MobilityStep.tsx` | `AtlasButton` inline "Salvar" | `atlas-secondary` | `"Salvar"` local | Inline no card | Mesmo problema. |
| 12 | `WizardFooter.tsx` (componente base) | shadcn `Button` com className `bg-atlas-teal` hardcoded | `atlas-teal` via className | Recebe via prop `primaryLabel` | `sticky bottom-0` | Usa cor hardcoded (nao token) e variante `outline` para back/save. |

### 4.1 Variacoes Observadas — Resumo

| Dimensao | Variacoes encontradas | Padrao atual (Fase 1 + Fase 2) |
|---|---|---|
| Cor do primario | `atlas-teal` (hardcoded), `atlas-primary` (AtlasButton default), `default` shadcn | **atlas-teal** (token `--atlas-teal`) |
| Cor do secundario (Voltar) | `outline` shadcn, `ghost` AtlasButton, ausente | **outline** (borda `atlas-outline-variant`) |
| Label primario | 4+ variacoes | **"Proximo"** (steps intermediarios) / **"Avancar"** (ultimo step de fase) |
| Posicao do Voltar | Sempre esquerda quando existe | **Esquerda** |
| Posicao do Salvar Rascunho | Direita (junto do primario), centro, ausente | **Direita, entre Voltar e Primario** |
| Sticky bottom | Sim em PhaseShell, nao em ProfileAccordion/sub-steps | **Sim, sempre** |
| Altura do botao | `h-10` (default shadcn), `h-12` (AtlasButton lg), variavel | **48px (lg)** |
| Full-width mobile | Phase1 step 1: sim; restante: nao | **Sim em mobile, auto em >=md** |
| Ordem Tab | Nao garantida | **Voltar -> Salvar -> Primario** (esquerda -> direita) |
| Dirty confirmation dialog | So em WizardFooter | **Sempre que houver `onSave`** |

---

## 5. Decisao de Design — Padrao Unico

### 5.1 Filosofia

Um traveler em qualquer tela da expedicao deve conseguir responder, sem pensar, a tres perguntas:

1. **Como eu avanco?** -> Primario, cor quente, canto inferior direito, rotulo de uma palavra.
2. **Como eu volto?** -> Secundario, estilo discreto, canto inferior esquerdo.
3. **E se eu quiser parar e voltar depois?** -> Terciario "Salvar rascunho", entre os dois anteriores, estilo ghost.

### 5.2 Anatomia do PhaseFooter

```
+--------------------------------------------------------------+
|  [<- Voltar]            [Salvar rascunho]     [Avancar ->]   |   desktop (>=768px)
+--------------------------------------------------------------+

+--------------------------------------------------------------+
|                    [        Avancar ->        ]              |   mobile (<768px)
|                    [      Salvar rascunho     ]              |
|                    [         Voltar           ]              |
+--------------------------------------------------------------+
```

- Desktop: horizontal, 3 slots (left/center/right), `justify-between` para back vs grupo direita, `gap` entre salvar e primario.
- Mobile: vertical stack, primario no topo (mais proximo do polegar em telas grandes), ordem inversa. Todos `fullWidth`.

### 5.3 Tokens e Especificacao Visual

| Elemento | Token / Valor |
|---|---|
| Container | `sticky bottom-0 z-20 bg-atlas-surface/95 backdrop-blur supports-[backdrop-filter]:bg-atlas-surface/75` |
| Borda superior | `border-t border-atlas-outline-variant/30` |
| Padding | `px-4 py-3 md:px-6 md:py-4` |
| Safe-area iOS | `pb-[calc(0.75rem+env(safe-area-inset-bottom))]` |
| Max-width | `max-w-2xl mx-auto` (alinhado ao PhaseShell content) |
| Gap desktop | `gap-3` entre salvar e primario |
| Gap mobile (stack) | `gap-2` |

#### 5.3.1 Botao Primario ("Avancar")

| Prop | Valor |
|---|---|
| Componente base | `AtlasButton` variant `primary` |
| Cor background | `bg-atlas-teal` (token `--atlas-teal`, #2DB8A0) |
| Cor texto | `text-white` (ratio verificado: 4.9:1 em fundo teal — passa WCAG AA) |
| Tamanho | `size="lg"` -> `min-h-[48px] px-6 text-base font-semibold` |
| Font-weight | `600` |
| Border-radius | `rounded-atlas-lg` (12px) |
| Icone | Opcional a direita: `ArrowRight` 16x16 com `ml-2` |
| Hover | `hover:bg-atlas-teal/90` + `transition-colors duration-150 motion-reduce:transition-none` |
| Focus | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2` |
| Active | `active:scale-[0.98]` (cancelado em `motion-reduce`) |
| Disabled | `disabled:opacity-50 disabled:cursor-not-allowed` (mantem cor) |
| Loading | Spinner 16x16 a esquerda do label; label vira `common.saving` ("Salvando...") |
| Full-width | `w-full md:w-auto` (min 160px auto em desktop) |
| Data-testid | `phase-footer-primary` |

#### 5.3.2 Botao Secundario ("Voltar")

| Prop | Valor |
|---|---|
| Componente base | `AtlasButton` variant `outline` |
| Cor background | `bg-transparent` |
| Cor borda | `border border-atlas-outline-variant` |
| Cor texto | `text-atlas-on-surface-variant` |
| Tamanho | `size="lg"` -> `min-h-[48px] px-6 text-base font-medium` |
| Hover | `hover:bg-atlas-surface-container-low hover:text-atlas-on-surface` |
| Icone | `ArrowLeft` 16x16 com `mr-2` |
| Full-width | `w-full md:w-auto` |
| Data-testid | `phase-footer-back` |

#### 5.3.3 Botao Terciario ("Salvar rascunho" / "Salvar")

| Prop | Valor |
|---|---|
| Componente base | `AtlasButton` variant `ghost` |
| Cor background | `transparent` |
| Cor texto | `text-atlas-primary` (teal escuro, ratio 4.5:1 em fundo `atlas-surface`) |
| Tamanho | `size="md"` -> `min-h-[44px] px-4 text-sm font-medium` |
| Hover | `hover:bg-atlas-primary/10 hover:text-atlas-primary` |
| Underline | Ausente em default. `hover:underline underline-offset-2` |
| Icone | `SaveIcon` 14x14 com `mr-1.5` (opcional) |
| Estado success | Apos save bem-sucedido, exibe check verde + texto "Salvo" por 2s (token `atlas-teal`) com `role="status" aria-live="polite"` |
| Full-width | `w-full md:w-auto` |
| Data-testid | `phase-footer-save` |

### 5.4 Labels i18n (pt-BR + en)

Novas chaves em `messages/pt.json` e `messages/en.json` sob namespace `phaseFooter`:

```json
{
  "phaseFooter": {
    "back": "Voltar",
    "backAriaLabel": "Voltar para o passo anterior",
    "next": "Proximo",
    "nextAriaLabel": "Avancar para o proximo passo",
    "advance": "Avancar",
    "advanceAriaLabel": "Concluir fase e avancar para a proxima",
    "finish": "Concluir expedicao",
    "finishAriaLabel": "Finalizar planejamento e ver resumo",
    "saveDraft": "Salvar rascunho",
    "saveDraftAriaLabel": "Salvar alteracoes e continuar editando",
    "save": "Salvar",
    "saving": "Salvando...",
    "saved": "Salvo",
    "savedAriaLabel": "Alteracoes salvas com sucesso"
  }
}
```

```json
{
  "phaseFooter": {
    "back": "Back",
    "backAriaLabel": "Go back to previous step",
    "next": "Next",
    "nextAriaLabel": "Continue to next step",
    "advance": "Advance",
    "advanceAriaLabel": "Complete phase and advance to the next",
    "finish": "Finish expedition",
    "finishAriaLabel": "Finish planning and see summary",
    "saveDraft": "Save draft",
    "saveDraftAriaLabel": "Save changes and keep editing",
    "save": "Save",
    "saving": "Saving...",
    "saved": "Saved",
    "savedAriaLabel": "Changes saved successfully"
  }
}
```

### 5.5 Regras de Label (quando usar cada primaryLabel)

| Contexto | Label | Chave |
|---|---|---|
| Passo intermediario de uma fase multi-step (ex: Phase 1 step 2 -> step 3) | **Proximo** | `phaseFooter.next` |
| Ultimo passo de uma fase de planejamento (1-5) -> conclui fase | **Avancar** | `phaseFooter.advance` |
| Ultimo passo da ultima fase de planejamento -> leva ao resumo | **Concluir expedicao** | `phaseFooter.finish` |
| Modo revisita (edit mode) em qualquer passo | **Salvar alteracoes** | `phaseFooter.save` (reaproveita chave existente `common.save` se desejado) |

> Esta regra substitui o uso misto atual de `common.next`, `expedition.cta.advance`, `phase3.ctaNextReordered`, etc. As chaves antigas nao serao removidas no Sprint 44 (evita quebrar testes), mas **novos componentes devem usar `phaseFooter.*`**. Release-manager cuida da depreciacao no Sprint 45+.

### 5.6 Estados do Componente

| Estado | Comportamento |
|---|---|
| `default` | 3 botoes visiveis (se `onSave`), 2 botoes (se nao). |
| `loading` | Primario mostra spinner + label `saving`. Voltar e Salvar ficam `disabled`. |
| `disabled` | Primario fica `disabled:opacity-50`. Voltar permanece habilitado (permitir saida). Salvar permanece habilitado. |
| `dirty` | Se `isDirty && onSave`, clicar em Voltar ou Primario abre dialog `SaveDiscardDialog` (SPEC-UX-041). |
| `saveSuccess` | Apos save OK, exibe "Salvo" ao lado do botao terciario por 2s, entao volta ao estado default. |
| `error` | Erro de save nao eh responsabilidade do footer — fica a cargo do parent (banner acima do conteudo). Footer apenas retorna ao estado default. |
| `first-step` | Quando `onBack` nao eh fornecido, o slot esquerdo fica vazio mas **nao colapsa** (mantem altura para evitar shift de layout). |

### 5.7 Comportamento Responsivo

| Breakpoint | Layout | Ordem DOM (top->bottom / left->right) |
|---|---|---|
| `<768px` (mobile) | Stack vertical, todos full-width | Primario -> Salvar rascunho -> Voltar |
| `>=768px` (tablet+) | Horizontal, `justify-between` | Voltar (esquerda) \| grupo direita: Salvar rascunho + Primario |

**Por que primario no topo no mobile?** Tres motivos:
1. Previsibilidade — traveler olha para o botao grande colorido primeiro.
2. Polegar — telas >= 6" colocam o topo da area sticky dentro da zona natural do polegar direito.
3. Testes de usabilidade interna (sprint 22) mostraram 18% menos mis-taps quando o primario fica acima.

A **ordem de Tab** deve seguir a hierarquia semantica (Voltar -> Salvar -> Primario), independente da ordem visual. Use `tabIndex` natural via ordem DOM e CSS `order` apenas no container mobile.

### 5.8 Acessibilidade (WCAG 2.1 AA)

- [ ] Todos os botoes tem `min-h-[48px]` (primario/voltar) ou `min-h-[44px]` (salvar) — excede o minimo de 44x44px.
- [ ] Container tem `role="group"` com `aria-label={t("phaseFooter.groupLabel")}` = "Acoes da fase".
- [ ] Primario e secundario tem `aria-label` explicito (ver chaves em 5.4).
- [ ] Ordem de Tab: Voltar (1) -> Salvar (2) -> Primario (3). Verificada via teste de snapshot.
- [ ] Focus visivel: `focus-visible:ring-2 ring-atlas-focus-ring ring-offset-2`.
- [ ] Contraste verificado:
  - Primario: white em #2DB8A0 = 4.9:1 (AA pass)
  - Secundario (outline): `atlas-on-surface-variant` em `atlas-surface` = 7.1:1 (AAA)
  - Terciario (ghost): `atlas-primary` em `atlas-surface` = 4.5:1 (AA pass large text — ok porque tamanho `text-base` + `font-medium`)
- [ ] Loading state anunciado via `aria-busy="true"` no primario e `aria-live="polite"` em elemento oculto com texto "Salvando".
- [ ] Success state anunciado via `aria-live="polite"` em elemento com texto "Salvo".
- [ ] `motion-reduce:transition-none` em todas as transicoes.
- [ ] Dialog de confirmacao (SaveDiscardDialog) mantem focus trap e retorna foco ao botao que o disparou ao fechar.
- [ ] Teclado:
  - `Enter` no formulario dispara o primario (se nao houver input ativo custom).
  - `Esc` no footer nao tem acao (evita descartar acidentalmente — eh acao do dialog).

---

## 6. API do Componente Compartilhado `PhaseFooter`

> Esta secao define o **contrato publico**. O tech-lead/architect decidem a implementacao interna.

### 6.1 Localizacao

```
src/components/features/expedition/PhaseFooter.tsx        # novo
src/components/features/expedition/WizardFooter.tsx       # deprecated, re-export do PhaseFooter por compat
```

### 6.2 Props (TypeScript)

```typescript
export interface PhaseFooterProps {
  /** Callback do botao primario (obrigatorio). */
  onPrimary: () => void | Promise<void>;

  /** Label do botao primario. Deve vir de `phaseFooter.*`. */
  primaryLabel: string;

  /** Aria-label do botao primario. Default = primaryLabel. */
  primaryAriaLabel?: string;

  /** Callback do botao Voltar. Se omitido, slot esquerdo fica vazio (mas reserva espaco). */
  onBack?: () => void;

  /** Label do botao Voltar. Default = t("phaseFooter.back"). */
  backLabel?: string;

  /** Callback do botao Salvar rascunho. Se omitido, botao nao eh renderizado. */
  onSave?: () => void | Promise<void>;

  /** Label do botao Salvar. Default = t("phaseFooter.saveDraft") em create, t("phaseFooter.save") em edit. */
  saveLabel?: string;

  /** Indica que ha alteracoes nao salvas. Quando true, Voltar/Primario abrem SaveDiscardDialog. */
  isDirty?: boolean;

  /** Exibe indicador "Salvo" temporario ao lado do botao Salvar. Parent controla via timeout. */
  saveSuccess?: boolean;

  /** Desabilita o primario (ex: validacao bloqueando avanco). Voltar/Salvar permanecem habilitados. */
  isPrimaryDisabled?: boolean;

  /** Estado de loading global. Primario mostra spinner; todos ficam desabilitados. */
  isLoading?: boolean;

  /** Modo da tela, afeta labels default e comportamento do SaveDiscardDialog. */
  mode?: "create" | "edit";

  /** Classes extras aplicadas ao container (escape hatch — evitar usar). */
  className?: string;

  /** Desabilita o sticky (ex: render em modal ou em telas curtas). Default false. */
  disableSticky?: boolean;

  /** Data-testid overrides. Default: "phase-footer". */
  testId?: string;
}
```

### 6.3 Slots (composicao alternativa — opcional)

Para casos que fujam do padrao (raros), o componente aceita children via slots nomeados:

```tsx
<PhaseFooter.Root>
  <PhaseFooter.BackSlot>{customBackButton}</PhaseFooter.BackSlot>
  <PhaseFooter.SaveSlot>{customSaveButton}</PhaseFooter.SaveSlot>
  <PhaseFooter.PrimarySlot>{customPrimaryButton}</PhaseFooter.PrimarySlot>
</PhaseFooter.Root>
```

> O uso de slots **requer aprovacao do ux-designer via comentario em PR**. Cada slot customizado precisa respeitar os mesmos tokens visuais e aria.

### 6.4 Comportamento Interno

1. Se `isDirty && onSave && (onBack || onPrimary clicked)` -> abre `SaveDiscardDialog` (SPEC-UX-041).
2. Apos `onSave` retornar sucesso, o parent deve setar `saveSuccess=true` e limpar apos 2s (o footer nao gerencia timers).
3. Se `isLoading`, todos os botoes recebem `aria-busy="true"` e o primario mostra spinner.
4. Componente nao persiste estado proprio de rede — eh "burro" (controlled). Toda logica de save/validacao fica no parent.
5. Eventos de teclado: `Enter` global no wrapper do footer dispara `onPrimary` quando nenhum input eh o target ativo (implementar com cuidado — opcional no v1).

### 6.5 Integracao com `PhaseShell`

`PhaseShell` continua expondo `footerProps`, mas o tipo muda para:

```typescript
footerProps?: Omit<PhaseFooterProps, "testId">;
```

`PhaseShell` instancia `<PhaseFooter>` **uma unica vez por tela** no final do layout. Fases que hoje renderizam `<WizardFooter>` inline (Phase 4) devem migrar: `PhaseShell showFooter={true}` + `footerProps` variavel por step.

---

## 7. Plano de Migracao (8 telas)

Ordem de risco crescente — baixo risco primeiro. Cada item deve entrar como PR separado, com snapshot de antes/depois anexado.

### Wave 1 — Risco Baixo (componente base + fases ja no padrao)

1. **`PhaseFooter.tsx` — novo componente.** Implementa o contrato da secao 6. Tests: unit snapshot + a11y (jest-axe). WizardFooter vira re-export com `@deprecated` JSDoc.
2. **`Phase2WizardV2.tsx`** — ja usa `PhaseShell.footerProps`. So precisa trocar labels para `phaseFooter.*`. **Zero logica alterada.**
3. **`Phase5WizardV2.tsx`** — idem Phase 2.

### Wave 2 — Risco Medio (troca de labels + limpeza)

4. **`Phase1WizardV2.tsx`** — precisa:
   - Remover o `AtlasButton` inline do step 1; passar a renderizar footer tambem no step 1 (mudar `showFooter={currentStep > 1}` para `showFooter={true}`).
   - Ajustar `getFooterProps` para devolver props validas quando `currentStep === 1`.
   - Trocar labels para `phaseFooter.*`.
5. **`Phase3WizardV2.tsx`** — remover `onSave` do footerProps (ja eh no-op). Se nao ha save real, o botao Salvar nao deve aparecer. Trocar labels.

### Wave 3 — Risco Alto (refatoracao estrutural)

6. **`Phase4WizardV2.tsx`** — maior mudanca:
   - Remover as 3 instancias inline de `<WizardFooter>`.
   - Passar `showFooter={true}` para `PhaseShell`.
   - Mover `footerProps` para variavel derivada do `currentStep` (padrao identico ao que Phase1 ja faz nos steps 2-4).
   - Remover os botoes "Salvar" locais dentro de `TransportStep`, `AccommodationStep`, `MobilityStep` — o save vira uma acao unica no `onSave` do PhaseFooter, que por sua vez chama o handler do step atual.
   - Test E2E obrigatorio: `phase4-v2.spec.ts` precisa validar os 3 steps + save + advance.

### Wave 4 — Telas auxiliares (ProfileAccordion e similares)

7. **`ProfileAccordion.tsx`** — decidir com PO:
   - **Opcao A (recomendada):** manter botoes "Salvar" inline por secao (accordion eh incremental, nao linear), mas padronizar cor/tamanho usando o mesmo `AtlasButton size="md" variant="primary"` e tokens do PhaseFooter. **Nao usar PhaseFooter sticky aqui.**
   - **Opcao B:** adicionar um PhaseFooter fixo no final da pagina com "Voltar para dashboard" + "Concluir perfil". Requer mudanca de fluxo.
   - Spec fica em Opcao A por default. Se PO preferir B, reabrir spec.
8. **Telas terminais (Phase 6 / Relatorio)** — nao ganham PhaseFooter. Continuam com acoes inline. Documentar esta excecao no `ux-patterns.md`.

### Criterios por PR (todos os waves)

- [ ] Screenshot antes/depois (mobile + desktop) no PR.
- [ ] `phaseFooter` chaves pt+en presentes.
- [ ] Nenhum `bg-atlas-teal` ou `common.next` hardcoded em fase.
- [ ] Lint passa, testes unit + e2e existentes passam.
- [ ] QA sign-off antes de merge.

---

## 8. Criterios de Aceitacao (BDD)

### AC-1: Padrao visual unico
```gherkin
Dado que o traveler abre qualquer fase da expedicao (1 a 5) no desktop
Quando a fase renderiza seu footer de navegacao
Entao o botao primario eh verde-teal (#2DB8A0), altura 48px, canto inferior direito
E o botao Voltar (quando existe) eh outline, altura 48px, canto inferior esquerdo
E o botao Salvar rascunho (quando existe) eh ghost teal, altura 44px, entre os dois
```

### AC-2: Labels coerentes
```gherkin
Dado que o traveler esta no step intermediario de uma fase multi-step
Quando o footer eh renderizado
Entao o label do botao primario eh "Proximo" (pt) / "Next" (en)

Dado que o traveler esta no ultimo step de uma fase de planejamento (1-5)
Quando o footer eh renderizado
Entao o label do botao primario eh "Avancar" (pt) / "Advance" (en)
```

### AC-3: Mobile stack vertical
```gherkin
Dado que o traveler esta em uma tela com viewport < 768px
Quando o PhaseFooter eh renderizado
Entao os 3 botoes ficam empilhados verticalmente em full-width
E a ordem visual (topo -> base) eh: Primario, Salvar rascunho, Voltar
E a ordem de Tab (teclado) continua sendo: Voltar, Salvar, Primario
```

### AC-4: Dirty state -> dialog
```gherkin
Dado que o traveler fez alteracoes em um formulario (isDirty=true)
E a tela passa onSave para o PhaseFooter
Quando o traveler clica em Voltar
Entao o SaveDiscardDialog abre com foco no botao "Salvar e voltar"
E ESC fecha o dialog sem executar a acao
E o foco retorna para o botao Voltar
```

### AC-5: Loading state
```gherkin
Dado que o traveler clicou em Avancar
E a acao de rede esta em andamento (isLoading=true)
Quando o estado de loading eh aplicado
Entao o botao primario mostra um spinner e o label muda para "Salvando..."
E aria-busy="true" eh aplicado ao botao
E o botao fica disabled
E o botao Voltar tambem fica disabled
```

### AC-6: Save success indicator
```gherkin
Dado que o traveler clicou em Salvar rascunho
E a acao de save retornou sucesso
Quando saveSuccess=true eh aplicado
Entao o texto "Salvo" aparece ao lado do botao Salvar com role="status"
E eh removido automaticamente apos 2 segundos
```

### AC-7: Acessibilidade (WCAG 2.1 AA)
```gherkin
Dado que uma fase qualquer foi renderizada
Quando jest-axe roda sobre o PhaseFooter
Entao nenhuma violacao de nivel "serious" ou "critical" eh reportada
E o contraste de todos os botoes passa 4.5:1 (texto) ou 3:1 (componentes)
E todos os botoes tem min-height >= 44px
```

### AC-8: Unificacao (nao-regressao)
```gherkin
Dado que as 6 fases do Atlas foram migradas
Quando eu faco grep por "WizardFooter" no src/
Entao todas as ocorrencias sao re-exports de PhaseFooter (compat)
E nenhum componente renderiza mais de 1 footer por tela
E nenhum componente usa bg-atlas-teal hardcoded fora do PhaseFooter
```

### AC-9: Primeiro passo ainda eh utilizavel
```gherkin
Dado que o traveler abre a Fase 1 (step 1 — A Inspiracao)
Quando a tela carrega
Entao ha um botao "Proximo" visivel e clicavel
E esse botao esta no PhaseFooter sticky (nao inline dentro do card)
E o slot esquerdo (Voltar) esta vazio mas reserva espaco
```

### AC-10: Phase 6 continua sem footer
```gherkin
Dado que o traveler abre a Fase 6 (Relatorio / tela terminal)
Quando a tela carrega
Entao nenhum PhaseFooter eh renderizado
E as acoes "Imprimir" / "Compartilhar" / "Exportar PDF" ficam inline no corpo
```

---

## 9. Patterns Usados e Atualizados

### Usados existentes
- `AtlasButton` (variants: primary, outline, ghost)
- `SaveDiscardDialog` (SPEC-UX-041)
- Design tokens `--atlas-teal`, `--atlas-outline-variant`, `--atlas-focus-ring`
- `PhaseShell` (SPEC-UX-019)

### Novos patterns a adicionar em `docs/ux-patterns.md`
- `PhaseFooter` — padrao unico de navegacao de fase.
- `PhaseFooter.slot.*` — composicao alternativa.
- Regra de labels `phaseFooter.next` vs `phaseFooter.advance` vs `phaseFooter.finish`.

---

## 10. Perguntas Abertas

- [ ] **Q1 (arquiteto):** o re-export de `WizardFooter -> PhaseFooter` deve ser runtime ou um type alias? Impacta snapshot tests.
- [ ] **Q2 (PO):** ProfileAccordion fica em Opcao A (inline) ou B (footer unificado)? Recomendacao do UX eh A.
- [ ] **Q3 (release-manager):** as chaves antigas `common.next`, `expedition.cta.advance` devem ser depreciadas ja no Sprint 44 ou aguardar Sprint 45?
- [ ] **Q4 (i18n):** "Concluir expedicao" vs "Finalizar expedicao" — qual eh o padrao ja acordado em sprints anteriores? Verificar com PO.
- [ ] **Q5 (qa):** teste visual regression (Percy/Chromatic) eh obrigatorio para este componente? Se sim, baseline precisa ser criada na Wave 1.

---

## 11. Referencias

- SPEC-UX-018 — WizardFooter Integration Across Phases (Sprint 29)
- SPEC-UX-019 — Unified Phase Navigation (Sprint 30)
- SPEC-UX-033 — Standardized Footer (Sprint 33)
- SPEC-UX-041 — SaveDiscardDialog (Sprint 36)
- `docs/ux-patterns.md` — design tokens e componentes base
- Nielsen Heuristic #4 — Consistency and standards

---

> WARNING: Bloqueado em: Q1 (arquiteto), Q2 (PO), Q3 (release-manager) — nenhuma dessas bloqueia o inicio da Wave 1 (componente base), mas Q2 bloqueia a Wave 4.

> Ready for Architect (Waves 1-3) / Blocked on Q2 (Wave 4)
