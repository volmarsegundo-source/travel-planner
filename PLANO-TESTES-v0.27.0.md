# Plano de Testes v0.27.0 — Sprint 32 Fixes + Regressão

**Staging:** https://travel-planner-eight-navy.vercel.app  
**Versão:** v0.27.0  
**Foco:** Validar 7 P0 fixes + UX improvements + regressão  
**Pré-requisito:** Aba anônima, conta nova

---

## CENÁRIO 1 — P0-001/006: Transição entre Fases sem Erro

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 1.1 | Completar Phase 1 → avançar | Phase 2 abre sem erro | | |
| 1.2 | Completar Phase 2 → avançar | **Phase 3 abre sem "Algo deu errado"** | | |
| 1.3 | Completar Phase 3 → avançar | Phase 4 abre sem erro | | |
| 1.4 | Completar Phase 4 → avançar | Phase 5 abre sem erro | | |
| 1.5 | Completar Phase 5 → avançar | **Phase 6 abre sem "Algo deu errado"** | | |
| 1.6 | Sequência completa | 1→2→3→4→5→6 sem nenhum erro | | |
| 1.7 | **Revisitar Phase 2** | Abre com dados, SEM erro ao clicar "Salvar" | | |
| 1.8 | **Avançar de Phase 2 revisitada** | Vai para Phase 3 sem erro | | |

**PASS se:** Zero "Algo deu errado" em toda a jornada + revisit.

---

## CENÁRIO 2 — P0-002: Phase 3 Status Reverte ao Desmarcar

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 2.1 | Marcar TODOS itens obrigatórios | Phase 3 = **"Concluída"** (verde) | | |
| 2.2 | Voltar para Phase 3 | Itens ainda marcados | | |
| 2.3 | **Desmarcar 1 item obrigatório** | Phase 3 muda para **"Em andamento"** (amber) | | |
| 2.4 | Remarcar o item | Phase 3 volta para **"Concluída"** (verde) | | |
| 2.5 | Verificar no Dashboard | Cor da Phase 3 reflete o status real | | |

**PASS se:** Status da Phase 3 muda dinamicamente conforme itens marcados/desmarcados.

---

## CENÁRIO 3 — P0-003/005: Completion Engine + Progress Bar

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 3.1 | Avançar Phase 4 SEM preencher dados | Phase 4 = **"Em andamento"** (amber), NÃO "Concluída" | | |
| 3.2 | Preencher transporte em Phase 4 | Phase 4 atualiza status | | |
| 3.3 | **Dashboard progress bar** | Cores corretas: verde(completa) / amber(parcial) / azul(atual) / cinza(pendente) | | |
| 3.4 | Click Phase 1 na progress bar | Abre **exatamente Phase 1** | | |
| 3.5 | Click Phase 3 na progress bar | Abre **exatamente Phase 3** (não Phase 6) | | |
| 3.6 | Click Phase 5 na progress bar | Abre **exatamente Phase 5** | | |
| 3.7 | **Fases não completadas** | NÃO mostram verde na progress bar | | |
| 3.8 | **Nomes abaixo dos segmentos** | Nome de cada fase visível na barra | | |

**PASS se:** Completion engine reflete dados reais, progress bar precisa e com nomes.

---

## CENÁRIO 4 — P0-004/007: Phase 6 Auto-Geração + Auto-Conclusão

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 4.1 | Chegar na Phase 6 pela primeira vez | **Roteiro gera automaticamente** (sem clicar botão) | | |
| 4.2 | Roteiro gerado | Phase 6 marcada como **"Concluída"** | | |
| 4.3 | Completar todas 6 fases | **Expedição auto-completa** (badge no Dashboard) | | |
| 4.4 | Dashboard card | Status **"Concluída"** com badge | | |

**PASS se:** Auto-geração na Phase 6 + auto-conclusão da expedição.

---

## CENÁRIO 5 — UX-001: Destino + Origem Lado a Lado

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 5.1 | Passo 2 (destino/origem) | **Campos lado a lado** em desktop (grid-cols-2) | | |
| 5.2 | Mobile | Campos empilhados em telas pequenas | | |
| 5.3 | Autocomplete dropdown | **Sem sobreposição** entre os dois campos | | |
| 5.4 | Seleção destino | Formato "Cidade, Estado, País" | | |
| 5.5 | Seleção origem | Formato "Cidade, Estado, País" | | |
| 5.6 | Mesma cidade | Erro de validação **imediatamente** (não no último passo) | | |

**PASS se:** Layout horizontal resolve sobreposição do autocomplete.

---

## CENÁRIO 6 — UX-003: Preferências 4+3

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 6.1 | Página 1 | **4 categorias**: Ritmo, Orçamento, Social, Hospedagem | | |
| 6.2 | Página 2 | **3 categorias**: Interesses, Alimentação, Fitness | | |
| 6.3 | Persistência | Voltar pág 2→1: seleções mantidas | | |

---

## CENÁRIO 7 — UX-004: Aluguel de Carro Condicional

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 7.1 | Phase 4 Step 3 (Mobilidade) SEM selecionar "Aluguel de Carro" | Pergunta sobre documentação **NÃO aparece** | | |
| 7.2 | Selecionar "Aluguel de Carro" | Pergunta sobre documentação **aparece** | | |
| 7.3 | Desselecionar "Aluguel de Carro" | Pergunta **desaparece** | | |

---

## CENÁRIO 8 — UX-007: Nomes nas Progress Bars

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 8.1 | Progress bar dentro da expedição | Nome de cada fase abaixo do segmento | | |
| 8.2 | Progress bar no Dashboard | Nome de cada fase abaixo do segmento | | |
| 8.3 | Nomes canônicos | "O Chamado", "O Explorador", "O Preparo", "A Logística", "Guia do Destino", "O Roteiro" | | |

---

## CENÁRIO 9 — P1-004/005: Relatório i18n + Completude

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 9.1 | Tipo de viagem | **"Internacional"** (não "international") | | |
| 9.2 | Tipo viajante | **"Estudante"** (não "student") | | |
| 9.3 | Estilo hospedagem | **"Aventura"** (não "adventure") | | |
| 9.4 | Checklist items | **Nomes traduzidos** (não "copies_documents") | | |
| 9.5 | Dados Phase 1 | Destino, Origem, Datas, **Info pessoal** | | |
| 9.6 | Dados Phase 2 | Tipo, Hospedagem, **Preferências, Ritmo, Orçamento** | | |
| 9.7 | **Itens pendentes** | Dados faltantes destacados claramente | | |
| 9.8 | Passageiros | Contagem detalhada (se Family/Group) | | |

**PASS se:** Zero valores raw/inglês no relatório, todos os dados presentes.

---

## CENÁRIO 10 — Validação de Datas (fix P1-002)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 10.1 | Só data ida preenchida | **Erro: data volta obrigatória** | | |
| 10.2 | Só data volta preenchida | **Erro: data ida obrigatória** | | |
| 10.3 | Ambas vazias | Erro | | |
| 10.4 | Datas válidas | Aceita | | |

---

## CENÁRIO 11 — Mapa + Pins (regressão)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 11.1 | Meu Atlas | Mapa renderiza (Leaflet) | | |
| 11.2 | Pin expedição em planejamento | Pin **amarelo** (fases 1-3) | | |
| 11.3 | Pin expedição em progresso | Pin **azul** (fases 4-6) | | |
| 11.4 | Pin expedição completa | Pin **verde** | | |

---

## CENÁRIO 12 — Dashboard Quick-Access (regressão)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 12.1 | Ver Checklist | Botão no card, navega para Phase 3 | | |
| 12.2 | Ver Guia | Botão no card, navega para Phase 5 | | |
| 12.3 | Ver Roteiro | Botão no card, navega para Phase 6 | | |
| 12.4 | Gerar Relatório | Botão no card, abre relatório completo | | |
| 12.5 | Filtros | Todas / Ativas / Concluídas funcionam | | |

---

## CENÁRIO 13 — Navegação Bidirecional (regressão)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 13.1 | Botão voltar Phase 6→5 | Funciona | | |
| 13.2 | De Phase 5, avançar para Phase 6 | **SEM "Esta fase já foi concluída"** | | |
| 13.3 | Botão voltar Phase 5→4→3→2→1 | Toda a cadeia funciona | | |
| 13.4 | Phase 2→3 funciona | **SEM erro** (era P0-001) | | |

---

## CENÁRIO 14 — Classificação + Internacional (regressão)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 14.1 | SP→Salvador | "Nacional" | | |
| 14.2 | SP→Roma | **"Internacional"** (não "Schengen") | | |

---

## CENÁRIO 15 — Header + Idioma (regressão)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 15.1 | Badge gamificação | Visível, **NÃO é link** | | |
| 15.2 | Perfil no dropdown | No menu avatar, não no header | | |
| 15.3 | PT → EN | Tudo muda | | |
| 15.4 | EN → PT | Volta | | |
| 15.5 | Sem 404 | Trocar idioma em qualquer fase | | |

---

## Resumo

| Cenário | Testes | Foco |
|---|---|---|
| 1. Transição sem erro | 8 | P0-001/006 |
| 2. Phase 3 status reverte | 5 | P0-002 |
| 3. Completion + Progress bar | 8 | P0-003/005 |
| 4. Phase 6 auto-gera + auto-conclui | 4 | P0-004/007 |
| 5. Destino/Origem lado a lado | 6 | UX-001 |
| 6. Preferências 4+3 | 3 | UX-003 |
| 7. Aluguel carro condicional | 3 | UX-004 |
| 8. Nomes progress bar | 3 | UX-007 |
| 9. Relatório i18n | 8 | P1-004/005 |
| 10. Datas obrigatórias | 4 | P1-002 |
| 11. Mapa + Pins | 4 | Regressão |
| 12. Dashboard quick-access | 5 | Regressão |
| 13. Navegação bidirecional | 4 | Regressão |
| 14. Classificação | 2 | Regressão |
| 15. Header + Idioma | 5 | Regressão |
| **TOTAL** | **72** | |

---

## Critério de Aprovação

- **95%+ PASS (69+/72)** → Beta Launch aprovado
- **90-95%** → Fix rápido + Beta
- **< 90%** → Mais estabilização

Para cada FAIL: número + screenshot + severidade (P0/P1/P2)
