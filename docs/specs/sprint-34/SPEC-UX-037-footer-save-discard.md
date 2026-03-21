# SPEC-UX-037: Footer 3-Button Design — Save/Discard

**Version**: 1.0.0
**Status**: Draft
**Author**: ux-designer
**Reviewers**: product-owner, tech-lead, architect
**Product Spec**: SPEC-PROD-029
**Architecture Spec**: SPEC-ARCH-024
**Created**: 2026-03-21
**Last Updated**: 2026-03-21

---

## 1. Contexto e Objetivo

O viajante precisa de um rodape de navegacao consistente e previsivel em todas as fases do wizard. O layout de 3 botoes (Voltar | Salvar | Avancar) elimina ambiguidade sobre como salvar dados parciais e navegar entre passos. O dialogo de salvar/descartar protege contra perda acidental de dados ao navegar para tras ou avancar com alteracoes nao salvas.

## 2. Layout dos 3 Botoes

### Desktop (>= 640px)

```
+---------------------------------------------------------------+
| [Voltar]              [Salvar]                      [Avancar] |
| outline, left         ghost, center              primary, right|
+---------------------------------------------------------------+
```

- **Voltar**: `variant="outline"`, alinhado a esquerda. Visivel somente quando existe passo/fase anterior.
- **Salvar**: `variant="ghost"`, centralizado. Visivel somente quando `onSave` e fornecido. Texto: chave i18n `itinerary.wizard.footer.save`.
- **Avancar**: `variant="default"` (primary), alinhado a direita. Cor `bg-atlas-teal`. Texto dinamico: "Proximo", "Avancar", "Concluir" conforme contexto.

### Mobile (< 640px)

```
+-------------------------------+
| [Avancar]         full-width  |
| [Salvar]          full-width  |
| [Voltar]          full-width  |
+-------------------------------+
```

- Botoes empilhados verticalmente, todos `w-full`.
- Ordem invertida: botao primario no topo para acessibilidade de polegar (thumb zone).
- Gap de `gap-3` entre botoes.

### Barra Sticky

- `position: sticky; bottom: 0;`
- `border-top: 1px solid var(--border)`
- `background: var(--background)` com `z-index: 40`
- Padding: `py-4 px-4` (mobile) / `py-4 px-6` (desktop)

## 3. Dialogo de Salvar/Descartar

### Trigger

O dialogo aparece quando o usuario clica **Voltar** ou **Avancar** e o formulario esta em estado dirty (`isDirty === true`).

### Layout do Modal

```
+------------------------------------------------+
|  [X]                                           |
|                                                |
|  Alteracoes nao salvas                         |
|  Voce tem dados nao salvos. O que deseja       |
|  fazer?                                        |
|                                                |
|  [Descartar]   [Salvar e Continuar]  [Cancelar]|
|   destructive    primary (atlas-teal)  outline  |
+------------------------------------------------+
```

- **3 opcoes no dialogo**:
  1. **Descartar**: descarta alteracoes e executa a navegacao pretendida (back ou advance)
  2. **Salvar e Continuar**: salva dados via server action, depois executa navegacao
  3. **Cancelar** (ou Escape / clique no overlay): fecha o dialogo, permanece na tela

### Comportamento

| Acao do usuario | Resultado |
|---|---|
| Clicar "Descartar" | Reseta form para ultimo estado salvo, executa navegacao |
| Clicar "Salvar e Continuar" | Chama `onSave()`, aguarda sucesso, executa navegacao |
| Clicar "Cancelar" | Fecha dialogo, nenhuma acao |
| Pressionar Escape | Fecha dialogo, nenhuma acao |
| Clicar fora do modal (overlay) | Fecha dialogo, nenhuma acao |

## 4. Toast de Confirmacao

Ao salvar com sucesso (via botao "Salvar" direto ou "Salvar e Continuar" no dialogo):

- Toast verde (`bg-atlas-teal/10 text-atlas-teal border-atlas-teal/30`)
- Texto: "Dados salvos" (chave i18n: `itinerary.wizard.footer.dataSaved`)
- Posicao: acima do footer sticky, alinhado ao centro
- Auto-dismiss: 3 segundos
- Animacao: fade-in 200ms, fade-out 200ms
- `role="status"` + `aria-live="polite"` para acessibilidade

## 5. Acessibilidade

- **Focus trap**: quando o dialogo esta aberto, o foco fica preso dentro do modal
- **Escape**: fecha o dialogo e retorna foco ao botao que o abriu
- **aria-modal="true"** no container do dialogo
- **aria-labelledby** apontando para o titulo do dialogo
- **Tab order**: Descartar -> Salvar e Continuar -> Cancelar
- **Reduced motion**: `prefers-reduced-motion: reduce` desativa animacoes de fade
- Todos os botoes com `type="button"` explicito (evitar submit acidental)

## 6. Responsividade

| Breakpoint | Layout | Botoes |
|---|---|---|
| < 640px (mobile) | Botoes empilhados, full-width | Primario no topo |
| >= 640px (tablet/desktop) | Botoes em linha, espacados | Voltar esquerda, Salvar centro, Avancar direita |

## 7. Estados Visuais

| Estado | Voltar | Salvar | Avancar |
|---|---|---|---|
| Clean (sem alteracoes) | Habilitado | Desabilitado (opacity 50%) | Habilitado |
| Dirty (com alteracoes) | Habilitado (trigger dialog) | Habilitado | Habilitado (trigger dialog) |
| Saving | Desabilitado | Spinner + "Salvando..." | Desabilitado |
| Loading (dados carregando) | Desabilitado | Desabilitado | Desabilitado |

## 8. Criterios de Aceitacao

- [ ] **AC-037-01**: Footer exibe 3 botoes no layout correto (Voltar esquerda, Salvar centro, Avancar direita) em desktop
- [ ] **AC-037-02**: Footer empilha botoes verticalmente em mobile (< 640px) com primario no topo
- [ ] **AC-037-03**: Clicar "Voltar" com dirty state abre dialogo de confirmacao com 3 opcoes
- [ ] **AC-037-04**: Clicar "Avancar" com dirty state abre dialogo de confirmacao
- [ ] **AC-037-05**: Opcao "Descartar" no dialogo descarta dados e navega corretamente
- [ ] **AC-037-06**: Opcao "Salvar e Continuar" no dialogo salva dados e navega apos sucesso
- [ ] **AC-037-07**: Toast verde "Dados salvos" aparece apos save bem-sucedido e desaparece em 3s
- [ ] **AC-037-08**: Focus trap funciona corretamente no dialogo (Tab nao sai do modal)
- [ ] **AC-037-09**: Escape fecha o dialogo e retorna foco ao botao que o abriu
- [ ] **AC-037-10**: Footer e sticky (fixo no bottom) e visivel em scroll longo
- [ ] **AC-037-11**: Botao "Salvar" fica desabilitado quando nao ha alteracoes (clean state)
- [ ] **AC-037-12**: Todos os botoes ficam desabilitados durante estado de saving

---

## Historico de Alteracoes

| Versao | Data | Alteracao |
|---|---|---|
| 1.0.0 | 2026-03-21 | Criacao inicial — Sprint 34 |
