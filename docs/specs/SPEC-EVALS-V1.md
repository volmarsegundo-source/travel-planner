---
id: SPEC-EVALS-V1
version: 1.0.0
status: proposed
owner: qa-engineer
date: 2026-04-17
related:
  - docs/process/EVAL-DRIVEN-DEVELOPMENT.md
  - docs/process/TRUST-SCORE.md
  - vitest.eval.config.ts
---

# SPEC-EVALS-V1 — Metodologia de Avaliação Contínua com Promptfoo

## 1. Contexto

O Atlas Travel Planner possui três features com output de IA (guia de destino, roteiro/itinerário, checklist) servindo dois locales (pt-BR e en). Atualmente, os evals rodam via Vitest com graders custom (LLM-as-judge, schema validation, injection resistance, i18n completeness, token budget). Esse setup funciona bem para testes de regressão de qualidade interna.

Esta spec introduz uma **camada complementar** usando Promptfoo como framework de avaliação local, adicionando:

- Datasets YAML declarativos por feature (guia, roteiro, checklist)
- Graders JS executáveis para cada dimensão do Trust Score
- Um mock provider para execução offline (sem custo de API)
- Gates de qualidade integráveis ao CI

O Promptfoo NÃO substitui os evals Vitest existentes. Ele adiciona uma visão de avaliação orientada a datasets com report visual (UI local) e mecanismo de grading padronizado.

## 2. Metodologia

### 2.1 Framework: Promptfoo (execução local)

- Configuração central: `tests/evals/promptfooconfig.yaml`
- Datasets YAML por feature em `tests/evals/datasets/`
- Graders JS customizados em `tests/evals/graders/`
- Provider mock em `tests/evals/providers/mock-provider.js`
- Execução: `npx promptfoo eval -c tests/evals/promptfooconfig.yaml`
- UI local: `npx promptfoo view` (abre dashboard no browser)

### 2.2 Relação com Evals Vitest Existentes

| Aspecto | Vitest Evals (existente) | Promptfoo Evals (novo) |
|---------|--------------------------|------------------------|
| Formato | TypeScript test files | YAML datasets + JS graders |
| Execução | `npm run eval` | `npx promptfoo eval -c tests/evals/promptfooconfig.yaml` |
| Visualização | JSON report | UI interativa local |
| Graders | Funções TS inline | Módulos JS reutilizáveis |
| Cobertura | Injection, schema, i18n, token, LLM-judge | Safety, accuracy, performance, UX, i18n |
| CI gate | `scripts/eval-gate.ts` | `tests/evals/scripts/gate.js` |

Ambos os sistemas coexistem. Recomendação: consolidar gradualmente os datasets JSON existentes (`docs/evals/datasets/*.json`) nos YAML do Promptfoo quando maturos.

## 3. Composite Trust Score

O Trust Score é uma métrica composta de 0.0 a 1.0 que agrega cinco dimensões, conforme definido em `docs/process/TRUST-SCORE.md`.

### 3.1 Fórmula

```
Trust Score = (Safety * 0.30) + (Accuracy * 0.25) + (Performance * 0.20) + (UX * 0.15) + (i18n * 0.10)
```

### 3.2 Pesos e Justificativa

| Dimensão | Peso | Justificativa |
|----------|------|---------------|
| Safety | 30% | Falhas de segurança expõem dados de viajantes, fraude de booking, pagamentos comprometidos. Maior peso por risco financeiro/legal. |
| Accuracy | 25% | Informações incorretas de viagem (visto errado, moeda errada, horários) causam prejuízo real ao viajante. |
| Performance | 20% | Latência alta causa abandono. Token usage impacta custo operacional diretamente. |
| UX | 15% | Experiência ruim causa abandono, mas não causa dano direto ao viajante. |
| i18n | 10% | Falhas de i18n degradam experiência mas raramente causam erros de decisão. |

### 3.3 Mapeamento Dimensão -> Grader

| Dimensão | Grader JS | O Que Valida |
|----------|-----------|-------------|
| Safety | `graders/safety.js` | Números de emergência corretos por país (190/192/193 Brasil, 911 EUA/Canadá, 112 Europa), ausência de PII no output |
| Accuracy | `graders/accuracy.js` | Schema JSON válido, campos obrigatórios presentes, stub para LLM-as-judge |
| Performance | `graders/performance.js` | Tempo de resposta do provider dentro do budget |
| UX | `graders/ux.js` | Campos obrigatórios no output (destination, days, safety), língua correta |
| i18n | `graders/i18n.js` | Moeda correta para locale, formato de data, idioma consistente |

## 4. Gates de Qualidade

### 4.1 Thresholds por Ambiente

| Ambiente | Trust Score Mínimo | Ação em Falha |
|----------|-------------------|---------------|
| PR (CI) | >= 0.80 | Bloqueia merge |
| Staging | >= 0.85 | Bloqueia deploy para produção |
| Production | >= 0.90 | Rollback imediato + playbook trust-score-drop |

### 4.2 Regra de Degradação Crítica

Se **qualquer** sub-métrica de Safety < 0.90, o Trust Score inteiro é marcado como DEGRADED independente do score final composto. Isso impede que scores altos em outras dimensões mascarem falhas de segurança.

### 4.3 Scripts de Gate

- `tests/evals/scripts/gate.js` — lê resultados do Promptfoo, calcula Trust Score, retorna exit code 0 (pass) ou 1 (fail)
- `tests/evals/scripts/drift.js` — compara resultados atuais com baseline, alerta se drift > 10%
- `tests/evals/scripts/scheduled.js` — execução completa com salvamento de histórico
- `tests/evals/scripts/trend.js` — exibe tendência do Trust Score ao longo do tempo

## 5. Datasets Mínimos

### 5.1 Guia de Destino (`datasets/guide.yaml`)

5 casos obrigatórios cobrindo variedade geográfica e de complexidade:

| Caso | Destino | Tipo | Idioma | Foco |
|------|---------|------|--------|------|
| GD-01 | Piracicaba, SP | doméstico | pt-BR | Cidade pequena brasileira, números de emergência BR |
| GD-02 | Bonito, MS | doméstico | pt-BR | Ecoturismo, sazonalidade |
| GD-03 | Lisboa, Portugal | internacional | pt-BR | Moeda EUR, tomada tipo F, visto Schengen |
| GD-04 | Tokyo, Japão | internacional | en | Moeda JPY, tomada A/B, diferença cultural extrema |
| GD-05 | Jacutinga, MG | doméstico | pt-BR | Cidade pequena com pouca info online, teste anti-alucinação |

### 5.2 Roteiro/Itinerário (`datasets/plan.yaml`)

6 casos incluindo multi-city:

| Caso | Destino | Dias | Orçamento | Foco |
|------|---------|------|-----------|------|
| PL-01 | Piracicaba | 3 | R$1500 | Weekend trip doméstica |
| PL-02 | Bonito | 5 | R$3000 | Ecoturismo com atividades |
| PL-03 | Lisboa | 7 | EUR 2000 | Europeu, moeda estrangeira |
| PL-04 | Tokyo | 10 | USD 3000 | Longa duração, custo alto |
| PL-05 | Jacutinga | 2 | R$800 | Ultra-curto, cidade pequena |
| PL-06 | SP->Rio->Floripa | 9 | R$5000 | Multi-city, dias de trânsito |

### 5.3 Checklist (`datasets/checklist.yaml`)

5 casos cobrindo perfis de viajante variados:

| Caso | Destino | Tipo | Perfil | Foco |
|------|---------|------|--------|------|
| CK-01 | Bonito | doméstico | solo adulto | Checklist básico doméstico |
| CK-02 | Lisboa | internacional | casal | Documentação, moeda, adaptador |
| CK-03 | Orlando | internacional | família com crianças | Itens pediátricos, documentos menores |
| CK-04 | Gramado | doméstico | idosos | Medicamentos, acessibilidade |
| CK-05 | Tokyo | internacional | restrições alimentares | Alergias, cards de tradução |

## 6. Integração CI

### 6.1 Workflow Proposto (GitHub Actions)

```yaml
# .github/workflows/eval.yml (referência — não criado nesta spec)
name: Eval Gate
on:
  pull_request:
    paths:
      - 'src/lib/prompts/**'
      - 'src/server/services/ai*'
      - 'tests/evals/**'
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx promptfoo eval -c tests/evals/promptfooconfig.yaml --output eval-results.json
      - run: node tests/evals/scripts/gate.js eval-results.json
```

### 6.2 Quando Executar

| Trigger | Escopo | Custo |
|---------|--------|-------|
| PR que altera `src/lib/prompts/` | Todos os datasets | Mock provider (custo zero) |
| PR que altera `src/server/services/ai*` | Todos os datasets | Mock provider (custo zero) |
| Merge em main | Todos os datasets | Mock provider (custo zero) |
| Release para staging | Todos os datasets + LLM-as-judge | Custo de API (~$0.50/run) |
| Semanal (scheduled) | Todos os datasets + LLM-as-judge | Custo de API (~$0.50/run) |

## 7. Monitoramento Contínuo

### 7.1 Histórico

Cada execução do `eval:scheduled` salva resultados em `docs/evals/history/` com timestamp. O script `eval:trend` lê esse histórico e exibe a evolução do Trust Score.

### 7.2 Alertas

| Condição | Severidade | Ação |
|----------|-----------|------|
| Trust Score < threshold do ambiente | P0/P1 | Playbook `trust-score-drop.md` |
| Drift > 10% em qualquer dimensão | P2 | Playbook `drift-detected.md` |
| Injection resistance < 100% | P0 | Playbook `injection-detected.md` |

### 7.3 Baselines

- Baseline inicial salvo em `docs/evals/baselines/` após primeira execução completa
- Atualizado após melhorias confirmadas (drift positivo intencional)
- Nunca atualizado após regressão — o baseline antigo é a referência correta

## 8. Histórico de Alterações

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 1.0.0 | 2026-04-17 | qa-engineer | Spec inicial — metodologia Promptfoo, datasets, gates, CI |
