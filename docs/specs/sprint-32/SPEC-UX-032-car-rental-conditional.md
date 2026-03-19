---
spec-id: SPEC-UX-032
title: Pergunta de Aluguel de Carro Condicional
version: 1.0.0
status: Draft
author: ux-designer
sprint: 32
reviewers: [product-owner, tech-lead, architect]
---

# SPEC-UX-032: Pergunta de Aluguel de Carro Condicional

**Versao**: 1.0.0
**Status**: Draft
**Autor**: ux-designer
**Product Spec**: SPEC-PROD-028 (UX-004)
**Criado**: 2026-03-19
**Ultima Atualizacao**: 2026-03-19

---

## 1. Objetivo do Viajante

O viajante quer ver apenas perguntas relevantes para suas escolhas — a secao de aluguel de carro so deve aparecer se ele indicou que pretende alugar um carro.

## 2. Personas Afetadas

| Persona | Como esta melhoria os serve |
|---|---|
| `@leisure-solo` | Nao ve perguntas irrelevantes — menos friccao em Phase 4 |
| `@leisure-family` | Familia que usa transporte publico nao precisa responder sobre aluguel de carro |
| `@business-traveler` | Fluxo mais limpo e direto — so ve o que importa para sua logistica |

## 3. Fluxo do Usuario

### Happy Path — Sem aluguel de carro

1. Usuario acessa Phase 4, step 3 (Mobilidade Local)
2. Usuario seleciona opcoes de mobilidade (ex: "Transporte publico", "Taxi/Rideshare")
3. "Aluguel de Carro" NAO esta selecionado
4. Secao de perguntas sobre aluguel de carro NAO aparece
5. Usuario continua normalmente

### Happy Path — Com aluguel de carro

1. Usuario acessa Phase 4, step 3 (Mobilidade Local)
2. Usuario seleciona "Aluguel de Carro" entre as opcoes de mobilidade
3. Secao de perguntas sobre aluguel de carro aparece imediatamente abaixo das opcoes de mobilidade
4. Usuario responde as perguntas de aluguel (needsCarRental, CNH se aplicavel)
5. Usuario continua normalmente

### Caminho Alternativo — Desselecionar aluguel de carro

1. Usuario selecionou "Aluguel de Carro" e preencheu dados de aluguel
2. Usuario desseleciona "Aluguel de Carro" no grid de mobilidade
3. Secao de aluguel de carro desaparece com transicao suave
4. Dados de aluguel preenchidos sao descartados (reset para valores iniciais)
5. Se o usuario reselecionar "Aluguel de Carro", a secao reaparece com campos vazios

```
[Step 3 — Mobilidade Local]
    |
    v
[Grid de opcoes de mobilidade]
    |
    +--- "Aluguel de Carro" NAO selecionado ---> [Secao de aluguel oculta]
    |
    +--- "Aluguel de Carro" selecionado ---> [Secao de aluguel visivel]
                                                  |
                                                  +--- [Pergunta: "Vai precisar alugar carro?"]
                                                  |     |
                                                  |     +--- Sim ---> [Perguntas CNH se internacional]
                                                  |     +--- Nao ---> [Nenhuma acao adicional]
                                                  |
                                                  +--- Deselecionar "Aluguel de Carro"
                                                        |
                                                        v
                                                  [Secao desaparece, dados descartados]
```

## 4. Especificacao Visual

### Visibilidade Condicional

**Trigger**: A opcao "car_rental" no array de mobilidade local (LOCAL_MOBILITY_OPTIONS).

**Quando "car_rental" NAO esta no array `selected`**:
- A secao inteira de aluguel de carro (needsCarRental, cnhConfirmed, cinhDeadline) nao e renderizada no DOM
- Nenhum espaco vazio e deixado onde a secao estaria

**Quando "car_rental" ESTA no array `selected`**:
- A secao de aluguel de carro aparece abaixo do grid de opcoes de mobilidade
- Transicao de entrada: slide-down + fade-in (200ms, ease-out)
- A secao mantem o estilo visual atual (perguntas de sim/nao com botoes radio ou toggle)

**Quando "car_rental" e removido do array `selected` (desselecao)**:
- Transicao de saida: fade-out (150ms)
- Apos a transicao: secao removida do DOM
- Estado da secao e resetado:
  - `needsCarRental` volta para `null`
  - `cnhConfirmed` volta para `false`
- prefers-reduced-motion: transicoes reduzidas a corte direto (sem slide/fade)

### Posicao da Secao

- Abaixo do grid de opcoes de mobilidade
- Acima do botao de salvamento
- Espacamento: 16px (--space-md) de margem superior em relacao ao grid

### Conteudo da Secao (quando visivel)

A secao contem as perguntas existentes sobre aluguel de carro:
1. "Vai precisar alugar carro?" (sim/nao)
2. Se sim + viagem internacional: aviso sobre CNH Internacional (CINH) com deadline

> Nenhuma alteracao no conteudo ou layout interno da secao — apenas a logica de visibilidade muda.

## 5. Responsividade

| Breakpoint | Comportamento |
|---|---|
| Mobile (< 768px) | Secao full-width, mesma posicao (abaixo do grid de mobilidade). Grid de mobilidade 2 colunas. |
| Tablet (768-1024px) | Grid de mobilidade 3 colunas. Secao de aluguel full-width abaixo. |
| Desktop (> 1024px) | Grid de mobilidade 4 colunas. Secao de aluguel full-width abaixo. |

A responsividade da secao de aluguel de carro nao muda — apenas sua visibilidade condicional e nova.

## 6. Acessibilidade

- [x] Quando a secao aparece, screen readers anunciam o novo conteudo via aria-live="polite" no container da secao (anuncio discreto, nao assertivo)
- [x] Quando a secao desaparece, o conteudo e removido do DOM — screen readers nao encontram elementos fantasma
- [x] O botao "car_rental" no grid de mobilidade (aria-pressed) nao muda de comportamento — apenas controla a visibilidade da secao condicionalmente
- [x] Foco NAO move automaticamente para a secao ao aparecer — o usuario ja esta interagindo com o grid de mobilidade e pode navegar naturalmente
- [x] Se o usuario desselecionar "car_rental" enquanto foco esta dentro da secao de aluguel, foco deve retornar ao botao "car_rental" no grid (evitar foco perdido)
- [x] Transicoes respeitam prefers-reduced-motion

## 7. Conteudo e Microcopy

### Labels

Nenhuma nova string necessaria. Todas as strings ja existem:
- `expedition.phase4.mobility.options.car_rental` — label do botao no grid
- Perguntas de aluguel ja estao internacionalizadas

### Tom de Voz

- Sem alteracao — a pergunta de aluguel mantem o tom neutro e informativo existente.

## 8. Restricoes (da Spec de Produto)

- SPEC-PROD-028 AC-015: Sem "car_rental" selecionado = secao nao exibida
- SPEC-PROD-028 AC-016: Com "car_rental" selecionado = secao aparece imediatamente (sem save/reload)
- SPEC-PROD-028 AC-017: Desmarcar "car_rental" = secao desaparece e dados descartados
- SPEC-PROD-028 AC-018: Se "car_rental" nao esta na lista de opcoes do sistema, secao nunca aparece
- Condicionalidade e logica de UI pura — sem chamada de API (SPEC-PROD-028 Performance constraint)

## 9. Criterios de Aceite (UX)

- [ ] Secao de aluguel invisivel quando "car_rental" nao selecionado no grid
- [ ] Secao de aluguel aparece quando "car_rental" e selecionado
- [ ] Aparicao com transicao suave (slide-down + fade-in, 200ms)
- [ ] Desaparicao com transicao suave (fade-out, 150ms)
- [ ] Dados de aluguel resetados ao desselecionar "car_rental"
- [ ] Foco retorna ao botao "car_rental" se usuario desseleciona enquanto foco esta na secao
- [ ] aria-live="polite" anuncia aparicao da secao para screen readers
- [ ] prefers-reduced-motion: transicoes reduzidas ou eliminadas

## 10. Prototipo

- [ ] Prototipo requerido: Nao
- **Justificativa**: Alteracao de visibilidade condicional sobre componentes existentes. Nenhum novo componente visual.

## 11. Questoes Abertas

Nenhuma — spec pronta para implementacao.

## 12. Padroes Utilizados

- MobilityStep (componente existente — grid de opcoes com aria-pressed)
- Phase4Wizard (gerenciamento de estado needsCarRental/cnhConfirmed existente)
- Motion tokens (SPEC-UX-003: fast 150ms, normal 200ms)

---

> **Status da Spec**: Draft
> Ready for Architect

---

## Historico de Mudancas

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | ux-designer | Draft inicial — visibilidade condicional da secao de aluguel de carro |
