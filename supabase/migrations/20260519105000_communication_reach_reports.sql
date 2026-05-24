create table if not exists public.communication_recipients (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.communication_dispatches(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  user_id uuid references public.profiles(id),
  apartment_id uuid references public.apartments(id),
  channel_id uuid not null references public.communication_channels(id),
  status text not null default 'pending',
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique(dispatch_id, user_id, channel_id)
);

alter table public.communication_recipients enable row level security;

create index if not exists communication_recipients_dispatch_id_idx on public.communication_recipients(dispatch_id);
create index if not exists communication_recipients_condominium_id_idx on public.communication_recipients(condominium_id);
create index if not exists communication_recipients_user_id_idx on public.communication_recipients(user_id);
create index if not exists communication_recipients_apartment_id_idx on public.communication_recipients(apartment_id);
create index if not exists communication_recipients_channel_id_idx on public.communication_recipients(channel_id);
create index if not exists communication_recipients_status_idx on public.communication_recipients(status);
create index if not exists communication_recipients_created_at_idx on public.communication_recipients(created_at);

create or replace function public.can_view_communication_reports(condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'announcements.view_reads')
    or public.has_permission(condo_id, 'communication.reports')
    or public.has_permission(condo_id, 'audit_logs.view');
$$;

drop policy if exists "communication recipients read own or reports" on public.communication_recipients;
create policy "communication recipients read own or reports"
on public.communication_recipients for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_view_communication_reports(condominium_id)
);

drop policy if exists "communication recipients update own read" on public.communication_recipients;
create policy "communication recipients update own read"
on public.communication_recipients for update
to authenticated
using (user_id = auth.uid() or public.can_view_communication_reports(condominium_id))
with check (user_id = auth.uid() or public.can_view_communication_reports(condominium_id));

create or replace function public.match_dispatch_recipient_members(
  condo_id uuid,
  dispatch_target_type text,
  dispatch_target_ids uuid[]
)
returns table(user_id uuid, apartment_id uuid, block_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct m.user_id, m.apartment_id, a.block_id
  from public.memberships m
  left join public.apartments a on a.id = m.apartment_id
  where m.condominium_id = condo_id
    and m.status = 'active'
    and m.user_id is not null
    and (
      dispatch_target_type = 'all'
      or dispatch_target_type = 'channel'
      or (dispatch_target_type = 'apartment' and m.apartment_id = any(dispatch_target_ids))
      or (dispatch_target_type = 'block' and a.block_id = any(dispatch_target_ids))
      or (dispatch_target_type = 'role' and m.role in ('resident', 'owner', 'syndic', 'admin', 'doorman'))
    );
$$;

create or replace function public.create_communication_recipients_for_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dispatch_row public.communication_dispatches;
  channel_row public.communication_channels;
  member_row record;
  recipient_status text;
begin
  select * into dispatch_row from public.communication_dispatches where id = new.dispatch_id;
  select * into channel_row from public.communication_channels where id = new.channel_id;

  if dispatch_row.id is null or channel_row.id is null then
    return new;
  end if;

  recipient_status := case
    when new.status = 'failed' then 'failed'
    when new.status in ('sent', 'manual_only') then 'delivered'
    else 'pending'
  end;

  for member_row in
    select * from public.match_dispatch_recipient_members(
      dispatch_row.condominium_id,
      dispatch_row.target_type,
      dispatch_row.target_ids
    )
  loop
    insert into public.communication_recipients (
      dispatch_id,
      condominium_id,
      user_id,
      apartment_id,
      channel_id,
      status,
      delivered_at,
      failed_at,
      error_message
    )
    values (
      dispatch_row.id,
      dispatch_row.condominium_id,
      member_row.user_id,
      member_row.apartment_id,
      channel_row.id,
      recipient_status,
      case when recipient_status = 'delivered' then coalesce(new.sent_at, now()) else null end,
      case when recipient_status = 'failed' then now() else null end,
      new.error_message
    )
    on conflict (dispatch_id, user_id, channel_id)
    do update set
      status = excluded.status,
      delivered_at = coalesce(public.communication_recipients.delivered_at, excluded.delivered_at),
      failed_at = coalesce(public.communication_recipients.failed_at, excluded.failed_at),
      error_message = excluded.error_message;
  end loop;

  return new;
end;
$$;

drop trigger if exists communication_recipients_channel_insert on public.communication_dispatch_channels;
create trigger communication_recipients_channel_insert
after insert on public.communication_dispatch_channels
for each row execute function public.create_communication_recipients_for_channel();

create or replace function public.mark_communication_dispatch_read(dispatch_id_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  condo_id uuid;
  updated_count int;
begin
  if actor is null then
    raise exception 'Entre na sua conta.';
  end if;

  select condominium_id into condo_id
  from public.communication_dispatches
  where id = dispatch_id_input;

  if condo_id is null or public.get_user_role(condo_id) is null then
    raise exception 'Disparo não encontrado.';
  end if;

  update public.communication_recipients
  set status = 'read',
      read_at = coalesce(read_at, now()),
      delivered_at = coalesce(delivered_at, now())
  where dispatch_id = dispatch_id_input
    and user_id = actor
    and read_at is null;

  get diagnostics updated_count = row_count;

  perform public.audit_event(
    condo_id,
    'communication_dispatch_read',
    'communication_dispatches',
    dispatch_id_input,
    jsonb_build_object('updated_count', updated_count)
  );

  return jsonb_build_object('updated', updated_count);
end;
$$;

create or replace function public.get_communication_dispatch_report(dispatch_id_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  condo_id uuid;
  result jsonb;
begin
  select condominium_id into condo_id
  from public.communication_dispatches
  where id = dispatch_id_input;

  if condo_id is null then
    raise exception 'Disparo não encontrado.';
  end if;

  if not public.can_view_communication_reports(condo_id) then
    raise exception 'Você não tem permissão para ver relatórios de comunicação.';
  end if;

  select jsonb_build_object(
    'dispatch_id', dispatch_id_input,
    'app_delivered', count(*) filter (where c.type = 'app' and r.delivered_at is not null),
    'app_read', count(*) filter (where c.type = 'app' and r.read_at is not null),
    'whatsapp_delivered', count(*) filter (where c.type in ('whatsapp_manual', 'whatsapp_official') and r.delivered_at is not null),
    'failed', count(*) filter (where r.status = 'failed'),
    'channel_count', count(distinct r.channel_id),
    'credit_cost', coalesce((
      select sum(estimated_cost_units)
      from public.communication_dispatch_channels dc
      where dc.dispatch_id = dispatch_id_input
    ), 0),
    'pending_app_reads', count(*) filter (where c.type = 'app' and r.read_at is null and r.status <> 'failed')
  )
  into result
  from public.communication_recipients r
  join public.communication_channels c on c.id = r.channel_id
  where r.dispatch_id = dispatch_id_input;

  return coalesce(result, '{}'::jsonb);
end;
$$;

insert into public.communication_recipients (
  dispatch_id, condominium_id, user_id, apartment_id, channel_id, status, delivered_at, failed_at, error_message
)
select
  d.id,
  d.condominium_id,
  members.user_id,
  members.apartment_id,
  dc.channel_id,
  case when dc.status = 'failed' then 'failed' when dc.status in ('sent', 'manual_only') then 'delivered' else 'pending' end,
  case when dc.status in ('sent', 'manual_only') then coalesce(dc.sent_at, d.sent_at, dc.created_at) else null end,
  case when dc.status = 'failed' then coalesce(dc.sent_at, dc.created_at) else null end,
  dc.error_message
from public.communication_dispatch_channels dc
join public.communication_dispatches d on d.id = dc.dispatch_id
cross join lateral public.match_dispatch_recipient_members(d.condominium_id, d.target_type, d.target_ids) members
on conflict (dispatch_id, user_id, channel_id) do nothing;

grant execute on function public.can_view_communication_reports(uuid) to authenticated;
grant execute on function public.mark_communication_dispatch_read(uuid) to authenticated;
grant execute on function public.get_communication_dispatch_report(uuid) to authenticated;
