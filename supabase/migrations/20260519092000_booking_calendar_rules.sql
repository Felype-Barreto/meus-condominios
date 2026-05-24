alter table public.common_areas
  add column if not exists available_days int[] not null default array[0,1,2,3,4,5,6]::int[],
  add column if not exists available_start_time time not null default '08:00',
  add column if not exists available_end_time time not null default '22:00',
  add column if not exists min_duration_minutes int not null default 60,
  add column if not exists max_duration_minutes int not null default 240,
  add column if not exists min_notice_hours int not null default 24,
  add column if not exists max_notice_days int not null default 60,
  add column if not exists max_bookings_per_apartment_month int not null default 4;

create table if not exists public.common_area_availability (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  common_area_id uuid not null references public.common_areas(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes int not null default 60,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.common_area_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  common_area_id uuid references public.common_areas(id) on delete cascade,
  blocked_date date not null,
  reason text,
  full_day boolean not null default true,
  start_time time,
  end_time time,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_rules (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  common_area_id uuid not null references public.common_areas(id) on delete cascade,
  max_bookings_per_apartment_month int not null default 4,
  allow_overlapping boolean not null default false,
  auto_approve boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (common_area_id)
);

create index if not exists common_area_availability_condominium_id_idx on public.common_area_availability (condominium_id);
create index if not exists common_area_availability_common_area_id_idx on public.common_area_availability (common_area_id);
create index if not exists common_area_blocked_dates_condominium_id_idx on public.common_area_blocked_dates (condominium_id);
create index if not exists common_area_blocked_dates_common_area_id_idx on public.common_area_blocked_dates (common_area_id);
create index if not exists common_area_blocked_dates_date_idx on public.common_area_blocked_dates (blocked_date);
create index if not exists booking_rules_condominium_id_idx on public.booking_rules (condominium_id);
create index if not exists booking_rules_common_area_id_idx on public.booking_rules (common_area_id);

alter table public.common_area_availability enable row level security;
alter table public.common_area_blocked_dates enable row level security;
alter table public.booking_rules enable row level security;

drop trigger if exists common_area_availability_set_updated_at on public.common_area_availability;
create trigger common_area_availability_set_updated_at before update on public.common_area_availability
for each row execute function public.set_updated_at();

drop trigger if exists booking_rules_set_updated_at on public.booking_rules;
create trigger booking_rules_set_updated_at before update on public.booking_rules
for each row execute function public.set_updated_at();

create policy "common area availability read members"
on public.common_area_availability for select
to authenticated
using (public.get_user_role(condominium_id) is not null);

create policy "common area availability manage authorized"
on public.common_area_availability for all
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'common_areas.edit'))
with check (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'common_areas.edit'));

create policy "common area blocked dates read members"
on public.common_area_blocked_dates for select
to authenticated
using (public.get_user_role(condominium_id) is not null);

create policy "common area blocked dates manage authorized"
on public.common_area_blocked_dates for all
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'common_areas.edit'))
with check (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'common_areas.edit'));

create policy "booking rules read members"
on public.booking_rules for select
to authenticated
using (public.get_user_role(condominium_id) is not null);

create policy "booking rules manage authorized"
on public.booking_rules for all
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'common_areas.edit') or public.has_permission(condominium_id, 'bookings.manage_rules'))
with check (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'common_areas.edit') or public.has_permission(condominium_id, 'bookings.manage_rules'));

create or replace function public.validate_booking_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  area_record record;
  rules_record record;
  conflict_exists boolean;
  blocked_exists boolean;
  month_count int;
  duration_minutes int;
begin
  if new.status not in ('pending', 'approved') then
    return new;
  end if;

  select * into area_record
  from public.common_areas
  where id = new.common_area_id
    and condominium_id = new.condominium_id;

  if area_record.id is null then
    raise exception 'Área comum inválida.';
  end if;

  select * into rules_record
  from public.booking_rules
  where common_area_id = new.common_area_id;

  duration_minutes := extract(epoch from (new.end_at - new.start_at))::int / 60;

  if new.end_at <= new.start_at then
    raise exception 'Horário final deve ser maior que o inicial.';
  end if;

  if duration_minutes < coalesce(area_record.min_duration_minutes, 60)
    or duration_minutes > coalesce(area_record.max_duration_minutes, 240) then
    raise exception 'Duração da reserva fora das regras da área.';
  end if;

  if extract(dow from new.start_at)::int <> any(area_record.available_days) then
    raise exception 'Área indisponível neste dia da semana.';
  end if;

  if new.start_at::time < area_record.available_start_time
    or new.end_at::time > area_record.available_end_time then
    raise exception 'Horário fora do funcionamento da área.';
  end if;

  if new.start_at < now() + make_interval(hours => coalesce(area_record.min_notice_hours, 24)) then
    raise exception 'Reserva fora da antecedência mínima.';
  end if;

  if new.start_at > now() + make_interval(days => coalesce(area_record.max_notice_days, 60)) then
    raise exception 'Reserva fora da antecedência máxima.';
  end if;

  select exists (
    select 1
    from public.common_area_blocked_dates b
    where b.condominium_id = new.condominium_id
      and (b.common_area_id is null or b.common_area_id = new.common_area_id)
      and b.blocked_date = new.start_at::date
      and (
        b.full_day = true
        or (
          b.start_time is not null
          and b.end_time is not null
          and new.start_at::time < b.end_time
          and new.end_at::time > b.start_time
        )
      )
  ) into blocked_exists;

  if blocked_exists then
    raise exception 'Data bloqueada para esta área comum.';
  end if;

  if coalesce(rules_record.allow_overlapping, false) = false then
    select exists (
      select 1
      from public.bookings b
      where b.condominium_id = new.condominium_id
        and b.common_area_id = new.common_area_id
        and b.id <> coalesce(new.id, gen_random_uuid())
        and b.status in ('pending', 'approved')
        and new.start_at < b.end_at
        and new.end_at > b.start_at
    ) into conflict_exists;

    if conflict_exists then
      raise exception 'Já existe reserva neste horário.';
    end if;
  end if;

  select count(*) into month_count
  from public.bookings b
  where b.condominium_id = new.condominium_id
    and b.common_area_id = new.common_area_id
    and b.apartment_id = new.apartment_id
    and b.status in ('pending', 'approved')
    and date_trunc('month', b.start_at) = date_trunc('month', new.start_at);

  if month_count >= coalesce(rules_record.max_bookings_per_apartment_month, area_record.max_bookings_per_apartment_month, 4) then
    raise exception 'Limite mensal de reservas por apartamento atingido.';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_validate_rules on public.bookings;
create trigger bookings_validate_rules before insert or update of start_at, end_at, common_area_id, apartment_id, status
on public.bookings
for each row execute function public.validate_booking_rules();
