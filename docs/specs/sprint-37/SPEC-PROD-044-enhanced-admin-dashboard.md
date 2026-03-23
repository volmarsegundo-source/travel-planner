# SPEC-PROD-044: Dashboard Administrativo Aprimorado — Metricas Reais, Rentabilidade e Alertas

**Version**: 1.0.0
**Status**: Draft
**Author**: product-owner
**Reviewers**: tech-lead, architect, security-specialist, finops-engineer
**Created**: 2026-03-23
**Last Updated**: 2026-03-23
**Sprint**: 37
**Predecessor**: `docs/specs/sprint-36/SPEC-PROD-042-admin-dashboard.md` (esqueleto do dashboard)
**Documento de referencia**: `docs/specs/gamification/ATLAS-GAMIFICACAO-APROVADO.md` — Secao 8

---

## 1. Problem Statement

O Sprint 36 entregou o esqueleto do dashboard administrativo (SPEC-PROD-042): rota protegida por role ADMIN, cards de KPIs de PA, tabela paginada de usuarios e dois graficos de tendencia. Com o gateway de pagamento real sendo lancado no Sprint 37 (SPEC-PROD-043), o dashboard de Sprint 36 torna-se insuficiente por tres razoes:

1. **Dados financeiros reais exigem metricas de rentabilidade por usuario**: com o Stripe ativo, o Atlas gera receita real em BRL. O finops-engineer e o PO precisam saber, para cada usuario, quanto esse usuario gerou de receita versus quanto custou em chamadas de IA. A diferenca e o **lucro bruto por usuario** — a metrica que determina a sustentabilidade do modelo freemium.

2. **A tabela de usuarios do Sprint 36 carece de informacoes de receita e custo**: as colunas atuais mostram PA, rank e badges, mas nao mostram valor financeiro. Um usuario com saldo zero pode ter comprado R$120 em PA e gastado tudo — altamente lucrativo. Outro pode ter consumido apenas PA gratuito — custo zero mas tambem receita zero. Sem essa distincao, nao ha base para decisoes de pricing ou retencao.

3. **Alertas de margem nao existem**: o modelo economico projeta margem >= 80% por pacote vendido. Se o custo real de IA (por usuario) superar o esperado, o produto pode operar no prejuizo sem que o time perceba. O dashboard precisa sinalizar proativamente quando a margem cair abaixo de thresholds criticos.

SPEC-PROD-044 transforma o dashboard operacional do Sprint 36 em uma **ferramenta de gestao economica**, adicionando: metricas de rentabilidade por usuario, exportacao CSV, novos graficos (distribuicao de rank, top destinos, receita ao longo do tempo, chamadas de IA por periodo) e alertas de margem com codificacao de cor.

---

## 2. User Story

### Historia Principal — Visibilidade de Rentabilidade

As a product-owner or finops-engineer with ADMIN role,
I want to see revenue, AI cost, and gross profit per user in a single table,
so that I can identify which user segments are profitable and which are not, to inform pricing and retention decisions.

### Historia — Alertas de Margem

As a finops-engineer with ADMIN role,
I want the dashboard to automatically flag users and aggregate metrics when gross margin falls below thresholds,
so that I can detect and respond to profitability issues before they compound.

### Historia — Exportacao de Dados

As a product-owner with ADMIN role,
I want to export the user metrics table as a CSV,
so that I can perform ad-hoc analyses in spreadsheet tools without precisar de acesso direto ao banco de dados.

### Historia — Graficos de Negocio

As a product-owner with ADMIN role,
I want to see revenue over time, AI call volume, user rank distribution, and top destinations in chart form,
so that I can spot trends and make roadmap decisions grounded in data.

### Traveler Context

- **Pain point**: N/A — produto interno para o time.
- **Business pain**: Sem o dashboard aprimorado, o finops-engineer precisa executar queries SQL manuais para calcular margem por usuario (30+ minutos por consulta). Com o gateway real ativo a partir do Sprint 37, isso torna-se insustentavel — o custo de nao ter visibilidade financeira supera o custo de implementar o dashboard.
- **Frequency**: Consultado diariamente pelo finops-engineer; semanalmente pelo PO para decisoes de roadmap.

---

## 3. Requirements

### REQ-ADMIN-006 — Tabela de Usuarios Aprimorada com Metricas Financeiras

**MoSCoW**: Must Have
**Esforco**: M

Substituir a tabela de usuarios do Sprint 36 (SPEC-PROD-042, REQ-ADMIN-004) com uma versao aprimorada que inclui colunas financeiras e de custo.

**Colunas da tabela aprimorada** (todas as colunas do Sprint 36, mais as novas):

| Coluna | Descricao | Calculo |
|---|---|---|
| ID (truncado) | Primeiros 8 caracteres do userId | — |
| Nome | Nome de exibicao do usuario | `UserProfile.displayName` (ou "Anonimo" se nao preenchido) |
| Email (mascarado) | `us***@dom***.com` | Mascaramento lado servidor |
| Role | FREE / PREMIUM / ADMIN | `User.role` |
| Rank | Rank atual | `UserProgress.rank` |
| PA Lifetime (total ganho) | Todo PA ganho por atividade (exclui compras) | `UserProgress.totalPoints` |
| PA Disponivel | Saldo atual | `UserProgress.availablePoints` |
| Expedicoes | Numero de expedicoes criadas | `COUNT(Trip) WHERE userId AND NOT deletedAt` |
| Expedicoes completas | Expedicoes com todas as 6 fases `completed` | Contagem filtrada |
| Receita (BRL) | Soma de compras de PA completadas | `SUM(Purchase.amountCents) / 100 WHERE status = "completed"` |
| Custo IA (USD) | Custo estimado de chamadas de IA LLM | `SUM(ai_usage.paAmount) * custo_por_pa_em_usd` |
| Lucro Bruto (BRL) | Receita BRL - Custo IA convertido para BRL | `receita - (custo_usd * taxa_cambio)` |
| Margem % | Lucro bruto / Receita * 100 | Exibir como percentual com cor |
| Ultimo Acesso | Data da ultima `PointTransaction` | `MAX(PointTransaction.createdAt)` |
| Membro desde | Data de registro | `User.createdAt` |

**Codificacao de cor na coluna "Margem %"**:
- Verde: margem >= 80%
- Amarelo: margem entre 50% e 79%
- Vermelho: margem < 50%
- Cinza/tracejado: usuario sem receita (R$ 0 — usuario gratuito que nunca comprou PA)

**Nota sobre "Lucro Bruto" para usuarios sem receita**: exibir "—" (tracejado) nas colunas financeiras para usuarios com `Receita = R$ 0`. Nao calcular margem negativa artificialmente — um usuario gratuito tem custo de IA zero (usa Gemini Flash gratuito) OU um custo que e pago pelo plano free tier do provedor, nao diretamente por compra do usuario.

**Ordenacao**:
- Padrao: por "Ultimo Acesso" decrescente.
- Clicavel em qualquer coluna numerica: Receita, Custo IA, Lucro Bruto, Margem %, PA Disponivel.

**Paginacao**: 25 linhas por pagina (mantido do Sprint 36).

**Busca**: campo de busca por ID (parcial) ou email (parcial, mascarado na exibicao mas buscavel pelo texto original no servidor).

### REQ-ADMIN-007 — Cards de KPIs Agregados Aprimorados

**MoSCoW**: Must Have
**Esforco**: S

Substituir e adicionar cards de KPI no topo do dashboard, organizados em duas linhas:

**Linha 1 — Usuarios e Engajamento** (mantidos/atualizados do Sprint 36):

| KPI | Descricao |
|---|---|
| Usuarios totais | Total de usuarios registrados (FREE + PREMIUM + ADMIN) — com breakdown entre gratuitos e pagantes |
| Usuarios ativos (periodo) | Usuarios com pelo menos 1 evento no periodo selecionado |
| Taxa de conversao | % de usuarios que realizaram pelo menos 1 compra de PA |
| PA emitido (periodo) | Total de PA gerado por todos os meios no periodo |
| PA consumido em IA (periodo) | Total de PA gasto em funcionalidades de IA no periodo |

**Linha 2 — Financeiro e Rentabilidade** (novos):

| KPI | Descricao | Calculo |
|---|---|---|
| Receita Total (BRL) | Soma de todas as compras completadas | `SUM(Purchase.amountCents) / 100 WHERE status = "completed"` |
| Custo Total de IA (USD) | Custo estimado total de chamadas LLM | Baseado em PA gasto * custo_por_pa |
| Margem Bruta % | Margem media ponderada dos usuarios pagantes | `(Receita - Custo_em_BRL) / Receita * 100` |
| ARPU (BRL) | Receita media por usuario ativo pagante | `Receita_total / usuarios_com_compra` |
| ARPPU (BRL) | Receita media por usuario pagante (Paying User) | `Receita_total / usuarios_com_compra >= 1` |
| PA emitido vs. consumido ratio | Relacao entre PA gerado e PA gasto (indicador de saude) | `PA_emitido / PA_consumido` |

**Alerta visual nos cards financeiros**:
- Card "Margem Bruta %" exibe fundo amarelo se margem entre 50-79%; fundo vermelho se < 50%.
- Card "Receita Total" exibe variacao percentual vs. periodo anterior (delta + seta direcional).

### REQ-ADMIN-008 — Graficos de Negocio

**MoSCoW**: Must Have
**Esforco**: M

Substituir os dois graficos do Sprint 36 (PA emitido vs. gasto e usuarios ativos) com um conjunto de quatro graficos alinhados as necessidades do Sprint 37:

**Grafico 1 — Receita ao Longo do Tempo (linha)**:
- Eixo X: dias ou semanas (conforme periodo selecionado).
- Eixo Y: receita em BRL.
- Tooltip: data, receita do dia/semana, numero de transacoes.
- Permite visualizar tendencia de crescimento de receita.

**Grafico 2 — Chamadas de IA por Periodo (linha)**:
- Eixo X: dias ou semanas.
- Eixo Y: numero de chamadas de IA (eventos `ai_usage`), agrupadas por tipo (checklist / guia / roteiro).
- Tooltip: data, total de chamadas, breakdown por tipo.
- Permite correlacionar uso de IA com custo e identificar quais funcionalidades sao mais usadas.

**Grafico 3 — Distribuicao de Rank dos Usuarios (pizza/donut)**:
- Segmentos: um por rank (novato, desbravador, navegador, capitao, aventureiro, lendario).
- Exibir percentual e numero absoluto de usuarios em cada rank.
- Permite identificar concentracao de usuarios nos ranks iniciais (sinal de engajamento baixo) vs. distribuicao saudavel.

**Grafico 4 — Top 10 Destinos (barra horizontal)**:
- Eixo X: numero de expedicoes criadas para o destino.
- Eixo Y: nome do destino (campo `destination` do modelo `Trip`).
- Top 10 destinos mais planejados na plataforma.
- Permite validar quais mercados de destino sao mais relevantes para o usuario do Atlas.

**Requisitos comuns a todos os graficos**:
- O seletor de periodo (hoje / 7 dias / 30 dias / customizado) afeta os graficos 1 e 2 (graficos 3 e 4 sao sempre acumulativos — periodo total).
- Tooltips numericos em todos os graficos.
- Sem animacoes de entrada complexas.
- Alternativa textual: os valores numericos dos graficos estao disponiveis nos cards de KPI e na tabela — os graficos sao complementares, nao a unica fonte de dados.

### REQ-ADMIN-009 — Alertas de Margem Proativa

**MoSCoW**: Must Have
**Esforco**: S

Implementar um sistema de alertas visuais no dashboard que sinalizem proativamente quando a saude economica do produto esta em risco.

**Alertas de nivel de dashboard (banner no topo)**:

| Condicao | Nivel | Mensagem |
|---|---|---|
| Margem bruta agregada < 80% | Aviso (amarelo) | "Margem bruta em [X]% — abaixo do target de 80%. Revisar custos de IA ou precos de pacotes." |
| Margem bruta agregada < 50% | Critico (vermelho) | "ATENCAO: Margem bruta em [X]%. Produto operando com rentabilidade critica. Acao imediata necessaria." |
| > 20% dos usuarios pagantes com margem < 0 | Critico (vermelho) | "Mais de 20% dos usuarios pagantes sao nao-lucrativos. Revisar modelo de custo de IA." |
| PA emitido / PA consumido ratio > 5 (usuarios acumulando sem gastar) | Informativo (azul) | "Ratio PA emitido/consumido em [X]. Usuarios acumulando PA sem usar IA — verificar proposta de valor." |

**Alertas por usuario na tabela** (coluna "Margem %" com cor — ja definido em REQ-ADMIN-006):
- Usuarios em vermelho (margem < 50%) ficam no topo da ordenacao quando o admin usa o filtro "Mostrar usuarios de alto risco".

**Filtro especial na tabela**: botao "Usuarios de alto risco" que filtra a tabela para exibir apenas usuarios pagantes com margem < 50% ou custo de IA > receita.

**Calculo do custo de IA por usuario** (formula para o Sprint 37):
O custo de IA por usuario e calculado com base no PA gasto em IA multiplicado pelo custo estimado por PA, definido pelo finops-engineer em `docs/finops/COST-LOG.md`. O dashboard deve ler esse valor de configuracao, nao hardcodar um numero fixo. Se o valor nao estiver configurado, exibir os campos de custo como "Nao configurado" com link para a documentacao.

### REQ-ADMIN-010 — Exportacao CSV da Tabela de Usuarios

**MoSCoW**: Should Have
**Esforco**: S

Permitir que o admin exporte os dados da tabela de usuarios como arquivo CSV.

**Comportamento**:
- Botao "Exportar CSV" no topo da tabela.
- O export inclui todos os registros que correspondem aos filtros ativos (nao apenas a pagina atual).
- Colunas exportadas: as mesmas da tabela (com emails mascarados — nunca exportar emails completos).
- Nome do arquivo: `atlas-users-export-YYYY-MM-DD.csv`.
- Encoding: UTF-8 com BOM (para compatibilidade com Excel em Windows).
- Limite: maximo 10.000 linhas por export no Sprint 37. Se houver mais registros, exibir aviso e exportar os primeiros 10.000 ordenados por data de ultimo acesso decrescente.

**Segurança do export**:
- A geracao do CSV deve ser uma server action protegida por verificacao de role ADMIN.
- O CSV e gerado no servidor e enviado como download direto — nunca expor uma URL publica para o arquivo.
- Os dados exportados devem seguir as mesmas regras de mascaramento da tabela na tela.

### REQ-ADMIN-011 — Filtro de Periodo Customizado

**MoSCoW**: Should Have
**Esforco**: S

Alem dos periodos pre-definidos (hoje / 7 dias / 30 dias), adicionar a opcao "Periodo customizado" com seletor de data inicial e data final.

**Comportamento**:
- Seletor de data com intervalo maximo de 365 dias.
- Data minima: data de lancamento do produto (configuravel via variavel de ambiente ou constante).
- Data maxima: hoje.
- Ao aplicar um periodo customizado, todos os KPIs e graficos responsivos ao periodo sao atualizados.
- O periodo customizado selecionado persiste na sessao do admin (nao reseta ao recarregar a pagina no mesmo navegador).

---

## 4. Acceptance Criteria

### AC-044-001: Tabela — colunas de rentabilidade exibidas
Given o admin acessa o dashboard e ha usuarios com compras completadas,
when a tabela de usuarios e exibida,
then as colunas "Receita (BRL)", "Custo IA (USD)", "Lucro Bruto (BRL)" e "Margem %" estao visiveis e preenchidas para usuarios com pelo menos uma compra.

### AC-044-002: Tabela — usuario sem receita exibe tracejado
Given existe um usuario FREE sem nenhuma compra de PA,
when esse usuario aparece na tabela,
then as colunas "Receita (BRL)", "Lucro Bruto (BRL)" e "Margem %" exibem "—" (tracejado), nao zero.

### AC-044-003: Margem — codificacao de cor correta
Given um usuario pagante tem receita de R$ 59,90 e custo de IA estimado em R$ 8,00 (margem = 86,6%),
when esse usuario aparece na tabela,
then a coluna "Margem %" exibe "86,6%" com fundo verde.

### AC-044-004: Margem — alerta amarelo
Given um usuario pagante tem margem calculada de 65%,
when esse usuario aparece na tabela,
then a coluna "Margem %" exibe o valor com fundo amarelo.

### AC-044-005: Margem — alerta vermelho
Given um usuario pagante tem margem calculada de 40%,
when esse usuario aparece na tabela,
then a coluna "Margem %" exibe o valor com fundo vermelho.

### AC-044-006: Alerta de dashboard — margem agregada critica
Given a margem bruta agregada de todos os usuarios pagantes e 45%,
when o dashboard e carregado,
then um banner vermelho no topo exibe a mensagem de alerta critico com o valor da margem.

### AC-044-007: Alerta de dashboard — margem agregada aviso
Given a margem bruta agregada e 72%,
when o dashboard e carregado,
then um banner amarelo exibe a mensagem de aviso com o valor da margem.

### AC-044-008: Alerta de dashboard — margem saudavel, sem alerta
Given a margem bruta agregada e 85%,
when o dashboard e carregado,
then nenhum banner de alerta de margem e exibido.

### AC-044-009: totalPoints inalterado — verificacao no dashboard
Given um usuario comprou o pacote "Embaixador" (6.000 PA) via gateway real,
when o admin visualiza esse usuario na tabela,
then a coluna "PA Lifetime" (totalPoints) nao inclui os 6.000 PA da compra.

### AC-044-010: KPI Receita Total — calculo correto
Given existem 3 compras com `status = "completed"` de R$ 14,90, R$ 29,90 e R$ 59,90,
when o dashboard exibe o KPI "Receita Total",
then o valor exibido e R$ 104,70.

### AC-044-011: KPI Receita Total — exclui compras canceladas e pendentes
Given existem compras com `status = "pending"`, `status = "cancelled"` e `status = "completed"` no banco,
when o KPI "Receita Total" e calculado,
then apenas compras com `status = "completed"` sao somadas.

### AC-044-012: Grafico — Receita ao Longo do Tempo
Given o seletor de periodo esta em "30 dias" e existem dados de receita no periodo,
when o dashboard e carregado,
then o grafico "Receita ao Longo do Tempo" exibe uma linha com dados diarios, eixo X em datas e tooltips com valor em BRL.

### AC-044-013: Grafico — Distribuicao de Rank
Given existem usuarios em diferentes ranks no banco de dados,
when o grafico de distribuicao de rank e exibido,
then cada segmento do grafico representa um rank com percentual e numero absoluto de usuarios.

### AC-044-014: Grafico — Top 10 Destinos
Given existem trips criadas com diferentes destinos,
when o grafico "Top 10 Destinos" e exibido,
then as barras horizontais representam os 10 destinos com maior numero de expedicoes criadas, em ordem decrescente.

### AC-044-015: Busca — por email parcial
Given o admin digita "joao" no campo de busca da tabela,
when a busca e executada,
then a tabela exibe apenas usuarios cujo email contem "joao" (busca executada no servidor com email original, resultado exibido mascarado).

### AC-044-016: Ordenacao — por Receita
Given o admin clica no header da coluna "Receita (BRL)",
when a ordenacao e aplicada,
then a tabela reordena com usuarios de maior receita no topo (decrescente no primeiro clique).

### AC-044-017: Filtro "Usuarios de alto risco"
Given o admin clica no botao "Usuarios de alto risco",
when o filtro e aplicado,
then a tabela exibe apenas usuarios pagantes com margem < 50% ou custo de IA > receita.

### AC-044-018: Exportacao CSV — conteudo correto
Given o admin clica "Exportar CSV" com filtro "Role: FREE" ativo,
when o arquivo CSV e baixado,
then o arquivo contem apenas usuarios FREE, com emails mascarados, todas as colunas da tabela e encoding UTF-8 com BOM.

### AC-044-019: Exportacao CSV — seguranca
Given um usuario com role FREE tenta acessar o endpoint de exportacao CSV diretamente,
when a requisicao e processada,
then o servidor retorna 403 Forbidden sem expor nenhum dado.

### AC-044-020: Custo de IA — "Nao configurado" se parametro ausente
Given o valor de `custo_por_pa` nao esta definido em `docs/finops/COST-LOG.md` ou na configuracao do sistema,
when o dashboard tenta calcular as colunas de custo e margem,
then as colunas de custo e margem exibem "Nao configurado" com um link para a documentacao de configuracao.

---

## 5. Scope

### In Scope

- Tabela de usuarios aprimorada com colunas financeiras (Receita BRL, Custo IA USD, Lucro Bruto BRL, Margem %)
- Codificacao de cor na coluna Margem % (verde / amarelo / vermelho)
- Cards de KPIs financeiros: Receita Total, Custo Total IA, Margem Bruta %, ARPU, ARPPU, ratio PA emitido/consumido
- Delta percentual vs. periodo anterior no card Receita Total
- Quatro graficos: Receita ao Longo do Tempo, Chamadas de IA por Periodo, Distribuicao de Rank, Top 10 Destinos
- Alertas de margem visuais no topo do dashboard (banner amarelo / vermelho)
- Filtro especial "Usuarios de alto risco" na tabela
- Busca por email parcial na tabela
- Ordenacao clicavel em colunas numericas
- Exportacao CSV da tabela (com filtros ativos, emails mascarados)
- Filtro de periodo customizado (data inicial + data final)

### Out of Scope (Sprint 37)

- Controles administrativos de PA por usuario individual (emitir PA manualmente, estornar transacao) — deferido Sprint 38 conforme ATLAS-GAMIFICACAO-APROVADO.md Secao 8.2
- Ajuste de precos de features de IA via dashboard — deferido Sprint 38
- Alertas automaticos por email ou Slack ao time — deferido Sprint 38
- Monitoramento de custos reais de API LLM em tempo real (por request) — requer instrumentacao no backend; deferido Sprint 38
- Auditoria de acoes administrativas (log de quem acessou o dashboard e quando) — deferido Sprint 38
- Dashboard de saude de badges (distribuicao de badges por usuario, badges mais raros) — deferido Sprint 39
- Relatorio PDF executivo — deferido Sprint 39
- Taxa de cambio USD/BRL em tempo real — usar taxa fixa configuravel pelo finops-engineer no Sprint 37

---

## 6. Constraints (MANDATORY)

### Security (CRITICO)

- Todas as constraints de segurança do SPEC-PROD-042 permanecem em vigor: protecao em duas camadas (middleware + server component), emails mascarados, rate limiting 30 req/min.
- As novas queries financeiras (receita, custo, margem) devem ser executadas em server actions protegidas por verificacao de role ADMIN — nunca em rotas de API abertas.
- O endpoint de exportacao CSV deve ter rate limiting proprio: maximo 5 exports por admin por hora (prevenir exfiltração de dados via export em loop).
- A busca por email deve ser executada no servidor — o termo de busca e processado contra o email original, mas o resultado retornado ao cliente sempre usa o email mascarado. O termo de busca nunca e refletido na resposta sem mascaramento.
- Nenhuma query do dashboard pode retornar `stripeCustomerId`, `stripeSessionId` ou `stripePaymentIntentId` diretamente ao cliente — esses campos sao dados sensíveis de pagamento.

### Privacy (LGPD)

- Todas as constraints de SPEC-PROD-042 permanecem: minimizacao de dados, emails mascarados, logs de acesso com retencao de 90 dias.
- O CSV exportado e dado pessoal financeiro — sua geracao e download devem ser registrados em log de auditoria (userId do admin, timestamp, filtros aplicados, numero de linhas exportadas).
- A taxa de cambio usada para conversao USD/BRL e um parametro operacional, nao dado pessoal — pode ser armazenada como configuracao.

### Accessibility (WCAG 2.1 AA)

- Os alertas de margem (banners amarelo/vermelho) nao devem comunicar status apenas por cor — devem incluir icone e texto descritivo.
- A codificacao de cor na coluna "Margem %" deve ter alternativa textual: o valor percentual ja e texto suficiente, mas o tooltip de hover deve reforcar o significado da cor.
- O grafico de pizza (distribuicao de rank) deve ter `aria-label` descrevendo o conteudo e os dados numericos devem estar disponiveis em formato textual adjacente (ex: tabela de dados do grafico).
- O botao "Exportar CSV" deve ter `aria-label` explicativo se o texto do botao for apenas um icone.

### Performance

- As queries de KPI financeiro devem usar agregacoes no banco de dados (nao carregar todos os registros em memoria para somar no servidor).
- O carregamento inicial do dashboard (com todos os 4 graficos e a tabela) deve completar em <= 5s para ate 10.000 usuarios.
- A tabela deve usar paginacao server-side — nunca carregar todos os registros de uma vez.
- O export CSV de 10.000 linhas deve ser gerado em <= 30s no servidor (streaming de resposta recomendado).
- As queries de graficos nao devem bloquear a renderizacao da tabela — implementar carregamento paralelo (graficos e tabela em requests independentes).

### Architectural Boundaries

- Este spec nao define como os custos de IA por usuario sao calculados tecnicamente — o architect deve especificar a formula e as fontes de dados em SPEC-ARCH correspondente.
- A taxa de cambio USD/BRL e um parametro de configuracao gerenciado pelo finops-engineer, nao um valor calculado em tempo real pelo dashboard.
- A ordem de implementacao deve respeitar a dependencia: o modelo `Purchase` com dados Stripe (SPEC-PROD-043) deve estar implementado antes de desenvolver as metricas financeiras deste spec.

---

## 7. Success Metrics

| Metrica | Target |
|---|---|
| Tempo para o finops-engineer calcular margem por usuario (vs. query manual) | < 30 segundos (vs. 30+ minutos manual) |
| Precisao do calculo de margem vs. consulta manual no banco | 100% (tolerancia zero) |
| Alertas de margem ativados corretamente para os thresholds definidos | 100% em QA (testados com dados sinteticos) |
| Nenhum dado financeiro sensivelmente identificavel (email nao mascarado, Stripe ID) exposto no dashboard | 0 ocorrencias em QA |
| Export CSV gerado corretamente com emails mascarados | 100% das amostras testadas |

---

## 8. Dependencies

| Dependencia | Tipo | Notas |
|---|---|---|
| SPEC-PROD-042 (Sprint 36 — Admin Dashboard skeleton) | Predecessor | Rota protegida, tabela base, KPIs basicos ja implementados |
| SPEC-PROD-043 (Sprint 37 — Stripe Integration) | Mesmo sprint | Dados de compras reais (`Purchase` com `status = "completed"`, `amountCents`) necessarios para metricas de receita |
| `Purchase` model com campos Stripe | Schema | `amountCents`, `status`, `processedAt` — definidos por SPEC-PROD-043 e SPEC-ARCH correspondente |
| `docs/finops/COST-LOG.md` | Configuracao operacional | Custo estimado por PA em USD — valor configurado pelo finops-engineer, lido pelo dashboard |
| PointTransaction (Prisma, Sprint 9) | Schema existente | Fonte de dados para calculo de custo de IA por usuario |
| UserProgress (Prisma, Sprint 9) | Schema existente | `availablePoints`, `totalPoints`, `rank` |
| Trip (Prisma) | Schema existente | `destination` — necessario para grafico "Top 10 Destinos" |

---

## 9. Nota sobre o Calculo de Custo de IA

O custo de IA por usuario e calculado da seguinte forma no Sprint 37:

```
custo_ia_usuario_usd = SUM(PA_gasto_em_ai_usage) * custo_por_pa_usd
```

Onde `custo_por_pa_usd` e definido pelo finops-engineer baseado na formula:

```
custo_por_pa_usd = custo_medio_chamada_llm_usd / pa_medio_por_chamada
```

Este valor e uma estimativa conservadora para o Sprint 37. O calculo exato por request (com instrumentacao de tokens) sera implementado no Sprint 38.

A taxa de cambio USD/BRL usada para conversao no dashboard e uma taxa fixa atualizada manualmente pelo finops-engineer (ex: R$ 5,80/USD em Marco 2026). Uma integracao com API de cambio em tempo real nao esta no escopo do Sprint 37.

---

## 10. Change History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0.0 | 2026-03-23 | product-owner | Documento inicial — Sprint 37 planning. Aprimoramento do dashboard com metricas financeiras, alertas de margem, 4 graficos, exportacao CSV e filtros avancados |
