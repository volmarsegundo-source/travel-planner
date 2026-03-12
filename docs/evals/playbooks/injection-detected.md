# Playbook: Injection Detectada

**Trigger**: Eval de injection resistance falha (padrao de injection bypassa guards)
**Severidade**: P0 (seguranca)
**Dono**: security-specialist + tech-lead

---

## Resposta Imediata

**Tempo maximo de resposta**: 1 hora apos deteccao

Este playbook e acionado quando o eval `injection-resistance` detecta que um ou mais padroes de prompt injection conseguiram bypassar os guardrails do sistema.

---

## 1. Identificar Quais Padroes Bypassaram os Guards

```bash
npm run eval -- --filter injection-resistance
npm run eval:report
```

Analisar o `eval-report.json` para identificar:
- Quais inputs de teste passaram quando deveriam ter sido bloqueados
- Qual tipo de injection (direct, indirect, jailbreak, data exfiltration)
- Qual componente falhou na deteccao (input guard, output guard, ou ambos)

Verificar o dataset de referencia:
- `docs/evals/datasets/injection-resistance.json` — padroes conhecidos
- Comparar com os resultados para isolar os padroes que falharam

---

## 2. Bloquear o Padrao Especifico (Hotfix)

**Dono**: security-specialist

Acao imediata para bloquear o padrao antes de investigacao completa:

1. Adicionar o padrao detectado ao filtro de input em `src/lib/guards/`
2. Se o bypass foi no output, adicionar validacao em `src/server/services/ai.service.ts`
3. Testar o fix localmente:
   ```bash
   npm run eval -- --filter injection-resistance
   ```
4. Confirmar que o padrao agora e bloqueado sem causar falsos positivos

---

## 3. Patch no injection-guard.ts

**Dono**: security-specialist

Apos o hotfix, aplicar correcao estrutural:

1. Revisar `src/lib/guards/` para identificar a lacuna no filtro
2. Classificar o tipo de bypass:
   - **Evasao de regex**: padrao usou encoding ou formatacao alternativa
   - **Contexto novo**: padrao explorou contexto nao coberto pelos guards
   - **Encadeamento**: combinacao de padroes inofensivos que juntos formam injection
3. Implementar correcao que enderece a classe do problema, nao apenas a instancia
4. Garantir que a correcao nao impacta inputs legitimos do usuario

---

## 4. Atualizar Dataset de Injection Resistance

**Dono**: security-specialist + qa-engineer

1. Adicionar os novos padroes ao dataset:
   - Arquivo: `docs/evals/datasets/injection-resistance.json`
   - Incluir variantes do padrao detectado (encoding diferente, idiomas, etc.)
   - Marcar com `"expected": "reject"` para todos

2. Adicionar pelo menos 3 variantes de cada padrao novo:
   - Variante em portugues
   - Variante em ingles
   - Variante com encoding alternativo (Unicode, base64, etc.)

3. Verificar que o dataset nao tem duplicatas

---

## 5. Re-executar Eval Suite

```bash
npm run eval:scheduled
```

Verificar:
- [ ] Todos os padroes de injection sao bloqueados (score de safety >= 0.9)
- [ ] Nenhum falso positivo introduzido (inputs legitimos continuam passando)
- [ ] Trust score composto voltou acima do threshold

---

## 6. Atualizar Baseline

Se todos os evals passam apos a correcao:

1. O `eval:scheduled` salva resultados automaticamente no historico
2. Copiar resultado mais recente para baseline:
   ```bash
   cp docs/evals/history/eval-YYYY-MM-DD.json docs/evals/baselines/baseline-vX.Y.Z.json
   ```
3. Commitar o baseline atualizado junto com o fix de seguranca

---

## 7. Auditoria Ampla pelo security-specialist

**Dono**: security-specialist

Apos resolver o incidente imediato, conduzir auditoria mais ampla:

1. Revisar todos os endpoints que aceitam input do usuario e passam para AI:
   - `src/app/api/ai/` — rotas de API
   - `src/server/actions/` — server actions que chamam AI
   - `src/lib/prompts/` — templates de prompt

2. Verificar se o padrao detectado poderia afetar outros componentes

3. Revisar as camadas de defesa:
   - **Input**: sanitizacao antes de enviar ao modelo
   - **System prompt**: instrucoes de seguranca no prompt de sistema
   - **Output**: validacao e filtragem do output do modelo

4. Documentar findings em `docs/security.md` ou no sprint review

5. Se necessario, abrir tickets de seguranca para correcoes adicionais

---

## 8. Comunicacao

1. Notificar tech-lead e prompt-engineer sobre o incidente
2. Documentar no sprint review:
   - Padrao detectado (sanitizado — sem incluir payloads completos em docs publicos)
   - Root cause
   - Fix aplicado
   - Prevencao implementada
3. Atualizar `docs/process/TRUST-SCORE.md` se thresholds de safety precisam ser revisados

---

## Prevencao

- Manter dataset de injection atualizado com padroes de OWASP LLM Top 10
- Executar eval de injection em todo PR que toca AI code (CI gate)
- Revisao trimestral do dataset pelo security-specialist
- Acompanhar publicacoes de seguranca sobre novos vetores de prompt injection

---

## Change History

| Versao | Data | Autor | Mudanca |
|--------|------|-------|---------|
| 1.0.0 | 2026-03-12 | tech-lead | Playbook inicial |
