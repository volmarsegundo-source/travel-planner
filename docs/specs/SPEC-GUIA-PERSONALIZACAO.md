---
spec_id: SPEC-GUIA-PERSONALIZACAO
title: "Personalizacao do Guia do Destino — Phase 5 (Categorias + Notas Pessoais)"
version: 1.0.0
status: Draft
sprint: 41
owner: product-owner
reviewers: [tech-lead, ux-designer, architect, prompt-engineer, finops-engineer]
created: 2026-03-30
updated: 2026-03-30
moscow: Should Have
effort: M
personas: [leisure-solo, leisure-family, bleisure, business-traveler]
gamification_reference: docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md
parent_specs: [SPEC-PROD-055, SPEC-GUIA-DESTINO-CONTEUDO, SPEC-PROD-PHASE5-REDESIGN]
---

# SPEC-GUIA-PERSONALIZACAO: Personalizacao do Guia do Destino

> Este documento define a funcionalidade de personalizacao pos-geracao do Guia do Destino
> (Phase 5). Ele complementa SPEC-PROD-055 (geracao manual) e SPEC-GUIA-DESTINO-CONTEUDO
> (contrato de conteudo). Em caso de conflito com specs pai sobre o comportamento de geracao,
> PA, ou conteudo, escalar ao PO antes de implementar.

---

## 1. Declaracao do Problema

O viajante que gera o Guia do Destino recebe um guia calibrado com base nos dados de perfil das
Phases 1-2 (destino, datas, estilo de viagem, interesses). Porem, ha dois problemas recorrentes
identificados nos testes de aceitacao:

**Problema 1 — O perfil nao captura interesses pontuais**
As 8 categorias de preferencias da Phase 2 (US-123) cobrem o perfil de viagem geral do usuario.
Elas nao cobrem interesses especificos de uma viagem concreta. Um usuario que em geral nao marca
"nightlife" pode querer explorar vida noturna especificamente em Amsterdam. A personalizacao
baseada somente no perfil permanente subestima o contexto da viagem individual.

**Problema 2 — O viajante nao tem voz apos a geracao inicial**
Apos o guia ser gerado, o unico recurso do viajante e "Regenerar Guia" — o que custa 50 PA e
substitui todo o conteudo. Nao ha como refinar o guia com um interesse adicional sem incorrer
no mesmo custo de uma geracao completa. Isso e economicamente injusto e frustrante: o viajante
quer um ajuste, nao uma substituicao.

---

## 2. User Story

As a @leisure-solo who has already generated their destination guide,
I want to select specific interest categories and add personal notes to refine my guide,
so that the AI regenerates a guide that better reflects what I actually care about for this
specific trip — without losing the base quality of the original guide.

### Contexto do Viajante

- **Pain point**: O guia gerado e bom, mas o viajante percebe que ele nao menciona praias ou
  vida noturna — porque esses interesses nao estao no seu perfil permanente mas fazem sentido
  para esta viagem especifica. Ele nao quer pagar 50 PA por uma regeneracao total apenas para
  adicionar um topico.
- **Workaround atual**: O viajante regenera o guia completo (50 PA) e espera que o novo prompt
  produza a informacao desejada — sem garantia de resultado. Ou abandona o guia e busca a
  informacao no Google separadamente, saindo do produto.
- **Frequencia**: Estimativa de 40-60% dos usuarios que geram um guia tentarao, em algum
  momento, ajustar o foco do conteudo. A ausencia de um mecanismo de refinamento e uma lacuna
  de produto de alta frequencia.

---

## 3. Categorias de Personalizacao

O viajante pode selecionar uma ou mais categorias de interesse adicionais. Estas categorias sao
distintas das 8 categorias de perfil permanente (US-123) — elas sao contextuais para a viagem
atual e nao alteram o perfil do usuario.

| # | Chave (key) | Rotulo PT-BR | Rotulo EN |
|---|-------------|--------------|-----------|
| 1 | `festivals_events` | Festas e Eventos | Festivals & Events |
| 2 | `nightlife_clubs` | Casas Noturnas / Vida Noturna | Nightlife & Clubs |
| 3 | `beaches` | Praias | Beaches |
| 4 | `shows_entertainment` | Shows e Espetaculos | Shows & Entertainment |
| 5 | `recommended_restaurants` | Restaurantes Indicados | Recommended Restaurants |
| 6 | `shopping_markets` | Compras / Mercados | Shopping & Markets |
| 7 | `museums_galleries` | Museus e Galerias | Museums & Galleries |
| 8 | `parks_nature` | Parques e Natureza | Parks & Nature |
| 9 | `local_experiences` | Experiencias Locais | Local Experiences |

**Nota de produto**: As categorias com sobreposicao ao perfil permanente (ex: `beaches` e
`museums_galleries`) nao conflitam com as preferencias de US-123 — elas complementam. Um
usuario que nao selecionou `beaches` no perfil permanente pode seleciona-la aqui para uma
viagem ao Rio de Janeiro sem alterar seu perfil global.

---

## 4. Comportamento Especificado

### 4.1 Ponto de entrada — secao "Personalizar Guia"

A secao de personalizacao e exibida SOMENTE quando o guia ja foi gerado (estado de conteudo
em cache ou apos geracao bem-sucedida). Ela NAO e exibida no estado vazio (antes da primeira
geracao) — o viajante precisa primeiro ver o guia antes de poder refina-lo.

A secao fica posicionada abaixo do conteudo completo do guia e antes do footer de navegacao
do wizard (WizardFooter). Em viewport desktop, ela ocupa a largura total da coluna de conteudo.
Em viewport mobile, ela respeita o padding lateral padrao do wizard.

### 4.2 Composicao da secao

A secao "Personalizar Guia" contem tres elementos visuais em ordem vertical:

**Elemento 1: Titulo da secao**
Texto: "Personalizar Guia"
Estilo: heading nivel 3, usando o token de tipografia `atlas-label-large`, cor `atlas-primary`.

**Elemento 2: Seletor de categorias (chip multi-selecao)**
- As 9 categorias exibidas como chips horizontais com scroll em mobile.
- Em desktop: chips em linha com quebra automatica (flex-wrap).
- Estado padrao: chip nao selecionado — fundo `atlas-surface-variant`,
  texto `atlas-on-surface-variant`, borda `atlas-outline-variant`.
- Estado selecionado: chip selecionado — fundo `atlas-secondary-container`,
  texto `atlas-on-secondary-container` (cor primaria do tema), borda transparente.
- O mesmo chip pode ser alternado entre selecionado e nao selecionado com um clique.
- Multiplos chips podem estar selecionados simultaneamente.
- Chips selecionados sao persistidos ao banco de dados imediatamente apos a regeneracao
  bem-sucedida (ver BR-004).

**Elemento 3: Area de texto "Notas pessoais"**
- Campo de texto livre, maximo 500 caracteres.
- Placeholder: "Adicione notas pessoais para o AI... (ex: quero evitar lugares muito
  turisticos, tenho alergia a frutos do mar, viajo com bebe)"
- Contador de caracteres regressivo exibido abaixo do campo (ex: "423/500").
- O campo aceita qualquer texto em qualquer idioma.

**Elemento 4: Botao de acao**
- Label: "Re-gerar Guia (-50 PA)"
- Estilo: AtlasButton variante primaria — fundo `atlas-secondary-container` (#fe932c),
  texto `atlas-primary` (#040d1b).
- Estado habilitado: pelo menos um chip esta selecionado OU o campo de notas pessoais
  tem pelo menos 1 caractere.
- Estado desabilitado: nenhum chip selecionado E campo de notas esta vazio.
- Estado desabilitado por saldo insuficiente: o usuario tem `availablePoints` < 50 PA.
  Neste caso o label muda para "PA insuficientes" e um link "Comprar Pontos Atlas" e
  exibido abaixo do botao.

### 4.3 Fluxo de regeneracao

1. O usuario seleciona uma ou mais categorias e/ou preenche notas pessoais.
2. O usuario clica em "Re-gerar Guia (-50 PA)".
3. O sistema verifica `availablePoints >= 50` no servidor.
4. Se saldo insuficiente: exibe mensagem de erro inline, botao retorna ao estado
   "PA insuficientes". Nenhuma chamada de IA e iniciada.
5. Se saldo suficiente: o conteudo atual do guia e substituido por um skeleton loader
   (mesma estrutura bento-grid do estado de geracao inicial, definida em
   SPEC-PROD-PHASE5-REDESIGN).
6. Uma chamada de IA e iniciada com o prompt enriquecido (ver Secao 5).
7. Ao receber resposta bem-sucedida: o skeleton e substituido pelo novo conteudo do guia.
   O PA e debitado (50 PA). Uma notificacao inline confirma: "Guia atualizado! -50 PA".
   As categorias selecionadas e as notas sao persistidas.
8. Ao receber erro: o skeleton e substituido pelo conteudo ANTERIOR do guia (o conteudo
   nao e perdido). Mensagem de erro: "Nao foi possivel atualizar o guia. Tente novamente."
   Nenhum PA debitado.

### 4.4 Estado apos regeneracao

- Os chips que estavam selecionados permanecem selecionados (nao sao resetados apos
  regeneracao bem-sucedida).
- O campo de notas pessoais mantem o conteudo inserido.
- O botao "Re-gerar Guia" fica habilitado novamente (o usuario pode refinar mais vezes,
  sujeito ao limite BR-003).
- O guia exibido e o novo conteudo gerado, nao o conteudo anterior.

---

## 5. Instrucoes para o Prompt de IA

Esta secao define OS DADOS que devem ser passados ao prompt de IA quando o usuario usa a
personalizacao. A estrutura exata do prompt (template, tokens, instrucoes de sistema) e
responsabilidade do prompt-engineer; esta spec define os INSUMOS que o produto deve fornecer.

### 5.1 Dados adicionais que o prompt de personalizacao deve receber

Alem dos dados ja usados na geracao inicial (destino, datas, perfil Phase 2), o prompt de
regeneracao deve receber:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `extraCategories` | `string[]` | Lista dos `key` values das categorias selecionadas (ex: `["beaches", "nightlife_clubs"]`). Array vazio se nenhuma categoria selecionada. |
| `personalNotes` | `string` | Texto livre inserido pelo usuario. String vazia se nao preenchido. |

### 5.2 Instrucao de sistema recomendada (insumo para o prompt-engineer)

A instrucao de sistema deve incluir a seguinte logica condicional, que o prompt-engineer
deve traduzir em linguagem eficiente para o modelo de IA escolhido:

- Se `extraCategories` nao esta vazio: "Priorize conteudo sobre os seguintes topicos
  no guia: {lista de rotulos das categorias selecionadas}. Expanda as secoes relevantes
  para incluir informacoes especificas sobre estes topicos para o destino."
- Se `personalNotes` nao esta vazio: "O viajante adicionou as seguintes notas pessoais
  que devem influenciar o conteudo do guia: {notas}. Adapte recomendacoes e dicas de
  acordo com estas preferencias."
- Os dados de perfil permanente das Phases 1-2 continuam sendo utilizados — a
  personalizacao e cumulativa, nao substitutiva.

### 5.3 Garantia de qualidade do conteudo

O contrato de conteudo definido em SPEC-GUIA-DESTINO-CONTEUDO continua sendo valido apos
a regeneracao. Um guia re-gerado deve continuar atendendo todos os criterios de qualidade
daquele spec: secoes obrigatorias presentes, valores em BRL, nivel de seguranca explicito, etc.
A personalizacao adiciona enfase, nao remove estrutura.

---

## 6. Criterios de Aceite

- [ ] AC-001: Dado que o usuario esta em Phase 5 e o guia ainda NAO foi gerado (estado
  vazio), quando a fase renderiza, entao a secao "Personalizar Guia" NAO e exibida — ela
  e visivel apenas apos a existencia de conteudo de guia para o tripId.

- [ ] AC-002: Dado que o usuario esta em Phase 5 com guia ja gerado, quando a fase renderiza,
  entao a secao "Personalizar Guia" e exibida abaixo do conteudo do guia com os 9 chips de
  categoria, o campo de notas pessoais, e o botao "Re-gerar Guia (-50 PA)" todos visiveis.

- [ ] AC-003: Dado a secao "Personalizar Guia" renderizada, quando o usuario clica em um chip
  de categoria nao selecionado, entao o chip muda para o estado selecionado (fundo
  `atlas-secondary-container`) imediatamente sem delay perceptivel.

- [ ] AC-004: Dado um chip de categoria no estado selecionado, quando o usuario clica nele
  novamente, entao o chip retorna ao estado nao selecionado — o comportamento de alternancia
  e idempotente.

- [ ] AC-005: Dado que nenhum chip esta selecionado E o campo de notas pessoais esta vazio,
  quando a secao renderiza ou o usuario limpa todos os chips e apaga todas as notas, entao o
  botao "Re-gerar Guia (-50 PA)" esta no estado desabilitado e nao e clicavel.

- [ ] AC-006: Dado que pelo menos um chip esta selecionado OU o campo de notas pessoais tem
  pelo menos 1 caractere, quando o estado e verificado, entao o botao "Re-gerar Guia (-50 PA)"
  esta habilitado e clicavel (assumindo saldo >= 50 PA).

- [ ] AC-007: Dado que o usuario clica em "Re-gerar Guia (-50 PA)" com saldo de
  `availablePoints` >= 50, quando a regeneracao e iniciada, entao o conteudo do guia e
  substituido por um skeleton loader com a estrutura bento-grid e uma mensagem de status
  "Atualizando seu guia para [destino]..." e exibida.

- [ ] AC-008: Dado que a regeneracao de guia foi concluida com sucesso, quando o novo conteudo
  e exibido, entao: (a) exatamente 50 PA sao debitados do `availablePoints` do usuario, (b)
  uma notificacao inline "Guia atualizado! -50 PA" e exibida, (c) os chips selecionados
  permanecem no estado selecionado, e (d) o conteudo do campo de notas pessoais e preservado.

- [ ] AC-009: Dado que a regeneracao falhou (timeout ou erro do provedor de IA), quando o
  erro e tratado, entao: (a) o conteudo ANTERIOR do guia e restaurado (nao ha perda de
  conteudo), (b) a mensagem "Nao foi possivel atualizar o guia. Tente novamente." e exibida,
  e (c) nenhum PA e debitado.

- [ ] AC-010: Dado que o usuario ja realizou 5 regeneracoes para a expedicao atual (limite de
  BR-003), quando a secao "Personalizar Guia" renderiza, entao o botao "Re-gerar Guia" esta
  desabilitado com o label "Limite atingido (5/5)" e uma mensagem explicativa e exibida:
  "Voce atingiu o limite de regeneracoes para este guia."

- [ ] AC-011: Dado que o usuario esta em Phase 5 com guia gerado e `availablePoints` < 50,
  quando a secao "Personalizar Guia" renderiza, entao o botao exibe o label "PA insuficientes",
  esta desabilitado, e um link "Comprar Pontos Atlas" esta visivel imediatamente abaixo do
  botao.

- [ ] AC-012: Dado que o campo de notas pessoais esta visivel, quando o usuario digita mais de
  500 caracteres, entao o campo rejeita entrada alem do limite (ou trunca a entrada ao limite
  de 500 chars) e o contador exibe "500/500" sem permitir ultrapassar o limite.

- [ ] AC-013: Dado o produto em qualquer idioma suportado (pt-BR ou en), quando a secao
  "Personalizar Guia" renderiza, entao todos os rotulos de chips, placeholder do campo de
  notas, label do botao, e mensagens de estado usam o idioma correto conforme o locale ativo
  (chaves i18n em `messages/pt-BR.json` e `messages/en.json`).

- [ ] AC-014: Dado que o usuario esta em Phase 5 com guia gerado, quando `availablePoints` e
  verificado antes de habilitar o botao, entao a verificacao ocorre no servidor (nao apenas
  no cliente), impedindo que um usuario com saldo insuficiente inicie uma chamada de IA
  via manipulacao de estado do cliente.

---

## 7. Escopo

### Em Escopo

- Secao "Personalizar Guia" exibida abaixo do conteudo do guia em Phase 5.
- Seletor de 9 chips de categoria (multi-selecao, alternancia individual).
- Campo de texto "Notas pessoais" com limite de 500 caracteres e contador regressivo.
- Botao "Re-gerar Guia (-50 PA)" com regras de habilitacao/desabilitacao.
- Fluxo de regeneracao com skeleton loader, debito de PA somente apos sucesso.
- Preservacao do conteudo anterior em caso de falha.
- Persistencia das categorias selecionadas em `DestinationGuide.metadata` apos regeneracao.
- Limite de 5 regeneracoes por expedicao.
- Verificacao de saldo no servidor antes de iniciar a geracao.
- Estados de erro com mensagens claras e sem exposicao de detalhes tecnicos.
- Suporte a pt-BR e en (chaves i18n).

### Fora de Escopo (v1)

- Persistencia das categorias selecionadas e notas entre sessoes ANTES da regeneracao (elas
  so sao salvas apos regeneracao bem-sucedida).
- Personalizacao por secao individual do guia (ex: "adicionar praias apenas na secao
  mustSee") — a personalizacao e aplicada ao guia inteiro.
- Historico de versoes do guia (ver guia anterior apos regeneracao) — deferred para v2.
- Categorias customizadas criadas pelo usuario (alem das 9 predefinidas) — deferred.
- Notificacoes por email sobre regeneracao.
- Aplicacao das categorias selecionadas ao roteiro (Phase 6) — cada fase tem seu proprio
  mecanismo de personalizacao.

---

## 8. Regras de Negocio

| # | Regra | Detalhes |
|---|-------|----------|
| BR-001 | Custo de regeneracao: 50 PA | Re-gerar o guia via personalizacao custa o mesmo 50 PA definido para geracao inicial em SPEC-PROD-055. Nao ha desconto por uso de personalizacao. |
| BR-002 | PA debitado somente apos sucesso | O debito de 50 PA ocorre exclusivamente apos confirmacao de resposta completa e bem-sucedida do provedor de IA. Falhas nao geram debito — incluindo falhas que ocorram apos o inicio da geracao. |
| BR-003 | Limite de 5 regeneracoes por expedicao | O total de regeneracoes (via botao "Regenerar Guia" do SPEC-PROD-055 + via "Re-gerar Guia" desta spec) e contabilizado em conjunto. O limite de 5 e por expedicao (tripId), nao por usuario. Ao atingir o limite, o botao fica desabilitado com mensagem explicativa. |
| BR-004 | Persistencia das categorias apos regeneracao | As chaves das categorias selecionadas no momento da regeneracao bem-sucedida sao armazenadas em `DestinationGuide.metadata.selectedCategories` (array de strings). As notas pessoais sao armazenadas em `DestinationGuide.metadata.personalNotes`. Esses dados sao usados para pre-selecionar os chips na proxima visita do usuario. |
| BR-005 | Notas pessoais incluidas no prompt de IA | O texto do campo "Notas pessoais" e incluido no prompt de IA enviado ao provedor. O prompt-engineer e responsavel por formatar e sanitizar este texto antes da inclusao no prompt (prevencao de prompt injection). |
| BR-006 | Categorias adicionam enfase, nao substituem o conteudo base | As categorias selecionadas instruem o AI a priorizar e expandir topicos especificos. Elas nao eliminam o conteudo base do guia definido em SPEC-GUIA-DESTINO-CONTEUDO. Um guia re-gerado com "Praias" selecionado deve ainda conter todas as secoes obrigatorias (quickFacts, safety, etc.). |

---

## 9. Restricoes

### Seguranca

- A verificacao de `availablePoints >= 50` deve ocorrer no servidor, nunca exclusivamente
  no cliente. O usuario nao pode contornar a verificacao de saldo via manipulacao de estado
  do cliente.
- O `tripId` da regeneracao deve ser validado contra o `userId` da sessao autenticada (BOLA
  guard). Um usuario nao pode personalizar ou re-gerar o guia de outro usuario.
- O conteudo do campo "Notas pessoais" deve ser sanitizado antes de ser incluido no prompt
  de IA (responsabilidade do prompt-engineer) para prevencao de prompt injection. A spec
  define que o campo aceita texto livre — a implementacao deve garantir que este texto
  nao possa manipular as instrucoes do sistema de IA.
- O metadata de categorias selecionadas nao deve expor dados de outros usuarios nem ser
  acessivel via API sem autenticacao.

### Acessibilidade

- Cada chip de categoria deve ter um `aria-label` descritivo e um `aria-pressed` que
  reflita o estado selecionado/nao selecionado em tempo real.
- O botao "Re-gerar Guia" no estado desabilitado deve comunicar o motivo via
  `aria-describedby` apontando para um elemento de texto explicativo (saldo insuficiente
  OU limite atingido OU nenhuma selecao feita).
- O campo de notas pessoais deve ter `aria-label` e o contador de caracteres deve ser
  uma `aria-live` region para que leitores de tela anunciem a contagem a medida que
  o usuario digita.
- O estado de loading (skeleton) deve anunciar via `aria-live` region que o guia esta
  sendo atualizado.
- O estado de erro deve mover o foco para o elemento de erro (ou para o container de
  mensagem) para usuarios de teclado e leitores de tela.
- WCAG 2.1 AA: contraste de todos os estados de chip (selecionado e nao selecionado) deve
  passar auditoria axe-core sem violacoes.

### Performance

- A secao "Personalizar Guia" deve renderizar em < 200ms apos o conteudo do guia estar
  visivel — ela nao deve bloquear a exibicao do guia.
- A verificacao de saldo de PA para habilitar/desabilitar o botao pode ocorrer com
  latencia de ate 500ms (dado que o saldo ja esta carregado no contexto da fase), mas
  nao deve causar layout shift visivel.
- A selecao de chips deve ser instantanea (< 100ms de resposta visual) — e uma operacao
  puramente de estado do cliente, sem chamadas de rede.

### Integridade da Economia PA

- O finops-engineer deve validar os ACs de debito (AC-008 e AC-009) antes do merge.
- O limite de 5 regeneracoes (BR-003) e uma restricao de negocio para proteger a economia
  de PA e os custos de IA. Qualquer alteracao neste limite requer aprovacao do PO e
  do finops-engineer.

---

## 10. Metricas de Sucesso

| Metrica | Meta |
|---------|------|
| Taxa de uso da secao de personalizacao | >= 30% dos usuarios que geram um guia utilizam pelo menos uma vez |
| Taxa de abandono apos personalizacao | < 10% dos usuarios que clicam em "Re-gerar Guia" abandonam a fase antes de ver o resultado |
| Debitos de PA em regeneracoes com falha | 0 (zero tolerancia) |
| Satisfacao qualitativa com o guia | Reducao de feedbacks negativos sobre guia generico em sessoes de teste apos deploy |
| Categorias mais utilizadas | Dado coletado em analytics para informar expansao de categorias em v2 |

---

## 11. Dependencias

| Dependencia | Status | Notas |
|---|---|---|
| SPEC-PROD-055 (Geracao Manual) | Aprovado | Esta spec extende o comportamento de regeneracao definido em SPEC-PROD-055. O botao "Re-gerar Guia" desta spec e uma extensao do botao "Regenerar Guia" do SPEC-PROD-055, com inputs adicionais. |
| SPEC-GUIA-DESTINO-CONTEUDO | Draft — Sprint 40 | O contrato de conteudo do guia e valido apos regeneracoes de personalizacao. |
| SPEC-PROD-PHASE5-REDESIGN | Draft — Sprint 40 | O skeleton loader e o layout da secao de personalizacao usam os tokens e componentes definidos naquele spec. |
| ATLAS-GAMIFICACAO-APROVADO.md v1.1.0 | Aprovado | Fonte autoritativa para o valor de 50 PA. |
| DestinationGuide model (DB) | Implementado | O campo `metadata` (JSON) deve ser capaz de persistir `selectedCategories` e `personalNotes`. Verificar se o modelo atual suporta ou se e necessario adicionar campos dedicados. |
| prompt-engineer | Colaboracao necessaria | Deve receber os insumos de Secao 5 desta spec e traduzir em prompt template para o modelo de IA. |

---

## 12. Vendor Independence

Esta spec define O QUE o usuario ve e O QUE acontece no negocio — nao COMO e implementado.
Nao faz referencia a React, Next.js, Prisma, ou qualquer biblioteca especifica.
Detalhes de implementacao pertencem ao SPEC-ARCH correspondente, a ser criado pelo architect.

---

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-30 | product-owner | Draft inicial — Personalizacao do Guia do Destino com categorias e notas pessoais |
