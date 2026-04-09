# Plano de Testes v0.26.0 — Sprints 30-31

**Staging:** https://travel-planner-eight-navy.vercel.app  
**Versão:** v0.26.0  
**Pré-requisitos:**
1. Verificar deploy Ready no Vercel
2. Configurar env var MAPBOX_ACCESS_TOKEN no Vercel (se ainda não feito)
3. Rodar migrations se pendentes:
```powershell
$env:DATABASE_URL="sua_connection_string_do_neon"
npx prisma migrate deploy
```
4. Abrir em aba anônima (Ctrl+Shift+N), conta nova

---

## CENÁRIO 1 — Registro + Header Redesenhado (REQ-002, REQ-003)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 1.1 | Criar conta nova | Auto-login → Expedições | | |
| 1.2 | Header — Expedições | Link "Expedições" no header | | |
| 1.3 | Header — Meu Atlas | Link "Meu Atlas" no header | | |
| 1.4 | **Gamificação badge** | Pontos + nível visível, **NÃO é link** (apenas informativo) | | |
| 1.5 | **Perfil no dropdown** | Clicar no avatar → menu com "Minha Conta" + "Meu Perfil" | | |
| 1.6 | **Sem link "Perfil" no header** | Removido do header principal (agora está no dropdown) | | |

---

## CENÁRIO 2 — Meu Atlas / Mapa (REQ-001 — REWRITE)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 2.1 | Acessar "Meu Atlas" | Página carrega sem erro | | |
| 2.2 | **Mapa renderiza** | Mapa mundial visível (Leaflet + OSM) | | |
| 2.3 | **Tiles dark mode** | Mapa com estilo escuro compatível com dark theme | | |
| 2.4 | Interação | Zoom in/out funciona (scroll ou botões) | | |
| 2.5 | Pan | Arrastar mapa funciona | | |
| 2.6 | Gamificação | Perfil com pontos e badges na página | | |
| 2.7 | Sem expedições | Mapa sem pins (nenhuma expedição ainda) | | |

---

## CENÁRIO 3 — Autocomplete Mapbox (Sprint 30 — REWRITE)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 3.1 | Nova Expedição → digitar "Salvador" | Dropdown aparece | | |
| 3.2 | **Fundo opaco** | Sem transparência | | |
| 3.3 | **Formato** | "Salvador, Bahia, Brasil" (cidade + estado + país) | | |
| 3.4 | **Seleção persiste** | Campo mantém nome completo após selecionar | | |
| 3.5 | **Flag emoji** | Bandeira do país no resultado | | |
| 3.6 | **Skeleton loading** | Indicador visual enquanto busca | | |
| 3.7 | Sem resultados | Digitar "xyzabc" → mensagem clara | | |
| 3.8 | Velocidade | Resultados em < 2 segundos | | |
| 3.9 | Origem "São Paulo" | Mesmo padrão opaco + formato correto | | |
| 3.10 | **Mesma cidade bloqueada** | Origem = Destino → erro de validação | | |

---

## CENÁRIO 4 — Validação de Datas (REQ-005)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 4.1 | **Data ida = data volta** | Erro: "Datas de ida e volta não podem ser iguais" | | |
| 4.2 | **Data ida = hoje** | Erro: "Data não pode ser hoje" | | |
| 4.3 | **Data volta = hoje** | Erro | | |
| 4.4 | **Data ida no passado** | Erro: "Data não pode ser no passado" | | |
| 4.5 | **Data ida > data volta** | Erro: "Data de ida não pode ser após a data de volta" | | |
| 4.6 | Datas válidas | Aceita normalmente | | |
| 4.7 | **Datas obrigatórias** | Não avança sem preencher ambas | | |

---

## CENÁRIO 5 — Phase 1-2 + Preferências

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 5.1 | PhaseShell | Progress bar de fases visível em Phase 1 | | |
| 5.2 | Info pessoal | Nome obrigatório, data nascimento obrigatória | | |
| 5.3 | CTA | "Avançar" padronizado | | |
| 5.4 | Preferências | 4+3 split (4 na pág 1, 3 na pág 2) | | |
| 5.5 | Confirmação | Mostra todos os dados + preferências detalhadas | | |
| 5.6 | Avança para Phase 2 | Transição sem countdown, sem overlay pontos | | |

---

## CENÁRIO 6 — Phase 3 "O Preparo" + Completion (REQ-009)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 6.1 | Classificação SP→Salvador | **"Nacional"** | | |
| 6.2 | Checklist gerado | Items aparecem | | |
| 6.3 | **Marcar todos obrigatórios** | Fase marcada como **"Concluída"** (verde na progress bar) | | |
| 6.4 | **Marcar apenas alguns** | Fase marcada como **"Em andamento"** (amber na progress bar) | | |
| 6.5 | Items opcionais | NÃO bloqueiam conclusão | | |
| 6.6 | Avançar | Vai para Phase 4 | | |

---

## CENÁRIO 7 — Phase 4 "A Logística"

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 7.1 | 3 steps | Transporte → Hospedagem → Mobilidade | | |
| 7.2 | Pré-preenchido | Origem, Destino, Datas | | |
| 7.3 | Labels | "Ida/Volta", "Empresa" | | |
| 7.4 | Avançar | Vai para Phase 5 | | |

---

## CENÁRIO 8 — Phase 5 "Guia do Destino"

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 8.1 | Título | "Guia do Destino" | | |
| 8.2 | Auto-geração | Gera automaticamente | | |
| 8.3 | 10 seções visíveis | Todas abertas | | |
| 8.4 | AiDisclaimer | Componente padronizado no topo | | |
| 8.5 | Avançar | Vai para Phase 6 | | |

---

## CENÁRIO 9 — Phase 6 "O Roteiro" (REQ-006)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 9.1 | Título | "O Roteiro" | | |
| 9.2 | Auto-geração | Gera na primeira visita | | |
| 9.3 | Streaming | Sem JSON raw | | |
| 9.4 | **Sem "Completar Expedição"** | Botão removido | | |
| 9.5 | **"Voltar ao Dashboard"** | Botão presente, navega para Expedições | | |
| 9.6 | AiDisclaimer | Componente padronizado | | |

---

## CENÁRIO 10 — Phase Completion 4 States (REQ-004, REQ-008)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 10.1 | Fase concluída (todas infos) | **Verde** na progress bar | | |
| 10.2 | Fase em andamento (parcial) | **Amber/amarelo** na progress bar | | |
| 10.3 | Fase atual (user está aqui) | **Azul** na progress bar | | |
| 10.4 | Fase pendente (não iniciada) | **Cinza** na progress bar | | |
| 10.5 | Dashboard card | Mesmas cores refletidas no card da expedição | | |
| 10.6 | **Visual claro** | Fácil identificar o que está feito, em progresso, pendente | | |
| 10.7 | **Auto-conclusão** | Expedição conclui automaticamente quando 6 fases completas | | |

---

## CENÁRIO 11 — Dashboard Quick-Access (REQ-010, REQ-011, REQ-012)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 11.1 | Card com filtros | Filter chips funcionam | | |
| 11.2 | Card com sort | Ordenação funciona | | |
| 11.3 | Grid responsivo | 1/2/3 colunas conforme tela | | |
| 11.4 | **Ver Checklist** | Se Phase 3 gerou checklist → botão "Ver Checklist" no card | | |
| 11.5 | Click "Ver Checklist" | Navega para Phase 3 com dados | | |
| 11.6 | **Ver Guia** | Se Phase 5 gerou guia → botão "Ver Guia" no card | | |
| 11.7 | Click "Ver Guia" | Navega para Phase 5 com dados | | |
| 11.8 | **Ver Roteiro** | Se Phase 6 gerou roteiro → botão "Ver Roteiro" no card | | |
| 11.9 | Click "Ver Roteiro" | Navega para Phase 6 com dados | | |
| 11.10 | **Gerar Relatório** | Se Phases 3+5+6 completas → botão "Gerar Relatório" | | |
| 11.11 | Click "Gerar Relatório" | Abre relatório com dados de todas as fases | | |

---

## CENÁRIO 12 — Relatório da Expedição (REQ-007)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 12.1 | Acesso ao relatório | Página carrega | | |
| 12.2 | Dados Phase 1 | Destino, Origem, Datas, Info pessoal | | |
| 12.3 | Dados Phase 2 | Tipo viajante, Preferências | | |
| 12.4 | Dados Phase 3 | Checklist (itens feitos + pendentes) | | |
| 12.5 | Dados Phase 4 | Transporte, Hospedagem, Mobilidade | | |
| 12.6 | Dados Phase 5 | Guia resumo | | |
| 12.7 | Dados Phase 6 | Roteiro (dias/atividades) | | |
| 12.8 | **Itens pendentes destacados** | Dados não preenchidos claramente marcados | | |
| 12.9 | **Acessível do Dashboard** | Não precisa ir até Phase 6 para ver | | |

---

## CENÁRIO 13 — Map Pins (REQ-001)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 13.1 | Criar expedição SP→Salvador | Expedição criada | | |
| 13.2 | Ir para "Meu Atlas" | Mapa carrega | | |
| 13.3 | **Pin aparece** | Pin em Salvador no mapa | | |
| 13.4 | **Pin cor planning** | Fases 1-3: pin **amarelo** | | |
| 13.5 | Avançar até Phase 4+ | Fase 4+ atingida | | |
| 13.6 | **Pin cor in progress** | Fases 4-6: pin **azul** | | |
| 13.7 | Completar expedição | Todas 6 fases completas | | |
| 13.8 | **Pin cor completed** | Pin **verde** | | |
| 13.9 | **Auto-zoom** | Mapa ajusta zoom para mostrar todos os pins | | |
| 13.10 | Múltiplos pins | 2+ expedições com pins diferentes | | |

---

## CENÁRIO 14 — Navegação e Revisit (REQ-010)

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 14.1 | Progress bar: click Phase 1 | Abre Phase 1 | | |
| 14.2 | Progress bar: click Phase 3 | Abre Phase 3 | | |
| 14.3 | Progress bar: click Phase 6 | Abre Phase 6 (se roteiro existe) | | |
| 14.4 | **Acesso Roteiro de qualquer fase** | Via progress bar ou Dashboard → Phase 6 | | |
| 14.5 | **Acesso Guia de qualquer fase** | Via progress bar ou Dashboard → Phase 5 | | |
| 14.6 | **Acesso Checklist de qualquer fase** | Via progress bar ou Dashboard → Phase 3 | | |
| 14.7 | Voltar Phase 6→5 e re-avançar | Navega sem bloqueio | | |
| 14.8 | Botão voltar todas as fases | 6→5→4→3→2→1 funciona | | |

---

## CENÁRIO 15 — Viagem Internacional

| # | Teste | Esperado | OK? | Nota |
|---|---|---|---|---|
| 15.1 | SP → Roma | Classificada "Internacional" (não "Schengen") | | |
| 15.2 | Checklist internacional | Passaporte, visto, câmbio | | |
| 15.3 | Tipo Family | Seletor passageiros com +/- | | |

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
| 1. Header redesenhado | 6 | Badge informativo, perfil no dropdown |
| 2. Meu Atlas / Mapa | 7 | Leaflet renderiza |
| 3. Autocomplete Mapbox | 10 | Opaco, rápido, formato correto |
| 4. Validação de datas | 7 | Bloqueia datas inválidas |
| 5. Phase 1-2 + Prefs | 6 | PhaseShell, 4+3 split |
| 6. Phase 3 Completion | 6 | Obrigatórios = concluída |
| 7. Phase 4 | 4 | Labels, pré-preenchido |
| 8. Phase 5 Guide | 5 | AiDisclaimer |
| 9. Phase 6 Roteiro | 6 | Sem "Completar", tem "Voltar" |
| 10. 4-State colors | 7 | Verde/azul/amber/cinza |
| 11. Dashboard quick-access | 11 | Checklist/Guia/Roteiro/Relatório |
| 12. Relatório | 9 | Dados de todas as fases |
| 13. Map pins | 10 | 3 cores, auto-zoom |
| 14. Navegação/Revisit | 8 | Acesso de qualquer lugar |
| 15. Internacional | 3 | Classificação correta |
| 16. Idioma | 4 | i18n |
| **TOTAL** | **109** |  |

---

## Critério de Aprovação

- **95%+ PASS (104+/109)** → Beta Launch aprovado
- **90-95%** → Fix rápido + Beta
- **< 90%** → Mais estabilização

Para cada FAIL: número + screenshot + severidade (P0/P1/P2)
