#!/usr/bin/env node

/**
 * Test Plan Generator — Creates comprehensive test plans for sprints
 *
 * Usage:
 *   node scripts/generate-test-plan.js <sprint-number>
 *   npm run test:plan <sprint-number>
 *
 * Reads the sprint plan file (sprint-N-plan.md) and changed files to
 * generate a structured test plan covering:
 *   - Happy path scenarios
 *   - Edge cases
 *   - Regression tests
 *   - Mobile / responsive
 *   - Accessibility (WCAG 2.1 AA)
 *   - i18n (PT-BR ↔ EN)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", yellow: "\x1b[33m",
  green: "\x1b[32m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m",
};

function ok(msg)   { console.log(`  ${C.green}✓${C.reset} ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`); }
function info(msg) { console.log(`  ${C.cyan}ℹ${C.reset} ${msg}`); }

function exec(cmd) {
  try { return execSync(cmd, { encoding: "utf8", stdio: "pipe", cwd: ROOT }).trim(); }
  catch { return ""; }
}

// ─── Analysis helpers ────────────────────────────────────────────────────────

function getChangedFiles() {
  const diff = exec("git diff --name-only master...HEAD");
  return diff ? diff.split("\n").filter(Boolean) : [];
}

function extractTasks(planContent) {
  const tasks = [];
  const taskRegex = /^[-*]\s*\[[ x]\]\s*(.+)$/gm;
  let match;
  while ((match = taskRegex.exec(planContent)) !== null) {
    tasks.push(match[1].trim());
  }
  return tasks;
}

function categorizeChangedFiles(files) {
  const categories = {
    pages: [],
    components: [],
    serverActions: [],
    api: [],
    lib: [],
    i18n: [],
    tests: [],
    config: [],
    styles: [],
  };

  for (const f of files) {
    if (f.includes("test") || f.includes("spec")) categories.tests.push(f);
    else if (f.startsWith("src/app/") && f.endsWith("page.tsx")) categories.pages.push(f);
    else if (f.startsWith("src/app/") && (f.endsWith("loading.tsx") || f.endsWith("error.tsx") || f.endsWith("layout.tsx"))) categories.pages.push(f);
    else if (f.startsWith("src/components/")) categories.components.push(f);
    else if (f.includes("actions/") || f.includes("services/")) categories.serverActions.push(f);
    else if (f.startsWith("src/app/api/")) categories.api.push(f);
    else if (f.startsWith("src/lib/")) categories.lib.push(f);
    else if (f.startsWith("messages/")) categories.i18n.push(f);
    else if (f.includes("config") || f.includes(".json") || f.includes("prisma/")) categories.config.push(f);
    else if (f.endsWith(".css")) categories.styles.push(f);
  }

  return categories;
}

function detectFeatureAreas(files) {
  const areas = new Set();

  for (const f of files) {
    if (f.includes("auth/") || f.includes("auth.")) areas.add("auth");
    if (f.includes("trip") || f.includes("trips")) areas.add("trips");
    if (f.includes("itinerary")) areas.add("itinerary");
    if (f.includes("checklist")) areas.add("checklist");
    if (f.includes("account") || f.includes("profile")) areas.add("account");
    if (f.includes("onboarding")) areas.add("onboarding");
    if (f.includes("landing") || f.includes("hero")) areas.add("landing");
    if (/navbar/i.test(f) || f.includes("navigation") || f.includes("breadcrumb")) areas.add("navigation");
    if (f.includes("footer")) areas.add("footer");
    if (f.includes("loading") || f.includes("skeleton")) areas.add("loading-states");
    if (f.includes("error")) areas.add("error-handling");
    if (f.includes("i18n") || f.includes("messages/")) areas.add("i18n");
  }

  return [...areas];
}

// ─── Test section generators ─────────────────────────────────────────────────

function generateEnvironmentSection() {
  return `## Ambiente de Teste

| Item | Valor |
|------|-------|
| OS | Windows 11 |
| Node.js | 20+ |
| Browser | Chrome (latest) |
| Viewport Desktop | 1280×720 |
| Viewport Mobile | 375×667 |
| Database | PostgreSQL 16 (Docker) |
| Cache | Redis 7 (Docker) |

### Pré-requisitos
- [ ] Docker Desktop rodando (postgres + redis healthy)
- [ ] \`npm run dev:setup\` executado
- [ ] \`npm run dev\` rodando (http://localhost:3000)
`;
}

function generateHappyPathSection(areas, tasks) {
  let section = `## Happy Path — Cenários Principais\n\n`;
  section += `> Testar o fluxo ideal de cada funcionalidade nova/modificada.\n\n`;

  if (areas.includes("auth")) {
    section += `### Autenticação
- [ ] Registro com dados válidos → redirect para login com banner de sucesso
- [ ] Login com credenciais válidas → redirect para /trips
- [ ] Logout → redirect para landing page
`;
  }

  if (areas.includes("account")) {
    section += `### Conta / Perfil
- [ ] Acessar /account → formulário carrega com dados atuais
- [ ] Editar nome → salvar → feedback de sucesso
- [ ] Trocar idioma preferido → salvar → aplicado na próxima visita
- [ ] Excluir conta → modal confirmação → digitar email → conta removida
`;
  }

  if (areas.includes("trips")) {
    section += `### Viagens
- [ ] Listar viagens → cards exibidos corretamente
- [ ] Criar nova viagem → viagem aparece na lista
- [ ] Acessar detalhes de viagem → dados corretos
- [ ] Deletar viagem → viagem removida da lista
`;
  }

  if (areas.includes("itinerary")) {
    section += `### Itinerário
- [ ] Gerar itinerário com IA → dias e atividades criados
- [ ] Adicionar dia → novo dia aparece na lista
- [ ] Arrastar atividade (drag & drop) → ordem atualizada
- [ ] Adicionar/editar/excluir atividade → persistido
`;
  }

  if (areas.includes("checklist")) {
    section += `### Checklist
- [ ] Gerar checklist com IA → categorias e itens criados
- [ ] Marcar/desmarcar item → estado persistido
- [ ] Adicionar item manual → item aparece na categoria
`;
  }

  if (areas.includes("onboarding")) {
    section += `### Onboarding
- [ ] Primeiro login (0 viagens) → redirect para onboarding
- [ ] Completar wizard 3 passos → viagem criada → redirect para /trips
- [ ] Pular onboarding → ir para /trips vazia
`;
  }

  if (areas.includes("loading-states")) {
    section += `### Loading States
- [ ] Navegação entre páginas mostra skeleton loading
- [ ] Botões de submit mostram spinner durante operação
- [ ] Geração de conteúdo IA mostra estado de progresso
`;
  }

  if (areas.includes("error-handling")) {
    section += `### Error Handling
- [ ] Erro inesperado → error boundary com opções "Tentar novamente" e "Voltar"
- [ ] Viagem não encontrada → card informativo com link para /trips
- [ ] Botão "Tentar novamente" na error boundary → re-renderiza
`;
  }

  // Add task-based scenarios
  if (tasks.length > 0) {
    section += `### Tarefas do Sprint
`;
    for (const task of tasks) {
      section += `- [ ] ${task} → funciona conforme esperado\n`;
    }
  }

  return section;
}

function generateEdgeCasesSection(areas) {
  let section = `## Edge Cases — Casos Limite\n\n`;
  section += `> Testar condições de contorno, inputs inválidos e estados inesperados.\n\n`;

  section += `### Validação de Formulários
- [ ] Campos obrigatórios vazios → mensagem de erro visível
- [ ] Email com formato inválido → rejeitar
- [ ] Texto excedendo limite máximo → truncar ou rejeitar
- [ ] Caracteres especiais em inputs → sanitizado corretamente
`;

  if (areas.includes("auth")) {
    section += `### Auth Edge Cases
- [ ] Login com email inexistente → mensagem genérica (sem revelar se email existe)
- [ ] Login com senha errada → mensagem de erro
- [ ] Rate limiting → muitas tentativas → mensagem de limite
- [ ] Token expirado → mensagem informativa
`;
  }

  if (areas.includes("trips")) {
    section += `### Viagens Edge Cases
- [ ] Lista vazia (0 viagens) → empty state com CTA
- [ ] Acessar viagem de outro usuário → acesso negado
- [ ] Acessar viagem inexistente → "Trip not found" com link para voltar
- [ ] Datas inválidas (volta antes da ida) → erro de validação
`;
  }

  if (areas.includes("account")) {
    section += `### Conta Edge Cases
- [ ] Nome com menos de 2 caracteres → erro de validação
- [ ] Nome com mais de 100 caracteres → erro de validação
- [ ] Excluir conta com email incorreto → modal rejeita
- [ ] Submeter formulário sem alterações → comportamento gracioso
`;
  }

  section += `### Estados de Erro
- [ ] API offline / timeout → mensagem de erro amigável
- [ ] Perda de conexão durante operação → feedback ao usuário
- [ ] Sessão expirada → redirect para login
`;

  return section;
}

function generateRegressionSection(areas) {
  let section = `## Regressão — Funcionalidades Existentes\n\n`;
  section += `> Verificar que funcionalidades de sprints anteriores continuam funcionando.\n\n`;

  section += `### Core (sempre testar)
- [ ] Landing page carrega corretamente
- [ ] Fluxo completo: register → login → /trips → logout
- [ ] LanguageSwitcher funciona (EN ↔ PT-BR)
- [ ] Navbar autenticada com links funcionais
- [ ] Breadcrumbs navegáveis em todas as páginas
- [ ] Páginas 404 customizadas com i18n
- [ ] Auth guard: usuário não logado → redirect para login
`;

  if (areas.includes("trips") || areas.includes("itinerary") || areas.includes("checklist")) {
    section += `### Features de Viagem
- [ ] CRUD de viagens funciona (create, read, update, delete)
- [ ] Itinerário: drag & drop de atividades
- [ ] Checklist: marcar/desmarcar itens
- [ ] Geração com IA funciona (itinerário + checklist)
`;
  }

  section += `### Infraestrutura
- [ ] \`npm run build\` → build limpo sem erros
- [ ] \`npx vitest run\` → todos os testes passam
- [ ] \`npm run lint\` → sem erros (warnings aceitos)
- [ ] Console do browser sem erros (exceto hydration warnings conhecidos)
`;

  return section;
}

function generateMobileSection() {
  return `## Mobile / Responsivo (375px + 393px)\n
> Testar em viewport mobile (DevTools → Toggle Device → iPhone SE / Pixel 5).\n
- [ ] Landing page: layout sem overflow horizontal
- [ ] Navbar: hamburger menu abre/fecha corretamente
- [ ] UserMenu: acessível e funcional no mobile
- [ ] Formulários: inputs usáveis, teclado não sobrepõe campos
- [ ] Breadcrumbs: não quebram o layout
- [ ] Cards de viagem: stack vertical, legíveis
- [ ] Modais: ocupam tela cheia ou centrados corretamente
- [ ] Botões: min-height 44px (touch target)
- [ ] Tabelas/grids: scroll horizontal se necessário (sem quebra)
`;
}

function generateAccessibilitySection() {
  return `## Acessibilidade (WCAG 2.1 AA)\n
> Testar navegação por teclado e semântica HTML.\n
### Navegação por Teclado
- [ ] Tab navega por todos os elementos interativos na ordem correta
- [ ] Enter/Space ativa botões e links
- [ ] Escape fecha modais e dropdowns
- [ ] Focus visível em todos os elementos focáveis (outline)
- [ ] Skip-to-content link funciona

### Semântica e ARIA
- [ ] Headings em ordem hierárquica (h1 → h2 → h3)
- [ ] Formulários: labels associados a inputs (htmlFor/id)
- [ ] Imagens: alt text descritivo (ou aria-hidden se decorativo)
- [ ] Roles corretos: alert para erros, status para loading, navigation para nav
- [ ] Live regions: feedback de ações anunciado (role="status", aria-live)

### Contraste e Visual
- [ ] Texto com contraste mínimo 4.5:1 (normal) / 3:1 (large)
- [ ] Estados de erro distinguíveis sem depender só de cor
- [ ] Focus ring com contraste suficiente
`;
}

function generateI18nSection() {
  return `## i18n — Internacionalização (PT-BR ↔ EN)\n
> Testar com ambos os locales. Trocar idioma e verificar tradução completa.\n
- [ ] Todas as strings visíveis estão traduzidas (sem chaves de i18n expostas)
- [ ] LanguageSwitcher alterna entre EN e PT-BR corretamente
- [ ] URLs refletem locale (/en/trips vs /pt-BR/trips)
- [ ] Mensagens de erro traduzidas nos dois idiomas
- [ ] Placeholders de formulários traduzidos
- [ ] Datas formatadas conforme locale (se aplicável)
- [ ] Textos longos em PT-BR não quebram layout (PT é ~30% mais longo que EN)
- [ ] Rodar \`npm run i18n:check\` → sem chaves órfãs ou faltantes
`;
}

function generatePerformanceSection() {
  return `## Performance (opcional)\n
> Verificações rápidas de performance.\n
- [ ] Lighthouse mobile score > 80 (Performance)
- [ ] First Contentful Paint < 2s em 3G simulado
- [ ] Sem console warnings de imagens não otimizadas
- [ ] Bundle size: verificar que não há imports desnecessários (next/bundle-analyzer)
`;
}

// ─── Main generator ──────────────────────────────────────────────────────────

function generate(sprintN) {
  console.log(`\n${C.bold}${C.cyan}📝 Generating Test Plan for Sprint ${sprintN}${C.reset}\n`);

  // Read sprint plan if exists
  const planPath = path.join(ROOT, `sprint-${sprintN}-plan.md`);
  let tasks = [];
  if (fs.existsSync(planPath)) {
    const planContent = fs.readFileSync(planPath, "utf8");
    tasks = extractTasks(planContent);
    ok(`Read sprint plan: ${tasks.length} task(s) found`);
  } else {
    warn(`sprint-${sprintN}-plan.md not found — generating from changed files only`);
  }

  // Analyze changed files
  const changedFiles = getChangedFiles();
  info(`${changedFiles.length} file(s) changed since master`);

  const categories = categorizeChangedFiles(changedFiles);
  const areas = detectFeatureAreas(changedFiles);

  if (areas.length > 0) {
    info(`Feature areas detected: ${areas.join(", ")}`);
  }

  // Show file breakdown
  for (const [cat, files] of Object.entries(categories)) {
    if (files.length > 0) {
      info(`  ${cat}: ${files.length} file(s)`);
    }
  }

  // Build test plan
  const date = new Date().toISOString().split("T")[0];
  let md = `# Sprint ${sprintN} — Plano de Testes\n\n`;
  md += `**Gerado em:** ${date}\n`;
  md += `**Áreas afetadas:** ${areas.length > 0 ? areas.join(", ") : "N/A"}\n`;
  md += `**Arquivos modificados:** ${changedFiles.length}\n\n`;
  md += `---\n\n`;

  md += generateEnvironmentSection();
  md += `\n---\n\n`;
  md += generateHappyPathSection(areas, tasks);
  md += `\n---\n\n`;
  md += generateEdgeCasesSection(areas);
  md += `\n---\n\n`;
  md += generateRegressionSection(areas);
  md += `\n---\n\n`;
  md += generateMobileSection();
  md += `\n---\n\n`;
  md += generateAccessibilitySection();
  md += `\n---\n\n`;
  md += generateI18nSection();
  md += `\n---\n\n`;
  md += generatePerformanceSection();

  // Changed files summary
  md += `\n---\n\n`;
  md += `## Arquivos Modificados\n\n`;
  md += `<details>\n<summary>${changedFiles.length} arquivo(s) — clique para expandir</summary>\n\n`;
  for (const f of changedFiles) {
    md += `- \`${f}\`\n`;
  }
  md += `\n</details>\n`;

  // Write file
  const outputDir = path.join(ROOT, "docs", "test-results");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `test-plan-sprint-${sprintN}.md`);
  fs.writeFileSync(outputPath, md);
  ok(`Test plan saved to docs/test-results/test-plan-sprint-${sprintN}.md`);

  // Summary
  const checkboxCount = (md.match(/- \[ \]/g) || []).length;
  console.log(`\n  ${C.green}${C.bold}Test plan generated!${C.reset}`);
  info(`${checkboxCount} test cases across 8 sections`);
  info(`Output: docs/test-results/test-plan-sprint-${sprintN}.md\n`);

  return { outputPath, checkboxCount, areas };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { generate, extractTasks, categorizeChangedFiles, detectFeatureAreas };

// ─── Main ────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const sprintArg = process.argv[2];
  const sprintN = parseInt(sprintArg);

  if (!sprintN) {
    console.log("Usage: node scripts/generate-test-plan.js <sprint-number>");
    console.log("   or: npm run test:plan <sprint-number>");
    process.exit(1);
  }

  generate(sprintN);
}
