---
spec-id: SPEC-PROD-027
title: Report i18n e Completude — Traducao de Labels e Dados Ausentes no Relatorio de Expedicao
version: 1.0.0
status: Draft
author: product-owner
sprint: 32
reviewers: [tech-lead, architect, ux-designer]
---

# SPEC-PROD-027: Report i18n e Completude — Traducao de Labels e Dados Ausentes no Relatorio de Expedicao

**Versao**: 1.0.0
**Status**: Draft
**Autor**: product-owner
**Data**: 2026-03-19
**Sprint**: 32
**Relacionado a**: SPEC-PROD-005 (Expedition Completion & Summary), SPEC-PROD-020 (Expedition Summary & Trip Report)
**Bugs cobertos**: P1-004 (valores brutos do banco no relatorio), P1-005 (dados ausentes por fase no relatorio)

---

## Contexto: Por que Este Documento Existe

O relatorio de expedicao (pagina de summary/report gerada ao final do planejamento) e a entidade central de valor que o viajante quer revisar, compartilhar e imprimir. Os testes de v0.26.0 identificaram dois problemas que comprometem a utilidade desse relatorio:

- **P1-004**: Valores enum do banco de dados aparecem em formato bruto em vez de labels traduzidas. Exemplos confirmados:
  - Tipo de viagem: "international" em vez de "Internacional"
  - Tipo de viajante: "student" em vez de "Estudante"
  - Itens de checklist: "copies_documents" em vez de "Copias de documentos"

  Isso ocorre porque o relatorio esta renderizando os valores de enum diretamente, sem passar pela camada de i18n.

- **P1-005**: Dados de varias fases estao ausentes no relatorio. O relatorio atual exibe:
  - Phase 1: apenas Destino, Origem, Datas e Tipo — faltam nome do viajante, data de nascimento (faixa etaria) e numero de passageiros
  - Phase 2: apenas tipo de viajante e tipo de hospedagem — faltam preferencias detalhadas, ritmo de viagem e faixa de orcamento para refeicoes
  - Itens pendentes (nao marcados no checklist) nao sao destacados visualmente no relatorio

Este spec define os requisitos para um relatorio completo e internacionalizado.

---

## 1. Problem Statement

O relatorio de expedicao e o produto final do planejamento — e o que o viajante mostra para familiares, usa para referencia durante a viagem, e potencialmente compartilha. Exibir valores tecnicos como "copies_documents" ou "international" em um relatorio que deveria ser um documento polido e profissional destroi a credibilidade do produto e cria uma experiencia constrangedora.

Adicionalmente, dados ausentes significam que o viajante nao pode usar o relatorio como referencia completa — precisa navegar de volta para as fases individuais para lembrar preferencias e detalhes que preencheu.

---

## 2. User Story

As a @leisure-solo or @leisure-family,
I want my expedition report to show all my planning data in my language with readable labels,
so that I can review and share my complete trip plan without seeing technical database values or missing information.

### Contexto do Traveler

- **Pain point**: O viajante termina de planejar sua viagem, abre o relatorio para revisar, e ve "international", "student", "copies_documents" onde esperava ver informacoes claras e em portugues. Alem disso, informacoes que preencheu (preferencias, numero de passageiros, ritmo de viagem) simplesmente nao aparecem.
- **Workaround atual**: Nenhum — o viajante nao consegue obter um relatorio completo e legivel com os dados atuais.
- **Frequencia**: Afeta 100% dos usuarios que acessam o relatorio. Impacto de qualidade alto — e a tela mais visivel e "final" da experiencia.

---

## 3. Acceptance Criteria

### P1-004 — Traducao de valores enum e labels de dados

#### Tipo de viagem

- [ ] **AC-001**: Dado um relatorio de expedicao com `tripType = "international"`, quando exibido ao usuario em locale PT-BR, entao o valor exibido e "Internacional" (nao o valor enum bruto).
- [ ] **AC-002**: Dado um relatorio com `tripType = "domestic"`, quando exibido em PT-BR, entao o valor e "Nacional".
- [ ] **AC-003**: Dado um relatorio com qualquer `tripType`, quando exibido em locale EN, entao o valor e exibido no equivalente em ingles correto (ex: "International", "Domestic").
- [ ] **AC-004**: Dado qualquer valor enum de `tripType` definido no sistema, entao existe uma traducao correspondente nos arquivos de i18n PT-BR e EN — nenhum valor enum bruto pode aparecer no relatorio.

#### Tipo de viajante

- [ ] **AC-005**: Dado um relatorio com `travelerType = "student"`, quando exibido em PT-BR, entao o valor e "Estudante".
- [ ] **AC-006**: Dado um relatorio com `travelerType = "business"`, quando exibido em PT-BR, entao o valor e "Executivo" (ou o label padrao do sistema para este enum).
- [ ] **AC-007**: Dado qualquer valor enum de `travelerType`, entao existe traducao nos arquivos de i18n — nenhum valor enum bruto pode aparecer no relatorio.

#### Labels de itens de checklist

- [ ] **AC-008**: Dado um relatorio que exibe itens de checklist, quando os itens sao renderizados, entao cada item exibe o label traduzido (ex: "Copias de documentos", nao "copies_documents").
- [ ] **AC-009**: Dado o locale EN, entao os labels de checklist sao exibidos em ingles.
- [ ] **AC-010**: Dado qualquer chave de item de checklist definida no sistema, entao existe traducao correspondente nos arquivos de i18n PT-BR e EN.

#### Principio geral

- [ ] **AC-011**: Dado o relatorio de expedicao completo, entao nenhum valor em formato snake_case, camelCase ou outro formato tecnico de banco de dados e visivel ao usuario — todos os valores de enum, tipo e categoria passam pela camada de i18n antes de serem exibidos.

### P1-005 — Completude dos dados por fase no relatorio

#### Phase 1 — O Chamado (dados pessoais e da viagem)

- [ ] **AC-012**: Dado um relatorio de expedicao, entao a secao de Phase 1 exibe: Nome da expedicao, Destino, Origem (se preenchida), Data de partida, Data de retorno, Duracao calculada (em dias/noites), Tipo de viagem e Numero de passageiros por categoria (adultos, criancas, bebes, idosos — apenas categorias com valor > 0).
- [ ] **AC-013**: Dado que o `userProfile.birthDate` esta preenchido, entao a secao de Phase 1 exibe a faixa etaria do viajante principal (ex: "18–25 anos", "26–35 anos") — nao a data de nascimento exata (privacidade).
- [ ] **AC-014**: Dado que o campo Origem nao foi preenchido, entao a secao de Phase 1 omite o campo Origem sem exibir "null", "undefined" ou campo vazio — omissao silenciosa.

#### Phase 2 — O Explorador (perfil e preferencias)

- [ ] **AC-015**: Dado um relatorio de expedicao, entao a secao de Phase 2 exibe: Tipo de viajante, Ritmo de viagem (relaxado / moderado / intenso), Orcamento estimado para refeicoes (economico / moderado / premium) e todas as categorias de preferencias preenchidas (nao apenas tipo de viajante e hospedagem).
- [ ] **AC-016**: Dado que o usuario preencheu a categoria "Culinaria" com ["local", "vegetariana"], entao o relatorio exibe os labels traduzidos dessas selecoes (ex: "Culinaria local, Vegetariana") — nao os valores enum brutos.
- [ ] **AC-017**: Dado que uma categoria de preferencia nao foi preenchida pelo usuario, entao essa categoria e omitida silenciosamente da secao de Phase 2 — nao exibe "nenhum" ou campo vazio.

#### Destaque de itens pendentes (checklist)

- [ ] **AC-018**: Dado que existem itens de checklist com `priority = REQUIRED` e `checked = false` no momento de geracao do relatorio, entao esses itens sao destacados visualmente no relatorio com indicador de "pendente" (diferente dos itens marcados).
- [ ] **AC-019**: Dado que todos os itens REQUIRED estao marcados (`checked = true`), entao nenhum destaque de "pendente" e exibido — o relatorio exibe um indicador positivo de checklist completo.
- [ ] **AC-020**: Dado itens com `priority = RECOMMENDED` ou `priority = OPTIONAL` nao marcados, entao esses itens podem ser exibidos no relatorio sem destaque especial de "pendente" — apenas itens REQUIRED recebem destaque de pendencia.

#### Integridade do relatorio

- [ ] **AC-021**: Dado um relatorio gerado, entao todas as secoes de fase (1 a 6) que tem dados preenchidos exibem esses dados — nenhum dado que o usuario preencheu em qualquer fase deve estar ausente do relatorio sem razao explicita.
- [ ] **AC-022**: Dado uma secao de fase sem dados (fase nunca preenchida ou em NOT_STARTED), entao o relatorio exibe uma indicacao clara de que aquela fase nao foi completada (ex: "Fase nao preenchida") — nao simplesmente omite a secao sem aviso.

---

## 4. Scope

### In Scope

- Traducao de todos os valores enum visiveis no relatorio (tripType, travelerType, checklist keys, categoria de preferencias)
- Exibicao de dados ausentes de Phase 1: numero de passageiros por categoria, faixa etaria do viajante principal
- Exibicao de dados ausentes de Phase 2: ritmo de viagem, orcamento de refeicoes, todas as categorias de preferencias com labels traduzidas
- Destaque visual de itens de checklist REQUIRED pendentes no relatorio
- Omissao silenciosa de campos opcionais nao preenchidos (sem exibir "null" ou vazio)
- Indicacao de fases nao preenchidas no relatorio

### Out of Scope

- Redesign visual do relatorio (layout, tipografia, cores) — apenas dados e labels
- Funcionalidade de exportar o relatorio para PDF (roadmap futuro, Sprint 33+)
- Compartilhamento de relatorio por link publico (SPEC-PROD-014, roadmap futuro)
- Exibicao de dados de Phase 4 (transporte, acomodacao, mobilidade) no relatorio — avaliar completude em Sprint 33 com base no feedback de beta
- Dados de Phase 5 (guia do destino) e Phase 6 (itinerario) no relatorio — esses sao conteudos extensos que podem requerer tratamento separado
- Traducao de nomes proprios de destinos (ex: nomes de cidades ja sao nomes proprios, nao enums)

---

## 5. Constraints (MANDATORY)

### Security

- O relatorio exibe dados do viajante — deve ser servido apenas ao usuario dono da expedicao (verificar `trip.userId === session.userId`)
- A data de nascimento exata do viajante nao deve aparecer no relatorio — exibir apenas faixa etaria calculada (privacidade de PII)
- Codigos de reserva (`bookingCode`) de transporte e acomodacao sao dados sensiveis — se exibidos no relatorio, devem ser mascarados (ex: "AB...XY" mostrando apenas primeiros e ultimos 2 caracteres)

### Accessibility

- WCAG 2.1 AA: o relatorio deve ser legivel por screen readers — todos os dados devem ter estrutura semantica adequada (headings, listas, tabelas com cabecalhos)
- O destaque de itens pendentes (AC-018) nao pode depender apenas de cor — deve ter indicador textual ou icone com texto alternativo
- O relatorio deve ter contraste minimo de 4.5:1 para textos regulares

### Performance

- O relatorio deve carregar em menos de 3 segundos (p95) para uma expedicao com checklist completo e preferencias preenchidas
- A busca de dados do relatorio deve ser uma query unica ou conjunto de queries em paralelo — nenhum loop sequencial de queries

### Architectural Boundaries

- As traducoes de enum devem vir dos arquivos de i18n do sistema — nao criar um segundo sistema de mapeamento paralelo
- O relatorio nao deve fazer chamadas de AI em tempo real — e uma agregacao de dados ja existentes
- O relatorio deve funcionar mesmo se algumas fases nao foram preenchidas (dados parciais devem ser graciosamente omitidos)

---

## 6. Success Metrics

| Metrica | Baseline (v0.26.0) | Meta (Sprint 32) | Prazo |
|---------|-------------------|-----------------|-------|
| Valores enum brutos visiveis no relatorio | Presente (confirmado em testes) | 0 | Sprint 32 QA |
| Dados de passageiros exibidos no relatorio | Ausente | Presente para todas as expedicoes com passageiros | Sprint 32 QA |
| Preferencias detalhadas exibidas no relatorio | Ausente | Presente com labels traduzidas | Sprint 32 QA |
| Itens REQUIRED pendentes destacados no relatorio | Ausente | Presente e acessivel | Sprint 32 QA |
| Reducao de feedback negativo sobre o relatorio em beta | N/A (beta nao lancado) | 0 mencoes de "dados errados" ou "dados faltando" no relatorio | Sprint 33 |

---

## 7. Dependencies

- **SPEC-PROD-005** (Expedition Completion & Summary): spec original do relatorio — este spec expande os requisitos de dados e i18n sem substituir os comportamentos ja implementados
- **SPEC-PROD-023** (Phase Completion Logic): os estados de fase informam quais secoes do relatorio devem ser exibidas como "concluidas" vs "nao preenchidas"
- Arquivos de i18n (`messages/pt-BR.json` e `messages/en.json`): precisam de todas as chaves de traducao para enums e labels de checklist mapeadas
- Schema de preferencias (SPEC-PROD-020 / Sprint 20): os 8 valores de categoria e suas opcoes devem ter traducoes completas nos arquivos de i18n

---

## 8. Vendor Independence

- Este spec descreve O QUE o relatorio deve exibir, nao COMO buscar ou renderizar os dados.
- A estrategia de busca de dados (server component, API route, agregacao em servico) e de responsabilidade do architect.
- As traducoes devem usar o sistema de i18n ja adotado pelo projeto — nenhuma dependencia nova e justificada para esta feature.

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | product-owner | Documento inicial — Sprint 32 stabilization, bugs P1-004 e P1-005 |
