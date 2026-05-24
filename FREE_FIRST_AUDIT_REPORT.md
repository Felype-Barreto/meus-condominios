# Meus Condomínios Free-first audit report

Data: 22/05/2026

## Escopo

Auditoria final para iniciar o Meus Condomínios com custo controlado e seguranca basica em Cloudflare Free, Supabase Free e ambiente Vercel de validacao. A revisao cruzou codigo, migrations, envs e documentacao.

## Resultado executivo

Status: pronto para validacao controlada, com ressalvas operacionais antes de vender em escala.

Passou:

- Documentos Free-first, custo, caminho de upgrade, deploy e seguranca do `/admin` existem.
- `.env.example` cobre modo economico, Supabase, Turnstile, AdSense, WhatsApp e allowlists admin.
- Planos Free/Premium/Pro/Total estao alinhados com a estrategia Free-first em `src/lib/plans.ts` e seed SQL.
- Criacao de condominio resolve o plano no servidor e nao recebe plano livre do formulario.
- Modo economico bloqueia features caras e encurta paginacao operacional.
- Calendario busca janela visivel, usa slots por dia e valida antecedencia/conflito no backend e SQL.
- Free mantem WhatsApp manual e AdSense condicionado a plano, rota segura e consentimento.
- `/admin` exige allowlist, `platform_admin_users`, host permitido e MFA quando configurado.

Corrigido nesta auditoria:

- Removido acesso hierarquico implicito entre papeis internos do Superadmin.
- Removidos `select("*")` das telas auditadas de encomendas, solicitacoes, ocorrencias, avisos e areas comuns.
- Adicionados limites economicos a listas de apartamentos, avisos, encomendas, solicitacoes, ocorrencias, areas comuns e documentos.
- Adicionado trigger de storage para limite total e limite por arquivo mesmo em upload direto permitido no bucket.

## Infra e documentacao

| Item | Status | Evidencia |
| --- | --- | --- |
| Infra Free-first | OK | `docs/FREE_FIRST_INFRASTRUCTURE.md` |
| Controle de custo | OK | `docs/COST_CONTROL.md`, `src/lib/cost-control.ts` |
| Caminho de upgrade | OK | `docs/UPGRADE_PATH.md` |
| Deploy Free tier | OK, atualizado | `DEPLOY_FREE_TIER.md` |
| Envs | OK | `.env.example` |
| Admin Free tier | OK | `ADMIN_SECURITY_FREE_TIER.md` |

Ressalva: Vercel Hobby deve ser tratado como ambiente de arranque/validacao conforme termos atuais do fornecedor. Planeje Pro ou alternativa compativel antes de uso comercial forte.

## Planos e entitlement

| Checagem | Status |
| --- | --- |
| Free: 2 blocos, 12 por bloco, 24 total | OK |
| Premium/Pro/Total atualizados | OK |
| Seeds em `plan_limits` | OK |
| Limites server-side via RPC/triggers | OK |
| Criacao usa plano real da assinatura | OK |
| Sem seletor falso de plano na criacao | OK |

## Custo

| Checagem | Status | Nota |
| --- | --- | --- |
| Storage por plano | OK | RPC + guard no bucket privado |
| Limite por arquivo | OK | Migration nova reforca upload direto |
| Compressao real de imagem | Pendente | Implementar antes de fotos grandes |
| Logs sem payload gigante | OK por desenho atual | Analytics sanitiza metadata no modo economico |
| Realtime por padrao | OK | Nao ha subscriptions realtime nos modulos auditados |
| Dashboards resumidos | OK | Dashboard principal usa contagens e listas curtas |
| Queries sem `select("*")` nas telas auditadas | OK | Corrigidas nesta auditoria |
| Paginacao em todas as listas | Parcial | Muitas telas tem `limit`; navegacao paginada ainda falta em modulos simples |
| Calendario por intervalo visivel | OK | `/api/calendar/events` e `/api/calendar/slots` |

## Seguranca

| Checagem | Status | Nota |
| --- | --- | --- |
| RLS nas tabelas centrais | OK por migrations | Revalidar no Supabase antes do lancamento |
| Turnstile | OK para cadastro | Expandir em login/rotas publicas conforme abuso |
| Rate limit | Parcial | QR/cost-control/admin tem controle; IP global depende Cloudflare |
| Service role fora do frontend | OK | Uso encontrado apenas em servidor/actions/routes |
| Storage privado | OK | Bucket privado e signed URL em documentos |
| QR publico seguro | OK por migrations/fluxo existente | Manter teste anti-enumeracao |
| WhatsApp manual no Free | OK | Automacao bloqueada por plano/modo economico |

## AdSense

- So renderiza para `plan === "free"`.
- Exige preferencia de cookies com ads.
- Fica fora de `/admin`, QR publico, login, cadastro, convite e paginas legais/sensiveis bloqueadas.
- Sidebar interna aparece apenas em desktop grande.
- Sem `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, o app nao quebra.

## Calendario

- Free: 60 dias.
- Premium: 180 dias.
- Pro: 365 dias.
- Total: 730 dias.
- O calendario carrega mes/semana/dia/lista com dynamic import.
- Mudanca de periodo consulta somente intervalo visivel.
- Conflito, bloqueios, horario e plano sao validados server-side/SQL.

## Admin

- Allowlist: OK.
- Host permitido: OK.
- Registro ativo em `platform_admin_users`: OK.
- MFA para owner/admin quando configurado: OK.
- Noindex/no-store/rate limit basico no proxy: OK.
- Mascaramento e logs sensiveis: implementados.

## Pendencias para receita/infra paga

- Migrar da estrategia Vercel Hobby para ambiente comercial compativel quando houver venda real recorrente.
- Backups e restore mais formais quando Supabase Free deixar de ser aceitavel para dados reais.
- Compressao/upload de imagens end-to-end antes de liberar fotos em volume.
- Paginacao navegavel completa em todas as listas internas, alem dos limites atuais.
- Job de retencao/resumo de logs e `platform_analytics_daily`.
- Monitoramento de erro e alertas com ferramenta externa sanitizada.
- WhatsApp automatico real so com margem, opt-in testado, logs e conta oficial configurada.
