---
spec-id: SPEC-COST-004
title: Sprint 33 Cost Assessment
version: 1.0.0
status: Draft
author: finops-engineer
sprint: 33
reviewers: [tech-lead, architect]
---

# SPEC-COST-004 — Sprint 33 Cost Assessment

## Resumo

As alteracoes do Sprint 33 tem **impacto de custo negligivel**. O enriquecimento do prompt adiciona ~600 tokens de input por geracao, e os provedores de login social sao gratuitos.

## Analise por Area

### AI (Anthropic API) — Prompt Enrichment

O enriquecimento do prompt da Fase 6 (SPEC-PROD-033) injeta dados das fases 1-5 no contexto da geracao de itinerario.

| Metrica | Antes | Depois | Delta |
|---------|-------|--------|-------|
| Input tokens por geracao | ~800 | ~1400 | +600 |
| Custo por geracao (Claude Sonnet) | ~$0.0024 | ~$0.0042 | +$0.0018 |
| Custo adicional por 1000 geracoes | — | — | +$1.80 |

A $3/M input tokens, o aumento de ~600 tokens e **negligivel**. Mesmo com 1000 geracoes mensais, o custo adicional seria de ~$1.80/mes.

### Login Social — Google OAuth

- **Custo**: Gratuito
- Google OAuth 2.0 nao cobra por autenticacao
- Nenhum limite de usuarios para aplicacoes em producao
- Requer apenas Google Cloud Console (tier gratuito)

### Login Social — Apple Sign-In

- **Custo**: Gratuito (incluso no Apple Developer Program)
- Apple Developer Program: $99/ano (ja pago para distribuicao de apps)
- Nenhum custo adicional por autenticacao
- Sem limites de volume

### Database (PostgreSQL)

- Nenhuma nova tabela ou migracao
- Tabelas `Account` e `Session` do Auth.js ja existem
- Crescimento minimo: ~200 bytes por conta social vinculada
- Impacto no armazenamento: desprezivel

### Cache (Redis)

Patterns existentes inalterados. Sem novos keys ou aumento de memoria.

### Vercel (Hosting)

- Callbacks OAuth adicionam invocacoes de serverless functions
- Volume esperado: baixo (somente durante login)
- Impacto no tier gratuito: desprezivel

### Servicos de Terceiros

Nenhum novo servico de terceiros introduzido. Google OAuth e Apple Sign-In sao servicos nativos das plataformas.

## Projecao Mensal

| Item | Custo estimado |
|------|---------------|
| Prompt enrichment (1000 geracoes) | +$1.80 |
| Google OAuth | $0.00 |
| Apple Sign-In | $0.00 |
| **Total incremental** | **~$1.80/mes** |

## Veredicto

**APPROVED** — Zero impacto significativo de custo. O aumento de ~$1.80/mes para prompt enrichment e negligivel e compensado pela melhoria na qualidade dos itinerarios gerados.
