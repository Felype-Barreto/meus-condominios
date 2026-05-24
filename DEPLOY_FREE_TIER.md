# Deploy Free Tier do Meus Condomínios

Este guia prepara o Meus Condomínios para começar com custo baixo usando Cloudflare Free, Vercel Hobby e Supabase Free. A ideia é validar o produto, controlar abuso e manter segurança básica antes de migrar para infraestrutura paga.

Importante: limites e regras comerciais de Cloudflare, Vercel e Supabase podem mudar. Antes de vender em escala, confira os limites atuais de cada fornecedor.

Nota de auditoria em 22/05/2026: a Vercel descreve o Hobby como plano pessoal e nao comercial. Use Hobby para desenvolvimento, teste e validacao inicial permitida pelo fornecedor; antes de operar clientes pagos em producao, confirme os termos atuais ou migre para Vercel Pro/hospedagem compativel.

## 1. Cloudflare Free

### Criar conta e adicionar domínio

1. Crie uma conta na Cloudflare.
2. Adicione o domínio principal, por exemplo `meuscondominios.com`.
3. A Cloudflare vai gerar dois nameservers.
4. No registrador do domínio, troque os nameservers atuais pelos nameservers da Cloudflare.
5. Aguarde a propagação.

### SSL/TLS

Configure:

- SSL/TLS: `Full`
- Always Use HTTPS: ativo
- Automatic HTTPS Rewrites: ativo
- Minimum TLS Version: TLS 1.2 ou superior

Use `Full (strict)` apenas quando o certificado de origem estiver corretamente configurado. Em Vercel, normalmente o domínio já recebe certificado válido automaticamente.

### DNS

Exemplo:

| Nome | Tipo | Valor | Proxy |
| --- | --- | --- | --- |
| `meuscondominios.com` | CNAME ou A conforme Vercel orientar | alvo da Vercel | laranja |
| `www` | CNAME | `cname.vercel-dns.com` ou alvo informado | laranja |
| `admin` | CNAME | alvo da Vercel, se usar subdomínio separado | laranja |

Se o `/admin` ficar no mesmo domínio, não precisa de subdomínio `admin`. O Meus Condomínios já protege `/admin` por autenticação e papéis internos.

### Regras básicas de segurança

No plano Free, mantenha simples:

- DDoS padrão da Cloudflare ativo.
- Bot Fight Mode, se disponível na sua conta.
- Security Level: `Medium`.
- Rate limiting via regras disponíveis no painel, quando possível.
- Bloquear países ou ASNs apenas se houver abuso real.

Sugestões de proteção:

- Exigir Turnstile em cadastro, suporte, denúncias e rotas sensíveis.
- Proteger `/api/security/verify-captcha`.
- Monitorar picos em `/visitante/[publicCode]`.
- Não expor service role, senha do banco ou tokens WhatsApp.

### Turnstile

1. Acesse Turnstile no painel da Cloudflare.
2. Crie um widget para o domínio de produção.
3. Adicione também `localhost` para teste local, se desejar.
4. Copie:
   - Site key
   - Secret key
5. Configure na Vercel:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`

### Robots/noindex para admin

O Meus Condomínios já deve manter `/admin` fora de indexação por:

- middleware/proteção de sessão;
- `robots.txt`;
- metadata `noindex` em áreas internas, quando aplicável.

Checklist:

- `/admin` não aparece no sitemap.
- `/app` não aparece no sitemap.
- `robots.txt` bloqueia áreas internas.
- Usuário normal acessando `/admin` é redirecionado.

## 2. Vercel Hobby

### Importar projeto

1. Suba o repositório para GitHub.
2. Acesse Vercel.
3. Clique em `Add New Project`.
4. Importe o repositório do Meus Condomínios.
5. Framework: Next.js.
6. Build command:

```bash
npm run build
```

7. Install command:

```bash
npm install
```

### Variáveis de ambiente

Configure envs em:

- Production
- Preview
- Development, se usar Vercel CLI

Nunca coloque secrets com prefixo `NEXT_PUBLIC_`.

Públicas:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`, opcional/alias se você decidir padronizar no futuro
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
- `NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT`
- `NEXT_PUBLIC_ECONOMY_MODE=true`

Privadas:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `TURNSTILE_SECRET_KEY`
- `ECONOMY_MODE=true`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_WABA_ID`
- `WHATSAPP_GRAPH_API_VERSION`
- `WHATSAPP_ESTIMATED_COST_CENTS`

Admin interno do Meus Condomínios:

- `PLATFORM_OWNER_EMAILS`
- `PLATFORM_ADMIN_EMAILS`
- `PLATFORM_SUPPORT_EMAILS`
- `PLATFORM_FINANCE_EMAILS`
- `PLATFORM_SECURITY_EMAILS`
- `PLATFORM_READONLY_EMAILS`
- `PLATFORM_ADMIN_REQUIRE_2FA=true`

Aliases pedidos que podem ser usados em documentação comercial/infra:

- `ADMIN_ALLOWED_EMAILS`: equivalente operacional a `PLATFORM_OWNER_EMAILS` e demais `PLATFORM_*_EMAILS`.
- `ADMIN_ALLOWED_HOSTS`: se for implementar restrição por host no futuro.
- `ADMIN_REQUIRE_MFA`: equivalente operacional a `PLATFORM_ADMIN_REQUIRE_2FA`.

### Domínio

1. Em Vercel, vá em Project Settings > Domains.
2. Adicione:
   - `meuscondominios.com`
   - `www.meuscondominios.com`
3. Siga o alvo DNS informado pela Vercel.
4. Mantenha o proxy laranja na Cloudflare quando estiver validado.

### Preview deployments

No Hobby, previews ajudam a testar antes de produção, mas cuidado:

- Não conecte preview a banco de produção se for testar dados reais.
- Use envs separadas quando possível.
- Evite rodar migrations automáticas em preview.
- Não configure service role de produção em branches de teste sem necessidade.

### Redirects e headers

Verifique:

- HTTP para HTTPS via Cloudflare.
- `www` para domínio principal, ou o contrário, mas escolha um canonical.
- Headers de segurança no Next/Vercel, se configurados em `next.config.ts`.
- `/admin` e `/app` sem cache público.

### Cuidados com Vercel Hobby

Use para início, validação e baixo tráfego.

Evite:

- jobs longos;
- relatórios pesados;
- geração de PDF em massa;
- processamento grande dentro de request;
- imagens pesadas sem compressão;
- uso comercial forte antes de migrar para Pro.

Mantenha `ECONOMY_MODE=true` enquanto estiver no Hobby.

## 3. Supabase Free

### Criar projeto

1. Crie um projeto Supabase.
2. Guarde:
   - Project URL
   - anon/publishable key
   - service role key
   - senha do banco
3. Configure no `.env.local` e na Vercel.

### Aplicar migrations

Opção por script:

```bash
npm run supabase:api-apply
```

Opção por CLI:

```bash
npm run supabase:login
npm run supabase:link
npm run supabase:push
```

Depois confirme:

- tabelas criadas;
- RLS ativo;
- policies aplicadas;
- seeds de planos em `plan_limits`;
- funções RPC criadas.

### Auth

Configure:

- Email auth ativo.
- Confirmação de e-mail conforme estratégia do produto.
- Site URL:
  - `https://meuscondominios.com`
- Redirect URLs:
  - `https://meuscondominios.com/**`
  - `https://www.meuscondominios.com/**`, se usar `www`
  - `http://localhost:3000/**` para local

Não deixe redirects amplos para domínios que você não controla.

### RLS

Checklist:

- RLS ativo em todas as tabelas internas.
- Usuário só acessa condomínio com membership ativa.
- Morador não vê outro apartamento.
- Síndico/admin respeitam permissões server-side.
- Guarita não acessa assinatura, logs sensíveis ou documentos restritos.
- Superadmin usa rota separada e server-side checks.

### Storage privado

Crie bucket privado, por exemplo:

- `morai-documents`

Regras:

- bucket privado;
- URLs assinadas com expiração;
- limite por plano;
- limite por arquivo;
- imagens comprimidas antes de upload;
- sem arquivo sensível público;
- documentos grandes apenas em planos pagos.

Limites free-first do Meus Condomínios:

- Free: 30 MB
- Premium: 500 MB
- Pro: 3 GB
- Total: 20 GB

No Meus Condomínios, além das server actions, a migration `20260522213000_storage_plan_limits_guard.sql` protege uploads diretos permitidos no bucket privado com limite por arquivo e limite total do plano.

### Backups no Free

Enquanto estiver no Supabase Free:

- faça exportações manuais periódicas;
- registre datas de backup;
- não prometa recuperação avançada sem plano pago;
- mantenha scripts/migrations versionados;
- teste restore em projeto separado antes de depender disso comercialmente.

### Monitoramento

Verifique semanalmente:

- database size;
- storage;
- auth users;
- logs de erro;
- uso de API;
- tabelas com crescimento rápido;
- `audit_logs`, `product_events`, `whatsapp_message_logs`, `qr_public_access_logs`.

## 4. Turnstile

Use Turnstile em formulários sensíveis:

- cadastro;
- login, se houver abuso;
- convite/cadastro por link;
- QR público;
- suporte;
- denúncia;
- recuperação de senha, se customizada.

Env:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

No modo local sem `TURNSTILE_SECRET_KEY`, o Meus Condomínios pode usar desafio simples de desenvolvimento. Em produção, configure Turnstile real.

## 5. Variáveis

Lista pedida para deploy free tier:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
ADMIN_ALLOWED_EMAILS=
ADMIN_ALLOWED_HOSTS=
ADMIN_REQUIRE_MFA=true
ECONOMY_MODE=true
NEXT_PUBLIC_ECONOMY_MODE=true
```

No código atual do Meus Condomínios, use também/como equivalente:

```env
NEXT_PUBLIC_APP_URL=https://meuscondominios.com
SUPABASE_STORAGE_BUCKET=morai-documents
NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT=
PLATFORM_OWNER_EMAILS=
PLATFORM_ADMIN_EMAILS=
PLATFORM_SUPPORT_EMAILS=
PLATFORM_FINANCE_EMAILS=
PLATFORM_SECURITY_EMAILS=
PLATFORM_READONLY_EMAILS=
PLATFORM_ADMIN_REQUIRE_2FA=true
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WABA_ID=
WHATSAPP_GRAPH_API_VERSION=v20.0
WHATSAPP_ESTIMATED_COST_CENTS=
```

Recomendação:

- Use `NEXT_PUBLIC_APP_URL` como URL principal do app enquanto o código estiver assim.
- Mantenha `NEXT_PUBLIC_SITE_URL` apenas se você adicionar suporte explícito a esse alias.
- Use `PLATFORM_*_EMAILS` em vez de `ADMIN_ALLOWED_EMAILS` para papéis internos granulares.
- Use `PLATFORM_ADMIN_REQUIRE_2FA` em vez de `ADMIN_REQUIRE_MFA`.

## 6. Quando migrar para pago

### Migrar Supabase Pro quando

- storage estiver perto do limite;
- banco estiver perto do limite;
- houver tráfego real recorrente;
- existirem clientes pagantes;
- precisar backup melhor;
- precisar mais retenção, performance ou suporte;
- logs e analytics começarem a crescer rápido.

### Migrar Vercel Pro quando

- uso do Hobby estiver perto do limite;
- o projeto virar comercial forte;
- precisar mais performance;
- precisar analytics/time/collaboration;
- tráfego real crescer;
- builds e serverless usage ficarem apertados.

### Migrar Cloudflare Pro quando

- houver ataques frequentes;
- precisar mais WAF rules;
- precisar firewall mais avançado;
- tráfego suspeito alto;
- QR público ou cadastro sofrerem abuso;
- precisar regras mais finas por país, ASN, path ou score.

### Ativar WhatsApp automático real quando

- houver margem financeira;
- plano pago estiver validado;
- opt-in/opt-out estiver testado;
- logs e créditos estiverem corretos;
- conta oficial Meta estiver configurada;
- suporte conseguir responder falhas.

## 7. Checklist final

Antes de publicar:

- [ ] `npm install` ok.
- [ ] `npm run lint` ok.
- [ ] `npm run build` ok.
- [ ] Domínio na Cloudflare ativo.
- [ ] DNS com proxy laranja.
- [ ] SSL/TLS Full ativo.
- [ ] Vercel com envs públicas e privadas.
- [ ] Supabase conectado.
- [ ] Migrations aplicadas.
- [ ] RLS ativo.
- [ ] Policies testadas.
- [ ] Storage privado.
- [ ] Auth redirects configurados.
- [ ] Turnstile real configurado.
- [ ] `/admin` protegido.
- [ ] `/admin` e `/app` fora de indexação.
- [ ] `ECONOMY_MODE=true`.
- [ ] `NEXT_PUBLIC_ECONOMY_MODE=true`.
- [ ] Planos em `plan_limits` corretos.
- [ ] Criação de condomínio usando plano real, sem seleção manual indevida.
- [ ] Plano Free com AdSense, limites e WhatsApp manual.
- [ ] WhatsApp automático real bloqueado no modo econômico.
- [ ] QR público com rate limit e mensagens genéricas.
- [ ] Suporte e denúncia funcionando.
- [ ] Backup/exportação manual planejado enquanto estiver no Free.

## Operação inicial recomendada

Comece assim:

- Cloudflare Free na frente.
- Vercel Hobby com modo econômico.
- Supabase Free com RLS e storage privado.
- WhatsApp manual.
- AdSense apenas no Free.
- Sem relatórios pesados.
- Sem PDF.
- Sem automação em massa.
- Monitoramento semanal de uso.

Quando o Meus Condomínios começar a pagar os próprios custos, migre primeiro o gargalo real: Supabase se banco/storage crescer, Vercel se tráfego/build/serverless apertar, Cloudflare Pro se abuso/ataque virar recorrente.
