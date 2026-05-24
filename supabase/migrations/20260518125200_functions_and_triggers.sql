-- Shared helpers, timestamps, profile bootstrap and audit triggers.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger condominiums_set_updated_at before update on public.condominiums
for each row execute function public.set_updated_at();

create trigger apartments_set_updated_at before update on public.apartments
for each row execute function public.set_updated_at();

create trigger memberships_set_updated_at before update on public.memberships
for each row execute function public.set_updated_at();

create trigger syndic_profiles_set_updated_at before update on public.syndic_profiles
for each row execute function public.set_updated_at();

create trigger common_areas_set_updated_at before update on public.common_areas
for each row execute function public.set_updated_at();

create trigger bookings_set_updated_at before update on public.bookings
for each row execute function public.set_updated_at();

create trigger tickets_set_updated_at before update on public.tickets
for each row execute function public.set_updated_at();

create trigger announcements_set_updated_at before update on public.announcements
for each row execute function public.set_updated_at();

create trigger packages_set_updated_at before update on public.packages
for each row execute function public.set_updated_at();

create trigger incidents_set_updated_at before update on public.incidents
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_user_membership(condo_id uuid)
returns public.memberships
language sql
stable
security definer
set search_path = public
as $$
  select m.*
  from public.memberships m
  where m.condominium_id = condo_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  order by
    case m.role
      when 'subscriber_admin' then 1
      when 'admin' then 2
      when 'syndic' then 3
      when 'doorman' then 4
      when 'owner' then 5
      when 'resident' then 6
      else 7
    end
  limit 1;
$$;

create or replace function public.get_user_role(condo_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.get_user_membership(condo_id);
$$;

create or replace function public.is_subscriber_admin(condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.condominium_id = condo_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'subscriber_admin'
  );
$$;

create or replace function public.is_condo_admin(condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.condominium_id = condo_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('subscriber_admin', 'admin', 'syndic')
  );
$$;

create or replace function public.is_condo_staff(condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.condominium_id = condo_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('subscriber_admin', 'admin', 'syndic', 'doorman')
  );
$$;

create or replace function public.has_permission(condo_id uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_subscriber_admin(condo_id)
    or exists (
      select 1
      from public.memberships m
      where m.condominium_id = condo_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and (
          m.permissions ? permission_key
          and coalesce((m.permissions->>permission_key)::boolean, false)
        )
    ),
    false
  );
$$;

create or replace function public.get_plan_limits(condo_id uuid)
returns public.plan_limits
language sql
stable
security definer
set search_path = public
as $$
  select pl.*
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id
    and (
      public.is_condo_staff(condo_id)
      or exists (
        select 1 from public.memberships m
        where m.condominium_id = condo_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    );
$$;

create or replace function public.current_user_apartment_ids(condo_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.apartment_id
  from public.memberships m
  where m.condominium_id = condo_id
    and m.user_id = auth.uid()
    and m.status = 'active'
    and m.apartment_id is not null;
$$;

create or replace function public.log_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  condo_id uuid;
  row_id uuid;
  row_data jsonb;
  payload jsonb;
begin
  row_data := coalesce(to_jsonb(new), to_jsonb(old));
  row_id := (row_data->>'id')::uuid;

  if tg_table_name = 'condominiums' then
    condo_id := row_id;
  else
    condo_id := nullif(row_data->>'condominium_id', '')::uuid;
  end if;

  if condo_id is null then
    return coalesce(new, old);
  end if;

  payload := jsonb_build_object(
    'old', case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    'new', case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  insert into public.audit_logs (
    condominium_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    condo_id,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    row_id,
    payload
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_condominiums
after insert or update on public.condominiums
for each row execute function public.log_admin_audit();

create trigger audit_memberships
after insert or update or delete on public.memberships
for each row execute function public.log_admin_audit();

create trigger audit_invites
after insert or update or delete on public.invites
for each row execute function public.log_admin_audit();

create trigger audit_documents
after insert or update or delete on public.documents
for each row execute function public.log_admin_audit();

create trigger audit_incidents
after insert or update or delete on public.incidents
for each row execute function public.log_admin_audit();
