# Sprint 5 — Estabilização & Validação do MVP

## Filosofia deste Sprint

Este sprint NÃO adiciona features novas. O objetivo é garantir que TUDO que foi
construído nos Sprints 1-4 funciona de verdade para um usuário real.

O problema identificado: 227 testes unitários passam, mas funcionalidades estão
incompletas ou quebradas quando testadas manualmente. Os testes validam o que foi
escrito, não o que deveria ter sido escrito.

Este sprint corrige isso com 4 ações:
1. Definir critérios de aceitação concretos para cada funcionalidade existente
2. Escrever testes E2E (Playwright) que simulam um usuário real
3. Corrigir tudo que falhar até que E2E + manual estejam verdes
4. Preparar ambiente completo para o usuário validar pessoalmente

Ao final deste sprint, o resultado não é "mais testes passando". É a CERTEZA
de que um usuário real consegue usar a aplicação do início ao fim.

---

## Pré-requisitos

Antes de QUALQUER código, o Claude Code deve:

1. Garantir Docker rodando (docker compose up -d)
2. Rodar npm run dev:setup (migrations, seed, test users)
3. Iniciar npm run dev
4. Abrir http://localhost:3000 e verificar que responde
5. Confirmar que o Playwright está instalado (npx playwright install)

---

## Parte 1: Critérios de Aceitação

Cada critério segue o formato:
**DADO** <contexto> **QUANDO** <ação> **ENTÃO** <resultado esperado>

Cada critério tem um ID único (AC-XXX) para rastreamento.

### 1.1 Landing Page

**AC-001**: DADO que estou no browser QUANDO acesso http://localhost:3000
ENTÃO sou redirecionado para /en (ou /pt baseado no locale do browser)
e vejo a landing page completa (header + hero + features + footer).

**AC-002**: DADO que estou na landing page QUANDO olho o header
ENTÃO vejo: logo "Travel Planner" à esquerda, language switcher (EN|PT),
botão "Login", botão "Sign Up" — todos visíveis e clicáveis.

**AC-003**: DADO que estou na landing page /en QUANDO clico em "Sign Up"
(ou "Get Started")
ENTÃO sou navegado para /en/register E a página de registro carrega
sem erros no console.

**AC-004**: DADO que estou na landing page /en QUANDO clico em "Login"
ENTÃO sou navegado para /en/login E a página de login carrega
sem erros no console.

**AC-005**: DADO que estou na landing page /en QUANDO clico no switcher
para "PT"
ENTÃO a URL muda para /pt E TODOS os textos visíveis mudam para português
(título, subtítulo, botões, features, footer).

**AC-006**: DADO que estou na landing page /pt QUANDO clico no switcher
para "EN"
ENTÃO a URL muda para /en E todos os textos voltam para inglês.

**AC-007**: DADO que estou na landing page em mobile (375px)
QUANDO visualizo a página
ENTÃO o layout é responsivo: header adaptado (menu hamburger ou compacto),
hero legível, features em coluna única, sem overflow horizontal.

**AC-008**: DADO que estou logado QUANDO acesso a landing page /en
ENTÃO sou redirecionado automaticamente para /en/dashboard.

### 1.2 Registro

**AC-101**: DADO que estou na página /en/register QUANDO visualizo
ENTÃO vejo um formulário com campos: nome, email, senha, confirmar senha
e botão de submit. Todos os campos têm labels visíveis.

**AC-102**: DADO que estou no formulário de registro QUANDO preencho
todos os campos com dados válidos (nome: "Test", email: "novo@test.com",
senha: "Senha@123", confirmar: "Senha@123") e clico em submit
ENTÃO a conta é criada E sou redirecionado para /en/dashboard
E vejo alguma indicação de que estou logado (meu nome ou email no header).

**AC-103**: DADO que estou no formulário de registro QUANDO submeto
com email já existente (testuser@travel.dev)
ENTÃO vejo mensagem de erro clara ("Email already registered" ou similar)
E continuo na página de registro (sem redirect, sem crash).

**AC-104**: DADO que estou no formulário de registro QUANDO submeto
com senhas que não coincidem
ENTÃO vejo mensagem de erro indicando que as senhas não coincidem
E o formulário NÃO é submetido.

**AC-105**: DADO que estou no formulário de registro QUANDO submeto
com campos obrigatórios vazios
ENTÃO vejo mensagens de validação nos campos obrigatórios
E o formulário NÃO é submetido ao servidor.

**AC-106**: DADO que estou na página /pt/register QUANDO visualizo
ENTÃO todos os textos (labels, botão, mensagens de erro) estão em português.

### 1.3 Login

**AC-201**: DADO que estou na página /en/login QUANDO visualizo
ENTÃO vejo formulário com campos: email, senha e botão de submit.
Campos têm labels visíveis.

**AC-202**: DADO que estou no formulário de login QUANDO digito
email: "testuser@travel.dev", senha: "Test@1234" e clico submit
ENTÃO sou redirecionado para /en/dashboard em menos de 5 segundos
E vejo conteúdo do dashboard (não uma página em branco ou erro).

**AC-203**: DADO que estou no formulário de login QUANDO digito
email correto mas senha errada e clico submit
ENTÃO vejo mensagem de erro ("Invalid credentials" ou similar)
E continuo na página de login. A senha que digitei NÃO fica visível.

**AC-204**: DADO que estou no formulário de login QUANDO submeto
com campos vazios
ENTÃO vejo mensagens de validação e o formulário NÃO é submetido.

**AC-205**: DADO que estou na página /pt/login QUANDO visualizo
ENTÃO todos os textos estão em português.

**AC-206**: DADO que estou na página de login QUANDO clico em algum
link para "registrar" / "criar conta" (se existir)
ENTÃO sou navegado para /en/register.

### 1.4 Dashboard (Rota Protegida)

**AC-301**: DADO que estou logado como testuser@travel.dev
QUANDO acesso /en/dashboard
ENTÃO vejo a página do dashboard com: header com indicação do usuário logado,
algum conteúdo principal (nem que seja "No trips yet"), opção de logout.

**AC-302**: DADO que NÃO estou logado QUANDO acesso /en/dashboard diretamente
ENTÃO sou redirecionado para /en/login (NÃO vejo o conteúdo do dashboard).

**AC-303**: DADO que estou logado como poweruser@travel.dev
QUANDO acesso /en/dashboard
ENTÃO vejo as viagens pré-carregadas (Rio de Janeiro, Tokyo, Portugal)
se a feature de listagem existe. Se não existe, pelo menos não vejo erro.

**AC-304**: DADO que estou logado QUANDO troco o idioma para PT
ENTÃO o dashboard muda para português e continuo logado.

### 1.5 Logout

**AC-401**: DADO que estou logado no dashboard QUANDO clico em logout
ENTÃO sou redirecionado para a landing page E não estou mais logado.

**AC-402**: DADO que acabei de fazer logout QUANDO acesso /en/dashboard
ENTÃO sou redirecionado para /en/login (sessão realmente encerrada).

**AC-403**: DADO que acabei de fazer logout QUANDO clico "voltar" no browser
ENTÃO NÃO vejo o dashboard. Vejo a landing page ou a página de login.

### 1.6 Navegação Geral

**AC-501**: DADO que estou em qualquer página QUANDO olho o console
do browser (F12 → Console)
ENTÃO NÃO vejo erros JavaScript (warnings são toleráveis, erros não).

**AC-502**: DADO que estou em qualquer página QUANDO olho a aba Network
(F12 → Network)
ENTÃO NÃO vejo requests com status 500 (Internal Server Error).

**AC-503**: DADO que acesso uma URL inválida como /en/pagina-inexistente
QUANDO a página carrega
ENTÃO vejo uma página 404 amigável (não um erro técnico ou página em branco).

---

## Parte 2: Testes End-to-End com Playwright

### 2.1 Configuração

Verificar/configurar playwright.config.ts para:
- Base URL: http://localhost:3000
- Browsers: chromium (mínimo), firefox e webkit se possível
- Timeout: 30 segundos por teste
- Screenshots on failure: habilitado
- Video on failure: habilitado (se possível)
- O servidor dev DEVE estar rodando antes dos testes

### 2.2 Estrutura dos testes E2E

Criar em: tests/e2e/ (ou e2e/ conforme configuração existente)

Cada arquivo de teste E2E mapeia diretamente para os critérios de aceitação:

```
tests/e2e/
  landing-page.spec.ts      → AC-001 a AC-008
  registration.spec.ts      → AC-101 a AC-106
  login.spec.ts             → AC-201 a AC-206
  dashboard.spec.ts         → AC-301 a AC-304
  logout.spec.ts            → AC-401 a AC-403
  navigation.spec.ts        → AC-501 a AC-503
  full-user-journey.spec.ts → Fluxo completo (ver abaixo)
```

### 2.3 Teste mais importante: Full User Journey

Este teste simula exatamente o que um usuário real faria na primeira vez:

```typescript
test('complete user journey from landing to logout', async ({ page }) => {
  // 1. Acessar landing page
  await page.goto('/');
  // Verificar que landing page carregou (header, hero visíveis)

  // 2. Clicar em "Get Started" ou "Sign Up"
  // Verificar que navegou para /en/register

  // 3. Preencher formulário de registro com dados novos
  // Submit e verificar redirect para /en/dashboard

  // 4. Verificar que dashboard carregou e mostra indicação do usuário

  // 5. Trocar idioma para PT
  // Verificar que textos mudaram

  // 6. Trocar idioma de volta para EN
  // Verificar que textos voltaram

  // 7. Fazer logout
  // Verificar redirect para landing page

  // 8. Tentar acessar /en/dashboard
  // Verificar redirect para /en/login

  // 9. Fazer login com as credenciais que acabou de criar
  // Verificar que volta ao dashboard

  // 10. Verificar que não há erros no console durante todo o fluxo
});
```

### 2.4 Regras para os testes E2E

- Cada teste deve ser INDEPENDENTE (não depender de outro teste)
- Usar dados de teste únicos por teste (timestamps no email: `test-{Date.now()}@test.com`)
- Capturar screenshot em caso de falha
- Cada teste deve limpar o que criou (ou usar dados descartáveis)
- Usar page.waitForURL() em vez de sleeps fixos para verificar navegação
- Verificar AUSÊNCIA de erros no console como parte de cada teste
- Tolerância: console warnings são OK, console errors NÃO

### 2.5 Helper para captura de erros de console

Criar um helper reutilizável:

```typescript
// tests/e2e/helpers/console-errors.ts
export function trackConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}
```

---

## Parte 3: Processo de Correção

### 3.1 Workflow

```
1. Escrever TODOS os testes E2E primeiro (sem corrigir nada)
2. Rodar: npx playwright test
3. Documentar quais falharam e por quê
4. Corrigir o código da aplicação (não os testes!)
5. Rodar novamente
6. Repetir 3-5 até TODOS os E2E passarem
7. Confirmar que os 227 testes unitários ainda passam
```

**IMPORTANTE**: Se um teste E2E falha, o CÓDIGO DA APLICAÇÃO é que deve ser
corrigido, NÃO o teste. Os testes representam o comportamento esperado.
Os testes só devem ser alterados se o critério de aceitação estiver errado.

### 3.2 Prioridade de correção

Se vários testes falharem, corrigir nesta ordem:
1. Rotas que retornam 500 (servidor quebrado)
2. Landing page não carrega (primeira impressão)
3. Registro não funciona (usuário não consegue entrar)
4. Login não funciona (usuário não consegue voltar)
5. Dashboard não carrega (conteúdo principal)
6. Logout não funciona (segurança)
7. i18n inconsistente (experiência)
8. Responsividade (mobile)

### 3.3 Para cada bug corrigido

Registrar em stabilization-report.md:
- ID do critério de aceitação (AC-XXX)
- O que estava errado
- O que foi corrigido
- Arquivos alterados

---

## Parte 4: Preparação do Ambiente para Teste Manual do Usuário

### 4.1 OBRIGATÓRIO — Executar ANTES de perguntar ao usuário

Este é um passo crítico do sprint. O Claude Code NÃO pode simplesmente dizer
"está pronto" — deve GARANTIR que o ambiente funciona executando cada verificação.

```
┌──────────────────────────────────────────────────────────────┐
│  CHECKLIST DE PREPARAÇÃO DO AMBIENTE (executar em ordem)     │
│                                                              │
│  1. DOCKER                                                   │
│     □ docker compose up -d                                   │
│     □ Verificar container postgres rodando e saudável        │
│     □ Verificar container redis rodando e saudável           │
│     □ Testar conexão PostgreSQL (porta 5432 responde)        │
│     □ Testar conexão Redis (porta 6379 responde)             │
│                                                              │
│  2. BANCO DE DADOS                                           │
│     □ npx prisma migrate deploy (aplicar migrations)         │
│     □ npx prisma generate (gerar client)                     │
│     □ npm run dev:setup OU criar usuários de teste:          │
│       - testuser@travel.dev / Test@1234                      │
│       - poweruser@travel.dev / Test@1234                     │
│       - newuser@travel.dev / Test@1234                       │
│       - admin@travel.dev / Admin@1234                        │
│     □ Verificar que os 4 usuários existem no banco           │
│     □ Verificar dados do power user (viagens pre-carregadas) │
│                                                              │
│  3. SERVIDOR                                                 │
│     □ npm run dev (iniciar servidor de desenvolvimento)      │
│     □ Aguardar "Ready" ou equivalente no terminal            │
│     □ Testar GET http://localhost:3000 → responde 200        │
│     □ Testar GET http://localhost:3000/en → landing page     │
│     □ Testar GET http://localhost:3000/pt → landing page PT  │
│     □ Testar GET http://localhost:3000/en/login → login page │
│     □ Testar GET http://localhost:3000/en/register → register│
│                                                              │
│  4. VERIFICAÇÃO E2E RÁPIDA                                   │
│     □ Rodar o teste Full User Journey sozinho para confirmar │
│       que o fluxo completo funciona:                         │
│       npx playwright test full-user-journey.spec.ts          │
│     □ Se falhar: NÃO dizer que está pronto. Corrigir antes.  │
│                                                              │
│  5. PRISMA STUDIO (opcional mas útil)                        │
│     □ npx prisma studio (abre em http://localhost:5555)      │
│     □ Permite ao usuário ver/editar dados diretamente        │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Critérios de "Ambiente Pronto"

O ambiente SÓ está pronto quando TODAS estas condições são verdadeiras:

- Docker: containers PostgreSQL e Redis rodando e respondendo
- Banco: migrations aplicadas, 4 usuários de teste existem com senhas corretas
- Servidor: npm run dev rodando, localhost:3000 responde
- Rotas: todas as rotas principais retornam HTTP 200 (não 404 ou 500)
- E2E: Full User Journey passa (landing → registro → dashboard → logout → login)
- Console: zero erros JavaScript ao carregar as páginas principais

Se QUALQUER condição falhar, o Claude Code deve corrigir antes de apresentar
ao usuário. O usuário NÃO é responsável por debugar infraestrutura.

### 4.3 Apresentação ao Usuário

Somente quando TODAS as verificações passarem, apresentar:

```
┌──────────────────────────────────────────────────────────────┐
│  ✅ Ambiente verificado e pronto para teste manual!          │
│                                                              │
│  ── Acesso ──────────────────────────────────────────────── │
│  🌐 App:           http://localhost:3000                     │
│  🌐 App (PT):      http://localhost:3000/pt                  │
│  📊 Prisma Studio: http://localhost:5555                     │
│                                                              │
│  ── Credenciais de Teste ────────────────────────────────── │
│  👤 Usuário padrão:  testuser@travel.dev   / Test@1234       │
│  👤 Com dados:       poweruser@travel.dev  / Test@1234       │
│  👤 Conta limpa:     newuser@travel.dev    / Test@1234       │
│  👤 Admin:           admin@travel.dev      / Admin@1234      │
│                                                              │
│  ── Verificações Realizadas ─────────────────────────────── │
│  ✅ Docker: PostgreSQL e Redis saudáveis                     │
│  ✅ Banco: 4 usuários + dados de teste confirmados           │
│  ✅ Servidor: localhost:3000 respondendo                     │
│  ✅ Rotas: todas retornando HTTP 200                         │
│  ✅ E2E Full Journey: passando                               │
│  ✅ Console: zero erros                                      │
│                                                              │
│  ── O que Testar (Critérios de Aceitação) ───────────────── │
│                                                              │
│  LANDING PAGE                                                │
│  AC-001: Acessar / → redireciona para /en com página completa│
│  AC-002: Header tem logo, Login, Sign Up, language switcher  │
│  AC-003: Clicar Sign Up → /en/register                      │
│  AC-004: Clicar Login → /en/login                            │
│  AC-005: Trocar para PT → textos mudam                       │
│  AC-006: Trocar para EN → textos voltam                      │
│  AC-007: Mobile (375px) → layout responsivo                  │
│  AC-008: Logado + acessar landing → redirect p/ dashboard    │
│                                                              │
│  REGISTRO                                                    │
│  AC-101: Formulário com nome, email, senha, confirmar senha  │
│  AC-102: Registro válido → redirect para dashboard           │
│  AC-103: Email duplicado → mensagem de erro                  │
│  AC-104: Senhas diferentes → mensagem de erro                │
│  AC-105: Campos vazios → validação                           │
│  AC-106: Registro em PT → textos em português                │
│                                                              │
│  LOGIN                                                       │
│  AC-201: Formulário com email, senha                         │
│  AC-202: testuser@travel.dev + Test@1234 → dashboard         │
│  AC-203: Senha errada → mensagem de erro                     │
│  AC-204: Campos vazios → validação                           │
│  AC-205: Login em PT → textos em português                   │
│  AC-206: Link para registro funciona                         │
│                                                              │
│  DASHBOARD                                                   │
│  AC-301: Logado → dashboard com indicação do usuário         │
│  AC-302: Não logado → redirect para login                    │
│  AC-303: poweruser → viagens pré-carregadas visíveis         │
│  AC-304: Trocar idioma → dashboard em PT, continua logado    │
│                                                              │
│  LOGOUT                                                      │
│  AC-401: Logout → redirect para landing page                 │
│  AC-402: Após logout → /dashboard redireciona p/ login       │
│  AC-403: Botão "voltar" após logout → não mostra dashboard   │
│                                                              │
│  GERAL                                                       │
│  AC-501: Console (F12) sem erros em todas as páginas         │
│  AC-502: Network (F12) sem requests 500                      │
│  AC-503: URL inválida → página 404 amigável                  │
│                                                              │
│  ── Dica ────────────────────────────────────────────────── │
│  Use F12 → Console aberto enquanto navega para detectar      │
│  erros JavaScript. Use F12 → Network para ver requests.      │
│  Teste em janela normal E em janela anônima.                 │
│  Teste no celular via http://<seu-ip-local>:3000             │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 Se o Usuário Reportar Problemas

Se após o teste manual o usuário relatar problemas, o Claude Code deve:

1. Pedir detalhes: qual AC falhou, o que aconteceu vs o que era esperado
2. Tentar reproduzir com Playwright
3. Corrigir o código da aplicação
4. Rodar E2E completo para confirmar que não quebrou mais nada
5. Re-verificar o ambiente (checklist 4.1)
6. Apresentar novamente ao usuário

Este ciclo repete até o usuário confirmar que está satisfeito.

---

## Parte 5: Critérios de Conclusão do Sprint

### Critérios obrigatórios (TODOS devem ser verdadeiros)

- [ ] TODOS os testes E2E passam (npx playwright test)
- [ ] TODOS os 227 testes unitários continuam passando (npm test)
- [ ] Full User Journey E2E passa em Chromium
- [ ] Zero erros de console durante o Full User Journey
- [ ] Zero requests com status 500 durante o Full User Journey
- [ ] stabilization-report.md gerado com todas as correções documentadas
- [ ] Critérios AC-001 a AC-503 todos verificados via E2E
- [ ] Ambiente preparado e verificado para teste manual do usuário (Parte 4)

### Critérios desejáveis (melhoria de qualidade)

- [ ] E2E passa em Firefox e WebKit também
- [ ] Screenshots de cada fluxo salvos como documentação
- [ ] Tempo de carregamento < 3s para cada página
- [ ] Layout correto em 375px (mobile), 768px (tablet), 1440px (desktop)

---

## Parte 6: Relatório de Estabilização

Ao finalizar, gerar stabilization-report.md com:

```markdown
# Stabilization Report — Sprint 5

## Resumo
- Total de critérios de aceitação: <N>
- Passaram de primeira: <N>
- Corrigidos neste sprint: <N>
- Bugs encontrados: <N>

## Bugs Encontrados e Corrigidos
| AC | Descrição | Root Cause | Fix | Arquivos |
|----|-----------|------------|-----|----------|
| AC-XXX | ... | ... | ... | ... |

## Testes E2E
| Arquivo | Testes | Status |
|---------|--------|--------|
| landing-page.spec.ts | <N> | ✅ |
| registration.spec.ts | <N> | ✅ |
| login.spec.ts | <N> | ✅ |
| dashboard.spec.ts | <N> | ✅ |
| logout.spec.ts | <N> | ✅ |
| navigation.spec.ts | <N> | ✅ |
| full-user-journey.spec.ts | 1 | ✅ |

## Métricas Finais
- Testes unitários: 227 + <novos>
- Testes E2E: <N>
- Cobertura dos critérios de aceitação: 100%
- Erros de console: 0
- Requests 500: 0

## Ambiente
- Docker: PostgreSQL ✅ Redis ✅
- Usuários de teste: 4 criados ✅
- Todas as rotas: HTTP 200 ✅
- Full User Journey: ✅
```

---

## Parte 7: Mudança de Processo para Sprints Futuros

A partir deste sprint, o novo processo é:

```
ANTES (Sprints 1-4):
  Especificar features → Implementar → Testes unitários → "Pronto"

AGORA (Sprint 5+):
  1. Definir critérios de aceitação (AC-XXX) para cada feature
  2. Escrever testes E2E para cada critério ANTES de implementar
  3. Implementar até os E2E passarem
  4. Depois escrever testes unitários
  5. Sprint review (security + i18n + E2E)
  6. Preparar ambiente completo (Parte 4 deste documento)
  7. Perguntar ao usuário se quer testar manualmente
  8. Se sim: apresentar ambiente verificado + checklist de ACs
  9. Se usuário reportar problemas: corrigir, reverificar, reapresentar

"Pronto" = um usuário real consegue completar o fluxo, não testes passando.
```

---

## Ordem de Execução

1. Garantir ambiente funcional (Docker + dev:setup + dev server)
2. Instalar/configurar Playwright se necessário
3. Criar helper de captura de erros de console
4. Escrever TODOS os testes E2E (sem corrigir nada ainda)
5. Rodar E2E e documentar falhas
6. Corrigir cada falha seguindo a prioridade (3.2)
7. Rodar E2E novamente até TODOS passarem
8. Confirmar 227 testes unitários verdes
9. Gerar stabilization-report.md
10. Executar checklist completo de preparação do ambiente (Parte 4.1)
11. Verificar TODOS os critérios de "Ambiente Pronto" (Parte 4.2)
12. Commit e push para feat/sprint-5
13. **PERGUNTAR: "Quer testar a aplicação manualmente?"**
14. Se SIM: apresentar painel completo da Parte 4.3
15. Se usuário reportar problemas: ciclo da Parte 4.4
