# Prompt para o Claude Code — Sprint 3

## Como usar

1. Abra o terminal em `C:\travel-planner`
2. Digite `claude` para iniciar o Claude Code
3. Cole o texto abaixo (tudo entre as linhas de ===)

===================================================================

Leia o arquivo sprint-3-specification.md na raiz do projeto e execute o Sprint 3 completo.

CONTEXTO:
- Sprint 1 e Sprint 2 estão completos com 140 testes passando
- O projeto usa Next.js + Prisma + PostgreSQL + Redis (Docker)
- O projeto tem internacionalização (EN/PT) configurada
- A branch atual é feat/sprint-2. Crie uma nova branch feat/sprint-3

PROBLEMA PRINCIPAL:
A landing page atual mostra apenas "Travel Planner - Plan your perfect trip" sem
nenhum botão ou link de navegação. Um usuário real não consegue acessar login,
registro ou qualquer funcionalidade sem digitar URLs manualmente.

O QUE PRECISA SER FEITO (Sprint 3):

1. SCRIPT DE SETUP (scripts/dev-setup.js):
   - Automatiza preparação do ambiente de dev com um único comando
   - Verifica Docker, roda migrations, cria 4 usuários de teste com senhas conhecidas
   - Cria viagens de exemplo para o Power User
   - Descobre e testa todas as rotas da aplicação
   - Modos: --check (só verifica), --reset (limpa tudo), --users-only
   - Registrar no package.json: dev:setup, dev:check, dev:reset, dev:users

2. LANDING PAGE COM NAVEGAÇÃO COMPLETA:
   - Header sticky com: logo, language switcher (EN/PT), botão Login, botão Sign Up
   - Hero section com: título, subtítulo, CTA "Get Started" → /[locale]/register
   - Link "Already have an account? Log in" → /[locale]/login
   - Features section: 4 cards (AI Planning, Drag & Drop, Multi-language, Responsive)
   - Footer com copyright e links
   - Todas as strings via i18n (EN e PT)
   - Responsivo (mobile, tablet, desktop)
   - Usuário autenticado na landing → redirect para dashboard
   - Acesso ao dashboard sem auth → redirect para login
   - Após logout → redirect para landing page

3. SKILL DO CLAUDE CODE (.claude/skills/dev-environment/SKILL.md):
   - Documentação completa de como preparar e verificar o ambiente
   - Tabela de usuários de teste com credenciais
   - 4 fluxos de teste manual detalhados
   - Troubleshooting para problemas comuns
   - Checklist pós-sprint

4. TESTES:
   - Testes para todos os componentes da landing page
   - Testes para navegação e redirects
   - Testes para i18n da landing page
   - Testes para o script dev-setup.js
   - TODOS os 140 testes existentes devem continuar passando

CRITÉRIOS DE CONCLUSÃO:
- npm test → Todos os testes passam (140 existentes + novos)
- npm run dev:setup → Executa sem erros
- Landing page carrega com navegação completa
- Usuário consegue navegar da landing page até todas as funcionalidades
- Language switcher funciona
- Layout responsivo
- Sem erros no console do navegador
- Gerar review-sprint-3.md com resumo
- Commit e push para feat/sprint-3

===================================================================


## Antes de colar o prompt, faça isso:

1. Copie o arquivo sprint-3-specification.md para C:\travel-planner\
2. No terminal:
   cd C:\travel-planner
   copy C:\Users\volma\Downloads\sprint-3-specification.md .
3. Depois inicie o Claude Code:
   claude
4. Cole o prompt acima
