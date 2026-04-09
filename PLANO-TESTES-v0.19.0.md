# Plano de Testes v0.19.0 — Sprints 25-26

**Staging:** https://travel-planner-eight-navy.vercel.app  
**Versão:** v0.19.0  
**Pré-requisitos:** Aba anônima + verificar deploy Ready no Vercel + rodar migrations se pendentes



Erros adicionais:
- A aplicação sempre entre logada na ultima conta de usuário que fiz o testes. É por conta do ambiente de testes ou é alguma falha de segurança?
- O Pin não está aparecendo para viagens que crio na hora, através do botão "New Expedition". Verificar se existe algua falha de atualização do Pin no MAp. Deve ser uma atualização em real-time, logo após a criação da Expedição o Pin deve ser colocado no Mapa.





\---

## CENÁRIO 1 — Registro e Primeiro Acesso

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|1.1|Criar nova conta|Auto-login, redireciona ao Dashboard|OK||
|1.2|Saudação primeiro acesso|"Bem-vindo ao Atlas, \[Nome]!" (não "de volta")|OK||

\---

## CENÁRIO 2 — Phase 1 "O Chamado"

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|2.1|Info pessoal primeiro|Nome pré-preenchido, Bio, Nascimento, Telefone, País, Cidade|OK.|Melhoria: colocar estas campos como obrigatórios.|
|2.2|Nome da fase + passo|"Fase 1 · Passo X de Y" visível na tela|OK||
|2.3|Botão voltar|Pode voltar para passos anteriores|OK||
|2.4|Destino: digitar "Salvador"|**Autocomplete opaco** (sem transparência)|NOK|Segue transparente, prejudicando a visão.<br />Além disso o autocomplete está lento.<br />Rever se tem alguma opção melhor para buscar estas informações.|
|2.5|Formato resultado|**"Salvador, Bahia, Brasil"** (cidade incluída, duas linhas)|NOK||
|2.6|Resultado "no results"|Digitar texto sem sentido → mensagem "Nenhum resultado"|NOK||
|2.7|Alvo toque mobile|Itens do dropdown com min 44px de altura|||
|2.8|Origem|Autocomplete mesmo padrão opaco + formato curto|NOK||
|2.9|Datas|Selecionar ida/volta funciona|OK||
|2.10|Transição pós-datas|**Animação unificada** (não 3 estilos diferentes)|||
|2.11|Tipo viajante|Selecionar Solo|OK||
|2.12|Passageiros (Solo)|Seletor **NÃO aparece** para Solo (by design)|Não entendi este teste.||
|2.13|Hospedagem|Selecionar preferência|OK||
|2.14|Ritmo|Selecionar|OK||
|2.15|Orçamento|Moeda BRL em PT, campo funcional|OK||

\---

## CENÁRIO 3 — Preferências (Sprint 26 — NOVO)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|3.1|Layout|Preferências em **2 páginas** (5 categorias + 5 categorias)|OK||
|3.2|Página 1|5 categorias com chips selecionáveis|OK||
|3.3|Página 2|Mais 5 categorias ao avançar|NOK|2 categorias|
|3.4|Chips legíveis|Texto dos chips **NÃO truncado** (wrap correto)|OK||
|3.5|Grid responsivo|Chips organizam bem em telas menores|||
|3.6|Dark mode|Contraste adequado, chips legíveis no tema escuro|OK||
|3.7|Seleção|Clicar seleciona/deseleciona com feedback visual|OK||
|3.8|Opcional|Pode avançar sem selecionar nada|OK||
|3.9|Gamificação|+5 pontos por categoria preenchida|OK||
|3.10|Navegação|Botão voltar entre página 1 e 2 funciona|NOK.|Quando volto ele perdeu todas as seleções que havia feito anteriormente antes de aperta concluir.<br />E na tela "Pronto para explorar?" as preferências não são exibidas. ele aparece apenas: Preferencia: 7 categorias|

"---

## CENÁRIO 4 — Confirmação e Transições (Sprint 25-26)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|4.1|Confirmação Phase 1|Mostra: Nome, Bio, Destino, Origem, Datas|OK||
|4.2|Dados faltantes|Campos não preenchidos mostram "Não informado"|NOK||
|4.3|Confirmação Phase 2|Mostra: Tipo viajante, Hospedagem, Ritmo, Orçamento, Preferências|NOK|As preferências não são exibidas. ele aparece apenas: Preferencia: 7 categorias|
|4.4|Transição Phase 1→2|Animação **unificada**, suave, com countdown 3s|NOK|Aglutinar em 1 unica mensagem, e não precisa ter botão confirmar.|
|4.5|Skip transição|Botão para pular animação visível|NOK|Não vi|
|4.6|Reduced motion|Se preferência do OS é reduced-motion, animação simplificada|NOK|Não percebi|
|4.7|ARIA|Transição anunciada por screen reader (ARIA live region)|NOK|Não percebi|

\---

## CENÁRIO 5 — Phase 2 "O Explorador" → Phase 3 "O Preparo"

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|5.1|Phase 2 completa|Avança normalmente|OK||
|5.2|Transição 2→3|Animação unificada|NOK||
|5.3|Phase 3 título|**"O Preparo"** (NÃO "A Rota")|OK||
|5.4|Checklist|Items gerados automaticamente|OK|Dúvida: o Check list é gerado por IA?|
|5.5|Classificação doméstica|SP→Salvador = **"Doméstica"**|OK|Classificado normalmente como Nacional.|
|5.6|Completar checklist|Marcar items, progresso atualiza|OK||
|5.7|Avançar|Vai para Phase 4 (NÃO volta ao Dashboard)|OK||

\---

## CENÁRIO 6 — Phase 4 "A Logística" (3 Steps)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|6.1|Título|**"A Logística"**|OK||
|6.2|Step 1: Transporte|Campos de transporte visíveis|NOK|Ao invés de Partida e Chegada, alterar para Ida e Volta. Carregar os campos com as data de ida e volta já informadas pelo usuário.<br /><br />Melhoria: Salvar automaticamente ao avançar.|
|6.3|Pré-preenchido|Origem, Destino, Datas da viagem **já preenchidos**|NOK|Carregou a Data de Partida, mas é preciso alterar para Ida e Volta. Carregar os campos com as data de ida e volta já informadas pelo usuário.<br /><br />Melhoria: trocar o nome de "Companhia Aérea/Empresa" para apenas "Empresa"<br /><br />Melhoria: Salvar automaticamente ao avançar.|
|6.4|Tipo transporte|Avião, Ônibus, Carro, Trem, Navio selecionáveis|OK|Dúvida: O que é checkbox "Segmento de retorno"?<br /><br />Melhoria: Salvar automaticamente ao avançar.|
|6.5|Avançar Step 1→2|Funciona|OK||
|6.6|Step 2: Hospedagem|Adicionar hospedagem funciona|OK|Melhoria: Salvar automaticamente ao avançar.|
|6.7|Múltiplas|Até 5 hospedagens|||
|6.8|Avançar Step 2→3|Funciona|OK||
|6.9|Step 3: Mobilidade|Grid de ícones (Metro, Táxi, A Pé, etc.)|OK||
|6.10|Aluguel carro|Pergunta sobre carro **neste step** (não no Step 1)|OK||
|6.11|Botão voltar|Pode voltar entre Steps 1↔2↔3|||
|6.12|Completar|Avança para Phase 5|OK||

\---

## CENÁRIO 7 — Phase 5 "O Mapa dos Dias" — Guide (Sprint 26 — REDESIGN)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|7.1|Auto-geração|Guia gera automaticamente ao entrar|OK|Melhoria: Rever o Titulo, pois O Mapa dos Dias confunde com o Roteiro, e nesta Fase o que temos é um guia de bolso ,com informações e curiosidades sobre o destino.|
|7.2|Hero banner|Banner no topo com destaques resumidos|NOK|Deve ser um paragrafo com algumas informação relevante ou curiosidade sobre o destino.|
|7.3|Todas 10 seções|**TODAS visíveis** sem accordion/colapso|OK||
|7.4|Stat cards (4)|Fuso Horário, Moeda, Idioma, Eletricidade — compactos|NOK|Implementar o mesmo padrão visual para todos os cards. Todo o texto deve ser legível e os cards devem ter o mesmo tamanho. Padronize.|
|7.5|Content cards (6)|Conectividade, Dicas Culturais, Documentos, Clima, Transporte Local, Saúde — com bordas accent|NOK|Implementar o mesmo padrão visual para todos os cards. Todo o texto deve ser legível e os cards devem ter o mesmo tamanho. Padronize.|
|7.6|Sem botão "Atualizar"|Botão removido (auto-update com dialog de confirmação)|NOK|Botão ainda presente|
|7.7|Gamificação bulk|+50 pontos ao carregar (sem clicar cada seção)|OK|Informado apenas na trasição, o que me parece correto.|
|7.8|Disclaimer IA|Mensagem presente|OK||
|7.9|Completar|Avança para Phase 6|OK||

\---

## CENÁRIO 8 — Phase 6 "O Roteiro"

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|8.1|Auto-geração|Gera automaticamente na primeira visita|OK||
|8.2|Streaming|Progresso visual "Criando Dia N de M" (sem JSON raw)|OK||
|8.3|Resultado|Dias em cards com atividades e horários|OK||
|8.4|Disclaimer|"Gerado por IA, pode conter erros"|OK||
|8.5|Regenerar|Botão visível e funcional|OK||
|8.6|Botão voltar|**Presente** (Sprint 25 fix) — pode voltar para Phase 5|NOK|Ao clicar em voltar ele voltou para a Fase 5, mas ao clicar novamente em "Completar Fase" ele não avança para a Fase 6. E a seguinte mensagem é exibida "Esta fase já foi concluída. Você pode revisitar os dados."|
|8.7|Persistência|Sair e voltar → roteiro ainda lá||Ao clicar em voltar ele voltou para a Fase 5, mas ao clicar novamente em "Completar Fase" ele não avança para a Fase 6.<br /> E a seguinte mensagem é exibida "Esta fase já foi concluída. Você pode revisitar os dados."<br /><br />Ele não devo bloquear o avança, e não deve dar mais pontos, se a fase já foi concluida.|
|8.8|Drag-and-drop|Arrastar atividades funciona|NOK.|Ele permite arrastar as atividades, mas ele não faz o ajustes de horas.|

\---

## CENÁRIO 9 — Expedition Summary (Sprint 26 — NOVO)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|9.1|Completar expedição|Após Phase 6, opção "Completar Expedição" visível|OK||
|9.2|Summary page|Página de resumo com dados de todas 6 fases|OK|Melhoria: Trazer todas as informações coletadas em cada fase.<br /><br />Melhorias: Se a Expedição já for concluída, ao voltar a fase 6, ao invés de seguir com o botão de concluir (já foi concluido) deve ter um boão para acesso ao resumo/relatório.|
|9.3|Dados Phase 1|Destino, Origem, Datas, Info pessoal|NOK|Não exibe Info pessoal|
|9.4|Dados Phase 2|Tipo viajante, Preferências|NOK|Não exibe todas as informação|
|9.5|Dados Phase 3|Checklist completado (X/Y items)|NOK|Não exibe  as informação do checklist|
|9.6|Dados Phase 4|Transporte, Hospedagem, Mobilidade|NOK|Não exibe todas as informação|
|9.7|Dados Phase 5|Guia gerado (resumo)|NOK|Não exibe todas as informação|
|9.8|Dados Phase 6|Roteiro (dias/atividades resumidos)|NOK|Não exibite o roteiro|
|9.9|Booking codes|Códigos mascarados (não visíveis em texto puro)|||
|9.10|Celebração|Animação/confetti de conclusão|||
|9.11|BOLA|Não consegue acessar summary de outro usuário|||

\---

## CENÁRIO 10 — Dashboard (Sprint 25-26 — POLISH)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|10.1|Card da viagem|Destino + datas de viagem visíveis|OK||
|10.2|Progress bar|Fases com labels visíveis (desktop)|NOK||
|10.3|Estados visuais|3 cores: completada / atual / pendente|NOK||
|10.4|Click fase|Navega para **aquela fase específica**|NOK|Vai para a ultima fase.|
|10.5|Botão Continuar|Vai para próxima fase pendente|NOK|Ele volta da primeira task da fase. O que quero é que ele volte da ultima pagina avançada.|
|10.6|Botões removidos|SEM "Itens", "Checklist", "Hospedagem"|OK||
|10.7|Fases 7-8|"Em construção" com texto visível|NOK||
|10.8|Trip completada|Badge "Completada" no card (se expedição finalizada)|NOK||
|10.9|Keyboard nav|Tab/Enter funciona nos cards|OK||
|10.10|Contraste WCAG|Texto legível em todos os botões (especialmente laranja)|NOK||

\---

## CENÁRIO 11 — Viagem Internacional (SP → Roma)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|11.1|Info pessoal|Pré-preenchida do perfil (não pergunta de novo)|NOK|O nome completo não foi preenchido.|
|11.2|Destino Roma|Autocomplete: "Roma, Lácio, Itália" (formato curto)|NOK|COmo já informado, ele está lendo e não vem no formado, Cidade, Estado, Pais.|
|11.3|Classificação|Phase 3 mostra **"Internacional"**|OK||
|11.4|Checklist|Items internacionais (passaporte, visto, câmbio)|OK||
|11.5|Phase 4 transport|Voo SP→Roma (faz sentido para internacional)|OK||
|11.6|Passageiros (Family)|Criar viagem Family → seletor **aparece** com +/-|OK||

\---

## CENÁRIO 12 — Navegação Bidirecional (Sprint 25 — NOVO)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|12.1|Phase 2 voltar|Botão voltar → retorna para Phase 1|NOK|VOltou paa o Dashboard|
|12.2|Phase 3 voltar|Botão voltar → retorna para Phase 2|OK||
|12.3|Phase 4 voltar|Botão voltar → retorna para Phase 3|OK||
|12.4|Phase 5 voltar|Botão voltar → retorna para Phase 4|NOK|Não tem botão voltar|
|12.5|Phase 6 voltar|Botão voltar → retorna para Phase 5|NOK|Além disso, a Fase 6 não tem a progress bar.|
|12.6|Revisitar Phase 1|Via progress bar → mostra dados (sem erro)|NOK||
|12.7|Revisitar Phase 3|Via progress bar → mostra checklist (sem erro)|NOK||
|12.8|Sem erro i18n|Nenhum "errors.xxx" raw em nenhuma tela|||

\---

## CENÁRIO 13 — Idioma e Contraste

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|13.1|PT → EN|Todas as telas mudam|OK||
|13.2|EN → PT|Volta tudo|OK||
|13.3|Sem 404|Trocar idioma em QUALQUER fase NÃO dá 404|OK||
|13.4|Moeda|PT=BRL, EN=USD|OK||
|13.5|Contraste botões|Texto nos botões laranja **legível** (WCAG 4.5:1)|||
|13.6|Dark mode geral|Todos os cards, dropdowns, chips com contraste adequado|||

\---

## Resumo

|Cenário|Testes|
|-|-|
|1. Registro|2|
|2. Phase 1|15|
|3. Preferências|10|
|4. Confirmação/Transições|7|
|5. Phase 2→3|7|
|6. Phase 4 Logística|12|
|7. Phase 5 Guide|9|
|8. Phase 6 Roteiro|8|
|9. Expedition Summary|11|
|10. Dashboard|10|
|11. Internacional|6|
|12. Navegação bidirecional|8|
|13. Idioma e Contraste|6|
|**TOTAL**|**111**|

\---

## Como reportar

Para cada FAIL: número do teste + o que aconteceu + screenshot se possível + severidade (P0/P1/P2)

