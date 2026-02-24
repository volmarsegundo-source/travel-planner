# 📋 Backlog e Tarefas

## Como usar este arquivo
- O **Product Owner** define e prioriza as user stories
- O **Tech Lead** quebra as stories em tarefas técnicas e atribui aos devs
- Os **Devs** marcam `[x]` quando concluem e informam o tech-lead
- Mantenha este arquivo sempre atualizado — é a fonte da verdade do que está sendo feito

---

## 🔴 Em andamento

### [STORY-001] Exemplo: Autenticação de usuário
**Como** usuário não autenticado,
**quero** fazer login com email e senha,
**para que** eu possa acessar minha conta.

**Critérios de aceite:**
- [ ] Dado email e senha válidos, quando submeto o form, então recebo um token JWT
- [ ] Dado credenciais inválidas, quando submeto, então vejo mensagem de erro clara
- [ ] Dado token expirado, quando acesso rota protegida, então sou redirecionado ao login

**Tarefas técnicas:**
- [ ] `dev-fullstack-1` — Criar endpoint `POST /auth/login` com validação
- [ ] `dev-fullstack-1` — Implementar geração e validação de JWT
- [ ] `dev-fullstack-2` — Criar componente `<LoginForm />` com validação client-side
- [ ] `dev-fullstack-2` — Implementar redirect após login bem-sucedido
- [ ] `dev-fullstack-1` — Escrever testes de integração para o endpoint
- [ ] `dev-fullstack-2` — Escrever testes do componente LoginForm

---

## 🟡 Próximas (refinadas, prontas para desenvolvimento)

<!-- User stories prontas para serem puxadas pelo time -->

---

## ⚪ Backlog (a refinar)

<!-- Ideias e features que ainda precisam ser detalhadas pelo PO -->

---

## ✅ Concluídas

<!-- Mover tasks concluídas aqui para histórico -->
