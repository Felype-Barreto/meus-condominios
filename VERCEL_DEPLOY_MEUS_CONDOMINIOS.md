# Deploy na Vercel - Meus Condomínios

## Ordem segura

1. Rodar `npm run lint` e `npm run build`.
2. Subir o código para GitHub.
3. Criar projeto na Vercel com o repositório.
4. Configurar as variáveis abaixo em Production.
5. Fazer deploy.
6. Configurar Supabase Auth com a URL da Vercel.
7. Testar login, cadastro, convite, QR público e admin.
8. Só depois apontar domínio próprio.

## URL temporária

Use inicialmente:

```env
NEXT_PUBLIC_APP_URL=https://meuscondominios.vercel.app
ADMIN_ALLOWED_HOSTS=meuscondominios.vercel.app
```

Se a Vercel gerar outro slug, use o slug real exibido no painel.

## Variáveis públicas

```env
NEXT_PUBLIC_APP_URL=https://meuscondominios.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://iucxekicwonacgbgsfqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ECONOMY_MODE=true
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT=
```

## Variáveis privadas

```env
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=morai-documents
TURNSTILE_SECRET_KEY=
ECONOMY_MODE=true
```

## Admin

```env
PLATFORM_OWNER_EMAILS=codeflowbr1@gmail.com
ADMIN_ALLOWED_EMAILS=codeflowbr1@gmail.com
ADMIN_ALLOWED_HOSTS=meuscondominios.vercel.app
PLATFORM_ADMIN_REQUIRE_2FA=true
ADMIN_REQUIRE_MFA=true
```

## Supabase Auth

Em Authentication > URL Configuration:

```text
Site URL:
https://meuscondominios.vercel.app

Redirect URLs:
https://meuscondominios.vercel.app/auth/callback
https://meuscondominios.vercel.app/app
https://meuscondominios.vercel.app/app/novo-condominio
```

Depois, quando comprar o domínio, adicione as mesmas rotas com o domínio próprio.

## Google OAuth

No Google Cloud, o redirect autorizado continua sendo o callback do Supabase:

```text
https://iucxekicwonacgbgsfqm.supabase.co/auth/v1/callback
```

No Supabase, ative Google Provider e coloque Client ID/Secret.

## Antes de abrir para usuários reais

- Rotacionar a `SUPABASE_SERVICE_ROLE_KEY`.
- Configurar Turnstile real.
- Confirmar e-mail SMTP real no Supabase.
- Testar conta comum tentando acessar `/admin`.
- Testar plano grátis bloqueando segundo condomínio.
- Testar convite de apartamento com Gmail.
- Testar QR público sem expor telefone automaticamente.
