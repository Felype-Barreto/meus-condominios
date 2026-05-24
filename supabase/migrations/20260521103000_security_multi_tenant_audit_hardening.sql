-- Final multi-tenant security hardening:
-- - enable RLS on every public table
-- - tighten profile and WhatsApp consent reads/writes
-- - enforce same-condominium references for tenant-owned rows
-- - require sane storage paths and private document links

do $$
declare
  table_record record;
begin
  for table_record in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table %I.%I enable row level security',
      table_record.schemaname,
      table_record.tablename
    );
  end loop;
end $$;

drop policy if exists "profiles read same condominium" on public.profiles;
drop policy if exists "profiles read authorized condominium" on public.profiles;
drop policy if exists "profiles read authorized minimal" on public.profiles;
create policy "profiles read authorized minimal"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.memberships viewer
    join public.memberships target
      on target.condominium_id = viewer.condominium_id
     and target.user_id = profiles.id
     and target.status = 'active'
    where viewer.user_id = auth.uid()
      and viewer.status = 'active'
      and (
        viewer.role = 'subscriber_admin'
        or public.has_permission(viewer.condominium_id, 'residents.view_phone')
        or public.has_permission(viewer.condominium_id, 'settings.roles')
        or (
          viewer.apartment_id is not null
          and viewer.apartment_id = target.apartment_id
        )
      )
  )
);

drop policy if exists "whatsapp opt ins read scoped" on public.whatsapp_opt_ins;
drop policy if exists "whatsapp opt ins read private" on public.whatsapp_opt_ins;
create policy "whatsapp opt ins read private"
on public.whatsapp_opt_ins for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'residents.view_phone')
);

drop policy if exists "whatsapp opt ins manage own" on public.whatsapp_opt_ins;
drop policy if exists "whatsapp opt ins insert own" on public.whatsapp_opt_ins;
drop policy if exists "whatsapp opt ins update own" on public.whatsapp_opt_ins;
create policy "whatsapp opt ins insert own"
on public.whatsapp_opt_ins for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.memberships m
    where m.condominium_id = whatsapp_opt_ins.condominium_id
      and m.user_id = auth.uid()
      and m.status in ('active', 'pending')
  )
);

create policy "whatsapp opt ins update own"
on public.whatsapp_opt_ins for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.assert_tenant_reference_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  condo_id uuid;
begin
  condo_id := new.condominium_id;

  if tg_table_name = 'memberships' and new.apartment_id is not null then
    if not exists (
      select 1 from public.apartments a
      where a.id = new.apartment_id and a.condominium_id = condo_id
    ) then
      raise exception 'Apartamento não pertence a este condomínio.';
    end if;
  end if;

  if tg_table_name = 'syndic_profiles' then
    if not exists (
      select 1 from public.memberships m
      where m.id = new.membership_id and m.condominium_id = condo_id
    ) then
      raise exception 'Membership do síndico não pertence a este condomínio.';
    end if;
  end if;

  if tg_table_name = 'invites' and new.apartment_id is not null then
    if not exists (
      select 1 from public.apartments a
      where a.id = new.apartment_id and a.condominium_id = condo_id
    ) then
      raise exception 'Apartamento do convite não pertence a este condomínio.';
    end if;
  end if;

  if tg_table_name = 'bookings' then
    if new.common_area_id is not null and not exists (
      select 1 from public.common_areas ca
      where ca.id = new.common_area_id and ca.condominium_id = condo_id
    ) then
      raise exception 'Área comum não pertence a este condomínio.';
    end if;
    if new.apartment_id is not null and not exists (
      select 1 from public.apartments a
      where a.id = new.apartment_id and a.condominium_id = condo_id
    ) then
      raise exception 'Apartamento da reserva não pertence a este condomínio.';
    end if;
  end if;

  if tg_table_name in ('tickets', 'packages', 'incidents', 'visitor_contact_requests')
    and new.apartment_id is not null
  then
    if not exists (
      select 1 from public.apartments a
      where a.id = new.apartment_id and a.condominium_id = condo_id
    ) then
      raise exception 'Apartamento não pertence a este condomínio.';
    end if;
  end if;

  if tg_table_name = 'common_area_availability' then
    if not exists (
      select 1 from public.common_areas ca
      where ca.id = new.common_area_id and ca.condominium_id = condo_id
    ) then
      raise exception 'Área comum não pertence a este condomínio.';
    end if;
  end if;

  if tg_table_name = 'common_area_blocked_dates' then
    if not exists (
      select 1 from public.common_areas ca
      where ca.id = new.common_area_id and ca.condominium_id = condo_id
    ) then
      raise exception 'Área comum não pertence a este condomínio.';
    end if;
  end if;

  if tg_table_name = 'booking_rules' then
    if not exists (
      select 1 from public.common_areas ca
      where ca.id = new.common_area_id and ca.condominium_id = condo_id
    ) then
      raise exception 'Área comum não pertence a este condomínio.';
    end if;
  end if;

  if tg_table_name = 'communication_channels' and new.block_id is not null then
    if not exists (
      select 1 from public.blocks b
      where b.id = new.block_id and b.condominium_id = condo_id
    ) then
      raise exception 'Bloco do canal não pertence a este condomínio.';
    end if;
  end if;

  if tg_table_name = 'whatsapp_groups' and new.block_id is not null then
    if not exists (
      select 1 from public.blocks b
      where b.id = new.block_id and b.condominium_id = condo_id
    ) then
      raise exception 'Bloco do grupo não pertence a este condomínio.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists memberships_tenant_reference_integrity on public.memberships;
create trigger memberships_tenant_reference_integrity
before insert or update on public.memberships
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists syndic_profiles_tenant_reference_integrity on public.syndic_profiles;
create trigger syndic_profiles_tenant_reference_integrity
before insert or update on public.syndic_profiles
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists invites_tenant_reference_integrity on public.invites;
create trigger invites_tenant_reference_integrity
before insert or update on public.invites
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists bookings_tenant_reference_integrity on public.bookings;
create trigger bookings_tenant_reference_integrity
before insert or update on public.bookings
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists tickets_tenant_reference_integrity on public.tickets;
create trigger tickets_tenant_reference_integrity
before insert or update on public.tickets
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists packages_tenant_reference_integrity on public.packages;
create trigger packages_tenant_reference_integrity
before insert or update on public.packages
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists incidents_tenant_reference_integrity on public.incidents;
create trigger incidents_tenant_reference_integrity
before insert or update on public.incidents
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists visitor_contact_requests_tenant_reference_integrity on public.visitor_contact_requests;
create trigger visitor_contact_requests_tenant_reference_integrity
before insert or update on public.visitor_contact_requests
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists common_area_availability_tenant_reference_integrity on public.common_area_availability;
create trigger common_area_availability_tenant_reference_integrity
before insert or update on public.common_area_availability
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists common_area_blocked_dates_tenant_reference_integrity on public.common_area_blocked_dates;
create trigger common_area_blocked_dates_tenant_reference_integrity
before insert or update on public.common_area_blocked_dates
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists booking_rules_tenant_reference_integrity on public.booking_rules;
create trigger booking_rules_tenant_reference_integrity
before insert or update on public.booking_rules
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists communication_channels_tenant_reference_integrity on public.communication_channels;
create trigger communication_channels_tenant_reference_integrity
before insert or update on public.communication_channels
for each row execute function public.assert_tenant_reference_integrity();

drop trigger if exists whatsapp_groups_tenant_reference_integrity on public.whatsapp_groups;
create trigger whatsapp_groups_tenant_reference_integrity
before insert or update on public.whatsapp_groups
for each row execute function public.assert_tenant_reference_integrity();

create or replace function public.assert_document_storage_path()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.file_url is null or new.file_url = '' then
    raise exception 'Arquivo obrigatório.';
  end if;

  if new.file_url ~* '^https?://' then
    raise exception 'Use caminho privado do Storage, não URL pública.';
  end if;

  if public.storage_object_condominium_id(new.file_url) is distinct from new.condominium_id then
    raise exception 'Arquivo não pertence a este condomínio.';
  end if;

  return new;
end;
$$;

drop trigger if exists documents_storage_path_integrity on public.documents;
create trigger documents_storage_path_integrity
before insert or update on public.documents
for each row execute function public.assert_document_storage_path();

drop policy if exists "communication dispatches create authorized" on public.communication_dispatches;
create policy "communication dispatches create authorized"
on public.communication_dispatches for insert
to authenticated
with check (
  public.can_manage_communication(condominium_id)
  and created_by = auth.uid()
);

drop policy if exists "communication dispatches update authorized" on public.communication_dispatches;
create policy "communication dispatches update authorized"
on public.communication_dispatches for update
to authenticated
using (public.can_manage_communication(condominium_id))
with check (public.can_manage_communication(condominium_id));

drop policy if exists "whatsapp logs create authorized" on public.whatsapp_message_logs;
create policy "whatsapp logs create authorized"
on public.whatsapp_message_logs for insert
to authenticated
with check (
  false
);

create or replace function public.security_audit_snapshot()
returns table (
  table_name text,
  rls_enabled boolean,
  policy_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.relname::text as table_name,
    c.relrowsecurity as rls_enabled,
    count(p.polname)::int as policy_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
  where n.nspname = 'public'
    and c.relkind = 'r'
  group by c.relname, c.relrowsecurity
  order by c.relname;
$$;

grant execute on function public.security_audit_snapshot() to authenticated;
