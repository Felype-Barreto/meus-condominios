# Meus Condomínios: infraestrutura free-first

Este guia define como iniciar o Meus Condomínios com infraestrutura gratuita ou de baixo custo, sem abrir mão de segurança básica. A meta é validar o produto, conquistar os primeiros condomínios pagantes e deixar o próprio SaaS pagar a próxima fase.

## Stack inicial recomendada

- Cloudflare Free: DNS, SSL, CDN, proteção DDoS básica, regras WAF básicas e Turnstile.
- Vercel Hobby: frontend Next.js.
- Supabase Free: Auth, Postgres, RLS e Storage.
- WhatsApp manual: copiar mensagem, compartilhar no WhatsApp e abrir WhatsApp.
- AdSense: apenas no plano grátis, com consentimento quando aplicável.
- Monitoramento básico: logs internos do Meus Condomínios, logs da Vercel, logs do Supabase e alertas manuais.
- Sentry, Resend ou Brevo: usar apenas se couber no free tier e sem enviar dados sensíveis desnecessários.

## O que usar grátis no início

### Cloudflare Free

Use desde o começo:

- DNS gerenciado.
- SSL/TLS.
- Proxy/CDN para páginas públicas.
- Proteção DDoS básica.
- Regras WAF simples para rotas sensíveis.
- Turnstile em cadastro, convite, suporte público, denúncia e QR público.

Configuração mínima:

- Forçar HTTPS.
- Ativar Bot Fight Mode se não afetar login/cadastro.
- Criar regras para reduzir abuso em `/cadastro`, `/convite/*`, `/visitante/*`, `/denunciar`, `/suporte` e `/api/*`.
- Nunca cachear `/app/*`, `/admin/*`, `/api/*`, `/convite/*` ou `/visitante/*`.

### Vercel Hobby

Use para:

- Hospedar o Next.js.
- Deploy automático pelo GitHub.
- Preview deployments internos.
- Variáveis de ambiente seguras.

Cuidados:

- Evitar funções pesadas e longas.
- Evitar processamento de relatórios grandes no request.
- Usar paginação em dashboards.
- Não colocar secrets em variáveis públicas `NEXT_PUBLIC_*`.

### Supabase Free

Use para:

- Auth.
- Postgres.
- RLS.
- Storage privado.
- Logs e auditoria básica.

Cuidados:

- RLS obrigatória em tabelas internas.
- Storage privado para documentos, anexos, encomendas e ocorrências.
- Limites de plano aplicados server-side.
- Índices em `condominium_id`, `user_id`, `status`, `created_at` e campos de busca.
- Não rodar queries sem paginação no Superadmin.

## O que não ativar no início

Mantenha desligado até haver receita ou necessidade real:

- WhatsApp automático.
- Integração oficial com grupos de WhatsApp.
- Multi-grupos automático.
- Envio em massa por e-mail.
- Uploads grandes.
- Relatórios pesados ou exportações grandes.
- PDFs automáticos em lote.
- Analytics externo pago.
- Observabilidade paga.
- Backups avançados fora do que o Supabase oferecer no plano inicial.
- Cron jobs frequentes.
- Processamento de imagem/vídeo.

## Segurança que não pode ser removida

Mesmo no modo gratuito:

- RLS obrigatória.
- Permissões por papel obrigatórias.
- `/admin` protegido por papel interno e 2FA quando disponível.
- Service role apenas no servidor.
- Turnstile em rotas sensíveis.
- Rate limit em cadastro, login, convite, suporte, QR público e ações administrativas.
- Storage privado.
- QR público com anti-enumeração.
- Logs de ações sensíveis.
- Dados sensíveis mascarados no Superadmin.
- WhatsApp automático desativado no plano grátis.

## Produto free-first

O plano grátis deve ser útil, mas limitado:

- 2 blocos.
- Até 12 apartamentos por bloco.
- 24 apartamentos no total.
- 1 admin.
- 1 síndico.
- 0 guarita/cancela.
- 2 áreas comuns.
- 30 MB de storage total.
- Upload pequeno e controlado.
- WhatsApp manual.
- 1 canal WhatsApp manual.
- AdSense discreto.
- Sem permissões avançadas.
- Sem relatórios pesados.
- Sem multi-grupos automático.
- Calendário até 60 dias à frente.
- Rate limit mais forte.

Planos pagos:

- Removem anúncios.
- Liberam mais apartamentos, blocos, usuários e áreas comuns.
- Liberam permissões avançadas.
- Liberam relatórios/exportações conforme plano.
- Liberam WhatsApp automático somente quando houver opt-in, créditos, configuração e margem financeira.

## Como fazer o Meus Condomínios se pagar antes de escalar

1. Comece com poucos condomínios reais.
2. Venda Premium/Pro antes de ativar custos variáveis altos.
3. Use WhatsApp manual como diferencial inicial sem custo de API.
4. Coloque limites reais em uploads, relatórios e convites.
5. Use AdSense apenas para ajudar no plano grátis, sem poluir o app.
6. Monitore uso de Supabase Storage, banco, Vercel Functions e tráfego.
7. Só migre para planos pagos quando o custo estiver conectado a receita recorrente.

## Checklist de lançamento free-first

- [ ] Domínio no Cloudflare.
- [ ] SSL ativo.
- [ ] Turnstile configurado.
- [ ] Vercel Hobby com envs corretas.
- [ ] Supabase Free com migrations aplicadas.
- [ ] RLS conferida.
- [ ] Storage privado.
- [ ] AdSense opcional configurado.
- [ ] WhatsApp automático desligado.
- [ ] QR público com rate limit.
- [ ] `/admin` protegido.
- [ ] Limites do plano grátis testados.
- [ ] Logs internos revisados.
