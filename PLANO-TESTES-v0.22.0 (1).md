# Plano de Testes v0.22.0 — Sprints 25-29

**Staging:** https://travel-planner-eight-navy.vercel.app  
**Versão:** v0.22.0  
**Pré-requisitos:**
1. Verificar deploy Ready no Vercel
2. Rodar migrations (há nova migration para coordenadas do mapa):
```powershell
$env:DATABASE_URL="sua_connection_string_do_neon"
npx prisma migrate deploy
```
3. Abrir em aba anônima (Ctrl+Shift+N)

---

## CENÁRIO 1 — Registro e Header

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 1.1 | Criar nova conta | Auto-login → redireciona ao dashboard | | |
| 1.2 | Saudação novo usuário | "Bem-vindo ao Atlas, [Nome]!" | | |
| 1.3 | Header — Gamificação | Badge com pontos + nível visível no header | | |
| 1.4 | Header — Navegação | Menu tem "Expedições" e "Meu Atlas" separados | | |
| 1.5 | Pontos iniciais | Score começa em 0 ou valor inicial definido | | |

---

## CENÁRIO 2 — Navegação Reestruturada (Sprint 28)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 2.1 | Menu "Expedições" | Navega para lista de trip cards (sem mapa) | | |
| 2.2 | Menu "Meu Atlas" | Navega para página do mapa mundo + perfil gamificação | | |
| 2.3 | Redirect /dashboard | Redireciona automaticamente para /expeditions | | |
| 2.4 | Mapa mundo | Mapa renderiza corretamente na página Atlas | | |
| 2.5 | Expedições vazio | Sem cards, botão "Nova Expedição" visível | | |

---

## CENÁRIO 3 — Phase 1 "O Chamado" + Autocomplete (Sprint 27)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 3.1 | Nova Expedição | Wizard inicia com info pessoal primeiro | | |
| 3.2 | Nome obrigatório | Campo nome com asterisco, não avança sem preencher | | |
| 3.3 | Data nascimento obrigatória | Campo obrigatório com asterisco | | |
| 3.4 | Nome pré-preenchido | Nome do registro aparece no campo | | |
| 3.5 | Fase + Passo visível | "Fase 1 · Passo X de Y" no topo da tela | | |
| 3.6 | Botão CTA | Texto **"Avançar"** (NÃO "Concluir e Ganhar Pontos") | | |
| 3.7 | Destino: "Salvador" | **Autocomplete cmdk+Radix**: dropdown opaco, sem transparência | | |
| 3.8 | Formato resultado | **"Salvador, Bahia, Brasil"** (cidade + estado + país) | | |
| 3.9 | Dropdown legível | Fundo sólido, duas linhas por resultado | | |
| 3.10 | Velocidade | Resultados aparecem em <2 segundos | | |
| 3.11 | Sem resultados | Digitar "xyzabc" → mensagem "Nenhum resultado" | | |
| 3.12 | Origem | Mesmo padrão cmdk: opaco, formato curto | | |
| 3.13 | Datas | Selecionar ida/volta funciona | | |
| 3.14 | Passageiros (Solo) | Seletor NÃO aparece para tipo Solo | | |
| 3.15 | Orçamento | Moeda BRL em PT | | |
| 3.16 | Botão voltar | Pode voltar para qualquer passo anterior | | |

---

## CENÁRIO 4 — Preferências (Sprint 26-27)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 4.1 | Layout 2 páginas | Página 1: 5 categorias, Página 2: 5 categorias | | |
| 4.2 | Chips legíveis | Texto NÃO truncado, wrap correto | | |
| 4.3 | Dark mode contraste | Chips legíveis no tema escuro (WCAG 4.5:1) | | |
| 4.4 | Seleção funciona | Clicar seleciona/deseleciona com feedback | | |
| 4.5 | **Persistência ao voltar** | Voltar de página 2 → 1: seleções **mantidas** | | |
| 4.6 | Gamificação | +5 pontos por categoria (visível no header) | | |
| 4.7 | Header atualiza | Pontos no header aumentam ao selecionar categorias | | |

---

## CENÁRIO 5 — Confirmação + Transições (Sprint 25-27)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 5.1 | Confirmação Phase 1 | Nome, Bio, Destino, Origem, Datas visíveis | | |
| 5.2 | Dados faltantes | "Não informado" para campos vazios | | |
| 5.3 | Confirmação Phase 2 | Tipo, Hospedagem, Ritmo, Orçamento, **Preferências detalhadas** | | |
| 5.4 | Preferências no detalhe | Lista cada categoria + valores selecionados (não só "7 categorias") | | |
| 5.5 | Transição entre fases | **Animação unificada** com countdown 3s | | |
| 5.6 | Skip transição | Botão pular visível | | |
| 5.7 | CTA padronizado | Todos os botões dizem **"Avançar"** | | |

---

## CENÁRIO 6 — Phase 3 "O Preparo" (Sprint 25)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 6.1 | Título | **"O Preparo"** (NÃO "A Rota") | | |
| 6.2 | Classificação doméstica | SP→Salvador = **"Nacional/Doméstica"** | | |
| 6.3 | Checklist gerado | Items aparecem automaticamente | | |
| 6.4 | Marcar items | Checkbox funciona, progresso atualiza | | |
| 6.5 | Progress bar | Visível com fases clicáveis | | |
| 6.6 | Avançar | Vai para Phase 4 (NÃO volta ao Dashboard) | | |
| 6.7 | Botão voltar | Volta para Phase 2 | | |

---

## CENÁRIO 7 — Phase 4 "A Logística" (Sprint 25-29)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 7.1 | Título | "A Logística" | | |
| 7.2 | 3 steps separados | Transporte → Hospedagem → Mobilidade | | |
| 7.3 | Step 1 pré-preenchido | Origem, Destino, Datas **já nos campos** | | |
| 7.4 | Labels corretos | **"Ida/Volta"** (não "Partida/Chegada") | | |
| 7.5 | Label empresa | **"Empresa"** (não "Companhia Aérea/Empresa") | | |
| 7.6 | **Auto-save** | Avançar de Step 1→2 **salva automaticamente** | | |
| 7.7 | Step 2 Hospedagem | Adicionar hospedagem funciona | | |
| 7.8 | Múltiplas hospedagens | Até 5 | | |
| 7.9 | Step 3 Mobilidade | Grid de ícones funcional | | |
| 7.10 | Aluguel carro | Pergunta no **Step 3** (não Step 1) | | |
| 7.11 | Botão voltar | Steps 1↔2↔3 navegação bidirecional | | |
| 7.12 | Progress bar | Visível com fases clicáveis | | |
| 7.13 | CTA | Botão "Avançar" padronizado | | |
| 7.14 | Completar | Avança para Phase 5 | | |

---

## CENÁRIO 8 — Phase 5 "Guia do Destino" (Sprint 26-27)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 8.1 | Título | **"Guia do Destino"** (NÃO "O Mapa dos Dias") | | |
| 8.2 | Auto-geração | Guia gera automaticamente ao entrar | | |
| 8.3 | Hero banner | Parágrafo resumo com curiosidades do destino | | |
| 8.4 | **10 seções visíveis** | TODAS abertas, sem accordion/colapso | | |
| 8.5 | Cards uniformes | Mesmo tamanho e estilo para todos os cards | | |
| 8.6 | Stat cards (4) | Fuso, Moeda, Idioma, Eletricidade — compactos | | |
| 8.7 | Content cards (6) | Conectividade, Cultura, Docs, Clima, Transporte, Saúde | | |
| 8.8 | **Sem botão "Atualizar"** | Botão removido | | |
| 8.9 | Gamificação bulk | +50 pontos ao carregar (header atualiza) | | |
| 8.10 | Disclaimer IA | Presente | | |
| 8.11 | Botão voltar | Volta para Phase 4 | | |
| 8.12 | Progress bar | Visível com fases clicáveis | | |
| 8.13 | Completar | Avança para Phase 6 | | |

---

## CENÁRIO 9 — Phase 6 "O Roteiro" (Sprint 27-29)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 9.1 | Auto-geração | Gera automaticamente na primeira visita | | |
| 9.2 | Streaming | Progresso "Criando Dia N de M" (sem JSON raw) | | |
| 9.3 | Resultado | Dias em cards com atividades e horários | | |
| 9.4 | Disclaimer | "Gerado por IA" presente | | |
| 9.5 | Regenerar | Botão visível e funcional | | |
| 9.6 | **Botão voltar** | Volta para Phase 5 | | |
| 9.7 | **Progress bar** | Visível com fases clicáveis | | |
| 9.8 | **Persistência** | Sair e voltar → roteiro mantido | | |
| 9.9 | Drag-and-drop | Arrastar atividades funciona | | |
| 9.10 | **Re-avançar** | Voltar para Phase 5 e avançar novamente → NÃO bloqueia | | |
| 9.11 | CTA | Botão "Avançar" ou "Completar Expedição" | | |

---

## CENÁRIO 10 — Expedition Summary (Sprint 28-29)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 10.1 | Acesso | Após completar Phase 6, botão "Completar Expedição" | | |
| 10.2 | Summary page | Página de resumo card-based | | |
| 10.3 | Hero | Destino, datas, TripCountdown | | |
| 10.4 | Readiness score | Score ponderado (fases 40%, checklist 30%, etc.) | | |
| 10.5 | Next Steps | Sugestões de próximos passos | | |
| 10.6 | **Phase 1 data** | Nome, Bio, Destino, Origem, Datas | | |
| 10.7 | **Phase 2 data** | Tipo viajante, Preferências detalhadas | | |
| 10.8 | **Phase 3 data** | Checklist (X/Y items completados) | | |
| 10.9 | **Phase 4 data** | Transporte, Hospedagem, Mobilidade | | |
| 10.10 | **Phase 5 data** | Guia resumo | | |
| 10.11 | **Phase 6 data** | Roteiro (dias/atividades) | | |
| 10.12 | Edit links | Clicar em fase → navega para editar | | |
| 10.13 | **Dados preservados** | Ao voltar para editar, dados previamente salvos visíveis | | |
| 10.14 | Celebração | Animação de conclusão | | |
| 10.15 | Expedição já completa | Voltar a Phase 6 → botão "Ver Resumo" (não "Completar") | | |

---

## CENÁRIO 11 — Dashboard "Expedições" (Sprint 28-29)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 11.1 | Página Expedições | Cards de viagem sem mapa | | |
| 11.2 | TripCountdown | Contagem regressiva no card | | |
| 11.3 | Progress bar | Labels visíveis, 3 cores (completada/atual/pendente) | | |
| 11.4 | **Click fase** | Navega para **aquela fase específica** | | |
| 11.5 | Botão Continuar | Vai para próxima fase pendente | | |
| 11.6 | **Sem botões legados** | SEM "Itens", "Checklist", "Hospedagem" | | |
| 11.7 | Fases 7-8 | "Em construção" com texto visível | | |
| 11.8 | Badge completada | Trip finalizada mostra badge "Completada" | | |
| 11.9 | CTA padronizado | Botão "Continuar" consistente | | |

---

## CENÁRIO 12 — Mapa "Meu Atlas" (Sprint 29)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 12.1 | Página Atlas | Mapa mundo renderiza | | |
| 12.2 | **Pin após criar expedição** | Pin aparece imediatamente no mapa | | |
| 12.3 | **Pin cor planning** | Expedição fases 1-3: pin **amarelo** | | |
| 12.4 | **Pin cor in progress** | Expedição fases 4-6: pin **azul** | | |
| 12.5 | **Pin cor completed** | Expedição finalizada: pin **verde** | | |
| 12.6 | Múltiplos pins | 2+ expedições mostram pins diferentes | | |
| 12.7 | Perfil gamificação | Pontos, nível, badges visíveis na página | | |

---

## CENÁRIO 13 — Phase Revisit + Data Persistence (Sprint 29)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 13.1 | Revisitar Phase 1 | Via progress bar → dados preenchidos visíveis | | |
| 13.2 | Revisitar Phase 3 | Checklist com items já marcados | | |
| 13.3 | Revisitar Phase 4 | Transporte/Hospedagem/Mobilidade salvos | | |
| 13.4 | Editar dados | Alterar campo e salvar → persiste | | |
| 13.5 | **Sem bloqueio** | Revisitar e avançar novamente NÃO dá erro | | |
| 13.6 | Sem perda de dados | Navegar entre fases NÃO perde dados salvos | | |

---

## CENÁRIO 14 — Viagem Internacional + Passageiros

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 14.1 | Nova expedição Roma | Info pessoal pré-preenchida do perfil | | |
| 14.2 | **Nome no perfil** | Nome salvo e exibido corretamente | | |
| 14.3 | Classificação | Phase 3 = "Internacional" | | |
| 14.4 | Tipo Family | Seletor passageiros aparece com +/- | | |
| 14.5 | Adultos + Crianças | Adicionar 2 adultos + 1 criança funciona | | |
| 14.6 | Seniors | Campo separado para idosos funciona | | |
| 14.7 | Limite | Máximo por tipo ≤ 9 | | |

---

## CENÁRIO 15 — Gamificação no Header (Sprint 28)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 15.1 | Badge visível | Pontos + nível no header em TODAS as páginas | | |
| 15.2 | Atualiza em tempo real | Completar fase → pontos aumentam no header | | |
| 15.3 | Preferências | Selecionar chips → header atualiza | | |
| 15.4 | Guide | Carregar guia → +50 pontos no header | | |
| 15.5 | Consistente | Mesmo valor em todas as páginas | | |

---

## CENÁRIO 16 — Idioma e Acessibilidade

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 16.1 | PT → EN | Todas as telas mudam | | |
| 16.2 | EN → PT | Volta tudo | | |
| 16.3 | **Sem 404** | Trocar idioma em QUALQUER fase NÃO dá 404 | | |
| 16.4 | Moeda | PT=BRL, EN=USD | | |
| 16.5 | Contraste WCAG | Botões laranja com texto legível | | |
| 16.6 | Sem i18n raw | Nenhum "errors.xxx" em nenhuma tela | | |

---

## Resumo

| Cenário | Testes |
|---|---|
| 1. Registro e Header | 5 |
| 2. Navegação Reestruturada | 5 |
| 3. Phase 1 + Autocomplete | 16 |
| 4. Preferências | 7 |
| 5. Confirmação + Transições | 7 |
| 6. Phase 3 O Preparo | 7 |
| 7. Phase 4 A Logística | 14 |
| 8. Phase 5 Guia do Destino | 13 |
| 9. Phase 6 O Roteiro | 11 |
| 10. Expedition Summary | 15 |
| 11. Dashboard Expedições | 9 |
| 12. Mapa Meu Atlas | 7 |
| 13. Phase Revisit + Persistência | 6 |
| 14. Internacional + Passageiros | 7 |
| 15. Gamificação Header | 5 |
| 16. Idioma e Acessibilidade | 6 |
| **TOTAL** | **140** |

---

## Como reportar

Para cada FAIL: número + o que aconteceu + screenshot + severidade (P0/P1/P2)
