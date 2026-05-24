# Meus Condomínios: caminho de upgrade de infraestrutura

Este guia define quando sair do modo free-first e migrar para planos pagos de Supabase, Vercel, Cloudflare e WhatsApp automático.

## Princípio

Só migrar quando houver um motivo claro:

- Receita recorrente cobre o custo.
- Limite gratuito está próximo.
- Segurança/backup/observabilidade exige upgrade.
- Performance prejudica clientes pagantes.
- Recurso pago desbloqueia venda real.

Evite contratar infraestrutura antes de validar que condomínios pagam pelo Meus Condomínios.

## Quando migrar para Supabase Pro

Considere Supabase Pro quando:

- O banco chegar perto dos limites do plano Free.
- Storage do Free ficar pequeno.
- Backups e recuperação se tornarem críticos para clientes pagantes.
- Muitos condomínios ativos dependerem do sistema diariamente.
- Queries reais começarem a exigir mais recursos.
- O risco de downtime começar a afetar receita.
- Você precisar de mais controle operacional e suporte.

Antes de migrar:

- Revisar índices.
- Remover queries sem paginação.
- Compactar/arquivar logs antigos quando possível.
- Limitar uploads grandes.
- Conferir se clientes pagantes cobrem o custo.

## Quando migrar para Vercel Pro

Considere Vercel Pro quando:

- O tráfego público crescer.
- Builds e deploys ficarem críticos.
- Limites de funções começarem a apertar.
- Você precisar de mais proteção/recursos para produção.
- A equipe crescer e precisar de recursos colaborativos.
- Clientes pagantes dependerem de estabilidade maior.

Antes de migrar:

- Reduzir client components desnecessários.
- Usar dynamic import para calendário e módulos pesados.
- Garantir paginação nas telas internas.
- Evitar relatórios pesados em serverless function.
- Medir quais rotas consomem mais.

## Quando contratar Cloudflare Pro

Considere Cloudflare Pro quando:

- Houver ataque, scraping ou bots recorrentes.
- O QR público sofrer muitas tentativas de enumeração.
- Cadastro/convite receber abuso.
- Você precisar de WAF mais forte.
- O domínio e a reputação do produto virarem ativos relevantes.

Antes de migrar:

- Configurar Turnstile corretamente.
- Criar regras Free básicas.
- Bloquear países/regiões apenas se fizer sentido para o negócio.
- Garantir que Cloudflare não cacheie dados sensíveis.

## Quando ativar WhatsApp automático

Não ative no início para todos. Ative quando:

- Houver clientes Premium/Pro/Total pagando.
- Houver margem para custo por mensagem.
- Opt-in/opt-out estiver funcionando.
- Logs e créditos estiverem testados.
- Templates estiverem seguros.
- O fallback manual continuar disponível.
- A conta oficial estiver configurada conforme regras da plataforma.

Ordem recomendada:

1. Free: WhatsApp manual.
2. Premium piloto: notificações essenciais 1:1.
3. Pro: lembretes e resumos com créditos.
4. Total: grupos oficiais apenas quando elegível e financeiramente viável.

Nunca ativar:

- Envio automático sem opt-in.
- Envio para grupo com dados pessoais.
- Mensagens ilimitadas.
- Reenvio infinito.
- API não oficial.

## Quando ativar e-mail transacional avançado

Use Supabase Auth no começo. Ative Resend/Brevo quando:

- Confirmações precisarem de melhor entregabilidade.
- Suporte precisar responder por e-mail dentro do app.
- Clientes pagantes reclamarem de e-mails perdidos.
- O volume couber no free tier ou for coberto por receita.

## Quando ativar Sentry ou monitoramento pago

Comece com logs internos. Ative Sentry quando:

- Erros em produção ficarem difíceis de rastrear.
- Você tiver clientes pagantes usando diariamente.
- Bugs críticos afetarem cadastro, login, convites ou pagamentos.

Cuidados:

- Remover dados pessoais.
- Não enviar payloads sensíveis.
- Não enviar tokens.
- Configurar sampling.

## Marcos de crescimento sugeridos

### Fase 1: validação

Infra:

- Cloudflare Free.
- Vercel Hobby.
- Supabase Free.
- WhatsApp manual.
- Logs internos.

Meta:

- Primeiros condomínios usando.
- Primeiros pagamentos.
- Ajustar UX e fluxo de cadastro.

### Fase 2: primeiros pagantes

Infra:

- Ainda free-first, se limites permitirem.
- AdSense no Free.
- Monitoramento básico.
- WhatsApp automático apenas piloto pago.

Meta:

- Receita recorrente cobrir Supabase Pro ou Vercel Pro se necessário.

### Fase 3: operação estável

Infra:

- Supabase Pro se dados/backup/uso pedirem.
- Vercel Pro se tráfego/funções pedirem.
- Cloudflare Pro se abuso ou proteção pedirem.
- WhatsApp automático por créditos.

Meta:

- Custos previsíveis.
- Planos pagos sustentando recursos variáveis.

### Fase 4: escala

Infra:

- Observabilidade melhor.
- Backups e retenção formais.
- Processamento assíncrono para relatórios.
- Filas/jobs para WhatsApp e e-mail.

Meta:

- Crescer sem transformar cada condomínio grátis em custo alto.

## Gatilhos práticos de upgrade

Migrar quando pelo menos um destes for verdadeiro:

- Clientes pagantes cobrem 3x o custo mensal do upgrade.
- O plano grátis está bloqueando venda de cliente pago.
- O limite gratuito está acima de 70% por vários dias.
- Falhas de performance atingem clientes pagantes.
- Segurança/backup exigem recurso pago.
- Um cliente paga um plano maior especificamente por automação que exige custo.

## Checklist antes de cada upgrade

- [ ] Qual problema real o upgrade resolve?
- [ ] Existe receita pagando por isso?
- [ ] O problema não pode ser resolvido com limite, índice ou paginação?
- [ ] O recurso vai aumentar conversão ou retenção?
- [ ] Existe plano de rollback?
- [ ] O custo variável está refletido nos planos?
- [ ] O Superadmin mostra uso e abuso?

## Resumo executivo

Comece simples:

- Cloudflare Free.
- Vercel Hobby.
- Supabase Free.
- WhatsApp manual.
- AdSense no Free.
- Limites fortes.
- Segurança básica intacta.

Escale só quando o Meus Condomínios provar valor e receita. O produto deve crescer com margem, não com esperança.
