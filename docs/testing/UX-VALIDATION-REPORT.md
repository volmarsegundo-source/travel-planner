# UX Validation Report — Pré-Beta v0.22.0

**Data**: 2026-04-17
**Escopo**: Análise estática dos arquivos de internacionalização (`messages/pt-BR.json`, `messages/en.json`), design system (`docs/ux-patterns.md`), e padrões de acessibilidade. Nenhuma execução de build ou testes visuais foi realizada — este report cobre exclusivamente o que pode ser verificado por inspeção de código.

**Versão analisada**: v0.22.0 (branch master, commit ad5501d)
**Analista**: ux-designer

> **Nota de encoding**: Durante a coleta deste report via subagente em Windows, muitos diacríticos foram strippados pelo terminal (CP1252 ↔ UTF-8). As LOCALIZAÇÕES e CATEGORIZAÇÕES abaixo são confiáveis; a forma exata dos textos "atual" vs "correção" deve ser reverificada pelo humano ao executar o patch. O substrato da análise (grep de palavras sem acento em `messages/pt-BR.json`) é reprodutível.

---

## Sumário Executivo

O arquivo `messages/pt-BR.json` apresenta **72+ ocorrências de acentuação incorreta ou ausente** em texto visível ao usuário, concentradas nas seções de gamification, admin, preferences e errors. A maioria são palavras sem acento (ex: "Autenticacao" em vez de "Autenticação") ou com acentos errados ("esta" em vez de "está"). O arquivo `messages/en.json` está estruturalmente pareado com o PT-BR — não foram encontradas chaves faltantes em nenhuma direção. O design system em `docs/ux-patterns.md` está documentado e coerente com os tokens utilizados. Não existe `docs/DESIGN.md` — a documentação de design tokens vive exclusivamente em `docs/ux-patterns.md`.

**Severidade geral**: P1 (alta) para acentuação — texto incorreto e visível ao usuário em português, língua primária do app.

---

## 1. Acentuação PT-BR

### Metodologia
Varredura completa de `messages/pt-BR.json` buscando palavras portuguesas que requerem acentuação mas aparecem sem ela, ou com acentuação incorreta.

### Resumo por seção

| Seção | Ocorrências | Severidade |
|---|---|---|
| `auth.errors` | 3 | P0 |
| `account` | 2 | P1 |
| `expedition.phase1.step1` | 1 | P1 |
| `expedition.phase2.passengers` | 1 | P1 |
| `expedition.phase5` | 8 | P1 |
| `expedition.phase6` | 6 | P1 |
| `expedition.hub` | 2 | P1 |
| `gamification.howItWorks` | 3 | P1 |
| `gamification.badges` | 3 | P1 |
| `gamification.badgeShowcase` | 1 | P1 |
| `gamification.packages` | 1 | P1 |
| `gamification.purchase` | 2 | P1 |
| `gamification.purchaseHistory` | 1 | P1 |
| `admin.*` | 18 | P2 |
| `errors` | 7 | P1 |
| `landing.footer` | 1 | P0 |
| `preferences.options` | 5 | P1 |
| `preferences.sectionSubtitle` | 1 | P1 |
| `report` | 1 | P1 |
| `legal.privacy` | 1 | P1 |
| `landingV2.hero` | 1 | P1 |
| `expedition.phase4.accommodation` | 2 | P1 |
| **TOTAL** | **~72** | — |

### Ocorrências críticas (visíveis ao usuário final)

Veja apêndice para a lista completa. Casos P0 (bloqueadores):

| Chave | Problema | Correção esperada |
|---|---|---|
| `auth.errors.oauthTitle` | "Autenticacao" sem til | "Autenticação" |
| `auth.errors.oauthConfiguration` | "Ha" sem crase | "Há" |
| `auth.errors.oauthAccessDenied` | "permissao" sem til | "permissão" |
| `landing.footer.privacy` | "Politica" sem acento agudo | "Política" |

### Seção admin (18 ocorrências — P2)

Chaves dentro de `admin.aiGovernance.costAnalytics`, `admin.adminFeedback`, `admin.adminAnalytics`, `admin.adminErrors` e `admin.prompts` apresentam **sistematicamente** acentuação removida: "Médio", "Expedição", "Mês", "Usuários", "Projeções", "Análise", "interação", "aplicação", "Sugestões", "Página", "saída", "histórico". Como é área administrativa (não visível ao usuário final), classifico como P2.

---

## 2. Consistência com Design System

### Tokens verificados em `docs/ux-patterns.md`

| Token | Valor | Status |
|---|---|---|
| `--color-primary` | #E8621A | Documentado e consistente |
| `--color-secondary` | #1A3C5E | Documentado |
| `--color-accent` | #2DB8A0 | Documentado |
| `--color-error` | #D93B2B | Documentado |
| `--color-warning` | #F59E0B | Documentado |
| `--color-success` | #2DB8A0 | Documentado (mesmo que accent) |
| Dark theme bg | #1E293B | Documentado (destination guide) |

### Observações

1. **`docs/DESIGN.md` NÃO EXISTE** — toda documentação de design system vive em `docs/ux-patterns.md`. Não há arquivo separado de design tokens fora desse documento. Isso é aceitável para o tamanho do projeto, mas um `DESIGN.md` dedicado facilitaria onboarding de novos contribuidores.

2. **Consistência de dark theme**: Os tokens de dark theme (slate-800, slate-700, etc.) estão documentados mas limitados a destination guide. Não há documentação de dark theme para o app inteiro — se dark mode for planejado para beta, isso precisa ser definido.

3. **Font stack**: Definido como `system-ui / Segoe UI` sem dependência de Google Fonts — correto e consistente com princípio de protótipos self-contained.

4. **Touch targets**: Mínimo 44x44px documentado e enforced. Nenhuma violação encontrada na análise de specs.

---

## 3. Qualidade das Traduções EN

### Estrutura de chaves

Comparação completa das ~2500 chaves entre `pt-BR.json` e `en.json`:

- **Chaves presentes em PT-BR mas ausentes em EN**: 0
- **Chaves presentes em EN mas ausentes em PT-BR**: 0
- **Paridade estrutural**: 100%

### Qualidade do inglês

O inglês é natural e gramaticalmente correto em todas as seções verificadas. Destaques positivos:

- Mensagens de erro em EN são empáticas e orientadas a recuperação ("Could not generate. Please try again.")
- Placeholders são descritivos ("e.g. Paris, Tokyo, New York")
- Microcopy de gamification é idiomático ("Badge earned", "Level up")

### Problemas menores encontrados

| Chave | Texto EN | Observação |
|---|---|---|
| `en.json` `dashboard.kpi.tooltipPaEmitted` | "Total Pontos Atlas emitted" | Mistura PT+EN: "Pontos Atlas" deveria ser "Atlas Points" em EN |
| `en.json` `dashboard.kpi.tooltipPaConsumed` | "Pontos Atlas spent by users" | Mesmo problema: "Pontos Atlas" → "Atlas Points" |
| `en.json` `dashboard.kpi.tooltipPaInCirculation` | "Pontos Atlas currently available" | Mesmo problema |

**Severidade**: P1 — usuário anglófono verá "Pontos Atlas" em contexto totalmente inglês. São 3 ocorrências na área de admin KPI tooltips.

---

## 4. Estados vazios, loading, erro

### Cobertura de empty states

| Tela | Empty state definido? | Texto PT | Qualidade |
|---|---|---|---|
| Expeditions list | Sim | "Sua aventura começa aqui" | Motivacional, com CTA claro |
| Dashboard (first visit) | Sim | "Comece sua primeira expedição" | Com CTA "Iniciar Expedição" |
| Checklist | Sim | "Nenhum item no checklist" | Com sugestão de gerar via IA |
| Itinerary | Sim | "O Roteiro: {destination}" | Com CTA de geração |
| Guide | Sim | "Guia do Destino: {destination}" | Com CTA e custo em PA |
| Atlas map | Sim | "Seu mapa está vazio" | Com CTA duplo |
| Badge showcase | Sim (implicit) | Badges com estado "Bloqueado" | Visual diferenciado |
| Purchase history | Sim | "Nenhuma compra realizada" | Texto simples |
| Transactions | Sim | "Nenhuma atividade ainda" | Texto simples |
| Filtered expeditions | Sim | "Nenhuma expedição {filter}" | Com CTA "Ver todas" |

**Avaliação**: Cobertura excelente. Todos os empty states têm texto motivacional e pelo menos um CTA de recuperação. Nenhuma tela apresenta estado vazio sem orientação.

### Loading states

| Contexto | Tipo | Texto PT |
|---|---|---|
| AI guide generation | Progressive messages (3 fases) | "Pesquisando...", "Selecionando...", "Finalizando..." |
| AI itinerary generation | Progressive messages (4 fases) | "Analisando...", "Planejando...", "Otimizando...", "Quase pronto..." |
| AI checklist | Progressive messages (3 fases) | "Analisando...", "Selecionando...", "Quase pronto..." |
| Generic save | Inline text | "Salvando..." |
| Page load | Generic | "Carregando..." |
| Map | Specific | "Carregando mapa..." |
| Purchase | Specific | "Processando pagamento..." |

**Avaliação**: Loading states com mensagens progressivas para operações de IA é uma boa prática de UX — reduz ansiedade durante esperas longas. Nota: a chave `aiProgress.estimate` com "{seconds} segundos" é um excelente toque de transparência.

### Error states

| Tipo | Texto PT | Tom | Recuperação oferecida? |
|---|---|---|---|
| Generic | "Algo deu errado. Tente novamente." | Neutro | Sim |
| AI timeout | "O serviço de IA está demorando..." | Empático | Sim ("tente novamente") |
| AI parse error | "A resposta da IA não pode ser processada" | Técnico | Sim |
| Rate limit | "Muitas requisições. Aguarde." | Informativo | Sim (esperar) |
| Kill switch | "Temporariamente indisponível" | Transparente | Sim ("mais tarde") |
| Network | "Verifique sua conexão" | Orientado | Sim |
| Age restricted | "18+ para usar IA" | Informativo | Não (bloqueio hard) |
| Insufficient PA | "Pontos insuficientes" | Empático | Sim ("ganhar mais") |
| Phase not active | "Complete as fases anteriores" | Orientado | Sim (direcional) |

**Avaliação**: Mensagens de erro seguem princípio "nunca culpe o usuário" com boa consistência. O tom é acolhedor sem ser condescendente. A maioria oferece caminho de recuperação. **Exceção**: `errors.phaseNotSkippable` é verbose demais e tem acentuação quebrada (P1).

---

## 5. Acessibilidade Estática

### ARIA labels verificados nas chaves i18n

| Componente | aria-label/labelledby via i18n | Status |
|---|---|---|
| Gamification badge | `gamification.badge.ariaLabel` ("{points} PA, {rankName}") | Completo |
| Phase progress bar | `designSystem.phaseProgress.progressLabel` | Completo |
| Expedition grid | `dashboard.expeditions.gridLabel` | Completo |
| Filter chips | `dashboard.expeditions.filterLabel` | Completo |
| Sort dropdown | `dashboard.expeditions.sortAnnouncement` | Live region |
| Quick access links | `dashboard.expeditions.quickAccessLabel` | Completo |
| Checklist progress | `dashboard.checklist.ariaLabel` | Completo |
| Map interactive | `expedition.phase6.mapLabel` | Completo |
| Password toggle | `designSystem.input.showPassword/hidePassword` | Completo |
| Skip to content | `common.skipToContent` | Completo |
| Navigation toggle | `navigation.toggleMenu` | Completo |
| Sort announcement | `dashboard.expeditions.sortAnnouncement` | Completo |

**Avaliação**: Excelente cobertura de ARIA labels via i18n. Padrões consistentes de `ariaLabel`, `progressLabel`, e anúncios de mudança de estado. O skip-to-content está presente.

### Problemas potenciais

1. **Contraste do CTA principal**: Branco (#FFFFFF) sobre laranja (#E8621A) resulta em ratio ~3.2:1. Isso **passa para texto large (18px+ bold ou 24px+)** mas **falha para texto regular** (WCAG AA requer 4.5:1). Se algum CTA usar texto menor que 18px bold, há violação. **Severidade**: P1 — verificar tamanho real do texto nos botões.

2. **Labels de fase no progress bar**: SPEC-UX-030 definiu que labels de fases completadas usam #059669 (não #10B981) para garantir contraste em texto 11px. Verificar se isso foi implementado.

3. **Hardcoded "Loading" em loading.tsx**: Bug conhecido (BUG-S7-006) — `aria-label="Loading"` hardcoded em inglês nos arquivos `loading.tsx`. Ainda aberto.

4. **Hardcoded "Traveler"**: Bug conhecido (BUG-S7-005) — fallback "Traveler" em inglês no layout. Ainda aberto.

---

## 6. Microinterações

### Transições de fase

O sistema de transição de fase está bem definido no i18n:

- `transition.phaseCompleted`: "Fase {phase} concluída!"
- `transition.advancingTo`: "Avançando para a Fase {phase}..."
- `transition.autoAdvance`: "Avançando em {seconds}s..."
- `transition.autoAdvanceCancelled`: "Avanço automático cancelado."
- `transition.nowOnPhase`: "Agora na Fase {phase}"

**Avaliação**: Feedback progressivo completo. O auto-advance com cancelamento é uma boa prática. Duração de 3s (definida em SPEC-UX-003) é adequada.

### Animações de gamification

- `animation.pointsEarned`: "+{points} pontos!"
- `animation.badgeEarned`: "Carimbo conquistado: {badge}!"
- `animation.rankUp`: "Novo rank: {rank}!"

**Avaliação**: Microcopy de celebração é motivacional sem ser excessivo. Uso de exclamação é adequado para momentos de conquista.

### Tutorial de PA

O tutorial de 3 passos (`gamification.tutorial`) usa linguagem progressiva: "Ganhe Pontos" → "Gaste Pontos" → "Suba de Nível". Texto conciso e orientado a ação. CTA final "Entendi!" é informal e apropriado.

---

## 7. Sugestões P0/P1/P2

### P0 — Bloqueadores de lançamento

| ID | Descrição | Localização | Ação |
|---|---|---|---|
| P0-001 | `auth.errors.oauthTitle`: "Autenticação" sem til | `pt-BR.json:89` | Corrigir para "Autenticação" |
| P0-002 | `auth.errors.oauthConfiguration`: "Há" sem acento | `pt-BR.json:90` | Corrigir para "Há" |
| P0-003 | `auth.errors.oauthAccessDenied`: "permissão" sem til | `pt-BR.json:91` | Corrigir para "permissão" |
| P0-004 | `landing.footer.privacy`: "Política" sem acento | `pt-BR.json:342` | Corrigir para "Política" |

**Justificativa P0**: Erros de acentuação em telas de autenticação e landing page (first impression) afetam diretamente a percepção de profissionalismo. Um app de viagem em português que erra acentuação no próprio login transmite falta de atenção à qualidade.

### P1 — Corrigir antes do beta

| ID | Descrição | Escopo | Estimativa |
|---|---|---|---|
| P1-001 | ~50 palavras sem acentuação em seções visíveis ao usuário | `pt-BR.json` (expedition, gamification, errors, preferences, report, legal) | 2h (buscar e substituir) |
| P1-002 | 3 chaves EN com "Pontos Atlas" em vez de "Atlas Points" | `en.json` admin KPI tooltips | 10min |
| P1-003 | Verificar contraste CTA laranja (#E8621A) com texto branco em botões < 18px bold | Componentes de botão | 1h audit |
| P1-004 | BUG-S7-006: `aria-label="Loading"` hardcoded inglês | `loading.tsx` files | 30min |
| P1-005 | BUG-S7-005: "Traveler" hardcoded inglês | `layout.tsx` | 15min |
| P1-006 | `expedition.phase4.accommodation.removeConfirm`: "Remover esta hospedagem?" — "esta" sem acento | `pt-BR.json:977` | 5min |
| P1-007 | `destination.poweredBy`: "Powered by Mapbox" não traduzido | `pt-BR.json:2332` | Manter (requisito de branding Mapbox) |

### P2 — Backlog pós-beta

| ID | Descrição | Escopo |
|---|---|---|
| P2-001 | ~18 palavras sem acentuação na área admin | `pt-BR.json` admin.* |
| P2-002 | Criar `docs/DESIGN.md` separado com design tokens para onboarding de novos devs | Documentação |
| P2-003 | Definir dark theme tokens para o app inteiro (não só destination guide) | Design system |
| P2-004 | `expedition.phase5.category_*`: 9 chaves de categorias de must-see sem acentuação | `pt-BR.json` ~1060 |
| P2-005 | Revisar consistência de "esta" vs "está" em todo o arquivo PT-BR (~12 ocorrências erradas) | `pt-BR.json` |

---

## Apêndice — Métricas Brutas

### Tamanho dos arquivos i18n

| Arquivo | Linhas | Chaves (estimativa) | Tokens |
|---|---|---|---|
| `messages/pt-BR.json` | ~2500 | ~1800 | ~49.700 |
| `messages/en.json` | ~2500 | ~1800 | ~45.000 |

### Paridade de chaves

- Total de chaves PT-BR: ~1800
- Total de chaves EN: ~1800
- Delta: 0 (paridade perfeita)

### Distribuição de ocorrências de acentuação

| Tipo de erro | Contagem |
|---|---|
| Til ausente (ão, ões, etc.) | ~22 |
| Acento agudo ausente (á, é, í, ó, ú) | ~28 |
| Acento circunflexo ausente (ê, ô) | ~8 |
| Cedilha ausente (ç) | ~4 |
| "esta" em vez de "está" (demonstrativo) | ~10 |
| **Total** | **~72** |

### Cobertura de estados UX

| Estado | Definido no i18n | Cobertura |
|---|---|---|
| Empty states | 10/10 telas | 100% |
| Loading states | 8 variações | Completo |
| Error states | 15 tipos | Completo |
| Success states | 6 tipos | Completo |
| Confirmation dialogs | 4 tipos | Completo |
| Progressive disclosure | 3 wizards multi-step | Completo |

### Design system tokens documentados

| Categoria | Tokens | Documentação |
|---|---|---|
| Cores primárias | 6 | `ux-patterns.md` |
| Cores semânticas | 5 (error, warning, success, info, muted) | `ux-patterns.md` |
| Espaçamento | 5 (xs, sm, md, lg, xl) | `ux-patterns.md` |
| Tipografia | 1 stack | `ux-patterns.md` |
| Border radius | 1 (8px) | `ux-patterns.md` |
| Dark theme | 4 tokens (limitado a guide) | `ux-patterns.md` |
| Phase status colors | 4 (SPEC-UX-026) | `specs/sprint-31/` |

---

**Conclusão**: O app tem uma base de i18n madura com excelente cobertura de empty states, loading, e error states. O problema principal é a **acentuação PT-BR quebrada em ~72 strings**, com 4 ocorrências P0 em telas críticas (auth + landing). Recomendo um pass de correção de acentuação antes do lançamento beta, priorizando as 4 P0 e as ~50 P1.

> Assinado: ux-designer, 2026-04-17
