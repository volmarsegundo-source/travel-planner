# SPEC-PROD-042: Dashboard Administrativo — KPIs de Economia PA e Usuarios

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, architect, security-specialist, finops-engineer
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Sprint**: 36
**Documento de referencia**: `docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md` — Secao 8
**Nota**: A Secao 8 do documento de economia classifica o dashboard como "Futuro — Sprint 38+". Este spec antecipa parte dessa implementacao para o Sprint 36 porque o lançamento dos pacotes de PA (SPEC-PROD-041) e do sistema de badges (SPEC-PROD-040) cria necessidade operacional imediata de visibilidade financeira e de saude da economia.

---

## 1. Problem Statement

Com o lançamento dos pacotes de PA (SPEC-PROD-041) e do sistema de badges (SPEC-PROD-040) no Sprint 36, o produto entra em um estado onde:

1. **PA esta sendo criado** (boas-vindas, conclusao de fases, compras mock) e **consumido** (funcionalidades de IA).
2. **Badges estao sendo concedidos** e influenciando o comportamento do usuario.
3. **O PO e o finops-engineer nao tem visibilidade nenhuma** sobre essas metricas — nao existe nenhuma interface administrativa.

Sem um dashboard administrativo, o PO nao pode:
- Verificar se o modelo economico esta funcionando como projetado (taxa de ganho vs. gasto de PA).
- Identificar anomalias antes que causem impacto nos usuarios (ex: PA sendo emitido em excesso por bug).
- Tomar decisoes informadas sobre precos de pacotes antes da integracao do gateway real (Sprint 37).
- Monitorar o custo real de IA por usuario para calcular a margem operacional.

O dashboard do Sprint 36 e **operacional e interno** — nao e uma feature de usuario final. O acesso e restrito a usuarios com role `ADMIN`. A interface e funcional primeiro, polida depois.

---

## 2. User Story

As a product-owner or finops-engineer with ADMIN role,
I want a private dashboard showing real-time PA economy metrics and per-user activity,
so that I can make data-driven decisions about pricing, AI costs, and platform health before the real payment gateway goes live.

### Traveler Context

- **Pain point**: N/A (este e um produto interno para o time, nao para o viajante).
- **Business pain**: O PO lança os pacotes de PA sem saber se a economia esta equilibrada. Se o custo de IA por usuario superar a receita de PA, o produto opera no prejuizo sem que o time perceba ate o fim do mes.
- **Frequency**: Consultado diariamente pelo PO e finops-engineer durante e apos o Sprint 36.

---

## 3. Requirements

### REQ-ADMIN-001 — Rota Protegida `/admin/dashboard`

**MoSCoW**: Must Have
**Esforco**: XS

Criar a rota `/[locale]/(admin)/dashboard` protegida por middleware que verifica `session.user.role === "ADMIN"`.

**Comportamento de acesso nao autorizado**:
- Usuarios sem role ADMIN recebem redirecionamento para `/expeditions` (nao expoe a existencia do dashboard).
- Usuarios nao autenticados recebem redirecionamento para `/auth/login`.
- A rota `/admin/*` nao deve aparecer em nenhuma navegacao publica, sitemap ou link de rodape.

**Nota de segurança**: a protecao deve ser implementada em duas camadas — middleware de rota (verificacao rapida) e server component (verificacao autoritativa com query de sessao atualizada).

### REQ-ADMIN-002 — KPIs de Economia PA

**MoSCoW**: Must Have
**Esforco**: S

Exibir os seguintes KPIs em cards no topo do dashboard, calculados em tempo real a partir de queries no banco de dados:

| KPI | Descricao | Calculo |
|---|---|---|
| PA Total Emitido | Soma de todo PA gerado por qualquer meio | `SUM(amount) WHERE type IN ('purchase', 'phase_complete', 'daily_login', 'profile_completion', 'referral', 'review', 'preference_fill')` |
| PA Total Gasto em IA | Soma de todo PA gasto em funcionalidades de IA | `SUM(ABS(amount)) WHERE type = 'ai_usage'` |
| PA em Circulacao | Soma de `availablePoints` de todos os usuarios ativos | `SUM(UserProgress.availablePoints)` |
| Taxa de Conversao PA | Percentual de usuarios com saldo insuficiente que compraram PA | `compras_unicas / usuarios_com_evento_insuficiente` |
| Receita Simulada (BRL) | Soma de todas as compras mock em BRL | `SUM(priceBrl) WHERE type = 'purchase'` |
| Custo de IA por Usuario (media) | PA medio gasto em IA por usuario ativo | `SUM(ai_usage) / usuarios_ativos` |
| Margem Operacional Simulada | (Receita simulada - Custo real de IA LLM) / Receita simulada | Calculado com base nos custos registrados pelo finops-engineer |

**Periodo de referencia**: os KPIs devem ter um seletor de periodo (hoje / 7 dias / 30 dias / total) que afeta todos os valores simultaneamente.

### REQ-ADMIN-003 — KPIs de Usuarios

**MoSCoW**: Must Have
**Esforco**: S

Exibir metricas de usuarios no dashboard:

| KPI | Descricao |
|---|---|
| Usuarios Registrados (total) | Total de registros na tabela `User` (sem deletedAt) |
| Usuarios Ativos (periodo) | Usuarios com pelo menos 1 evento de `PointTransaction` no periodo selecionado |
| Usuarios com PA > 0 | Usuarios com `availablePoints > 0` |
| Usuarios com saldo zero | Usuarios com `availablePoints = 0` (potencial de compra ou churn) |
| Badges concedidos (periodo) | Total de registros em `UserBadge` com `createdAt` no periodo |
| Expedicoes completas (periodo) | Expedicoes com todas as 6 fases em status `completed` no periodo |

### REQ-ADMIN-004 — Tabela de Usuarios com Detalhes de PA

**MoSCoW**: Must Have
**Esforco**: S

Exibir uma tabela paginada (25 linhas por pagina) de todos os usuarios com as seguintes colunas:

| Coluna | Descricao |
|---|---|
| ID (truncado) | Primeiros 8 caracteres do userId |
| Email (mascarado) | `us***@dom***.com` — nunca exibir email completo no dashboard |
| Role | FREE / PREMIUM / ADMIN |
| Rank | Rank atual do usuario |
| PA Disponivel | `availablePoints` atual |
| PA Total Ganho | `totalPoints` acumulado |
| PA Gasto em IA | Total de `ai_usage` negativo |
| Badges | Contagem de badges desbloqueados |
| Ultima Atividade | `createdAt` da ultima `PointTransaction` |
| Membro desde | Data de registro |

**Ordenacao padrao**: por "Ultima Atividade" decrescente.

**Filtros disponiveis**:
- Por role (FREE / PREMIUM / ADMIN)
- Por rank
- Por faixa de PA disponivel (0, 1-100, 101-500, 501+)

### REQ-ADMIN-005 — Graficos de Tendencia

**MoSCoW**: Should Have
**Esforco**: S

Exibir dois graficos de linha simples:

1. **PA emitido vs. PA gasto (por dia)**: grafico de linha dupla mostrando a emissao diaria de PA (todos os tipos de ganho somados) vs. o gasto diario de PA em IA. Permite identificar se a economia esta equilibrada.

2. **Usuarios ativos por dia**: contagem de usuarios unicos com pelo menos 1 evento por dia no periodo selecionado.

**Requisitos tecnicos dos graficos**:
- Implementados com uma biblioteca de graficos leve (decisao do tech-lead).
- Eixo X: dias (no periodo selecionado).
- Tooltips ao hover exibindo valores numericos.
- Sem animacoes de entrada complexas (dashboard operacional, nao marketing).

---

## 4. Acceptance Criteria

### AC-042-001: Acesso negado para nao-ADMIN
Given um usuario autenticado com role `FREE` tenta acessar `/admin/dashboard`,
when a rota e acessada,
then o usuario e redirecionado para `/expeditions` sem mensagem de erro que exponha a existencia do dashboard.

### AC-042-002: Acesso negado para nao-autenticado
Given um usuario nao autenticado acessa `/admin/dashboard`,
when a rota e acessada,
then o usuario e redirecionado para `/auth/login`.

### AC-042-003: Acesso permitido para ADMIN
Given um usuario autenticado com role `ADMIN` acessa `/admin/dashboard`,
when a rota e renderizada,
then o dashboard e exibido com todos os KPIs e tabela de usuarios.

### AC-042-004: KPI PA Total Emitido — calculo correto
Given existem 10 transacoes de `phase_complete` (+100 PA cada) e 2 compras mock (+500 PA cada) no periodo,
when o dashboard exibe "PA Total Emitido",
then o valor exibido e 2.000 PA (1.000 + 1.000).

### AC-042-005: KPI PA Total Gasto — exclui ganhos
Given existem transacoes mistas (ganhos e gastos) no banco de dados,
when o dashboard exibe "PA Total Gasto em IA",
then apenas transacoes com `type = 'ai_usage'` sao somadas.

### AC-042-006: PA comprado nao inflaciona totalPoints
Given um usuario comprou o pacote "Explorador" (500 PA) via mock,
when o KPI "PA Total Emitido" e calculado,
then os 500 PA da compra estao incluidos no PA Total Emitido, MAS o `totalPoints` do usuario nao aumentou (verificado na tabela de usuarios).

### AC-042-007: Email mascarado na tabela de usuarios
Given a tabela de usuarios e exibida no dashboard,
when qualquer linha e inspecionada,
then nenhum email completo e visivelmente exibido — todos aparecem mascarados no formato `us***@dom***.com`.

### AC-042-008: Paginacao da tabela
Given existem 60 usuarios registrados,
when o dashboard e carregado,
then a tabela exibe 25 usuarios na primeira pagina, com controles de paginacao funcionais para acessar a pagina 2 (25 usuarios) e pagina 3 (10 usuarios).

### AC-042-009: Seletor de periodo — KPIs respondem
Given o dashboard esta exibindo KPIs para "30 dias",
when o administrador seleciona "7 dias",
then todos os KPIs e graficos sao recalculados e exibidos para o periodo dos ultimos 7 dias.

### AC-042-010: Grafico PA emitido vs. gasto
Given o seletor de periodo esta em "30 dias",
when o dashboard e carregado,
then o grafico exibe duas linhas: uma para PA emitido por dia e outra para PA gasto por dia, com eixo X em datas e tooltips funcionais.

### AC-042-011: Filtro de tabela por role
Given o administrador seleciona o filtro "Role: FREE",
when o filtro e aplicado,
then a tabela exibe apenas usuarios com role `FREE`.

### AC-042-012: Dashboard nao aparece em navegacao publica
Given qualquer usuario (autenticado ou nao) navega pela aplicacao,
when verifica header, footer, sitemap ou qualquer link publico,
then nenhum link para `/admin/dashboard` e visivel.

---

## 5. Scope

### In Scope

- Rota `/[locale]/(admin)/dashboard` com protecao de role ADMIN
- Cards de KPIs de economia PA (7 metricas — REQ-ADMIN-002)
- Cards de KPIs de usuarios (6 metricas — REQ-ADMIN-003)
- Tabela paginada de usuarios com email mascarado (REQ-ADMIN-004)
- Seletor de periodo (hoje / 7 dias / 30 dias / total)
- Dois graficos de tendencia: PA emitido vs. gasto, usuarios ativos (REQ-ADMIN-005)
- Filtros de tabela por role, rank, faixa de PA

### Out of Scope (v1)

- Controles administrativos de PA por usuario individual (emitir PA manualmente, estornar transacao especifica) — deferido para Sprint 38 conforme ATLAS-GAMIFICACAO-APROVADO.md Secao 8.2
- Ajuste de precos de features de IA via feature flag no dashboard — deferido para Sprint 38
- Alertas automaticos de saude da economia (email ou push) — deferido para Sprint 38
- Relatorio exportavel em CSV ou PDF — deferido para Sprint 38
- Dashboard de custos reais de API LLM (Anthropic, Google) — gerenciado pelo finops-engineer via COST-LOG.md, nao pelo dashboard de produto
- Auditoria de acoes administrativas (log de quem consultou o que) — deferido para Sprint 38

---

## 6. Constraints (MANDATORY)

### Security (CRITICO)

- Protecao de rota em DUAS camadas: middleware de autenticacao + verificacao de role no server component (nao confiar apenas no middleware).
- Nenhuma query do dashboard pode retornar dados pessoais nao mascarados (emails, nomes completos, documentos).
- O endpoint de dados do dashboard deve ser uma rota de API ou server action protegida por verificacao de role — nunca acessivel sem autenticacao valida.
- Rate limiting obrigatorio: maximo 30 requests/minuto por IP no `/admin/*` para prevenir scraping de dados de usuarios.
- Logs de acesso ao dashboard devem ser registrados (userId do admin, timestamp, IP) — para auditoria futura.

### Privacy (LGPD)

- Emails de usuarios exibidos apenas de forma mascarada — conforme principio de minimizacao de dados (Art. 6, VI).
- O dashboard nao deve expor nenhum dado que permita identificacao individual de usuarios comuns — apenas IDs truncados e emails mascarados.
- Os logs de acesso ao dashboard em si sao dados de auditoria interna e devem ter retencao de 90 dias.

### Accessibility

- O dashboard e interno (uso por equipe tecnica) — o nivel de acessibilidade exigido e WCAG 2.1 AA para os controles interativos (seletor de periodo, filtros, paginacao).
- Tabelas devem ter `<caption>` e headers com `scope` correto para leitores de tela.
- Graficos devem ter alternativa textual (valores numericos disponiveis nos tooltips e nos cards de KPI).

### Performance

- As queries de KPI nao devem usar `SELECT *` em tabelas grandes — usar agregacoes no banco de dados.
- O carregamento inicial do dashboard deve completar em <= 3s (LCP) para o conjunto de dados do MVP (< 1.000 usuarios).
- As queries devem usar indices existentes — nenhuma full table scan em `PointTransaction` sem filtro de periodo.

---

## 7. Dependencies

| Dependencia | Tipo | Notas |
|---|---|---|
| SPEC-PROD-040 (Badge System) | Mesmo sprint | Dados de badges necessarios para o KPI "Badges concedidos" |
| SPEC-PROD-041 (PA Packages) | Mesmo sprint | Dados de compras necessarios para "Receita Simulada" e "Taxa de Conversao" |
| UserProgress (Prisma, Sprint 9) | Schema existente | `availablePoints`, `totalPoints` |
| PointTransaction (Prisma, Sprint 9) | Schema existente | Fonte de dados para todos os KPIs de PA |
| UserBadge (Prisma, Sprint 9) | Schema existente | Fonte de dados para contagem de badges |
| User.role (Sprint 9) | Schema existente | Campo `role` no modelo User — verifica se existe enum ADMIN |

---

## 8. Success Metrics

| Metrica | Target |
|---|---|
| Tempo para o PO identificar anomalia de PA (vs. verificacao manual em DB) | < 2 minutos (vs. > 30 minutos manual) |
| Precisao dos KPIs vs. queries manuais no banco | 100% (tolerancia zero a divergencia) |
| Nenhum email nao mascarado visivel no dashboard | 0 ocorrencias em QA |
| Acesso nao autorizado ao dashboard bloqueado | 100% (testado com usuarios FREE e nao-autenticados) |

---

## 9. Nota sobre Margem Operacional

O KPI "Margem Operacional Simulada" requer o custo real de chamadas de API de LLM por usuario. No Sprint 36, este custo e estimado com base na tabela de precos documentada em `docs/finops/COST-LOG.md` (mantida pelo finops-engineer). O calculo exato da margem por usuario sera refinado quando o monitoramento de custo por request for implementado (deferido para Sprint 38).

Para o Sprint 36, a formula simplificada e:
```
Margem = (Receita_BRL_simulada - Custo_IA_estimado) / Receita_BRL_simulada
```

Onde `Custo_IA_estimado = PA_gasto_em_IA * custo_por_PA` (custo_por_PA definido pelo finops-engineer).

---

## 10. Change History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0.0 | 2026-03-22 | product-owner | Documento inicial — Sprint 36 planning. Dashboard administrativo com KPIs de PA, usuarios, tabela paginada e graficos |
