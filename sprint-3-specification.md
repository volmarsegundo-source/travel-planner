# Sprint 3 — Dev Environment & User Experience

## Objetivo

Tornar o Travel Planner uma aplicação completa e testável por qualquer pessoa.
Ao final deste sprint, um usuário real deve conseguir:

1. Acessar a landing page
2. Navegar para registro ou login SEM digitar URLs manualmente
3. Criar uma conta
4. Fazer login
5. Acessar o dashboard
6. Criar e gerenciar viagens
7. Trocar o idioma (EN ↔ PT)
8. Fazer logout

Além disso, o ambiente de desenvolvimento deve ser configurável com UM ÚNICO COMANDO.

---

## Parte 1: Script de Setup do Ambiente de Desenvolvimento

### 1.1 Criar o arquivo `scripts/dev-setup.js`

Criar um script Node.js executável que automatiza a preparação do ambiente de desenvolvimento.

**Funcionalidades obrigatórias:**

- Verificar se Docker está rodando e containers estão saudáveis (PostgreSQL e Redis)
- Se containers não estiverem rodando, executar `docker compose up -d` automaticamente
- Verificar conexão com PostgreSQL na porta 5432 e Redis na porta 6379
- Executar `npx prisma migrate deploy` para aplicar migrations pendentes
- Executar `npx prisma generate` para gerar o Prisma Client
- Criar 4 usuários de teste no banco (se não existirem):

| Nome        | Email                    | Senha      | Propósito                         |
|-------------|--------------------------|------------|-----------------------------------|
| Test User   | testuser@travel.dev      | Test@1234  | Fluxo padrão de usuário           |
| Power User  | poweruser@travel.dev     | Test@1234  | Usuário com viagens pré-carregadas|
| New User    | newuser@travel.dev       | Test@1234  | Conta limpa sem dados             |
| Admin User  | admin@travel.dev         | Admin@1234 | Funcionalidades administrativas   |

- As senhas devem ser hasheadas com bcrypt (salt rounds: 12)
- Criar 3 viagens de exemplo associadas ao Power User (se o modelo existir):
  - "Weekend in Rio de Janeiro" (3 dias, 8 atividades)
  - "Tokyo Adventure" (5 dias, 8 atividades)
  - "Portugal Road Trip" (7 dias, 8 atividades)
- Cada viagem deve ter atividades com título, dia, ordem e duração
- Escanear `src/app/` para descobrir e listar todas as rotas disponíveis
- Se o servidor estiver rodando (porta 3000), testar cada rota e reportar status HTTP
- Exibir painel final com credenciais e URLs de acesso

**Modos de execução (via argumentos CLI):**

```
node scripts/dev-setup.js              # Setup completo
node scripts/dev-setup.js --check      # Apenas verificação de saúde (não modifica nada)
node scripts/dev-setup.js --reset      # Remove volumes Docker, recria tudo do zero
node scripts/dev-setup.js --users-only # Apenas cria/verifica usuários de teste
```

**Tratamento de erros:**
- Se Docker não estiver rodando → mensagem clara pedindo para abrir Docker Desktop
- Se bcryptjs não estiver instalado → instalar automaticamente como devDependency
- Se modelo User tiver schema diferente → log informativo com instrução para ajustar
- Se modelo de Trip/Itinerary não existir → pular criação de viagens sem erro

### 1.2 Registrar novos scripts no `package.json`

Adicionar na seção `"scripts"` do `package.json`:

```json
"dev:setup": "node scripts/dev-setup.js",
"dev:check": "node scripts/dev-setup.js --check",
"dev:reset": "node scripts/dev-setup.js --reset",
"dev:users": "node scripts/dev-setup.js --users-only"
```

---

## Parte 2: Landing Page com Navegação Completa

### 2.1 Requisitos da Landing Page

A landing page atual exibe apenas "Travel Planner — Plan your perfect trip" sem nenhum
elemento de navegação. Isso impede qualquer teste manual da aplicação.

**A landing page DEVE ser reformulada** para servir como ponto de entrada real da aplicação.

### 2.2 Estrutura Visual Obrigatória

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                         │
│  🌍 Travel Planner              [EN | PT]    [Login] [Sign Up]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HERO SECTION                                                   │
│                                                                 │
│              Plan Your Perfect Trip                              │
│     AI-powered travel planning made simple                      │
│                                                                 │
│              [ Get Started — It's Free ]                        │
│                                                                 │
│        Already have an account? Log in →                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FEATURES SECTION                                               │
│                                                                 │
│  🤖 AI-Powered Planning    🔄 Drag & Drop      🌍 Multi-language│
│  Smart suggestions for     Reorder activities   Plan in English │
│  your perfect itinerary    with ease            or Portuguese   │
│                                                                 │
│  📱 Responsive Design                                           │
│  Plan your trips from                                           │
│  any device                                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  FOOTER                                                         │
│  Travel Planner © 2026    Login | Sign Up | [EN | PT]           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Especificações dos Componentes

**Header (componente reutilizável):**
- Logo/nome "Travel Planner" à esquerda, link para `/` (landing page)
- Language switcher (EN | PT) — usar o sistema i18n já existente
- Botão "Login" → navega para `/[locale]/login`
- Botão "Sign Up" (estilo primário, destaque) → navega para `/[locale]/register`
- Header deve ser sticky (fixo no topo ao rolar)
- Responsivo: em mobile, usar menu hamburger

**Hero Section:**
- Título principal: traduzido via i18n
- Subtítulo: traduzido via i18n
- CTA primário "Get Started" → navega para `/[locale]/register`
- Link secundário "Already have an account? Log in" → `/[locale]/login`
- Background visualmente atraente (gradiente ou imagem de viagem)

**Features Section:**
- 4 cards de features em grid (2x2 em desktop, 1 coluna em mobile)
- Cada card: ícone + título + descrição curta
- Features: AI Planning, Drag & Drop, Multi-language, Responsive
- Todo o texto traduzido via i18n

**Footer:**
- Copyright
- Links para Login e Sign Up
- Language switcher alternativo

### 2.4 Internacionalização

Todas as strings da landing page devem estar nos arquivos de tradução existentes.
Adicionar as chaves necessárias para EN e PT:

```json
// EN
{
  "landing": {
    "hero": {
      "title": "Plan Your Perfect Trip",
      "subtitle": "AI-powered travel planning made simple",
      "cta": "Get Started — It's Free",
      "login_prompt": "Already have an account?",
      "login_link": "Log in"
    },
    "features": {
      "ai": { "title": "AI-Powered Planning", "description": "Smart suggestions for your perfect itinerary" },
      "dnd": { "title": "Drag & Drop", "description": "Reorder activities with ease" },
      "i18n": { "title": "Multi-language", "description": "Plan in English or Portuguese" },
      "responsive": { "title": "Responsive Design", "description": "Plan your trips from any device" }
    },
    "footer": {
      "copyright": "© 2026 Travel Planner. All rights reserved."
    }
  }
}

// PT
{
  "landing": {
    "hero": {
      "title": "Planeje Sua Viagem Perfeita",
      "subtitle": "Planejamento de viagens com inteligência artificial",
      "cta": "Comece Agora — É Grátis",
      "login_prompt": "Já tem uma conta?",
      "login_link": "Entrar"
    },
    "features": {
      "ai": { "title": "Planejamento com IA", "description": "Sugestões inteligentes para seu roteiro perfeito" },
      "dnd": { "title": "Arrastar e Soltar", "description": "Reorganize atividades facilmente" },
      "i18n": { "title": "Multi-idioma", "description": "Planeje em Inglês ou Português" },
      "responsive": { "title": "Design Responsivo", "description": "Planeje suas viagens de qualquer dispositivo" }
    },
    "footer": {
      "copyright": "© 2026 Travel Planner. Todos os direitos reservados."
    }
  }
}
```

### 2.5 Comportamento de Navegação

- Usuário NÃO autenticado na landing page → vê header com Login/Sign Up
- Usuário autenticado na landing page → redireciona automaticamente para `/[locale]/dashboard`
- Após login bem-sucedido → redireciona para `/[locale]/dashboard`
- Após registro bem-sucedido → redireciona para `/[locale]/dashboard`
- Após logout → redireciona para landing page `/[locale]`
- Acesso a `/[locale]/dashboard` sem autenticação → redireciona para `/[locale]/login`

---

## Parte 3: Skill do Claude Code para Dev Environment

### 3.1 Criar a pasta e arquivo da skill

Criar o arquivo `.claude/skills/dev-environment/SKILL.md` com a documentação completa
da skill para que futuras sessões do Claude Code saibam como preparar e verificar
o ambiente de desenvolvimento.

O SKILL.md deve conter:
- Descrição e triggers (quando usar a skill)
- Arquitetura do ambiente (Docker + Next.js + Prisma)
- Checklist de pré-voo (verificações antes de testar)
- Tabela de usuários de teste com credenciais
- 4 fluxos de teste manual detalhados (New User, Returning User, i18n, Edge Cases)
- Guia de troubleshooting para problemas comuns
- Comandos de reset do ambiente
- Checklist de verificação pós-sprint

---

## Parte 4: Testes Automatizados

### 4.1 Testes para a nova Landing Page

Criar testes unitários para os novos componentes:

- **Header component:** renderiza logo, login, sign up, language switcher
- **Hero section:** renderiza título, subtítulo, CTA com links corretos
- **Features section:** renderiza 4 cards de features
- **Footer:** renderiza copyright e links
- **Navegação:** CTA "Get Started" aponta para `/[locale]/register`
- **Navegação:** "Log in" aponta para `/[locale]/login`
- **i18n:** textos mudam ao trocar de EN para PT
- **Responsividade:** componentes se adaptam a viewports diferentes
- **Redirect:** usuário autenticado na landing → redireciona para dashboard
- **Redirect:** acesso ao dashboard sem auth → redireciona para login

### 4.2 Testes para o script dev-setup.js

Criar testes para o script de setup:

- **Docker check:** detecta quando Docker não está rodando
- **Port check:** verifica portas 5432 e 6379
- **User creation:** cria usuários com senhas hasheadas
- **Idempotência:** executar duas vezes não duplica usuários
- **Modo --check:** não modifica dados
- **Modo --reset:** limpa e recria ambiente
- **Route discovery:** encontra rotas no diretório src/app

### 4.3 Manter testes existentes

Todos os 140 testes existentes dos Sprints 1 e 2 DEVEM continuar passando.
Nenhum teste existente pode ser removido ou desabilitado.

---

## Parte 5: Qualidade e Revisão

### 5.1 Critérios de Aceitação

Antes de considerar o Sprint 3 completo, TODOS os critérios abaixo devem ser atendidos:

- [ ] `npm test` → Todos os testes passam (140 existentes + novos)
- [ ] `npm run dev:setup` → Executa sem erros e cria usuários/dados
- [ ] `npm run dev` → Servidor inicia sem erros
- [ ] Landing page carrega com header, hero, features e footer
- [ ] "Get Started" navega para registro
- [ ] "Login" navega para login
- [ ] Language switcher funciona (EN ↔ PT)
- [ ] Registro de novo usuário funciona end-to-end
- [ ] Login com usuário de teste funciona
- [ ] Dashboard carrega após login
- [ ] Logout funciona e redireciona para landing page
- [ ] Acesso ao dashboard sem auth redireciona para login
- [ ] Sem erros no console do navegador
- [ ] Layout responsivo (testar 375px, 768px, 1440px)

### 5.2 Git

- Branch: `feat/sprint-3`
- Commits: semânticos (feat:, fix:, test:, chore:)
- Push para GitHub ao finalizar

### 5.3 Arquivo de revisão

Ao finalizar, gerar o arquivo `review-sprint-3.md` na raiz do projeto com:
- Resumo do que foi implementado
- Lista de todos os testes (existentes + novos) e status
- Issues encontradas e resolvidas
- Próximos passos sugeridos para Sprint 4

---

## Ordem de Implementação Sugerida

1. Criar `scripts/dev-setup.js` e registrar no `package.json`
2. Testar o script com `npm run dev:setup`
3. Implementar componentes da landing page (Header, Hero, Features, Footer)
4. Adicionar strings i18n (EN e PT)
5. Implementar lógica de navegação e redirects
6. Criar `.claude/skills/dev-environment/SKILL.md`
7. Escrever testes para landing page
8. Escrever testes para dev-setup.js
9. Rodar todos os testes (`npm test`)
10. Executar sprint review
11. Commit e push para `feat/sprint-3`
