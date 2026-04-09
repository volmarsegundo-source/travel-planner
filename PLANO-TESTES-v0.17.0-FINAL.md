# Plano de Testes v0.17.0 — Validação Final (Sprints 16-24)

**Staging:** https://travel-planner-eight-navy.vercel.app  
**Versão:** v0.17.0  
**Data:** 11 de Março de 2026

\---

## Pré-requisitos

```powershell
# 1. Rodar migrations pendentes
$env:DATABASE\_URL="sua\_connection\_string\_do\_neon"
npx prisma migrate deploy

# 2. Verificar deploy no Vercel (deve estar Ready/verde)

# 3. Abrir staging em aba anônima (Ctrl+Shift+N)
```

\---

## CENÁRIO A — Novo Usuário + Viagem DOMÉSTICA (SP → Salvador)

### A1. Registro

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|A1.1|Acessar landing page|Página carrega com design dark theme|OK||
|A1.2|Clicar "Create Account"|Formulário de registro aparece|OK||
|A1.3|Preencher: nome "Teste Dom", email novo, senha|Campos funcionam|OK||
|A1.4|Submeter registro|**Auto-login** — redireciona direto ao Dashboard (sem pedir login)|OK||
|A1.5|Verificar saudação|"Bem-vindo ao Atlas, Teste Dom!" (NÃO "Bem-vindo de volta")|OK||
|A1.6|Dashboard vazio|Sem cards de viagem, botão "Nova Expedição" visível|OK||

### A2. Phase 1 — "O Chamado" (Criação da Viagem)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|A2.1|Clicar "Nova Expedição"|Wizard inicia|OK.||
|A2.2|Passo 1: Info Pessoal|Nome "Teste Dom" **pré-preenchido** do registro|OK||
|A2.3|Campos pessoais|Bio, data nascimento, telefone, país, cidade visíveis|OK||
|A2.4|Preencher bio e dados|Campos salvam sem erro|OK||
|A2.5|Avançar para Passo 2|Transição **automática e suave** (sem click extra)|OK||
|A2.6|Destino: digitar "Salvador"|Autocomplete mostra resultados **legíveis**|NOK|Ainda tem transparência no resultado, prejudicando a visualização|
|A2.7|Formato do resultado|**"Salvador, Bahia, Brasil"** (curto, não hierarquia completa)|NOK|No resultado ele trouxe apenas Estado e Pais, mas deveria incluir o nome da cidade também. Exemplo: Salvador, Bahia, Brasil. Ao invés de Bahia, Brasil que foi o que apareceu após ter digitado Salvador.|
|A2.8|Dropdown legível|Fundo **opaco** (sem transparência que atrapalhe leitura)|NOK|Ainda tem transparência no resultado, prejudicando a visualização|
|A2.9|Selecionar Salvador|Campo preenchido corretamente|NOK|No resultado ele trouxe apenas Estado e Pais, mas deveria incluir o nome da cidade também. Exemplo: Salvador, Bahia, Brasil. Ao invés de Bahia, Brasil que foi o que apareceu após ter digitado Salvador.|
|A2.10|Campo Origem|"De onde você está partindo?" visível|OK||
|A2.11|Digitar "São Paulo"|Autocomplete funciona com formato curto|NOK|No resultado ele trouxe apenas Estado e Pais, mas deveria incluir o nome da cidade também. Exemplo: São Paulo, Brasil. Ao invés de São Paulo, São Paulo, Brasil que foi o que apareceu após ter digitado São Paulo.|
|A2.12|Selecionar São Paulo|Campo preenchido|NOK|No resultado ele trouxe apenas Estado e Pais, mas deveria incluir o nome da cidade também. Exemplo: São Paulo, Brasil. Ao invés de São Paulo, São Paulo, Brasil que foi o que apareceu após ter digitado São Paulo.|
|A2.13|Avançar|Transição automática|OK||
|A2.14|Datas|Selecionar ida e volta (ex: 05/04 a 10/04)|OK||
|A2.15|Avançar|Transição automática|NOK|Ele segue passando por 3 men sagens de transição sem muita harmônio e fluidez entre elas.|
|A2.16|Tipo de viajante|Selecionar (ex: Solo)|NOK|Depois de informar data da viagem, a aplicação avançou para a Fase Explorador. Pedindo informações obre Tipo de Viajando. Selecionei Solo|
|A2.17|Passageiros|Seletor estilo companhia aérea com +/-|NOK|Não apareceu. Ele avançou para a fase O Explorador, e depois de tipo de viajante, pediu informações sobre o Estilo da Hospedagem, depois Ritmo da viagem, depois orçamento,|
|A2.18|Adultos|Adicionar 1 adulto|NOK |Não apareceu nesta fase|
|A2.19|Limite passageiros|Máximo por tipo deve ser ≤ 9 (não 20)|NOK|Não apareceu nesta fase|
|A2.20|Hospedagem|Selecionar preferência (ex: Budget)|NOK|Apareceu, porém na fase O Explorador. Me parece que pode estar confuso e desordenado.|
|A2.21|Ritmo|Selecionar ritmo (slider ou opção)|NOK|Apareceu, porém na fase O Explorador. Me parece que pode estar confuso e desordenado.|
|A2.22|Orçamento — Moeda|Idioma PT → moeda padrão **BRL**|OK||
|A2.23|Preencher orçamento|Ex: R$ 3.000|OK||
|A2.24|Avançar|Transição automática|NOK||

### A3. Preferências Pessoais (dentro do Phase 1 ou 2)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|A3.1|Tela de preferências|**Chips/toggles** visíveis (NÃO campos de texto)|OK. Parcial.|Tela de preferências de viagem está logo apos o informar o orçamento. <br /><br />Alguns textos estão cortadas, não sendo possível a leitura. Ver imagem.<br /><br />São muitas informações em uma mesma pãgina. Quebrar as Preferências de viagem em 1 ou 2 páginas o wizArd.|
|A3.2|Categorias disponíveis|Mín. 7 categorias (sem repetir ritmo/orçamento/social já coletados)|OK||
|A3.3|Exemplos de categorias|Alimentação, Interesses, Hospedagem, Fitness, Fotografia, Horário, Conectividade|OK.||
|A3.4|Seleção múltipla|Clicar em chips seleciona/deseleciona|OK||
|A3.5|Todos opcionais|Pode avançar sem preencher nada|OK||
|A3.6|Gamificação|Preencher categorias gera pontos (+5 por categoria)|NOK|ESta dicionando pontos. MAs se não selecionar, ou se desmarcar, tem que retirar os pontos.|

### A4. Tela de Confirmação

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|A4.1|"Pronto para explorar?"|Tela de confirmação aparece|OK||
|A4.2|Nome visível|"Teste Dom" aparece|NOK|Não aparece|
|A4.3|Bio visível|Bio preenchida aparece|NOK||
|A4.4|Destino|"Salvador" ou "Salvador, Bahia, Brasil"|OK||
|A4.5|Origem|"São Paulo"|OK||
|A4.6|Datas|"05/04/2026 → 10/04/2026"|OK||
|A4.7|Passageiros|"1 adulto" (detalhado)|NOK||
|A4.8|Tipo viajante|"Solo" (traduzido, não enum raw)|OK||
|A4.9|Hospedagem|"Budget" (traduzido)|OK||
|A4.10|Ritmo|Valor selecionado|OK||
|A4.11|Orçamento|"R$ 3.000"|OK||
|A4.12|Preferências|Chips selecionados listados|NOK||
|A4.13|Concluir|Clicar "Concluir e Ganhar Pontos" funciona|OK||

### A5. Phase 2 — "O Explorador"

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|A5.1|Transição|Automática, suave, sem click|NOK||
|A5.2|Conteúdo|Etapas de personalização da viagem|NOK|Agora ele entrou na dase 3 "A ROta" e apresentou o checklist de preparação de viagem.|
|A5.3|Completar|Avançar para Phase 3|NOK|Avançou para a A Logistica.|

### A6. Phase 3 — "A Rota" (Checklist)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|A6.1|Checklist gerado|Items de checklist aparecem automaticamente|NOK|Vou validar depois de ajustada o sequenciamento das fases.|
|A6.2|Classificação|**"Doméstica"** (NÃO "Internacional" — SP→Salvador é doméstico)|NOK|Vou validar depois de ajustada o sequenciamento das fases.|
|A6.3|Items relevantes|Checklist coerente com viagem doméstica|NOK|Vou validar depois de ajustada o sequenciamento das fases.|
|A6.4|Marcar items|Checkbox funciona, progresso atualiza|NOK|Vou validar depois de ajustada o sequenciamento das fases.|
|A6.5|Completar fase|Botão para avançar funciona|NOK|Vou validar depois de ajustada o sequenciamento das fases.|
|A6.6|Navegação|Vai para **Phase 4** (NÃO volta para Dashboard)|NOK|Vou validar depois de ajustada o sequenciamento das fases.|

### A7. Phase 4 — "A Logística" (3 Steps)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|A7.1|Título|**"A Logística"** (NÃO "O Abrigo")|OK||
|A7.2|Subtítulo|Algo como "Planeje como chegar e se locomover"|OK||
|A7.3|Layout|**3 steps separados** (NÃO tabs numa tela só)|OK||
|A7.4|Step 1: Transporte|Seletor de tipo (Avião, Ônibus, Carro, Trem)|NOK|Já deveria vir com De PAra Data de PArtida e Data de Chegada Preenchidos.|
|A7.5|Transporte doméstico|Para SP→Salvador: voo ou ônibus (faz sentido)|NOK|Não entendi|
|A7.6|Adicionar segmento|Pode adicionar transporte com datas e custo|OK||
|A7.7|Avançar Step 1 → 2|Botão "Próximo" funciona|OK||
|A7.8|Step 2: Hospedagem|Seletor de hospedagem (Hotel, Hostel, Airbnb)|OK||
|A7.9|Múltiplas hospedagens|Pode adicionar até 5|OK||
|A7.10|Avançar Step 2 → 3|Funciona|OK||
|A7.11|Step 3: Mobilidade|Grid de ícones (Transporte Público, Táxi, A Pé, etc.)|OK||
|A7.12|Aluguel de carro|Pergunta sobre carro está neste step (não no Step 1)|NOK|Segue na primeira tela, antes de definir o Voo. É necessário ajustar.|
|A7.13|Selecionar mobilidade|Multi-select funciona|OK||
|A7.14|Completar Phase 4|Avança para Phase 5|OK||

### A8. Phase 5 — "O Mapa dos Dias" (Guia do Destino)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|A8.1|Auto-geração|Guia gera **automaticamente** ao entrar (sem click)|OK||
|A8.2|Loading|Spinner enquanto gera|OK||
|A8.3|Layout|**Cards visíveis** (NÃO accordions colapsados)|NOK|Apenas 4 cards visíveis e os demais 6 colapsados.<br /><br />Retirar Botão Atualizar guia.<br />Ele deve ser atualizado apenas se houver mudanças nos dados do usuário, e, preferencias e dados da viagem.|
|A8.4|Categorias (10)|Fuso Horário, Moeda, Idioma, Eletricidade, Conectividade, Dicas Culturais, Documentos, Clima, Transporte Local, Saúde|OK||
|A8.5|Banner highlights|Banner no topo com destaques|NOK|Não sei se é um Banner. Parecem mais cards das categorias com textos não colapsados.<br />Melhorar para \\todos os cards visíveis e o banner de highlights deve trazer um resumo do que foi do cards.|
|A8.6|Disclaimer IA|Mensagem de que foi gerado por IA|OK||
|A8.7|Completar fase|Avança para Phase 6|OK.||

### A9. Phase 6 — "O Roteiro" (Itinerário AI)

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|A9.1|Auto-geração|Roteiro gera automaticamente na primeira visita|OK||
|A9.2|Streaming visual|Progresso "Criando Dia 1 de N" (NÃO JSON raw)|OK||
|A9.3|Resultado|Dias em cards, atividades com horários|OK||
|A9.4|Disclaimer|"Gerado por IA, pode conter erros"|OK||
|A9.5|Regenerar|Botão "Regenerar" visível e funcional|OK.||
|A9.6|Persistência|Sair e voltar → roteiro ainda está lá|NOK.|Não tem botão de voltar na tela por isso não consegui testar a persistência.|
|A9.7|Drag-and-drop|Arrastar atividades entre dias (se implementado)|OK|Está funcionando, porém precisamos de uma melhoria critica. Ao fazer o drag-and-drop de atividades no mesmo dia, é preciso fazer o ajustes de horário.|

\---

## CENÁRIO B — Dashboard e Navegação

### B1. Dashboard "Meu Atlas"

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|B1.1|Card da viagem|Mostra "Salvador" com progresso|OK||
|B1.2|Barra progresso|Fases preenchidas com cores corretas|OK||
|B1.3|Contagem|"Fase X · X de 8 fases" (número correto)|NOK.|O titulo das fases está sobre este texto, impossibilitando a visão.|
|B1.4|Labels|Nome/número de cada fase visível (desktop) ou tooltip (mobile)|OK||
|B1.5|Clicável|Clicar em fase completada → navega para ela|NOK.|Ele sempre volta para a ultima etapa, no caso do teste O Roteiro.|
|B1.6|Fase futura|Clicar em fase não completada → comportamento adequado|NOK|Não consegui validar|
|B1.7|Botão Continuar|Navega para a próxima fase pendente corretamente|NOK|Não consegui validar|
|B1.8|Botões removidos|NÃO existem botões "Itens", "Checklist", "Roteiro"|NOK.|Ainda estão presentes. Ver imagem.|
|B1.9|Fases 7-8|"Em construção" / "Coming Soon" com texto visível|OK.||

### B2. Revisitar Fases Completadas

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|B2.1|Clicar Phase 1 na barra|Mostra dados preenchidos (não erro)|NOK|Não volta para a Fase 1. Ele sempre volta para a ultima fase completada, no caso do teste O Roteiro.|
|B2.2|Clicar Phase 3 (checklist)|Mostra checklist (não "Can only advance..." erro)|NOK|Não volta para a Fase 1. Ele sempre volta para a ultima fase compeltada, no caso do teste O Roteiro.|
|B2.3|Mensagem adequada|Se fase completa, mostra dados ou "Fase concluída" traduzido|NOK||
|B2.4|Sem erro i18n|Nenhuma mensagem tipo "errors.phaseAlreadyCompleted" raw|OK||

\---

## CENÁRIO C — Viagem INTERNACIONAL (SP → Roma)

### C1. Criar segunda viagem

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|C1.1|"Nova Expedição"|Wizard inicia|OK||
|C1.2|Info pessoal|**Pré-preenchida** do perfil (não pergunta de novo)|OK||
|C1.3|Pular info pessoal|Se tudo preenchido, vai direto para destino|NOK.|Não tem Pular, tem Próximo que me aprece mais correto.|
|C1.4|Destino: Roma|Autocomplete mostra "Roma, Lácio, Itália" (curto)|OK||
|C1.5|Origem|Pré-preenchida "São Paulo" do perfil|ok||
|C1.6|Completar Phase 1|Funciona|ok||

### C2. Classificação Internacional

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|C2.1|Phase 3 checklist|Classificada como **"Internacional"**|OK.||
|C2.2|Items internacionais|Passaporte, visto, seguro viagem, câmbio|OK||
|C2.3|Phase 4 transporte|Opção de voo (SP → Roma) faz sentido|OK.||

\---

## CENÁRIO D — Profile e Persistência

### D1. Perfil

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|D1.1|Acessar Perfil|Página carrega|OK||
|D1.2|Nome salvo|"Teste Dom" visível|NOK.||
|D1.3|Bio salva|Bio preenchida visível|OK||
|D1.4|Editar nome|Alterar e salvar funciona|NOK.||
|D1.5|Criar nova viagem|Nome editado aparece pré-preenchido|OK.||

\---

## CENÁRIO E — Idioma e i18n

### E1. Troca de idioma

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|E1.1|Trocar PT → EN|Todas as telas mudam para inglês|OK||
|E1.2|Trocar EN → PT|Volta tudo para português|OK||
|E1.3|Sem keys raw|Nenhum texto tipo "errors.xxx" ou "phase.xxx" visível|OK||
|E1.4|Moeda muda|EN = USD, PT = BRL na tela de orçamento|OK||
|E1.5|Wizard preserva|Trocar idioma NÃO reseta o wizard para o passo 1|NOK|Na troca de idiomas na Fase 3 A Rota, deu erro 404.|

\---

## CENÁRIO F — Segurança

### F1. Testes básicos

|#|Teste|Esperado|OK?|Nota|
|-|-|-|-|-|
|F1.1|Footer /terms|Carrega em PT e EN|OK||
|F1.2|Footer /privacy|Carrega em PT e EN|OK||
|F1.3|Footer /support|Carrega em PT e EN|OK||
|F1.4|PII em notas|Digitar CPF em campo de notas → verificar logs Vercel|NOK|Qual é o campo de notas|
|F1.5|API Key oculta|Erro de AI não expõe ANTHROPIC\_API\_KEY|NOK|Me instruir depois como testar.|

\---

## Resumo de Resultados

|Cenário|Total Testes|PASS|FAIL|N/A|
|-|-|-|-|-|
|A. Viagem Doméstica (A1-A9)|62||||
|B. Dashboard e Navegação|13||||
|C. Viagem Internacional|5||||
|D. Profile e Persistência|5||||
|E. Idioma e i18n|5||||
|F. Segurança|5||||
|**TOTAL**|**95**||||

\---

## Como reportar

Para cada FAIL, anotar:

1. **Número** (ex: A7.3)
2. **O que aconteceu** vs **o que era esperado**
3. **Screenshot** se possível
4. **Severidade**: P0 (blocker), P1 (importante), P2 (cosmético)

Enviar resultados para planejar próximo sprint de correções.

