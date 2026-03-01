# Sprint 4 — Development Toolkit & Skills Integration

## Contexto

O Sprint 3 focou na landing page navegável, script dev-setup.js, e skill dev-environment.
O Sprint 4 instala e integra as 4 skills reutilizáveis de desenvolvimento que aceleram
o workflow em qualquer projeto futuro.

## Pré-requisito

Sprint 3 deve estar completo e aprovado (review-sprint-3.md sem issues CRITICAL).

---

## Objetivo

Instalar, integrar e testar 4 skills de desenvolvimento no projeto, criando um
toolkit profissional reutilizável:

1. **sprint-lifecycle** — Gerenciamento de sprints com quality gates automáticos
2. **project-bootstrap** — Setup automatizado ao clonar projeto em máquina nova
3. **security-audit** — Scanner de segurança (secrets, auth, LGPD, dependências)
4. **i18n-manager** — Verificação de consistência de traduções

---

## Parte 1: Instalar Estrutura de Arquivos

### 1.1 Criar pastas das skills

```
.claude/skills/sprint-lifecycle/SKILL.md
.claude/skills/project-bootstrap/SKILL.md
.claude/skills/security-audit/SKILL.md
.claude/skills/i18n-manager/SKILL.md
```

### 1.2 Criar os scripts de automação

```
scripts/sprint-lifecycle.js
scripts/project-bootstrap.js
scripts/security-audit.js
scripts/i18n-manager.js
```

### 1.3 Criar instalador automatizado

```
scripts/install-skills.js    — Instalador Node.js (cross-platform)
install-skills.bat            — Atalho Windows (chama o .js)
```

O instalador deve:
- Criar todas as pastas necessárias
- Copiar SKILL.md e scripts para os lugares corretos
- Atualizar package.json com os novos scripts
- Verificar que tudo foi instalado corretamente
- Suportar --verify (só verifica) e --uninstall (remove tudo)

---

## Parte 2: Implementar sprint-lifecycle.js

Script que gerencia o ciclo de vida dos sprints.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `start <N>` | Verifica sprint anterior completo, cria branch feat/sprint-N, tag sprint-N-start, roda testes para baseline, cria sprint-N-plan.md |
| `review <N>` | Roda testes + lint + type-check, scan de segurança (console.log com senhas, secrets hardcoded, .env no .gitignore, npm audit), detecta TODOs em arquivos alterados, verifica arquivos novos sem testes, gera review-sprint-N.md com severidades |
| `finish <N>` | Verifica review sem CRITICAL, teste final, gera changelog, commit, push, tag sprint-N-complete |
| `status <N>` | Mostra estado: NOT STARTED / IN PROGRESS / BLOCKED / READY TO FINISH |

### Quality Gates

| Severidade | Efeito | Exemplos |
|------------|--------|----------|
| CRITICAL | Bloqueia sprint | Testes falhando, vulnerabilidades, dados sensíveis em logs |
| HIGH | Deve corrigir | Arquivos sem testes, console.log com dados sensíveis |
| MEDIUM | Deveria corrigir | TODOs sem ticket, chaves i18n faltando |
| LOW | Bom corrigir | Estilo de código, refatorações menores |

### Registrar no package.json

```json
"sprint:start": "node scripts/sprint-lifecycle.js start",
"sprint:review": "node scripts/sprint-lifecycle.js review",
"sprint:finish": "node scripts/sprint-lifecycle.js finish",
"sprint:status": "node scripts/sprint-lifecycle.js status"
```

---

## Parte 3: Implementar project-bootstrap.js

Script que prepara qualquer projeto Node.js do zero.

### Sequência de execução

1. Detecta stack (Next.js/Vite, Prisma, Docker, TypeScript, package manager)
2. Verifica pré-requisitos (Node.js versão, Git, Docker)
3. Instala dependências (npm ci / yarn / pnpm — auto-detecta pelo lock file)
4. Configura .env (copia .env.example, preenche DATABASE_URL do docker-compose.yml, gera secrets aleatórios)
5. Sobe Docker (docker compose up -d, aguarda health check)
6. Setup de banco (prisma generate, prisma migrate deploy, prisma db seed)
7. Verifica build (type-check, lint, testes)
8. Gera bootstrap-report.md

### Auto-fill do .env

| Padrão no .env.example | Estratégia |
|------------------------|------------|
| DATABASE_URL | Extrai user/pass/db do docker-compose.yml |
| REDIS_URL | localhost + porta do docker-compose |
| *_SECRET, *_KEY | Gera hex aleatório de 64 chars |
| NEXTAUTH_URL | http://localhost:3000 |
| NODE_ENV | development |

### Registrar no package.json

```json
"bootstrap": "node scripts/project-bootstrap.js",
"bootstrap:check": "node scripts/project-bootstrap.js --check",
"bootstrap:fix": "node scripts/project-bootstrap.js --fix"
```

---

## Parte 4: Implementar security-audit.js

Scanner de segurança automatizado.

### Categorias de verificação

**Secrets (CRITICAL):**
- console.log/debug com password, token, secret, apiKey, credential
- API keys hardcoded (strings > 20 chars atribuídas a vars com "key"/"token"/"secret")
- Connection strings com senha no código
- Chaves privadas (BEGIN PRIVATE KEY)
- .env fora do .gitignore ou commitado no histórico git

**Auth (HIGH):**
- Rotas de API sem middleware de autenticação
- Senhas armazenadas sem hashing
- bcrypt com salt rounds < 10
- Cookies sem httpOnly
- CORS com origin: "*"

**LGPD/GDPR (HIGH):**
- Sem funcionalidade de exclusão de conta (Direito ao Esquecimento)
- Sem exportação de dados (Portabilidade)
- Sem referência a política de privacidade
- Sem mecanismo de consentimento
- Sem consentimento de cookies

**Dependências:**
- npm audit critical/high
- Pacotes deprecados

### Modos

```json
"security": "node scripts/security-audit.js",
"security:ci": "node scripts/security-audit.js --ci"
```

O modo --ci retorna exit code 1 se houver issues CRITICAL (para uso em CI/CD).

---

## Parte 5: Implementar i18n-manager.js

Verificador de consistência de traduções.

### Funcionalidades

**Missing Keys:** Chaves presentes em en.json mas ausentes em pt.json (e vice-versa).

**Orphaned Keys:** Chaves nos JSONs de tradução que nenhum componente referencia no código.

**Hardcoded Strings:** Texto em JSX que deveria usar t() mas está hardcoded:
- `<h1>Welcome</h1>` → deveria ser `<h1>{t('welcome')}</h1>`
- Verifica: conteúdo de elementos, placeholder, title, alt, aria-label

**Interpolation Mismatches:** Variáveis inconsistentes entre idiomas:
- EN: `"Hello {name}, {count} trips"` vs PT: `"Olá {name}"` ← falta {count}

**Sync Mode (--sync):** Adiciona entradas `[NEEDS TRANSLATION] texto original` para cada chave faltante.

### Auto-detecção

Detecta framework i18n do package.json (next-intl, react-i18next, vue-i18n) e encontra
arquivos de locale em diretórios comuns (messages/, locales/, src/locales/).

### Registrar no package.json

```json
"i18n": "node scripts/i18n-manager.js",
"i18n:check": "node scripts/i18n-manager.js --check",
"i18n:sync": "node scripts/i18n-manager.js --sync"
```

---

## Parte 6: Integração entre Skills

As skills devem se complementar:

- `sprint:review` chama verificações do security-audit e i18n-manager automaticamente
- `bootstrap` detecta se dev-setup.js existe e sugere rodá-lo após o setup
- `security:ci` pode ser adicionado como pre-commit hook ou step de CI
- Todas geram relatórios .md na raiz do projeto

---

## Parte 7: Testes

### Testes para sprint-lifecycle.js
- start: cria branch e tag corretamente
- review: detecta testes falhando como CRITICAL
- review: detecta console.log com password como CRITICAL
- review: gera review-sprint-N.md
- finish: bloqueia se review tem CRITICAL
- status: retorna estado correto

### Testes para project-bootstrap.js
- Detecta stack corretamente (Next.js + Prisma + Docker)
- Copia .env.example e preenche DATABASE_URL
- Modo --check não modifica nada
- Gera bootstrap-report.md

### Testes para security-audit.js
- Detecta console.log com "password" como CRITICAL
- Detecta API key hardcoded como CRITICAL
- Detecta .env fora do .gitignore
- Modo --ci retorna exit code 1 em CRITICAL
- Gera security-report.md

### Testes para i18n-manager.js
- Detecta chave faltante entre en e pt
- Detecta chave órfã
- Detecta interpolação inconsistente
- Sync mode adiciona [NEEDS TRANSLATION]
- Gera i18n-report.md

### Manter testes existentes
Todos os testes dos Sprints 1, 2 e 3 devem continuar passando.

---

## Parte 8: Critérios de Conclusão

- [ ] Todos os 4 scripts rodam sem erros
- [ ] Todos os 16 comandos npm registrados no package.json
- [ ] install-skills.bat funciona em Windows
- [ ] npm run sprint:status 4 retorna estado correto
- [ ] npm run bootstrap:check passa
- [ ] npm run security gera security-report.md
- [ ] npm run i18n gera i18n-report.md
- [ ] npm run sprint:review 4 integra security + i18n checks
- [ ] Todos os testes passam (existentes + novos)
- [ ] Sem erros CRITICAL no review
- [ ] Gerar review-sprint-4.md
- [ ] Commit e push para feat/sprint-4

---

## Ordem de Implementação

1. Criar estrutura de pastas e SKILL.md files
2. Implementar project-bootstrap.js (o mais simples, útil imediatamente)
3. Implementar security-audit.js (independente, focado)
4. Implementar i18n-manager.js (independente, focado)
5. Implementar sprint-lifecycle.js (integra os outros)
6. Criar install-skills.bat e install-skills.js
7. Registrar todos os scripts no package.json
8. Escrever testes
9. Rodar npm run sprint:review 4 usando o próprio script novo
10. Commit e push para feat/sprint-4
