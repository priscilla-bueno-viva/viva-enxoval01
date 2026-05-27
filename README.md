# 🧺 Controle de Enxoval — VIVA Stays

App web para controle do fluxo de enxoval por lavanderia (PW e ELIS), com pontos de controle A–N, talões, cruzamentos automáticos e gestão de usuários.

---

## 🚀 Deploy passo a passo

### Etapa 1 — Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e clique em **New project**
2. Preencha:
   - **Name:** `viva-enxoval`
   - **Database password:** (anote em local seguro)
   - **Region:** `South America (São Paulo)`
3. Aguarde o projeto criar (~2 min)
4. Vá em **SQL Editor** → clique em **New query**
5. Cole todo o conteúdo do arquivo `supabase-schema.sql` e clique em **Run**
6. Vá em **Project Settings → API** e anote:
   - `Project URL` → será o `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → será o `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Etapa 2 — Configurar autenticação no Supabase

1. Vá em **Authentication → Providers → Email**
2. Ative **Enable Email provider** e marque **Enable Email OTP (Magic Link)**
3. Vá em **Authentication → URL Configuration**
4. Em **Site URL**, coloque: `https://viva-enxoval.vercel.app` (ajuste após deploy)
5. Em **Redirect URLs**, adicione: `https://viva-enxoval.vercel.app/auth/callback`

### Etapa 3 — Subir código no GitHub

1. Acesse [github.com](https://github.com) e crie um **New repository** chamado `viva-enxoval`
2. No terminal (ou usando GitHub Desktop):
```bash
cd caminho/para/viva-enxoval
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU_USUARIO/viva-enxoval.git
git push -u origin main
```

### Etapa 4 — Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e clique em **Add New → Project**
2. Selecione o repositório `viva-enxoval`
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL do projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave anon do Supabase
4. Clique em **Deploy**
5. Após o deploy, copie a URL gerada (ex: `viva-enxoval.vercel.app`)
6. Volte ao Supabase → **Authentication → URL Configuration** e atualize com a URL real

### Etapa 5 — Criar os primeiros usuários gestores

1. Acesse o app e faça login com seu e-mail `@vivastays.co`
2. Verifique o link recebido no e-mail
3. No Supabase, vá em **Table Editor → user_profiles**
4. Encontre seu registro e edite o campo `is_gestor` para `true`
5. Repita para o David
6. A partir daí, novos usuários podem ser gerenciados pelo painel de **Gestão de Usuários** dentro do app

---

## 📁 Estrutura do projeto

```
src/
  app/
    page.tsx                    # Login
    dashboard/
      layout.tsx                # Sidebar + auth guard
      page.tsx                  # Home
      limpezas/                 # Upload arquivo limpezas
      deposito-limpo/           # Pontos A, B, C, D
      predio-limpo/             # Pontos E, F, G
      predio-sujo/              # Pontos H, I, J
      deposito-sujo/            # Pontos L, M, N
      cruzamentos/              # Verificação automática
      admin/                    # Gestão de usuários
  components/
    PontoForm.tsx               # Formulário reutilizável
    PecasForm.tsx               # Inputs de peças
  lib/
    supabase.ts                 # Client + constantes + padrões
```

## 🔐 Perfis de acesso

| Perfil | Módulos visíveis |
|---|---|
| Gestor | Tudo |
| deposito_limpo | Limpezas + Depósito Limpo (A·B·C·D) |
| predio_limpo | Prédio Limpo (E·F·G) |
| predio_sujo | Prédio Sujo (H·I·J) |
| deposito_sujo | Depósito Sujo (L·M·N) |

Perfis podem ser combinados. Prédios específicos podem ser restritos por usuário.
