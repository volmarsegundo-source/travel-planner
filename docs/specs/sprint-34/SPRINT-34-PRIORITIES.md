# Sprint 34 — Prioridades e Decisoes de Escopo

**Versao**: 1.0.0
**Data**: 2026-03-21
**Autor**: product-owner
**Status do produto**: v0.28.0 (Sprint 33 completo assumido) / v0.29.0 em planejamento
**Tema do sprint**: "Fechamento de Lacunas — Rodape, Fase 3, Fase 4 e Acesso"

---

## Contexto: Sprint de Qualidade e Confiabilidade

Sprint 34 e o sprint de fechamento das lacunas criticas identificadas apos o Sprint 33. O Sprint 33 implementou o rodape padronizado (SPEC-PROD-029), as regras de conclusao da Fase 3 (SPEC-PROD-030), os campos obrigatorios da Fase 4 (SPEC-PROD-031) e o login social (SPEC-PROD-034). No entanto, os testes de aceitacao e o feedback de QA revelaram que essas implementacoes possuem lacunas de comportamento que precisam ser corrigidas antes da beta launch:

1. **Rodape padrao incompleto** (SPEC-PROD-035): os dialogos de confirmacao ao navegar com dados nao salvos nao estao presentes em todas as fases; botoes especificos de passo ainda coexistem com o rodape padrao.
2. **Regras da Fase 3 com semantica incorreta** (SPEC-PROD-036): itens opcionais do checklist continuam bloqueando a conclusao da fase.
3. **Fase 4 com multiplos problemas** (SPEC-PROD-037): ausencia de toggle ida/volta claro, ausencia de marcadores de campos obrigatorios, bug critico de persistencia de acomodacao, e ausencia do checkbox "Ainda nao decidi" para planejamento antecipado.
4. **OAuth nao funcional e telefone sem validacao adequada** (SPEC-PROD-038): login social falha em staging; campo de telefone rejeita formatos padrao brasileiros.

---

## Visao Geral das Specs do Sprint 34

| Spec ID | Titulo | Estimativa | Prioridade | Categoria |
|---------|--------|------------|------------|-----------|
| SPEC-PROD-035 | Rodape Padronizado — Revisao e Refinamento | 8–12h | P0 | Correcao de lacuna critica |
| SPEC-PROD-036 | Fase 3 — Respecificacao das Regras de Conclusao | 4–6h | P0 | Correcao de lacuna critica |
| SPEC-PROD-037 | Fase 4 — Melhorias (toggle, asteriscos, bug, nao decidi) | 10–14h | P0 | Correcao de bug + melhoria |
| SPEC-PROD-038 | Login + Fase 1 — Correcoes (OAuth, telefone) | 6–8h | P1 | Correcao de bug de acesso |
| **TOTAL** | | **28–40h** | | |

**Nota sobre budget**: 28-40h e compativel com o budget tipico de um sprint de 2 devs (~40-50h util). Este e um sprint relativamente enxuto — toda a capacidade deve ser dedicada a finalizar essas correcoes com testes robustos, nao a expandir escopo.

---

## Hierarquia de Prioridade

```
P0 — SPEC-PROD-035 (Rodape Padrao — Revisao)
      Fundacao de UX para todas as fases.
      Sem os dialogos de confirmacao funcionando,
      qualquer dado preenchido em qualquer fase
      pode ser perdido silenciosamente ao navegar.
      Deve comecar no Dia 1 e ser concluido antes
      que qualquer outra spec seja finalizada.
      |
      v
P0 — SPEC-PROD-036 (Fase 3 — Regras de Conclusao)
      Pequeno esforco, alto impacto em retencao.
      Usuarios internacionais (maioria do target) estao
      bloqueados na Fase 3 por itens opcionais.
      Pode ser desenvolvido em paralelo com SPEC-PROD-035
      pois nao ha dependencia de componente compartilhado.
      |
      v
P0 — SPEC-PROD-037 (Fase 4 — Melhorias)
      Contem um bug CRITICO de persistencia (REQ-PHASE4-003)
      — dados de acomodacao se perdem silenciosamente.
      Este bug P0 justifica a classificacao como prioridade
      maxima mesmo que os outros requisitos sejam P1.
      Os 4 requisitos podem ser implementados em sequencia
      por um unico dev ou divididos entre os 2 devs.
      |
      v
P1 — SPEC-PROD-038 (Login + Fase 1)
      OAuth nao funcional impede novos usuarios de entrar.
      Impacto real em conversao, mas usuarios existentes
      com email/senha continuam funcionando.
      Pode comecar em paralelo com qualquer outra spec
      pois e completamente independente de componentes
      de fase do wizard.
```

---

## Ordem de Sacrificio (se o budget estourar)

Na seguinte ordem, deferir para Sprint 35:

1. **SPEC-PROD-038 — Validacao de telefone** (REQ-PHASE1-001): o campo aceita qualquer entrada — nao ha perda de dados, apenas dados mal formatados. Pode ser corrigido em sprint posterior sem impacto critico.

2. **SPEC-PROD-037 — REQ-PHASE4-004** (checkbox "Ainda nao decidi"): e uma melhoria de UX para planejamento antecipado, nao uma correcao de bug. Os outros 3 requisitos da Fase 4 sao mais urgentes.

3. **SPEC-PROD-037 — REQ-PHASE4-002** (asteriscos em campos obrigatorios): e uma melhoria de usabilidade, nao um bloqueador funcional. O bug de persistencia (REQ-PHASE4-003) e o toggle (REQ-PHASE4-001) tem prioridade.

**Nao sacrificaveis sob nenhuma circunstancia**:
- SPEC-PROD-035: dialogos de confirmacao "Voltar" e "Avancar" em todas as 6 fases (AC-003, AC-011) + remocao de botoes especificos de passo (AC-014)
- SPEC-PROD-036: semantica correta dos 3 estados da Fase 3 (AC-001, AC-002, AC-003) + avanco sem bloqueio por itens opcionais (AC-005)
- SPEC-PROD-037: correcao do bug de persistencia de acomodacao (AC-011, AC-012, AC-013) + toggle ida/volta (AC-001 a AC-005)
- SPEC-PROD-038: OAuth funcional em staging (AC-003) + documentacao de variaveis de ambiente (AC-001, AC-002)

---

## Paralelizacao Sugerida

**Dev-fullstack-1** (semana 1): SPEC-PROD-035 — revisao completa do rodape (alto acoplamento com todas as 6 fases; melhor ter um dev dedicado)

**Dev-fullstack-2** (semana 1): SPEC-PROD-037 REQ-PHASE4-003 (bug critico de persistencia — diagnosticar causa raiz e corrigir) + SPEC-PROD-038 (OAuth + telefone — independente, pode ser feito em paralelo)

**Dev-fullstack-1** (semana 2): continuacao SPEC-PROD-035 se necessario + SPEC-PROD-036 (Fase 3 — regras de conclusao, pequeno esforco)

**Dev-fullstack-2** (semana 2): SPEC-PROD-037 REQ-PHASE4-001/002/004 (toggle, asteriscos, "Ainda nao decidi") apos correcao do bug

---

## Dependencias Pre-Sprint

Antes de iniciar Sprint 34, confirmar:

- [ ] Sprint 33 completo: SPEC-PROD-029, SPEC-PROD-030, SPEC-PROD-031, SPEC-PROD-034 implementados
- [ ] Bug de persistencia de acomodacao confirmado e reproduzido em staging (necessario para SPEC-PROD-037 REQ-PHASE4-003)
- [ ] OAuth configurado no Google Console com redirect URIs de staging (necessario para SPEC-PROD-038 AC-003)
- [ ] Architect cria SPEC-ARCH para SPEC-PROD-035 (dirty state detection e dialog state machine)
- [ ] Architect cria SPEC-ARCH para SPEC-PROD-037 (diagnostico do bug de persistencia + modelo de dados para "Ainda nao decidi")
- [ ] Security-specialist revisa SPEC-PROD-038 (OAuth account linking, PII do telefone)

---

## Specs Criadas neste Sprint Planning

| Spec ID | Titulo | Status | Arquivo |
|---------|--------|--------|---------|
| SPEC-PROD-035 | Rodape Padronizado — Revisao e Refinamento | Draft | `docs/specs/sprint-34/SPEC-PROD-035.md` |
| SPEC-PROD-036 | Fase 3 — Respecificacao das Regras de Conclusao | Draft | `docs/specs/sprint-34/SPEC-PROD-036.md` |
| SPEC-PROD-037 | Fase 4 — Melhorias (REQ-PHASE4-001..004) | Draft | `docs/specs/sprint-34/SPEC-PROD-037.md` |
| SPEC-PROD-038 | Login + Fase 1 — Correcoes (OAuth, Telefone) | Draft | `docs/specs/sprint-34/SPEC-PROD-038.md` |

---

## Criterio de GO para Beta Launch (Sprint 34 Review)

| Criterio | Threshold |
|----------|-----------|
| SPEC-PROD-035: dialogos de confirmacao em todas as 6 fases | 0 fases sem dialogo "Voltar" e "Avancar" com dados nao salvos |
| SPEC-PROD-035: botoes especificos de passo removidos | 0 telas com botoes legados coexistindo com rodape padrao |
| SPEC-PROD-036: avanco da Fase 3 sem bloqueio por itens opcionais | 0 relatos de bloqueio indevido |
| SPEC-PROD-037: bug de persistencia de acomodacao corrigido | 0 registros de acomodacao perdidos em testes de regressao |
| SPEC-PROD-038: OAuth Google funcional em staging | >= 99% de taxa de sucesso no fluxo OAuth |
| Taxa de aprovacao de testes | >= 95% (continuidade do criterio de Sprint 32/33) |
| Zero P0 bugs novos | 0 regressoes nos fluxos criticos |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-21 | product-owner | Documento inicial — Sprint 34 planning com 4 specs (SPEC-PROD-035 a 038). Tema: fechamento de lacunas criticas do Sprint 33 |
