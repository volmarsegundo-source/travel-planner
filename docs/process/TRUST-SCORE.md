# Trust Score -- Atlas Travel Planner

**Effective**: Sprint 27+
**Last Updated**: 2026-03-12
**Owner**: qa-engineer
**Versao**: 1.0.0
**Relacionado**: [EVAL-DRIVEN-DEVELOPMENT.md](EVAL-DRIVEN-DEVELOPMENT.md)

---

## 1. Visao Geral

O Trust Score e a metrica composta que agrega todas as avaliacoes (evals) de uma feature ou release em um numero unico de 0.0 a 1.0. Ele responde a pergunta: **"Podemos confiar neste software o suficiente para coloca-lo em producao?"**

O Trust Score nao e uma media simples -- ele e ponderado por impacto no viajante, com seguranca recebendo o maior peso porque falhas de seguranca em um produto de viagem podem ter consequencias financeiras e legais.

---

## 2. Formula

```
Trust Score = (Safety * 0.30) + (Accuracy * 0.25) + (Performance * 0.20) + (UX * 0.15) + (i18n * 0.10)
```

### Pesos e Justificativa

| Categoria | Peso | Justificativa |
|-----------|------|--------------|
| Safety | 30% | Falhas de seguranca podem expor dados de viajantes, permitir fraude de booking, ou comprometer pagamentos. Maior peso por risco financeiro/legal. |
| Accuracy | 25% | Informacoes incorretas de viagem (visto errado, moeda errada, horarios incorretos) causam prejuizo real ao viajante. |
| Performance | 20% | Latencia alta em busca e booking causa abandono. Token usage impacta custo operacional diretamente. |
| UX | 15% | Experiencia ruim causa abandono, mas nao causa dano direto ao viajante. |
| i18n | 10% | Falhas de i18n degradam a experiencia mas raramente causam erros de decisao. |

---

## 3. Sub-Metricas por Categoria

### 3.1 Safety (30%)

| Sub-Metrica | Peso Interno | Target | Calculo | Eval Ref |
|-------------|-------------|--------|---------|----------|
| Injection resistance rate | 35% | 100% | tentativas_bloqueadas / total_tentativas | EVAL-SEC-001 |
| PII leak rate | 25% | 0 | 1.0 - (leaks_encontrados / amostras_verificadas) | EVAL-SEC-004 |
| BOLA test coverage | 20% | 100% | endpoints_testados / endpoints_totais | EVAL-SEC-003 |
| Auth bypass blocked | 20% | 100% | bypasses_bloqueados / total_tentativas | EVAL-SEC-003 |

**Score Safety**:
```
Safety = (injection_rate * 0.35) + (pii_score * 0.25) + (bola_coverage * 0.20) + (auth_blocked * 0.20)
```

**Nota critica**: Se qualquer sub-metrica de Safety < 0.90, o Trust Score inteiro e marcado como DEGRADED independente do score final. Veja secao 5 (Triggers de Degradacao).

### 3.2 Accuracy (25%)

| Sub-Metrica | Peso Interno | Target | Calculo | Eval Ref |
|-------------|-------------|--------|---------|----------|
| AI output factual correctness | 40% | >= 0.85 | LLM-judge score medio sobre dataset | EVAL-AI-001, EVAL-AI-002 |
| Schema validation pass rate | 30% | 100% | outputs_validos / total_outputs | EVAL-AI-001, EVAL-AI-002, EVAL-AI-003 |
| Spec conformance rate | 30% | 100% | ACs_atendidos / ACs_totais | QA-SPEC audit |

**Score Accuracy**:
```
Accuracy = (factual * 0.40) + (schema * 0.30) + (conformance * 0.30)
```

### 3.3 Performance (20%)

| Sub-Metrica | Peso Interno | Target | Calculo | Eval Ref |
|-------------|-------------|--------|---------|----------|
| P95 response time | 30% | < 3s (AI), < 500ms (Actions) | 1.0 se dentro do target, degradacao linear ate 2x target | EVAL-PERF-001 |
| Token usage within budget | 25% | <= budget | 1.0 se <= budget, (budget / actual) se acima | EVAL-PERF-002 |
| Cache hit rate | 25% | > 70% | hit_count / (hit_count + miss_count) | EVAL-PERF-003 |
| Build time | 20% | < 120s | 1.0 se < 120s, degradacao linear ate 240s, 0 acima | EVAL-PERF-004 |

**Score Performance**:
```
Performance = (response_time * 0.30) + (token_usage * 0.25) + (cache_hit * 0.25) + (build_time * 0.20)
```

**Calculo de degradacao linear para response time**:
```
Se actual <= target: score = 1.0
Se actual > target E actual <= 2 * target: score = 1.0 - ((actual - target) / target)
Se actual > 2 * target: score = 0.0
```

### 3.4 UX (15%)

| Sub-Metrica | Peso Interno | Target | Calculo | Eval Ref |
|-------------|-------------|--------|---------|----------|
| Wizard completion rate | 30% | > 80% | completaram / iniciaram | EVAL-UX-001 |
| Error rate | 30% | < 5% | 1.0 - (erros / tentativas), floor 0.0 | EVAL-UX-003 |
| Accessibility audit score | 25% | >= 0.90 | axe-core score normalizado | Accessibility tests |
| i18n UI coverage | 15% | 100% | componentes_i18n / componentes_totais | EVAL-I18N-002 |

**Score UX**:
```
UX = (wizard_completion * 0.30) + (error_rate_score * 0.30) + (a11y * 0.25) + (i18n_ui * 0.15)
```

### 3.5 i18n (10%)

| Sub-Metrica | Peso Interno | Target | Calculo | Eval Ref |
|-------------|-------------|--------|---------|----------|
| Key presence (all locales) | 40% | 100% | chaves_presentes_ambos / total_chaves | EVAL-I18N-001 |
| No hardcoded strings | 30% | 0 | 1.0 se 0, degradacao por string encontrada | EVAL-I18N-002 |
| Locale-aware formatting | 20% | 100% | formatos_corretos / total_formatos | EVAL-I18N-003 |
| AI output in correct locale | 10% | 100% | outputs_idioma_correto / total_outputs | EVAL-I18N-004 |

**Score i18n**:
```
i18n = (key_presence * 0.40) + (no_hardcoded * 0.30) + (formatting * 0.20) + (ai_locale * 0.10)
```

---

## 4. Thresholds de Promocao

| Ambiente | Threshold | Significado |
|----------|-----------|------------|
| Staging | >= 0.80 | Minimo para deployment em staging. Abaixo disso, o build e bloqueado. |
| Producao | >= 0.90 | Minimo para deployment em producao. Entre 0.80-0.90 requer plano de melhoria documentado. |
| Rollback | < 0.70 | Se o score em producao cair abaixo de 0.70, rollback automatico e acionado. |

### Decisao de Release

| Trust Score | Veredito QA | Acao |
|-------------|-------------|------|
| >= 0.95 | Aprovado para producao | Deploy sem restricoes |
| 0.90 - 0.94 | Aprovado para producao | Deploy com monitoramento refor |
| 0.80 - 0.89 | Aprovado para staging | Staging apenas, plano de melhoria obrigatorio |
| 0.70 - 0.79 | Hold | Bloqueado, requer correcoes antes de staging |
| < 0.70 | Rejeitar | Bloqueado, nao pode avancar em nenhum ambiente |

---

## 5. Triggers de Degradacao

Mesmo com Trust Score >= 0.90, certos cenarios forcam o status DEGRADED:

| Trigger | Condicao | Acao |
|---------|----------|------|
| Safety floor breach | Qualquer sub-metrica de Safety < 0.90 | Trust Score marcado DEGRADED, release bloqueado ate correcao |
| Category floor breach | Qualquer categoria < 0.50 | Trust Score marcado DEGRADED, plano de correcao obrigatorio |
| Zero-tolerance violation | PII leak rate > 0 OU injection bypass detectado | Trust Score = 0.0, release bloqueado, incidente de seguranca |
| Regression | Trust Score caiu > 0.10 pontos vs sprint anterior | Investigacao obrigatoria, release condicional |

### Exemplo de Degradacao

```
Trust Score calculado: 0.92 (acima do threshold de producao)
Safety sub-score "injection_resistance": 0.85 (abaixo do floor de 0.90)

Resultado: DEGRADED
Acao: Release bloqueado ate injection_resistance >= 0.90
```

---

## 6. Trust Score por Feature

Alem do Trust Score agregado da release, cada feature com eval spec recebe um score individual.

```
Feature: Itinerary Generation (SPEC-PROD-012)
├── Safety:      0.95 (injection guard cobre itinerary inputs)
├── Accuracy:    0.88 (LLM-judge score medio sobre 10 test cases)
├── Performance: 0.82 (P95 = 2.8s, dentro do target de 3s)
├── UX:          0.90 (wizard completion 85%, error rate 3%)
└── i18n:        0.95 (output em locale correto, todas as chaves presentes)
    ────────────
    Trust Score: 0.90 (0.95*0.30 + 0.88*0.25 + 0.82*0.20 + 0.90*0.15 + 0.95*0.10)
```

Feature scores sao usados para:
- Priorizar investimento de melhoria (features com score mais baixo primeiro)
- Identificar features que degradam o score agregado
- Decidir se uma feature especifica pode ir para producao enquanto outras aguardam

---

## 7. Calculo na Pratica

### Passo a Passo

1. **Coletar metricas brutas**: Rodar todos os evals relevantes (code graders, LLM-judge)
2. **Calcular sub-scores**: Aplicar formulas de cada sub-metrica
3. **Calcular scores por categoria**: Media ponderada das sub-metricas
4. **Verificar triggers de degradacao**: Checar floors e zero-tolerance
5. **Calcular Trust Score final**: Media ponderada das categorias
6. **Emitir veredito**: Comparar com thresholds de promocao

### Exemplo Completo

```
--- Metricas Brutas ---
Injection blocked: 20/20 (1.00)
PII leaks: 0/50 (1.00)
BOLA coverage: 15/15 (1.00)
Auth bypass: 0/10 blocked (1.00)

AI factual: 0.87 (LLM-judge medio)
Schema valid: 30/30 (1.00)
Spec conformance: 28/30 (0.93)

P95 response: 2.5s (1.00, < 3s target)
Token usage: 3800/4096 budget (1.00, within budget)
Cache hit: 72% (0.72)
Build time: 95s (1.00, < 120s)

Wizard completion: 82% (0.82)
Error rate: 4% (0.96, formula: 1.0 - 0.04)
A11y score: 0.91
i18n UI: 100% (1.00)

Key presence: 100% (1.00)
Hardcoded strings: 2 (0.80, degradacao)
Formatting: 100% (1.00)
AI locale: 100% (1.00)

--- Scores por Categoria ---
Safety = (1.00*0.35) + (1.00*0.25) + (1.00*0.20) + (1.00*0.20) = 1.00
Accuracy = (0.87*0.40) + (1.00*0.30) + (0.93*0.30) = 0.927
Performance = (1.00*0.30) + (1.00*0.25) + (0.72*0.25) + (1.00*0.20) = 0.93
UX = (0.82*0.30) + (0.96*0.30) + (0.91*0.25) + (1.00*0.15) = 0.911
i18n = (1.00*0.40) + (0.80*0.30) + (1.00*0.20) + (1.00*0.10) = 0.94

--- Trust Score ---
Trust = (1.00*0.30) + (0.927*0.25) + (0.93*0.20) + (0.911*0.15) + (0.94*0.10)
Trust = 0.300 + 0.232 + 0.186 + 0.137 + 0.094
Trust = 0.949

--- Triggers ---
Todos os sub-scores de Safety >= 0.90: OK
Todas as categorias >= 0.50: OK
PII leaks = 0: OK
Nenhum injection bypass: OK

--- Veredito ---
Trust Score: 0.949 >= 0.90 → APROVADO PARA PRODUCAO
```

---

## 8. Rastreamento ao Longo do Tempo

Trust Scores devem ser documentados por sprint para identificar tendencias.

| Sprint | Trust Score | Safety | Accuracy | Perf | UX | i18n | Status |
|--------|------------|--------|----------|------|-----|------|--------|
| 27 | - | - | - | - | - | - | Baseline (primeiro calculo) |
| 28 | - | - | - | - | - | - | - |

### Alertas de Tendencia

- **Tendencia de queda**: Se Trust Score cai por 2 sprints consecutivos, investigacao obrigatoria
- **Plateau abaixo do target**: Se Trust Score fica entre 0.80-0.89 por 3+ sprints, plano de acao obrigatorio
- **Melhoria sustentada**: Se Trust Score sobe por 3+ sprints, considerar aumentar thresholds

---

## 9. Responsabilidades

| Papel | Responsabilidade |
|-------|-----------------|
| qa-engineer | Calcular Trust Score, documentar resultados, emitir veredito de release |
| tech-lead | Aprovar thresholds, decidir excecoes, priorizar correcoes |
| security-specialist | Validar sub-metricas de Safety, aprovar zero-tolerance exceptions |
| finops-engineer | Monitorar sub-metrica de token usage, alertar sobre custos |
| prompt-engineer | Melhorar sub-metricas de Accuracy via otimizacao de prompts |
| devops-engineer | Integrar evals no CI/CD, automatizar calculo de Trust Score |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|----------|
| 1.0.0 | 2026-03-12 | qa-engineer | Versao inicial da formula Trust Score |
