---
spec-id: SPEC-UX-028
title: Destino + Origem Side-by-Side Layout
version: 1.0.0
status: Draft
author: ux-designer
sprint: 32
reviewers: [product-owner, tech-lead, architect]
---

# SPEC-UX-028: Destino + Origem Side-by-Side Layout

**Versao**: 1.0.0
**Status**: Draft
**Autor**: ux-designer
**Product Spec**: SPEC-PROD-028 (UX-001)
**Criado**: 2026-03-19
**Ultima Atualizacao**: 2026-03-19

---

## 1. Objetivo do Viajante

O viajante quer preencher rapidamente os campos de Destino e Origem como um par logico — visualizando ambos simultaneamente para confirmar sua rota sem scroll desnecessario.

## 2. Personas Afetadas

| Persona | Como esta melhoria os serve |
|---|---|
| `@leisure-solo` | Visualiza destino e origem juntos, confirmando a rota de forma intuitiva antes de avancar |
| `@leisure-family` | Mesmo beneficio — decisoes de rota sao frequentemente discutidas em grupo e a visualizacao pareada facilita |
| `@business-traveler` | Preenche os campos mais rapidamente; layout lado a lado reduz scroll e tempo gasto na fase 1 |
| `@bleisure` | Pode comparar visualmente origem e destino ao decidir se estende uma viagem de negocios |

## 3. Fluxo do Usuario

### Happy Path

1. Usuario acessa Phase 1 da expedicao (nova ou revisita)
2. Em viewport >= 768px, os campos Destino e Origem aparecem lado a lado na mesma linha
3. Usuario preenche Destino (campo da esquerda) — autocomplete abre abaixo do campo, sem sobrepor o campo Origem
4. Usuario navega via Tab para o campo Origem (campo da direita)
5. Usuario preenche Origem — autocomplete abre abaixo do campo
6. Usuario continua o fluxo normalmente

```
[Phase 1 — Informacoes da Viagem]
    |
    v
[Desktop/Tablet: Campos Destino + Origem lado a lado]
    |                                    |
    v                                    v
[Destino autocomplete dropdown]    [Origem autocomplete dropdown]
    |                                    |
    +------------------------------------+
    |
    v
[Proxima secao do formulario]
```

### Caminho Alternativo — Mobile

1. Em viewport < 768px, os campos aparecem empilhados verticalmente (Destino acima, Origem abaixo)
2. Dropdowns abrem abaixo de cada campo sem restricao de largura lateral

### Estado de Erro — Validacao "mesma cidade"

- Coberto por SPEC-PROD-028 AC-005 a AC-009 — fora do escopo visual desta spec (tratado na implementacao dos campos, nao no layout)

## 4. Especificacao Visual

### Layout Lado a Lado (md+)

**Estrutura**:
- Container: linha horizontal com dois campos de largura igual (50% cada)
- Espacamento entre campos: 16px (--space-md)
- Campos alinhados pelo topo (labels na mesma linha horizontal)

**Hierarquia visual**:
1. **Destino** (campo esquerdo) — primeiro na leitura ocidental, primeiro no Tab order
2. **Origem** (campo direito) — segundo campo, visualmente pareado

**Labels**:
- Posicao: acima de cada campo (padrao existente do FormField)
- Cada campo mantem seu label independente, hint text, e area de erro
- Labels alinhados horizontalmente entre si

**Autocomplete dropdown**:
- Abre diretamente abaixo do campo que o disparou
- Largura do dropdown: igual a largura do campo pai (50% do container)
- O dropdown NAO deve ser cortado pela borda do campo adjacente — deve usar renderizacao em portal (elevacao acima de outros elementos)
- Quando Destino abre dropdown: o campo Origem permanece visivel e acessivel, sem sobreposicao
- Quando Origem abre dropdown: o campo Destino permanece visivel e acessivel

**Alinhamento vertical**:
- Se um campo exibe mensagem de erro e o outro nao, os campos mantem alinhamento pelo topo (labels alinhados)
- A area de erro/hint abaixo de cada campo e independente — um campo com erro pode empurrar conteudo abaixo dele sem afetar o campo adjacente

### Layout Empilhado (mobile, < 768px)

**Estrutura**:
- Campos em coluna vertical, largura 100%
- Ordem: Destino acima, Origem abaixo
- Espacamento entre campos: 16px (--space-md)
- Dropdown abre com largura 100% do campo

## 5. Responsividade

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Campos empilhados verticalmente (Destino acima, Origem abaixo). Largura 100%. Dropdown 100% do campo. |
| Tablet (768-1024px) | Campos lado a lado, 50% cada, gap 16px. Dropdown com largura do campo pai. |
| Desktop (> 1024px) | Mesmo que tablet. Campos lado a lado dentro do container max-width existente. |

## 6. Acessibilidade

- [x] Ambos os campos sao independentemente focaveis via Tab
- [x] Ordem de Tab: Destino primeiro, Origem segundo (segue ordem visual esquerda-para-direita)
- [x] Cada campo possui label visivel e associado semanticamente
- [x] Labels nao sao afetados pela mudanca de layout (mesmos labels, mesma associacao)
- [x] Dropdowns de autocomplete nao bloqueiam acesso ao campo adjacente
- [x] Dropdowns tem role="listbox" com aria-activedescendant para navegacao por teclado (preservar comportamento existente)
- [x] Mensagens de erro vinculadas via aria-describedby (preservar padrao FormField existente)
- [x] Touch targets >= 44x44px em ambos os campos (campos de input ja atendem)
- [x] Contraste de cores: sem alteracao — mantém tokens existentes

## 7. Conteudo e Microcopy

### Labels e CTAs

| Chave | PT-BR | EN |
|---|---|---|
| `destination_label` | Destino | Destination |
| `origin_label` | Origem | Origin |

(Sem novas strings — reutiliza labels existentes.)

### Tom de Voz

- Nenhuma alteracao — esta spec trata exclusivamente de layout, nao de conteudo textual.

## 8. Restricoes (da Spec de Produto)

- SPEC-PROD-028 AC-001: viewport >= 768px deve ser lado a lado
- SPEC-PROD-028 AC-002: viewport < 768px deve ser empilhado
- SPEC-PROD-028 AC-003: dropdown nao pode ser cortado pelo campo adjacente
- SPEC-PROD-028 AC-004: Tab order segue ordem visual (Destino -> Origem)
- Compatibilidade com o comportamento de autocomplete ja implementado (SPEC-PROD-017)

## 9. Criterios de Aceite (UX)

- [ ] Em viewport >= 768px, Destino e Origem aparecem na mesma linha, larguras iguais
- [ ] Em viewport < 768px, campos empilhados verticalmente
- [ ] Dropdown de autocomplete de um campo nao sobrepoe nem corta o campo adjacente
- [ ] Tab order: Destino -> Origem
- [ ] Labels alinhados horizontalmente em layout lado a lado
- [ ] Mensagem de erro em um campo nao desloca o campo adjacente verticalmente (alinhamento pelo topo)

## 10. Prototipo

- [ ] Prototipo requerido: Nao
- **Justificativa**: Alteracao de layout CSS simples e bem definida pela especificacao. A descricao visual e suficiente para implementacao.

## 11. Questoes Abertas

Nenhuma — spec pronta para implementacao.

## 12. Padroes Utilizados

- FormField (label + input + error + hint)
- DestinationAutocomplete (componente existente)
- Portal rendering para dropdown (padrao PortalCombobox de SPEC-UX-006)

---

> **Status da Spec**: Draft
> Ready for Architect

---

## Historico de Mudancas

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | ux-designer | Draft inicial — layout lado a lado para campos Destino e Origem |
