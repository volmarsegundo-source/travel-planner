# Prompt para Claude Code — Instalar 4 Skills Reutilizáveis

## Preparação

Antes de colar o prompt no Claude Code, copie os arquivos para o projeto:

```cmd
cd C:\travel-planner

REM Criar pastas das skills
mkdir .claude\skills\sprint-lifecycle
mkdir .claude\skills\project-bootstrap
mkdir .claude\skills\security-audit
mkdir .claude\skills\i18n-manager

REM Criar pasta de scripts (se não existir)
mkdir scripts
```

Copie os arquivos baixados para as pastas corretas:
- `sprint-lifecycle\SKILL.md` → `.claude\skills\sprint-lifecycle\SKILL.md`
- `project-bootstrap\SKILL.md` → `.claude\skills\project-bootstrap\SKILL.md`
- `security-audit\SKILL.md` → `.claude\skills\security-audit\SKILL.md`
- `i18n-manager\SKILL.md` → `.claude\skills\i18n-manager\SKILL.md`
- `sprint-lifecycle.js` → `scripts\sprint-lifecycle.js`
- `project-bootstrap.js` → `scripts\project-bootstrap.js`
- `security-audit.js` → `scripts\security-audit.js`
- `i18n-manager.js` → `scripts\i18n-manager.js`

## Prompt para o Claude Code

Cole o texto abaixo no Claude Code:

===================================================================

Preciso que você instale e integre 4 skills reutilizáveis no projeto. Os arquivos
SKILL.md já estão em .claude/skills/ e os scripts em scripts/. Faça o seguinte:

1. VERIFICAR que todos os 8 arquivos estão nos lugares corretos:
   - .claude/skills/sprint-lifecycle/SKILL.md
   - .claude/skills/project-bootstrap/SKILL.md
   - .claude/skills/security-audit/SKILL.md
   - .claude/skills/i18n-manager/SKILL.md
   - scripts/sprint-lifecycle.js
   - scripts/project-bootstrap.js
   - scripts/security-audit.js
   - scripts/i18n-manager.js

2. REGISTRAR os scripts no package.json (seção "scripts"):
   "sprint:start": "node scripts/sprint-lifecycle.js start",
   "sprint:review": "node scripts/sprint-lifecycle.js review",
   "sprint:finish": "node scripts/sprint-lifecycle.js finish",
   "sprint:status": "node scripts/sprint-lifecycle.js status",
   "bootstrap": "node scripts/project-bootstrap.js",
   "bootstrap:check": "node scripts/project-bootstrap.js --check",
   "bootstrap:fix": "node scripts/project-bootstrap.js --fix",
   "security": "node scripts/security-audit.js",
   "security:ci": "node scripts/security-audit.js --ci",
   "i18n": "node scripts/i18n-manager.js",
   "i18n:check": "node scripts/i18n-manager.js --check",
   "i18n:sync": "node scripts/i18n-manager.js --sync"

3. TESTAR cada script para verificar que roda sem erros:
   - node scripts/project-bootstrap.js --check
   - node scripts/security-audit.js
   - node scripts/i18n-manager.js
   - node scripts/sprint-lifecycle.js status 3

4. CORRIGIR qualquer erro que aparecer nos scripts,
   adaptando-os ao schema e estrutura específica deste projeto.

5. COMMITAR tudo com:
   git add -A
   git commit -m "chore: add reusable development skills (sprint-lifecycle, project-bootstrap, security-audit, i18n-manager)"

===================================================================
