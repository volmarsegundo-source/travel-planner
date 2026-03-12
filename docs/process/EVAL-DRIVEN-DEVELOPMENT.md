# Eval-Driven Development (EDD) -- Atlas Travel Planner

**Effective**: Sprint 27+
**Last Updated**: 2026-03-12
**Owner**: qa-engineer (processo), tech-lead (aprovacao)
**Versao**: 1.0.0
**Relacionado**: [SDD-PROCESS.md](../specs/SDD-PROCESS.md), [TRUST-SCORE.md](TRUST-SCORE.md)

---

## 1. Visao Geral

Eval-Driven Development (EDD) e a extensao natural do Spec-Driven Development (SDD) para cobrir a **qualidade continua** dos outputs da aplicacao -- especialmente outputs gerados por IA, onde testes unitarios tradicionais sao insuficientes.

Enquanto SDD define O QUE construir (specs sao a fonte de verdade), EDD define QUAO BEM o sistema entrega valor (evals verificam qualidade em escala).

**Por que EDD agora?** O Atlas Travel Planner possui 3 features com output de IA (itinerario, guia de destino, checklist), 2 locales (en/pt-BR), camadas de seguranca contra injecao de prompt, e 1776+ testes. No entanto, nenhum desses testes avalia a **qualidade semantica** dos outputs de IA. Um itinerario pode ser JSON valido mas incoerente; um guia pode ter informacoes desatualizadas; um checklist pode ignorar requisitos de visto. EDD preenche essa lacuna.

---

## 2. Principios Fundamentais

### Principio 1: Evals Sao a Espinha Dorsal da Qualidade

- Specs definem O QUE. Testes verificam SE funciona. Evals verificam QUAO BEM funciona.
- Cada spec (SPEC-PROD, SPEC-UX, SPEC-ARCH) pode ter criterios de eval associados (EVAL-XXX).
- Evals nao substituem testes -- complementam. Um teste verifica que o JSON e valido; um eval verifica que o conteudo e relevante, preciso e culturalmente adequado.

### Principio 2: Evals Antes da Implementacao

- Antes de implementar uma feature com IA, os criterios de eval devem ser definidos.
- Datasets de eval sao criados junto com os acceptance criteria da spec.
- Isso evita o vies de "ajustar o eval ao output" -- o output deve atender o eval, nao o contrario.

### Principio 3: Evals Automaticos e Continuos

- Evals com graders automaticos (code graders, Zod validation) rodam a cada commit relevante.
- Evals com LLM-as-judge rodam por sprint (custo controlado).
- Evals com human grading rodam sob demanda (novas features, mudancas de prompt).
- Resultados sao rastreados ao longo do tempo para detectar regressoes de qualidade.

### Principio 4: Confiar Mas Verificar

- Outputs de IA sao probabilisticos -- mesmo com prompts perfeitos, a qualidade varia.
- EDD combina verificacao automatizada (estrutura, schema, seguranca) com oversight humano (relevancia, sensibilidade cultural).
- Thresholds de confianca determinam quando human review e necessario.

### Principio 5: Evals Evoluem com o Produto

- Datasets de eval sao documentos vivos -- atualizados quando novas features, destinos ou edge cases sao descobertos.
- Cada dataset tem versionamento semantico no campo `version`.
- Evals obsoletos sao descontinuados (nunca deletados) e marcados com `deprecated: true`.

---

## 3. Tipos de Eval para Atlas Travel Planner

### 3.1 AI Output Evals

Avaliam a qualidade semantica dos outputs gerados por IA.

| Eval | Feature | O Que Avalia | Grader |
|------|---------|-------------|--------|
| EVAL-AI-001 | Itinerario | Estrutura dia-a-dia, coerencia, orcamento, adequacao ao perfil | Code + LLM-judge |
| EVAL-AI-002 | Guia de Destino | Precisao factual, 10 secoes obrigatorias, sensibilidade cultural | Code + LLM-judge |
| EVAL-AI-003 | Checklist | Relevancia por tipo de viagem, prioridades, completude | Code + LLM-judge |

**Metricas**:
- **Estrutura**: Output adere ao JSON schema esperado (code grader, binario)
- **Relevancia**: Conteudo e relevante para o destino, perfil e contexto (LLM-judge, 0-1)
- **Coerencia**: Atividades fazem sentido em sequencia, horarios nao conflitam (LLM-judge, 0-1)
- **Locale-awareness**: Resposta no idioma correto, formatacao local (code grader, binario)
- **Budget-awareness**: Custos estimados dentro do orcamento fornecido (code grader, 0-1)

### 3.2 UX Evals

Avaliam a experiencia do viajante nos fluxos da aplicacao.

| Eval | Feature | O Que Avalia | Grader |
|------|---------|-------------|--------|
| EVAL-UX-001 | Wizard Expedition | Taxa de completude por fase, drop-off por step | Code (analytics) |
| EVAL-UX-002 | Busca de Destino | Tempo para selecionar destino, taxa de erro | Code (timing) |
| EVAL-UX-003 | Fluxo de Booking | Erros por step, recovery rate | Code (analytics) |

**Metricas**:
- **Taxa de completude**: % de usuarios que completam o fluxo inteiro
- **Taxa de erro**: % de tentativas que resultam em erro visivel
- **Tempo na tarefa**: Tempo medio para completar cada step
- **Drop-off por step**: Em qual step do wizard os usuarios abandonam

### 3.3 Security Evals

Avaliam a resistencia do sistema a ataques.

| Eval | Feature | O Que Avalia | Grader |
|------|---------|-------------|--------|
| EVAL-SEC-001 | Injection Guard | Resistencia a prompt injection (EN + pt-BR) | Code (regex + result check) |
| EVAL-SEC-002 | XSS Prevention | Sanitizacao de payloads XSS em inputs | Code (DOM check) |
| EVAL-SEC-003 | BOLA Prevention | Isolamento de recursos entre usuarios | Code (HTTP status check) |
| EVAL-SEC-004 | PII Leak Detection | Dados sensiveis nao aparecem em logs ou responses | Code (pattern scan) |

**Metricas**:
- **Injection block rate**: % de tentativas de injecao bloqueadas (target: 100%)
- **PII leak rate**: Numero de vazamentos de PII detectados (target: 0)
- **BOLA coverage**: % de endpoints com teste de isolamento de usuario
- **Auth bypass rate**: % de tentativas de bypass que sucederam (target: 0%)

### 3.4 Performance Evals

Avaliam tempo de resposta, consumo de tokens e eficiencia de cache.

| Eval | Feature | O Que Avalia | Grader |
|------|---------|-------------|--------|
| EVAL-PERF-001 | AI Response Time | P95 latencia de chamadas AI | Code (timing) |
| EVAL-PERF-002 | Token Usage | Tokens consumidos por tipo de chamada | Code (counter) |
| EVAL-PERF-003 | Cache Hit Rate | Efetividade do cache Redis | Code (counter) |
| EVAL-PERF-004 | Bundle Size | Tamanho do build de producao | Code (size check) |

**Metricas**:
- **P95 response time**: < 3s para chamadas AI, < 500ms para Server Actions
- **Token usage**: Dentro do budget definido por tipo de chamada
- **Cache hit rate**: > 70% para guias e checklists reutilizados
- **Build time**: < 120s para build de producao

### 3.5 i18n Evals

Avaliam completude e consistencia de internacionalizacao.

| Eval | Feature | O Que Avalia | Grader |
|------|---------|-------------|--------|
| EVAL-I18N-001 | Message Keys | Todas as chaves presentes em en.json e pt-BR.json | Code (key diff) |
| EVAL-I18N-002 | Hardcoded Strings | Deteccao de strings hardcoded no codigo | Code (AST scan) |
| EVAL-I18N-003 | Locale Formatting | Datas, numeros, moedas formatados por locale | Code (format check) |
| EVAL-I18N-004 | AI Output Locale | IA responde no idioma solicitado | Code + LLM-judge |

**Metricas**:
- **Key coverage**: 100% de chaves presentes em todos os locales
- **Hardcoded string count**: 0 strings hardcoded em componentes de UI
- **Format compliance**: 100% dos valores formatados por locale
- **AI locale adherence**: 100% dos outputs no idioma correto

---

## 4. Estrutura de Datasets de Eval

Todos os datasets ficam em `docs/evals/datasets/` como arquivos JSON.

### Estrutura Padrao

```json
{
  "eval_id": "EVAL-XXX-NNN",
  "version": "1.0.0",
  "description": "Descricao do que este dataset avalia",
  "spec_ref": "SPEC-PROD-XXX",
  "created": "YYYY-MM-DD",
  "updated": "YYYY-MM-DD",
  "owner": "agent-id",
  "tags": ["ai", "itinerary", "quality"],
  "test_cases": [
    {
      "id": "XX-NNN",
      "description": "Descricao do caso de teste",
      "input": { },
      "expected": { },
      "grading": { }
    }
  ]
}
```

### Convencoes

- **IDs**: Prefixo indica o tipo (IQ = Itinerary Quality, GA = Guide Accuracy, IR = Injection Resistance, IL = I18n Locale)
- **Inputs**: Sempre dados sinteticos -- nunca PII real
- **Expected**: Criterios verificaveis, nao outputs exatos (IA e probabilistica)
- **Grading**: Pesos por dimensao de qualidade, devem somar 1.0
- **Versionamento**: Campo `version` segue semver, atualizado a cada mudanca no dataset

---

## 5. Tipos de Grader

### 5.1 Code Graders (Automaticos)

Verificacoes programaticas que rodam sem custo adicional de IA.

| Grader | Implementacao | Quando Usar |
|--------|--------------|-------------|
| Zod Schema Validation | Valida output contra schema Zod | Estrutura JSON, tipos, campos obrigatorios |
| Timing Grader | Mede latencia de operacao | Performance, response time |
| Key Diff Grader | Compara chaves entre arquivos JSON | i18n completude |
| Pattern Scan Grader | Busca patterns em texto | PII detection, hardcoded strings |
| HTTP Status Grader | Verifica status codes de requisicoes | BOLA, auth bypass |

**Localizacao futura**: `docs/evals/graders/` (stubs de TypeScript descrevendo a logica)

### 5.2 LLM-as-Judge (Semi-automaticos)

Usa um modelo de IA para avaliar a qualidade semantica de outro output de IA.

| Aspecto | Detalhes |
|---------|---------|
| Modelo | Mesmo modelo usado na geracao (Claude) ou modelo mais barato para custo |
| Prompt do juiz | Definido no eval spec (EVAL-XXX), versionado |
| Escala | 0.0 a 1.0 com rubrica de 5 niveis (0.0, 0.25, 0.5, 0.75, 1.0) |
| Custo | Roda por sprint, nao por commit (controle de custo) |
| Validacao | Resultados do LLM-judge sao spot-checked por human review trimestral |

**Rubrica padrao para LLM-judge**:

| Score | Significado |
|-------|------------|
| 1.0 | Excelente -- atende todos os criterios, informacao precisa e relevante |
| 0.75 | Bom -- atende a maioria dos criterios, pequenas lacunas |
| 0.5 | Adequado -- atende criterios minimos, melhorias necessarias |
| 0.25 | Insuficiente -- falha em criterios importantes |
| 0.0 | Falha -- output incorreto, irrelevante ou perigoso |

### 5.3 Human Grading (Manual)

Avaliacao por humanos usando rubrica estruturada.

| Aspecto | Detalhes |
|---------|---------|
| Quando | Novas features AI, mudancas de prompt, novos destinos |
| Quem | qa-engineer + domain expert (quando disponivel) |
| Rubrica | Definida no eval spec, identica a usada pelo LLM-judge |
| Calibracao | Pelo menos 3 amostras avaliadas por 2 avaliadores independentes |
| Registro | Resultados em `docs/evals/results/EVAL-XXX-run-YYYY-MM-DD.md` |

---

## 6. Mapeamento Evals para Specs

Cada spec pode ter um ou mais evals associados. A relacao e N:N.

```
SPEC-PROD-XXX ──┬── EVAL-AI-001 (qualidade de itinerario)
                ├── EVAL-SEC-001 (resistencia a injecao)
                └── EVAL-PERF-001 (latencia)

SPEC-UX-XXX  ───┬── EVAL-UX-001 (completude do wizard)
                └── EVAL-I18N-001 (chaves i18n)

SPEC-SEC-XXX ───┬── EVAL-SEC-001 (injecao)
                ├── EVAL-SEC-002 (XSS)
                └── EVAL-SEC-003 (BOLA)
```

### Rastreabilidade

O campo `spec_ref` em cada dataset conecta o eval a spec de origem. Na QA sign-off (QA-REL-XXX), a secao de evals lista:

| Eval ID | Spec Ref | Score | Threshold | Resultado |
|---------|----------|-------|-----------|-----------|
| EVAL-AI-001 | SPEC-PROD-012 | 0.87 | 0.80 | PASS |
| EVAL-SEC-001 | SPEC-SEC-001 | 1.00 | 1.00 | PASS |

---

## 7. Trust Score Composto

O Trust Score e a metrica unificada que agrega todos os evals em um numero de 0.0 a 1.0.

**Formula resumida**:

```
Trust Score = Safety (30%) + Accuracy (25%) + Performance (20%) + UX (15%) + i18n (10%)
```

Detalhes completos, sub-metricas, thresholds e triggers de degradacao estao em [TRUST-SCORE.md](TRUST-SCORE.md).

**Thresholds**:
- **>= 0.90**: Aprovado para producao
- **>= 0.80**: Aprovado para staging (requer plano de melhoria para producao)
- **< 0.80**: Bloqueado -- nao pode ser promovido

---

## 8. Fluxo de Trabalho EDD

### 8.1 Pre-Sprint (Planejamento)

1. Para cada feature com IA no backlog do sprint, criar ou atualizar o eval spec (EVAL-XXX)
2. Definir dataset de eval com casos de teste diversificados
3. Definir thresholds de passagem por metrica
4. Registrar eval no SPEC-STATUS.md (coluna "Eval")

### 8.2 Durante o Sprint (Desenvolvimento)

1. Desenvolvedores podem rodar evals localmente para validar mudancas de prompt
2. Code graders rodam automaticamente em cada commit relevante (CI/CD)
3. LLM-judge roda sob demanda durante o desenvolvimento (custo controlado pelo dev)
4. Qualquer regressao de eval e tratada como bug -- reportada imediatamente

### 8.3 Pos-Sprint (Validacao)

1. qa-engineer roda suite completa de evals (todos os graders)
2. Resultados sao documentados em `docs/evals/results/`
3. Trust Score e calculado por feature e agregado
4. QA sign-off inclui secao de evals com scores e veredito

### 8.4 Retro (Evolucao)

1. Datasets sao atualizados com novos edge cases descobertos durante o sprint
2. Thresholds sao ajustados se necessario (sempre para cima, nunca para baixo sem justificativa)
3. Evals flaky sao investigados e corrigidos (nunca ignorados)

---

## 9. Integracao com SDD

EDD nao substitui SDD -- estende-o.

| Aspecto | SDD | EDD |
|---------|-----|-----|
| Foco | Conformidade com spec | Qualidade de output |
| Artefato | Spec (SPEC-XXX) | Eval (EVAL-XXX) + Dataset |
| Validacao | Audit de conformidade (binario) | Score de qualidade (0-1) |
| Timing | Pre/pos implementacao | Continuo |
| Owner | qa-engineer (conformidade) | qa-engineer (evals) |
| Bloqueio | Spec drift = P0 | Trust Score < threshold = bloqueio |

### Hierarquia de Verificacao

```
1. Spec Conformance (SDD)   → Implementacao segue a spec?
2. Test Suite (testes)       → Funciona corretamente?
3. Eval Suite (EDD)          → Funciona BEM?
4. Trust Score (composto)    → Seguro para producao?
```

---

## 10. Diretorio e Arquivos

```
docs/
  process/
    EVAL-DRIVEN-DEVELOPMENT.md    ← Este documento
    TRUST-SCORE.md                ← Formula detalhada do Trust Score
    templates/
      EVAL-TEMPLATE.md            ← Template para novos eval specs
  evals/
    datasets/
      itinerary-quality.json      ← Dataset: qualidade de itinerario (EVAL-AI-001)
      guide-accuracy.json         ← Dataset: precisao do guia (EVAL-AI-002)
      injection-resistance.json   ← Dataset: resistencia a injecao (EVAL-SEC-001)
      i18n-completeness.json      ← Dataset: completude i18n (EVAL-I18N-001)
    graders/                      ← (futuro) Implementacoes de graders
    results/                      ← (futuro) Resultados de execucoes de eval
```

---

## 11. Glossario

| Termo | Definicao |
|-------|----------|
| **Eval** | Avaliacao estruturada da qualidade de um output, com criterios, dataset e grader |
| **Dataset** | Conjunto de casos de teste com inputs, expectativas e pesos de avaliacao |
| **Grader** | Mecanismo que avalia um output contra os criterios esperados (code, LLM, human) |
| **Trust Score** | Metrica composta (0-1) que agrega todos os evals de uma feature ou release |
| **Eval Spec** | Documento EVAL-XXX que define o que e como avaliar uma feature |
| **LLM-as-judge** | Uso de um modelo de IA para avaliar o output de outro modelo de IA |
| **Code Grader** | Avaliacao programatica sem custo de IA (schema validation, timing, pattern matching) |
| **Threshold** | Score minimo para aprovacao (staging: 0.8, producao: 0.9) |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|----------|
| 1.0.0 | 2026-03-12 | qa-engineer | Versao inicial do framework EDD |
