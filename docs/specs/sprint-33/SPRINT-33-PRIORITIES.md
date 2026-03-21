# Sprint 33 — Prioridades e Decisoes de Escopo

**Versao**: 1.0.0
**Data**: 2026-03-20
**Autor**: product-owner
**Status do produto**: v0.27.0 (Sprint 32 completo) / v0.28.0 em planejamento
**Tema do sprint**: "Qualidade de Dados, Personalizacao e Crescimento"

---

## Contexto: Sprint de Features Estrategicas

Sprint 33 e o primeiro sprint pos-estabilizacao. O Sprint 32 resolveu os P0 bugs e elevou a taxa de aprovacao de testes para >= 90%. Agora o produto precisa evoluir em tres frentes simultaneas:

1. **Qualidade de dados de entrada**: garantir que o usuario forneça dados consistentes e completos (IMP-001, IMP-002, IMP-003)
2. **Qualidade de saida e visibilidade**: o relatorio e o roteiro devem refletir tudo que o usuario preencheu (IMP-004, IMP-005)
3. **Crescimento de topo de funil**: remover a principal barreira de entrada de novos usuarios (IMP-006)

Esses tres eixos sao complementares. Um usuario que entra facilmente (IMP-006), preenche dados consistentes (IMP-001, IMP-002, IMP-003), recebe um relatorio claro (IMP-004) e um roteiro personalizado (IMP-005) e um usuario que fica, volta, e indica o produto.

---

## Visao Geral das Specs do Sprint 33

| Spec ID | Titulo | Estimativa | Prioridade | Eixo |
|---------|--------|------------|------------|------|
| SPEC-PROD-029 | Rodape Padronizado de Navegacao | 10–14h | P0 | Qualidade de dados |
| SPEC-PROD-030 | Regras de Conclusao da Fase 3 | 4–6h | P1 | Qualidade de dados |
| SPEC-PROD-031 | Campos Obrigatorios da Fase 4 | 6–8h | P1 | Qualidade de dados |
| SPEC-PROD-032 | Redesenho do Sumario/Relatorio | 14–18h | P1 | Visibilidade de saida |
| SPEC-PROD-033 | Enriquecimento do Prompt da Fase 6 | 6–8h | P2 | Personalizacao |
| SPEC-PROD-034 | Login Social — Google e Apple | 12–16h | P2 | Crescimento |
| **TOTAL** | | **52–70h** | | |

**Nota sobre budget**: 52-70h supera o budget tipico de um sprint de 2 devs (~40-50h util). A ordem de sacrificio abaixo define o que entra e o que sai dependendo da velocidade real do sprint.

---

## Hierarquia de Prioridade

```
P0 — SPEC-PROD-029 (Rodape Padronizado)
      Impacta TODAS as fases e todos os usuarios.
      Sem esse componente, os dados de qualquer fase
      podem ser perdidos a qualquer momento de navegacao.
      Bloqueia indiretamente a utilidade de SPEC-PROD-030
      e SPEC-PROD-031 (sem rodape consistente, as regras
      de avanco dessas specs ficam sem base de execucao).
      Deve comecar na semana 1 e ser a primeira entrega.
      |
      v
P1 — SPEC-PROD-030 (Fase 3 — Regras de Conclusao)
      Pequeno esforco, alto impacto em retencao.
      Viajantes internacionais (maioria do target) dao de
      frente com esse bloqueio em toda expedicao.
      Independente de SPEC-PROD-029 para implementacao
      (pode comecar em paralelo), mas beneficia-se do
      rodape padronizado para consistencia de UX.
      |
      v
P1 — SPEC-PROD-031 (Fase 4 — Campos Obrigatorios)
      Garante integridade dos dados de logistica antes
      da geracao do roteiro. Dependencia direta de
      SPEC-PROD-033 — sem dados de logistica corretos,
      o enriquecimento do prompt nao tem o que usar.
      Pode ser desenvolvido em paralelo com SPEC-PROD-030.
      |
      v
P1 — SPEC-PROD-032 (Redesenho do Relatorio)
      Maior esforco do sprint mas alto impacto em NPS.
      Pode comecar na semana 1 em paralelo com SPEC-PROD-029.
      Depende de SPEC-PROD-027 (Sprint 32) estar implementado
      (enum valores corretos) — verificar antes de iniciar.
      |
      v
P2 — SPEC-PROD-033 (Enriquecimento do Prompt)
      Depende de SPEC-PROD-031 estar implementado
      (dados de logistica corretos) e de SPEC-AI correspondente
      ser criado pelo prompt-engineer.
      Alta alavancagem em diferenciacao competitiva.
      |
      v
P2 — SPEC-PROD-034 (Login Social)
      Independente de todas as outras specs.
      Pode ser desenvolvido em qualquer semana do sprint.
      Alto impacto em conversao mas nao afeta usuarios
      existentes — pode ser diferido sem risco operacional.
```

---

## Ordem de Sacrificio (se o budget estourar)

Na seguinte ordem, deferir para Sprint 34:

1. **SPEC-PROD-034** (Login Social) — maior esforco, zero impacto em usuarios ja cadastrados, pode entrar em qualquer sprint futuro sem consequencia para o fluxo de planejamento
2. **SPEC-PROD-033** (Enriquecimento do Prompt) — melhoria de personalizacao, nao um bloqueio; roteiros continuam funcionando com o prompt atual
3. **SPEC-PROD-032** escopo reduzido — implementar apenas: acesso a partir da Fase 2 (AC-001–AC-003) e exibicao completa de dados (AC-004–AC-007); deferir indicador de completude (AC-011), PDF (AC-012) e mascaramento de bookingCode (AC-014) para Sprint 34
4. **SPEC-PROD-030 + SPEC-PROD-031** nao sao sacrificaveis — ambos resolvem inconsistencias que causariam dados invalidos no banco

**Nao negociavel para este sprint**:
- SPEC-PROD-029: rodape padronizado completo (todos os ACs) — fundacao de UX para todas as fases
- SPEC-PROD-030: liberacao do avanco na Fase 3 sem bloqueio (AC-001) + calculo correto de status (AC-002, AC-003)
- SPEC-PROD-031: validacao dos campos obrigatorios da Fase 4 e bloqueio do avanco (AC-001–AC-015)

---

## Paralelizacao Sugerida

**Dev-fullstack-1** (semana 1): SPEC-PROD-029 (componente de rodape — alto acoplamento com todas as fases, melhor ser feito por um dev dedicado sem paralelismo de componente)
**Dev-fullstack-2** (semana 1): SPEC-PROD-032 (relatorio — independente, pode comecar simultaneamente)
**Dev-fullstack-1** (semana 2): SPEC-PROD-030 + SPEC-PROD-031 (regras de conclusao — menor esforco, podem ser sequenciais ou paralelos)
**Dev-fullstack-2** (semana 2): SPEC-PROD-032 (continuacao) + SPEC-PROD-033 (se SPEC-PROD-031 estiver pronto)
**Dev-fullstack-1 ou 2** (se sobrar budget): SPEC-PROD-034 (login social — pode comecar em qualquer momento, e independente)

---

## Dependencias Pre-Sprint

Antes de iniciar Sprint 33, confirmar:

- [ ] Sprint 32 completo: SPEC-PROD-025, SPEC-PROD-026, SPEC-PROD-027 implementados (taxa de aprovacao >= 90%)
- [ ] SPEC-PROD-027 implementado: valores enum localizados no relatorio — pre-requisito para SPEC-PROD-032
- [ ] Architect cria SPEC-ARCH para SPEC-PROD-029 (estado dirty + server actions do rodape)
- [ ] Architect cria SPEC-ARCH para SPEC-PROD-032 (query de agregacao para relatorio expandido)
- [ ] Prompt-engineer cria SPEC-AI para SPEC-PROD-033 (estrutura e limites de token do prompt enriquecido)
- [ ] Security-specialist cria SPEC-SEC para SPEC-PROD-034 (revisao do fluxo OAuth e vinculacao de contas)
- [ ] DevOps configura Google OAuth Client ID e Apple Service ID nos ambientes de staging

---

## Specs Criadas neste Sprint Planning

| Spec ID | Titulo | Status | Arquivo |
|---------|--------|--------|---------|
| SPEC-PROD-029 | Rodape Padronizado de Navegacao | Draft | `docs/specs/sprint-33/SPEC-PROD-029-standardized-footer.md` |
| SPEC-PROD-030 | Regras de Conclusao da Fase 3 | Draft | `docs/specs/sprint-33/SPEC-PROD-030-phase3-completion-rules.md` |
| SPEC-PROD-031 | Campos Obrigatorios da Fase 4 | Draft | `docs/specs/sprint-33/SPEC-PROD-031-phase4-mandatory-fields.md` |
| SPEC-PROD-032 | Redesenho do Sumario/Relatorio | Draft | `docs/specs/sprint-33/SPEC-PROD-032-summary-report-redesign.md` |
| SPEC-PROD-033 | Enriquecimento do Prompt da Fase 6 | Draft | `docs/specs/sprint-33/SPEC-PROD-033-phase6-prompt-enrichment.md` |
| SPEC-PROD-034 | Login Social — Google e Apple | Draft | `docs/specs/sprint-33/SPEC-PROD-034-social-login.md` |

---

## Criterio de GO para Beta Launch Completo (Sprint 33 Review)

| Criterio | Threshold |
|----------|-----------|
| SPEC-PROD-029 implementado | Rodape padronizado em 100% das telas de fase — zero telas sem os 3 botoes |
| SPEC-PROD-030 implementado | Avanco da Fase 3 sem bloqueio por checkboxes — 0 relatos de bloqueio indevido |
| SPEC-PROD-031 implementado | Validacao de campos obrigatorios da Fase 4 — 0 registros de logistica incompletos passando para Fase 5 |
| SPEC-PROD-032 implementado (escopo minimo) | Relatorio acessivel apos Fase 2, todos os dados visiveis integralmente |
| Taxa de aprovacao de testes | >= 95% (continuidade do criterio de Sprint 32) |
| Zero P0 bugs novos | Nenhuma regressao nos fluxos criticos de transicao e completude |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-20 | product-owner | Documento inicial — Sprint 33 planning com 6 specs (IMP-001 a IMP-006) |
