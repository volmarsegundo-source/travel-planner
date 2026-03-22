# SPEC-PROD-040: Sistema de Badges — 16 Conquistas em 4 Categorias

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, ux-designer, architect
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**Documento de economia**: `docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md` — Secao 4
**Spec pai**: `docs/specs/gamification/SPEC-PROD-GAMIFICATION.md` — Wave 2

---

## 1. Problem Statement

O Sprint 35 (Wave 1) tornou o sistema PA visivel: o usuario ve seu saldo, entende os custos de IA e recebe seu bonus de boas-vindas. No entanto, o sistema de gamificacao ainda carece de reconhecimento de conquistas especificas. Badges sao o mecanismo pelo qual o Atlas recompensa comportamentos de planejamento de qualidade — nao apenas o progresso linear por fases.

O backend de badges ja existe (`UserBadge` no Prisma, eventos no `PointsEngine`), mas a camada de produto esta ausente:

1. **Sem avaliacao event-driven**: nenhum servico verifica as condicoes de concessao de badge apos eventos relevantes (ex: criar 3 expedicoes nao dispara `viajante_frequente` automaticamente).
2. **Sem exibicao de colecao**: o usuario nao tem acesso a nenhuma UI que mostre os badges desbloqueados e os bloqueados com progresso.
3. **Sem feedback de desbloqueio**: quando um badge e concedido, nenhum toast ou animacao celebratoria ocorre — o evento e silencioso.
4. **Badges legados nao tratados**: o badge `host` (legado do Sprint 21, renomeado para `logistics_master`) pode existir em registros antigos e nao deve ser exibido na UI.

Sem badges visiveis e celebratorios, o sistema de gamificacao perde seu maior driver de retencao: a sensacao de conquista especifica e o desejo de "completar a colecao".

**Impacto de negocio**: produtos com sistemas de badges efetivos registram aumento de 15-25% em sessoes por usuario/semana (referencia: literatura de gamificacao aplicada a SaaS de viagens). Para o Atlas, o objetivo imediato e aumentar a taxa de conclusao de expedicoes de 6 fases de < 40% para > 60%.

---

## 2. User Story

As a @leisure-solo traveler,
I want to see my badge collection and receive a celebratory notification when I unlock a new badge,
so that I feel recognized for my planning effort and motivated to complete more expeditions.

### User Story — Visualizacao de progresso

As a @leisure-solo traveler,
I want to see locked badges with their unlock conditions clearly described,
so that I know exactly what actions will earn me the next achievement.

### Traveler Context

- **Pain point**: O viajante completa sua primeira expedicao de 6 fases, investe horas no planejamento, e nao recebe nenhum reconhecimento alem do roteiro gerado. A sensacao de conquista e zero — o sistema e funcionalmente util mas emocionalmente neutro.
- **Current workaround**: Nenhum. O usuario simplesmente nao sabe que badges existem ou que poderiam ter sido desbloqueados.
- **Frequency**: Todo evento de conclusao de expedicao, todo login diario (para `fiel`), toda troca de idioma (para `poliglota`). O impacto e continuo e cross-feature.

---

## 3. Definicao dos 16 Badges

### 3.1 Categoria: Explorador (4 badges)

Recompensa a frequencia e volume de expedicoes planejadas.

| BadgeKey | Nome | Gatilho | Progressivo? |
|---|---|---|---|
| `primeira_viagem` | Primeira Viagem | Completar a primeira expedicao (todas as 6 fases concluidas) | Nao (binario) |
| `viajante_frequente` | Viajante Frequente | Completar 3 expedicoes | Sim (mostra N/3) |
| `globetrotter` | Globetrotter | Completar 5 expedicoes | Sim (mostra N/5) |
| `marco_polo` | Marco Polo | Completar 10 expedicoes | Sim (mostra N/10) |

> Definicao de "expedicao completa" para fins de badge: todas as 6 fases ativas devem ter status `completed` no `ExpeditionPhase`.

### 3.2 Categoria: Perfeccionista (4 badges)

Recompensa a qualidade e completude dos dados inseridos.

| BadgeKey | Nome | Gatilho | Progressivo? |
|---|---|---|---|
| `detalhista` | Detalhista | Preencher todos os campos opcionais e obrigatorios da Fase 4 (A Logistica) em pelo menos 1 expedicao | Nao (binario) |
| `planejador_nato` | Planejador Nato | Completar todas as 6 fases com 100% de campos preenchidos em pelo menos 1 expedicao | Nao (binario) |
| `zero_pendencias` | Zero Pendencias | Nenhum item com status `pending` no relatorio de resumo da expedicao ao concluir a Fase 6 | Nao (binario) |
| `revisor` | Revisor | Revisitar uma fase que ja estava com status `completed` e salvar uma atualizacao | Nao (binario) |

### 3.3 Categoria: Aventureiro (5 badges)

Recompensa o tipo e diversidade das viagens planejadas.

| BadgeKey | Nome | Gatilho | Progressivo? |
|---|---|---|---|
| `sem_fronteiras` | Sem Fronteiras | Planejar pelo menos 1 viagem internacional (origem e destino em paises diferentes) | Nao (binario) |
| `em_familia` | Em Familia | Planejar pelo menos 1 viagem com pelo menos 1 adulto + pelo menos 1 crianca (Fase 2) | Nao (binario) |
| `solo_explorer` | Solo Explorer | Planejar pelo menos 1 viagem solo (exatamente 1 adulto, 0 criancas, 0 outros) | Nao (binario) |
| `poliglota` | Poliglota | Usar o app em 2 ou mais idiomas distintos em sessoes diferentes | Nao (binario) |
| `multicontinental` | Multicontinental | Planejar expedicoes para destinos em 3 ou mais continentes distintos | Sim (mostra N/3 continentes) |

> Continentes mapeados por codigo de pais ISO 3166-1. A lista de mapeamento e mantida no servico de classificacao de viagens (`trip-classifier.ts`).

### 3.4 Categoria: Veterano (4 badges)

Recompensa a lealdade e longevidade do usuario na plataforma.

| BadgeKey | Nome | Gatilho | Progressivo? |
|---|---|---|---|
| `fiel` | Fiel | Acumular 10 ou mais logins diarios (nao necessariamente consecutivos) | Sim (mostra N/10) |
| `maratonista` | Maratonista | Completar 3 expedicoes dentro de uma janela de 30 dias corridos | Sim (mostra N/3 no periodo) |
| `fundador` | Fundador | Usuario registrado durante o periodo beta (data de registro <= data de encerramento do beta) | Nao (binario, concedido no primeiro login pos-beta) |
| `aniversario` | Aniversario | 365 dias decorridos desde a data de registro do usuario | Nao (binario, verificado por job diario) |

---

## 4. Requirements

### REQ-BADGE-001 — Servico de Avaliacao de Badges (BadgeEvaluationService)

**MoSCoW**: Must Have
**Esforco**: M

Criar um servico de avaliacao de badges event-driven que avalie as condicoes de concessao apos eventos relevantes do sistema.

**Eventos que disparam avaliacao**:

| Evento | Badges Avaliados |
|---|---|
| `EXPEDITION_PHASE_COMPLETED` (qualquer fase) | `primeira_viagem`, `viajante_frequente`, `globetrotter`, `marco_polo`, `detalhista`, `planejador_nato`, `zero_pendencias` |
| `EXPEDITION_PHASE_REVISITED` (fase ja completa atualizada) | `revisor` |
| `TRIP_CREATED` (com metadados de passageiros e destino) | `sem_fronteiras`, `em_familia`, `solo_explorer`, `multicontinental` |
| `DAILY_LOGIN` | `fiel`, `maratonista` |
| `LOCALE_CHANGED` | `poliglota` |
| `USER_ANNIVERSARY_CHECK` (job diario) | `aniversario`, `fundador` |

**Regras de avaliacao**:
- Idempotencia obrigatoria: o servico nunca concede o mesmo badge duas vezes ao mesmo usuario.
- Avaliacao assincrona: nao deve bloquear a resposta do evento disparador (usar background job ou event queue).
- Tolerancia a falhas: falha na avaliacao de badge nao deve impedir o fluxo principal (ex: completar uma fase deve suceder mesmo se a avaliacao de badge falhar).
- Auditoria: toda concessao de badge deve ser registrada com timestamp e evento disparador.

### REQ-BADGE-002 — Exibicao da Colecao em "Meu Atlas"

**MoSCoW**: Must Have
**Esforco**: M

Adicionar secao "Minhas Conquistas" na pagina "Meu Atlas" exibindo todos os 16 badges organizados por categoria.

**Comportamento dos badges desbloqueados**:
- Icone em cor cheia com nome e descricao da conquista.
- Data de desbloqueio exibida em formato relativo (ex: "ha 3 dias") com tooltip de data absoluta.
- Estado: destaque visual claro (saturacao total, sem overlay).

**Comportamento dos badges bloqueados**:
- Icone em escala de cinza com overlay de cadeado.
- Nome visivelmente legivel (nao ocultado).
- Descricao do criterio de desbloqueio exibida claramente.
- Para badges progressivos: barra de progresso com valor atual / valor alvo (ex: "2 / 3 expedicoes").

### REQ-BADGE-003 — Toast e Animacao de Desbloqueio

**MoSCoW**: Must Have
**Esforco**: S

Exibir notificacao celebratoria imediata quando um badge e concedido durante uma sessao ativa do usuario.

**Comportamento**:
- Toast de badge sobrepoe o toast padrao PA (prioridade maior na fila de notificacoes).
- Conteudo do toast: icone do badge + "Conquista desbloqueada!" + nome do badge.
- Duracao: 5 segundos (2 segundos a mais que o toast padrao).
- Animacao: entrada com efeito de "pop" (escala 0.8 -> 1.0 em 300ms, ease-out).
- Link no toast: "Ver minha colecao" — navega para "Meu Atlas" secao conquistas.
- Respeita `prefers-reduced-motion`: se ativo, sem animacao de pop (aparece diretamente).

### REQ-BADGE-004 — Badge `host` Legado (Exclusao da UI)

**MoSCoW**: Must Have
**Esforco**: XS

O badge com key `host` foi renomeado para `logistics_master` no Sprint 21 e e classificado como LEGACY. Este badge NAO deve ser exibido na secao "Minhas Conquistas" de nenhum usuario, mesmo que o registro exista no banco de dados.

**Comportamento**:
- Filtrar registros `UserBadge` com `badgeKey = "host"` na camada de servico antes de retornar para a UI.
- O badge `host` nao e incluido nos 16 badges da colecao.
- Sem mensagem de erro — simplesmente ignorado.

---

## 5. Acceptance Criteria

### AC-040-001: Concessao idempotente de badge
Given o usuario ja possui o badge `primeira_viagem`,
when o evento `EXPEDITION_PHASE_COMPLETED` e disparado novamente para a mesma ou outra expedicao,
then o badge `primeira_viagem` nao e concedido novamente e nenhum registro duplicado e criado em `UserBadge`.

### AC-040-002: Badge `primeira_viagem` — condicao de concessao
Given o usuario completou todas as 6 fases de 1 expedicao (todas com status `completed`),
when o evento de conclusao da Fase 6 e processado,
then o badge `primeira_viagem` e concedido ao usuario.

### AC-040-003: Badge `viajante_frequente` — condicao de concessao
Given o usuario completou 2 expedicoes anteriormente,
when o usuario completa a 3a expedicao,
then o badge `viajante_frequente` e concedido.

### AC-040-004: Badge `globetrotter` — condicao de concessao
Given o usuario completou 4 expedicoes anteriormente,
when o usuario completa a 5a expedicao,
then o badge `globetrotter` e concedido.

### AC-040-005: Badge `marco_polo` — condicao de concessao
Given o usuario completou 9 expedicoes anteriormente,
when o usuario completa a 10a expedicao,
then o badge `marco_polo` e concedido.

### AC-040-006: Badge `detalhista` — todos os campos Fase 4
Given o usuario esta preenchendo a Fase 4 com todos os campos (obrigatorios e opcionais) preenchidos,
when o usuario salva e conclui a Fase 4,
then o badge `detalhista` e concedido.

### AC-040-007: Badge `revisor` — revisitar fase concluida
Given o usuario tem uma expedicao com a Fase 3 em status `completed`,
when o usuario abre a Fase 3, altera pelo menos um campo e salva,
then o badge `revisor` e concedido.

### AC-040-008: Badge `sem_fronteiras` — viagem internacional
Given o usuario cria uma expedicao com origem no Brasil e destino em Portugal,
when a Fase 1 e concluida,
then o badge `sem_fronteiras` e concedido.

### AC-040-009: Badge `em_familia` — passageiros com crianca
Given o usuario configura a Fase 2 com 2 adultos e 1 crianca,
when a Fase 2 e concluida,
then o badge `em_familia` e concedido.

### AC-040-010: Badge `solo_explorer` — viagem solo
Given o usuario configura a Fase 2 com exatamente 1 adulto, 0 criancas, 0 infantes, 0 seniors,
when a Fase 2 e concluida,
then o badge `solo_explorer` e concedido.

### AC-040-011: Badge `fiel` — 10 logins diarios
Given o usuario tem 9 logins diarios registrados,
when o usuario faz login em um novo dia (UTC),
then o badge `fiel` e concedido.

### AC-040-012: Badge `fundador` — usuario beta
Given o usuario se registrou durante o periodo beta definido na configuracao do sistema,
when o usuario faz seu primeiro login pos-encerramento do periodo beta (ou imediatamente se ja era beta no momento da implementacao),
then o badge `fundador` e concedido.

### AC-040-013: Badge `aniversario` — 1 ano de conta
Given o usuario se registrou ha exatamente 365 dias,
when o job diario de verificacao de aniversario e executado,
then o badge `aniversario` e concedido.

### AC-040-014: Exibicao — badges desbloqueados na colecao
Given o usuario possui os badges `primeira_viagem` e `sem_fronteiras` desbloqueados,
when o usuario acessa "Meu Atlas" > secao "Minhas Conquistas",
then esses badges sao exibidos com icone em cor cheia, nome, descricao e data de desbloqueio.

### AC-040-015: Exibicao — badges bloqueados com progresso
Given o usuario completou 2 expedicoes e o badge `viajante_frequente` requer 3,
when o usuario visualiza o badge `viajante_frequente` na colecao,
then o badge e exibido em escala de cinza com barra de progresso "2 / 3" e criterio de desbloqueio legivel.

### AC-040-016: Toast de desbloqueio
Given o usuario acabou de completar a 3a expedicao e o badge `viajante_frequente` foi concedido durante a sessao ativa,
when o evento de concessao e processado,
then um toast celebratorio aparece com icone do badge, texto "Conquista desbloqueada!" e nome "Viajante Frequente" por 5 segundos.

### AC-040-017: Exclusao do badge legado `host`
Given o usuario tem um registro `UserBadge` com `badgeKey = "host"` no banco de dados (usuario antigo),
when o usuario visualiza "Minhas Conquistas",
then o badge `host` NAO e exibido na UI — nenhuma entrada para esse badge aparece.

### AC-040-018: Tolerancia a falha na avaliacao de badge
Given o `BadgeEvaluationService` encontra um erro ao avaliar badges apos um evento,
when o erro ocorre,
then o fluxo principal (ex: conclusao de fase, login diario) nao e interrompido — o erro e registrado em log e a avaliacao e reagendada ou ignorada silenciosamente para o usuario.

---

## 6. Scope

### In Scope

- `BadgeEvaluationService` com avaliacao event-driven para todos os 16 badges
- Secao "Minhas Conquistas" em "Meu Atlas" com todos os 16 badges organizados por categoria
- Estado desbloqueado (cor cheia, data) e estado bloqueado (cinza, progress bar para badges progressivos)
- Toast celebratorio com animacao (com respeito a `prefers-reduced-motion`)
- Filtro do badge legado `host`
- Job diario para `aniversario` e `fundador`
- Testes unitarios para `BadgeEvaluationService` (cobertura >= 85%)

### Out of Scope (v1)

- Compartilhamento de badges em redes sociais (deferido — requer analise de privacidade)
- Badges customizados ou configurados por admin (fora do escopo MVP)
- Notificacoes push ou por email de badge desbloqueado (deferido — requer integracao de notificacoes)
- Loja de badges ou troca de badges por PA (fora do escopo MVP)
- Animacao de galeria de badges (grid flip, parallax) — apenas animacao de toast no MVP

---

## 7. Constraints (MANDATORY)

### Security

- Avaliacao de badge sempre executada no servidor — nunca validada no cliente.
- O endpoint de concessao de badge deve verificar a autenticidade do evento disparador (nao aceitar chamadas diretas de clientes sem validacao server-side).
- Registros de `UserBadge` sao imutaveis apos concessao (sem endpoint de remocao de badge por usuario).

### Accessibility (WCAG 2.1 AA)

- Icones de badge devem ter `alt` descritivo ou `aria-label` com o nome do badge.
- Estado "bloqueado" deve ser comunicado via texto ou `aria-label` (nao apenas pelo overlay visual de cadeado).
- Barra de progresso deve ter `role="progressbar"` com `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- Toast de desbloqueio deve ser anunciado por leitores de tela via `role="status"` ou `aria-live="polite"`.
- Animacao de pop deve ser desabilitada se `prefers-reduced-motion: reduce`.

### Performance

- A avaliacao de badges nao deve adicionar latencia ao fluxo principal — deve ser assincrona.
- A pagina "Meu Atlas" com a colecao de badges deve carregar em <= 1s (LCP) em conexao 4G simulada.
- Icones de badges devem ser sprites SVG otimizados (sem requests individuais por badge).

### Privacy (LGPD)

- Dados de badges sao dados pessoais do usuario e devem ser incluidos no export LGPD (Art. 18).
- Anonimizados na exclusao de conta (registros `UserBadge` devem ser deletados ou desassociados do userId).

---

## 8. Dependencies

| Dependencia | Tipo | Notas |
|---|---|---|
| ATLAS-GAMIFICACAO-APROVADO.md (Secao 4) | Definicao de negocio | Tabela de 16 badges, categorias e gatilhos — fonte da verdade |
| SPEC-PROD-GAMIFICATION (Wave 2) | Spec pai | Este spec implementa a Wave 2 definida na spec de gamificacao |
| PointsEngine (Sprint 9) | Backend existente | Engine de pontos ja implementada — este spec adiciona o servico de avaliacao de badges sobre ela |
| UserBadge (Prisma, Sprint 9) | Schema existente | Modelo de dados ja existe — este spec define a camada de servico e UI |
| trip-classifier.ts (Sprint 11) | Servico existente | Usado para detectar viagens internacionais e mapeamento de continentes |
| SPEC-PROD-039 (WizardFooter Global) | Complementar | Fase `revisor` depende do evento de revisita que sera padronizado em SPEC-PROD-039 |

---

## 9. Success Metrics

| Metrica | Baseline | Target (Sprint 36 + 4 semanas) |
|---|---|---|
| Taxa de conclusao de expedicoes (6 fases) | < 40% | > 55% |
| Usuarios com pelo menos 1 badge desbloqueado | 0% (sem UI) | > 70% dos usuarios ativos |
| Sessoes por usuario/semana | Nao medido | +15% vs baseline Sprint 35 |
| Relatos de "nao sabia que existia conquista" | N/A | 0 (badges visiveis na colecao) |

---

## 10. Change History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0.0 | 2026-03-22 | product-owner | Documento inicial — Sprint 36 planning. 16 badges em 4 categorias, BadgeEvaluationService, colecao em Meu Atlas, toast celebratorio |
