alter table public.communication_dispatch_channels
add column if not exists updated_at timestamptz not null default now();

alter table public.communication_safety_rules
add column if not exists updated_at timestamptz not null default now();

alter table public.communication_addons
add column if not exists updated_at timestamptz not null default now();

create index if not exists communication_safety_rules_created_at_idx on public.communication_safety_rules(created_at);
create index if not exists channel_usage_limits_created_at_idx on public.channel_usage_limits(created_at);
create index if not exists communication_summaries_created_by_idx on public.communication_summaries(created_by);
create index if not exists communication_addons_updated_at_idx on public.communication_addons(updated_at);
create index if not exists communication_dispatch_channels_updated_at_idx on public.communication_dispatch_channels(updated_at);

drop trigger if exists communication_dispatch_channels_set_updated_at on public.communication_dispatch_channels;
create trigger communication_dispatch_channels_set_updated_at before update on public.communication_dispatch_channels
for each row execute function public.set_updated_at();

drop trigger if exists communication_safety_rules_set_updated_at on public.communication_safety_rules;
create trigger communication_safety_rules_set_updated_at before update on public.communication_safety_rules
for each row execute function public.set_updated_at();

drop trigger if exists communication_addons_set_updated_at on public.communication_addons;
create trigger communication_addons_set_updated_at before update on public.communication_addons
for each row execute function public.set_updated_at();

create or replace function public.can_manage_communication(condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'announcements.create')
    or public.has_permission(condo_id, 'communication.manage')
    or public.has_permission(condo_id, 'settings.edit')
    or public.has_permission(condo_id, 'settings.roles');
$$;

create or replace function public.can_view_communication_logs(condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'communication.reports')
    or public.has_permission(condo_id, 'announcements.view_reads')
    or public.has_permission(condo_id, 'audit_logs.view');
$$;

create or replace function public.can_read_communication_channel(
  condo_id uuid,
  channel_type text,
  channel_scope text,
  channel_role text default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  role_value text;
begin
  role_value := public.get_user_role(condo_id);

  if role_value is null then
    return false;
  end if;

  if public.can_manage_communication(condo_id) then
    return true;
  end if;

  if channel_type = 'app' then
    return true;
  end if;

  if role_value = 'doorman' then
    return channel_scope in ('gate', 'staff') and public.has_permission(condo_id, 'gate.view_panel');
  end if;

  if channel_scope = 'role' and channel_role = role_value then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.can_read_communication_dispatch(
  dispatch_id_input uuid,
  condo_id uuid,
  target_type_input text,
  target_ids_input uuid[],
  status_input text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  role_value text;
begin
  role_value := public.get_user_role(condo_id);

  if role_value is null then
    return false;
  end if;

  if public.can_manage_communication(condo_id) or public.can_view_communication_logs(condo_id) then
    return true;
  end if;

  if status_input not in ('sent', 'scheduled') then
    return false;
  end if;

  if not exists (
    select 1
    from public.communication_dispatch_channels dc
    join public.communication_channels c on c.id = dc.channel_id
    where dc.dispatch_id = dispatch_id_input
      and public.can_read_communication_channel(condo_id, c.type, c.scope, c.role)
  ) then
    return false;
  end if;

  if target_type_input = 'all' then
    return true;
  end if;

  if target_type_input = 'role' then
    return true;
  end if;

  if target_type_input = 'apartment' then
    return exists (
      select 1
      from public.memberships m
      where m.condominium_id = condo_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.apartment_id = any(target_ids_input)
    );
  end if;

  if target_type_input = 'block' then
    return exists (
      select 1
      from public.memberships m
      join public.apartments a on a.id = m.apartment_id
      where m.condominium_id = condo_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and a.block_id = any(target_ids_input)
    );
  end if;

  return false;
end;
$$;

drop policy if exists "communication channels read authorized" on public.communication_channels;
create policy "communication channels read authorized"
on public.communication_channels for select
to authenticated
using (
  public.can_read_communication_channel(condominium_id, type, scope, role)
);

drop policy if exists "communication channels manage authorized" on public.communication_channels;
create policy "communication channels manage authorized"
on public.communication_channels for all
to authenticated
using (public.can_manage_communication(condominium_id))
with check (public.can_manage_communication(condominium_id));

drop policy if exists "communication dispatches read authorized" on public.communication_dispatches;
create policy "communication dispatches read authorized"
on public.communication_dispatches for select
to authenticated
using (
  public.can_read_communication_dispatch(id, condominium_id, target_type, target_ids, status)
);

drop policy if exists "communication dispatches create authorized" on public.communication_dispatches;
create policy "communication dispatches create authorized"
on public.communication_dispatches for insert
to authenticated
with check (public.can_manage_communication(condominium_id));

drop policy if exists "communication dispatch channels read authorized" on public.communication_dispatch_channels;
create policy "communication dispatch channels read authorized"
on public.communication_dispatch_channels for select
to authenticated
using (
  exists (
    select 1
    from public.communication_dispatches d
    where d.id = dispatch_id
      and public.can_view_communication_logs(d.condominium_id)
  )
);

drop policy if exists "communication templates manage authorized" on public.communication_templates;
create policy "communication templates manage authorized"
on public.communication_templates for all
to authenticated
using (
  condominium_id is not null and public.can_manage_communication(condominium_id)
)
with check (
  condominium_id is not null and public.can_manage_communication(condominium_id)
);

drop policy if exists "communication safety rules read members" on public.communication_safety_rules;
create policy "communication safety rules read authorized"
on public.communication_safety_rules for select
to authenticated
using (
  condominium_id is null or public.can_manage_communication(condominium_id)
);

drop policy if exists "channel usage read authorized" on public.channel_usage_limits;
create policy "channel usage read authorized"
on public.channel_usage_limits for select
to authenticated
using (public.can_view_communication_logs(condominium_id));

drop policy if exists "visitor requests read admin and gate" on public.visitor_contact_requests;
create policy "visitor requests read admin and gate"
on public.visitor_contact_requests for select
to authenticated
using (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'public_qr.view_logs')
  or public.has_permission(condominium_id, 'gate.register_visitor')
);

grant execute on function public.can_manage_communication(uuid) to authenticated;
grant execute on function public.can_view_communication_logs(uuid) to authenticated;
grant execute on function public.can_read_communication_channel(uuid, text, text, text) to authenticated;
grant execute on function public.can_read_communication_dispatch(uuid, uuid, text, uuid[], text) to authenticated;

create or replace function public.assert_communication_channel_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  limits jsonb;
begin
  if new.type = 'app' then
    return new;
  end if;

  limits := public.get_communication_plan_limits(new.condominium_id);

  if coalesce(limits->>'plan', 'free') = 'free' and new.type <> 'whatsapp_manual' then
    raise exception 'Plano grátis permite apenas canal WhatsApp manual.';
  end if;

  if new.type = 'whatsapp_official' and coalesce((limits->>'official_groups')::boolean, false) is false then
    raise exception 'Canal oficial automático exige plano Total ou add-on ativo.';
  end if;

  if new.type = 'whatsapp_manual' and new.scope <> 'all' and coalesce((limits->>'manual_groups')::boolean, false) is false then
    raise exception 'Múltiplos grupos manuais exigem Premium ou superior.';
  end if;

  result := public.can_create_communication_channel(new.condominium_id);
  if coalesce((result->>'allowed')::boolean, false) is false then
    raise exception 'Limite de canais do plano atingido.';
  end if;

  return new;
end;
$$;
