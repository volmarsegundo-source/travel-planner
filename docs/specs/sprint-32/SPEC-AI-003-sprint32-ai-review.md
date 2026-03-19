---
spec-id: SPEC-AI-003
title: Sprint 32 AI Impact Review — Phase 6 Auto-Generation
version: 1.0.0
status: Draft
author: prompt-engineer
sprint: 32
reviewers: [tech-lead, finops-engineer]
---

# SPEC-AI-003 — Sprint 32 AI Impact Review

## Contexto

Sprint 32 e um sprint de estabilizacao. A unica mudanca com impacto em IA e o P0-007/UX-006 (TASK-S32-008): Phase 6 deve auto-gerar o roteiro na primeira visita, eliminando o botao manual "Gerar Roteiro".

**Fluxo atual:** Utilizador chega na Phase 6 (Phase6Wizard) -> ve botao "Gerar Roteiro" -> clica -> `POST /api/ai/plan/stream` (SSE) -> roteiro aparece.

**Fluxo proposto:** Utilizador chega na Phase 6 -> se nao existe roteiro, a geracao dispara automaticamente no `useEffect` / mount -> mesmo endpoint SSE -> roteiro aparece.

---

## 1. Impacto no Orcamento de Tokens

**Estimativa: zero custo adicional.**

- O numero de chamadas AI nao muda. Todo utilizador que alcanca a Phase 6 eventualmente clicaria no botao. A mudanca apenas antecipa o disparo para o carregamento da pagina.
- Modelo utilizado: **Claude Sonnet** para roteiros (planos de viagem), **Claude Haiku** para checklists e guias.
- Nao ha mudanca no tamanho do prompt, no numero de tokens de entrada/saida, nem no modelo selecionado.

**Cenario de risco (mitigado):** Refreshes repetidos na Phase 6 poderiam multiplicar chamadas. Porem, o lock Redis existente (1 geracao por tripId a cada 5 minutos, via `NX+EX TTL 300s`) impede duplicatas. O segundo request dentro da janela recebe o lock denial e nao consome tokens.

---

## 2. Alteracoes de Prompt

**Nenhuma alteracao necessaria.**

O mesmo prompt template e utilizado independentemente do trigger (botao vs. auto). Nao ha mudancas em:
- System prompt
- User prompt template
- Parametros do modelo (temperature, max_tokens)
- Formato de saida (Zod schema para parsing)

---

## 3. Rate Limiting

**Mecanismo existente e suficiente.**

| Controle | Descricao | Status |
|----------|-----------|--------|
| Redis NX+EX lock | 1 geracao por `tripId` a cada 300s | Ativo, sem mudancas |
| Endpoint auth guard | Sessao obrigatoria + BOLA check (trip pertence ao user) | Ativo |
| API key rate limit | Limite da Anthropic API por organizacao | Externo, sem mudancas |

**Cenario validado:** Auto-trigger no mount + refresh manual dentro de 5 min = lock Redis bloqueia a segunda chamada. O utilizador ve o roteiro ja gerado (carregado do banco) ou a mensagem de rate limit.

---

## 4. Tratamento de Erros

**Recomendacao critica: fallback para botao manual.**

Se a auto-geracao falhar (erro de API, rate limit, timeout de rede), o Phase6Wizard **deve** exibir o botao "Gerar Roteiro" como fallback. O utilizador nunca deve ver uma pagina em branco.

Fluxo de fallback recomendado:
1. Mount -> auto-trigger geracao
2. Se erro -> exibir mensagem de erro + botao "Tentar Novamente"
3. Se rate limit -> exibir mensagem "Geracao em andamento, aguarde" + botao desabilitado com countdown
4. Se timeout -> exibir botao "Gerar Roteiro" manual

Este padrao ja e parcialmente implementado no Phase6Wizard atual (tratamento de erros do streaming). A mudanca apenas precisa garantir que o estado de erro mostra um CTA acionavel.

---

## 5. Estimativa de Custo

| Metrica | Antes (botao) | Depois (auto) | Delta |
|---------|---------------|---------------|-------|
| Chamadas AI / mes | N | N | 0 |
| Tokens entrada / chamada | ~2K-4K | ~2K-4K | 0 |
| Tokens saida / chamada | ~3K-6K | ~3K-6K | 0 |
| Custo estimado / chamada (Sonnet) | ~$0.02-0.05 | ~$0.02-0.05 | 0 |
| Lock Redis (chamadas bloqueadas) | Raro | Ligeiramente mais frequente | Negligivel |

**Conclusao: custo zero adicional.** A mudanca e puramente de UX (quando o trigger acontece), nao de volume ou complexidade de IA.

---

## 6. Checklist de Validacao

- [ ] Auto-trigger dispara apenas quando nao existe roteiro persistido para o tripId
- [ ] Lock Redis impede duplicatas em refresh rapido
- [ ] Falha na geracao exibe fallback com botao manual
- [ ] Nenhum prompt foi alterado
- [ ] Nenhum modelo foi trocado
- [ ] Testes unitarios cobrem: auto-trigger, lock denial, fallback de erro

---

## Historico de Alteracoes

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0.0 | 2026-03-19 | prompt-engineer | Criacao do documento |
