# Sprint 31 — Prioridades e Decisoes de Escopo

**Versao**: 1.0.0
**Data**: 2026-03-17
**Autor**: product-owner
**Status do produto**: v0.24.0 (Sprint 30 completo assumido) / v0.25.0 em planejamento
**Budget**: ~45h
**Tema do sprint**: "Beta Hardening — States, Dashboard & Atlas"

---

## Condicao de Entrada

Este planejamento assume que Sprint 30 entregou:
- SPEC-PROD-016 aprovado em QA (navegacao estabilizada, falha manual <= 5%)
- BUG-S30-001 resolvido (Phase 3 -> 4 sem timeout em staging)
- BUG-S30-005 resolvido (datas obrigatorias em Phase 1)
- GeminiProvider implementado (pre-requisito de beta com usuarios reais)

Se qualquer um desses itens nao estiver concluido ao inicio do Sprint 31, o tech-lead deve reavaliar o escopo — itens incompletos do Sprint 30 tem prioridade sobre qualquer novo item deste planejamento.

---

## Visao Geral das Specs do Sprint 31

| Spec ID | Titulo | Estimativa | Prioridade |
|---------|--------|------------|------------|
| SPEC-PROD-023 | Phase Completion Logic | 8–10h | P0 |
| SPEC-PROD-024 | UX Cleanups (4 itens) | 6–8h | P1 |
| SPEC-PROD-022 | Dashboard Improvements | 10–13h | P2 |
| SPEC-PROD-021 | Meu Atlas Map Redesign | 16–20h | P3 |
| **TOTAL** | | **40–51h** | |

---

## Analise de Viabilidade no Budget de 45h

Com budget de 45h, o risco de tentar entregar as 4 specs integralmente e alto (intervalo superior: 51h). A analise abaixo define o escopo recomendado e o plano de sacrificio.

### Distribuicao recomendada (cenario base — 45h)

```
SPEC-PROD-023  →  8h   (estimativa conservadora: logica de negocio + testes)
SPEC-PROD-024  →  7h   (4 itens independentes, baixa complexidade tecnica)
SPEC-PROD-022  →  11h  (consome estados de SPEC-PROD-023, componentes existentes)
SPEC-PROD-021  →  16h  (Mapbox GL JS ja no stack, mas mapa interativo e risco)
Buffer         →  3h   (buffer de 6.6% — minimo aceitavel)
               ────
TOTAL          →  45h
```

**Conclusao**: Todas as 4 specs cabem no budget de 45h apenas se SPEC-PROD-021 for entregue em escopo reduzido (ver secao abaixo). Qualquer atraso em SPEC-PROD-023 (base de tudo) propaga para SPEC-PROD-022 e potencialmente para SPEC-PROD-021.

---

## Hierarquia de Prioridade

```
P0 — SPEC-PROD-023 (Phase Completion Logic)
      Fundacao de SPEC-PROD-022 e do trigger automatico de SPEC-PROD-024.
      Nao sai do sprint. Deve ser a primeira entrega da semana 1.
      |
      v
P1 — SPEC-PROD-024 (UX Cleanups)
      4 itens pequenos e independentes. Alta visibilidade em beta.
      Pode ser desenvolvido em paralelo com SPEC-PROD-023 (itens REQ-002, REQ-003, REQ-005
      nao dependem de SPEC-PROD-023. Apenas REQ-006 depende).
      |
      v
P2 — SPEC-PROD-022 (Dashboard Improvements)
      Depende de SPEC-PROD-023 estar implementado.
      Iniciar apenas na segunda semana do sprint.
      |
      v
P3 — SPEC-PROD-021 (Meu Atlas Map)
      Maior risco e maior estimativa. Iniciar somente se P0/P1/P2 estiverem
      concluidos ou em fase final sem blockers.
```

---

## Escopo Reduzido de SPEC-PROD-021 (se o budget apertar)

Se ao final da semana 2 o budget restante for insuficiente para SPEC-PROD-021 completo (16h), entregar o seguinte subconjunto (estimativa: 8–10h):

| Item | Incluir no escopo reduzido? |
|------|----------------------------|
| Mapa renderizando com tiles (sem pins) | Sim — substitui SVG estatico |
| Pins coloridos por estado de expedicao (RF-001) | Sim — valor central da feature |
| Popup basico ao clicar no pin (RF-002) | Sim — minimo para interatividade |
| Estado vazio (RF-005) | Sim — necessario para beta (0 expedicoes) |
| Secao de gamificacao (RF-006) | Sim — pode ser movida do SVG atual |
| Filtros por status (RF-004) | Nao — deferir para Sprint 32 |
| Clustering (RF-008) | Nao — deferir para Sprint 32 |
| Expedicoes sem coordenadas (RF-003) | Nao — deferir para Sprint 32 |
| Controles de zoom/reset (RF-007) | Sim — comportamento padrao do Mapbox |

O escopo reduzido entrega o valor central (mapa funciona, pins aparecem, click navega para expedicao) sem as features de polish.

---

## Ordem de Sacrificio (se o budget estourar alem do escopo reduzido)

Na seguinte ordem, deferir para Sprint 32:

1. SPEC-PROD-021 completo (sacrificar tudo alem do escopo reduzido, ou o escopo reduzido inteiro se necessario)
2. SPEC-PROD-022 RF-003 ("Gerar Relatorio") — as demais melhorias de card ficam
3. SPEC-PROD-022 RF-004 (quick-access links) — pode ser reduzido a apenas Checklist e Guia
4. SPEC-PROD-024 REQ-002 (mover Perfil no dropdown) — menos critico que as outras validacoes

**Nao negociavel para este sprint**:
- SPEC-PROD-023 completo (estados de fase sao a fundacao)
- SPEC-PROD-024 REQ-005 (validacao de datas — bug real, causa dados invalidos em downstream)
- SPEC-PROD-024 REQ-006 (remover botao "Completar Expedicao" — requer SPEC-PROD-023 de qualquer forma)

---

## Parallelizacao Sugerida

O tech-lead pode distribuir o trabalho assim entre dois desenvolvedores full-stack:

**Dev-fullstack-1** (semana 1): SPEC-PROD-023 completo
**Dev-fullstack-2** (semana 1): SPEC-PROD-024 REQ-002 + REQ-003 + REQ-005 (itens independentes)
**Dev-fullstack-1** (semana 2): SPEC-PROD-022 (consome estados de SPEC-PROD-023)
**Dev-fullstack-2** (semana 2): SPEC-PROD-024 REQ-006 (depende de SPEC-PROD-023) + SPEC-PROD-021 inicio

---

## Atencao: Phase 5 — Nome Canonico

O arquivo `phase-config.ts` (v0.23.0) define Phase 5 como `"Guia do Destino"`. A memoria do PO registrava `"A Conexao"` como nome canonico com nota de verificacao pendente. O codigo e a fonte de verdade para o estado atual — Phase 5 e `"Guia do Destino"`.

O tech-lead deve confirmar e atualizar a memoria do projeto antes do inicio da implementacao de qualquer spec que referencie o nome da Phase 5.

---

## Dependencias Pre-Sprint

Antes de iniciar a implementacao, o architect deve confirmar:
1. Schema Prisma: existencia e nomes exatos dos campos `checklistGeneratedAt`, `guideGeneratedAt`, `itineraryGeneratedAt` em `Trip` (consumidos por SPEC-PROD-023)
2. Token Mapbox GL JS: disponibilidade em variavel de ambiente para uso em SPEC-PROD-021
3. SPEC-ARCH necessaria para SPEC-PROD-021: estrategia de SSR vs CSR para componente de mapa (Mapbox GL JS nao e compativel com SSR)

---

## Specs Criadas neste Sprint Planning

| Spec ID | Titulo | Status | Arquivo |
|---------|--------|--------|---------|
| SPEC-PROD-021 | Meu Atlas Map Redesign | Draft | `docs/specs/sprint-31/SPEC-PROD-021-atlas-map-redesign.md` |
| SPEC-PROD-022 | Dashboard Improvements | Draft | `docs/specs/sprint-31/SPEC-PROD-022-dashboard-improvements.md` |
| SPEC-PROD-023 | Phase Completion Logic | Draft | `docs/specs/sprint-31/SPEC-PROD-023-phase-completion-logic.md` |
| SPEC-PROD-024 | UX Cleanups | Draft | `docs/specs/sprint-31/SPEC-PROD-024-ux-cleanups.md` |

**Proximas acoes pre-implementacao**:
- SPEC-UX para SPEC-PROD-021: layout da pagina /atlas e design do popup de pin
- SPEC-ARCH para SPEC-PROD-021: SSR vs CSR para Mapbox + token management
- SPEC-UX para SPEC-PROD-022: design do card expandido com quick-access chips
- Architect: confirmar nomes dos campos de timestamp no schema Prisma (SPEC-PROD-023 dependencia)
- Tech-lead: confirmar nome canonico de Phase 5 e atualizar memorias do projeto

---

## Criterio de GO para Beta Launch (Sprint 31 Review)

Sprint 31 e o sprint de beta launch (50-100 usuarios). O GO e automatico se:

| Criterio | Threshold |
|----------|-----------|
| SPEC-PROD-023 implementado e testado | 100% ACs passando |
| SPEC-PROD-024 REQ-005 (validacao de datas) | 0 expedicoes com datas invalidas em staging |
| SPEC-PROD-016 (Sprint 30) ainda passando | Regressao: taxa de falha manual <= 5% |
| GeminiProvider ativo em staging | Free tier funcionando para novos usuarios |
| LGPD pages revisadas | Presentes e aprovadas pelo product owner |
| Nenhum P0 bug em aberto | Zero bugs criticos sem mitigacao |

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-17 | product-owner | Documento inicial — Sprint 31 planning com 4 specs e decisao de escopo para 45h |
