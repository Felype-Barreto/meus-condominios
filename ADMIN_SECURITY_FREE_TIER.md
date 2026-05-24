# Segurança do /admin no Free Tier

Este guia reforça o painel interno do Meus Condomínios usando recursos gratuitos ou nativos: Supabase Auth, tabela interna de papéis, allowlist por e-mail, host permitido, MFA, noindex, headers, rate limit simples e Turnstile nas rotas sensíveis.

Objetivo: nunca liberar `/admin` apenas porque alguém conseguiu criar conta. O acesso interno exige camadas.

## Camadas obrigatórias

Para acessar `/admin`, o usuário precisa passar por todas:

1. Estar autenticado no Supabase Auth.
2. Ter e-mail na allowlist de admin.
3. Estar ativo na tabela `platform_admin_users`.
4. Acessar por host permitido, quando `ADMIN_ALLOWED_HOSTS` estiver configurado.
5. Ter MFA verificado para `platform_owner` e `platform_admin`, quando Supabase Auth MFA estiver disponível/configurado.
6. Passar pelas checagens server-side de papel em cada rota/action.

Env recomendado:

```env
ADMIN_ALLOWED_EMAILS=codeflowbr1@gmail.com
ADMIN_ALLOWED_HOSTS=localhost:3000,admin.seudominio.com
ADMIN_REQUIRE_MFA=true

PLATFORM_OWNER_EMAILS=codeflowbr1@gmail.com
PLATFORM_ADMIN_EMAILS=
PLATFORM_SUPPORT_EMAILS=
PLATFORM_FINANCE_EMAILS=
PLATFORM_SECURITY_EMAILS=
PLATFORM_READONLY_EMAILS=
PLATFORM_ADMIN_REQUIRE_2FA=true
```

Notas:

- `ADMIN_ALLOWED_EMAILS` é a allowlist geral mínima.
- `PLATFORM_*_EMAILS` define o teto operacional por papel.
- A tabela `platform_admin_users` é obrigatória. Env sozinho não libera admin.
- `ADMIN_ALLOWED_HOSTS` deve conter o host usado em produção e `localhost:3000` para desenvolvimento.

## Criar o primeiro platform_owner

1. Crie uma conta normal pelo Meus Condomínios com o e-mail interno, por exemplo `codeflowbr1@gmail.com`.
2. Confirme o e-mail no Supabase Auth.
3. No Supabase SQL Editor, localize o profile:

```sql
select id, email
from public.profiles
where lower(email) = lower('codeflowbr1@gmail.com');
```

4. Insira o primeiro dono da plataforma:

```sql
insert into public.platform_admin_users (
  id,
  user_id,
  role,
  status,
  require_2fa,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  id,
  'platform_owner',
  'active',
  true,
  now(),
  now()
from public.profiles
where lower(email) = lower('codeflowbr1@gmail.com')
on conflict (user_id) do update set
  role = excluded.role,
  status = 'active',
  require_2fa = true,
  updated_at = now();
```

5. Configure na Vercel:

```env
ADMIN_ALLOWED_EMAILS=codeflowbr1@gmail.com
PLATFORM_OWNER_EMAILS=codeflowbr1@gmail.com
ADMIN_REQUIRE_MFA=true
PLATFORM_ADMIN_REQUIRE_2FA=true
```

6. Ative MFA no Supabase Auth para esse usuário quando o recurso estiver configurado.
7. Acesse `/admin`.

Se MFA ainda não estiver disponível/configurado, o Meus Condomínios bloqueia o painel e mostra instrução de ativação para `platform_owner` e `platform_admin`. Para desenvolvimento local, só desative temporariamente com:

```env
ADMIN_REQUIRE_MFA=false
PLATFORM_ADMIN_REQUIRE_2FA=false
```

Não use essas flags desativadas em produção.

## Host permitido

Use:

```env
ADMIN_ALLOWED_HOSTS=localhost:3000,admin.seudominio.com
```

Com isso:

- `/admin` em host não permitido retorna 404.
- Isso reduz exposição acidental em domínios de preview ou hosts desconhecidos.
- Não substitui autenticação, RLS ou papel interno.

Se o admin ficar no mesmo domínio principal, configure:

```env
ADMIN_ALLOWED_HOSTS=localhost:3000,meuscondominios.com,www.meuscondominios.com
```

## MFA

Regra inicial:

- `platform_owner`: MFA obrigatório.
- `platform_admin`: MFA obrigatório.
- demais papéis podem ser obrigados pela coluna `require_2fa`, conforme operação.

Boas práticas:

- usar e-mail exclusivo para admin;
- usar senha gerada por gerenciador;
- mínimo recomendado: 18 caracteres;
- MFA obrigatório;
- guardar recovery codes offline;
- não compartilhar conta admin;
- revisar acessos mensalmente.

O Meus Condomínios não controla senha manualmente. Senha, recuperação e MFA devem ficar no Supabase Auth.

## Noindex, sitemap e robots

Proteções implementadas:

- `/admin` não entra no sitemap.
- `robots.txt` bloqueia `/admin/`.
- layout do admin usa metadata `noIndex`.
- headers em `/admin/:path*`:
  - `X-Robots-Tag: noindex, nofollow, noarchive`
  - `Cache-Control: no-store, max-age=0`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` restritiva

## Rate limit e Turnstile

O proxy aplica rate limit básico por IP para `/admin`. Essa proteção é leve e gratuita, adequada para início, mas não substitui Cloudflare/WAF.

Use Turnstile em:

- cadastro;
- login, se houver abuso;
- recuperação de senha, se customizada;
- suporte;
- denúncia;
- QR público;
- ações admin sensíveis no futuro, se houver suspeita.

Env:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

## Sessão curta e reautenticação

Recomendação operacional no Supabase Auth:

- reduzir duração de sessão para contas internas, se possível;
- exigir MFA;
- revisar sessões ativas;
- para ações críticas, pedir motivo e registrar audit log;
- implementar reautenticação adicional antes de ações destrutivas quando a operação crescer.

Ações críticas incluem:

- revelar dado sensível;
- alterar plano manualmente;
- aprovar/rejeitar reembolso;
- suspender condomínio;
- bloquear usuário;
- exportar dados LGPD;
- alterar configuração global.

## Mascaramento e logs

Regra:

- dados sensíveis aparecem mascarados por padrão;
- revelar exige motivo;
- revelação registra `sensitive_access_logs`;
- ação administrativa registra `platform_admin_audit_logs`.

Campos sensíveis:

- telefone;
- e-mail;
- documento;
- nome completo de morador em contexto sensível;
- dados de visitante;
- dados de pagamento;
- links privados;
- payloads;
- conteúdo de denúncia;
- conteúdo de solicitação privada;
- anexos.

## Nunca fazer

- Nunca colocar `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nunca criar env pública com token, segredo ou service role.
- Nunca guardar token sensível em `localStorage`.
- Nunca cachear dados sensíveis.
- Nunca registrar secrets em logs.
- Nunca exibir payload completo de webhook no painel.
- Nunca liberar `/admin` apenas por env sem `platform_admin_users`.
- Nunca usar conta pessoal comum como admin sem MFA.

## Checklist final

- [ ] `ADMIN_ALLOWED_EMAILS` configurado.
- [ ] `ADMIN_ALLOWED_HOSTS` configurado.
- [ ] Usuário existe em `profiles`.
- [ ] Usuário ativo em `platform_admin_users`.
- [ ] Papel correto definido.
- [ ] `require_2fa=true` para dono/admin.
- [ ] `PLATFORM_OWNER_EMAILS` ou papel equivalente configurado.
- [ ] MFA ativo no Supabase Auth.
- [ ] `/admin` fora do sitemap.
- [ ] `robots.txt` bloqueia `/admin`.
- [ ] Headers `noindex` e `no-store` ativos.
- [ ] Rate limit básico ativo no proxy.
- [ ] Turnstile ativo em rotas sensíveis.
- [ ] Service role ausente do frontend.
- [ ] Dados sensíveis mascarados.
- [ ] Revelação de dado exige motivo.
- [ ] Logs de admin e acesso sensível funcionando.

## Testes manuais

1. Acessar `/admin` sem login: deve redirecionar.
2. Acessar `/admin` com usuário comum: deve redirecionar para `/app`.
3. Acessar com e-mail fora da allowlist: bloqueado.
4. Acessar com e-mail na allowlist, mas sem `platform_admin_users`: bloqueado.
5. Acessar com registro inativo: bloqueado.
6. Acessar por host fora de `ADMIN_ALLOWED_HOSTS`: 404.
7. Acessar como `platform_owner` sem MFA: tela de bloqueio/instrução.
8. Revelar dado sensível sem motivo: bloqueado.
9. Revelar dado sensível com motivo: log criado.
10. Confirmar que `/admin` não aparece em `/sitemap.xml`.
