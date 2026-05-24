alter table public.communication_templates
add column if not exists active boolean not null default true,
add column if not exists preview_example text,
add column if not exists template_key text;

create index if not exists communication_templates_active_idx on public.communication_templates(active);
create unique index if not exists communication_templates_global_key_idx
on public.communication_templates(template_key)
where condominium_id is null and template_key is not null;

create or replace function public.get_communication_template_limit(condo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_id text;
  used int;
  max_templates int;
begin
  select lower(coalesce(plan, 'free')) into plan_id
  from public.condominiums
  where id = condo_id;

  max_templates :=
    case coalesce(plan_id, 'free')
      when 'premium' then 5
      when 'pro' then 30
      when 'total' then 10000
      else 0
    end;

  select count(*) into used
  from public.communication_templates
  where condominium_id = condo_id;

  return jsonb_build_object(
    'plan', coalesce(plan_id, 'free'),
    'used', used,
    'limit', max_templates,
    'allowed', used < max_templates,
    'blocked', used >= max_templates,
    'percent', case when max_templates = 0 then 100 else round((used::numeric / max_templates::numeric) * 100)::int end
  );
end;
$$;

create or replace function public.assert_communication_template_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if new.condominium_id is null then
    return new;
  end if;

  result := public.get_communication_template_limit(new.condominium_id);
  if coalesce((result->>'allowed')::boolean, false) is false then
    raise exception 'Limite de modelos personalizados do plano atingido.';
  end if;

  return new;
end;
$$;

drop trigger if exists communication_template_limit on public.communication_templates;
create trigger communication_template_limit before insert on public.communication_templates
for each row execute function public.assert_communication_template_limit();

insert into public.communication_templates (
  condominium_id,
  template_key,
  name,
  category,
  title_template,
  body_template,
  message_type,
  safe_for_groups,
  requires_private_channel,
  suggested_priority,
  suggested_channels,
  variables,
  preview_example,
  active
)
values
  (null, 'water_outage', 'Falta de água', 'manutenção', 'Manutenção no abastecimento de água', 'Informamos que haverá interrupção no abastecimento de água em {data}, das {hora_inicio} às {hora_fim}, para manutenção programada. Recomendamos que os moradores se organizem com antecedência.', 'maintenance', true, false, 'important', '["app","whatsapp_manual","group"]'::jsonb, '["data","hora_inicio","hora_fim"]'::jsonb, 'Informamos que haverá interrupção no abastecimento de água em 20/05, das 8h às 14h, para manutenção programada.', true),
  (null, 'elevator_maintenance', 'Manutenção de elevador', 'manutenção', 'Manutenção programada no elevador', 'Informamos que o elevador {elevador} passará por manutenção em {data}, das {hora_inicio} às {hora_fim}. Durante o período, utilize as alternativas disponíveis e siga as orientações da administração.', 'maintenance', true, false, 'important', '["app","whatsapp_manual","group"]'::jsonb, '["elevador","data","hora_inicio","hora_fim"]'::jsonb, 'O elevador social passará por manutenção amanhã, das 9h às 12h.', true),
  (null, 'water_tank_cleaning', 'Limpeza da caixa d’água', 'manutenção', 'Limpeza da caixa d’água', 'A limpeza da caixa d’água será realizada em {data}, das {hora_inicio} às {hora_fim}. Pedimos que os moradores se programem e evitem consumo excessivo durante o procedimento.', 'maintenance', true, false, 'important', '["app","whatsapp_manual","group"]'::jsonb, '["data","hora_inicio","hora_fim"]'::jsonb, 'A limpeza da caixa d’água será realizada no sábado, das 8h às 13h.', true),
  (null, 'meeting_call', 'Assembleia', 'meeting', 'Convocação de assembleia', 'Convidamos os moradores para assembleia em {data}, às {hora}, com pauta sobre {pauta}. A participação é importante para as decisões do condomínio.', 'meeting', true, false, 'important', '["app","whatsapp_manual","group"]'::jsonb, '["data","hora","pauta"]'::jsonb, 'Convidamos os moradores para assembleia em 25/05, às 19h30.', true),
  (null, 'meeting_reminder', 'Lembrete de assembleia', 'meeting', 'Lembrete de assembleia', 'Lembramos que a assembleia do condomínio acontecerá em {data}, às {hora}. Consulte a pauta no Moraí e participe.', 'meeting', true, false, 'normal', '["app","whatsapp_manual","group"]'::jsonb, '["data","hora"]'::jsonb, 'Lembramos que a assembleia acontecerá hoje, às 19h30.', true),
  (null, 'scheduled_move', 'Mudança programada', 'announcement', 'Mudança programada', 'Informamos que haverá mudança programada em {data}, no período de {periodo}. A administração acompanhará o fluxo para reduzir impactos nas áreas comuns.', 'announcement', true, false, 'normal', '["app","whatsapp_manual","group"]'::jsonb, '["data","periodo"]'::jsonb, 'Haverá mudança programada no sábado pela manhã, com acompanhamento da administração.', true),
  (null, 'party_room_rule', 'Regra do salão de festas', 'announcement', 'Orientação sobre o salão de festas', 'Reforçamos que o uso do salão de festas deve respeitar as regras do condomínio: {regra}. Em caso de dúvida, consulte a administração pelo Moraí.', 'announcement', true, false, 'normal', '["app","whatsapp_manual","group"]'::jsonb, '["regra"]'::jsonb, 'Reforçamos que o salão deve ser entregue limpo após o uso.', true),
  (null, 'security_notice', 'Aviso de segurança', 'security', 'Aviso de segurança', 'Reforçamos uma orientação importante de segurança: {orientacao}. Evite compartilhar dados pessoais e acione a administração em caso de dúvida.', 'security', true, false, 'urgent', '["app","whatsapp_manual","group"]'::jsonb, '["orientacao"]'::jsonb, 'Reforçamos que visitantes devem ser identificados pela portaria.', true),
  (null, 'package_available', 'Encomenda disponível', 'package', 'Encomenda disponível para retirada', 'Há uma encomenda disponível para retirada. Consulte os detalhes no Moraí ou aguarde contato da administração.', 'package', false, true, 'normal', '["app","whatsapp_private"]'::jsonb, '[]'::jsonb, 'Há uma encomenda disponível para retirada. Consulte os detalhes no Moraí.', true),
  (null, 'booking_approved', 'Reserva aprovada', 'booking', 'Reserva aprovada', 'Sua reserva foi aprovada. Consulte o Moraí para conferir data, horário, espaço e regras de uso.', 'booking', false, true, 'normal', '["app","whatsapp_private"]'::jsonb, '[]'::jsonb, 'Sua reserva foi aprovada. Consulte o Moraí para conferir os detalhes.', true),
  (null, 'booking_pending', 'Reserva aguardando aprovação', 'booking', 'Reserva aguardando aprovação', 'Sua solicitação de reserva foi recebida e está aguardando aprovação da administração. Acompanhe o status pelo Moraí.', 'booking', false, true, 'normal', '["app","whatsapp_private"]'::jsonb, '[]'::jsonb, 'Sua solicitação de reserva está aguardando aprovação.', true),
  (null, 'ticket_answered', 'Solicitação respondida', 'ticket', 'Solicitação respondida', 'Sua solicitação recebeu uma resposta da administração. Acesse o Moraí para acompanhar os detalhes.', 'other', false, true, 'normal', '["app"]'::jsonb, '[]'::jsonb, 'Sua solicitação recebeu uma resposta da administração.', true),
  (null, 'visitor_contact', 'Visitante solicitou contato', 'visitor', 'Visitante solicitou contato', 'Um visitante solicitou contato pelo QR público do condomínio. Acesse o Moraí para visualizar e responder com segurança.', 'other', false, true, 'important', '["app","whatsapp_private"]'::jsonb, '[]'::jsonb, 'Um visitante solicitou contato pelo QR público do condomínio.', true),
  (null, 'morai_signup', 'Cadastro no Moraí', 'announcement', 'Cadastro no Moraí', 'Olá! O condomínio está usando o Moraí para organizar comunicados, reservas, encomendas e solicitações. Cadastre-se pelo link oficial enviado pela administração.', 'announcement', true, false, 'normal', '["app","whatsapp_manual","group"]'::jsonb, '[]'::jsonb, 'O condomínio está usando o Moraí. Cadastre-se pelo link oficial enviado pela administração.', true),
  (null, 'weekly_summary', 'Resumo semanal do condomínio', 'summary', 'Resumo semanal do condomínio', 'Resumo da semana: {resumo_anonimo}. Para detalhes individuais, acesse o Moraí.', 'summary', true, false, 'normal', '["app","whatsapp_manual","group"]'::jsonb, '["resumo_anonimo"]'::jsonb, 'Resumo da semana: manutenção concluída, comunicados publicados e reservas acompanhadas.', true)
on conflict (template_key)
where condominium_id is null and template_key is not null
do update set
  name = excluded.name,
  category = excluded.category,
  title_template = excluded.title_template,
  body_template = excluded.body_template,
  message_type = excluded.message_type,
  safe_for_groups = excluded.safe_for_groups,
  requires_private_channel = excluded.requires_private_channel,
  suggested_priority = excluded.suggested_priority,
  suggested_channels = excluded.suggested_channels,
  variables = excluded.variables,
  preview_example = excluded.preview_example,
  active = true,
  updated_at = now();

grant execute on function public.get_communication_template_limit(uuid) to authenticated;
