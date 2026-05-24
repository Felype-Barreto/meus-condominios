-- Guard tenant reference checks from touching columns that do not exist on the
-- table currently firing the shared trigger.

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

  if tg_table_name = 'memberships' then
    if new.apartment_id is not null and not exists (
      select 1
      from public.apartments a
      where a.id = new.apartment_id
        and a.condominium_id = condo_id
    ) then
      raise exception 'Apartamento nao pertence a este condominio.';
    end if;

    return new;
  end if;

  if tg_table_name = 'syndic_profiles' then
    if not exists (
      select 1
      from public.memberships m
      where m.id = new.membership_id
        and m.condominium_id = condo_id
    ) then
      raise exception 'Membership do sindico nao pertence a este condominio.';
    end if;

    return new;
  end if;

  if tg_table_name = 'invites' then
    if new.apartment_id is not null and not exists (
      select 1
      from public.apartments a
      where a.id = new.apartment_id
        and a.condominium_id = condo_id
    ) then
      raise exception 'Apartamento do convite nao pertence a este condominio.';
    end if;

    return new;
  end if;

  if tg_table_name = 'bookings' then
    if new.common_area_id is not null and not exists (
      select 1
      from public.common_areas ca
      where ca.id = new.common_area_id
        and ca.condominium_id = condo_id
    ) then
      raise exception 'Area comum nao pertence a este condominio.';
    end if;

    if new.apartment_id is not null and not exists (
      select 1
      from public.apartments a
      where a.id = new.apartment_id
        and a.condominium_id = condo_id
    ) then
      raise exception 'Apartamento da reserva nao pertence a este condominio.';
    end if;

    return new;
  end if;

  if tg_table_name in ('tickets', 'packages', 'incidents', 'visitor_contact_requests') then
    if new.apartment_id is not null and not exists (
      select 1
      from public.apartments a
      where a.id = new.apartment_id
        and a.condominium_id = condo_id
    ) then
      raise exception 'Apartamento nao pertence a este condominio.';
    end if;

    return new;
  end if;

  if tg_table_name in ('common_area_availability', 'common_area_blocked_dates', 'booking_rules') then
    if not exists (
      select 1
      from public.common_areas ca
      where ca.id = new.common_area_id
        and ca.condominium_id = condo_id
    ) then
      raise exception 'Area comum nao pertence a este condominio.';
    end if;

    return new;
  end if;

  if tg_table_name = 'communication_channels' then
    if new.block_id is not null and not exists (
      select 1
      from public.blocks b
      where b.id = new.block_id
        and b.condominium_id = condo_id
    ) then
      raise exception 'Bloco do canal nao pertence a este condominio.';
    end if;

    return new;
  end if;

  if tg_table_name = 'whatsapp_groups' then
    if new.block_id is not null and not exists (
      select 1
      from public.blocks b
      where b.id = new.block_id
        and b.condominium_id = condo_id
    ) then
      raise exception 'Bloco do grupo nao pertence a este condominio.';
    end if;

    return new;
  end if;

  return new;
end;
$$;
