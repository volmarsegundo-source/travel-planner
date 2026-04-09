# Plano de Testes v0.24.0 — Phase Navigation Redesign

**Staging:** https://travel-planner-eight-navy.vercel.app  
**Versão:** v0.24.0  
**Foco:** Validar redesign arquitetural da navegação + 5 CRITs + mudanças UX  
**Pré-requisito:** Aba anônima, conta nova

---

## CENÁRIO 1 — Registro e Header

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 1.1 | Criar conta nova | Auto-login → redireciona às Expedições | | |
| 1.2 | Saudação | "Bem-vindo ao Atlas, [Nome]!" | | |
| 1.3 | Header gamificação | Badge pontos + nível visível | | |
| 1.4 | Header navegação | "Expedições" e "Meu Atlas" separados | | |
| 1.5 | **Sem overlay de pontos** | Pontos atualizam SÓ no header (sem popup +15pts) | | |

---

## CENÁRIO 2 — Phase 1 "O Chamado" (REDESIGN)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 2.1 | Nova Expedição | Wizard inicia com info pessoal | | |
| 2.2 | **Progress bar de FASES** | Barra de fases 1-6 visível no topo (antes não existia na Phase 1) | | |
| 2.3 | **Progress bar de PASSOS** | StepProgressIndicator mostrando passos dentro da fase | | |
| 2.4 | **PhaseShell wrapper** | Nome da fase + passo visível, layout responsivo | | |
| 2.5 | **Largura responsiva** | Desktop: max-w-2xl / Mobile: max-w-md | | |
| 2.6 | Nome obrigatório | Campo com asterisco, bloqueia sem preencher | | |
| 2.7 | Data nascimento obrigatória | Campo com asterisco | | |
| 2.8 | Nome pré-preenchido | Do registro | | |

### Autocomplete (CRIT-005)
| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 2.9 | Digitar "Salvador" | Dropdown aparece | | |
| 2.10 | **Fundo opaco** | Sem transparência — cmdk+Radix portal | | |
| 2.11 | **Formato** | "Salvador, Bahia, Brasil" (cidade + estado + país) | | |
| 2.12 | **Selecionar** | Campo mantém "Salvador, Bahia, Brasil" (não reduz) | | |
| 2.13 | Sem resultados | Digitar "xyzabc" → mensagem "Nenhum resultado" | | |
| 2.14 | Velocidade | < 3 segundos | | |
| 2.15 | Origem "São Paulo" | Mesmo padrão opaco + formato correto | | |
| 2.16 | **Mesma cidade bloqueada** | Colocar mesma cidade em origem e destino → erro de validação | | |

### Continuação Phase 1
| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 2.17 | Datas obrigatórias | Ida e volta obrigatórios | | |
| 2.18 | Tipo viajante | Selecionar Solo | | |
| 2.19 | Passageiros (Solo) | NÃO aparece | | |
| 2.20 | Orçamento | BRL em PT | | |
| 2.21 | **CTA padronizado** | Botão diz **"Avançar"** em todos os passos | | |
| 2.22 | Botão voltar | Funciona entre passos | | |

---

## CENÁRIO 3 — Preferências

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 3.1 | 2 páginas | 5+5 categorias | | |
| 3.2 | Chips legíveis | Sem truncamento | | |
| 3.3 | **Persistência ao voltar** | Voltar pág 2→1: seleções mantidas | | |
| 3.4 | Pontos no header | Header atualiza ao selecionar | | |

---

## CENÁRIO 4 — Confirmação + Transições (REDESIGN)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 4.1 | Confirmação Phase 1 | Nome, Bio, Destino, Origem, Datas | | |
| 4.2 | Dados faltantes | "Não informado" | | |
| 4.3 | Preferências detalhe | Lista categorias + valores (não só contagem) | | |
| 4.4 | **Sem countdown 3s** | Transição sem timer numérico | | |
| 4.5 | **Sem skip button** | Removido | | |
| 4.6 | **Sem overlay pontos** | Sem popup "+15 pts" flutuante | | |
| 4.7 | CTA | "Avançar" padronizado | | |

---

## CENÁRIO 5 — Navegação Sequencial (CRIT-001)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 5.1 | Phase 1 → Phase 2 | Avança corretamente | | |
| 5.2 | Phase 2 → Phase 3 | Avança corretamente | | |
| 5.3 | **Phase 3 → Phase 4** | Vai para **"A Logística"** (NÃO pula para Phase 6) | | |
| 5.4 | **Phase 4 → Phase 5** | Vai para **"Guia do Destino"** | | |
| 5.5 | **Phase 5 → Phase 6** | Vai para **"O Roteiro"** | | |
| 5.6 | Nenhuma fase pulada | 1→2→3→4→5→6 sequencial completo | | |

---

## CENÁRIO 6 — Phase 3 "O Preparo"

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 6.1 | Título | **"O Preparo"** | | |
| 6.2 | **PhaseShell** | Progress bar fases + nome fase visíveis | | |
| 6.3 | **Classificação SP→Salvador** | **"Nacional"** (NÃO "Internacional") | | |
| 6.4 | Checklist | Items gerados | | |
| 6.5 | Avançar | Vai para Phase 4 | | |

---

## CENÁRIO 7 — Phase 4 "A Logística"

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 7.1 | Título | **"A Logística"** | | |
| 7.2 | **PhaseShell** | Progress bar fases + nome fase | | |
| 7.3 | **StepProgressIndicator** | Indicador de 3 steps visível | | |
| 7.4 | 3 steps | Transporte → Hospedagem → Mobilidade | | |
| 7.5 | Step 1 pré-preenchido | Origem, Destino, Datas | | |
| 7.6 | Labels | "Ida/Volta", "Empresa" | | |
| 7.7 | CTA | "Avançar" padronizado | | |
| 7.8 | Avançar | Vai para Phase 5 | | |

---

## CENÁRIO 8 — Phase 5 "Guia do Destino" (NOME CANÔNICO)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 8.1 | **Título** | **"Guia do Destino"** (NÃO "O Mapa dos Dias") | | |
| 8.2 | **PhaseShell** | Progress bar fases visível | | |
| 8.3 | **AiDisclaimer** | Componente padronizado com ícone IA no topo | | |
| 8.4 | Auto-geração | Guia gera automaticamente | | |
| 8.5 | 10 seções visíveis | Todas abertas | | |
| 8.6 | Cards uniformes | Mesmo tamanho e estilo | | |
| 8.7 | Sem botão "Atualizar" | Removido | | |
| 8.8 | Avançar | Vai para Phase 6 | | |

---

## CENÁRIO 9 — Phase 6 "O Roteiro" (NOME CANÔNICO)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 9.1 | **Título** | **"O Roteiro"** (NÃO "O Tesouro") | | |
| 9.2 | **PhaseShell** | Progress bar fases visível | | |
| 9.3 | **AiDisclaimer** | Componente padronizado | | |
| 9.4 | **Sem footer PhaseShell** | Botões inline no roteiro | | |
| 9.5 | Auto-geração | Gera na primeira visita | | |
| 9.6 | Streaming | Sem JSON raw | | |
| 9.7 | Regenerar | Botão funcional | | |
| 9.8 | Completar | "Completar Expedição" funciona | | |

---

## CENÁRIO 10 — Re-avançar após revisitar (CRIT-002)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 10.1 | Phase 6 completa → voltar para Phase 5 | Phase 5 abre | | |
| 10.2 | **Phase 5 → avançar** | Vai para Phase 6 **SEM mensagem de bloqueio** | | |
| 10.3 | **NÃO mostra** "Esta fase já foi concluída" | Navegação livre | | |
| 10.4 | Voltar para Phase 3 via progress bar | Phase 3 abre | | |
| 10.5 | De Phase 3, avançar sequencial | 3→4→5→6 sem bloqueio | | |
| 10.6 | Roteiro persiste | Itinerário ainda lá após voltar e avançar | | |

---

## CENÁRIO 11 — Progress Bar Navegação (CRIT-003)

**Testar do Dashboard (Expedições):**

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 11.1 | Click **Phase 1** | Abre exatamente Phase 1 (rota /phase-1) | | |
| 11.2 | Click **Phase 2** | Abre exatamente Phase 2 | | |
| 11.3 | Click **Phase 3** | Abre exatamente Phase 3 | | |
| 11.4 | Click **Phase 4** | Abre exatamente Phase 4 | | |
| 11.5 | Click **Phase 5** | Abre exatamente Phase 5 | | |
| 11.6 | Click **Phase 6** | Abre exatamente Phase 6 | | |
| 11.7 | **Nunca redireciona** para outra fase | Cada click = fase correta | | |

**Testar de DENTRO de uma fase (progress bar no topo):**

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 11.8 | De Phase 4, click Phase 2 na barra | Vai para Phase 2 | | |
| 11.9 | De Phase 2, click Phase 5 na barra | Vai para Phase 5 (se já completada) | | |
| 11.10 | De Phase 6, click Phase 1 na barra | Vai para Phase 1 | | |

---

## CENÁRIO 12 — Classificação Doméstica (CRIT-004)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 12.1 | SP → Salvador | **"Nacional"** | | |
| 12.2 | SP → Recife | **"Nacional"** | | |
| 12.3 | SP → Rio de Janeiro | **"Nacional"** | | |
| 12.4 | SP → Roma | **"Internacional"** | | |
| 12.5 | Checklist SP→Salvador | SEM passaporte, visto | | |
| 12.6 | Checklist SP→Roma | COM passaporte, visto | | |

---

## CENÁRIO 13 — Summary e Expedição Completa

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 13.1 | Completar expedição | Botão funciona | | |
| 13.2 | Summary page | Dados de todas as fases | | |
| 13.3 | **Nome Phase 5 no summary** | "Guia do Destino" (não "O Mapa dos Dias") | | |
| 13.4 | **Nome Phase 6 no summary** | "O Roteiro" (não "O Tesouro") | | |
| 13.5 | Edit links | Clicar fase → navega para editar | | |
| 13.6 | Dados preservados ao editar | Info previamente salva visível | | |

---

## CENÁRIO 14 — Viagem Internacional

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 14.1 | Info pessoal pré-preenchida | Do perfil anterior | | |
| 14.2 | SP → Roma | Classificada "Internacional" | | |
| 14.3 | Tipo Family | Seletor passageiros aparece | | |
| 14.4 | Adultos + Crianças | +/- funciona | | |

---

## CENÁRIO 15 — Botão Voltar em Todas as Fases

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 15.1 | Phase 2 → voltar | Vai para Phase 1 (NÃO Dashboard) | | |
| 15.2 | Phase 3 → voltar | Vai para Phase 2 | | |
| 15.3 | Phase 4 → voltar | Vai para Phase 3 | | |
| 15.4 | Phase 5 → voltar | Vai para Phase 4 | | |
| 15.5 | Phase 6 → voltar | Vai para Phase 5 | | |

---

## CENÁRIO 16 — Idioma

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 16.1 | PT → EN | Tudo muda | | |
| 16.2 | EN → PT | Volta | | |
| 16.3 | Sem 404 | Trocar idioma em qualquer fase | | |
| 16.4 | Sem i18n raw | Nenhum "errors.xxx" | | |

---

## Resumo

| Cenário | Testes | Foco |
|---|---|---|
| 1. Registro/Header | 5 | Gamificação, sem overlay |
| 2. Phase 1 + Autocomplete | 22 | PhaseShell, cmdk, validação |
| 3. Preferências | 4 | Persistência |
| 4. Confirmação/Transições | 7 | Sem countdown/skip/overlay |
| 5. Navegação Sequencial | 6 | CRIT-001 |
| 6. Phase 3 | 5 | Classificação |
| 7. Phase 4 | 8 | StepIndicator, labels |
| 8. Phase 5 | 8 | Nome canônico, AiDisclaimer |
| 9. Phase 6 | 8 | Nome canônico, sem footer |
| 10. Re-avançar | 6 | CRIT-002 |
| 11. Progress Bar | 10 | CRIT-003 |
| 12. Classificação | 6 | CRIT-004 |
| 13. Summary | 6 | Nomes canônicos |
| 14. Internacional | 4 | Passageiros |
| 15. Botão Voltar | 5 | Bidirecional |
| 16. Idioma | 4 | i18n |
| **TOTAL** | **114** | |

---

## Critério de Aprovação

- **95%+ PASS (108+/114)** → Beta Launch aprovado
- **90-95% PASS** → Fix rápido + Beta
- **< 90% PASS** → Mais uma estabilização

Para cada FAIL: número + screenshot + severidade
