---
spec-id: SPEC-PROD-020
title: Expedition Summary & Trip Report
version: 1.0.0
status: Draft
author: product-owner
sprint: 30
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-020: Expedition Summary & Trip Report

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-17
**Sprint**: 30
**Relacionado a**: SPEC-PROD-005 (Expedition Completion & Summary, Approved), SPEC-PROD-007 (Complete Journey Summary Enhancement, Approved v1.1.0), SPEC-ARCH-005 (Journey Summary Data Aggregation, Approved v1.1.0), SPEC-UX-012 (Journey Summary Page, Approved v1.1.0), SPEC-PROD-014 (Shareable Summary Link, Draft)

---

## Contexto: Por que Este Documento Existe

A pagina de summary existe desde o Sprint 26 (SPEC-PROD-005) e foi aprimorada no Sprint 29 (SPEC-PROD-007). O componente atual agrega dados das 6 fases e exibe um resumo consolidado. No entanto, a versao atual nao e adequada para ser compartilhada ou impressa — e uma pagina de produto, nao um documento de viagem.

O traveler precisa de um documento completo que possa usar durante a viagem (offline ou impresso), compartilhar com familiares ou co-viajantes, e guardar como record da viagem planejada. Esta spec define os requisitos para elevar o summary de "pagina de revisao" para "documento de viagem completo".

---

## User Story

As a @leisure-solo or @leisure-family,
I want to view, share, and print a complete trip document that consolidates everything I planned,
so that I can travel with confidence using the document on my phone (offline) or printed, and share it with travel companions without requiring them to have an account.

---

## Contexto do Traveler

- **Pain point**: Apos completar as 6 fases, o usuario tem as informacoes espalhadas em 6 telas diferentes. Para viajar, precisa abrir multiplas paginas ou copiar dados manualmente.
- **Workaround atual**: Screenshots de cada fase. Comum, mas fragil e desatualizado se dados mudam.
- **Frequencia**: Ocorre duas vezes — antes de viajar (para revisar e compartilhar) e durante a viagem (para consultar).

---

## Requisitos Funcionais

### RF-001 — Consolidacao de todas as 6 fases
O documento de summary exibe os dados de todas as 6 fases em uma unica pagina com secoes:

| Secao | Dados exibidos |
|-------|---------------|
| Cabecalho da viagem | Destino com flag, origem, datas, tipo de viagem, numero de passageiros e composicao (adultos/criancas/etc) |
| Fase 2 — Perfil do viajante | Estilo de viagem, preferencias selecionadas (resumo) |
| Fase 3 — Checklist | Lista completa de itens com status de cada um (marcado/nao marcado), percentual de conclusao |
| Fase 4 — Logistica | Todos os segmentos de transporte (companhia, data, horario, codigo mascarado), acomodacoes (nome, checkin/checkout, noites), mobilidade local selecionada |
| Fase 5 — Guia do Destino | Cards de destaques do guia (top 3 por categoria, ou todos se <= 6 cards no total) |
| Fase 6 — Roteiro | Todos os dias do itinerario com atividades, horarios estimados, e notas |

### RF-002 — Secoes colupsaveis no modo web
No modo de visualizacao web (nao impressao), cada secao pode ser colapsada/expandida pelo usuario. Estado de colapso e persistido na sessao. Por padrao, todas as secoes estao expandidas.

### RF-003 — Indicador de completude
No cabecalho do documento, um indicador mostra: "Expedicao X% planejada" baseado no numero de fases concluidas (ex: 4/6 fases = 66%). Se alguma fase esta incompleta, exibe link "Completar [Nome da Fase]" que navega para a fase.

### RF-004 — Dados mascarados por seguranca
Codigos de reserva (bookingCode) de transporte e acomodacao sao exibidos mascarados: os 4 ultimos caracteres visiveis, resto substituido por asteriscos. Ex: `****-****-AB3C`. O mascaramento segue o padrao ja implementado em SPEC-ARCH-005.

### RF-005 — Link de compartilhamento (read-only)
O usuario pode gerar um link publico de visualizacao do seu summary com as seguintes caracteristicas:
- Read-only: nao e possivel editar dados pelo link publico
- Expiracao: o link expira apos 30 dias por padrao, com opcao de renovar ou definir expirar em 7 dias
- Dados sensiveis: codigos de reserva NAO sao exibidos na versao compartilhada publicamente (substituidos por "Disponivel apenas para o proprietario da expedicao")
- O usuario pode revogar o link a qualquer momento
- Um usuario pode ter apenas 1 link ativo por expedicao (gerar novo link invalida o anterior)
- Pagina de link expirado: mensagem clara "Este link expirou ou foi revogado" com CTA "Criar sua propria expedicao"

### RF-006 — Exportacao para PDF
O usuario pode exportar o summary como PDF. O PDF:
- Usa o mesmo layout da versao de impressao (RF-007)
- E gerado no cliente (sem dependencia de servico externo de renderizacao de PDF) via API do browser (`window.print()` ou equivalente)
- Nome do arquivo: `atlas-[destino]-[data-inicio].pdf` (ex: `atlas-paris-2026-03-15.pdf`)
- Tamanho maximo esperado: <= 2MB para viagem padrao de 7 dias

### RF-007 — Layout de impressao
Ao imprimir (via `window.print()` ou exportacao PDF):
- Elementos de navegacao, botoes de acao, e cabecalho do produto sao ocultados
- Cada secao inicia em nova pagina se o conteudo ultrapassar 60% da pagina atual
- O cabecalho da viagem (nome do destino, datas, passageiros) e repetido em cada pagina como header de impressao
- Checklist de items e renderizado em 2 colunas para economizar espaco
- Itinerario mantem 1 coluna com hierarquia clara dia > atividade > horario
- Texto usa preto puro (#000000) sobre branco, sem cores de fundo que desperdicam tinta

### RF-008 — Modo de leitura offline
O documento e acessivel offline se o usuario ja o visitou enquanto estava conectado (cache por service worker ou similar). O modo offline exibe badge "Visualizando offline — dados de [data do ultimo acesso]". Dados desatualizados sao claramente indicados.

### RF-009 — Edicao rapida no contexto do summary
Em cada secao do summary (web, nao impressao), ha um link "Editar" que navega diretamente para a fase correspondente. Apos editar e salvar na fase, o usuario pode retornar ao summary. O summary reflete os dados atualizados (nao cached).

### RF-010 — Aviso de expedicao incompleta
Se o usuario acessa o summary de uma expedicao com fases incompletas, o summary e exibido normalmente mas:
- As secoes de fases incompletas exibem placeholder "Esta fase ainda nao foi concluida"
- Um banner no topo avisa "Sua expedicao ainda nao esta completa. Complete as fases restantes para um documento completo."
- O botao de exportacao PDF e compartilhamento estao disponiveis mas incluem aviso no dialogo: "Algumas fases estao incompletas. Deseja exportar assim mesmo?"

---

## Requisitos de Seguranca e Privacidade

### RF-011 — Autenticacao para dados sensiveis
A versao autenticada do summary (acessada pelo dono) exibe codigos de reserva mascarados. A versao publica (via link compartilhado) nao exibe codigos de reserva nem informacoes de passageiros com dados pessoais.

### RF-012 — Controle de acesso ao link publico
O link compartilhado nao pode ser adivinhado (deve ter pelo menos 128 bits de entropia no token). Nao deve aparecer em buscas publicas (header `X-Robots-Tag: noindex` na pagina do link publico).

### RF-013 — Log de acesso ao link publico
Cada acesso ao link publico deve ser registrado em log com timestamp e IP anonimizado (nao o IP completo — hash com salt). O usuario pode ver quantas vezes o link foi acessado.

---

## Requisitos de i18n

### RF-014 — Datas formatadas por locale
Todas as datas no documento seguem o locale do usuario autenticado (PT-BR vs EN). Na versao publica, o locale e PT-BR por padrao (produto e brasileiro).

### RF-015 — Textos do documento
Todos os labels do documento (cabecalhos de secao, placeholders, mensagens de estado) devem ter traducoes em PT-BR e EN.

---

## Requisitos de Acessibilidade

### RF-016 — Estrutura semantica do documento
O summary usa estrutura semantica HTML: `<article>` para o documento completo, `<section>` para cada fase, `<h2>` para titulos de secao, `<h3>` para subtitulos. Hierarquia de headings nao pode ter saltos (ex: h1 -> h3 sem h2).

### RF-017 — Checklist acessivel
Os itens do checklist usam `<ul>` com `<li>` e icone de status. O status (marcado/nao marcado) deve ser comunicado via texto ou `aria-label`, nao apenas por icone.

---

## Criterios de Aceite

- **AC-001**: Dado que uma expedicao tem todas as 6 fases concluidas, quando o usuario acessa o summary, entao todas as 6 secoes sao exibidas com dados corretos de cada fase.
- **AC-002**: Dado que ha 2 segmentos de transporte cadastrados, entao a secao Logistica exibe ambos com codigos de reserva mascarados (ex: `****AB3C`).
- **AC-003**: Dado que a secao Fase 3 e colapsada pelo usuario, entao ela permanece colapsada durante a sessao ate ser expandida manualmente.
- **AC-004**: Dado que o usuario clica "Gerar link de compartilhamento", entao um link unico e gerado com expiracao de 30 dias, e uma copia do link e exibida para o usuario.
- **AC-005**: Dado o link compartilhado, quando acessado por um visitante nao autenticado, entao os dados da viagem sao exibidos sem codigos de reserva e sem dados de passageiros identificaveis.
- **AC-006**: Dado que o usuario revoga o link, entao qualquer tentativa de acesso ao link exibe mensagem "Este link expirou ou foi revogado" e nao exibe nenhum dado da expedicao.
- **AC-007**: Dado que o usuario clica "Exportar PDF", entao um PDF e gerado e baixado com nome no formato `atlas-[destino]-[data].pdf` em menos de 10 segundos.
- **AC-008**: Dado o PDF gerado, entao elementos de navegacao e botoes de acao da pagina nao estao presentes no PDF.
- **AC-009**: Dado que o usuario imprime a pagina (Ctrl+P), entao elementos de navegacao sao ocultados e o cabecalho da viagem e repetido em cada pagina impressa.
- **AC-010**: Dado que a expedicao tem fases incompletas, entao o banner de aviso aparece no topo e as secoes incompletas exibem placeholder, sem quebrar o layout das secoes completas.
- **AC-011**: Dado que o usuario clica "Editar" na secao de Logistica, entao e navegado para Phase 4 da expedicao.
- **AC-012**: Dado que a pagina do summary foi visitada enquanto conectado, quando o usuario acessa offline, entao o conteudo e exibido com badge "Visualizando offline" e data do ultimo acesso.
- **AC-013**: Dado que o link publico e gerado com 30 dias de expiracao e passam 31 dias, entao o link retorna pagina de expiracao ao ser acessado.
- **AC-014**: Dado um screen reader, o anuncio de cada item do checklist inclui o texto do item e seu status (marcado ou nao marcado).
- **AC-015**: Dado que o usuario tem perfil em EN, entao todas as datas no summary sao formatadas em ingles (ex: "Mar 15, 2026").
- **AC-016**: Dado que o usuario clica "Exportar PDF" com fases incompletas, entao um dialogo de confirmacao pergunta "Algumas fases estao incompletas. Deseja exportar assim mesmo?" antes de gerar o PDF.

---

## Fora do Escopo (v1 desta spec)

- Compartilhamento direto via WhatsApp, email, ou outras redes sociais (link copiavel e suficiente)
- Edicao colaborativa do summary por co-viajantes via link
- Versao interativa do PDF (formulario preenchivel)
- Sincronizacao automatica do PDF ao editar a expedicao
- Exportacao para formatos adicionais (Word, Excel, iCal)
- Template de design personalizado para o PDF (premium feature futura)
- Comentarios ou anotacoes no documento

---

## Metricas de Sucesso

| Metrica | Baseline | Meta | Prazo |
|---------|----------|------|-------|
| Taxa de acesso ao summary apos concluir Phase 6 | Desconhecida | >= 90% | Sprint 31 |
| Taxa de exportacao PDF por expedicao concluida | N/A | >= 30% | Sprint 31 |
| Taxa de geracao de link compartilhado | N/A | >= 20% | Sprint 31 |
| Reclamacoes de "dados faltando" no summary | N/A | 0 | Sprint 30 |
| NPS de usuarios que exportaram PDF vs nao exportaram | N/A | Medir delta | Sprint 32 |

---

## Dependencias

- **SPEC-PROD-014** (Shareable Summary Link, Draft Sprint 29): token de compartilhamento, mecanismo de expiracao — pode ser alinhado ou absorvido por esta spec
- **SPEC-ARCH-005** (Journey Summary Data Aggregation, Approved v1.1.0): logica de agregacao de dados das 6 fases
- **SPEC-ARCH-XXX** (a criar): armazenamento do link de compartilhamento (token, expiracao, contagem de acessos) + estrategia de cache offline
- **SPEC-UX-012** (Journey Summary Page, Approved v1.1.0): especificacao visual base — esta spec extend o escopo visual

---

## Nota sobre SPEC-PROD-014

SPEC-PROD-014 (Shareable Summary Link, Draft Sprint 29) define o mecanismo de link de forma isolada. Esta spec (SPEC-PROD-020) absorve o link compartilhavel como RF-005 no contexto do documento completo. Recomendo ao tech-lead decidir se SPEC-PROD-014 permanece como spec separada de implementacao ou e deprecada em favor desta spec. A decisao afeta o SPEC-STATUS.md.

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | product-owner | Documento inicial — Sprint 30 rewrite planning |
