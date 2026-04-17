---
name: Sprint 45 — AI Governance Central V2
description: Contexto do Sprint 45: admin edita prompts/model/timeout via UI com polling DB real-time, sob feature flag AI_GOVERNANCE_V2
type: project
---

Sprint 45 introduz a "Central de Governança de IA" — admin edita prompts, escolhe modelo/timeout por fase, roda evals Promptfoo e cura outputs, tudo via UI. Mudanças aplicam em tempo real (polling DB a cada chamada AI). Feature flag: `AI_GOVERNANCE_V2`.

**Why:** separar prompts de código — iteração rápida sem deploy, com mesmo rigor (validações + evals) de mudança de código.

**How to apply:**
- Responsabilidades divididas: `SPEC-PROD-AI-GOVERNANCE-V2` (PO — UX, ciclo de vida, audit log), `SPEC-AI-GOVERNANCE-V2` (ai-specialist — placeholder schema, validações, timeouts, eval gate, curadoria, guia admin), arquitetura/persistência ainda não especificada (architect deve abrir SPEC-ARCH-AI-GOVERNANCE-V2).
- Gate de promoção Draft → Active: Trust Score composto ≥ 0.80 **e** Safety ≥ 0.90 (degradação crítica SPEC-EVALS-V1). Sem override em prod.
- Timeouts default decididos: Gemini 2.0/2.5 Flash 30s, Haiku 4.5 25s, Sonnet 4.6 45s, Opus 4.7 50s. Mins/máximos editáveis.
- Datasets reutilizam `tests/evals/datasets/{guide,plan,checklist}.yaml` (SPEC-EVALS-V1). Novo tipo de prompt exige dataset antes do primeiro draft.
- Curadoria: 3 critérios de bias + 3 de alucinação + 3 de risco. Ação `escalated` = ticket P1 + notifica security-specialist.
- Placeholders proibidos: PII (`{userEmail}`, `{cpf}`, ...), segredos (`{apiKey}`, `{anthropicApiKey}`), URLs internas (`{localhost}`, `.internal`).
- Reviewers da spec: product-owner, tech-lead, architect, qa-engineer, security-specialist.
