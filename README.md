# Meus Condomínios

Meus Condomínios é um SaaS web para gestão simples, segura e moderna de condomínios. O produto ajuda síndicos, administradores, guarita, moradores e proprietários a organizar comunicados, reservas, encomendas, solicitações, convites, QR público, WhatsApp e permissões por cargo.

Contato oficial: `codeflowbr1@gmail.com`

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS
- Componentes no estilo shadcn/ui
- Supabase Auth, Postgres, Storage e RLS
- Zod, React Hook Form e TanStack Query
- date-fns, lucide-react, next-themes e qrcode.react

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

Observação: os scripts usam Webpack para evitar problemas em alguns ambientes Windows com pastas acentuadas.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e configure:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ECONOMY_MODE=true
ECONOMY_MODE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=morai-documents
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WABA_ID=
WHATSAPP_GRAPH_API_VERSION=v20.0
```

Para aplicar migrations por script, use `supabase/.temp/deploy.env`:

```bash
SUPABASE_ACCESS_TOKEN=your-supabase-personal-access-token
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_DB_PASSWORD=your-database-password
```

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, senha do banco, tokens Supabase ou tokens WhatsApp em código client.

## Supabase

1. Crie um projeto no Supabase.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Ative Auth por e-mail e revise redirects.
4. Aplique as migrations.
5. Confirme RLS, policies e bucket privado.

Aplicar migrations:

```bash
npm run supabase:api-apply
```

Ou com CLI:

```bash
npm run supabase:login
npm run supabase:link
npm run supabase:push
```

## Controle de custo no Supabase

O Meus Condomínios foi ajustado para começar em infraestrutura gratuita/baixo custo sem abrir mão de segurança básica:

- Realtime não é usado por padrão nas telas internas. Prefira refetch manual, polling leve ou atualização após action.
- Dashboards devem buscar resumos e listas pequenas, nunca carregar todos os registros do condomínio.
- Não use `select("*")` em queries novas. Selecione apenas as colunas necessárias.
- Listas operacionais devem ter paginação ou `limit` claro: apartamentos, avisos, reservas, solicitações, encomendas, logs, suporte, denúncias, admin e analytics.
- Analytics interno deve usar metadata mínima em `product_events` e agregação em `platform_analytics_daily` para relatórios maiores.
- Storage deve ser privado, com URLs assinadas e limite por plano: Free 30 MB, Premium 500 MB, Pro 3 GB e Total 20 GB.
- Uploads precisam respeitar limite por arquivo e plano. Imagens devem ser comprimidas antes do upload quando houver componente de upload.
- Logs não devem guardar payloads grandes, secrets, tokens, telefone em claro sem necessidade ou corpo completo de mensagens em analytics.
- Ações que criam volume passam por `src/lib/cost-control.ts`, com bloqueio aos 100%, aviso a partir de 80% do limite mensal e alerta de storage a partir de 70%.
- QR público, convites, uploads, suporte, denúncias e criação de registros devem ter rate limit ou validação server-side.

Funções principais:

- `getCostRisk(condoId)`
- `getStorageUsage(condoId)`
- `getMonthlyUsage(condoId)`
- `canRunExpensiveQuery(userId, action)`
- `blockIfCostRiskHigh(condoId, action)`

Guia detalhado: [docs/COST_CONTROL.md](docs/COST_CONTROL.md).

### Modo econômico

Para rodar bem em Vercel Hobby e Supabase Free, mantenha:

```bash
NEXT_PUBLIC_ECONOMY_MODE=true
ECONOMY_MODE=true
```

Quando ativo:

- bloqueia Realtime por padrão, exportação PDF, relatórios pesados, WhatsApp automático real, lotes grandes, uploads grandes, anexos em massa, analytics detalhado, logs verbosos e tarefas agendadas frequentes;
- mantém WhatsApp manual, AdSense no Free, paginação curta, dashboards resumidos, lazy loading, cache seguro de páginas públicas, Turnstile em rotas sensíveis e rate limit forte;
- mostra no `/admin` o card "Modo econômico ativo", com uso estimado de storage, banco, WhatsApp, alertas de custo e recomendações de upgrade;
- para usuários finais, recursos limitados aparecem como "Disponível em planos pagos" ou "Em configuração", sem mensagem técnica.

Arquivos principais:

- `src/lib/economy-mode.ts`
- `src/hooks/useEconomyMode.ts`
- `src/components/admin/economy-mode-banner.tsx`

### AdSense no plano Free

O AdSense é opcional e nunca deve atrapalhar a operação do condomínio.

Configure:

```bash
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT=0000000000
```

Regras aplicadas:

- anúncios aparecem apenas para condomínios no plano `free`;
- planos pagos nunca veem AdSense;
- anúncios respeitam consentimento de cookies de anúncios;
- se as envs estiverem vazias, o app não quebra;
- no app interno, o anúncio fica em card branco lateral no desktop;
- no mobile, anúncios internos ficam ocultos para não prejudicar a experiência;
- `/admin`, QR público, login, cadastro, checkout, privacidade, termos, cookies, LGPD e páginas sensíveis não exibem anúncios;
- páginas internas sensíveis como assinatura, configurações, permissões, segurança, suporte, moradores, documentos, ocorrências e perfil não exibem anúncios.

No `/admin`, o card “Free com anúncios” mostra quantos condomínios Free poderiam exibir anúncios e avisa se `NEXT_PUBLIC_ADSENSE_CLIENT_ID` não estiver configurado.

## Cadastro e anti-bot

A tela `/cadastro` exige:

- nome;
- e-mail;
- senha;
- condomínio inicial;
- aceite dos Termos de Uso e Política de Privacidade;
- verificação anti-bot.

Em produção, configure Cloudflare Turnstile com `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`. Em ambiente local sem segredo, existe um desafio simples de desenvolvimento: digitar `CONDOMINIO`.

O aceite de termos é validado no frontend e no schema Zod antes de criar a conta.

## Fluxos principais

- Criar conta: `/cadastro`
- Entrar: `/entrar`
- Criar condomínio: `/app/novo-condominio`
- Cadastro por convite: `/convite/[token]`
- Painel interno: `/app/[condoId]/dashboard`
- QR público: `/visitante/[publicCode]`

O criador do condomínio vira `subscriber_admin`. Ele pode ser o síndico, convidar outro síndico ou definir depois.

## Papéis

- `subscriber_admin`: assinante principal, acesso máximo e não limitável por toggles.
- `admin`: administrador adicional, conforme permissões.
- `syndic`: síndico, conforme permissões liberadas.
- `doorman`: Guarita/Cancela, acesso limitado à rotina de portaria.
- `resident`: morador.
- `owner`: proprietário.

## Planos

- Grátis: 2 blocos, até 24 apartamentos, 1 admin, 1 síndico, 0 guarita, 2 áreas comuns, 30 MB storage, WhatsApp manual, 1 canal manual, anúncios e sem relatórios/exportação.
- Premium: até 4 blocos, 80 apartamentos, 2 admins, 2 síndicos, 1 guarita, 500 MB storage, permissões por toggle, 100 créditos WhatsApp/mês e 2 canais/grupos manuais.
- Pro: até 8 blocos, 240 apartamentos, 6 admins, 6 síndicos, 3 guaritas, 3 GB storage, relatórios, exportação CSV, 500 créditos WhatsApp/mês e até 6 canais/grupos.
- Total: até 20 blocos, 1000 apartamentos, 20 admins, 20 síndicos, 10 guaritas, 20 GB storage, multi-grupos avançado, relatórios completos, exportação CSV/PDF, 2.000 créditos WhatsApp/mês e até 20 canais/grupos.

Na criação inicial, o condomínio não escolhe plano manualmente: ele começa no plano real disponível para a conta/assinatura, que na estratégia free-first é `free`. Upgrades são feitos depois pela área de Assinatura/Superadmin.

Limites devem ser aplicados no backend por RPCs, triggers, policies e validações server-side.

Criação segura de condomínio:

- a tela `/app/novo-condominio` não tem seletor livre de plano;
- `getUserCurrentPlan(userId)` usa assinatura ativa/trialing válida e rebaixa para `free` quando não houver entitlement pago;
- `getCondominiumCreationEntitlement(userId)` retorna plano, label, limites e uso atual mostrado na UI;
- a action ignora `plan` enviado manualmente e repassa apenas o entitlement resolvido no servidor;
- a RPC `create_condominium_with_structure` resolve o plano novamente no banco via `subscriptions`;
- assinatura cancelada, expirada ou `past_due` não cria condomínio Premium/Pro/Total.

## WhatsApp e comunicação

O plano grátis usa apenas modo manual: copiar mensagem, compartilhar no WhatsApp e abrir WhatsApp. Automação depende de plano elegível, opt-in do morador, créditos disponíveis, configuração técnica e regras da plataforma oficial.

A Central de Comunicação organiza:

- canais do app;
- WhatsApp manual;
- WhatsApp oficial quando configurado;
- grupos por bloco ou escopo;
- templates;
- disparos;
- logs;
- créditos;
- relatórios;
- regras anti-vazamento para grupos.

Não use API não oficial. Não prometa disponibilidade absoluta de entrega, volume sem limite ou compatibilidade com qualquer grupo.

## Privacidade, LGPD e cookies

Páginas públicas:

- `/privacidade`
- `/termos`
- `/cookies`
- `/lgpd`
- `/seguranca`
- `/contato`

Diretrizes aplicadas:

- telefone oculto por padrão;
- QR público sem listagem de moradores;
- permissões por cargo;
- logs administrativos;
- WhatsApp automático somente com opt-in;
- AdSense apenas quando configurado, consentido e fora de telas sensíveis;
- canal de suporte, denúncia, exportação, correção e exclusão pelo e-mail oficial.

As páginas usam linguagem de apoio a boas práticas, sem prometer conformidade jurídica absoluta.

## PWA e mobile

O app possui manifest, ícones, tema, offline simples e service worker com cache restrito a assets públicos. Dados sensíveis, rotas `/api` e telas internas não devem ser cacheados.

No celular:

- bottom navigation por papel;
- sidebar vira drawer;
- tabelas viram cards;
- botões e inputs têm tamanho confortável;
- calendário usa visual próprio e carregamento dinâmico.

## Testes recomendados

```bash
npm run lint
npm run build
```

Teste manual:

1. Criar conta com aceite e captcha.
2. Entrar.
3. Criar condomínio.
4. Gerar convite de morador, síndico e guarita.
5. Aprovar morador pendente.
6. Verificar painel de morador, síndico e guarita.
7. Testar limites do plano grátis.
8. Testar QR público sem vazamento de dados.
9. Testar WhatsApp manual sem consumir crédito.
10. Confirmar que rotas `/app` não são indexadas.
11. Tentar criar condomínio enviando `plan=pro` manualmente como usuário Free e confirmar plano `free`.
12. Confirmar que usuário com assinatura `premium` ativa cria condomínio Premium.
13. Confirmar que assinatura `canceled` ou `past_due` cai para Free na criação.

## Checklist de pré-lançamento seguro

Checklist detalhado: [docs/pre-lancamento-seguro.md](docs/pre-lancamento-seguro.md).

Guias operacionais de infraestrutura enxuta:

- [Deploy free tier](DEPLOY_FREE_TIER.md)
- [Segurança do admin no free tier](ADMIN_SECURITY_FREE_TIER.md)
- [Free-first infrastructure](docs/FREE_FIRST_INFRASTRUCTURE.md)
- [Controle de custos](docs/COST_CONTROL.md)
- [Caminho de upgrade](docs/UPGRADE_PATH.md)

- [ ] Revisão jurídica externa de Termos, Privacidade, Cookies e LGPD.
- [ ] Configurar captcha real em produção.
- [ ] Confirmar redirects do Supabase Auth.
- [ ] RLS ativo em todas as tabelas internas.
- [ ] Policies testadas por papel.
- [ ] Service role ausente do frontend.
- [ ] Bucket de documentos privado.
- [ ] Upload com limite por plano e tipo de arquivo.
- [ ] QR público com rate limit e mensagens genéricas.
- [ ] WhatsApp automático com opt-in e opt-out.
- [ ] Logs de ações sensíveis.
- [ ] Exportação e exclusão de dados com fluxo operacional definido.
- [ ] Política de cancelamento e reembolso revisada.
- [ ] AdSense desativado em telas sensíveis.
- [ ] Canal de denúncia e suporte monitorado.
- [ ] Backups, monitoramento e alertas de erro configurados.

## Auditoria juridica/comercial antes de vender

Checklist de paginas e copy:

- [ ] Conferir paginas legais publicas: `/termos`, `/privacidade`, `/cookies`, `/lgpd`, `/politica-de-cancelamento`, `/cancelamento`, `/uso-aceitavel`, `/tratamento-de-dados`, `/seguranca`, `/contato` e `/suporte`.
- [ ] Confirmar links no footer: Termos, Privacidade, Cookies, Seguranca, Cancelamento, Uso aceitavel e Contato.
- [ ] Revisar copy comercial para evitar termos absolutos sobre seguranca, LGPD, entrega de WhatsApp, volume de mensagens ou compatibilidade com grupos.
- [ ] Conferir planos, precos, limites, creditos WhatsApp, add-ons, downgrade, bloqueios por limite e regras do plano gratis.
- [ ] Confirmar politica de reembolso, cancelamento, retencao e exportacao antes de venda real.

Revisao obrigatoria:

- Termos de Uso: responsabilidade do condominio, admin, sindico, moradores, uso proibido, suspensao e propriedade intelectual.
- Privacidade/LGPD: papeis de controlador/operador, dados coletados, finalidades, bases legais, compartilhamento, retencao e direitos dos titulares.
- Cookies/AdSense: consentimento, recusa, alteracao posterior e ausencia de anuncios em telas sensiveis.
- Cancelamento/reembolso: 7 dias quando aplicavel, pagamentos duplicados, add-ons, creditos WhatsApp, downgrade e inadimplencia.
- WhatsApp: opt-in, opt-out, creditos, logs, fallback manual, integracao sujeita a configuracao/elegibilidade e regras oficiais.
- QR publico: sem listagem publica, sem telefone, mensagens genericas, rate limit e logs com hash quando possivel.
- Suporte: e-mail visivel, chamados registrados, categorias claras e nenhum SLA prometido sem operacao pronta.
- Pagamentos: gateway real, notas/recibos, contestacao, estorno, impostos e plano ativo ate fim do ciclo quando essa for a regra contratada.

Orientacao: antes do lancamento comercial, revisar estes documentos com advogado brasileiro familiarizado com SaaS, LGPD, direito do consumidor, condominios e meios de pagamento.

## Riscos restantes

- A conformidade com LGPD depende do uso real do condomínio, da configuração de permissões e da revisão jurídica.
- Integração WhatsApp oficial depende de aprovação, configuração e regras da plataforma.
- Pagamentos e reembolsos precisam ser conectados a um gateway real antes da venda em escala.
- Fluxos críticos devem ganhar testes automatizados por papel.
- É necessário monitoramento em produção para erros, abuso e tentativas de enumeração.

## Checklist de seguranca multi-tenant

Use este roteiro sempre que aplicar migrations, mexer em permissoes ou publicar uma versao nova.

Auditoria Supabase:

```sql
select * from public.security_audit_snapshot();
```

- [ ] Todas as tabelas `public` com RLS ativo.
- [ ] Tabelas internas com policies e filtro por `condominium_id`.
- [ ] Usuario autenticado so acessa condominio onde tem `membership` ativa.
- [ ] Morador acessa apenas dados do proprio apartamento e informacoes gerais permitidas.
- [ ] Sindico e admin adicional respeitam toggles de permissao no backend.
- [ ] Guarita/Cancela nao acessa assinatura, financeiro, documentos restritos ou permissoes.
- [ ] `subscriber_admin` nao pode ser limitado por outro papel.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` existe apenas no servidor.
- [ ] Buckets de documentos, anexos, ocorrencias e encomendas privados.
- [ ] Arquivos salvos por caminho privado com prefixo do `condominium_id`.
- [ ] APIs e server actions validam Zod, permissao, plano e limite antes de gravar.
- [ ] WhatsApp automatico exige opt-in ativo, categoria permitida e credito disponivel.
- [ ] Webhook WhatsApp exige assinatura quando ativo.
- [ ] QR publico usa mensagens genericas, rate limit e logs com hashes.
- [ ] Logs registram convites, aprovacoes, rejeicoes, permissoes, disparos e bloqueios.

Testes manuais obrigatorios:

1. Morador A tentar abrir dados do morador B.
2. Morador tentar acessar outro condominio alterando a URL.
3. Guarita tentar acessar `/assinatura`, `/permissoes` e documentos restritos.
4. Sindico sem permissao tentar alterar plano ou permissoes.
5. Plano gratis tentar criar canal extra, automacao WhatsApp e recurso pago.
6. QR publico tentar enumerar apartamentos ou nomes em sequencia.
7. Usuario sem opt-in tentar receber WhatsApp automatico.
8. Link direto de arquivo privado tentar abrir sem URL assinada.

## Resposta a incidentes de seguranca

Rotas:

- Publica: `/seguranca/reportar`
- Interna: `/app/[condoId]/seguranca/incidentes`

Fluxo basico:

1. Usuario, morador, admin ou visitante reporta suspeita de vazamento, abuso, QR indevido, WhatsApp sem consentimento, pagamento ou acesso indevido.
2. O relato entra em `security_incidents` com severidade inicial `medium` e status `open`.
3. Admin autorizado ou `subscriber_admin` faz triagem, ajusta severidade, registra acoes tomadas e altera status.
4. Toda criacao/alteracao relevante gera `audit_logs`.
5. Exportacao CSV fica limitada aos planos Pro e Total e exige permissao.

Cuidados operacionais:

- Nao expor relato sensivel para moradores indevidos.
- Nao copiar dados pessoais para grupos de WhatsApp.
- Preservar logs antes de encerrar incidente.
- Usar `contained` quando o risco foi reduzido, mas a investigacao ainda nao acabou.
- Usar `resolved` apenas quando houver acao registrada e decisao clara.

## Exportacao, exclusao e retencao de dados

Rotas:

- Usuario: `/app/meus-dados`
- Exportacao do usuario: `/app/meus-dados/export`
- Condominio: `/app/[condoId]/configuracoes/dados`
- Exportacao do condominio: `/app/[condoId]/configuracoes/dados/export`
- Cancelamento: `/app/[condoId]/assinatura/cancelamento`

Regras:

- Pedidos ficam registrados em `data_requests`.
- Usuario pode solicitar exportacao, correcao, exclusao, portabilidade e revogacao de consentimento.
- Revogacao de WhatsApp deve ser imediata quando feita pelo proprio usuario.
- Morador nao pode solicitar exclusao do condominio inteiro.
- `subscriber_admin` pode solicitar exclusao do condominio.
- Exportacao completa do condominio exige plano Pro/Total e permissao `privacy.export_data`.
- Exclusao definitiva deve passar por revisao operacional para preservar logs criticos, cobranca, seguranca, backups e obrigacoes legais quando aplicavel.
- Prazo operacional sugerido apos solicitacao de exclusao do condominio: 30 dias para exportacao e revisao antes de acao definitiva.

## Suporte e contato

Rotas:

- Publicas: `/contato` e `/suporte`
- Usuario logado: `/app/suporte`
- Condominio: `/app/[condoId]/suporte`

Regras:

- Chamados ficam registrados em `support_tickets`.
- Categorias: duvida, cobranca, cancelamento, reembolso, problema tecnico, privacidade/LGPD, seguranca, WhatsApp e outro.
- Chamados publicos podem ser abertos sem login, com e-mail de retorno em `metadata`.
- Usuario logado ve seus proprios chamados.
- Admins autorizados veem chamados vinculados ao condominio.
- Chamados de seguranca e privacidade entram com prioridade mais alta.
- Nao informar SLA de atendimento enquanto ele nao estiver definido operacionalmente.
- Contato oficial: `codeflowbr1@gmail.com`.

## Painel interno Superadmin

Rota base: `/admin`.

Este painel e separado do painel dos condominios (`/app/[condoId]`) e serve para operacao interna do Meus Condomínios: condominios, usuarios, assinaturas, financeiro, reembolsos, suporte, denuncias, seguranca, incidentes, LGPD, analytics, WhatsApp, logs e configuracoes.

Papeis internos:

- `platform_owner`: acesso total.
- `platform_admin`: condominios, suporte e configuracoes gerais.
- `platform_support`: suporte e denuncias, com dados sensiveis mascarados.
- `platform_finance`: financeiro, assinaturas, reembolsos e cancelamentos.
- `platform_security`: seguranca, incidentes, logs e denuncias.
- `platform_readonly`: metricas e leitura geral.

Configuracao inicial:

1. Aplique as migrations, incluindo `platform_admin_users` e `platform_admin_audit_logs`.
2. Defina pelo menos um e-mail interno em `PLATFORM_OWNER_EMAILS`.
3. Mantenha `PLATFORM_ADMIN_REQUIRE_2FA=true` em producao.
4. Faca login com esse usuario e acesse `/admin`.
5. Para acesso persistente por banco, cadastre a equipe em `platform_admin_users`.

Variaveis:

```env
PLATFORM_OWNER_EMAILS=dono@exemplo.com
PLATFORM_ADMIN_EMAILS=
PLATFORM_SUPPORT_EMAILS=
PLATFORM_FINANCE_EMAILS=
PLATFORM_SECURITY_EMAILS=
PLATFORM_READONLY_EMAILS=
PLATFORM_ADMIN_REQUIRE_2FA=true
```

Regras de seguranca:

- Nenhum `service role` pode ir para o frontend.
- Todas as leituras sensiveis usam server components/actions.
- Usuarios normais sem papel interno sao redirecionados para `/app`.
- Dados sensiveis ficam mascarados por padrao.
- Pedido de revelar dado sensivel exige motivo e gera `platform_admin_audit_logs`.
- Acoes internas relevantes geram log com ator, papel, entidade e motivo quando aplicavel.
- Server actions sensiveis possuem limite simples por janela curta.
- O painel nao deve ser indexado nem cachear dados sensiveis.

Checklist manual do Superadmin:

- [ ] Usuario comum tentando `/admin` volta para `/app`.
- [ ] Usuario interno sem 2FA nao acessa em producao.
- [ ] `platform_support` nao acessa financeiro.
- [ ] `platform_finance` nao acessa configuracoes internas.
- [ ] `platform_readonly` nao altera status.
- [ ] Botao de revelar dados exige motivo.
- [ ] Logs aparecem em `/admin/logs`.
- [ ] Nao ha telefone, token, service role ou dado sensivel completo no HTML do cliente.

### Fluxo de reembolso, estorno e cancelamento

Rotas:

- `/admin/reembolsos`
- `/admin/reembolsos/[refundId]`
- `/admin/assinaturas`
- `/admin/assinaturas/[subscriptionId]`

Regras operacionais:

- `platform_owner`, `platform_admin` e `platform_finance` podem decidir reembolsos e alterar assinaturas.
- `platform_support` pode visualizar status basico e criar pedido de reembolso, mas nao aprovar, rejeitar ou marcar como processado.
- Toda decisao de reembolso exige nota em `decision_note`.
- Toda decisao gera `platform_admin_audit_logs` e um registro em `billing_events`.
- Enquanto gateway real nao existir, eventos ficam como `manual`/`registered` e devem ser conciliados fora da plataforma.
- Nao registrar ou exibir numero completo de cartao.
- Cancelamento imediato muda o status da assinatura operacional para `canceled`.
- Cancelamento ao fim do periodo grava a intencao em `condominiums.settings.billing_admin.cancel_at_period_end`.
- Alteracao manual de plano e credito manual exigem nota e geram evento de billing.
- Reembolsos dentro de 7 dias devem ser avaliados conforme politica de cancelamento/reembolso e regras do gateway.

Checklist de reembolso:

1. Conferir pedido, valor, motivo, gateway e data da compra.
2. Verificar se esta dentro do prazo de 7 dias quando aplicavel.
3. Conferir uso do plano, creditos WhatsApp e add-ons no periodo.
4. Registrar nota interna se houver contexto operacional.
5. Aprovar, rejeitar, aprovar parcial, solicitar mais informacoes ou marcar como processado.
6. Quando houver gateway integrado, confirmar retorno do provider antes de marcar como processado.

### Helpdesk interno de suporte

Rotas:

- `/admin/suporte`
- `/admin/suporte/[ticketId]`

Categorias:

- duvida
- cobranca
- cancelamento
- reembolso
- problema_tecnico
- privacidade_lgpd
- seguranca
- whatsapp
- outro

Status:

- `open`
- `waiting_customer`
- `in_progress`
- `resolved`
- `closed`

Regras:

- `platform_owner`, `platform_admin` e `platform_support` veem e gerenciam suporte geral.
- `platform_finance` ve apenas chamados de cobranca, cancelamento e reembolso.
- `platform_security` ve apenas chamados de seguranca e privacidade/LGPD.
- `platform_readonly` tem leitura limitada e nao altera chamados.
- Respostas ainda nao sao enviadas por e-mail externo; ficam registradas no historico interno com `external_email_sent=false`.
- Dados sensiveis continuam mascarados. Revelacao exige motivo e gera log.
- Chamados podem ser vinculados a condominio e usuario, convertidos em incidente, ou usados para criar pedido de reembolso.
- Atribuicao de responsavel usa usuarios internos cadastrados em `platform_admin_users`.

Checklist de suporte:

1. Filtrar por categoria/status/prioridade/responsavel.
2. Conferir se o chamado esta vinculado ao condominio e usuario corretos.
3. Registrar resposta interna ou nota antes de fechar.
4. Converter para incidente quando envolver seguranca, vazamento, abuso ou LGPD.
5. Criar pedido de reembolso apenas quando houver condominio vinculado.
6. Nao prometer prazo de atendimento se SLA operacional ainda nao existir.

### Denuncias e abuso no Superadmin

Rotas:

- `/admin/denuncias`
- `/admin/denuncias/[reportId]`

Tipos acompanhados:

- assedio
- exposicao de dados
- spam
- WhatsApp sem consentimento
- QR publico abusivo
- conteudo ofensivo
- tentativa de invasao
- uso indevido de dados
- outro

Status operacionais:

- `pending`
- `reviewing`
- `action_required`
- `resolved`
- `rejected`
- `escalated`

Regras:

- `platform_owner`, `platform_admin` e `platform_security` podem agir, bloquear usuario no condominio, suspender condominio, registrar decisao e converter em incidente.
- `platform_support` pode visualizar e comentar internamente, com dados mascarados.
- `platform_readonly` tem leitura limitada.
- `platform_finance` nao deve operar denuncias, exceto quando um caso for tratado por suporte/cobranca em fluxo separado.
- Denunciante nao deve ser exposto para usuarios do condominio.
- Dados sensiveis ficam mascarados por padrao; revelar exige motivo e gera log.
- Bloqueio de usuario atualiza o membership do usuario denunciado para `blocked` no condominio vinculado.
- Suspensao de condominio marca `subscription_status=blocked`.
- Toda acao em denuncia exige motivo e registra `platform_admin_audit_logs`.
- Conversao em incidente cria `security_incidents` com referencia para a denuncia.

Checklist de investigacao:

1. Verificar tipo, descricao, condominio, entidade relacionada e historico de acoes.
2. Conferir logs de plataforma, logs do condominio, QR publico, WhatsApp e acessos sensiveis.
3. Evitar expor dados pessoais em notas ou canais de grupo.
4. Registrar motivo antes de bloquear usuario, suspender condominio ou remover conteudo.
5. Converter em incidente quando houver suspeita de vazamento, QR abusivo, spam grave, acesso indevido ou risco de seguranca.
6. Fechar como resolvida ou rejeitada apenas com decisao registrada.

### Central de seguranca do Superadmin

Rotas:

- `/admin/seguranca`
- `/admin/incidentes`
- `/admin/incidentes/[incidentId]`
- `/admin/logs`

O painel mostra incidentes abertos, denuncias criticas, acessos sensiveis recentes, QR publico bloqueado, falhas de WhatsApp, mudancas de permissao, usuarios bloqueados e eventos criticos nas ultimas 24 horas.

Regras:

- `platform_owner`, `platform_admin` e `platform_security` podem criar e atualizar incidentes.
- Logs sensiveis de `sensitive_access_logs` ficam restritos a `platform_owner` e `platform_security`.
- Dados pessoais aparecem mascarados por padrao.
- Acoes como marcar log revisado, converter log em incidente e atualizar incidente exigem motivo.
- A tela de logs usa filtros e pagina visual para evitar carregar tudo de uma vez.
- Payloads completos, tokens, secrets, service role e webhooks nao devem ser exibidos ou copiados para notas.

Fluxo recomendado:

1. Revisar `/admin/seguranca` diariamente.
2. Abrir `/admin/logs` para filtrar periodo, fonte, acao, severidade e entidade.
3. Marcar logs revisados quando forem apenas rotina.
4. Converter log em incidente quando houver risco real ou duvida relevante.
5. Registrar acoes tomadas no detalhe do incidente.
6. Resolver ou descartar apenas com nota clara e auditavel.

### Pedidos LGPD e dados no Superadmin

Rotas:

- `/admin/lgpd`
- `/admin/lgpd/[requestId]`
- `/admin/lgpd/[requestId]/export`

Tipos de pedido:

- `export`
- `correction`
- `deletion`
- `portability`
- `consent_revocation`
- `privacy_question`

Status:

- `pending`
- `reviewing`
- `waiting_customer`
- `processed`
- `rejected`
- `canceled`

Regras:

- `platform_owner`, `platform_admin` e `platform_security` podem atender, concluir, rejeitar, gerar exportacao controlada e anonimizar quando apropriado.
- `platform_support` pode visualizar e acompanhar o atendimento basico, mas nao conclui, rejeita ou anonimiza.
- `platform_finance` nao acessa a area LGPD, salvo se o assunto for tratado por suporte/cobranca em fluxo separado.
- Dados sensiveis ficam mascarados por padrao; revelar exige motivo e gera log.
- Exclusao definitiva nao e automatica. Quando a exclusao total puder quebrar historico, auditoria, cobranca ou obrigacoes legais, usar anonimização controlada.
- Anonimizacao exige confirmacao textual `ANONIMIZAR`.
- Toda acao gera `platform_admin_audit_logs`.
- Exportacoes administrativas retornam JSON com `cache-control: no-store` e devem ser revisadas antes de entrega ao titular.

Fluxo recomendado:

1. Conferir tipo de pedido, solicitante, condominio e descricao.
2. Confirmar identidade antes de exportar, corrigir ou anonimizar dados.
3. Verificar se existem outros vinculos, consentimentos WhatsApp e pedidos relacionados.
4. Registrar motivo e resposta do atendimento.
5. Para exportacao/portabilidade, gerar JSON controlado e revisar antes de enviar.
6. Para exclusao, avaliar retencao, logs, cobranca e historico antes de anonimizar.
7. Finalizar como `processed`, `rejected` ou `canceled` apenas com justificativa.

### Analytics de produto no Superadmin

Rota:

- `/admin/analytics`

Eventos de produto:

- Tabela `product_events` guarda eventos internos com metadados minimos.
- Triggers registram criacao de condominio, convites, aprovacao de morador, avisos, reservas, encomendas, solicitacoes, QR publico, WhatsApp, canais, disparos, reembolsos e suporte.
- Nao salvar corpo de comunicado, telefone, e-mail, tokens, secrets, payload completo de webhook ou dados sensiveis em analytics.

Metricas acompanhadas:

- condominios criados e ativos;
- usuarios, moradores, sindicos e guaritas ativos;
- avisos, reservas, encomendas e solicitacoes;
- QR publico usado;
- convites enviados e convertidos;
- WhatsApp manual e automatico;
- canais configurados e templates;
- conversao gratis/pago;
- churn operacional;
- clientes em risco.

Clientes em risco sao sugeridos quando ha baixo uso, nenhum morador ativo, nenhum aviso em 30 dias, nenhuma reserva recente, muitos erros WhatsApp ou suporte critico aberto. O score e indicativo para acompanhamento humano, nao deve ser usado como decisao automatica de bloqueio ou cobranca.

### WhatsApp no Superadmin

Rotas:

- `/admin/whatsapp`
- `/admin/whatsapp/uso`
- `/admin/whatsapp/creditos`
- `/admin/whatsapp/logs`
- `/admin/whatsapp/erros`

Permissoes:

- `platform_owner` e `platform_admin` podem ajustar creditos, bloquear e reativar WhatsApp de condominios.
- `platform_finance` visualiza uso, creditos, receita de add-ons e risco de custo.
- `platform_support` visualiza erros/logs limitados e pode converter erro em chamado.
- `platform_security` visualiza bloqueios, falhas e abuso.
- `platform_readonly` tem leitura geral.

Regras de seguranca:

- Nao exibir telefone completo por padrao.
- Nao exibir payload completo, tokens, secrets ou credenciais Meta.
- Log sensivel revelado exige motivo e registra auditoria.
- Bloqueio de WhatsApp grava `settings.platform_whatsapp_disabled=true` no condominio e atualiza contas para `blocked`.
- Reativacao remove o bloqueio operacional e marca contas como `active`.
- Ajuste manual de credito cria trilha em `communication_addons` e `platform_admin_audit_logs`.
- Conversao de erro cria `support_tickets` com resumo seguro, sem payload sensivel.

### Mascaramento de dados no Superadmin

O painel `/admin` usa uma camada global de mascaramento para dados pessoais e operacionais sensiveis. Listagens comuns devem mostrar apenas valores mascarados, como `••••••`, e valores completos devem ser buscados somente por acao explicita no backend.

Utilitarios principais:

- `maskEmail`, `maskPhone`, `maskName`, `maskDocument`, `maskApartment`
- `canRevealSensitiveField(userRole, field, context)`
- `revealSensitiveField(input)`

Fluxo de revelacao:

1. O campo aparece mascarado no painel.
2. O usuario interno clica em `Revelar`.
3. O sistema exige motivo obrigatorio.
4. A server action valida papel interno, campo, contexto e rate limit.
5. O valor completo e buscado no backend.
6. A acao e registrada em `sensitive_access_logs` e `platform_admin_audit_logs`.
7. O valor e mostrado apenas no estado temporario da tela, sem `localStorage`.

Regras por papel:

- `platform_owner`: pode revelar com motivo.
- `platform_admin`: pode revelar campos operacionais, com restricoes para payloads e financeiro.
- `platform_support`: somente dados necessarios para atendimento.
- `platform_finance`: somente dados financeiros necessarios.
- `platform_security`: dados ligados a incidentes, logs, abuso, QR e seguranca.
- `platform_readonly`: nao revela dados sensiveis.

### Auditoria final do Superadmin

Criar o primeiro `platform_owner`:

1. Crie uma conta normal no Meus Condomínios.
2. Confirme que existe um registro correspondente em `profiles`.
3. Defina `PLATFORM_OWNER_EMAILS=email@dono.com` no `.env.local` ou no ambiente de producao.
4. Em producao, mantenha `PLATFORM_ADMIN_REQUIRE_2FA=true`.
5. Faca login com esse e-mail e acesse `/admin`.
6. Depois, opcionalmente, cadastre a equipe na tabela `platform_admin_users` com papel e `require_2fa=true`.

Protecao de `/admin`:

- O layout de `/admin` chama `requirePlatformSession`.
- Usuario comum sem papel interno e redirecionado para `/app`.
- 2FA e exigido quando `PLATFORM_ADMIN_REQUIRE_2FA` nao estiver `false`.
- Todas as mutacoes do Superadmin passam por server actions ou route handlers protegidos.
- O service role e usado apenas em server components/actions, nunca em componentes client.
- Nao salvar tokens, secrets, service role, senhas ou credenciais em `platform_settings`; use variaveis de ambiente.

Papeis internos:

- `platform_owner`: acesso total.
- `platform_admin`: gestao operacional, sem editar configuracoes criticas nem secrets.
- `platform_support`: suporte e denuncias, sem financeiro completo.
- `platform_finance`: financeiro, assinaturas, reembolsos e creditos, sem denuncias sensiveis.
- `platform_security`: seguranca, logs, incidentes e denuncias, sem alterar cobranca.
- `platform_readonly`: leitura limitada, sem actions de escrita e sem revelar dados sensiveis.

Fluxos auditados:

- Financeiro: `/admin/financeiro`, `/admin/assinaturas`, `/admin/reembolsos`.
- Condominios: `/admin/condominios` e detalhe do condominio.
- Suporte: `/admin/suporte` com timeline e notas internas.
- Denuncias: `/admin/denuncias` com decisao, bloqueio e conversao em incidente.
- Seguranca/incidentes/logs: `/admin/seguranca`, `/admin/incidentes`, `/admin/logs`.
- LGPD: `/admin/lgpd` com exportacao controlada e anonimização manual.
- Analytics: `/admin/analytics`, com metadados minimos.
- WhatsApp: `/admin/whatsapp`, uso, creditos, logs e erros.
- Configuracoes: `/admin/configuracoes`, com secoes de planos, WhatsApp, seguranca, suporte, legal e manutencao.
- Busca global: `Ctrl+K` e `/admin/busca`, com dados mascarados e auditoria para termos sensiveis.

Checklist tecnico do Superadmin:

- [ ] `/admin` bloqueia usuario normal.
- [ ] `platform_owner` consegue acessar todas as areas.
- [ ] `platform_admin` nao salva configuracoes criticas.
- [ ] `platform_support` nao aprova reembolso.
- [ ] `platform_finance` nao acessa denuncia sensivel.
- [ ] `platform_security` nao altera plano, assinatura ou reembolso.
- [ ] `platform_readonly` nao executa actions de escrita.
- [ ] Revelacao de dado sensivel exige motivo.
- [ ] `sensitive_access_logs` registra campo, alvo, ator e motivo.
- [ ] `platform_admin_audit_logs` registra actions internas.
- [ ] Rate limit bloqueia repeticao de actions sensiveis.
- [ ] RLS ativo nas tabelas internas novas.
- [ ] `platform_settings` permite leitura para papeis internos e escrita limitada por papel.
- [ ] Nenhum token, service role ou payload com segredo aparece no HTML do cliente.
- [ ] Build e lint passam antes do deploy.

### Calendario economico de reservas

- A tela de agendamentos busca apenas o intervalo visivel do FullCalendar via `/api/calendar/events`.
- A troca de mes, semana, dia ou lista gera uma nova consulta curta com `start` e `end`; nao carregue o ano inteiro no dashboard.
- Horarios livres sao lidos por area e dia via `/api/calendar/slots`.
- O backend valida limite de antecedencia por plano: Free 60 dias, Premium 180 dias, Pro 365 dias e Total 730 dias.
- Conflito, bloqueio, horario da area, permissao e limite mensal continuam validados antes da reserva ser gravada.
- A migration `20260522211000_booking_calendar_range_queries.sql` adiciona indices para consultas por faixa visivel.

Teste manual rapido:

1. Abra `/app/[condoId]/agendamentos`.
2. Navegue para outro mes e confirme no Network que a agenda consulta somente aquele intervalo.
3. Crie uma reserva em horario livre e confirme que eventos e cards de horario atualizam.
4. Tente reservar o mesmo horario duas vezes e confirme o bloqueio server-side.
5. Em conta Free, tente criar reserva alem de 60 dias e confirme a mensagem de limite.

## Deploy

1. Suba o repositório para GitHub.
2. Importe na Vercel.
3. Configure todas as variáveis de ambiente.
4. Rode `npm run build`.
5. Configure `NEXT_PUBLIC_APP_URL` com a URL final.
6. Adicione URLs de produção no Auth.
7. Aplique migrations no Supabase de produção.
8. Rode o checklist de pré-lançamento seguro.

## Próximos passos

- Integrar gateway de pagamento.
- Automatizar testes de RLS e papéis.
- Criar rotina operacional para exportação/exclusão de dados.
- Configurar monitoramento de erros e auditoria.
- Validar WhatsApp Business Cloud API em conta real.
- Fazer revisão jurídica final antes do lançamento comercial.
