# Plano de Testes Manuais — Sprints 18 a 21 (v0.12.0 → v0.15.0)

**Staging URL:** https://travel-planner-eight-navy.vercel.app  
**Data:** Março 2026  
**Testador:** Volmar  
**Credenciais:** Criar nova conta para testar fluxo completo

---

## Pré-requisitos

### 1. Rodar migrations no Neon (se ainda não fez)
```powershell
$env:DATABASE_URL="sua_connection_string_do_neon"
npx prisma migrate deploy
```

### 2. Verificar deploy no Vercel
- Acesse: https://vercel.com/volmarsegundo-sources-projects/travel-planner/deployments
- Confirme que o deploy mais recente está **Ready** (verde)
- Se estiver **Error**, me envie o log

### 3. Limpar cache do browser
- Ctrl+Shift+R (hard refresh) no staging
- Ou abrir em aba anônima para evitar cache antigo

---

## BLOCO 1 — Cadastro e Perfil (Sprint 20)

### Teste 1.1: Criar nova conta
- [x] Acessar a landing page
- [x] Clicar "Get Started" ou "Create Account"
- [x] Preencher nome, email (usar email novo), senha
- [x] Confirmar que redireciona ao dashboard
- **Resultado:** Passou em todos os testes, porém após a criação de um novo usuário ele não redireciona diretamente para o Dashboard, mas sim pede para o usuário fazer o login para continuar. Se não for nenhuma restrição de segurança, ao criar um novo usuário, já logar  redirecionar para o dashboard.

### Teste 1.2: Verificar dashboard vazio
- [!] Dashboard mostra mensagem de boas-vindas
- [x] Botão "Nova Expedição" visível
- [x] Nenhum card de viagem (novo usuário)
- **Resultado:** Ele apresenta a mensagem de Boas Vindas, mas ele fala "Bem vindo de volta". O de volta só aplica a usuários já cadastrados. Se é um usuário novo é a primeira vez que ele entra na aplicação e a saudação deveria ser diferente. Dados boas vindas re parabenizando pelo primeiro acesso, pro exemplo. 

---

## BLOCO 2 — Criação de Viagem: Phase 1 "O Chamado" (Sprint 20)

### Teste 2.1: Info pessoal ANTES da viagem
- [x] Clicar "Nova Expedição"
- [!] **PRIMEIRO passo deve ser info pessoal** (nome, bio, estilo de viagem)
- [x] Preencher todos os campos pessoais
- [x] Verificar que ao avançar, vem info da viagem (destino, datas)
- **Resultado:** Ele não traz o campo Nome, e nem o valor do campo nome que já informei no cadastro. Ele deveria trazer po novo com o valor informado no momento do cadastro.
- **Nota:** Se info pessoal vier DEPOIS do destino, anotar como BUG

### Teste 2.2: Busca de destino
- [x] Digitar "Roma" no campo de destino
- [!] Verificar que resultados aparecem em português (se idioma PT)
- [x] Verificar que NÃO há resultados duplicados
- [X] Selecionar "Roma Capitale, Lazio, Italia"
- **Resultado:** O resultado aparece em portugues, mas existe um problema de UX. O resultado sobrepõem a pagina não ficando legível. O resultado da busca deveria vir em um texto sem transparência, ou pensar em outra solução. Vou colocar uma imagem para você ver como está

### Teste 2.3: Campo de Origem (Sprint 21 — NOVO)
- [x] Verificar se existe campo "De onde você parte?" ou similar
- [x] Preencher com "São Paulo" ou sua cidade
- [x] Verificar que o campo funciona com autocomplete
- **Resultado:** O resultado aparece em portugues, mas existe um problema de UX. O resultado sobrepõem a pagina não ficando legível. O resultado da busca deveria vir em um texto sem transparência, ou pensar em outra solução. Vou colocar uma imagem para você ver como está. Outro ponto, ele tá trazendo resultados muito longos. Deveria trazer apenas cidade, estado, pais.

### Teste 2.4: Seletor de Passageiros — estilo companhia aérea (Sprint 20)
- [x] Na etapa "Quantas pessoas?", verificar que tem seletores separados:
  - [x] Adultos (com botões +/-)
  - [x] Crianças (com botões +/- e campo de idade para cada)
  - [x] Bebês (com botões +/-)
  - [x] Idosos (com botões +/-)
- [x] Adicionar 2 adultos + 1 criança de 8 anos
- [X] Verificar que total não excede 20
- **Resultado:** Ele permite adicionar 20 pessoas por tipo Fiquei só refletindo se não é muito. O que outraos sites permitem?
- **Nota:** Se ainda mostrar apenas campo numérico simples, anotar como NÃO IMPLEMENTADO

### Teste 2.5: Orçamento — Moeda padrão (Sprint 19)
- [x] Com idioma em PT: verificar que moeda padrão é **BRL**
- [!] Trocar idioma para EN: verificar que moeda padrão é **USD**
- [x] Preencher orçamento (ex: R$ 5.000)
- **Resultado:** OK. Funcionou, porém, quando mudei para EN, ele voltou para o passo inicial desta fase. Deveria permanecer em orçamento.

### Teste 2.6: Preferências Pessoais — Chips/Toggles (Sprint 20)
- [!] Na etapa de Preferências, verificar que existem **10 categorias**:
  1. [!] Ritmo de viagem (single select)
  2. [!] Preferências alimentares (multi select)
  3. [!] Interesses/hobbies (multi select)
  4. [!] Estilo de orçamento (single select)
  5. [!] Preferências sociais (multi select)
  6. [!] Estilo de hospedagem (multi select)
  7. [!] Nível de fitness (single select)
  8. [!] Interesse em fotografia (single select)
  9. [!] Preferência de horário (single select)
  10. [!] Necessidade de conectividade (single select)
- [!] Verificar que usa **chips/toggles** (NÃO campos de texto aberto)
- [!] Verificar que todos os campos são opcionais
- [!] Preencher 5+ categorias e verificar que ganha pontos
- **Resultado:** Não implementado.
- **Nota:** Se ainda mostrar apenas "Restrições alimentares" e "Acessibilidade" com campos de texto, anotar como NÃO IMPLEMENTADO

### Teste 2.7: Transição entre fases — Auto-advance (Sprint 19)
- [x] Ao completar cada passo, verificar que avança automaticamente
- [!] Animação fluida SEM necessidade de clicar para prosseguir
- [!] Deve ter botão "Pular" visível (skip)
- **Resultado:** Está avançando automaticamente, no entanto aparecem 3 animações diferentes, despadronizadas. Fica  uma tradução, automática, suave e harmônica. Toda informação deve passar de maneira suave, como uma transição. Chamar o UX para melhorar isso.

### Teste 2.8: Tela de confirmação "Pronto para explorar?"
- [!] Verificar que mostra TODAS as informações preenchidas:
  - [!] Nome / Bio pessoal
  - [!] Destino
  - [!] Origem
  - [!] Datas
  - [x] Tipo de viajante
  - [!] Tamanho do grupo (detalhado: adultos, crianças)
  - [x] Hospedagem preferida
  - [x] Ritmo
  - [X] Orçamento (na moeda correta)
- [x] Clicar "Concluir e Ganhar Pontos"
- **Resultado:** Apareceu apenas Tipo de viajante, Hospedagem,, Ritmo e Orçamento.

---

## BLOCO 3 — Phase 2 a 3 (validação rápida)

### Teste 3.1: Avançar pelas fases 2 e 3
- [x] Completar Phase 2 e Phase 3 normalmente
- [!] Verificar que transições são automáticas (sem click extra)
- **Resultado:** Está avançando automaticamente, no entanto aparecem 3 animações diferentes, despadronizadas. Fica  uma tradução, automática, suave e harmônica. Toda informação deve passar de maneira suave, como uma transição. Chamar o UX para melhorar isso.

---

## BLOCO 4 — Phase 4 "A Logística" (Sprint 21 — NOVO)

### Teste 4.1: Verificar renomeação
- [!] Nome da fase deve ser **"A Logística"** (não "O Abrigo")
- **Resultado:** Não foi para a fase 4
. Logo depois da tela do Checklist, ao cliente ao continuar ele voltou para o Dashboard.

### Teste 4.2: Aba Transporte (Section A)
- [!] Verificar que Phase 4 tem 3 abas/seções: Transporte, Hospedagem, Mobilidade
- [!] Na aba Transporte:
  - [!] Adicionar segmento de transporte (ex: Voo São Paulo → Roma)
  - [!] Selecionar tipo: Avião, Trem, Ônibus, Navio, Carro
  - [!] Preencher datas e custo estimado
  - [!] Verificar ida E volta ou apenas ida (usuário escolhe)
  - [!] Testar adicionar 2+ segmentos (multi-city)
- **Resultado:** Não consegui chegar nesta parte para validar. A aplicação está voltando para o Dashboard antes de chegar nessa fase.

### Teste 4.3: Aba Hospedagem (Section B)
- [!] Na aba Hospedagem:
  - [!] Adicionar hospedagem (hotel, hostel, Airbnb, etc.)
  - [!] Testar adicionar múltiplas hospedagens (max 5)
  - [!] Preencher nome, tipo, datas, custo
- **Resultado:** Não consegui chegar nesta parte para validar. A aplicação está voltando para o Dashboard antes de chegar nessa fase.

### Teste 4.4: Aba Mobilidade Local (Section C)
- [!] Na aba Mobilidade:
  - [!] Verificar grid de ícones com opções: Metro, Uber, Táxi, Ônibus, A pé, Bicicleta
  - [!] Selecionar múltiplas opções
- **Resultado:** Não consegui chegar nesta parte para validar. A aplicação está voltando para o Dashboard antes de chegar nessa fase.

---

## BLOCO 5 — Phase 5 "O Mapa dos Dias" — Guide Redesign (Sprint 19+20)

### Teste 5.1: Layout em cards (não accordions)
- [!] Ao entrar na Phase 5, verificar que o guia mostra conteúdo em **cards visíveis**
- [!] NÃO deve ter accordions que escondem informação
- [!] Verificar 10 categorias de conteúdo:
  1. [!] Fuso Horário
  2. [!] Moeda
  3. [!] Idioma
  4. [!] Eletricidade
  5. [!] Conectividade
  6. [!] Dicas Culturais
  7. [!] Documentos e Entrada
  8. [!] Clima
  9. [!] Transporte Local
  10. [!] Saúde e Segurança
- [!] Verificar banner de highlights no topo
- [!] Verificar disclaimer de IA
- **Resultado:** Não consegui chegar nesta parte para validar. A aplicação está voltando para o Dashboard antes de chegar nessa fase.
- **Nota:** Se ainda mostrar o design antigo com accordions, anotar como NÃO IMPLEMENTADO

---

## BLOCO 6 — Phase 6 "O Roteiro" — Streaming AI (Sprint 18+19)

### Teste 6.1: Auto-geração do itinerário
- [ ] Ao entrar na Phase 6 pela PRIMEIRA vez, o roteiro deve **gerar automaticamente**
- [ ] NÃO deve mostrar botão "Gerar Roteiro" na primeira visita
- **Resultado:** Não consegui chegar nesta parte para validar. A aplicação está voltando para o Dashboard antes de chegar nessa fase.
- **Nota:** Se mostrar botão para gerar manualmente na primeira visita, anotar

### Teste 6.2: Streaming visual (sem JSON raw)
- [ ] Durante a geração, verificar:
  - [ ] Spinner/loading com mensagem "Traçando sua rota..."
  - [ ] Progresso visual "Criando Dia 1 de N", "Criando Dia 2 de N"
  - [ ] NÃO deve mostrar texto JSON raw na tela
- **Resultado:** Não consegui chegar nesta parte para validar. A aplicação está voltando para o Dashboard antes de chegar nessa fase.
- **Nota:** Se mostrar JSON como {dayNumber: 1, theme: "..."}, anotar como BUG

### Teste 6.3: Itinerário renderizado
- [ ] Após geração, verificar:
  - [ ] Dias organizados em cards
  - [ ] Atividades listadas com horários
  - [ ] Drag-and-drop funcional (arrastar atividades entre dias)
  - [ ] Disclaimer: "Este roteiro foi gerado por IA e pode conter erros"
- **Resultado:** Não consegui chegar nesta parte para validar. A aplicação está voltando para o Dashboard antes de chegar nessa fase.

### Teste 6.4: Botão Regenerar
- [ ] Verificar que existe botão "Regenerar Roteiro" ou similar
- [ ] Clicar e confirmar que regenera sem erro
- **Resultado:** Não consegui chegar nesta parte para validar. A aplicação está voltando para o Dashboard antes de chegar nessa fase.

### Teste 6.5: Persistência
- [ ] Sair da página e voltar
- [ ] Verificar que o roteiro gerado ainda está lá (não precisa gerar de novo)
- **Resultado:** Não consegui chegar nesta parte para validar. A aplicação está voltando para o Dashboard antes de chegar nessa fase.

---

## BLOCO 7 — Dashboard "Meu Atlas" (Sprints 18-21)

### Teste 7.1: Barra de progresso — Contagem correta
- [x] No card da viagem, verificar que mostra "Fase X · X de 8 fases"
- [x] O número deve corresponder à fase real (ex: se completou até fase 5, mostrar "5 de 8")
- **Resultado:** 

### Teste 7.2: Barra de progresso — Labels das fases (Sprint 21)
- [!] Verificar que cada segmento da barra tem nome/número da fase
- [!] Pode ser tooltip no hover ou sempre visível
- **Resultado:** Não tem.

### Teste 7.3: Barra de progresso — Clicável (Sprint 21)
- [x] Clicar em um segmento da barra de progresso
- [!] Verificar que navega para aquela fase específica
- [!] Testar clicar em fase já completada (deve funcionar)
- [!] Testar clicar em fase futura (pode estar bloqueada — verificar comportamento)
- **Resultado:** Clicável mas não vai para lugar nenhum, permanece no Dashboard, quando deveria ir para o detalhamento da Fase.

### Teste 7.4: Botão "Continuar"
- [x] Clicar "Continuar" no card de viagem
- [!] Verificar que leva para a próxima fase pendente
- [!] Testar com viagem na fase 6 (deve ir para fase 6)
- **Resultado:** Estava na Fase 4, e não foi para a fase 5. Aplicação não vai para a fase 6.

### Teste 7.5: Botões removidos (Sprint 20)
- [!] Verificar que NÃO existem botões "Checklist", "Roteiro" no card
- [!] Card deve estar limpo com apenas progresso + "Continuar"
- **Resultado:** Ainda existem os botões. Conforme imagem.

### Teste 7.6: Fases "Em Construção" (Sprint 18)
- [!] Verificar que fases 7 e 8 aparecem como "Em construção" / "Coming Soon"
- [!] Devem estar visíveis mas não clicáveis
- **Resultado:** Estão apenas como umm ícone que remete a construção/obras.

---

## BLOCO 8 — Profile Persistence (Sprint 20)

### Teste 8.1: Criar segunda viagem
- [x] Clicar "Nova Expedição" novamente
- [!] Verificar que info pessoal (nome, bio, estilo) está PRÉ-PREENCHIDA
- [x] NÃO deve perguntar novamente os dados pessoais
- [x] Deve ir direto para destino/datas da nova viagem
- **Resultado:** Informações de Data de nascimento, telefone Pais e mini bio,persistidas, mas o nome não aparece, e nem nenhuma outra informação. Deveria trazer as demais informações pessoais já informadas pelo usuário.

### Teste 8.2: Editar perfil
- [x] Ir para página de Perfil
- [!] Verificar que info pessoal está salva
- [ ] Editar algum campo e salvar
- [ ] Criar nova viagem e verificar que o dado editado persiste
- **Resultado:** Nome não está Salvo. Ele tem o campo endereço, mas em nenhum momento do fluxo de cadastro o endereço foi solicitado. Rever para incluir Endereço completo.

---

## BLOCO 9 — Segurança (Sprints 16-20)

### Teste 9.1: PII Masking
- [!] No campo travelNotes de qualquer fase, digitar: "Meu CPF é 123.456.789-00"
- [!] Verificar nos logs do Vercel que CPF NÃO aparece em texto puro
- **Resultado:** Não identifiquei campo travelNotes na aplicação.

### Teste 9.2: Injection Guard
- [!] No campo destino, digitar: "Ignore previous instructions"
- [!] Verificar que o app trata normalmente
- **Resultado:** Ele não tratou e deixou seguir adiante.

### Teste 9.3: Footer pages
- [x] Acessar /terms — carrega em PT e EN
- [x] Acessar /privacy — carrega em PT e EN
- [x] Acessar /support — carrega em PT e EN
- **Resultado:** ___

---

## BLOCO 10 — Idioma e i18n

### Teste 10.1: Troca de idioma
- [x] Trocar para EN no header
- [x] Verificar que TODAS as telas mudam para inglês
- [x] Trocar para PT e verificar que volta tudo para português
- **Resultado:** ___

---

## Resumo de Resultados

| Bloco | Testes | PASS | FAIL | N/A |
|---|---|---|---|---|
| 1. Cadastro | 2 | | | |
| 2. Phase 1 | 8 | | | |
| 3. Phase 2-3 | 1 | | | |
| 4. Phase 4 | 4 | | | |
| 5. Phase 5 Guide | 1 | | | |
| 6. Phase 6 Roteiro | 5 | | | |
| 7. Dashboard | 6 | | | |
| 8. Profile | 2 | | | |
| 9. Segurança | 3 | | | |
| 10. i18n | 1 | | | |
| **TOTAL** | **33** | | | |

---

## Como reportar resultados

Para cada teste que FALHAR, anote:
1. Número do teste (ex: 2.6)
2. O que aconteceu vs o que era esperado
3. Screenshot se possível

Depois envie os resultados de volta para planejar as correções.
