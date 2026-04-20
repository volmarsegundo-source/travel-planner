# Analise de Seguranca: Rate Limit em /auth/forgot-password

**Data**: 2026-04-20
**Autor**: architect (atuando como security-specialist)
**Status**: Consulta — nenhuma alteracao de codigo
**Solicitante**: Product Owner (pedido de mudanca 3/15min para 5/hora)

---

## 1. Estado Atual

| Parametro | Valor |
|---|---|
| Chave | `pwd-reset:{ip}` |
| Limite | 3 requests |
| Janela | 900s (15 min) |
| Tipo | Fixed window (Lua INCR + EXPIRE, key inclui floor do timestamp) |
| Anti-enumeracao | Sim — sempre retorna `success: true` |
| Token TTL | 1 hora (Redis) |
| Email provider | Resend (100/dia free tier, 3k/mes) |
| Redis down | Fail-open (permite request) |

## 2. Comparacao de Politicas

| Metrica | 3/15min (atual) | 5/hora (proposta PO) | OWASP ASVS 4.0.3 / NIST 800-63B |
|---|---|---|---|
| Capacidade teorica/hora (single IP) | 12 (4 janelas x 3) | 5 | Nao especificam valor exato; recomendam "throttle after small number of attempts" |
| Capacidade teorica/24h (single IP) | 288 | 120 | — |
| Emails disparados/hora (se email existe) | ate 12 | ate 5 | — |
| Custo Resend/hora (atacante, 1 IP) | 12 emails (~0.36 USD se pago) | 5 emails (~0.15 USD) | — |
| Esgotamento free tier (100/dia) | ~8.3 horas | ~20 horas | — |
| UX: margem para typo | 3 tentativas, espera ate 15 min | 5 tentativas, espera ate 60 min | — |
| Burst tolerance | Melhor (janela curta, reseta rapido) | Pior (errou 5x, espera 1h inteira) | — |

**Conclusao numerica**: 5/hora e 2.4x mais restritiva que 3/15min em throughput absoluto (5 vs 12 por hora). E a opcao mais segura contra email bombing.

## 3. Vetores de Ataque

### 3.1 Email Bombing (principal risco)
Atacante dispara forgot-password repetidamente para um email-alvo, enchendo a caixa de entrada da vitima. Com 3/15min, um unico IP envia 12 emails/hora. Com 5/hora, envia 5. Ambos sao aceitaveis para single-IP, mas atacante com botnet de N IPs multiplica por N.

**Mitigacao complementar recomendada**: rate limit secundario por email-hash (ex: `pwd-reset:email:{sha256(email)}` com limite 3/hora). Isso impede que 100 IPs diferentes bombardeiem o mesmo email.

### 3.2 User Enumeration (mitigado)
Anti-enumeracao ja implementado — response e identica para email existente ou inexistente. Timing side-channel minimo (DB lookup vs early return). Risco residual aceitavel para pre-Beta.

### 3.3 DoS no Email Provider
Free tier Resend: 100/dia. Atacante com 1 IP esgota em ~8h (atual) ou ~20h (proposta). Com botnet, esgota em minutos em ambos os casos. Rate limit por email-hash e o controle real aqui.

### 3.4 Token Flooding (Redis)
Cada request para email valido cria chave Redis com TTL 1h. 120 requests/dia = 120 chaves. Impacto negligivel.

## 4. Risco: Carrier-Grade NAT (CGNAT)

Chave exclusivamente por IP significa que usuarios atras do mesmo CGNAT (operadoras moveis: Claro, Vivo, Tim no Brasil) compartilham o mesmo limite. Com 5/hora, e possivel que um usuario legitimo encontre o limite ja esgotado por outro usuario do mesmo carrier. Com 3/15min, o reset rapido (15 min) reduz o impacto.

**Recomendacao**: manter janela curta OU adicionar fingerprint secundario (session cookie anonimo, header User-Agent hash) para reduzir falsos-positivos CGNAT. Para MVP pre-Beta, risco aceitavel.

## 5. Recomendacao Final

| Opcao | Config | Pros | Contras |
|---|---|---|---|
| **A: Aceitar 5/hora** | `(5, 3600)` | Mais restritivo, simples, PO satisfeito | Janela longa penaliza typo (espera 1h), pior UX em CGNAT |
| **B: 3/30min (compromisso)** | `(3, 1800)` | 6/hora (meio-termo), janela curta, CGNAT-friendly | Ligeiramente menos restritivo que opcao A |
| **C: 5/hora + rate limit por email** | IP `(5, 3600)` + email `(3, 3600)` | Melhor protecao real contra bombing | Requer segundo checkRateLimit e hash do email na action |

**Recomendacao do arquiteto: Opcao C**. A mudanca para 5/hora sozinha e segura e mais restritiva que o atual, mas o rate limit por IP nao protege contra email bombing distribuido. Adicionar limite por email-hash (3/hora) resolve o vetor principal sem complexidade significativa — e uma segunda chamada a `checkRateLimit` com chave `pwd-reset:email:{sha256(email)}`.

Se o PO priorizar simplicidade para Beta, **Opcao A (5/hora) e aceitavel** com a ressalva de que email bombing distribuido fica como risco aceito ate pos-Beta.

## 6. Conformidade

- **OWASP ASVS v4.0.3 (2.2.1)**: "Verify that anti-automation controls are effective at mitigating [...] credential recovery." — Ambas as opcoes atendem.
- **NIST 800-63B (5.1.3.1)**: "The verifier SHALL limit the rate of login attempts." — Password reset nao e explicitamente coberto, mas best practice aplica throttle similar. 5/hora e conservador e alinhado.

---

**Decisao do PO pendente.**
