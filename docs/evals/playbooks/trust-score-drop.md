# Playbook: Queda de Trust Score

**Trigger**: Trust score composto < 0.8 (staging) ou < 0.9 (production)
**Severidade**: P1 (staging) / P0 (production)
**Dono**: tech-lead + qa-engineer

---

## Passos de Diagnostico

### 1. Identificar Qual Dimensao Caiu

```bash
npm run eval:report
# Verificar eval-report.json para scores por dimensao
npm run eval:trend
# Comparar com historico recente
```

Analisar o output e identificar qual(is) dimensao(oes) ficou(aram) abaixo do threshold:

| Dimensao | Threshold Minimo | Dono da Remediacao |
|----------|------------------|--------------------|
| Safety | 0.9 | security-specialist |
| Accuracy | 0.8 | prompt-engineer |
| Performance | 0.7 | devops-engineer |
| UX | 0.7 | qa-engineer |
| i18n | 0.8 | dev-fullstack-1 |

---

### 2. Resposta Especifica por Dimensao

#### Safety Drop (< 0.9)
**Dono**: security-specialist

1. Verificar commits recentes que alteraram `src/lib/guards/` ou `src/server/actions/`
2. Executar eval de resistencia a injection: verificar `tests/evals/injection-resistance.eval.ts`
3. Revisar novos campos de input do usuario quanto a sanitizacao
4. Verificar cobertura BOLA em novos endpoints
5. **Acao**: Corrigir e re-executar eval suite antes de prosseguir

```bash
npm run eval -- --filter injection-resistance
git log --oneline --since="1 week ago" -- src/lib/guards/ src/server/actions/
```

#### Accuracy Drop (< 0.8)
**Dono**: prompt-engineer

1. Verificar se o modelo de AI foi atualizado ou templates de prompt alterados
2. Executar eval de validacao de schema contra outputs recentes de AI
3. Comparar qualidade do output com golden set
4. Revisar `src/lib/prompts/` para mudancas nao intencionais
5. **Acao**: Ajustar prompts, atualizar golden set se necessario

```bash
npm run eval -- --filter schema-validation
git log --oneline --since="1 week ago" -- src/lib/prompts/
```

#### Performance Drop (< 0.7)
**Dono**: devops-engineer

1. Verificar orcamentos de tokens: `npm run eval -- --filter token-budget`
2. Revisar taxas de cache hit no Redis
3. Verificar prompt bloat (system prompts crescendo)
4. Revisar tempos de resposta P95
5. **Acao**: Otimizar prompts, melhorar caching, ajustar budgets

```bash
npm run eval -- --filter token-budget
```

#### UX Drop (< 0.7)
**Dono**: qa-engineer

1. Revisar mudancas recentes de UI
2. Verificar taxas de conclusao do wizard
3. Executar auditoria de acessibilidade
4. Verificar taxas de erro em builds recentes
5. **Acao**: Corrigir problemas de UX, atualizar testes

```bash
git log --oneline --since="1 week ago" -- src/components/
npm run lint
```

#### i18n Drop (< 0.8)
**Dono**: dev-fullstack-1

1. Executar grader de completude i18n: `npm run eval -- --filter i18n`
2. Verificar chaves de traducao faltantes
3. Verificar paridade de variaveis de interpolacao entre locales
4. Procurar strings hardcoded no codigo
5. **Acao**: Adicionar chaves faltantes, corrigir mismatches de interpolacao

```bash
npm run eval -- --filter i18n
npm run i18n:check
```

---

### 3. Recuperacao

1. Corrigir os problemas identificados nos passos acima
2. Re-executar o eval suite completo:
   ```bash
   npm run eval:scheduled
   ```
3. Verificar que o trust score voltou acima do threshold
4. Atualizar baseline se os scores melhoraram:
   - Copiar a entrada mais recente do historico para `docs/evals/baselines/`
5. Documentar as descobertas no sprint review

---

### 4. Prevencao

- Adicionar teste de regressao para a falha especifica encontrada
- Atualizar dataset de eval se novos padroes foram descobertos
- Revisar o DoR (Definition of Ready) para a feature que causou a queda
- Considerar adicionar o cenario ao golden set para deteccao futura
- Comunicar ao time via sprint review para evitar recorrencia

---

### 5. Escalacao

Se o trust score nao recuperar apos remediacao:

1. **P1 (staging)**: tech-lead decide se bloqueia o deploy ou aceita risco documentado
2. **P0 (production)**: Rollback imediato do ultimo deploy, investigacao root-cause com architect
3. Documentar incidente em `docs/sprint-reviews/` com timeline e acoes tomadas

---

## Change History

| Versao | Data | Autor | Mudanca |
|--------|------|-------|---------|
| 1.0.0 | 2026-03-12 | tech-lead | Playbook inicial |
