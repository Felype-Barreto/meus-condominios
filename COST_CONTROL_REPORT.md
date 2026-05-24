# Meus Condomínios cost control report

Data: 22/05/2026

## Meta

Reduzir consumo do Supabase/Vercel no inicio sem remover RLS, permissoes, Turnstile, storage privado ou controles do QR publico.

## Controles encontrados

| Area | Controle |
| --- | --- |
| Plano | Limites em `plan_limits`, RPCs e triggers |
| Acoes mensais | `src/lib/cost-control.ts` bloqueia criacao ao atingir limite |
| Modo economico | `src/lib/economy-mode.ts` bloqueia recursos caros |
| Storage | bucket privado, signed URL, quota por plano e arquivo |
| Analytics | metadata minima no modo economico |
| Calendario | consulta por range visivel, slots por dia |
| Dashboard | contagens/head queries e listas pequenas |
| WhatsApp | Free manual, automatico bloqueado no modo economico |
| Ads | so Free + consentimento + rotas permitidas |

## Correcoes aplicadas

1. Consultas abertas de modulos foram reduzidas: encomendas, solicitacoes, ocorrencias, avisos e areas comuns.
2. Listas principais passaram a respeitar `getEconomyPageSize`.
3. `shortPageSize` economico passou a 24 para casar com a capacidade Free inicial.
4. Storage ganhou `20260522213000_storage_plan_limits_guard.sql`:
   - `can_upload_file` tambem valida `max_upload_file_mb`;
   - trigger em `storage.objects` protege uploads diretos permitidos.

## Riscos de custo por prioridade

Alto antes de crescer:

- Fotos/documentos em volume sem compressao no cliente.
- Listas com apenas limite e sem cursor/pagina quando condominios pagos chegarem a centenas de registros.
- Logs antigos sem rotina de retencao/agregacao.

Medio:

- Dashboards Superadmin que fazem multiplas consultas amostrais.
- Suporte, denuncias e analytics internos crescendo sem agregacao diaria.
- Storage de anexos orfaos apos cancelamento.

Baixo no modo inicial:

- WhatsApp automatico, porque Free/manual e economy mode bloqueiam envio real.
- FullCalendar, porque so a rota de agenda o carrega dinamicamente e eventos sao buscados por range.

## Checklist operacional Free-first

- [x] `ECONOMY_MODE=true` documentado.
- [x] `NEXT_PUBLIC_ECONOMY_MODE=true` documentado.
- [x] Free sem WhatsApp automatico.
- [x] Free storage 30 MB e upload pequeno.
- [x] Storage privado.
- [x] Signed URL para download de documentos.
- [x] Calendario nao carrega ano inteiro.
- [x] Dashboard principal usa resumos.
- [x] Ads nao quebram sem env.
- [ ] Implementar paginacao com navegacao/cursor nas telas simples ainda limitadas.
- [ ] Implementar compressao real para imagens antes de upload.
- [ ] Criar retencao/resumo de logs.
- [ ] Medir uso real por condominio apos pilotos.

## Criterios para upgrade

- Clientes pagos exigirem operacao comercial estavel fora do ambiente de validacao.
- Storage, banco ou auth chegarem perto da cota Free por varios dias.
- Backups/restores e observabilidade virarem requisito operacional.
- Trafego publico ou abuse exigir WAF/limites melhores.
- WhatsApp automatico deixar de ser piloto e virar custo variavel recorrente.
