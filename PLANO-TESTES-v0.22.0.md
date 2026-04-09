# Plano de Testes v0.22.0 — Sprints 25-29

**Staging:** https://travel-planner-eight-navy.vercel.app  
**Versão:** v0.22.0  
**Pré-requisitos:**

1. Verificar deploy Ready no Vercel
2. Rodar migrations (há nova migration para coordenadas do mapa):

```powershell
$env:DATABASE\\\\\\\\\\\\\\\_URL="sua\\\\\\\\\\\\\\\_connection\\\\\\\\\\\\\\\_string\\\\\\\\\\\\\\\_do\\\\\\\\\\\\\\\_neon"
npx prisma migrate deploy
```

3. Abrir em aba anônima (Ctrl+Shift+N)

\---

## CENÁRIO 1 — Registro e Header

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|1.1|Criar nova conta|Auto-login → redireciona ao dashboard|OK||
|1.2|Saudação novo usuário|"Bem-vindo ao Atlas, \[Nome]!"|NOK|Não encontrei a saudação na tela.|
|1.3|Header — Gamificação|Badge com pontos + nível visível no header|OK||
|1.4|Header — Navegação|Menu tem "Expedições" e "Meu Atlas" separados|ok||
|1.5|Pontos iniciais|Score começa em 0 ou valor inicial definido|ok||

\---

## CENÁRIO 2 — Navegação Reestruturada (Sprint 28)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|2.1|Menu "Expedições"|Navega para lista de trip cards (sem mapa)|OK||
|2.2|Menu "Meu Atlas"|Navega para página do mapa mundo + perfil gamificação|OK||
|2.3|Redirect /dashboard|Redireciona automaticamente para /expeditions|OK||
|2.4|Mapa mundo|Mapa renderiza corretamente na página Atlas|NOK||
|2.5|Expedições vazio|Sem cards, botão "Nova Expedição" visível|OK||

\---

## CENÁRIO 3 — Phase 1 "O Chamado" + Autocomplete (Sprint 27)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|3.1|Nova Expedição|Wizard inicia com info pessoal primeiro|OK||
|3.2|Nome obrigatório|Campo nome com asterisco, não avança sem preencher|OK||
|3.3|Data nascimento obrigatória|Campo obrigatório com asterisco|OK||
|3.4|Nome pré-preenchido|Nome do registro aparece no campo|OK||
|3.5|Fase + Passo visível|"Fase 1 · Passo X de Y" no topo da tela|OK||
|3.6|Botão CTA|Texto **"Avançar"** (NÃO "Concluir e Ganhar Pontos")|OK||
|3.7|Destino: "Salvador"|**Autocomplete cmdk+Radix**: dropdown opaco, sem transparência|NOK|Ainda com transparência.|
|3.8|Formato resultado|**"Salvador, Bahia, Brasil"** (cidade + estado + país)|NOK|Aparece Salvador, Bahia, Brasil, mas quando seleciono, ele converte para Salvador, Brasil.|
|3.9|Dropdown legível|Fundo sólido, duas linhas por resultado|NOK|Ainda com transparência|
|3.10|Velocidade|Resultados aparecem em <2 segundos|NOK||
|3.11|Sem resultados|Digitar "xyzabc" → mensagem "Nenhum resultado"|NOK|Não aparece mensagem alguma.|
|3.12|Origem|Mesmo padrão cmdk: opaco, formato curto|NOK||
|3.13|Datas|Selecionar ida/volta funciona|OK||
|3.14|Passageiros (Solo)|Seletor NÃO aparece para tipo Solo|OK||
|3.15|Orçamento|Moeda BRL em PT|OK||
|3.16|Botão voltar|Pode voltar para qualquer passo anterior|OK||

\---

## CENÁRIO 4 — Preferências (Sprint 26-27)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|4.1|Layout 2 páginas|Página 1: 5 categorias, Página 2: 5 categorias|NOK||
|4.2|Chips legíveis|Texto NÃO truncado, wrap correto|OK||
|4.3|Dark mode contraste|Chips legíveis no tema escuro (WCAG 4.5:1)|OK||
|4.4|Seleção funciona|Clicar seleciona/deseleciona com feedback|NOK|AO descelecioanr ele deveria diminuir 5 pontos (-5 pts) mas não faz.|
|4.5|**Persistência ao voltar**|Voltar de página 2 → 1: seleções **mantidas**|OK||
|4.6|Gamificação|+5 pontos por categoria (visível no header)|OK||
|4.7|Header atualiza|Pontos no header aumentam ao selecionar categorias|NOK.||

\---

## CENÁRIO 5 — Confirmação + Transições (Sprint 25-27)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|5.1|Confirmação Phase 1|Nome, Bio, Destino, Origem, Datas visíveis|OK||
|5.2|Dados faltantes|"Não informado" para campos vazios|OK||
|5.3|Confirmação Phase 2|Tipo, Hospedagem, Ritmo, Orçamento, **Preferências detalhadas**|OK||
|5.4|Preferências no detalhe|Lista cada categoria + valores selecionados (não só "7 categorias")|OK||
|5.5|Transição entre fases|**Animação unificada** com countdown 3s|NOK|A informação sobre os pontos ainda está separada. E quero tirar o countdown 3 segundo. É melhor alguma animação que demonstre progresso, avanço de fase.|
|5.6|Skip transição|Botão pular visível|OK|Havia pedido para não ter skip.|
|5.7|CTA padronizado|Todos os botões dizem **"Avançar"**|OK||

\---

## CENÁRIO 6 — Phase 3 "O Preparo" (Sprint 25)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|6.1|Título|**"O Preparo"** (NÃO "A Rota")|OK||
|6.2|Classificação doméstica|SP→Salvador = **"Nacional/Doméstica"**|NOK|Aparece como internacional|
|6.3|Checklist gerado|Items aparecem automaticamente|OK||
|6.4|Marcar items|Checkbox funciona, progresso atualiza|OK||
|6.5|Progress bar|Visível com fases clicáveis|OK||
|6.6|Avançar|Vai para Phase 4 (NÃO volta ao Dashboard)|NOK|Da fase 4 "O Preparo" está pulando para a Fase 6. Ver print da tela.|
|6.7|Botão voltar|Volta para Phase 2|OK|Volta para a Fase 3|

\---

## CENÁRIO 7 — Phase 4 "A Logística" (Sprint 25-29)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|7.1|Título|"A Logística"|OK||
|7.2|3 steps separados|Transporte → Hospedagem → Mobilidade|OK||
|7.3|Step 1 pré-preenchido|Origem, Destino, Datas **já nos campos**|NOK|Data de Volta não foi preenchida.|
|7.4|Labels corretos|**"Ida/Volta"** (não "Partida/Chegada")|OK||
|7.5|Label empresa|**"Empresa"** (não "Companhia Aérea/Empresa")|OK||
|7.6|**Auto-save**|Avançar de Step 1→2 **salva automaticamente**|NOK|Tirar botão "salvar transporte", "Salvar Hospedagem" "Salvar Mobilidade" e Salvar sempre que Avançar para próxima tela.|
|7.7|Step 2 Hospedagem|Adicionar hospedagem funciona|OK||
|7.8|Múltiplas hospedagens|Até 5|OK||
|7.9|Step 3 Mobilidade|Grid de ícones funcional|OK||
|7.10|Aluguel carro|Pergunta no **Step 3** (não Step 1)|NOK|Fazer uma melhoria: perguntar sobre documentação especial para dirigir apenas se for selecionada a opção "Aluguel de Carro"<br /><br /><br />|
|7.11|Botão voltar|Steps 1↔2↔3 navegação bidirecional|NOK|Melhoria critica: Ele volta, mas não persiste as informações cadastradas. Ele deve persistir as informações em banco de dados sempre que clicar em avançar. Se preencher a informações solicitadas na tela, e clicar em voltar, ou clicar em outro menu, deve ser feita a pergunta ao usuário se ele quer salvar as informações. Esse comportamento deve existir para todas as telas. Ao sair ou voltar de uma tela, é preciso ter uma confirmação se quer salvar dos dados ou não,, para garantir que os dados não sejam perdidos.|
|7.12|Progress bar|Visível com fases clicáveis|OK||
|7.13|CTA|Botão "Avançar" padronizado|OK||
|7.14|Completar|Avança para Phase 5|OK||

\---

## CENÁRIO 8 — Phase 5 "Guia do Destino" (Sprint 26-27)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|8.1|Título|**"Guia do Destino"** (NÃO "O Mapa dos Dias")|OK||
|8.2|Auto-geração|Guia gera automaticamente ao entrar|OK||
|8.3|Hero banner|Parágrafo resumo com curiosidades do destino|OK||
|8.4|**10 seções visíveis**|TODAS abertas, sem accordion/colapso|OK||
|8.5|Cards uniformes|Mesmo tamanho e estilo para todos os cards|NOK|Segue em diferentes formatos.|
|8.6|Stat cards (4)|Fuso, Moeda, Idioma, Eletricidade — compactos|OK|OK.|
|8.7|Content cards (6)|Conectividade, Cultura, Docs, Clima, Transporte, Saúde|NOK|Manter o mesmo padrão dos Stats cards. Não deveria ter esta diferença|
|8.8|**Sem botão "Atualizar"**|Botão removido|OK||
|8.9|Gamificação bulk|+50 pontos ao carregar (header atualiza)|NOK||
|8.10|Disclaimer IA|Presente|OK||
|8.11|Botão voltar|Volta para Phase 4|OK||
|8.12|Progress bar|Visível com fases clicáveis|OK||
|8.13|Completar|Avança para Phase 6|OK||

\---

## CENÁRIO 9 — Phase 6 "O Roteiro" (Sprint 27-29)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|9.1|Auto-geração|Gera automaticamente na primeira visita|OK||
|9.2|Streaming|Progresso "Criando Dia N de M" (sem JSON raw)|OK||
|9.3|Resultado|Dias em cards com atividades e horários|OK||
|9.4|Disclaimer|"Gerado por IA" presente|OK|Melhoria: incluir todos os disclamer de Gerado por IA no topo da pagina de forma mais visível. E a mensagem deve ser padrão em todo o APP, em termos de texto e formatação.|
|9.5|Regenerar|Botão visível e funcional|OK||
|9.6|**Botão voltar**|Volta para Phase 5|OK||
|9.7|**Progress bar**|Visível com fases clicáveis|OK||
|9.8|**Persistência**|Sair e voltar → roteiro mantido|NOK|Não consegui validar. Ao voltar da fase 6 para a 5, não consegui mais retornar para a aFase 6.|
|9.9|Drag-and-drop|Arrastar atividades funciona|OK||
|9.10|**Re-avançar**|Voltar para Phase 5 e avançar novamente → NÃO bloqueia|NOK|Erro crítico: Ele permite voltar par a Fase 5, mas uma vez na fase 5, não é possível voltar para a Fase 6. A seguinte mensagem é informada: Esta fase já foi concluída. Você pode revisitar os dados.<br />Uma vez que sai fase 6 não foi possível voltar. Nem pelo menu de navegação, nem pela tema de Expedições/Dashboard.|
|9.11|CTA|Botão "Avançar" ou "Completar Expedição"|OK|"Completar Expedição"|

\---

## CENÁRIO 10 — Expedition Summary (Sprint 28-29)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|10.1|Acesso|Após completar Phase 6, botão "Completar Expedição"|OK||
|10.2|Summary page|Página de resumo card-based|OK||
|10.3|Hero|Destino, datas, TripCountdown|OK||
|10.4|Readiness score|Score ponderado (fases 40%, checklist 30%, etc.)|OK||
|10.5|Next Steps|Sugestões de próximos passos|NOK|Não entendi este ponto. Se cheguei no relatório é porque passei por todas as fases existentes não?|
|10.6|**Phase 1 data**|Nome, Bio, Destino, Origem, Datas|OK||
|10.7|**Phase 2 data**|Tipo viajante, Preferências detalhadas|NOK|Deve informar os itens preenchidos, e destacar is itens pendentes|
|10.8|**Phase 3 data**|Checklist (X/Y items completados)|NOK|Deve informar os itens preenchidos, e destacar is itens pendentes|
|10.9|**Phase 4 data**|Transporte, Hospedagem, Mobilidade|NOK|Além do status deve Deve informar os itens preenchidos, e destacar os itens pendentes se existirem|
|10.10|**Phase 5 data**|Guia resumo|NOK|O que é status "atual"? Ele deve trazer as informações do Guia. <br />Erro: E ele ainda está sendo exibido como "O Mapa dos Dias"|
|10.11|**Phase 6 data**|Roteiro (dias/atividades)|NOK|Deve exibir o Roteiro.<br /><br />Uma dúvida: Porque esta fase se chama "O Tesouro" ?|
|10.12|Edit links|Clicar em fase → navega para editar|OK||
|10.13|**Dados preservados**|Ao voltar para editar, dados previamente salvos visíveis|OK||
|10.14|Celebração|Animação de conclusão|NOK||
|10.15|Expedição já completa|Voltar a Phase 6 → botão "Ver Resumo" (não "Completar")|NOK|Tenho que clicar novamente para gerar o resumo. Se já gerei uma vez ele deve estar disponível para consulta de forma mais fácil, sem precisar gerar novamente.|

\---

## CENÁRIO 11 — Dashboard "Expedições" (Sprint 28-29)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|11.1|Página Expedições|Cards de viagem sem mapa|OK||
|11.2|TripCountdown|Contagem regressiva no card|OK||
|11.3|Progress bar|Labels visíveis, 3 cores (completada/atual/pendente)|NOK|O que é status atual? Reve esta classificação de status.|
|11.4|**Click fase**|Navega para **aquela fase específica**|NOK|Ao clicar em qualquer fase ele vai para a 3.|
|11.5|Botão Continuar|Vai para próxima fase pendente|NOK||
|11.6|**Sem botões legados**|SEM "Itens", "Checklist", "Hospedagem"|NOK|Ainda aparece os intes do Checklsit.|
|11.7|Fases 7-8|"Em construção" com texto visível|NOK||
|11.8|Badge completada|Trip finalizada mostra badge "Completada"|NOK||
|11.9|CTA padronizado|Botão "Continuar" consistente|NOK||

\---

## CENÁRIO 12 — Mapa "Meu Atlas" (Sprint 29)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|12.1|Página Atlas|Mapa mundo renderiza|NOK||
|12.2|**Pin após criar expedição**|Pin aparece imediatamente no mapa|NOK||
|12.3|**Pin cor planning**|Expedição fases 1-3: pin **amarelo**|NOK||
|12.4|**Pin cor in progress**|Expedição fases 4-6: pin **azul**|NOK||
|12.5|**Pin cor completed**|Expedição finalizada: pin **verde**|NOK||
|12.6|Múltiplos pins|2+ expedições mostram pins diferentes|NOK||
|12.7|Perfil gamificação|Pontos, nível, badges visíveis na página|NOK||

\---

## CENÁRIO 13 — Phase Revisit + Data Persistence (Sprint 29)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|13.1|Revisitar Phase 1|Via progress bar → dados preenchidos visíveis|NOK|Não consegui voltar para a fase 1 pelo progress bar. Existe algum erro critico nesta funcionalidade. A navegação entre as fases pelo progress bar não está consistente. revisar com atenção e encontrar causa raiz.<br />Erro crítico: Da fase 3 "O Preparo" está pulando para a Fase 6|
|13.2|Revisitar Phase 3|Checklist com items já marcados|OK||
|13.3|Revisitar Phase 4|Transporte/Hospedagem/Mobilidade salvos|NOK|Não consegui validar, pois após a criação da Expedição, ao retornar para a fase 3, ela só avança para a fase 6.|
|13.4|Editar dados|Alterar campo e salvar → persiste|NOK<br />|Não consegui validar, pois após a criação da Expedição, ao retornar para a fase 3, ela só avança para a fase 6.|
|13.5|**Sem bloqueio**|Revisitar e avançar novamente NÃO dá erro|NOK|Não consegui validar, pois após a criação da Expedição, ao retornar para a fase 3, ela só avança para a fase 6.|
|13.6|Sem perda de dados|Navegar entre fases NÃO perde dados salvos|NOK|Não consegui validar, pois após a criação da Expedição, ao retornar para a fase 3, ela só avança para a fase 6.|

\---

## CENÁRIO 14 — Viagem Internacional + Passageiros

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|14.1|Nova expedição Roma|Info pessoal pré-preenchida do perfil|||
|14.2|**Nome no perfil**|Nome salvo e exibido corretamente|||
|14.3|Classificação|Phase 3 = "Internacional"|||
|14.4|Tipo Family|Seletor passageiros aparece com +/-|||
|14.5|Adultos + Crianças|Adicionar 2 adultos + 1 criança funciona|||
|14.6|Seniors|Campo separado para idosos funciona|||
|14.7|Limite|Máximo por tipo ≤ 9|||

\---

## CENÁRIO 15 — Gamificação no Header (Sprint 28)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|15.1|Badge visível|Pontos + nível no header em TODAS as páginas|OK||
|15.2|Atualiza em tempo real|Completar fase → pontos aumentam no header|NOK||
|15.3|Preferências|Selecionar chips → header atualiza|NOK||
|15.4|Guide|Carregar guia → +50 pontos no header|NOK||
|15.5|Consistente|Mesmo valor em todas as páginas|NOK||

\---

## CENÁRIO 16 — Idioma e Acessibilidade

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|16.1|PT → EN|Todas as telas mudam|OK||
|16.2|EN → PT|Volta tudo|OK||
|16.3|**Sem 404**|Trocar idioma em QUALQUER fase NÃO dá 404|OK||
|16.4|Moeda|PT=BRL, EN=USD|OK||
|16.5|Contraste WCAG|Botões laranja com texto legível|OK||
|16.6|Sem i18n raw|Nenhum "errors.xxx" em nenhuma tela|OK||

\---

## Resumo

|Cenário|Testes|
|-|-|
|1. Registro e Header|5|
|2. Navegação Reestruturada|5|
|3. Phase 1 + Autocomplete|16|
|4. Preferências|7|
|5. Confirmação + Transições|7|
|6. Phase 3 O Preparo|7|
|7. Phase 4 A Logística|14|
|8. Phase 5 Guia do Destino|13|
|9. Phase 6 O Roteiro|11|
|10. Expedition Summary|15|
|11. Dashboard Expedições|9|
|12. Mapa Meu Atlas|7|
|13. Phase Revisit + Persistência|6|
|14. Internacional + Passageiros|7|
|15. Gamificação Header|5|
|16. Idioma e Acessibilidade|6|
|**TOTAL**|**140**|

\---

## Como reportar

Para cada FAIL: número + o que aconteceu + screenshot + severidade (P0/P1/P2)

