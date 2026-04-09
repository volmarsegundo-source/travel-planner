# Atlas V2 — Plano de Testes Manuais (Pré-Sprint 41)

> **Staging:** travel-planner-eight-navy.vercel.app
> **Login:** test@test.com / Test1234!
> **Objetivo:** Testar cada tela V2, anotar ajustes, alimentar backlog do Sprint 41

---

## Como usar este plano

Teste uma tela por vez. Para cada tela, siga o checklist abaixo.
Anote os problemas em 3 categorias:

- 🔴 **Blocker** — Impede o uso (botão não funciona, tela quebrada)
- 🟡 **Ajuste** — Funciona mas precisa melhorar (espaçamento, cor, texto)
- 🟢 **Sugestão** — Opcional, seria bom ter (animação, detalhe visual)

---

## TELA 1 — Landing Page (visitante, não logado)

**URL:** `https://travel-planner-eight-navy.vercel.app`
**Abrir em aba anônima** (para garantir que não está logado)

### 1.1 Nav (barra superior)
- [ ] Logo "Travel Planner" visível e alinhado à esquerda?
- [ ] Seletor de idioma (EN/PT) funciona?
- [ ] Botão "Entrar" visível?
- [ ] Botão "Criar Conta" visível e com destaque (cor diferente)?
- [ ] Nav fica fixa (sticky) ao rolar a página?
- [ ] No mobile (375px): nav colapsa para menu hamburger?

### 1.2 Hero Section
- [ ] Heading grande e legível? Texto faz sentido?
- [ ] Subtítulo abaixo do heading claro?
- [ ] Botão CTA primário ("Comece Agora" ou similar) — cor laranja com texto navy?
- [ ] Botão secundário visível?
- [ ] Background visual (gradient, pattern ou imagem) está ok?
- [ ] No mobile: texto não fica cortado? Botões empilham?

### 1.3 Seção Fases (8 Fases)
- [ ] 8 cards de fase visíveis?
- [ ] Fases 1-6 com visual normal?
- [ ] Fases 7-8 com badge "Em Breve" e visual desabilitado (opacidade)?
- [ ] Fases 7-8 NÃO são clicáveis?
- [ ] Cards alinhados e com espaçamento uniforme?
- [ ] No mobile: cards empilham em coluna?

### 1.4 Seção AI
- [ ] Heading e descrição legíveis?
- [ ] Visual ilustrando a funcionalidade AI?
- [ ] Alinhamento e espaçamento ok?

### 1.5 Seção Gamificação
- [ ] Badges/níveis visíveis?
- [ ] Pontos Atlas explicados?
- [ ] Visual coerente com o design system?

### 1.6 Seção Destinos
- [ ] Cards de destinos visíveis?
- [ ] Imagens carregando? (ou placeholders aceitáveis?)
- [ ] Layout assimétrico ou grid — visual interessante?

### 1.7 Footer
- [ ] 3 colunas de links visíveis?
- [ ] Links LGPD presentes (Privacidade, Termos)?
- [ ] Links funcionam (não apontam para #)?
- [ ] Logo Atlas no footer?
- [ ] Background navy escuro?
- [ ] No mobile: colunas empilham?

### 1.8 Geral da Landing
- [ ] Scroll suave entre seções?
- [ ] Fontes consistentes (Plus Jakarta Sans para headings, Work Sans para body)?
- [ ] Cores consistentes (navy, laranja, teal)?
- [ ] Sem flash ou piscada ao carregar?
- [ ] Tempo de carregamento aceitável (< 3 segundos)?

**Notas da Landing Page:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## TELA 2 — Login Page

**URL:** `https://travel-planner-eight-navy.vercel.app/login` (ou clicar "Entrar" na Landing)

### 2.1 Layout Split-Screen
- [ ] Painel esquerdo (brand, navy) ocupa ~60%?
- [ ] Painel direito (form, branco) ocupa ~40%?
- [ ] Logo Atlas visível no painel esquerdo?
- [ ] Tagline visível abaixo do logo?
- [ ] No tablet (768px): painel esquerdo ainda visível?
- [ ] No mobile (< 1024px): painel esquerdo desaparece? Só form visível?

### 2.2 Formulário de Login
- [ ] Campo e-mail com label e ícone?
- [ ] Campo senha com label, ícone e toggle mostrar/ocultar?
- [ ] Placeholder visível nos campos?
- [ ] Focus ring aparece ao clicar no campo? (teal border + amber ring)
- [ ] Botão "Entrar" — laranja com texto navy, largura total?
- [ ] Link "Esqueceu a senha?" visível?
- [ ] Link "Criar conta" visível?
- [ ] Links LGPD no rodapé do form?

### 2.3 Funcional
- [ ] Login com test@test.com / Test1234! funciona?
- [ ] Após login, redireciona para Dashboard?
- [ ] Login com senha errada mostra erro visual?
- [ ] Campo vazio mostra validação?

**Notas do Login:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## TELA 3 — Dashboard "Meu Atlas"

**Pré-requisito:** Estar logado

### 3.1 Nav Autenticada
- [ ] Logo visível?
- [ ] PA counter (Pontos Atlas) visível no header?
- [ ] Avatar/iniciais do usuário visível?
- [ ] Seletor de idioma funciona?
- [ ] Menu do usuário abre ao clicar no avatar?
- [ ] Opção de logout visível?

### 3.2 Conteúdo do Dashboard
- [ ] Heading "Meu Atlas" ou "Minhas Expedições" visível?
- [ ] Botão "Nova Expedição" ou "Criar Expedição" visível e funcional?
- [ ] Lista de expedições existentes renderiza?
- [ ] Cards de expedição mostram: nome, destino, datas, status?
- [ ] Cards são clicáveis e levam para a expedição?
- [ ] Se não tem expedição: empty state aparece? (mensagem + CTA)

### 3.3 Geral
- [ ] Layout responsivo no mobile?
- [ ] Cores e fontes consistentes com Landing?
- [ ] Carregamento rápido?

**Notas do Dashboard:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## TELA 4 — Fase 1: "A Inspiração"

**Pré-requisito:** Criar nova expedição ou abrir existente

### 4.1 PhaseLayout (wrapper — aparece em TODAS as fases)
- [ ] Progress bar das 8 fases visível no topo?
- [ ] Fase 1 marcada como ativa (laranja)?
- [ ] Fases 7-8 com cadeado e "Em Breve"?
- [ ] Breadcrumb visível (Minhas Expedições > [Nome] > A Inspiração)?
- [ ] PA counter no header?

### 4.2 Formulário da Fase 1
- [ ] Heading "A Inspiração" ou equivalente visível?
- [ ] Campo Origem — autocomplete funciona ao digitar cidade?
- [ ] Campo Destino — autocomplete funciona?
- [ ] Campos de data (ida e volta) — calendário abre?
- [ ] Cálculo de duração aparece entre as datas?
- [ ] Seletor de viajantes (adultos, crianças, bebês) funciona?
- [ ] Botões +/- do stepper são clicáveis (≥ 44px)?
- [ ] Chips de estilo de viagem visíveis? Seleção funciona?
- [ ] Chips mudam visual quando selecionados (outline → filled)?

### 4.3 Navegação
- [ ] Botão "Avançar" visível e funcional?
- [ ] Botão "Salvar rascunho" visível?
- [ ] Avançar leva para Fase 2?

**Notas da Fase 1:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## TELA 5 — Fase 2: "O Perfil"

### 5.1 Conteúdo
- [ ] Heading de preferências visível?
- [ ] Chips de estilo de viagem (Praia, Cultura, etc.)?
- [ ] Cards de orçamento (Econômico, Moderado, Premium)?
- [ ] Chips de hospedagem?
- [ ] Toggle de ritmo (Tranquilo/Intenso)?
- [ ] Restrições alimentares (opcional)?

### 5.2 Interação
- [ ] Chips selecionáveis — visual muda ao clicar?
- [ ] Cards de orçamento — seleção única funciona?
- [ ] Toggle funciona corretamente?
- [ ] Todos touch targets ≥ 44px?

### 5.3 Navegação
- [ ] "← Voltar" retorna para Fase 1?
- [ ] "Avançar →" leva para Fase 3?
- [ ] Dados salvam ao avançar?

**Notas da Fase 2:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## TELA 6 — Fase 3: "O Preparo"

### 6.1 Conteúdo
- [ ] Heading de checklist visível?
- [ ] Checklist AI-generated aparece?
- [ ] Itens do checklist são interativos (marcar/desmarcar)?
- [ ] Badge "Gerado por IA" visível?
- [ ] Custo em PA mostrado?

### 6.2 Interação
- [ ] Checkbox funciona ao clicar?
- [ ] Progresso atualiza ao marcar itens?
- [ ] Botão de regenerar checklist visível? Mostra custo PA?

### 6.3 Navegação
- [ ] "← Voltar" retorna para Fase 2?
- [ ] "Avançar →" leva para Fase 4?

**Notas da Fase 3:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## TELA 7 — Fase 4: "A Logística"

### 7.1 Wizard Interno
- [ ] 3 steps visíveis (Transporte, Hospedagem, Seguro)?
- [ ] Step ativo destacado?
- [ ] Navegação entre steps funciona?

### 7.2 Conteúdo (Step 1 — Transporte)
- [ ] Cards de transporte principal (Avião, Ônibus, etc.)?
- [ ] Chips de transporte local?
- [ ] Card de estimativa AI visível?
- [ ] Disclaimer "estimativa gerada por IA" presente?

### 7.3 Navegação
- [ ] "← Voltar" e "Próximo Passo →" funcionam entre steps?
- [ ] Navegação entre fases funciona (Fase 3 ← → Fase 5)?

**Notas da Fase 4:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## TELA 8 — Fase 5: "Guia do Destino"

### 8.1 Conteúdo
- [ ] Heading com nome do destino?
- [ ] Badge "Gerado por IA"?
- [ ] Card "Sobre o Destino" com descrição?
- [ ] Card "Informações Rápidas" (clima, moeda, idioma, fuso, tomada)?
- [ ] Card "Dicas de Segurança"?
- [ ] Card "Custos Médios"?
- [ ] Seção "O que não perder" com atrações?

### 8.2 Layout
- [ ] Bento grid — cards de tamanhos diferentes?
- [ ] Visual informativo e escaneável?
- [ ] Responsivo no mobile?

### 8.3 Navegação
- [ ] "← Voltar" retorna para Fase 4?
- [ ] "Avançar →" leva para Fase 6?

**Notas da Fase 5:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## TELA 9 — Fase 6: "Roteiro"

### 9.1 Layout Split (Desktop)
- [ ] Coluna esquerda (60%) — timeline do itinerário?
- [ ] Coluna direita (40%) — mapa interativo?
- [ ] No mobile: mapa abaixo do itinerário?

### 9.2 Itinerário
- [ ] Heading com destino e resumo da viagem?
- [ ] Seletor de dias (Dia 1, Dia 2, etc.) funciona?
- [ ] Timeline vertical com atividades do dia?
- [ ] Cada atividade mostra: hora, nome, descrição, duração, custo?
- [ ] Category chips nas atividades (Cultura, Gastronomia, etc.)?
- [ ] Resumo do dia (total atividades, tempo, custo)?
- [ ] Botão "Regenerar Roteiro" visível? Mostra custo PA?

### 9.3 Mapa
- [ ] Mapa Leaflet renderiza?
- [ ] Pins nos locais das atividades?
- [ ] Rota entre pins visível?
- [ ] Zoom funciona?

### 9.4 Navegação
- [ ] "← Voltar" retorna para Fase 5?
- [ ] "Ver Sumário →" leva para Sumário?

**Notas da Fase 6:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## TELA 10 — Sumário da Expedição

### 10.1 Header
- [ ] Nome da expedição visível?
- [ ] Detalhes (origem → destino, datas, viajantes)?
- [ ] Status badge (Planejamento Completo ou em andamento)?
- [ ] Botões de ação (Exportar PDF, Compartilhar, Editar)?

### 10.2 Cards de Resumo
- [ ] Card Orçamento Total — valor, breakdown, chart?
- [ ] Card Roteiro — dias, atividades, link para roteiro?
- [ ] Card Checklist — progresso, barra?
- [ ] Card Fases — progress bar das 8 fases?
- [ ] Card Gamificação — nível, PA, badges?

### 10.3 Geral
- [ ] Layout dashboard-like com cards de tamanhos variados?
- [ ] Dados refletem o que foi preenchido nas fases?
- [ ] Responsivo no mobile?

**Notas do Sumário:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## TELA 11 — Testes Transversais

### 11.1 Logout
- [ ] Botão de logout funciona?
- [ ] Após logout, redireciona para Landing?
- [ ] Botão voltar do browser NÃO mostra telas autenticadas?

### 11.2 Responsivo Geral
- [ ] Testar 375px (mobile) — nenhuma tela quebra?
- [ ] Testar 768px (tablet) — layout adapta?
- [ ] Testar 1440px (desktop) — layout completo?

### 11.3 Performance Percebida
- [ ] Telas carregam em < 3 segundos?
- [ ] Alguma tela trava ou fica lenta?
- [ ] Transições entre fases são suaves?

### 11.4 Consistência Visual
- [ ] Mesmas fontes em todas as telas?
- [ ] Mesmas cores em todas as telas?
- [ ] Botões "Avançar" sempre no mesmo estilo?
- [ ] Progress bar das fases consistente em todas as fases?

**Notas Transversais:**
```
🔴 Blockers:


🟡 Ajustes:


🟢 Sugestões:


```

---

## Resumo dos Testes

Após testar todas as telas, preencha:

| Tela | 🔴 Blockers | 🟡 Ajustes | 🟢 Sugestões |
|---|---|---|---|
| Landing Page | | | |
| Login | | | |
| Dashboard | | | |
| Fase 1 | | | |
| Fase 2 | | | |
| Fase 3 | | | |
| Fase 4 | | | |
| Fase 5 | | | |
| Fase 6 | | | |
| Sumário | | | |
| Transversais | | | |
| **TOTAL** | | | |
