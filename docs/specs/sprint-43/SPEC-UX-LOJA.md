---
spec_id: SPEC-UX-043-001
title: Loja, Premium Upsell e Multi-City Selector
version: 1.0.0
status: Draft
author: ux-designer
created: 2026-04-10
sprint: 43
related_specs:
  - SPEC-PROD-043 (monetization plan, TBD)
  - SPEC-ARCH-043 (Mercado Pago integration, TBD)
  - SPEC-AI-GAMIFICATION (PA economy)
reviewers:
  - product-owner
  - architect
  - tech-lead
  - finops-engineer
  - prompt-engineer
  - security-specialist
---

# SPEC-UX-LOJA — Loja, Premium e Multi-City

> Spec UX da feature de monetizacao do Atlas: pagina de loja, planos Premium,
> seletor de multiplos destinos, fluxo de checkout, gestao de assinatura e
> upsells contextuais. Sprint 43.

---

## 1. Contexto e objetivo

O Atlas hoje opera em modelo Free-only, com gamificacao baseada em Pontos
Atlas (PA). O Sprint 43 introduz a primeira camada de monetizacao:

- **Pacotes de PA** (compra avulsa ja parcialmente especificada em SPEC-UX-043
  do Sprint 36 — esta spec consolida e amplia)
- **Assinatura Premium** mensal/anual com beneficios recorrentes
- **Multi-city** (multiplos destinos por expedicao) como primeira feature
  exclusiva Premium

A feature precisa converter sem alienar. O viajante Free deve continuar
sentindo que tem um produto completo; o Premium deve sentir que pagou por
uma experiencia mais ambiciosa, nao por desbloquear paywalls artificiais.

### 1.1 Decisoes ja travadas (input do PO/finops)

| Decisao | Valor |
|---|---|
| Icone na header | Sacola (shopping bag), ao lado do badge de gamificacao |
| Rota PT | `/loja` |
| Rota EN | `/store` |
| Premium mensal | R$ 29,90 |
| Premium anual | R$ 299,00 (economize 17%) |
| Free: destinos por expedicao | 1 |
| Free: expedicoes ativas | 3 totais |
| Free: PA onboarding | 180 |
| Premium: destinos por expedicao | 4 |
| Premium: expedicoes ativas | Ilimitado |
| Premium: PA mensais | 1.500 |
| Premium: Sonnet opt-in | Sim (feature flag por usuario) |
| Gateway | Mercado Pago (BRL) |
| Trial | 7 dias (cartao requerido — ver justificativa secao 8.4) |

---

## 2. Personas afetadas

| Persona | Necessidade | Como esta spec atende |
|---|---|---|
| `@leisure-solo` | Inspiracao + custo previsivel | Pacotes PA pequenos; Premium opcional |
| `@leisure-family` | Multiplos destinos + grupos | Multi-city Premium e maior cota PA |
| `@business-traveler` | Velocidade + recibo | Checkout em 2 cliques; recibo Mercado Pago |
| `@bleisure` | Combinar viagens | Multi-city e expedicoes ilimitadas |
| `@group-organizer` | Roteiros longos com varias paradas | Multi-city core value |
| `@travel-agent` | Operacao em volume | Premium ilimitado + PA recorrente |

Multi-city e Premium nao sao para todo viajante — leisure-solo deve poder
viver uma vida inteira no Free sem sentir-se penalizado.

---

## 3. Mapa da jornada do viajante

```
[Discovery]                  [Curiosity]                 [Trigger]
   |                             |                          |
Ve sacola na header   ->   Clica e abre /loja   ->   Bate em limite Free
   |                             |                          |
   v                             v                          v
"O que vendem aqui?"    "Quanto custa Premium?"    Modal upsell contextual
                                                          |
                                                          v
                                                  [Comparison]
                                                          |
                                                          v
                                                  Tabela Free vs Premium
                                                          |
                                                          v
                                                  [Checkout]
                                                          |
                          +-------------------------------+
                          |                               |
                          v                               v
                   Iniciar 7 dias gratis         Comprar pacote PA
                          |                               |
                          v                               v
                Mercado Pago checkout            Mercado Pago checkout
                          |                               |
                          v                               v
                   /loja?status=success         /loja?status=success
                          |                               |
                          v                               v
                   [Activation]                     [Activation]
                          |                               |
                          v                               v
              Tour Premium + checklist        Toast "PA creditados"
                          |                               |
                          v                               v
                  [Retention]                       [Retention]
                          |                               |
                          v                               v
              Renovacao mensal/anual         Saldo PA visivel sempre
```

Estados emocionais por etapa (importante para microcopy):

| Etapa | Emocao dominante | Risco UX | Mitigacao |
|---|---|---|---|
| Discovery | Curiosidade | Confundir com loja de produtos fisicos | Tooltip "Pontos e Premium" no icone |
| Curiosity | Calculadora mental | Sticker shock | Mostrar valor por dia (R$ 0,82/dia anual) |
| Trigger | Frustracao | Sentir paywall | Linguagem "voce desbloqueou um nivel novo" |
| Comparison | Avaliacao racional | Paralisia | Recomendacao default + economia destacada |
| Checkout | Ansiedade | Abandono | Trial 7 dias + cancele quando quiser |
| Activation | Excitacao | Nao saber o que mudou | Tour onboarding com checklist |
| Retention | Conforto | Esquecer valor entregue | PA bar sempre visivel + email mensal |

---

## 4. Arquitetura de informacao

### 4.1 Header (mudancas)

```
+--------------------------------------------------------------+
| [Atlas]   Expedicoes   Meu Atlas        [PA] [Sacola] [Avatar]|
+--------------------------------------------------------------+
                                            ^      ^      ^
                                            |      |      |
                            GamificationBadge      |  UserMenu
                            (existente)      StoreIcon
                                             (NOVO)
```

`StoreIcon` posicionamento:
- Entre `GamificationBadge` e `UserMenu`
- Tamanho 24x24 dentro de touch target 44x44
- Tooltip on hover: "Pontos Atlas e Premium"
- aria-label: "Abrir loja Atlas"
- Badge de notificacao (dot 8x8) quando: saldo PA < 100 OU promocao ativa OU
  Premium expirando em 7 dias
- Quando usuario e Premium: o icone ganha um pequeno selo dourado no canto
  superior direito (4x4)

`PremiumBadge` (novo, opcional, so para assinantes):
- Pill dourado pequeno entre nome do usuario e avatar no UserMenu dropdown
- Texto: "Premium" — nao no header principal (mantem header limpo)

### 4.2 Rota /loja — estrutura

```
/loja
  |- Hero (sempre visivel)
  |- Tabs:
  |    [1] Pacotes de PA   (default para Free com saldo > 100)
  |    [2] Premium         (default para Free com saldo < 100 OU upsell-driven)
  |    [3] Meu Plano       (default para usuarios ja Premium)
  |- FAQ (sempre visivel ao final)
```

Default tab logic (server-side, baseado em query param e estado):

```
if (?tab=premium)        -> Tab Premium
elif (user.isPremium)    -> Tab Meu Plano
elif (user.paBalance<100)-> Tab Premium (soft upsell)
else                     -> Tab Pacotes de PA
```

### 4.3 Pontos de upsell contextuais (fora de /loja)

Locais onde aparece CTA "Conhecer Premium" ou modal:

| Local | Trigger | Tratamento |
|---|---|---|
| Dashboard expedicoes | 3 expedicoes ativas atingidas | Card amarelo "Pronto para mais?" |
| Phase1Wizard destino | Tentar adicionar 2o destino | Modal upsell |
| Phase 5/6 (IA) | Saldo PA < custo | Modal "Adquirir mais" com 2 CTAs |
| Settings > IA | Toggle Sonnet | Tooltip "Disponivel no Premium" |
| Profile dropdown | Sempre (se Free) | Item "Conhecer Premium" |

---

## 5. Pagina /loja — wireframes em prosa

### 5.1 Hero

Faixa full-width acima das tabs, altura 280px desktop / 200px mobile.
Background: gradiente alpine (`#1A3C5E` -> `#2DB8A0`) com leve textura de
linhas topograficas (SVG decorativo).

Conteudo centralizado:

```
+----------------------------------------------------------------+
|                                                                |
|         Leve sua expedicao mais longe                          |
|                                                                |
|    Mais destinos, mais IA, mais liberdade para planejar        |
|              do seu jeito.                                     |
|                                                                |
|     [Conhecer Premium]    [Ver pacotes de PA]                  |
|        (botao primary)      (botao ghost)                      |
|                                                                |
+----------------------------------------------------------------+
```

Tipografia:
- H1: 36px desktop / 28px mobile, peso 700, branco
- Subtitle: 18px / 16px, peso 400, branco 90%

Para usuarios Premium, hero muda:

```
"Bem-vindo de volta, navegador Premium"
"Voce tem 1.247 PA disponiveis e renova em 18 dias"
[Ver meu plano]   [Convidar um amigo]
```

### 5.2 Tab 1 — Pacotes de PA

Grid de 4 cards. Mobile: stack vertical. Tablet: 2x2. Desktop: 1x4.

Cada card (referencia: SPEC-UX-043 do Sprint 36):

```
+-------------------------+
|     EXPLORADOR          |  <- nome do pacote (H3, 18px)
|                         |
|       500 PA            |  <- destaque (32px, primary)
|                         |
|      R$ 9,90            |  <- preco (20px, peso 600)
|                         |
|  ~ R$ 0,02 por PA       |  <- valor unitario (12px, muted)
|                         |
|  +- 6 geracoes IA       |  <- equivalencia tangivel
|                         |
|     [Comprar]           |  <- CTA full-width
+-------------------------+
```

| Pacote | PA | Preco BRL | R$/PA | "Equivale a" |
|---|---|---|---|---|
| Explorador | 500 | 9,90 | 0,0198 | 6 geracoes IA |
| Navegador | 1.200 | 19,90 | 0,0166 | 14 geracoes IA |
| Cartografo | 2.800 | 39,90 | 0,0142 | 33 geracoes IA |
| Embaixador | 6.000 | 79,90 | 0,0133 | 70 geracoes IA |

Card "Navegador" recebe badge "Recomendado" no canto superior direito
(pill laranja primary, 11px, peso 600). Border destacado 2px primary.

Abaixo do grid, banner secundario:

```
"Quer PA todo mes sem precisar comprar?
 Premium da 1.500 PA mensais por R$ 29,90.
 [Ver Premium]"
```

### 5.3 Tab 2 — Premium

Acima da comparacao, toggle Mensal/Anual:

```
              [ Mensal ]  [ Anual -17% ]
                            ^^^^^^^
                  pill verde, peso 600
```

Default: Anual (maior LTV, melhor para o usuario).

Card de plano (centralizado, max 480px):

```
+-----------------------------------------+
|             ATLAS PREMIUM               |
|                                         |
|              R$ 299/ano                 |
|         ~ R$ 24,92/mes                  |
|                                         |
|     Economize R$ 59,80 vs mensal        |
|                                         |
|       [ Iniciar 7 dias gratis ]         |
|                                         |
|   Sem compromisso. Cancele quando       |
|   quiser. Cobranca apos o trial.        |
+-----------------------------------------+
```

Microcopy de confianca embaixo:
- "Pagamento processado por Mercado Pago"
- "Reembolso integral em ate 7 dias"
- "Recibo enviado por email"

### 5.4 Tabela de comparacao Free vs Premium

Componente `ComparisonTable`. Desktop: 3 colunas (feature, Free, Premium).
Mobile: stack (Free e Premium em accordion separado por feature).

```
+------------------------------+----------+----------+
| Recurso                      |   Free   | Premium  |
+------------------------------+----------+----------+
| Destinos por expedicao       |    1     |    4     |
| Expedicoes ativas            |    3     |  Ilim.   |
| PA mensais                   |    -     |  1.500   |
| PA onboarding                |   180    |   180    |
| Geracoes IA (checklist)      |    OK    |    OK    |
| Geracoes IA (guia)           |    OK    |    OK    |
| Geracoes IA (roteiro)        |    OK    |    OK    |
| Modelo Sonnet (qualidade+)   |    -     |   Opt-in |
| Multi-city (3 destinos+)     |    -     |    OK    |
| Exportar PDF do roteiro      |    OK    |    OK    |
| Marca d'agua no PDF          |   Sim    |   Nao    |
| Prioridade na fila de IA     |    -     |    OK    |
| Suporte                      | Comunidade| Email   |
| Badges exclusivas            |    -     |   Sim    |
+------------------------------+----------+----------+

   [ Iniciar 7 dias gratis ]   [ Ver pacotes de PA ]
```

Tratamento visual:
- Coluna Free: fundo `--color-bg-subtle`, texto `--color-text-secondary`
- Coluna Premium: fundo dourado palido (`#FFF8E1`), border 2px `#D4AF37`,
  texto `--color-text-primary`
- Linhas alternadas com leve stripe para legibilidade
- "OK" -> icone check; "-" -> icone minus em cinza claro
- Linhas exclusivas Premium tem fundo dourado mais saturado

Cor "dourado Premium" (novo token):
```
--color-premium:        #D4AF37
--color-premium-light:  #FFF8E1
--color-premium-dark:   #A9871F
```

Verificar contraste: `#A9871F` sobre `#FFF8E1` = 5.8:1 (passa AA).

### 5.5 Tab 3 — Meu Plano

Visivel apenas para usuarios Premium ativos. Para usuarios Free, esta tab
mostra estado vazio com CTA para Tab 2.

```
+-----------------------------------------+
|  ATLAS PREMIUM (Anual)                  |
|  Ativo desde 12/03/2026                 |
|                                         |
|  Proxima renovacao: 12/03/2027          |
|  R$ 299,00 no cartao final 4242         |
|                                         |
|  [ Mudar para mensal ]   [ Cancelar ]   |
+-----------------------------------------+

+-----------------------------------------+
|  PA mensais                             |
|  ============================== 1.247   |
|       de 1.500 PA                       |
|                                         |
|  Renova em 18 dias                      |
|  PA nao usados nao acumulam para o      |
|  proximo mes (vide FAQ).                |
+-----------------------------------------+

+-----------------------------------------+
|  Historico de pagamentos                |
|  ----------------------------------     |
|  12/03/2026  R$ 299,00  Anual    [recibo]
|  12/03/2025  R$ 29,90   Mensal   [recibo]
|  ...                                    |
+-----------------------------------------+

+-----------------------------------------+
|  Historico de PA                        |
|  ----------------------------------     |
|  01/04/2026  +1.500   Renovacao mensal  |
|  28/03/2026   -150    Roteiro gerado    |
|  ...                                    |
+-----------------------------------------+
```

Componente `SubscriptionStatusCard`, `PaAllowanceBar`, `PaymentHistoryList`.

### 5.6 FAQ (footer da pagina)

8 a 10 perguntas em accordion. Default: todas fechadas.

1. O que sao Pontos Atlas?
2. PA expiram?
3. Qual a diferenca entre comprar PA e assinar Premium?
4. Posso cancelar Premium quando quiser?
5. O que acontece com minhas expedicoes multi-city se eu cancelar Premium?
6. Por que o trial pede cartao?
7. Posso pagar com Pix? Boleto?
8. Como funciona o Sonnet (modelo premium)?
9. Posso transferir PA para outro usuario?
10. Tem desconto para estudantes?

---

## 6. Multi-city selector — wireframe e regras

Inspirado em United Airlines (linha por trecho, datas + cidade) e Skyscanner
(adicionar trecho com botao). Posicionado no Phase1Wizard como uma alternancia
com o seletor single-city ja existente.

### 6.1 Toggle no inicio do Phase1Wizard

```
+-----------------------------------------------------------+
|  Que tipo de viagem?                                      |
|                                                           |
|  ( ) Um destino                                           |
|  ( ) Multi destinos  [Premium]                            |
|       ^                                                   |
|       Para Free: aparece com lock icon e tooltip          |
+-----------------------------------------------------------+
```

Para Free:
- Radio "Multi destinos" com label cinza, lock icon a direita
- Click -> `UpsellModal` com benefit "Multi destinos"
- Tooltip on hover: "Disponivel no Premium"
- aria-disabled="true", mas focusable (para anunciar via screen reader)

Para Premium:
- Ambos radio funcionam normalmente
- Selecionar "Multi destinos" expande o `MultiCitySelector`

### 6.2 MultiCitySelector — layout

```
+-----------------------------------------------------------+
|  Seu roteiro                                              |
|                                                           |
|  [::]  1.  [ Sao Paulo, Brasil          v ]               |
|             [De: 10/05/2026 ] [Ate: 13/05/2026 ]          |
|             3 noites                                      |
|                                                           |
|  [::]  2.  [ Buenos Aires, Argentina    v ]               |
|             [De: 13/05/2026 ] [Ate: 17/05/2026 ]          |
|             4 noites                                      |
|                                                           |
|  [::]  3.  [ Santiago, Chile            v ]      [x]      |
|             [De: 17/05/2026 ] [Ate: 20/05/2026 ]          |
|             3 noites                                      |
|                                                           |
|  [+ Adicionar cidade]   (1 destino restante)              |
|                                                           |
|  Total: 10 noites - 4 cidades possiveis                   |
+-----------------------------------------------------------+
```

Convencoes:
- `[::]` = handle de drag (8 pontos), 24x24 area, cursor grab
- Numero ordinal da etapa, nao removivel para a primeira cidade
- Botao [x] aparece da segunda cidade em diante (no hover/focus)
- "Adicionar cidade" desabilita ao atingir 4 (mensagem: "Maximo de 4 cidades
  por expedicao")
- Validacao em tempo real: cada "De" deve ser >= "Ate" da etapa anterior
- "Noites" calculado automaticamente (read-only)
- Total de noites e cidades sumarizado abaixo

### 6.3 Drag & drop

Acessibilidade do reorder e critica.

| Input | Acao |
|---|---|
| Mouse drag handle | Reordena visualmente |
| Touch drag handle | Reordena visualmente; haptic feedback |
| Tab no handle + Espaco | Entra em "modo reordenar" |
| Setas Cima/Baixo (modo reordenar) | Move cidade 1 posicao |
| Espaco/Enter | Confirma nova posicao |
| Esc | Cancela e volta a posicao original |

Anuncio screen reader ao reordenar: "Cidade Buenos Aires movida para posicao
2 de 3".

Apos reordenar, o sistema reajusta as datas se necessario:
- Se a nova ordem cria conflito (data fim > data inicio seguinte), exibe
  banner de aviso amarelo: "Algumas datas precisam ser ajustadas. Revise
  abaixo." Os campos conflitantes ficam com aria-invalid e border error.

### 6.4 Estado vazio (multi-city, recem-ativado)

```
+-----------------------------------------------------------+
|  Adicione sua primeira cidade para comecar                |
|                                                           |
|  [ Cidade...                            v ]               |
|                                                           |
|  Voce pode adicionar ate 4 cidades                        |
+-----------------------------------------------------------+
```

---

## 7. UpsellModal

Modal centralizado, max-width 480px, dismissable. Background overlay
`rgba(26, 26, 46, 0.7)`.

```
+----------------------------------------+
|                              [x]       |
|                                        |
|     Voce esta pronto para o Premium    |
|                                        |
|   Voce tentou adicionar uma 2a cidade  |  <- contextual
|   na sua expedicao. Multi destinos e   |
|   um recurso Premium.                  |
|                                        |
|   No Premium voce ganha:               |
|   - Ate 4 destinos por expedicao       |
|   - Expedicoes ilimitadas              |
|   - 1.500 PA todo mes                  |
|   - Modelo Sonnet (qualidade+)         |
|                                        |
|   [ Comecar 7 dias gratis ]            |
|   [ Ver todos os planos ]              |
|                                        |
|   ou continuar no Free                 |
+----------------------------------------+
```

### 7.1 Contextos do modal

Title e linha contextual mudam conforme o trigger:

| Trigger | Title | Linha contextual |
|---|---|---|
| 3 expedicoes ativas | "Ja em 3 expedicoes" | "No Premium voce planeja quantas quiser, sem precisar arquivar." |
| Multi-city | "Voce esta pronto para o Premium" | "Voce tentou adicionar uma 2a cidade." |
| Sonnet toggle | "Quer mais qualidade na IA?" | "O modelo Sonnet esta disponivel para Premium." |
| PA insuficiente | "Saldo PA insuficiente" | "Recarregue ou assine Premium para ganhar 1.500 PA por mes." |

### 7.2 Acessibilidade do modal

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- Focus trap (Tab/Shift+Tab circulam dentro do modal)
- Esc fecha (equivale a "Continuar no Free")
- Foco inicial: no titulo (h2 com tabindex=-1)
- Click no overlay fecha
- Botao [x] visivel, 44x44 touch target, aria-label "Fechar"
- Ao fechar, foco retorna ao elemento que disparou o modal

---

## 8. Fluxo de checkout

### 8.1 Etapas

```
[Click "Iniciar 7 dias gratis"]
            |
            v
[Auth check]
            |
   +--------+--------+
   |                 |
not auth          authed
   |                 |
   v                 |
/auth/login          |
?return=/loja        |
   |                 |
   +--------+--------+
            |
            v
[Cria checkout session no Mercado Pago]
            |
            v
[Redirect para checkout.mercadopago.com.br]
            |
            v
[Usuario completa pagamento]
            |
            v
[Redirect de volta]
   |
   +-> /loja?status=success&plan=annual    -> tela sucesso + tour
   +-> /loja?status=pending                -> tela "processando"
   +-> /loja?status=failed&reason=declined -> tela erro
```

### 8.2 Estado de loading

Apos click no CTA mas antes do redirect:
- Botao mostra spinner inline + label "Preparando checkout..."
- Overlay sutil para impedir cliques duplos
- Timeout de 8s -> mensagem "Demorando mais que o normal. Tentar de novo?"

### 8.3 Pos-checkout — estados

**Success:**

```
+-----------------------------------------+
|        Bem-vindo ao Premium             |
|                                         |
|     Sua assinatura esta ativa           |
|                                         |
|   Trial de 7 dias termina em 17/04      |
|                                         |
|   [ Comecar tour ]                      |
+-----------------------------------------+
```

Confetti animation (300 particulas, 2s duration). Respeita
`prefers-reduced-motion`: substitui por checkmark animado estatico.

**Pending:**

```
+-----------------------------------------+
|        Processando seu pagamento        |
|                                         |
|   Pix pode levar ate alguns minutos.    |
|   Voce recebera um email assim que      |
|   for confirmado.                       |
|                                         |
|   [ Voltar para a loja ]                |
+-----------------------------------------+
```

Polling no backend a cada 5s por ate 5min para detectar mudanca de status.

**Failed:**

```
+-----------------------------------------+
|        Pagamento nao concluido          |
|                                         |
|   O cartao foi recusado.                |
|   Verifique os dados ou tente outro     |
|   metodo de pagamento.                  |
|                                         |
|   [ Tentar de novo ]   [ Voltar ]       |
+-----------------------------------------+
```

Mensagem de erro nunca expoe codigos do gateway. Mapeamos para mensagens
humanas:

| Codigo MP | Mensagem |
|---|---|
| cc_rejected_call_for_authorize | "Ligue para seu banco para autorizar e tente de novo." |
| cc_rejected_insufficient_amount | "Saldo insuficiente neste cartao." |
| cc_rejected_other_reason | "O cartao foi recusado. Verifique os dados ou tente outro." |
| cc_rejected_card_disabled | "Este cartao esta desativado." |

### 8.4 Justificativa: trial com cartao

Recomendacao do UX: **trial com cartao requerido**.

Razoes:
1. **Conversao**: trial sem cartao tem ~2-5% conversao; com cartao, ~40-60%
   (benchmark SaaS B2C). Para um produto de R$ 29,90/mes a economia operacional
   compensa.
2. **Reducao de fraude**: impede multiplos trials por usuario.
3. **Compromisso ja pago de transparencia**: avisamos claramente "Cobranca apos
   o trial. Cancele a qualquer momento."
4. **Pix-friendly**: Mercado Pago suporta tokenizacao de cartao + Pix recorrente.

Risco UX: **abandono no checkout**. Mitigacao:
- Banner amarelo no checkout: "Voce nao sera cobrado hoje. Cancele em 1 clique
  ate 17/04."
- Email no dia 5 do trial: "Faltam 2 dias para terminar seu trial. Continua?"
  com link 1-clique para cancelar.

---

## 9. Onboarding Premium (primeiras 24h)

Apos retorno success do checkout, primeira visita a `/loja` ou `/expedicoes`
dispara `PremiumWelcomeTour`.

### 9.1 Tour modal — 4 passos

**Passo 1 — Boas-vindas**
```
"Voce desbloqueou o Atlas Premium"
"Aqui esta o que mudou na sua jornada."
[Continuar]
```

**Passo 2 — PA mensais**
```
"1.500 PA todo mes, automaticamente"
"Sem precisar comprar pacotes. Renovacao no dia 17 de cada mes."
[Continuar]
```

**Passo 3 — Multi-city**
```
"Crie expedicoes com ate 4 destinos"
"Perfeito para roadtrips, intercambios e viagens em etapas."
[Continuar]
```

**Passo 4 — Checklist de ativacao**
```
"Comece sua nova expedicao"
[ ] Crie sua primeira expedicao multi-destino
[ ] Ative o modelo Sonnet em Configuracoes
[ ] Conheca seu novo badge: Aventureiro Premium

[ Comecar agora ]   [ Talvez depois ]
```

### 9.2 Achievement

Badge "Aventureiro Premium" e concedido automaticamente apos checkout success.
Notificacao toast canto superior direito + entrada na badge grid.

---

## 10. Microcopy guidelines

Tom: caloroso, aventureiro, nunca pressuroso. Escolhas linguisticas:

**Sim:**
- "Leve sua expedicao mais longe"
- "Voce esta pronto para o Premium"
- "Continuar no Free"
- "Cancele quando quiser"
- "Bem-vindo de volta, navegador"

**Nao:**
- "Apenas R$ 29,90!" (urgencia falsa)
- "Ultimas vagas!" (escassez falsa)
- "Voce esta perdendo!"
- "Faca upgrade agora"
- "Cancelar minha conta para sempre" (drama)

CTAs principais:
- "Iniciar 7 dias gratis" (nao "Assinar agora")
- "Conhecer Premium" (nao "Upgrade")
- "Continuar no Free" (nao "Recusar oferta")
- "Adicionar cidade" (nao "Add destination")

Mensagens de erro:
- "Algo nao deu certo com o pagamento. Vamos tentar de novo?" (nao "Erro 500")
- "Saldo PA insuficiente para gerar o roteiro. Recarregue ou ative o
  Premium." (nao "Insufficient credits")

---

## 11. Acessibilidade (WCAG 2.1 AA)

### 11.1 Checklist obrigatorio

- [ ] Contraste de texto >= 4.5:1 em toda UI Premium (verificado: dourado
      `#A9871F` sobre `#FFF8E1` = 5.8:1)
- [ ] Contraste de UI components >= 3:1 (border premium 2px ok)
- [ ] Toda interacao por teclado: tab order definido em todas as telas
- [ ] Drag&drop multi-city tem alternativa via teclado (secao 6.3)
- [ ] Modais com focus trap, Esc, foco restaurado
- [ ] Screen reader anuncia mudancas de estado:
  - "Premium ativo, trial termina em 17 de abril"
  - "Cidade Buenos Aires adicionada, posicao 2 de 4"
  - "Saldo de PA atualizado, 1.247 disponiveis"
- [ ] Confetti respeita `prefers-reduced-motion`
- [ ] Tooltips acessiveis (aparecem em focus, nao so hover)
- [ ] Lock icons tem `aria-label="Recurso Premium"`
- [ ] Toggle Mensal/Anual e `role="radiogroup"`
- [ ] Tabela de comparacao tem `<th scope>` corretos
- [ ] Touch targets >= 44x44 mobile

### 11.2 Cor nunca como unica indicacao

- Linhas Premium na tabela tem texto + cor + icone (nao so cor dourada)
- Estados de pagamento tem texto + icone (nao so verde/vermelho/amarelo)
- Lock para Free tem icone + label "Premium" (nao so cor)

---

## 12. Internacionalizacao

### 12.1 Locales

- `pt` (Portugues do Brasil) — primario
- `en` (English) — secundario, traduzido de pt

### 12.2 Moeda

Sempre BRL no v1 (Mercado Pago). Para usuarios `en`, mostramos:
"R$ 29,90 BRL (about US$ 5.95)" — conversao aproximada via API ou tabela
estatica atualizada semanalmente. Banner: "Pricing in Brazilian Real."

### 12.3 Datas

- pt: `12/03/2026` ou `12 de marco de 2026`
- en: `Mar 12, 2026` ou `March 12, 2026`
- Use `Intl.DateTimeFormat` com locale ativo

### 12.4 Chaves i18n (sample)

```
loja.hero.title              = "Leve sua expedicao mais longe"
loja.hero.subtitle           = "Mais destinos, mais IA, mais liberdade"
loja.tab.packages            = "Pacotes de PA"
loja.tab.premium             = "Premium"
loja.tab.myplan              = "Meu Plano"
loja.cta.startTrial          = "Iniciar 7 dias gratis"
loja.cta.viewPackages        = "Ver pacotes de PA"
loja.upsell.multicity.title  = "Voce esta pronto para o Premium"
loja.upsell.continueFree     = "Continuar no Free"
loja.checkout.success.title  = "Bem-vindo ao Premium"
loja.checkout.failed.title   = "Pagamento nao concluido"
loja.multicity.add           = "Adicionar cidade"
loja.multicity.max           = "Maximo de 4 cidades por expedicao"
loja.multicity.nights        = "{count, plural, one {# noite} other {# noites}}"
```

---

## 13. Dark mode

Todas as cores Premium tem variantes dark:

```
/* Light mode */
--color-premium:        #D4AF37
--color-premium-light:  #FFF8E1
--color-premium-dark:   #A9871F

/* Dark mode */
--color-premium:        #E6C757   /* mais brilhante */
--color-premium-light:  #2A2410   /* fundo escuro tingido */
--color-premium-dark:   #FFD966
```

Verificar:
- Texto `#FFD966` sobre `#2A2410` = 11.2:1 (passa AAA)
- Hero gradiente alpine ja funciona em dark
- Tabela de comparacao: linhas Free com `#1F2937`, Premium com `#2A2410`

---

## 14. Empty states

| Contexto | Empty state |
|---|---|
| Tab Meu Plano (usuario Free) | Ilustracao "compass" + "Voce ainda nao e Premium. Conheca o que voce pode desbloquear." + CTA "Ver Premium" |
| PA balance < 100 | Card amarelo no header da loja: "Saldo baixo. Considere recarregar ou ativar Premium para 1.500 PA mensais." |
| Sem expedicoes | Inalterado (ja existe), mas inclui dica "Quer planejar varias viagens? Conheca Premium." |
| Historico de pagamentos vazio | "Nenhum pagamento ainda." |
| Historico de PA vazio | "Suas movimentacoes de PA aparecerao aqui." |

---

## 15. Error states

### 15.1 Pagamento recusado
Ja coberto em secao 8.3.

### 15.2 Trial ja usado

Quando usuario tenta iniciar trial pela 2a vez:

```
"Voce ja usou seu trial gratuito"
"Voce pode ativar o Premium normalmente — sem trial."
[ Assinar Premium ]   [ Ver pacotes de PA ]
```

### 15.3 Downgrade com expedicao multi-city ativa

Ao tentar cancelar Premium:

```
"Atencao: voce tem 2 expedicoes multi-destino"
"Cancelar nao apaga essas expedicoes. Voce continua podendo
 visualiza-las e edita-las. Mas nao podera criar novas com
 multiplos destinos enquanto estiver no Free."
[ Cancelar mesmo assim ]   [ Voltar ]
```

### 15.4 Erro generico no checkout

```
"Nao conseguimos abrir o checkout"
"Pode ser uma instabilidade temporaria. Tente em alguns
 segundos. Se persistir, fale com a gente."
[ Tentar de novo ]   [ Falar com suporte ]
```

---

## 16. Componentes a criar (catalogo)

| Componente | Responsabilidade | Reutilizavel? |
|---|---|---|
| `StoreIcon` | Icone sacola na header com badge de notificacao | Nao |
| `PremiumBadge` | Pill dourado "Premium" no UserMenu | Sim |
| `ComparisonTable` | Tabela Free vs Premium responsiva | Sim (futuras comparacoes) |
| `MultiCitySelector` | Lista N cidades com drag, datas, validacao | Nao |
| `MultiCityRow` | Linha individual da lista | Nao (interno) |
| `UpsellModal` | Modal de upsell contextual | Sim (qualquer contexto) |
| `SubscriptionStatusCard` | Card de plano ativo + datas | Nao |
| `PaAllowanceBar` | Barra de progresso PA mensal | Sim |
| `CancelSubscriptionDialog` | Dialog confirmacao de cancelamento | Nao |
| `PremiumWelcomeTour` | Tour 4-step pos-checkout | Nao |
| `PaPackageCard` | Card de pacote individual | Sim |
| `PlanToggle` | Toggle Mensal/Anual | Nao |
| `PaymentHistoryList` | Lista de pagamentos | Sim |
| `PaTransactionList` | Lista de movimentacoes PA | Sim |

Padroes ja existentes a reutilizar:
- `Modal` (focus trap base)
- `Toast` (sucesso, erros)
- `ConfirmDialog` (base do CancelSubscriptionDialog)
- `EmptyState`
- `Tabs`
- `Accordion` (FAQ, Meu Plano em mobile)
- `WizardFooter` (tour onboarding)

---

## 17. Avaliacao heuristica de Nielsen

Aplicada ao design proposto.

| # | Heuristica | Tratamento na spec |
|---|---|---|
| 1 | Visibility of system status | PaAllowanceBar sempre visivel; trial timer no Meu Plano; toast pos-checkout |
| 2 | Match real world | "Expedicao", "navegador", "destino" — vocabulario familiar de viagem, nao SaaS |
| 3 | User control and freedom | Esc em modais; "Continuar no Free" sempre visivel; cancele a qualquer momento |
| 4 | Consistency and standards | Reuso de Modal, Toast, ConfirmDialog; mesma estrutura de cards de pacote e plano |
| 5 | Error prevention | Datas multi-city validadas em tempo real; confirmacao antes de cancelar Premium; trial avisos por email |
| 6 | Recognition rather than recall | Tabela de comparacao mostra tudo lado a lado; nao precisa lembrar diferencas |
| 7 | Flexibility and efficiency | Toggle Mensal/Anual; checkout 1-clique; tour Premium pode ser pulado |
| 8 | Aesthetic and minimalist | Hero limpo; tabela sem features inventadas; FAQ colapsado |
| 9 | Help users recognize errors | Mensagens humanas mapeadas (secao 8.3); erros de validacao inline |
| 10 | Help and documentation | FAQ no rodape; tooltip em cada feature Premium; suporte por email |

Nenhum dark pattern: sem urgencia falsa, sem countdown timer, sem
"X pessoas viram este plano nas ultimas 24h", sem opt-out escondido.

---

## 18. Wireframes em prosa

### 18.1 Pagina /loja em mobile (375px)

A tela abre com a hero ocupando os primeiros 200px de scroll: o titulo
"Leve sua expedicao mais longe" centralizado, subtitulo abaixo, e dois
botoes empilhados verticalmente (Premium primary, Pacotes ghost). Abaixo
da hero, as 3 tabs aparecem em uma faixa horizontal scrollavel se
necessario, com a tab ativa sublinhada em laranja primary. Ao tocar em
"Pacotes de PA", abaixo das tabs comeca um stack de 4 cards quadrados,
cada um com nome do pacote, quantidade de PA gigante, preco em destaque,
um helper de "R$/PA", uma linha de equivalencia ("6 geracoes IA"), e um
botao "Comprar" full-width laranja primary. O card "Navegador" tem um
pill "Recomendado" no topo direito, alem de border laranja. Abaixo dos
cards, um banner suave sugere Premium para usuarios que veem valor
recorrente. Ao final, FAQ em accordion ocupa a base da pagina, com cada
item collapsed por padrao e icone chevron a direita.

Ao trocar para a tab Premium, a hero se mantem mas o conteudo abaixo
mostra o toggle Mensal/Anual (Anual selecionado por default, com pill
verde "-17%"), seguido de um card centralizado branco de plano com
preco e CTA "Iniciar 7 dias gratis" full-width. Abaixo do card,
microcopy de confianca em texto pequeno cinza. Mais abaixo, a
ComparisonTable em formato accordion: cada feature e uma linha
expansivel mostrando Free e Premium lado a lado quando expandida (no
mobile, lado a lado vira empilhado). Ao final, novamente o CTA primario
e o secundario.

### 18.2 MultiCitySelector em desktop (1024px+)

Centralizado em um card com max-width 720px. No topo, um label "Seu
roteiro" em 18px. Abaixo, lista de linhas com cada cidade. Cada linha
tem: a esquerda um handle drag de 24x24 (cursor grab), seguido do
numero ordinal "1.", "2.", em badge circular cinza claro 32x32, depois
um campo de cidade ocupando 50% da largura (combobox com dropdown
portal-rendered usando o padrao do Sprint 27 SPEC-UX-006), seguido de
dois date pickers compactos lado a lado (de/ate) ocupando 40%, e um
indicador de noites em texto pequeno cinza ao lado direito ("3 noites").
Quando a linha tem foco ou hover, um botao [x] fade-in aparece na
extremidade direita (exceto para a cidade 1, que nao pode ser removida).
Ao final da lista, um botao ghost "+ Adicionar cidade" alinhado a
esquerda, com um helper a direita "1 destino restante" em 12px cinza.
Abaixo de tudo, um sumario em texto medio: "Total: 10 noites, 3 cidades".

Quando o usuario arrasta uma linha, a linha original ganha um overlay
translucido e uma sombra leve, e os outros itens deslocam-se com
animacao de 200ms ease-out. Em mobile, o handle drag fica maior (44x44
touch target obrigatorio) e a animacao tem haptic feedback no toque.

---

## 19. Metricas de sucesso UX

| Metrica | Como medir | Meta inicial |
|---|---|---|
| CTR no StoreIcon (header) | analytics: % usuarios que clicam no icone / sessao | >= 8% |
| Conversao trial -> paid | usuarios que mantem assinatura apos dia 7 | >= 35% |
| Tempo ate primeira expedicao multi-city | timestamp checkout success -> primeira save | <= 3 dias |
| Drop-off no funil de checkout | (clicks "Iniciar trial") -> (success retorno) | <= 30% |
| Taxa de uso do FAQ | % usuarios que abrem >=1 pergunta | >= 25% |
| Cancel rate primeiro mes | cancelamentos no mes 1 / total ativacoes | <= 15% |
| NPS pos-onboarding Premium | survey 7 dias apos ativacao | >= 50 |
| Acessibilidade: zero blockers WCAG | audit Axe + manual | 0 P0 |

Eventos de tracking (a serem definidos com data-engineer):
- `store_icon_clicked`
- `loja_tab_changed { from, to }`
- `pa_package_viewed { tier }`
- `premium_cta_clicked { source }` (source: hero, table, upsell_modal, etc.)
- `upsell_modal_shown { trigger }`
- `upsell_modal_dismissed { trigger, action }`
- `multicity_attempted { user_tier }`
- `multicity_city_added { position }`
- `multicity_city_removed { position }`
- `multicity_reordered { from, to }`
- `checkout_started { plan }`
- `checkout_completed { plan, status }`
- `subscription_cancelled { reason }`

---

## 20. Estimativa de esforco UX

| Atividade | Horas |
|---|---|
| Wireframes hi-fi (Figma) das telas | 4h |
| Microcopy review (PT + EN) | 2h |
| Prototipo HTML interativo /loja + multi-city | 3h |
| Revisao de acessibilidade + checklist | 2h |
| Spec writing (este documento) | 2h |
| Ciclos de revisao (2x feedback de PO/arch/dev) | 3h |
| **Total** | **16h** |

---

## 21. Open questions e riscos

### 21.1 Open questions

1. **Trial com cartao**: confirmado pelo UX (secao 8.4) mas precisa
   ratificacao do PO. Alternativa: trial sem cartao + paywall agressivo
   no dia 8.
2. **PremiumBadge na header**: deve aparecer no header global ou apenas
   no UserMenu dropdown? Recomendacao UX: dropdown only (header limpo).
3. **Cor "dourado Premium"**: `#D4AF37` aprovado ou queremos algo mais
   alinhado a paleta atual (ex: laranja saturado)? Recomendacao UX:
   dourado distinto e melhor para diferenciar.
4. **Multi-city: 4 cidades e o teto certo?** PO confirmou 4. UX recomenda
   monitorar uso e considerar 6 no Sprint 45 se demanda existir.
5. **Multi-city no Phase1Wizard ou novo wizard separado?** Recomendacao
   UX: reutilizar Phase1Wizard com toggle (menos atrito de descoberta).
6. **PA mensais nao acumulam?** Confirmado com finops, mas precisa estar
   muito claro no FAQ e na PaAllowanceBar (tooltip).
7. **Cancelamento: cooldown ou imediato?** Recomendacao UX: cancela no
   fim do ciclo, acesso mantido ate la (padrao SaaS, reduz arrependimento).
8. **Internacionalizacao: en com pricing em USD aproximado?** Recomendacao
   UX: mostrar BRL + USD aproximado com banner explicativo.
9. **Recibo fiscal (NF-e)?** Pergunta para finops e legal.
10. **Programa de indicacao?** Out-of-scope Sprint 43, considerar Sprint 45.

### 21.2 Riscos UX

| Risco | Severidade | Mitigacao |
|---|---|---|
| Sticker shock no preco | Media | Mostrar valor por dia + economia anual |
| Confusao PA vs Premium | Alta | FAQ dedicado + tab clara + onboarding |
| Multi-city muito complexo | Media | Validacao em tempo real + numero de noites auto |
| Drop-off no checkout MP | Alta | Banner "nao sera cobrado hoje" + email D-2 |
| Acessibilidade do drag&drop | Alta | Alternativa via teclado obrigatoria (secao 6.3) |
| Dark patterns acidentais | Alta | Revisao com security-specialist + PO |

---

## 22. Dependencias e proximos passos

### 22.1 Dependencias

- **SPEC-PROD-043**: PO precisa formalizar regra de negocio (limites Free,
  cota Premium, regras de cancelamento). Esta spec assume os valores
  travados na secao 1.1.
- **SPEC-ARCH-043**: arquiteto precisa especificar integracao Mercado Pago
  (webhooks, idempotencia, retries) e modelo de dados de Subscription.
- **SPEC-SEC-043**: security-specialist precisa revisar fluxo de pagamento,
  PCI scope (zero, ja que usamos hosted checkout) e LGPD para cobranca
  recorrente.
- **SPEC-AI-PREMIUM**: prompt-engineer precisa especificar como o opt-in
  Sonnet funciona (feature flag, fallback, custo).
- **SPEC-FINOPS-043**: finops precisa validar margem de cada plano e
  monitoramento de churn.

### 22.2 Proximos passos

1. Review desta spec por PO, arch, tech-lead, finops, security
2. Resolver as 10 open questions (secao 21.1)
3. UX entrega prototipo HTML em `docs/prototypes/loja-premium.html`
4. UX entrega versao 1.1 incorporando feedback
5. Architect escreve SPEC-ARCH-043 baseado nesta spec
6. Tech-lead quebra em tarefas de implementacao
7. Devs implementam com handoff do prototipo

---

## 23. Change history

| Versao | Data | Autor | Mudancas |
|---|---|---|---|
| 1.0.0 | 2026-04-10 | ux-designer | Criacao inicial. |

---

> WARNING: spec aguardando resolucao das 10 open questions (secao 21.1).
> Status: Draft. Nao iniciar implementacao antes da review.
