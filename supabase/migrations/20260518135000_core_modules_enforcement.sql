create or replace function public.audit_event(
  condo_id uuid,
  event_action text,
  event_entity_type text,
  event_entity_id uuid default null,
  event_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
    event_action,
    event_entity_type,
    event_entity_id,
    event_metadata
  );
end;
$$;

create or replace function public.enforce_core_module_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if tg_table_name = 'common_areas' then
    result := public.can_create_common_area(new.condominium_id);
  elsif tg_table_name = 'bookings' then
    result := public.can_create_booking(new.condominium_id);

    if exists (
      select 1
      from public.bookings b
      where b.common_area_id = new.common_area_id
        and b.condominium_id = new.condominium_id
        and b.status not in ('canceled', 'rejected')
        and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(new.start_at, new.end_at, '[)')
    ) then
      raise exception 'Já existe reserva neste horário.';
    end if;
  elsif tg_table_name = 'tickets' then
    result := public.can_create_ticket(new.condominium_id);
  elsif tg_table_name = 'announcements' then
    result := public.can_create_announcement(new.condominium_id);
  elsif tg_table_name = 'packages' then
    result := public.can_create_package(new.condominium_id);
  end if;

  if result is not null and coalesce((result->>'allowed')::boolean, false) = false then
    raise exception 'Limite do plano atingido para %.', result->>'key';
  end if;

  return new;
end;
$$;

drop trigger if exists common_areas_enforce_plan_limit on public.common_areas;
create trigger common_areas_enforce_plan_limit
before insert on public.common_areas
for each row execute function public.enforce_core_module_limits();

drop trigger if exists bookings_enforce_plan_limit on public.bookings;
create trigger bookings_enforce_plan_limit
before insert on public.bookings
for each row execute function public.enforce_core_module_limits();

drop trigger if exists tickets_enforce_plan_limit on public.tickets;
create trigger tickets_enforce_plan_limit
before insert on public.tickets
for each row execute function public.enforce_core_module_limits();

drop trigger if exists announcements_enforce_plan_limit on public.announcements;
create trigger announcements_enforce_plan_limit
before insert on public.announcements
for each row execute function public.enforce_core_module_limits();

drop trigger if exists packages_enforce_plan_limit on public.packages;
create trigger packages_enforce_plan_limit
before insert on public.packages
for each row execute function public.enforce_core_module_limits();

create policy "common areas create granular"
on public.common_areas for insert
to authenticated
with check (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'common_areas.create')
);

create policy "common areas update granular"
on public.common_areas for update
to authenticated
using (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'common_areas.edit')
)
with check (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'common_areas.edit')
);

create policy "bookings approve granular"
on public.bookings for update
to authenticated
using (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'bookings.approve')
  or public.has_permission(condominium_id, 'bookings.cancel_any')
)
with check (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'bookings.approve')
  or public.has_permission(condominium_id, 'bookings.cancel_any')
);

create policy "packages create granular"
on public.packages for insert
to authenticated
with check (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'packages.create')
);

create policy "packages update pickup granular"
on public.packages for update
to authenticated
using (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'packages.mark_picked_up')
)
with check (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'packages.mark_picked_up')
);
