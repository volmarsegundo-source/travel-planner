# Plano de Testes — 5 CRIT Fixes (v0.23.0)

**Staging:** https://travel-planner-eight-navy.vercel.app  
**Foco:** Validar que os 5 bugs críticos recorrentes foram corrigidos  
**Pré-requisito:** Aba anônima, criar conta nova

---

## CRIT-001: Navegação sequencial Phase 3→4→5→6

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 1.1 | Criar expedição SP→Salvador, completar Phases 1-2 | Funciona | | |
| 1.2 | Completar Phase 3 "O Preparo" (marcar checklist items) | Avança | | |
| 1.3 | Clicar avançar na Phase 3 | Vai para **Phase 4 "A Logística"** | | |
| 1.4 | NÃO pula para Phase 6 | Phase 4 com 3 steps (Transporte/Hospedagem/Mobilidade) | | |
| 1.5 | Completar Phase 4, avançar | Vai para **Phase 5 "Guia do Destino"** | | |
| 1.6 | Completar Phase 5, avançar | Vai para **Phase 6 "O Roteiro"** | | |
| 1.7 | Sequência completa sem pulos | 1→2→3→4→5→6 sem saltar nenhuma fase | | |

**PASS se:** Todas as 6 fases visitadas na ordem correta, sem pular nenhuma.

---

## CRIT-002: Re-avançar após revisitar fase completada

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 2.1 | Estar na Phase 6 (roteiro gerado) | Roteiro visível | | |
| 2.2 | Clicar "Voltar" → Phase 5 | Mostra guia do destino | | |
| 2.3 | Na Phase 5, clicar "Avançar" | Volta para **Phase 6** sem erro | | |
| 2.4 | NÃO mostra "Esta fase já foi concluída" bloqueando | Navegação livre | | |
| 2.5 | Voltar de Phase 6 para Phase 4 (via progress bar) | Phase 4 abre | | |
| 2.6 | De Phase 4, avançar sequencialmente | 4→5→6 sem bloqueio | | |
| 2.7 | Roteiro ainda está lá (persistência) | Itinerário mantido | | |

**PASS se:** Pode ir e voltar entre fases livremente, sem mensagem de bloqueio.

---

## CRIT-003: Progress bar navega para fase específica

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 3.1 | No Dashboard, clicar na **Phase 1** na barra | Abre **Phase 1** (não Phase 3 ou 6) | | |
| 3.2 | Clicar na **Phase 2** na barra | Abre **Phase 2** | | |
| 3.3 | Clicar na **Phase 3** na barra | Abre **Phase 3** (checklist) | | |
| 3.4 | Clicar na **Phase 4** na barra | Abre **Phase 4** (logística) | | |
| 3.5 | Clicar na **Phase 5** na barra | Abre **Phase 5** (guia) | | |
| 3.6 | Clicar na **Phase 6** na barra | Abre **Phase 6** (roteiro) | | |
| 3.7 | Cada click vai para a fase CORRETA | Nunca vai para outra fase | | |

**PASS se:** Cada segmento navega exatamente para aquela fase, sem redirecionar para outra.

---

## CRIT-004: Classificação doméstica SP→Salvador

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 4.1 | Criar expedição: Origem "São Paulo", Destino "Salvador" | Campos preenchidos | | |
| 4.2 | Avançar até Phase 3 "O Preparo" | Checklist aparece | | |
| 4.3 | Classificação visível | **"Nacional"** ou **"Doméstica"** | | |
| 4.4 | NÃO mostra "Internacional" | Correto para viagem dentro do Brasil | | |
| 4.5 | Items do checklist coerentes | SEM passaporte, visto (são items internacionais) | | |

**PASS se:** SP→Salvador classificada como Nacional/Doméstica, sem items internacionais no checklist.

---

## CRIT-005: Autocomplete opaco + nome da cidade persiste

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 5.1 | Digitar "Salvador" no campo destino | Dropdown aparece | | |
| 5.2 | Fundo do dropdown | **Opaco** (sem transparência) | | |
| 5.3 | Formato dos resultados | **"Salvador, Bahia, Brasil"** (cidade incluída) | | |
| 5.4 | Selecionar Salvador | Campo mostra **"Salvador, Bahia, Brasil"** | | |
| 5.5 | NÃO reduz para "Salvador, Brasil" | Cidade + Estado + País mantidos | | |
| 5.6 | Digitar "Roma" no campo destino | Dropdown opaco, "Roma, Lácio, Itália" | | |
| 5.7 | Digitar "São Paulo" no campo origem | Dropdown opaco, formato correto | | |
| 5.8 | Velocidade | Resultados em < 3 segundos | | |

**PASS se:** Dropdown opaco, formato com cidade, seleção persiste nome completo.

---

## Resumo

| CRIT | Testes | Descrição |
|---|---|---|
| CRIT-001 | 7 | Navegação sequencial 3→4→5→6 |
| CRIT-002 | 7 | Re-avançar após revisitar |
| CRIT-003 | 7 | Progress bar → fase correta |
| CRIT-004 | 5 | Doméstica ≠ Internacional |
| CRIT-005 | 8 | Autocomplete opaco + persistência |
| **TOTAL** | **34** | |

---

## Critério de Aprovação

- **5/5 CRITs PASS** → Prontos para Beta Launch
- **4/5 CRITs PASS** → Mais um fix rápido, depois Beta
- **3 ou menos PASS** → Mais um sprint de estabilização

Para cada FAIL: número + screenshot + o que aconteceu
