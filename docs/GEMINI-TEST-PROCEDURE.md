# Procedimento de Teste Manual — Gemini AI Provider (Staging)

> **Sprint 41** | Versao: 1.0 | Data: 2026-04-07

## Sumario

Este documento descreve o procedimento passo a passo para testar o provider Gemini (Google AI) no ambiente de staging do Atlas Travel Planner, incluindo testes de geracao, fallback automatico, qualidade de resposta e restauracao.

---

## 1. Pre-requisitos

Antes de iniciar os testes, confirme que todos os itens abaixo estao disponiveis:

| Item | Descricao | Status |
|------|-----------|--------|
| URL de Staging | URL do deploy Vercel (Preview/Staging) | [ ] |
| Conta Admin | Acesso ao painel `/admin/ai-governance` | [ ] |
| Usuario de Teste | Conta com expeditcao em Fase 5+ (ou criar uma nova) | [ ] |
| `GOOGLE_AI_API_KEY` | Ja configurada no Vercel (staging + production) | [ ] |
| `ANTHROPIC_API_KEY` | Ja configurada (para testes de fallback e restauracao) | [ ] |
| Acesso ao Vercel Dashboard | Permissao para editar Environment Variables e fazer redeploy | [ ] |
| Navegador com DevTools | Para medir tempos de resposta e inspecionar erros | [ ] |

**Importante**: Anote o valor atual de `AI_PROVIDER` antes de alterar qualquer variavel, para garantir restauracao correta ao final.

---

## 2. Teste do Provider Gemini (Fase 5 + Fase 6)

### 2.1 Configuracao do Ambiente

1. Acesse o **Vercel Dashboard** > Projeto Atlas > **Settings** > **Environment Variables**
2. Localize a variavel `AI_PROVIDER`:
   - Se nao existir, crie com o valor `gemini`
   - Se existir, altere de `anthropic` para `gemini`
   - Escopo: selecione **Preview** (ou o ambiente correspondente ao staging)
3. Salve a alteracao

[SCREENSHOT: Vercel Environment Variables com AI_PROVIDER=gemini]

4. Faca o redeploy do staging:
   - Opcao A: **Deployments** > selecione o ultimo deploy > **Redeploy**
   - Opcao B: Push de um commit para a branch de staging
5. Aguarde o deploy completar com sucesso (status "Ready")

[SCREENSHOT: Deploy status Ready no Vercel]

### 2.2 Teste da Fase 5 — Guia do Destino

6. Acesse a URL de staging no navegador
7. Faca login com o usuario de teste
8. Navegue ate uma expeditcao existente ou crie uma nova com destino "Tokyo, Japan"
9. Avance ate a **Fase 5 (Guia do Destino)**
10. Clique em **Gerar Guia** para o destino "Tokyo, Japan"
11. Abra o DevTools (F12) > aba **Network** para monitorar o tempo de resposta

**Verificacoes — Fase 5:**

| # | Verificacao | Esperado | Resultado |
|---|------------|----------|-----------|
| 5.1 | Guia gerado com sucesso? | Sim, sem erros na tela | [ ] OK / [ ] FALHA |
| 5.2 | Secoes presentes? (overview, quickFacts, safety, mustSee, culturalTips) | Todas as secoes renderizadas | [ ] OK / [ ] FALHA |
| 5.3 | Quick Facts corretos? (moeda: Yen, idioma: Japones, fuso horario: JST) | Dados coerentes com o destino | [ ] OK / [ ] FALHA |
| 5.4 | Custos diarios presentes? (budget/mid/premium) | Tabela de custos visivel | [ ] OK / [ ] FALHA |
| 5.5 | Dicas culturais relevantes? | Pelo menos 3 dicas pertinentes | [ ] OK / [ ] FALHA |
| 5.6 | Tempo de resposta aceitavel? | < 30 segundos | [ ] OK / [ ] FALHA |
| 5.7 | Algum erro no console do navegador? | Nenhum erro relacionado a AI | [ ] OK / [ ] FALHA |

**Tempo de resposta observado (Fase 5):** ______ segundos

[SCREENSHOT: Guia do destino gerado com sucesso para Tokyo]

### 2.3 Teste da Fase 6 — Roteiro (Itinerario)

12. Navegue ate a **Fase 6 (Roteiro)**
13. Gere um roteiro para uma viagem de **5 dias**
14. Monitore o tempo de resposta no DevTools

**Verificacoes — Fase 6:**

| # | Verificacao | Esperado | Resultado |
|---|------------|----------|-----------|
| 6.1 | Roteiro gerado com sucesso? | Sim, sem erros na tela | [ ] OK / [ ] FALHA |
| 6.2 | Numero correto de dias? | 5 dias no roteiro | [ ] OK / [ ] FALHA |
| 6.3 | Atividades por dia? | Pelo menos 3 atividades por dia | [ ] OK / [ ] FALHA |
| 6.4 | Tipos de atividade variados? | Mix de SIGHTSEEING, FOOD, LEISURE etc. | [ ] OK / [ ] FALHA |
| 6.5 | Orcamento total presente? | Valor em moeda com total estimado | [ ] OK / [ ] FALHA |
| 6.6 | Dicas (tips) presentes? | Pelo menos 2 dicas no final | [ ] OK / [ ] FALHA |
| 6.7 | Tempo de resposta aceitavel? | < 30 segundos | [ ] OK / [ ] FALHA |

**Tempo de resposta observado (Fase 6):** ______ segundos

[SCREENSHOT: Roteiro de 5 dias gerado com sucesso]

### 2.4 Verificacao no Dashboard Admin

15. Navegue ate `/admin/ai-governance`
16. Localize a secao **Interacoes Recentes** (ultimas 20 interacoes)
17. Identifique as interacoes de Fase 5 (guide) e Fase 6 (plan) que acabou de gerar

**Verificacoes — Dashboard Admin:**

| # | Verificacao | Esperado | Resultado |
|---|------------|----------|-----------|
| A.1 | Provider aparece como "Google"? | Coluna provider: "Google" (internamente "gemini") | [ ] OK / [ ] FALHA |
| A.2 | Modelo aparece como "gemini-2.0-flash"? | Coluna model: "gemini-2.0-flash" | [ ] OK / [ ] FALHA |
| A.3 | Custo registrado? | Valor > $0.00 (esperado < $0.01 por chamada) | [ ] OK / [ ] FALHA |
| A.4 | Status "success"? | Coluna status: "success" | [ ] OK / [ ] FALHA |
| A.5 | Latencia registrada? | Valor em ms coerente com o tempo observado | [ ] OK / [ ] FALHA |
| A.6 | Tokens de entrada e saida registrados? | Valores > 0 para ambos | [ ] OK / [ ] FALHA |

[SCREENSHOT: Dashboard admin mostrando interacoes com provider Google e modelo gemini-2.0-flash]

---

## 3. Teste do Fallback Automatico

O sistema de fallback ativa o provider secundario automaticamente quando o primario falha com erros de infraestrutura (rate limit 429 ou timeout 504). Erros de autenticacao (401/403) tambem disparam o fallback pois sao tratados como erros nao-AppError pelo FallbackProvider.

### 3.1 Configuracao para Simular Falha

1. No **Vercel Dashboard** > **Environment Variables**, configure:
   - `AI_PROVIDER` = `gemini`
   - `AI_FALLBACK_PROVIDER` = `anthropic`
   - `GOOGLE_AI_API_KEY` = `invalid-key-for-testing`

> **ATENCAO**: Anote o valor original de `GOOGLE_AI_API_KEY` em local seguro antes de substitui-lo! Voce precisara restaura-lo no passo 3.3.

2. Salve as alteracoes e faca **Redeploy** do staging
3. Aguarde o deploy completar

### 3.2 Execucao do Teste de Fallback

4. Acesse o staging e faca login
5. Navegue ate a **Fase 5** e tente gerar um guia

**Verificacoes — Fallback:**

| # | Verificacao | Esperado | Resultado |
|---|------------|----------|-----------|
| F.1 | Geracao completou com sucesso? | Sim (usando Claude como fallback) | [ ] OK / [ ] FALHA |
| F.2 | Conteudo do guia e valido? | Guia completo e correto | [ ] OK / [ ] FALHA |
| F.3 | No admin dashboard, provider da interacao? | "Anthropic" (Claude) — fallback ativado | [ ] OK / [ ] FALHA |
| F.4 | Modelo no dashboard? | "claude-haiku-4-5-20251001" (modelo de guide) | [ ] OK / [ ] FALHA |
| F.5 | Nos logs do Vercel (Functions), ha warning de fallback? | Log com "ai.fallback.activated" esperado | [ ] OK / [ ] FALHA |

**Nota sobre logs**: Acesse o Vercel Dashboard > **Deployments** > deploy ativo > **Functions** > **Logs** para verificar os logs de runtime. Procure por entradas contendo `ai.fallback.activated` ou `ai.provider.gemini.error`.

[SCREENSHOT: Logs do Vercel mostrando ativacao do fallback]

### 3.3 Restauracao da API Key

> **CRITICO**: Execute este passo imediatamente apos concluir o teste de fallback.

6. No **Vercel Dashboard** > **Environment Variables**:
   - Restaure `GOOGLE_AI_API_KEY` para o **valor original correto**
7. Faca **Redeploy** do staging
8. Verifique que o deploy completou com sucesso

---

## 4. Teste de Qualidade — Comparacao Gemini vs Claude

Para este teste, execute a mesma geracao em ambos os providers e compare os resultados lado a lado. Utilize o mesmo destino e parametros para ambos.

**Destino de teste recomendado**: Tokyo, Japan (viagem de 5 dias)

### 4.1 Procedimento

1. Configure `AI_PROVIDER=anthropic`, faca redeploy, gere guia + roteiro
2. Anote os resultados e tempo de resposta
3. Configure `AI_PROVIDER=gemini`, faca redeploy, gere guia + roteiro
4. Anote os resultados e tempo de resposta
5. Limpe o cache Redis se necessario (para evitar cache hits entre testes)

**Nota sobre cache**: O sistema usa cache Redis (TTL 24h) para evitar chamadas duplicadas. Se o mesmo destino ja foi gerado anteriormente, o resultado vira do cache independente do provider. Para garantir teste limpo, use destinos diferentes ou solicite ao DevOps a limpeza das chaves `ai:guide:*` e `ai:plan:*` no Redis.

### 4.2 Tabela Comparativa

| Criterio | Claude (Anthropic) | Gemini (Flash) | Aceitavel? |
|----------|-------------------|----------------|------------|
| **Guia: estrutura correta** (todas as secoes JSON validas) | | | [ ] Sim / [ ] Nao |
| **Guia: qualidade do conteudo** (informacoes precisas e uteis) | | | [ ] Sim / [ ] Nao |
| **Guia: tempo de resposta** (segundos) | ___s | ___s | [ ] Sim / [ ] Nao |
| **Guia: custo estimado** (USD por chamada) | $____ | $____ | [ ] Sim / [ ] Nao |
| **Roteiro: numero de dias correto** | | | [ ] Sim / [ ] Nao |
| **Roteiro: atividades relevantes** (coerentes com destino) | | | [ ] Sim / [ ] Nao |
| **Roteiro: orcamento razoavel** (valores realistas) | | | [ ] Sim / [ ] Nao |
| **Roteiro: tempo de resposta** (segundos) | ___s | ___s | [ ] Sim / [ ] Nao |
| **Roteiro: custo estimado** (USD por chamada) | $____ | $____ | [ ] Sim / [ ] Nao |
| **Idioma**: resposta no idioma correto (pt-BR ou en) | | | [ ] Sim / [ ] Nao |

### 4.3 Notas de Qualidade

Espaco para observacoes subjetivas sobre diferenca de qualidade:

- **Guia (Gemini vs Claude)**: ___________________________________________
- **Roteiro (Gemini vs Claude)**: ________________________________________
- **Recomendacao**: _____________________________________________________

---

## 5. Restauracao Pos-Teste

Ao final de todos os testes, o ambiente de staging deve ser restaurado ao estado original.

### 5.1 Passos de Restauracao

1. No **Vercel Dashboard** > **Environment Variables**:
   - Setar `AI_PROVIDER` = `anthropic`
   - Manter `AI_FALLBACK_PROVIDER` = `gemini` (recomendado para resiliencia)
   - Confirmar que `GOOGLE_AI_API_KEY` esta com o **valor correto** (nao o valor de teste)
2. Salvar alteracoes
3. Fazer **Redeploy** do staging
4. Aguardar deploy completar

### 5.2 Verificacao da Restauracao

5. Acesse o staging e faca login
6. Gere um guia ou roteiro em qualquer expeditcao
7. Acesse `/admin/ai-governance` e verifique:

| # | Verificacao | Esperado | Resultado |
|---|------------|----------|-----------|
| R.1 | Provider na interacao mais recente? | "Anthropic" (Claude) | [ ] OK / [ ] FALHA |
| R.2 | Modelo na interacao mais recente? | "claude-haiku-4-5-20251001" (guide) ou "claude-sonnet-4-6" (plan) | [ ] OK / [ ] FALHA |
| R.3 | Geracao completou com sucesso? | Status "success" | [ ] OK / [ ] FALHA |

[SCREENSHOT: Dashboard admin confirmando retorno ao provider Anthropic]

---

## 6. Criterios de Aceitacao

Todos os itens abaixo devem ser marcados para considerar o teste do Gemini como aprovado:

- [ ] Gemini gera guia do destino (Fase 5) com sucesso
- [ ] Gemini gera roteiro (Fase 6) com sucesso
- [ ] Provider "Google" e modelo "gemini-2.0-flash" aparecem corretamente no dashboard admin
- [ ] Custo registrado corretamente (valores > $0.00, esperado < $0.01 por chamada)
- [ ] Tokens de entrada e saida registrados corretamente
- [ ] Fallback para Anthropic funciona quando Gemini falha (chave invalida)
- [ ] Qualidade da resposta Gemini e aceitavel para uso em beta
- [ ] Tempo de resposta Gemini e aceitavel (< 30 segundos)
- [ ] Restauracao para Anthropic funciona sem problemas
- [ ] Nenhum erro inesperado nos logs do Vercel

---

## 7. Decisao Final

Baseado nos resultados dos testes acima, selecione a configuracao recomendada para producao:

- [ ] **Opcao A (Recomendada)**: `AI_PROVIDER=anthropic` com `AI_FALLBACK_PROVIDER=gemini`
  - Claude como provider primario (qualidade maxima)
  - Gemini como fallback automatico (resiliencia)
  - Custo: padrao Anthropic, com economia em cenarios de fallback

- [ ] **Opcao B (Economia)**: `AI_PROVIDER=gemini` com `AI_FALLBACK_PROVIDER=anthropic`
  - Gemini como provider primario (custo menor — Flash e significativamente mais barato)
  - Claude como fallback automatico (qualidade garantida em falhas)
  - Custo: reducao estimada de 70-80% em chamadas AI

- [ ] **Opcao C (Sem fallback)**: `AI_PROVIDER=anthropic` sem fallback configurado
  - Comportamento atual, sem redundancia
  - Nao recomendado para producao

### Justificativa da Decisao

_______________________________________________________________________________
_______________________________________________________________________________

### Aprovado por

| Papel | Nome | Data |
|-------|------|------|
| QA Engineer | | |
| Tech Lead | | |
| FinOps Engineer | | |

---

## Apendice: Referencia Tecnica

### Variaveis de Ambiente Relevantes

| Variavel | Valores possiveis | Default | Descricao |
|----------|------------------|---------|-----------|
| `AI_PROVIDER` | `anthropic`, `gemini` | `anthropic` | Provider primario de AI |
| `AI_FALLBACK_PROVIDER` | `anthropic`, `gemini` | (nenhum) | Provider de fallback automatico |
| `GOOGLE_AI_API_KEY` | string | (obrigatorio para Gemini) | Chave da API Google AI |
| `ANTHROPIC_API_KEY` | string (sk-ant-*) | (obrigatorio para Claude) | Chave da API Anthropic |

### Modelos Utilizados

| Provider | Tipo | Modelo | Uso |
|----------|------|--------|-----|
| Anthropic | plan | claude-sonnet-4-6 | Geracao de roteiro (Fase 6) |
| Anthropic | checklist | claude-haiku-4-5-20251001 | Checklist pre-viagem |
| Anthropic | guide | claude-haiku-4-5-20251001 | Guia do destino (Fase 5) |
| Gemini | plan | gemini-2.0-flash | Geracao de roteiro (Fase 6) |
| Gemini | checklist | gemini-2.0-flash | Checklist pre-viagem |
| Gemini | guide | gemini-2.0-flash | Guia do destino (Fase 5) |

### Comportamento do Fallback

O `FallbackProvider` ativa o provider secundario **apenas** em erros de infraestrutura:
- **Rate limit** (HTTP 429)
- **Timeout** (HTTP 504)
- **Erros de rede** (excecoes nao-AppError)

Erros de autenticacao (401), modelo nao encontrado (404) e erros de parse (502) **nao** ativam o fallback quando sao AppError com codigos `AI_AUTH_ERROR` ou `AI_MODEL_ERROR`, pois indicam problemas de configuracao, nao falhas transitorias.

### Arquivos de Codigo Relevantes

| Arquivo | Descricao |
|---------|-----------|
| `src/server/services/providers/gemini.provider.ts` | Implementacao do GeminiProvider |
| `src/server/services/providers/claude.provider.ts` | Implementacao do ClaudeProvider |
| `src/server/services/providers/fallback.provider.ts` | Logica de fallback automatico |
| `src/server/services/ai.service.ts` | Factory `getProvider()`, resolucao de modelo, cache |
| `src/server/services/ai-gateway.service.ts` | Log de interacoes com provider + modelo |
| `src/lib/env.ts` | Validacao das variaveis de ambiente |
| `src/app/[locale]/(app)/admin/ai-governance/` | Dashboard admin de governanca AI |
