# FULL VALIDATION CHECKLIST — Atlas v0.22.0 Pré-Beta

> **Owner:** Product Owner (PO) — execução manual em staging
> **Environment:** https://travel-planner-eight-navy.vercel.app
> **Data:** ______________  **PO:** ______________  **Build:** v0.22.0
> **Locales a validar:** pt-BR e en
> **Browsers alvo:** Chrome desktop (prioritário), Firefox desktop, Safari iOS (smoke)
>
> **Status legend:** `[ ]` not run · `[P]` pass · `[F]` fail · `[B]` blocked · `[N]` N/A
>
> Relacione falhas ao respectivo BUG-* no campo *Notes*. Bugs conhecidos já documentados em:
> - `docs/testing/UX-VALIDATION-REPORT.md`
> - `docs/testing/SECURITY-OBSERVABILITY-REPORT.md`
> - `docs/testing/AI-VALIDATION-REPORT.md`

---

## A. Auth — Login (7 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| A1 | Login com credenciais válidas | `/pt/auth/login` | 1. abrir página 2. email `test@test.com` 3. senha `Test1234!` 4. clicar Entrar | redireciona para `/pt/expeditions`; navbar autenticada visível | [ ] |  |
| A2 | Login com senha errada | `/pt/auth/login` | email válido + senha inválida | mensagem de erro traduzida em pt-BR; foco volta ao campo senha | [ ] |  |
| A3 | Login com email inexistente | `/pt/auth/login` | email `inexiste@nada.com` + qualquer senha | mesma mensagem genérica (sem leak de enumeration) | [ ] |  |
| A4 | Validação de formato de email | `/pt/auth/login` | digitar `abc` no campo email; tab out | erro de validação imediato e traduzido | [ ] |  |
| A5 | Login via Google OAuth | `/pt/auth/login` | clicar "Entrar com Google" | popup Google → sucesso → volta logado | [ ] |  |
| A6 | Banner `?registered=true` | `/pt/auth/login?registered=true` | abrir URL com param | banner verde visível, mensagem pt-BR correta | [ ] |  |
| A7 | Rate limit em login | `/pt/auth/login` | 6 tentativas seguidas com senha errada | resposta 429 após 5 tentativas; mensagem traduzida | [ ] |  |

## B. Auth — Registro (6 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| B1 | Registro válido | `/pt/auth/register` | nome, email novo, senha forte, confirmar senha, submit | redireciona `/pt/auth/login?registered=true` | [ ] |  |
| B2 | Senhas divergentes | `/pt/auth/register` | confirmar senha != senha | erro `.refine()` exibido | [ ] |  |
| B3 | Email já existente | `/pt/auth/register` | usar `test@test.com` | erro traduzido; sem revelar detalhes sensíveis | [ ] |  |
| B4 | Regra de senha fraca | `/pt/auth/register` | senha `123` | mensagem explicando requisitos | [ ] |  |
| B5 | Locale en no registro | `/en/auth/register` | registrar em inglês | campos, erros, banner em inglês | [ ] |  |
| B6 | Trust signals visíveis | `/pt/auth/register` | inspecionar página | badge de privacidade e segurança presente | [ ] |  |

## C. Auth — Recovery (3 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| C1 | Forgot password — email válido | `/pt/auth/forgot-password` | submit com email existente | mensagem de sucesso sem revelar existência | [ ] |  |
| C2 | Forgot password — email inexistente | `/pt/auth/forgot-password` | submit com email desconhecido | **mesma** mensagem (anti-enumeration) | [ ] |  |
| C3 | Reset password via token | link de email | seguir link → nova senha | sucesso; redireciona para login | [ ] |  |

## D. i18n (5 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| D1 | LanguageSwitcher pt→en | qualquer página | clicar bandeira EN | URL troca para `/en/...`; strings em inglês; sessão preservada | [ ] |  |
| D2 | LanguageSwitcher en→pt | qualquer `/en/...` | clicar pt | URL `/pt/...`; strings pt; sessão preservada | [ ] |  |
| D3 | Acentuação em mensagens | várias páginas | ler erros, tooltips, labels | todos os acentos corretos (ver UX-VALIDATION-REPORT) | [ ] |  |
| D4 | Falta de fallback pt | ativar pt | inspecionar páginas privadas | nenhum texto cru `auth.errors.*` ou similar | [ ] |  |
| D5 | Aria-labels traduzidos | `/pt/expedition/.../loading` | inspecionar loading states | `aria-label` em pt (ver BUG-S7-006) | [ ] |  |

## E. Landing + Header/Footer (6 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| E1 | Landing page carrega | `/pt` | abrir | hero, CTAs, seções de valor presentes | [ ] |  |
| E2 | CTA "Começar" | `/pt` | clicar CTA principal | leva a `/pt/auth/register` | [ ] |  |
| E3 | Footer — link Terms | `/pt` | clicar Terms | NÃO deve 404 (ver BUG-S7-004) | [ ] |  |
| E4 | Footer — link Privacy | `/pt` | clicar Privacy | NÃO deve 404 (ver BUG-S7-004) | [ ] |  |
| E5 | Footer — link Support | `/pt` | clicar Support | NÃO deve 404 (ver BUG-S7-004) | [ ] |  |
| E6 | Header sticky em scroll | `/pt` | rolar 500px | header permanece visível; sem layout shift | [ ] |  |

## F. Onboarding + AI Consent Modal (6 items)

> F1/F2/F4 corrigidos: o OnboardingWizard **não tem step de AI consent** (3 passos: welcome → trip style → preferências).
> O consentimento de IA é capturado via modal pré-geração (SPEC-PROD-056).
> F5 e F6 são novos itens para validar o modal.

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| F1 | Wizard 3 passos | `/pt/onboarding` (usuário novo) | welcome → trip style → preferências | indicator atualiza a cada passo; consegue voltar; 3 passos totais (sem step de AI consent) | [ ] | SPEC-PROD-056: wizard NÃO inclui step de consent |
| F2 | Skip onboarding | `/pt/onboarding` | clicar skip | redireciona para `/pt/expeditions`; estado marcado como skipped | [ ] |  |
| F3 | Persistência de escolhas | onboarding completo | logout + login | escolhas de trip style e preferências preservadas | [ ] |  |
| F4 | Onboarding sem bloqueio AI | wizard completo (sem gerar IA ainda) | concluir as 3 etapas | conta funcionando; `aiConsentGiven` ainda null (não foi solicitado no wizard) | [ ] | SPEC-PROD-056: consent só é pedido no momento da geração |
| F5 | AI Consent Modal — aceitar (happy path) | Fase 5 ou Fase 6 (usuário sem consent) | clicar botão de geração de IA pela primeira vez → modal aparece → clicar "Aceitar e continuar" | modal fecha; geração inicia; `aiConsentGiven=true` persistido; modal não reaparece em sessões futuras | [ ] | SPEC-PROD-056 AC-CONSENT-001/002/007 |
| F6 | AI Consent Modal — recusar (unhappy path) | Fase 5 ou Fase 6 (usuário sem consent) | clicar botão de geração → modal aparece → clicar "Não, obrigado" | `aiConsentGiven=false` persistido; sem chamada à API de IA; redirecionado para `/pt/expeditions` com mensagem informativa | [ ] | SPEC-PROD-056 AC-CONSENT-003/004 |

## G. Navegação autenticada (6 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| G1 | Navbar links principais | qualquer `/pt/(app)/*` | clicar cada item | navegação correta; indicador de página ativa | [ ] |  |
| G2 | UserMenu dropdown | qualquer `/pt/(app)/*` | clicar avatar | dropdown abre; itens traduzidos | [ ] |  |
| G3 | Logout | UserMenu → sair | clicar | volta para `/pt`; sessão invalidada; refresh não logado | [ ] |  |
| G4 | Breadcrumbs em trips | `/pt/trips` | inspecionar | breadcrumb correto e traduzido | [ ] |  |
| G5 | 404 dentro de locale | `/pt/nao-existe` | abrir | 404 com Header/Footer, strings pt | [ ] |  |
| G6 | 404 catch-all | `/pt/foo/bar/baz` | abrir | mesmo comportamento G5 | [ ] |  |

## H. Dashboard / Expeditions (7 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| H1 | Lista de expeditions | `/pt/expeditions` | abrir | cards renderizados; empty state se vazio | [ ] |  |
| H2 | Criar nova expedition | `/pt/expeditions` | clicar "Nova Expedição" | inicia Phase 1 wizard | [ ] |  |
| H3 | Countdown inline | `/pt/expeditions` | expedition com data futura | countdown correto e traduzido | [ ] |  |
| H4 | Progress bar por fase | `/pt/expeditions/{id}` | inspecionar | barra reflete fase atual | [ ] |  |
| H5 | Clique em segmento de fase | progress bar | clicar fase completa | navega para aquela fase (revisit) | [ ] |  |
| H6 | Error boundary card | `/pt/expeditions` (forçar erro) | quebrar um card | boundary mostra fallback traduzido | [ ] |  |
| H7 | Redirect legado `/dashboard` | `/pt/dashboard` | abrir | redireciona 301/302 para `/pt/expeditions` | [ ] |  |

## I. Phase 1 — Setup da Viagem (6 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| I1 | Campo origem com perfil | wizard P1 step 1 | abrir com profile preenchido | origem pré-populada | [ ] |  |
| I2 | Autocomplete destino | wizard P1 step 2 | digitar "Lis" | lista Nominatim com Lisboa; rate limit OK | [ ] |  |
| I3 | Datas inválidas | step datas | fim antes de início | validação Zod; erro traduzido | [ ] |  |
| I4 | Confirmation screen | step final | revisar | mostra origem, destino, datas corretas | [ ] |  |
| I5 | Classificação do trip | após confirmar | inspecionar dados | tripType calculado (domestic/international) com ISO correto | [ ] |  |
| I6 | Coordenadas persistidas | após confirmar | verificar DB/state | lat/lon salvos | [ ] |  |

## J. Phase 2 — Passageiros (5 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| J1 | Adicionar adulto | P2 | clicar +Adulto | contador sobe; validação OK | [ ] |  |
| J2 | Adicionar criança | P2 | +Criança | campo idade aparece | [ ] |  |
| J3 | Cap de 20 passageiros | P2 | ir além de 20 | bloqueia; mensagem traduzida | [ ] |  |
| J4 | Idade < 0 | P2 | digitar idade inválida | Zod rejeita | [ ] |  |
| J5 | Guarda AI 18+ | usuário < 18 tenta geração | inspecionar | ação bloqueada com razão clara | [ ] |  |

## K. Phase 3 — Guia de Destino (AI) (7 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| K1 | Gerar guia destino nacional | P3 Piracicaba | gerar | streaming visível; Trust Score bar aparece; números emergência BR (190/192/193) | [ ] |  |
| K2 | Gerar guia destino internacional | P3 Lisboa | gerar | conteúdo pt-BR; moeda EUR; 112 | [ ] |  |
| K3 | Gerar guia en | P3 Tokyo locale en | gerar | conteúdo en; JPY; 110/119 | [ ] |  |
| K4 | Regenerar com novos parâmetros | P3 | regenerate | erro específico se falhar (ver sprint 44 fix) | [ ] |  |
| K5 | Timeout Gemini 30s | P3 (forçar) | simular lentidão | fallback para Haiku; sem crash | [ ] |  |
| K6 | Anti-alucinação cidade pequena | P3 Jacutinga-MG | gerar | conteúdo plausível; sem fatos inventados óbvios | [ ] |  |
| K7 | Avançar para P4 | após gerar | clicar Avançar/Next | label padronizada; não bloqueia (sprint 44) | [ ] |  |

## L. Phase 4 — Logística (tabs) (10 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| L1 | Aba Transport | P4 | abrir aba | formulário de segmentos | [ ] |  |
| L2 | Cadastrar voo | P4 Transport | preencher código, cia, horário | booking code cifrado no DB | [ ] |  |
| L3 | Aba Accommodation | P4 | abrir aba | form; limite 5 hospedagens | [ ] |  |
| L4 | Aba Mobility | P4 | abrir aba | grid de ícones multi-select | [ ] |  |
| L5 | Navegação livre entre tabs | P4 | pular etapas | permitido (sprint 44) | [ ] |  |
| L6 | Gerar plano AI | P4 final | submit | streaming plan; itinerário por dia; moeda correta | [ ] |  |
| L7 | Plan timeout | P4 | forçar lentidão | timeout 30s respeitado; mensagem clara | [ ] |  |
| L8 | Multi-city plan | P4 (SP→Rio→Floripa) | gerar | dias de trânsito marcados | [ ] |  |
| L9 | BOLA guard | P4 de outro user | tentar acesso cruzado | 403/404 (ver SEC audit) | [ ] |  |
| L10 | Acentuação em strings do plan | P4 pt | inspecionar output | diacríticos OK | [ ] |  |

## M. Phase 5 — Preferências/Orçamento (5 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| M1 | 10 categorias de preferências | P5 | navegar | chips selecionáveis em todas | [ ] |  |
| M2 | Persistência de preferências | P5 | salvar → voltar | valores preservados | [ ] |  |
| M3 | Paginação de preferências | P5 | próximo/anterior | estado preservado; sem perda | [ ] |  |
| M4 | Orçamento em moeda local | P5 internacional | inspecionar | moeda do destino correta | [ ] |  |
| M5 | Ausência de "Undecided" | P5 | verificar (sprint 44) | checkbox removido | [ ] |  |

## N. Phase 6 — Checklist (AI) (6 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| N1 | Checklist doméstico solo | P6 Bonito | gerar | categorias relevantes; números 190/192/193 | [ ] |  |
| N2 | Checklist família com crianças | P6 Orlando | gerar | itens pediátricos; documentos menores | [ ] |  |
| N3 | Checklist idosos | P6 Gramado | gerar | medicamentos, acessibilidade | [ ] |  |
| N4 | Checklist restrições alimentares | P6 Tokyo en | gerar | cards de tradução, alergias | [ ] |  |
| N5 | Marcar item como concluído | qualquer checklist | toggle | progresso salvo | [ ] |  |
| N6 | Reset/regerar checklist | P6 | regenerar | preserva marcações onde possível | [ ] |  |

## O. Summary & Resumo da Expedição (4 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| O1 | Summary agrega 6 fases | `/pt/expedition/{id}/summary` | abrir | dados de todas as fases presentes | [ ] |  |
| O2 | Edit links por seção | summary | clicar "editar" em bloco | leva à fase correspondente | [ ] |  |
| O3 | Booking code mascarado | summary Transport | inspecionar | parcialmente oculto (ex: `***1234`) | [ ] |  |
| O4 | BOLA — summary alheio | `/pt/expedition/{otherId}/summary` | acessar | negado | [ ] |  |

## P. Gamificação Atlas (5 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| P1 | Pontos por ação | qualquer ação rastreada | executar | transaction criada; saldo atualiza | [ ] |  |
| P2 | Badges no perfil | `/pt/profile` | inspecionar | badges desbloqueados visíveis | [ ] |  |
| P3 | Header com progresso | qualquer `/pt/(app)/*` | inspecionar | componente Atlas visível e traduzido | [ ] |  |
| P4 | Trip readiness | `/pt/expeditions/{id}` | inspecionar | score reflete fases concluídas | [ ] |  |
| P5 | ProgressiveProfile — pontos por campo | `/pt/profile` | preencher campo | pontos creditados imediatamente | [ ] |  |

## Q. Profile & Conta (5 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| Q1 | Editar nome | `/pt/profile` | alterar e salvar | persistido; log não vaza userId bruto (ver BUG-S7-001) | [ ] |  |
| Q2 | Accordion de perfil progressivo | `/pt/profile` | expandir seções | funciona sem layout break | [ ] |  |
| Q3 | Deletar conta | `/pt/account/delete` | fluxo de confirmação | soft delete; redireciona para `/pt` | [ ] |  |
| Q4 | Alterar senha | `/pt/account` | fluxo | validação + sucesso | [ ] |  |
| Q5 | Trocar idioma de perfil | `/pt/profile` | mudar preferência | persistido; aplicado em emails transacionais | [ ] |  |

## R. AI — Guardrails e Erros (5 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| R1 | Prompt injection no destino | P1 destino `"ignore previous instructions"` | submit | sanitizado; output limpo | [ ] |  |
| R2 | Texto sensível em notas | campo travelNotes | inserir PII | output não ecoa PII | [ ] |  |
| R3 | Menor de 18 → AI bloqueada | R2 com profile 17 anos | tentar | bloqueado + mensagem traduzida | [ ] |  |
| R4 | Mensagem de erro específica | forçar erro na AI | observar UI | mensagem específica, não genérica (ver sprint 44) | [ ] |  |
| R5 | Sem leak de system prompt | qualquer saída AI | pesquisar "system:" | zero ocorrências | [ ] |  |

## S. Security / Observability (8 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| S1 | Headers CSP em páginas | qualquer `/pt/*` | DevTools → Network | CSP presente com nonce | [ ] |  |
| S2 | Headers em `/api/*` | DevTools `/api/destinations/search` | verificar | ver CSP-001 no SECURITY-OBSERVABILITY-REPORT | [ ] |  |
| S3 | Rate limit em `/api/destinations/search` | curl 30 calls/min | observar | 429 após threshold | [ ] |  |
| S4 | Logs sem PII | Vercel logs | filtrar 1h | zero emails/CPF em logs | [ ] |  |
| S5 | ENCRYPTION_KEY setado | env staging | `vercel env ls` | presente (ENV-001) | [ ] |  |
| S6 | CVE Next.js GHSA-q4gf-8mx6-v5v3 | package.json | `npm ls next` | versão patched | [ ] |  |
| S7 | Session cookies flags | DevTools | inspecionar cookies | HttpOnly + Secure + SameSite=Lax | [ ] |  |
| S8 | Logout invalida server-side | DevTools | sair + tentar rota protegida | 401/redir para login | [ ] |  |

## T. Performance & Reliability (6 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| T1 | LCP landing | `/pt` | Lighthouse | LCP < 2.5s | [ ] |  |
| T2 | CLS em dashboard | `/pt/expeditions` | Lighthouse | CLS < 0.10 | [ ] |  |
| T3 | Streaming P3 sem travar UI | P3 | gerar | input continua responsivo | [ ] |  |
| T4 | Reduced motion | `prefers-reduced-motion: reduce` | inspecionar | animações desabilitadas | [ ] |  |
| T5 | Erros 5xx amostra | Vercel logs | 1h de tráfego | < 1% | [ ] |  |
| T6 | Retry de rede | P3/P6 (offline→online) | simular flaky | requisição recupera | [ ] |  |

## U. Acessibilidade (7 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| U1 | Nav via teclado | qualquer página | só teclado | todos interativos focáveis; ordem lógica | [ ] |  |
| U2 | Focus visible | qualquer página | Tab | anel de foco visível | [ ] |  |
| U3 | Screen reader — formulários | login/register | NVDA/VoiceOver | labels lidos | [ ] |  |
| U4 | Contraste WCAG AA | páginas principais | axe DevTools | sem violações AA | [ ] |  |
| U5 | ARIA — loading | loading.tsx | DevTools | aria-label em pt (ver BUG-S7-006) | [ ] |  |
| U6 | Skip link | landing | Tab primeiro | "Skip to main content" funciona | [ ] |  |
| U7 | Leitor de tela em AI streaming | P3 | VoiceOver | anúncio de progresso acessível | [ ] |  |

## V. FinOps (3 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| V1 | Custo por expedition | Vercel logs / metric | medir AI spend | Gemini Flash ~$0.004, Haiku ~$0.052, mix 95/5 ~$0.006 (ver AI-VALIDATION-REPORT) | [ ] |  |
| V2 | Model mismatch no log | plan log entry | inspecionar | SE ainda reportando "claude-sonnet-4-6" → registrar BUG-AI-002 | [ ] |  |
| V3 | Token budget por fase | `pf:eval` local | rodar grader performance | todos within budget | [ ] |  |

## W. Smoke cross-browser (3 items)

| ID | Description | URL | Steps | Expected | Status | Notes |
|----|-------------|-----|-------|----------|:------:|-------|
| W1 | Firefox desktop | `/pt` + login + expedition | smoke | sem regressões visíveis | [ ] |  |
| W2 | Safari iOS | `/pt` + login | smoke | sem regressões visíveis | [ ] |  |
| W3 | Chrome mobile (devtools) | `/pt/(app)/*` | smoke | layouts responsivos | [ ] |  |

---

## Sumário

| Categoria | Total | Pass | Fail | Blocked | N/A |
|-----------|------:|-----:|-----:|--------:|----:|
| A. Auth — Login | 7 | | | | |
| B. Auth — Registro | 6 | | | | |
| C. Auth — Recovery | 3 | | | | |
| D. i18n | 5 | | | | |
| E. Landing + Header/Footer | 6 | | | | |
| F. Onboarding + AI Consent Modal | 6 | | | | |
| G. Navegação autenticada | 6 | | | | |
| H. Dashboard / Expeditions | 7 | | | | |
| I. Phase 1 — Setup | 6 | | | | |
| J. Phase 2 — Passageiros | 5 | | | | |
| K. Phase 3 — Guia (AI) | 7 | | | | |
| L. Phase 4 — Logística | 10 | | | | |
| M. Phase 5 — Preferências | 5 | | | | |
| N. Phase 6 — Checklist (AI) | 6 | | | | |
| O. Summary | 4 | | | | |
| P. Gamificação | 5 | | | | |
| Q. Profile & Conta | 5 | | | | |
| R. AI — Guardrails | 5 | | | | |
| S. Security | 8 | | | | |
| T. Performance | 6 | | | | |
| U. Acessibilidade | 7 | | | | |
| V. FinOps | 3 | | | | |
| W. Cross-browser | 3 | | | | |
| **Total** | **131** | | | | |

> **Nota:** contagem oficial = **131** (atualizado em 2026-04-17: seção F expandida de 4 para 6 itens com F5/F6 para SPEC-PROD-056 AI Consent Modal).

---

## Bloqueadores identificados durante a validação

> _Registre aqui todo item marcado como `F` ou `B`, ligando ao BUG-* existente ou criando novo. Feche a sessão apontando 3 prioridades para a próxima iteração._

| # | Item | Severidade (P0/P1/P2/P3) | BUG-* | Nota curta |
|---|------|:------------------------:|-------|-----------|
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |

## Assinatura

| Papel | Nome | Data | Go/No-Go |
|------|------|------|:--------:|
| Product Owner |  |  | [ ] |
| QA Engineer |  |  | [ ] |
| Tech Lead |  |  | [ ] |
