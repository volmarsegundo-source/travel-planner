# Atlas — Sistema de Gamificação: Documento Aprovado

**Versão:** 1.0 — Aprovado pelo PO  
**Data:** 21/03/2026  
**Status:** ✅ Aprovado — pronto para spec SDD

---

## 1. Visão Geral da Economia

O Atlas opera com uma **moeda única: Pontos Atlas (PA)**.

- **Ganho:** completar fases, expedições, conquistas e bônus
- **Gasto:** uso de IA (checklist, guia, roteiro, regenerações)
- **Nível:** determinado pelo **PA lifetime acumulado** — nunca diminui ao gastar
- **Sem multiplicadores** — economia linear e previsível

Ciclo virtuoso: avançar nas fases → ganhar PA → usar IA → planejar melhor → criar mais expedições.

---

## 2. Onboarding — Bônus Inicial ✅

| Ação                              | PA Ganhos |
|-----------------------------------|-----------|
| Criar conta                       | +50       |
| Completar tutorial de pontos      | +100      |
| Preencher perfil (nome, cidade)   | +30       |
| **Total onboarding**              | **+180**  |

**Tutorial:** modal interativo de 3 passos:
1. "Ganhe pontos completando fases da sua expedição"
2. "Gaste pontos para gerar checklists, guias e roteiros com IA"
3. "Suba de nível e desbloqueie conquistas"

> O bônus de 180 PA garante a 1ª expedição completa com IA sem pagar nada.

---

## 3. Tabela de Pontuação por Ação ✅

### 3.1 Ganho por Fase (por expedição)

| Fase | Nome            | Ação                                   | PA Ganhos |
|------|-----------------|----------------------------------------|-----------|
| 1    | O Chamado       | Preencher destino + datas + tipo       | +15       |
| 2    | As Preferências | Selecionar todas as preferências       | +20       |
| 3    | O Preparo       | Revisar checklist (marcar ≥1 item)     | +25       |
| 4    | A Logística     | Completar 3 steps (transporte/hosp/mob)| +30       |
| 5    | Guia do Destino | Visualizar o guia gerado               | +40       |
| 6    | O Roteiro       | Visualizar o roteiro gerado            | +50       |
|      |                 | **Subtotal por expedição completa**    | **+180**  |

### 3.2 Bônus de Expedição

| Ação                                       | PA Ganhos |
|--------------------------------------------|-----------|
| Completar todas as 6 fases (1ª vez)        | +100      |
| Completar 2ª expedição                     | +50       |
| Completar 5ª expedição                     | +150      |
| Completar 10ª expedição                    | +300      |
| Expedição internacional (1ª vez)           | +75       |
| Expedição com grupo/família (1ª vez)       | +50       |

### 3.3 Ações Avulsas

| Ação                                       | PA Ganhos |
|--------------------------------------------|-----------|
| Editar perfil completo (foto, bio, cidade) | +20       |
| Voltar e editar fase já completa           | +5        |
| Login diário (1x por dia)                  | +5        |
| Streak de 7 dias consecutivos              | +30       |
| Streak de 30 dias consecutivos             | +100      |

---

## 4. Consumo de Pontos — Uso da IA ✅

### 4.1 Geração (primeira vez na expedição)

| Funcionalidade            | Fase | Custo PA | Observação                        |
|---------------------------|------|----------|-----------------------------------|
| Gerar Checklist           | 3    | -30      | Auto-gerado ao entrar na fase     |
| Gerar Guia do Destino     | 5    | -50      | Auto-gerado ao entrar na fase     |
| Gerar Roteiro/Itinerário  | 6    | -80      | Auto-gerado ao entrar na fase     |
| **Total IA por expedição**|      | **-160** |                                   |

### 4.2 Regeneração (gerar novamente) — CUSTO IGUAL À GERAÇÃO

| Funcionalidade            | Custo PA | Observação                                |
|---------------------------|----------|-------------------------------------------|
| Regenerar Checklist       | -30      | Mesmo custo da geração — desencoraja spam |
| Regenerar Guia            | -50      | Mesmo custo da geração                    |
| Regenerar Roteiro         | -80      | Mesmo custo da geração                    |

> **Decisão PO:** regeneração custa o mesmo que geração original para proteger custos com API e incentivar o usuário a aceitar/editar em vez de regenerar.

### 4.3 Funcionalidades futuras (reserva de design)

| Funcionalidade                     | Custo PA  | Status   |
|------------------------------------|-----------|----------|
| Gerar relatório PDF da viagem      | -40       | Fase 2   |
| Tradução do guia para outro idioma | -30       | Roadmap  |
| Sugestão de atividades extras      | -25       | Roadmap  |
| Chat com IA sobre o destino        | -10/msg   | Roadmap  |

---

## 5. Balanço Econômico

### 5.1 Primeira Expedição (usuário novo)

```
Onboarding:                    +180 PA
Fases 1-6:                     +180 PA
Bônus 1ª expedição completa:   +100 PA
                              ─────────
Ganho total:                   +460 PA

Custo IA (checklist+guia+rot): -160 PA
                              ─────────
Saldo após 1ª expedição:      +300 PA
Nível atingido:                Desbravador (460 lifetime)
```

### 5.2 Segunda Expedição

```
Saldo anterior:                +300 PA
Fases 1-6:                     +180 PA
Bônus 2ª expedição:            +50 PA
                              ─────────
Ganho total:                   +530 PA (690 lifetime)

Custo IA:                      -160 PA
                              ─────────
Saldo após 2ª expedição:      +370 PA
Nível atingido:                Navegador (690 lifetime)
```

### 5.3 Cenário com Regenerações

```
Expedição normal:              +180 PA (fases) -160 PA (IA) = +20 PA líquido
Com 1 regeneração de roteiro:  +180 PA -160 PA -80 PA = -60 PA líquido
Com 2 regenerações (guia+rot): +180 PA -160 PA -130 PA = -110 PA líquido
```

> **Ponto de compra:** a partir da 3ª expedição se o usuário regenerar 1+ vez por expedição. Sem regenerações, o saldo é sempre positivo.

---

## 6. Sistema de Níveis — Aventura/RPG ✅

| Nível | Nome         | PA Lifetime | Expedições Estimadas | Ícone |
|-------|-------------|-------------|----------------------|-------|
| 1     | Novato       | 0           | 0                    | 🧭    |
| 2     | Desbravador  | 300         | ~1                   | 🗺️    |
| 3     | Navegador    | 700         | ~2                   | ⛵    |
| 4     | Capitão      | 1.500       | ~4                   | 🚢    |
| 5     | Aventureiro  | 3.500       | ~8-10                | ⚔️    |
| 6     | Lendário     | 7.000       | ~18-20               | 👑    |

**Regras:**
- Nível NUNCA diminui (baseado em lifetime, não saldo)
- Subir de nível → toast celebratório (não bloqueante)
- Nível visível no badge do header + página Meu Atlas
- Lendário é o teto (sub-níveis futuros: Lendário I, II, III — a definir)

---

## 7. Badges e Conquistas ✅

### 7.1 Explorador (expedições)

| Badge              | Condição                           | PA Bônus | Ícone |
|--------------------|-------------------------------------|----------|-------|
| Primeira Viagem    | Completar 1ª expedição             | +50      | 🎒    |
| Viajante Frequente | Completar 5 expedições             | +100     | ✈️    |
| Globetrotter       | Completar 10 expedições            | +200     | 🌍    |
| Marco Polo         | Completar 20 expedições            | +500     | 🏛️    |

### 7.2 Perfeccionista (qualidade)

| Badge              | Condição                            | PA Bônus | Ícone |
|--------------------|--------------------------------------|----------|-------|
| Detalhista         | Preencher 100% do perfil            | +30      | 🔍    |
| Planejador Nato    | Completar todas as 6 fases sem pular| +50      | 📋    |
| Zero Pendências    | Expedição com TODAS as fases verdes | +75      | ✅    |
| Revisor            | Editar e melhorar 3+ expedições     | +40      | ✏️    |

### 7.3 Aventureiro (variedade)

| Badge                | Condição                             | PA Bônus | Ícone |
|----------------------|---------------------------------------|----------|-------|
| Sem Fronteiras       | 1ª expedição internacional           | +75      | 🛂    |
| Em Família           | 1ª expedição tipo família/grupo      | +50      | 👨‍👩‍👧  |
| Solo Explorer        | 1ª expedição solo                    | +40      | 🧗    |
| Poliglota            | Usar o app em 2+ idiomas            | +30      | 🗣️    |
| Multicontinental     | Expedições em 3+ continentes        | +200     | 🌐    |

### 7.4 Veterano (engajamento)

| Badge              | Condição                           | PA Bônus | Ícone |
|--------------------|-------------------------------------|----------|-------|
| Fiel               | 7 dias consecutivos de login       | +30      | 🔥    |
| Maratonista        | 30 dias consecutivos de login      | +100     | 💎    |
| Fundador           | Conta criada durante o Beta        | +200     | ⭐    |
| Aniversário        | 1 ano de conta ativa               | +150     | 🎂    |

---

## 8. Pacotes de Compra de Pontos (Monetização) ✅

| Pacote          | PA Inclusos | Preço      | PA/R$ | Destaque       |
|-----------------|-------------|------------|-------|----------------|
| Explorador      | 200 PA      | R$ 14,90   | 13.4  |                |
| Navegador       | 500 PA      | R$ 29,90   | 16.7  | Mais popular   |
| Capitão         | 1.200 PA    | R$ 59,90   | 20.0  | Melhor custo   |
| Lendário        | 3.000 PA    | R$ 119,90  | 25.0  | Premium        |

**Regras:**
- Pontos comprados SÃO contabilizados no lifetime (sobem nível)
- Sem expiração — pontos comprados nunca vencem
- Sem assinatura — modelo pay-as-you-go
- Alerta amigável quando saldo < custo da próxima ação de IA
- Tela de compra acessível pelo badge no header (quando saldo baixo)

**Referência de valor:** R$14,90 = 200 PA = ~1.25 expedições com IA (sem regeneração)

---

## 9. UX — Onde a Gamificação Aparece ✅

| Local                  | O que exibe                                        |
|------------------------|----------------------------------------------------|
| Header (badge)         | Ícone do nível + PA atual (saldo) — sem link       |
| Meu Atlas              | Perfil: nível, PA lifetime, badges, mapa de pins   |
| Transição entre fases  | "+15 PA" animação sutil no badge do header          |
| Antes de gerar IA      | Modal: "Esta ação custa 50 PA. Saldo: 320 PA. Gerar?"|
| Saldo insuficiente     | Modal: "Saldo insuficiente" + botão "Comprar PA"   |
| Subida de nível        | Toast: "Parabéns! Você é Navegador ⛵"              |
| Conquistas             | Grid de badges (desbloqueados coloridos, travados cinza)|

**Fluxo de gasto:**
```
Usuário entra na Phase 5
→ Modal: "Gerar Guia do Destino custa 50 PA. Seu saldo: 320 PA. Gerar?"
→ [Gerar] → IA processa → Guia aparece → Badge atualiza no header
→ [Cancelar] → Volta para a fase anterior

Se saldo < 50:
→ Modal: "Saldo insuficiente para gerar o Guia (50 PA). Saldo: 30 PA."
→ [Comprar PA] → Tela de pacotes
→ [Ganhar mais pontos] → Dicas de como ganhar PA
```

---

## 10. Regras de Negócio — Consolidado

1. **Moeda única (PA)** — sem complexidade de múltiplas moedas
2. **Nível = lifetime** — gastar não rebaixa, incentiva uso
3. **Sem multiplicadores** — economia linear e previsível
4. **IA nunca é gratuita** — sempre cobra PA, primeira geração e regeneração ao mesmo custo
5. **Confirmação antes de gastar** — modal com custo + saldo antes de toda ação de IA
6. **Saldo zero → compra** — nunca bloqueia, oferece pacotes
7. **Badges = PA bônus** — conquistas são recompensadas, não apenas cosméticas
8. **Sem expiração** — pontos comprados ou ganhos nunca vencem
9. **Tutorial obrigatório** — novo usuário passa pelo onboarding antes de tudo
10. **Transparência total** — histórico de ganhos/gastos visível no Meu Atlas
11. **UX de comunicação** — regras compreensíveis em <60s, tooltips contextuais, indicadores preditivos
12. **Margem validada** — Prompt Engineer + FinOps aprovam antes de lançar, meta ~100%
13. **Dashboard admin** — owner monitora Lucro por Usuário em tempo real

---

## 11. Considerações Fundamentais — Transparência, Margem e Governança

### 11.1 Comunicação e Transparência do Sistema de Pontos

A comunicação sobre consumo de PA é **crítica para a confiança do usuário**. Uma economia mal comunicada gera frustração, churn e reviews negativas. Requisitos:

**Para o UX Designer (spec obrigatória):**
- Definir a melhor abordagem visual para tornar as regras de pontuação **claras e imediatamente compreensíveis** — o usuário nunca deve ser surpreendido por um gasto
- Projetar uma **página "Como funciona"** acessível de qualquer ponto do app, com linguagem simples e exemplos visuais
- Projetar **tooltips contextuais** nos pontos de gasto (fases 3, 5, 6) explicando o custo antes de qualquer ação
- Projetar **histórico de transações** no Meu Atlas — lista cronológica de ganhos e gastos com ícones e descrição
- Garantir que o **saldo atual** esteja sempre visível e atualizado no header
- Projetar o **fluxo de saldo insuficiente** com empatia — sem linguagem punitiva, foco em opções
- Projetar **indicadores preditivos**: ao entrar numa expedição, mostrar estimativa de custo total de IA (160 PA) vs saldo atual
- Testar a comunicação com testes de usabilidade — o usuário deve entender o sistema em menos de 60 segundos

**Princípio:** se o usuário precisar pensar para entender quanto vai gastar, a UX falhou.

### 11.2 Análise de Margem — Meta de 100% de Lucro

> **Atualizado no Sprint 42** — ver `docs/finops/SPRINT-42-FINOPS-REVIEW.md` para análise completa.
> Autores da revisão: `prompt-engineer` + `finops-engineer` + `tech-lead`

O **Prompt Engineer (agente #11)** e o **FinOps Engineer (agente #13)** revisam conjuntamente os custos reais da IA e validam que as regras de pontuação geram margem sustentável.

**Custos reais por geração (fonte: `src/lib/cost-calculator.ts:15-30`, Sprint 42):**

| Fase | Função | Output médio | Gemini Flash | Haiku 4.5 | Sonnet 4.6 |
|---|---|---:|---:|---:|---:|
| 3 | Checklist | ~1.200 tok | $0,00052 | $0,0051 | $0,0192 |
| 5 | Guide | ~3.500 tok | $0,00153 | $0,0150 | $0,0564 |
| 6 | Plan (7 dias) | ~6.500 tok | $0,00274 | $0,0271 | $0,1017 |
| **Total expedição** | | | **$0,00479** | **$0,0472** | **$0,1773** |

**Conversão PA → USD** (câmbio R$5,00 = $1,00, média ponderada dos pacotes): **1 PA ≈ $0,00489**.

**Receita por expedição**: 160 PA × $0,00489 = **$0,783**.

**Margem bruta real (Sprint 42):**

| Stack | Custo | Receita | Margem |
|---|---:|---:|---:|
| **Gemini Flash (primário)** | $0,00479 | $0,783 | **16.254 %** |
| Haiku 4.5 (fallback) | $0,047 | $0,783 | 1.565 % |
| Sonnet 4.6 (premium opt-in) | $0,177 | $0,783 | 342 % |
| Hybrid Haiku+Sonnet forçado | $0,123 | $0,783 | 537 % |

**Meta de margem bruta: ~100% sobre o custo de IA — ATENDIDA com folga em todos os cenários.** Decisão Sprint 42: manter preços atuais de pacotes (R$14,90–R$119,90) e custos de 30/50/80 PA por fase.

**Custo de onboarding (180 PA grátis = 1 expedição IA completa):**

| Stack | CAC técnico por usuário novo |
|---|---:|
| Gemini Flash | $0,005 |
| Haiku fallback | $0,047 |
| Sonnet premium | $0,177 |

**Break-even**: com stack Gemini primário, cada usuário pago cobre ~**560 usuários free** — conversão necessária de apenas **0,2%** para sustentar o modelo freemium. Amplamente viável.

**Ceilings mensais aprovados (Sprint 42):**

| Env var | Valor | Capacidade (expedições/mês) |
|---|---:|---:|
| `AI_MONTHLY_BUDGET_USD` (global) | $100 | — |
| `AI_MONTHLY_BUDGET_GEMINI_USD` | $40 | ~8.350 |
| `AI_MONTHLY_BUDGET_ANTHROPIC_USD` | $40 | ~850 (Haiku) / ~226 (Sonnet) |
| Buffer | $20 | Picos/premium |

Validação por sprint: se ceiling exceder 70% em 2 sprints consecutivos, acionar revisão FinOps extraordinária.

**Otimizações do Prompt Engineer para maximizar margem:**
- Garantir que **prompt caching** está ativo em todas as gerações (reduz custo ~50-90%)
- Avaliar se prompts podem ser encurtados sem perder qualidade
- Analisar uso de modelos menores (Haiku) para checklist vs modelos maiores (Sonnet) para roteiro
- Medir tokens médios de input/output por tipo de geração
- Propor limites de tamanho de resposta por funcionalidade para controlar custo

**Entregável final:** relatório conjunto Prompt Engineer + FinOps com recomendação de:
1. Preço final dos pacotes (confirmar ou ajustar os R$14,90 a R$119,90)
2. Custo em PA por funcionalidade (confirmar ou ajustar os 30/50/80)
3. Projeção de margem por cenário (usuário free, casual, power user)

### 11.3 Dashboard Administrativo — Governança e Monetização

Implementar um **painel administrativo** acessível apenas pelo owner da aplicação para acompanhar a saúde financeira e operacional do Atlas.

**Métricas obrigatórias (MVP do admin):**

| Categoria | Métrica | Visualização |
|-----------|---------|--------------|
| **Por Usuário** | Gasto com IA (custo real USD) | Tabela com ranking |
| | Receita (PA comprados × valor) | Tabela com ranking |
| | **Lucro por usuário** (receita - custo) | Indicador colorido (verde/vermelho) |
| | PA lifetime acumulados | Coluna |
| | PA saldo atual | Coluna |
| | Nível atual | Badge |
| | Nº expedições | Coluna |
| **Agregado** | Total de usuários (free vs pagantes) | Card + gráfico |
| | Receita total do período | Card + gráfico de linha |
| | Custo total IA do período | Card + gráfico de linha |
| | **Margem bruta** (receita - custo IA) | Card com % |
| | ARPU (receita média por usuário pagante) | Card |
| | Conversão free → pagante | Card com % |
| | PA emitidos vs PA consumidos | Gráfico de balanço |
| **Operacional** | Chamadas de IA por dia/semana/mês | Gráfico de linha |
| | Regenerações por dia (indicador de custo extra) | Gráfico de linha |
| | Top destinos mais planejados | Ranking |
| | Distribuição de níveis dos usuários | Gráfico de pizza |

**Fórmula central do dashboard:**
```
Lucro por Usuário = Receita por Usuário - Gasto IA por Usuário

Onde:
- Receita por Usuário = soma dos pacotes comprados pelo usuário
- Gasto IA por Usuário = soma dos custos reais (USD→BRL) de todas as 
  chamadas de IA feitas pelo usuário (geração + regeneração)
```

**Alertas automáticos:**
- Margem bruta < 80% → alerta amarelo
- Margem bruta < 50% → alerta vermelho + sugestão de ajuste de preços
- Usuário com custo > receita por 3+ meses → flag no painel
- Pico de regenerações (>2x média) → possível abuso ou insatisfação com qualidade

**Requisitos técnicos:**
- Rota protegida (/admin) com autenticação de owner
- Dados atualizados em near-real-time (polling a cada 5 min ou webhook)
- Exportação de relatórios em CSV/PDF
- Filtros por período (dia/semana/mês/custom)
- Responsivo mas otimizado para desktop

**Spec requerida:** SPEC-PROD + SPEC-UX + SPEC-TECH + SPEC-SEC (rota admin sensível)

---

## 12. Resumo das Decisões do PO

| # | Decisão | Resultado |
|---|---------|-----------|
| 1 | Onboarding | 180 PA (50 conta + 100 tutorial + 30 perfil) |
| 2 | Pontos por fase | Progressivo: 15→20→25→30→40→50 = 180/expedição |
| 3 | Custo IA | Checklist 30 / Guia 50 / Roteiro 80 = 160 total |
| 4 | Regeneração | Custo IGUAL à geração (30/50/80) |
| 5 | Níveis | 6 níveis RPG: Novato→Desbravador→Navegador→Capitão→Aventureiro→Lendário |
| 6 | Badges | 4 categorias, 16 badges com PA bônus |
| 7 | Multiplicadores | REMOVIDOS — economia linear |
| 8 | Pacotes | 4 tiers: R$14,90 / R$29,90 / R$59,90 / R$119,90 |
| 9 | UX gasto | Confirmação modal antes de cada ação de IA |
| 10| Saldo zero | Oferece compra de pacote (sem bloqueio) |
| 11| Transparência | UX deve tornar regras claras em <60s — spec obrigatória |
| 12| Margem | Prompt Engineer + FinOps devem validar ~100% de margem bruta |
| 13| Dashboard admin | Painel com Lucro por Usuário (receita - custo IA) como métrica central |
