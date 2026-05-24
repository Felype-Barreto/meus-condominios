# Meus Condomínios: controle de custos

Este guia lista recursos que podem gerar custo e como limitar o uso por plano para o Meus Condomínios começar enxuto.

## Recursos que podem gerar custo

### Backend e banco

- Muitas queries sem paginação.
- Relatórios grandes.
- Busca global sem limite.
- Logs crescendo indefinidamente.
- Dados de auditoria sem política de retenção.
- Triggers muito pesadas.
- Requisições repetidas por bots.

Controles:

- Paginação obrigatória.
- Filtros por período.
- Índices nas tabelas principais.
- Rate limit por IP, usuário e condomínio.
- `src/lib/cost-control.ts` para bloquear criações quando o plano chega ao limite.
- Dashboards com resumos e limites pequenos, sem carregar listas completas.
- Queries novas sem `select("*")`; selecionar apenas colunas necessárias.
- Retenção/arquivamento futuro para logs antigos.
- Bloqueio de relatórios pesados no plano grátis.

### Storage

Custos podem vir de:

- Upload de documentos grandes.
- Fotos de encomendas sem compressão.
- Anexos em solicitações.
- Download repetido de arquivos.
- Arquivos esquecidos após cancelamento.

Controles:

- Buckets privados.
- Limite de MB por plano.
- Limite por arquivo.
- Tipos permitidos.
- Plano grátis com uploads pequenos.
- Exportação/download via URL assinada.
- Rotina futura para limpar arquivos órfãos.

Limites sugeridos:

- Free: 30 MB totais, arquivos até 2 MB.
- Premium: 500 MB totais, arquivos até 5 MB.
- Pro: 3 GB totais, arquivos até 10 MB.
- Total: 20 GB totais, arquivos até 25 MB.

### Vercel

Custos podem vir de:

- Muitas serverless functions.
- Builds frequentes.
- Rotas dinâmicas com trabalho pesado.
- Imagens remotas sem controle.
- Requests abusivos.

Controles:

- Cache apenas para páginas públicas seguras.
- Não cachear dados de condomínio.
- Evitar jobs longos em requests.
- Dynamic import para módulos pesados.
- Limitar páginas Superadmin com paginação.
- Cloudflare na frente para reduzir abuso.

### WhatsApp

Custos podem vir de:

- Envio automático 1:1.
- Envio automático em grupos/canais.
- Lembretes automáticos demais.
- Reenvio para não lidos.
- Falhas/retries sem controle.

Controles:

- Free: somente manual.
- Premium/Pro/Total: créditos mensais.
- Opt-in obrigatório.
- Categorias de consentimento.
- Bloqueio ao atingir 100%.
- Aviso aos 80%.
- Add-ons pagos.
- Logs sem payload sensível.
- Nunca enviar automático sem margem financeira.

### E-mail

Custos podem vir de:

- Confirmações e notificações em massa.
- Suporte por e-mail transacional.
- Reenvio abusivo.

Controles:

- Usar Supabase Auth para fluxo básico.
- Resend/Brevo apenas no free tier no início.
- Não enviar marketing sem consentimento.
- Rate limit em reenvio de confirmação.

### Observabilidade

Custos podem vir de:

- Sentry com alto volume.
- Logs externos sem filtro.
- Analytics detalhado demais.

Controles:

- Começar com logs internos.
- Enviar só erros relevantes para ferramenta externa.
- Remover dados pessoais de eventos.
- Amostrar eventos de baixo valor.

## Como limitar uso por plano

## Modo econômico

Enquanto o Meus Condomínios estiver em Vercel Hobby e Supabase Free, use:

```env
NEXT_PUBLIC_ECONOMY_MODE=true
ECONOMY_MODE=true
```

Com o modo ativo:

- Realtime fica desativado por padrão.
- WhatsApp automático real é bloqueado; o modo manual continua funcionando.
- Relatórios pesados, exportação PDF, lotes grandes, anexos em massa e uploads grandes ficam indisponíveis.
- Analytics usa amostras menores e deve preferir agregações diárias.
- Dashboards devem mostrar resumos, não listas completas.
- Paginação curta vira padrão operacional.
- O `/admin` exibe o banner de economia com storage estimado, linhas monitoradas, uso de WhatsApp e alertas.

Mensagem interna para o Superadmin:

> Este recurso está preparado, mas será ativado quando o Meus Condomínios migrar para infraestrutura de produção paga.

Mensagem para usuário final:

> Disponível em planos pagos.

### Plano grátis

Deve bloquear:

- WhatsApp automático.
- Upload grande.
- Relatórios pesados.
- Exportações avançadas.
- Multi-grupos automático.
- Canais extras.
- Guarita/cancela.
- Automação de resumos.

Deve permitir:

- Gestão básica do condomínio.
- Comunicados no app.
- Reservas simples.
- Solicitações básicas.
- Convite de moradores.
- WhatsApp manual.
- QR público seguro com limites.

### Planos pagos

Premium:

- Remove anúncios.
- Libera permissões por toggle.
- WhatsApp automático limitado.
- Mais áreas comuns e volume mensal.

Pro:

- Relatórios e exportação CSV.
- Mais canais.
- Mais créditos WhatsApp.
- Uso maior de storage.

Total:

- Relatórios completos.
- Multi-grupos avançado quando elegível.
- Mais storage.
- Mais créditos e canais.

## Rate limits mínimos

Recomendação inicial:

- Cadastro: forte por IP e e-mail.
- Login: confiar no Supabase Auth e adicionar Turnstile em abuso.
- Convites: limite por condomínio/dia no plano grátis.
- QR público: limite por IP, public code e termo buscado.
- Upload: limite por arquivo, usuário, condomínio e plano.
- WhatsApp manual: sem crédito, mas registrar clique/uso para detectar abuso.
- Admin actions: rate limit por ator interno.

## Sinais de abuso no plano grátis

Investigar quando houver:

- Muitos cadastros do mesmo IP.
- Muitos condomínios criados por uma conta.
- QR público com muitas tentativas sequenciais.
- Uploads repetidos até o limite.
- Convites em volume incomum.
- Muitos erros de login.
- Uso de storage alto sem moradores reais.
- Muitas solicitações para suporte sem condomínio ativo.

## Ações para evitar prejuízo

- Suspender automações por padrão no Free.
- Bloquear recursos ao atingir limite, não apenas avisar.
- Exigir upgrade para relatórios pesados.
- Usar AdSense apenas no Free.
- Colocar aviso aos 80% do limite.
- Registrar audit log quando limite for atingido.
- Manter Superadmin com visão de clientes em risco e uso alto.

## Checklist de controle de custo

- [x] Free sem WhatsApp automático.
- [x] Free com storage total de 30 MB e limite por arquivo.
- [x] Free sem relatório pesado/exportação avançada.
- [x] Free sem multi-grupos automático.
- [x] Rate limit no QR público via função segura.
- [x] Rate limit server-side para comunicados, reservas, solicitações, encomendas, documentos, ocorrências, suporte e denúncias.
- [x] Storage privado e limitado por plano.
- [x] Alertas na assinatura aos 70% de storage e 80% do limite mensal.
- [x] AdSense apenas no Free e fora de telas sensíveis.
- [ ] Job periódico para resumir logs antigos e alimentar `platform_analytics_daily`.
- [ ] Compressão real de imagem antes de upload em todos os formulários com arquivo.
- [ ] Rate limit adicional por IP para cadastro/login em Cloudflare Turnstile/WAF.
