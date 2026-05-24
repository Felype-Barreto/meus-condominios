create or replace function public.get_whatsapp_plan_limits(condo_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'plan', c.plan,
    'included_messages', pl.whatsapp_included_messages,
    'automatic_enabled', pl.whatsapp_automatic_enabled,
    'group_enabled', pl.whatsapp_group_enabled,
    'advanced_logs', pl.whatsapp_advanced_logs,
    'manual_only', c.plan = 'free',
    'allowed_message_types', case
      when c.plan = 'free' then jsonb_build_array()
      when c.plan = 'premium' then jsonb_build_array(
        'package_created',
        'booking_approved',
        'booking_rejected',
        'urgent_announcement_created',
        'visitor_contact_request_created'
      )
      when c.plan = 'pro' then jsonb_build_array(
        'package_created',
        'booking_approved',
        'booking_rejected',
        'urgent_announcement_created',
        'visitor_contact_request_created',
        'booking_reminder_24h',
        'booking_reminder_2h',
        'ticket_status_changed',
        'announcement_created_important',
        'package_waiting_reminder'
      )
      else jsonb_build_array(
        'package_created',
        'booking_approved',
        'booking_rejected',
        'urgent_announcement_created',
        'visitor_contact_request_created',
        'booking_reminder_24h',
        'booking_reminder_2h',
        'ticket_status_changed',
        'announcement_created_important',
        'package_waiting_reminder',
        'daily_summary',
        'weekly_summary',
        'group_announcement',
        'block_group_announcement',
        'meeting_reminder',
        'maintenance_reminder'
      )
    end
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

insert into public.whatsapp_templates (condominium_id, template_key, template_name, category, body_preview, status)
values
  (null, 'package_created', 'Encomenda recebida', 'essential', 'Uma encomenda chegou para o seu apartamento. Confira no Moraí.', 'approved'),
  (null, 'booking_approved', 'Agendamento aprovado', 'essential', 'Seu agendamento foi aprovado. Confira os detalhes no Moraí.', 'approved'),
  (null, 'booking_rejected', 'Agendamento recusado', 'essential', 'Seu agendamento foi recusado. Veja os detalhes no Moraí.', 'approved'),
  (null, 'urgent_announcement', 'Comunicado urgente', 'essential', 'Comunicado urgente do condomínio disponível no Moraí.', 'approved'),
  (null, 'visitor_contact_request', 'Visitante solicitou contato', 'essential', 'Um visitante solicitou contato pelo QR público do condomínio.', 'approved'),
  (null, 'booking_reminder', 'Lembrete de agendamento', 'automation', 'Lembrete de agendamento do condomínio.', 'draft'),
  (null, 'ticket_status_changed', 'Atualização de solicitação', 'automation', 'Sua solicitação recebeu uma atualização.', 'draft'),
  (null, 'important_announcement', 'Comunicado importante', 'automation', 'Comunicado importante do condomínio disponível no Moraí.', 'draft'),
  (null, 'package_waiting_reminder', 'Lembrete de encomenda', 'automation', 'Você ainda possui encomenda aguardando retirada.', 'draft'),
  (null, 'daily_summary', 'Resumo diário', 'summary', 'Resumo diário do condomínio disponível no Moraí.', 'draft'),
  (null, 'group_announcement', 'Comunicado em grupo', 'group', 'Comunicado para grupo oficial do condomínio.', 'draft'),
  (null, 'meeting_reminder', 'Lembrete de reunião', 'automation', 'Lembrete de assembleia ou reunião do condomínio.', 'draft'),
  (null, 'maintenance_reminder', 'Lembrete de manutenção', 'automation', 'Lembrete de manutenção programada no condomínio.', 'draft')
on conflict (condominium_id, template_key)
do update set
  template_name = excluded.template_name,
  category = excluded.category,
  body_preview = excluded.body_preview,
  updated_at = now();
