---
spec-id: SPEC-PROD-017
title: Destination Autocomplete Rewrite
version: 1.0.0
status: Draft
author: product-owner
sprint: 30
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-017: Destination Autocomplete Rewrite

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-17
**Sprint**: 30
**Relacionado a**: SPEC-UX-001 (Autocomplete Redesign, Approved v1.1.0), SPEC-ARCH-003 (Implemented Sprint 27)

---

## Contexto: Por que Este Documento Existe

SPEC-UX-001 foi aprovada no Sprint 26 e implementada via SPEC-ARCH-003 no Sprint 27 com reescrita cmdk + Radix portal. A implementacao resolveu o bug de portal (NAV-004) mas o resultado de UX e considerado mediano: sem flags de pais, sem buscas recentes, sem fallback offline, e sem overlay mobile adequado.

Este documento define os requisitos de produto para uma segunda geracao do autocomplete — focada em qualidade de experiencia do usuario, nao em correcao de bug. A decisao sobre provedor de dados (Nominatim vs Google Places API) fica fora de escopo deste spec e deve ser tratada em SPEC-ARCH pelo architect antes do inicio da implementacao.

---

## User Story

As a @leisure-solo or @leisure-family,
I want to search for a destination by city name, airport, or landmark and immediately see recognizable results with country context,
so that I select the correct destination confidently on the first attempt without ambiguity about which "Paris" or "San Jose" I mean.

---

## Contexto do Traveler

- **Pain point**: Resultados atuais sao texto puro sem pais ou regiao — "Springfield" pode ser em 10 paises. Usuario seleciona errado e percebe so na Phase 3 quando o checklist vem incorreto.
- **Workaround atual**: Usuario digita nome do pais junto ao nome da cidade para filtrar. Nao deveria ser necessario.
- **Frequencia**: Toda criacao de expedicao. Campo aparece em Phase 1 (destino) e Phase 1 (origem). Alta frequencia, alto impacto.

---

## Requisitos Funcionais

### RF-001 — Busca por multiplos tipos
O campo aceita busca por:
- Nome de cidade (ex: "Rio de Janeiro", "Tokyo")
- Codigo IATA de aeroporto (ex: "GRU", "CDG")
- Nome de aeroporto (ex: "Guarulhos", "Charles de Gaulle")
- Landmark/regiao reconhecida internacionalmente (ex: "Patagonia", "Algarve")

### RF-002 — Formato do resultado
Cada resultado exibe, nesta ordem:
1. Flag emoji do pais (baseado em codigo ISO-2 do resultado)
2. Nome principal do local (cidade ou aeroporto)
3. Estado/regiao (quando disponivel) + pais

Exemplo de linha de resultado:
```
🇧🇷  Rio de Janeiro — RJ, Brasil
🇫🇷  Paris — Ile-de-France, Franca
🇺🇸  San Jose — California, Estados Unidos
```

### RF-003 — Buscas recentes
O sistema armazena ate 5 buscas recentes do usuario autenticado (persistidas, nao apenas em sessao). Ao focar o campo vazio, exibe lista de buscas recentes com label "Buscas recentes". Usuario pode remover uma entrada individual ou limpar todas.

### RF-004 — Fallback offline para cidades comuns
Quando a chamada ao provedor de dados falha ou demora mais de 3 segundos, o sistema exibe resultados de uma lista local de aproximadamente 200 cidades mais visitadas do mundo. O fallback e silencioso para o usuario (sem mensagem de erro de conectividade) a menos que nenhum resultado seja encontrado, caso em que exibe "Sem resultados — verifique sua conexao".

### RF-005 — Debounce e velocidade
O campo utiliza debounce de 300ms antes de disparar a busca. A lista de resultados deve aparecer em menos de 300ms apos o fim do debounce (excluindo latencia de rede). Nenhuma chamada e feita para strings com menos de 2 caracteres.

### RF-006 — Minimo de resultados
O campo exibe entre 4 e 8 resultados por busca. Se menos de 4 resultados existirem, exibe todos disponíveis. Nunca exibe lista vazia enquanto o spinner de loading estiver ativo.

### RF-007 — Selecao e confirmacao
Ao selecionar um resultado:
1. O valor do campo e preenchido com o nome canonico do local.
2. O metadado (lat/lon, codigo ISO do pais, tipo do local) e armazenado internamente e passado ao form.
3. O campo exibe o texto selecionado sem o flag emoji (o flag e apenas visual na lista de resultados).

### RF-008 — Estado de erro de API
Se o provedor de dados retornar erro 4xx ou 5xx, o campo exibe mensagem inline "Busca indisponivel no momento" e ativa o fallback offline (RF-004). O erro nao fecha o dropdown.

---

## Requisitos de UX — Mobile

### RF-009 — Overlay full-screen em mobile
Em viewports <= 640px, ao focar o campo de autocomplete, o sistema exibe um overlay full-screen que cobre a tela inteira, com:
- Campo de busca no topo com botao "Cancelar" a direita
- Lista de resultados ocupando o restante da tela
- Teclado nativo exibido automaticamente ao abrir o overlay
- Toque fora da lista (no botao Cancelar) fecha o overlay sem selecionar nada

### RF-010 — Alvos de toque
Em mobile, cada linha de resultado tem altura minima de 44px. O espaco entre linhas e >= 4px. Nao ha colisao de alvos de toque entre resultados adjacentes.

### RF-011 — Nao interferencia com teclado virtual
O overlay de resultados nao deve ficar escondido atras do teclado virtual em iOS/Android. O container de resultados deve usar `position: fixed` ou mecanismo equivalente que garanta visibilidade acima do teclado.

---

## Requisitos de Acessibilidade

### RF-012 — ARIA compliant
O componente implementa o padrao ARIA `combobox` corretamente:
- `role="combobox"` no input
- `aria-expanded` refletindo estado da lista
- `aria-autocomplete="list"`
- `aria-activedescendant` apontando para o item focado
- `role="listbox"` na lista de resultados
- `role="option"` em cada item

### RF-013 — Navegacao por teclado
- `ArrowDown` / `ArrowUp`: navega entre resultados
- `Enter`: seleciona o resultado focado
- `Escape`: fecha a lista e devolve foco ao input sem selecionar
- `Tab`: seleciona o primeiro resultado se a lista estiver aberta (comportamento opcional, documentar escolha)

### RF-014 — Screen reader
O nome de cada opcao lida pelo screen reader deve incluir: nome da cidade, estado/regiao (se disponivel), e pais. O flag emoji deve ter `aria-hidden="true"`.

---

## Requisitos de i18n

### RF-015 — Nomes em portugues
Os resultados devem, preferencialmente, retornar o nome do local no idioma da sessao do usuario (PT-BR ou EN). Quando o provedor nao suportar idioma, aceita-se nome em ingles como fallback. Nomes de paises no texto secundario devem ser traduzidos.

### RF-016 — Mensagens de UI
Todos os textos de UI do componente (label, placeholder, "Buscas recentes", "Limpar", "Sem resultados", erro de API) devem ter traducoes em PT-BR e EN nos arquivos de i18n do projeto.

---

## Criterios de Aceite

- **AC-001**: Dado que o usuario digita "rio" no campo de destino, quando passam 300ms apos o ultimo caractere, entao resultados aparecem em menos de 300ms contendo pelo menos "Rio de Janeiro" com flag 🇧🇷 e texto secundario "RJ, Brasil" (ou equivalente PT-BR).
- **AC-002**: Dado que o usuario digita "GRU", entao o resultado inclui o aeroporto Guarulhos com indicacao de que e aeroporto e nao cidade.
- **AC-003**: Dado que o usuario tem 3 buscas recentes salvas e abre o campo vazio, entao as 3 buscas recentes aparecem antes de qualquer resultado de API.
- **AC-004**: Dado que a API de busca falha com status 500, entao o campo exibe resultados do fallback offline para a query digitada, sem mensagem de erro visivel, a menos que o fallback tambem nao retorne resultados.
- **AC-005**: Dado viewport de 375px e o usuario foca o campo, entao um overlay full-screen abre com campo de busca e botao "Cancelar" visiveis, e o teclado virtual e exibido.
- **AC-006**: Dado o overlay mobile aberto, quando o usuario toca em "Cancelar", entao o overlay fecha e o campo original permanece vazio (sem selecao forcada).
- **AC-007**: Dado que o usuario navega a lista com `ArrowDown` e pressiona `Enter`, entao o item focado e selecionado e o campo e preenchido com o nome canonico.
- **AC-008**: Dado `Escape` com a lista aberta, entao a lista fecha e o foco retorna ao input sem alteracao do valor.
- **AC-009**: Dado que o usuario seleciona "Paris — Ile-de-France, Franca", entao o campo exibe "Paris" sem o flag emoji, e os metadados (lat/lon, ISO-2 "FR") estao disponiveis internamente ao form.
- **AC-010**: Dado uma string de 1 caractere, entao nenhuma chamada de API e feita e nenhuma lista e exibida.
- **AC-011**: Dado que o usuario esta em sessao autenticada e seleciona "Madrid" pela primeira vez, entao em uma sessao subsequente "Madrid" aparece nas buscas recentes.
- **AC-012**: Dado um screen reader, o anuncio de cada opcao inclui nome da cidade, regiao e pais, sem pronunciar o flag emoji.
- **AC-013**: Dado que o resultado demora mais de 3 segundos para retornar, entao o fallback offline e ativado e resultados locais sao exibidos.
- **AC-014**: Dado que o usuario remove uma busca recente, entao ela nao aparece mais na lista de recentes e a remocao e persistida.

---

## Fora do Escopo (v1 desta spec)

- Suporte a multi-destinacao (multiplos campos de destino na mesma fase)
- Busca por endereco especifico (rua, numero)
- Deteccao automatica de localizacao atual via GPS
- Pre-populacao de destino baseada em historico de viagens anteriores (feature separada)
- Decisao sobre provedor de dados (Nominatim vs Google Places) — SPEC-ARCH-XXX

---

## Metricas de Sucesso

| Metrica | Baseline | Meta | Prazo |
|---------|----------|------|-------|
| Taxa de selecao no primeiro resultado (entre usuarios que selecionam algo) | Desconhecida | >= 70% | Sprint 31 |
| Taxa de abandono do campo sem selecionar | Desconhecida | <= 15% | Sprint 31 |
| Reclamacoes de "destino errado" em feedback beta | N/A | 0 | Sprint 30 |
| Tempo medio para selecionar destino (desde abertura do campo) | Desconhecido | <= 8 segundos | Sprint 31 |

---

## Dependencias

- **SPEC-ARCH-XXX** (a criar): decisao sobre provedor de dados (Nominatim vs Google Places API) + modelo de armazenamento de buscas recentes
- **SPEC-UX-XXX** (a criar): especificacao visual do overlay mobile e formato visual dos resultados

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | product-owner | Documento inicial — Sprint 30 rewrite planning |
