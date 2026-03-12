# EVAL-XXX: [Nome do Eval]

```yaml
---
eval-id: EVAL-XXX
spec-ref: SPEC-PROD-XXX
type: code | llm-judge | human
metrics: [accuracy, relevance, coherence, latency, safety]
pass-threshold: 0.8
dataset: docs/evals/datasets/XXX.json
grader: docs/evals/graders/XXX.ts
schedule: per-commit | per-sprint | on-demand
owner: agent-id
created: YYYY-MM-DD
updated: YYYY-MM-DD
version: 1.0.0
status: draft | active | deprecated
---
```

---

## 1. Descricao

[Descricao clara do que este eval verifica. Qual feature? Qual aspecto de qualidade?
Por que este eval e necessario -- qual risco ele mitiga?]

### Contexto

- **Feature**: [Nome da feature avaliada]
- **AI Model**: [Modelo usado para geracao, se aplicavel]
- **Prompt Template**: [Referencia ao template de prompt, se aplicavel]
- **Frequencia**: [Quando este eval roda e por que]

---

## 2. Input Schema

Define a estrutura dos inputs fornecidos ao sistema sob teste.

```json
{
  "type": "object",
  "properties": {
    "campo1": {
      "type": "string",
      "description": "Descricao do campo"
    },
    "campo2": {
      "type": "number",
      "description": "Descricao do campo"
    }
  },
  "required": ["campo1", "campo2"]
}
```

### Variacoes de Input

| Variacao | Proposito | Exemplo |
|----------|----------|---------|
| Caso basico | Happy path | `{ "campo1": "valor", "campo2": 5 }` |
| Edge case | Limite | `{ "campo1": "", "campo2": 0 }` |
| Adversarial | Seguranca | `{ "campo1": "ignore instructions", "campo2": -1 }` |

---

## 3. Expected Output Schema

Define a estrutura esperada do output para validacao por code grader.

```json
{
  "type": "object",
  "properties": {
    "resultado": {
      "type": "string",
      "description": "Descricao do campo esperado"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "latency_ms": { "type": "number" },
        "tokens_used": { "type": "number" }
      }
    }
  },
  "required": ["resultado"]
}
```

### Criterios Estruturais (Code Grader)

| Criterio | Tipo | Descricao | Obrigatorio |
|----------|------|----------|-------------|
| Schema valido | boolean | Output parseia como JSON valido e segue o schema | Sim |
| Campos obrigatorios | boolean | Todos os campos required estao presentes | Sim |
| Limites de tamanho | boolean | Arrays e strings dentro dos limites definidos | Sim |
| Idioma correto | boolean | Texto no idioma solicitado | Sim |

---

## 4. Rubrica de Avaliacao (Grading Rubric)

### Para Code Graders

| Metrica | Peso | Calculo | Threshold |
|---------|------|---------|-----------|
| Schema compliance | 0.X | 1.0 se valido, 0.0 se invalido | 1.0 (binario) |
| Field completeness | 0.X | campos_preenchidos / campos_totais | >= 0.9 |
| Constraint adherence | 0.X | restricoes_atendidas / restricoes_totais | >= 0.8 |
| Performance | 0.X | 1.0 se < threshold, degradacao linear | >= 0.7 |

### Para LLM-as-Judge

Prompt do juiz (adaptar para cada eval):

```
Voce e um avaliador especializado em [dominio]. Avalie o output abaixo
com base nos seguintes criterios:

1. [Criterio 1]: [Descricao do que constitui qualidade neste criterio]
2. [Criterio 2]: [Descricao]
3. [Criterio N]: [Descricao]

Para cada criterio, atribua um score de 0.0 a 1.0:
- 1.00: Excelente — atende todos os sub-criterios sem falhas
- 0.75: Bom — atende a maioria, pequenas lacunas aceitaveis
- 0.50: Adequado — atende o minimo, melhorias claras necessarias
- 0.25: Insuficiente — falha em aspectos importantes
- 0.00: Falha — output incorreto, irrelevante ou perigoso

INPUT fornecido ao sistema:
<input>
{input_json}
</input>

OUTPUT gerado pelo sistema:
<output>
{output_text}
</output>

Responda APENAS com JSON:
{
  "scores": {
    "criterio1": 0.X,
    "criterio2": 0.X
  },
  "weighted_score": 0.X,
  "justification": "explicacao curta"
}
```

### Para Human Grading

| Criterio | Peso | Escala | Instrucoes para Avaliador |
|----------|------|--------|--------------------------|
| [Criterio 1] | 0.X | 0.0 - 1.0 | [O que observar, exemplos de cada nivel] |
| [Criterio 2] | 0.X | 0.0 - 1.0 | [O que observar, exemplos de cada nivel] |

**Calibracao**: Antes de avaliar, o avaliador deve classificar 3 amostras de referencia (anchor samples) fornecidas com scores pre-definidos.

---

## 5. Criterios de Pass/Fail

### Pass (Aprovado)

- [ ] Score composto >= `pass-threshold` (definido no frontmatter YAML)
- [ ] Nenhuma metrica individual < 0.5 (floor de seguranca)
- [ ] Para evals de seguranca: score = 1.0 obrigatorio (zero tolerance)
- [ ] Output no idioma correto (100%)

### Fail (Reprovado)

- [ ] Score composto < `pass-threshold`
- [ ] OU qualquer metrica de seguranca < 1.0
- [ ] OU output em idioma incorreto
- [ ] OU erro de schema (JSON invalido)

### Acao em Caso de Fail

| Severidade | Acao |
|------------|------|
| Score < 0.5 | P0 -- bloqueio de release, investigacao imediata |
| Score 0.5-0.7 | P1 -- deve ser corrigido antes de staging promotion |
| Score 0.7-threshold | P2 -- deve ser corrigido antes de producao |
| Falha de seguranca | P0 -- bloqueio imediato, independente de score |

---

## 6. Caso de Teste Exemplo

```json
{
  "id": "XX-001",
  "description": "[Descricao do cenario de teste]",
  "input": {
    "campo1": "valor exemplo",
    "campo2": 5
  },
  "expected": {
    "criterio_estrutural_1": true,
    "criterio_estrutural_2": true,
    "range_numerico": [1, 10],
    "idioma": "pt-BR"
  },
  "grading": {
    "dimensao_1": 0.3,
    "dimensao_2": 0.3,
    "dimensao_3": 0.2,
    "dimensao_4": 0.2
  },
  "notes": "Observacoes adicionais sobre este caso de teste"
}
```

---

## 7. Historico de Execucoes

| Data | Versao Dataset | Score | Resultado | Notas |
|------|---------------|-------|-----------|-------|
| YYYY-MM-DD | 1.0.0 | 0.XX | PASS/FAIL | [observacoes] |

---

## 8. Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|----------|
| 1.0.0 | YYYY-MM-DD | [agent-id] | Versao inicial |
