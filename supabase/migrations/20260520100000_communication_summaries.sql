create table if not exists public.communication_summaries (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  summary_type text not null,
  period_start date not null,
  period_end date not null,
  title text not null,
  body text not null,
  safe_group_body text,
  status text not null default 'draft',
  created_by uuid references public.profiles(id),
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.communication_summaries enable row level security;

create index if not exists communication_summaries_condominium_id_idx on public.communication_summaries(condominium_id);
create index if not exists communication_summaries_type_idx on public.communication_summaries(summary_type);
create index if not exists communication_summaries_status_idx on public.communication_summaries(status);
create index if not exists communication_summaries_period_idx on public.communication_summaries(period_start, period_end);
create index if not exists communication_summaries_created_at_idx on public.communication_summaries(created_at);

drop policy if exists "communication summaries read authorized" on public.communication_summaries;
create policy "communication summaries read authorized"
on public.communication_summaries for select
to authenticated
using (
  public.get_user_role(condominium_id) is not null
);

drop policy if exists "communication summaries manage authorized" on public.communication_summaries;
create policy "communication summaries manage authorized"
on public.communication_summaries for all
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'announcements.create')
  or public.has_permission(condominium_id, 'communication.reports')
  or public.has_permission(condominium_id, 'settings.edit')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'announcements.create')
  or public.has_permission(condominium_id, 'communication.reports')
  or public.has_permission(condominium_id, 'settings.edit')
);

create or replace function public.can_manage_communication_summary(condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'announcements.create')
    or public.has_permission(condo_id, 'communication.reports')
    or public.has_permission(condo_id, 'settings.edit');
$$;

create or replace function public.get_summary_plan_capabilities(condo_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  plan_id text;
begin
  select lower(coalesce(plan, 'free')) into plan_id
  from public.condominiums
  where id = condo_id;

  return jsonb_build_object(
    'plan', coalesce(plan_id, 'free'),
    'manual_summary', true,
    'weekly_manual', coalesce(plan_id, 'free') in ('premium', 'pro', 'total'),
    'weekly_automatic', coalesce(plan_id, 'free') in ('pro', 'total'),
    'daily_automatic', coalesce(plan_id, 'free') = 'total',
    'group_summary', coalesce(plan_id, 'free') = 'total',
    'block_summary', coalesce(plan_id, 'free') = 'total',
    'whatsapp_private', coalesce(plan_id, 'free') in ('pro', 'total')
  );
end;
$$;

create or replace function public.generate_group_safe_summary(summary_body text)
returns text
language plpgsql
immutable
as $$
declare
  sanitized text;
begin
  sanitized := coalesce(summary_body, '');
  sanitized := regexp_replace(sanitized, '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}', '[e-mail oculto]', 'gi');
  sanitized := regexp_replace(sanitized, '(\+?55\s?)?(\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}', '[telefone oculto]', 'gi');
  sanitized := regexp_replace(sanitized, '\b(apto|apartamento)\s*\d+[a-z]?\b', 'unidades específicas no Moraí', 'gi');
  sanitized := regexp_replace(sanitized, '\b(visitor|visitante|inadimpl[êe]ncia|cobran[çc]a individual|reclama[çc][ãa]o individual)\b', 'informação privada', 'gi');
  return sanitized || E'\n\nDetalhes individuais ficam disponíveis apenas nos canais privados do Moraí.';
end;
$$;

create or replace function public.build_communication_summary(
  condo_id uuid,
  summary_type_input text,
  start_date date,
  end_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  condo_name text;
  announcements_count int;
  maintenance_count int;
  meetings_count int;
  bookings_count int;
  packages_waiting_count int;
  tickets_resolved_count int;
  title_value text;
  body_value text;
  safe_value text;
begin
  select name into condo_name from public.condominiums where id = condo_id;

  select count(*) into announcements_count
  from public.communication_dispatches
  where condominium_id = condo_id
    and message_type = 'announcement'
    and created_at::date between start_date and end_date;

  select count(*) into maintenance_count
  from public.communication_dispatches
  where condominium_id = condo_id
    and message_type = 'maintenance'
    and created_at::date between start_date and end_date;

  select count(*) into meetings_count
  from public.communication_dispatches
  where condominium_id = condo_id
    and message_type = 'meeting'
    and created_at::date between start_date and end_date;

  select count(*) into bookings_count
  from public.bookings
  where condominium_id = condo_id
    and start_at::date between start_date and end_date
    and status in ('approved', 'pending');

  select count(*) into packages_waiting_count
  from public.packages
  where condominium_id = condo_id
    and status = 'waiting'
    and created_at::date <= end_date;

  select count(*) into tickets_resolved_count
  from public.tickets
  where condominium_id = condo_id
    and status in ('resolved', 'closed')
    and updated_at::date between start_date and end_date;

  title_value := case summary_type_input
    when 'daily' then 'Resumo diário do condomínio'
    when 'weekly' then 'Resumo semanal do condomínio'
    when 'packages' then 'Resumo de encomendas'
    when 'agenda' then 'Resumo de agenda'
    when 'maintenance' then 'Resumo de manutenção'
    when 'admin' then 'Resumo administrativo'
    else 'Resumo do condomínio'
  end;

  body_value := concat_ws(E'\n',
    title_value || ' - ' || coalesce(condo_name, 'Moraí'),
    'Período: ' || to_char(start_date, 'DD/MM/YYYY') || ' a ' || to_char(end_date, 'DD/MM/YYYY'),
    '',
    'Novos comunicados: ' || announcements_count,
    'Manutenções previstas ou avisadas: ' || maintenance_count,
    'Assembleias/reuniões comunicadas: ' || meetings_count,
    'Reservas de áreas comuns no período: ' || bookings_count,
    'Encomendas aguardando retirada: ' || packages_waiting_count,
    'Solicitações resolvidas: ' || tickets_resolved_count,
    '',
    'Este resumo não inclui nomes, telefones, visitantes, cobranças individuais ou reclamações privadas.'
  );

  safe_value := public.generate_group_safe_summary(body_value);

  return jsonb_build_object(
    'title', title_value,
    'body', body_value,
    'safe_group_body', safe_value,
    'summary_type', summary_type_input,
    'period_start', start_date,
    'period_end', end_date
  );
end;
$$;

create or replace function public.create_communication_summary(
  condo_id uuid,
  summary_type_input text,
  start_date date,
  end_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  summary_json jsonb;
  summary_id uuid;
begin
  if actor is null then
    raise exception 'Entre na sua conta.';
  end if;

  if not public.can_manage_communication_summary(condo_id) then
    raise exception 'Você não tem permissão para gerar resumos.';
  end if;

  summary_json := public.build_communication_summary(condo_id, summary_type_input, start_date, end_date);

  insert into public.communication_summaries (
    condominium_id,
    summary_type,
    period_start,
    period_end,
    title,
    body,
    safe_group_body,
    status,
    created_by
  )
  values (
    condo_id,
    summary_type_input,
    start_date,
    end_date,
    summary_json->>'title',
    summary_json->>'body',
    summary_json->>'safe_group_body',
    'draft',
    actor
  )
  returning id into summary_id;

  perform public.audit_event(
    condo_id,
    'communication_summary_generated',
    'communication_summaries',
    summary_id,
    jsonb_build_object('summary_type', summary_type_input, 'period_start', start_date, 'period_end', end_date)
  );

  return summary_id;
end;
$$;

create or replace function public.generate_daily_summary(condo_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_communication_summary(condo_id, 'daily', current_date, current_date);
end;
$$;

create or replace function public.generate_weekly_summary(condo_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_communication_summary(condo_id, 'weekly', (current_date - interval '6 days')::date, current_date);
end;
$$;

create or replace function public.schedule_summary(condo_id uuid, summary_type_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  capabilities jsonb;
  summary_id uuid;
  scheduled_at timestamptz;
begin
  if not public.can_manage_communication_summary(condo_id) then
    raise exception 'Você não tem permissão para agendar resumos.';
  end if;

  capabilities := public.get_summary_plan_capabilities(condo_id);

  if summary_type_input = 'daily' and coalesce((capabilities->>'daily_automatic')::boolean, false) is false then
    raise exception 'Resumo diário automático está disponível no plano Total.';
  end if;

  if summary_type_input = 'weekly' and coalesce((capabilities->>'weekly_automatic')::boolean, false) is false then
    raise exception 'Resumo semanal automático está disponível nos planos Pro e Total.';
  end if;

  if summary_type_input = 'daily' then
    summary_id := public.generate_daily_summary(condo_id);
    scheduled_at := date_trunc('day', now()) + interval '1 day' + interval '8 hours';
  else
    summary_id := public.generate_weekly_summary(condo_id);
    scheduled_at := date_trunc('week', now()) + interval '7 days' + interval '8 hours';
  end if;

  update public.communication_summaries
  set status = 'scheduled',
      scheduled_for = scheduled_at
  where id = summary_id;

  perform public.audit_event(
    condo_id,
    'communication_summary_scheduled',
    'communication_summaries',
    summary_id,
    jsonb_build_object('summary_type', summary_type_input, 'scheduled_for', scheduled_at)
  );

  return summary_id;
end;
$$;

create or replace function public.send_summary(summary_id_input uuid, channel_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  summary_row public.communication_summaries;
  channel_row record;
  has_group boolean := false;
  body_to_send text;
  dispatch_id uuid;
begin
  select * into summary_row
  from public.communication_summaries
  where id = summary_id_input;

  if summary_row.id is null then
    raise exception 'Resumo não encontrado.';
  end if;

  if not public.can_manage_communication_summary(summary_row.condominium_id) then
    raise exception 'Você não tem permissão para enviar resumos.';
  end if;

  for channel_row in
    select *
    from public.communication_channels
    where condominium_id = summary_row.condominium_id
      and id = any(channel_ids)
  loop
    if channel_row.type in ('whatsapp_manual', 'whatsapp_official')
      and channel_row.scope in ('all', 'block', 'staff', 'council', 'garage', 'gate') then
      has_group := true;
    end if;
  end loop;

  body_to_send := case when has_group then coalesce(summary_row.safe_group_body, summary_row.body) else summary_row.body end;

  dispatch_id := public.dispatch_communication(
    summary_row.condominium_id,
    summary_row.title,
    body_to_send,
    'normal',
    'summary',
    'all',
    null,
    channel_ids,
    null
  );

  update public.communication_summaries
  set status = 'sent',
      sent_at = now()
  where id = summary_id_input;

  perform public.audit_event(
    summary_row.condominium_id,
    'communication_summary_sent',
    'communication_summaries',
    summary_id_input,
    jsonb_build_object('dispatch_id', dispatch_id, 'channels', coalesce(array_length(channel_ids, 1), 0), 'used_group_safe_body', has_group)
  );

  return dispatch_id;
end;
$$;

grant execute on function public.can_manage_communication_summary(uuid) to authenticated;
grant execute on function public.get_summary_plan_capabilities(uuid) to authenticated;
grant execute on function public.generate_group_safe_summary(text) to authenticated;
grant execute on function public.build_communication_summary(uuid, text, date, date) to authenticated;
grant execute on function public.create_communication_summary(uuid, text, date, date) to authenticated;
grant execute on function public.generate_daily_summary(uuid) to authenticated;
grant execute on function public.generate_weekly_summary(uuid) to authenticated;
grant execute on function public.schedule_summary(uuid, text) to authenticated;
grant execute on function public.send_summary(uuid, uuid[]) to authenticated;
