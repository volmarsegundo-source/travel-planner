# Google OAuth — Passo a Passo para o Atlas

## Parte 1: Criar o Projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Faça login com sua conta Google
3. No topo, clique no seletor de projetos → **"Novo Projeto"**
4. Nome: `Atlas Travel Planner`
5. Clique **"Criar"** e aguarde
6. Selecione o projeto recém-criado no seletor

\---

## Parte 2: Configurar a Tela de Consentimento OAuth

1. No menu lateral: **APIs e Serviços → Tela de consentimento OAuth**
2. Tipo de usuário: **Externo** → Criar
3. Preencha:

   * Nome do app: `Atlas Travel Planner`
   * E-mail de suporte: seu e-mail
   * Logo: (opcional, pode pular)
   * Domínios autorizados:
* `vercel.app`
* (seu domínio de produção, se já tiver)
* E-mail do desenvolvedor: seu e-mail
4. Clique **"Salvar e continuar"**
5. **Escopos**: clique "Adicionar ou remover escopos"

   * Marque: `email`, `profile`, `openid`
   * Clique **"Atualizar"** → **"Salvar e continuar"**
6. **Usuários de teste**: adicione seu e-mail para testar
7. **"Salvar e continuar"** → **"Voltar ao painel"**

⚠️ IMPORTANTE: O app começa em modo "Teste" — só usuários que você
adicionar conseguem logar. Para liberar para todos, você precisa
"Publicar app" (botão no topo da tela de consentimento). O Google
pode pedir verificação, mas para escopos básicos (email/profile)
geralmente aprova rápido.

\---

## Parte 3: Criar as Credenciais OAuth

1. No menu lateral: **APIs e Serviços → Credenciais**
2. Clique **"+ Criar credenciais"** → **"ID do cliente OAuth"**
3. Tipo de aplicativo: **Aplicativo da Web**
4. Nome: `Atlas Web Client`
5. **Origens JavaScript autorizadas** — adicione TODAS:

```
   https://travel-planner-eight-navy.vercel.app
   http://localhost:3000
   ```

   (adicione também seu domínio de produção quando tiver)

6. **URIs de redirecionamento autorizados** — adicione TODOS:

   ```
   https://travel-planner-eight-navy.vercel.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```

   (adicione também para produção quando tiver)

7. Clique **"Criar"**
8. ✅ COPIE os dois valores que aparecem:

   * **ID do cliente** → este é o `GOOGLE\_CLIENT\_ID`
   * **Chave secreta do cliente** → este é o `GOOGLE\_CLIENT\_SECRET`

   \---

   ## Parte 4: Configurar no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **travel-planner**
3. Vá em **Settings → Environment Variables**
4. Adicione as 2 variáveis:

|Key|Value|Environments|
|-|-|-|
|GOOGLE\_CLIENT\_ID|(cole o ID do cliente)|Production, Preview|
|GOOGLE\_CLIENT\_SECRET|(cole a chave secreta)|Production, Preview|

5. Clique **"Save"** para cada uma
6. **Redeploy**: vá em **Deployments** → no deploy mais recente,
clique nos 3 pontinhos → **"Redeploy"**

\---

## Parte 5: Testar

1. Acesse: https://travel-planner-eight-navy.vercel.app
2. Na tela de login, o botão **"Entrar com Google"** deve aparecer
3. Clique e faça login com o e-mail que adicionou como usuário de teste
4. Deve redirecionar de volta ao Atlas logado

Se der erro, verifique:

* As URIs de redirect estão EXATAMENTE iguais (sem barra no final)
* As env vars foram salvas no Vercel
* O redeploy foi feito após salvar as env vars
* Seu e-mail está na lista de usuários de teste (enquanto app não publicado)

\---

## Parte 6: Publicar para Todos (quando pronto para Beta)

1. Volte em **Tela de consentimento OAuth**
2. Clique **"Publicar app"**
3. Confirme
4. Google revisa (para escopos básicos, geralmente aprova em 1-3 dias)
5. Após aprovado, qualquer pessoa com conta Google pode logar

\---

## Resumo das Env Vars

|Variável|Onde pegar|Status|
|-|-|-|
|GOOGLE\_CLIENT\_ID|Google Console → Credenciais|FAZER|
|GOOGLE\_CLIENT\_SECRET|Google Console → Credenciais|FAZER|
|APPLE\_ID|Apple Developer (requer conta $99/ano)|ADIADO|
|APPLE\_SECRET|Apple Developer (requer conta $99/ano)|ADIADO|



