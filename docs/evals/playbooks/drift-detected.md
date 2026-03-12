# Playbook: Drift Detectado

**Trigger**: Desvio > 10% em qualquer dimensao de eval comparado ao baseline
**Severidade**: P2 (investigacao) — pode escalar para P1/P0 dependendo da causa
**Dono**: qa-engineer + tech-lead

---

## 1. Identificar Quais Evals Sofreram Drift

```bash
npm run eval:drift
```

O script compara os resultados atuais contra o baseline em `docs/evals/baselines/` e reporta:
- Dimensoes com drift positivo (melhoria)
- Dimensoes com drift negativo (regressao)
- Percentual de desvio por dimensao

Verificar tambem o historico para entender a tendencia:

```bash
npm run eval:trend
```

---

## 2. Identificar a Causa Raiz

As causas mais comuns de drift sao:

### 2.1 Atualizacao de Modelo de AI
- Verificar se houve mudanca de modelo em `src/server/services/ai.service.ts`
- Verificar se a Anthropic atualizou o modelo (ex: claude-sonnet-4-6 patch)
- **Sinal**: Drift em accuracy e/ou performance simultaneamente

```bash
git log --oneline --since="1 week ago" -- src/server/services/ai.service.ts src/server/services/providers/
```

### 2.2 Mudanca de Prompt
- Verificar alteracoes em `src/lib/prompts/`
- Verificar mudancas em system prompts ou templates
- **Sinal**: Drift em accuracy, possivelmente em safety

```bash
git log --oneline --since="1 week ago" -- src/lib/prompts/
```

### 2.3 Mudanca de Dados ou Schema
- Verificar migracoes Prisma recentes
- Verificar alteracoes em schemas Zod de validacao
- **Sinal**: Drift em accuracy ou UX

```bash
git log --oneline --since="1 week ago" -- prisma/migrations/ src/lib/validations/
```

### 2.4 Mudanca de Infraestrutura
- Verificar alteracoes em configuracoes de cache, rate limiting, ou timeouts
- **Sinal**: Drift em performance

### 2.5 Mudanca de i18n
- Verificar adicao/remocao de chaves de traducao
- **Sinal**: Drift isolado em i18n

```bash
npm run i18n:check
```

---

## 3. Decisao: Melhoria Intencional ou Regressao?

Apos identificar a causa, classificar o drift:

### Drift Positivo (Melhoria)
Se o drift representa uma melhoria genuina (ex: prompt otimizado melhorou accuracy):

1. Confirmar que nenhuma outra dimensao regrediu
2. Atualizar o baseline:
   ```bash
   npm run eval:scheduled
   ```
   O `eval:scheduled` automaticamente salva os resultados no historico. Copiar a entrada mais recente para o baseline:
3. Copiar `docs/evals/history/latest.json` para `docs/evals/baselines/baseline-vX.Y.Z.json`
4. Atualizar a referencia de baseline no `scripts/eval-drift.ts` se necessario
5. Documentar a melhoria no sprint review

### Drift Negativo (Regressao)
Se o drift representa uma regressao:

1. Seguir o playbook `trust-score-drop.md` para a(s) dimensao(oes) afetada(s)
2. **NAO atualizar o baseline** — o baseline atual e a referencia correta
3. Corrigir a causa raiz antes de prosseguir
4. Re-executar evals para confirmar recuperacao

---

## 4. Como Atualizar o Baseline

Quando a decisao e atualizar (drift positivo confirmado):

1. Executar o eval suite completo:
   ```bash
   npm run eval:scheduled
   ```

2. Verificar que todos os scores estao acima dos thresholds minimos

3. O `eval:scheduled` salva automaticamente os resultados em `docs/evals/history/`.
   Copiar o resultado mais recente para o diretorio de baselines:
   ```bash
   cp docs/evals/history/eval-YYYY-MM-DD.json docs/evals/baselines/baseline-vX.Y.Z.json
   ```

4. Atualizar a referencia de versao no script de drift se houver path hardcoded

5. Commitar o novo baseline:
   ```bash
   git add docs/evals/baselines/
   git commit -m "chore(evals): update baseline to vX.Y.Z after confirmed improvement"
   ```

6. Comunicar ao time que o baseline foi atualizado e por que

---

## 5. Prevencao de Drift Inesperado

- Sempre executar `npm run eval:drift` antes de mergar PRs que tocam AI code
- Manter o CI gate de drift ativo (`.github/workflows/eval.yml`)
- Revisar baselines a cada quarterly review
- Documentar mudancas de modelo ou prompt com justificativa no commit message

---

## Change History

| Versao | Data | Autor | Mudanca |
|--------|------|-------|---------|
| 1.0.0 | 2026-03-12 | tech-lead | Playbook inicial |
