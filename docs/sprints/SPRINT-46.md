# Sprint 46 — Central de Governança de IA

**Tipo**: Sprint de Feature (arquitetural)
**Status**: Planned (kickoff após Sprint 45)
**Owner**: tech-lead
**Co-owners**: ai-specialist, architect, security-specialist, qa-engineer, ux-designer
**Data prevista**: Após Sprint 45 (Saneamento) + Beta público
**Specs**: `docs/specs/sprint-46/` (9 specs aprovadas em 2026-04-17)

> ⚠️ **Reordenação**: Este escopo foi **deslocado da Sprint 45 original** para 46 em 2026-04-19 por decisão do PO (Volmar). A Sprint 45 passou a focar em saneamento técnico pós-Beta. Os specs de governança foram movidos de `docs/specs/sprint-45/` → `docs/specs/sprint-46/` preservando histórico.

---

## 1. Objetivo

Entregar uma **Central de Governança de IA** unificada dentro do painel `/admin`, permitindo controle em tempo real de:

1. **Modelos** (provedor, versão, custo, timeout)
2. **Prompts** (ciclo de vida draft → eval → aprovação → rollback)
3. **Curadoria de outputs** (qualidade, bias, alucinação)
4. **Audit log** (quem/quando/por quê)

Sem necessidade de redeploy — configurações propagadas via consulta ao banco.

## 2. Escopo

### 2.1 Specs aprovadas (todas em `docs/specs/sprint-46/`)

| SPEC | Domínio | Autor |
|---|---|---|
| `SPEC-PROD-AI-GOVERNANCE-V2.md` | Problema de negócio + personas | product-owner |
| `SPEC-UX-AI-GOVERNANCE-V2.md` | Fluxos de tela + wireframes | ux-designer |
| `SPEC-ARCH-AI-GOVERNANCE-V2.md` | Camada de dados + APIs + propagação | architect |
| `SPEC-AI-GOVERNANCE-V2.md` | Estratégia de prompt lifecycle | ai-specialist |
| `SPEC-SEC-AI-GOVERNANCE-V2.md` | Roles (`admin-ai`), RBAC, audit | security-specialist |
| `SPEC-QA-AI-GOVERNANCE-V2.md` | Eval gates + testes E2E | qa-engineer |
| `SPEC-RELEASE-AI-GOVERNANCE-V2.md` | CIA + change log + rollback plan | release-manager |
| `SPEC-OPS-AI-GOVERNANCE-V2.md` | Infra + observability + rollback | devops-engineer |
| `SPEC-TECHLEAD-AI-GOVERNANCE-V2.md` | Quebra em tarefas + coordenação | tech-lead |

### 2.2 Feature flag

`AI_GOVERNANCE_V2` (GrowthBook) — rollout progressivo admin-only → prod.

## 3. Critérios de Aceite

Ver `docs/specs/sprint-46/SPEC-PROD-AI-GOVERNANCE-V2.md` §Definition of Done.

## 4. Pré-requisitos (hard blockers)

- ✅ Sprint 45 (Saneamento) concluída — CI 100% verde
- ✅ Beta Fechado validado (Sprint 44 final)
- ✅ `.eslintrc.techdebt-allowlist.*` removido
- ✅ SPEC-TECHDEBT-CI-001 fechado como RESOLVED

## 5. Histórico

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0.0 | 2026-04-17 | product-owner + 8 agents | Criação dos 9 specs em `docs/specs/sprint-45/` |
| 2.0.0 | 2026-04-19 | tech-lead | Escopo deslocado para Sprint 46 (specs movidos); Sprint 45 agora é Saneamento |
