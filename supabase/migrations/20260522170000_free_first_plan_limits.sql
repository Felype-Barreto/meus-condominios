alter table public.plan_limits
  add column if not exists max_whatsapp_credits_per_month int not null default 0,
  add column if not exists max_communication_channels int not null default 1,
  add column if not exists max_upload_file_mb int not null default 2,
  add column if not exists calendar_advance_days int not null default 60;

insert into public.plan_limits (
  plan,
  max_blocks,
  max_apartments_per_block,
  max_total_apartments,
  max_admins,
  max_syndics,
  max_doormen,
  max_common_areas,
  max_bookings_per_month,
  max_tickets_per_month,
  max_announcements_per_month,
  max_packages_per_month,
  max_storage_mb,
  ads_enabled,
  brand_required,
  advanced_permissions,
  reports_enabled,
  exports_enabled,
  max_whatsapp_credits_per_month,
  max_communication_channels,
  max_upload_file_mb,
  calendar_advance_days
)
values
  ('free', 2, 12, 24, 1, 1, 0, 2, 20, 30, 20, 10, 30, true, true, false, false, false, 0, 1, 2, 60),
  ('premium', 4, 20, 80, 2, 2, 1, 5, 150, 250, 150, 250, 500, false, false, true, false, false, 100, 2, 5, 180),
  ('pro', 8, 30, 240, 6, 6, 3, 15, 800, 1500, 800, 1500, 3000, false, false, true, true, true, 500, 6, 10, 365),
  ('total', 20, 50, 1000, 20, 20, 10, 100, 5000, 10000, 5000, 10000, 20000, false, false, true, true, true, 2000, 20, 25, 730)
on conflict (plan) do update
set
  max_blocks = excluded.max_blocks,
  max_apartments_per_block = excluded.max_apartments_per_block,
  max_total_apartments = excluded.max_total_apartments,
  max_admins = excluded.max_admins,
  max_syndics = excluded.max_syndics,
  max_doormen = excluded.max_doormen,
  max_common_areas = excluded.max_common_areas,
  max_bookings_per_month = excluded.max_bookings_per_month,
  max_tickets_per_month = excluded.max_tickets_per_month,
  max_announcements_per_month = excluded.max_announcements_per_month,
  max_packages_per_month = excluded.max_packages_per_month,
  max_storage_mb = excluded.max_storage_mb,
  ads_enabled = excluded.ads_enabled,
  brand_required = excluded.brand_required,
  advanced_permissions = excluded.advanced_permissions,
  reports_enabled = excluded.reports_enabled,
  exports_enabled = excluded.exports_enabled,
  max_whatsapp_credits_per_month = excluded.max_whatsapp_credits_per_month,
  max_communication_channels = excluded.max_communication_channels,
  max_upload_file_mb = excluded.max_upload_file_mb,
  calendar_advance_days = excluded.calendar_advance_days;

create or replace function public.get_monthly_whatsapp_credits(condo_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(pl.max_whatsapp_credits_per_month, 0)
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.get_communication_plan_limits(condo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_id text;
  base_channels int := 1;
  extra_channels int := 0;
  automatic_multi_groups boolean := false;
begin
  select lower(coalesce(c.plan, 'free')), coalesce(pl.max_communication_channels, 1)
    into plan_id, base_channels
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;

  select coalesce(sum(quantity), 0) into extra_channels
  from public.communication_addons
  where condominium_id = condo_id
    and addon_type = 'extra_channel'
    and status in ('active', 'requested')
    and (valid_until is null or valid_until >= now());

  select exists (
    select 1
    from public.communication_addons
    where condominium_id = condo_id
      and addon_type = 'automatic_multi_groups'
      and status in ('active', 'requested')
      and (valid_until is null or valid_until >= now())
  ) into automatic_multi_groups;

  return jsonb_build_object(
    'plan', coalesce(plan_id, 'free'),
    'max_channels', base_channels + extra_channels,
    'whatsapp_messages', public.get_monthly_whatsapp_credits(condo_id),
    'automatic_1_1', coalesce(plan_id, 'free') in ('premium', 'pro', 'total'),
    'official_groups', coalesce(plan_id, 'free') = 'total' or automatic_multi_groups,
    'manual_groups', true,
    'templates', coalesce(plan_id, 'free') in ('premium', 'pro', 'total'),
    'advanced_logs', coalesce(plan_id, 'free') in ('pro', 'total'),
    'calendar_advance_days', (
      select coalesce(pl.calendar_advance_days, 60)
      from public.condominiums c
      join public.plan_limits pl on pl.plan = c.plan
      where c.id = condo_id
    )
  );
end;
$$;

create or replace function public.get_whatsapp_plan_limits(condo_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'plan', c.plan,
    'included_messages', coalesce(pl.max_whatsapp_credits_per_month, 0),
    'included_credits', coalesce(pl.max_whatsapp_credits_per_month, 0),
    'automatic_enabled', c.plan in ('premium', 'pro', 'total'),
    'groups_enabled', c.plan = 'total',
    'advanced_logs', c.plan in ('pro', 'total')
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.can_upload_file(condo_id uuid, file_size bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  limits public.plan_limits;
  used_mb int := (public.get_current_usage(condo_id)->>'storage_mb')::int;
  file_mb int := ceil(file_size / 1048576.0)::int;
  allowed boolean;
  percent numeric;
  single_file_limit int;
begin
  select pl.* into limits
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;

  single_file_limit := coalesce(limits.max_upload_file_mb, 2);
  allowed := file_mb <= single_file_limit and used_mb + file_mb <= limits.max_storage_mb;
  percent := case
    when limits.max_storage_mb <= 0 then 100
    else round(((used_mb + file_mb)::numeric / limits.max_storage_mb::numeric) * 100, 2)
  end;

  if not allowed then
    perform public.log_plan_limit_hit(
      condo_id,
      case when file_mb > single_file_limit then 'upload_file_mb' else 'storage_mb' end,
      case when file_mb > single_file_limit then file_mb else used_mb + file_mb end,
      case when file_mb > single_file_limit then single_file_limit else limits.max_storage_mb end
    );
  end if;

  return jsonb_build_object(
    'key', 'storage_mb',
    'allowed', allowed,
    'used', used_mb + file_mb,
    'limit', limits.max_storage_mb,
    'percent', percent,
    'warn', percent >= 80,
    'blocked', not allowed,
    'file_size_mb', file_mb,
    'max_upload_file_mb', single_file_limit,
    'reason',
      case
        when file_mb > single_file_limit then format('Arquivo acima do limite de %s MB do plano.', single_file_limit)
        when used_mb + file_mb > limits.max_storage_mb then 'Limite de armazenamento do plano atingido.'
        else 'Upload permitido.'
      end
  );
end;
$$;

create or replace function public.enforce_booking_calendar_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  advance_days int;
begin
  select coalesce(pl.calendar_advance_days, 60)
    into advance_days
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = new.condominium_id;

  if new.start_at is not null and new.start_at::date > (current_date + advance_days) then
    raise exception 'Este plano permite agendamentos ate % dias a frente.', advance_days;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_calendar_plan_limit on public.bookings;
create trigger bookings_calendar_plan_limit
before insert or update of start_at, condominium_id on public.bookings
for each row execute function public.enforce_booking_calendar_limit();

grant execute on function public.get_monthly_whatsapp_credits(uuid) to authenticated;
grant execute on function public.get_communication_plan_limits(uuid) to authenticated;
grant execute on function public.get_whatsapp_plan_limits(uuid) to authenticated;
grant execute on function public.can_upload_file(uuid, bigint) to authenticated;

create or replace function public.enforce_free_first_condominium_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((new.settings->>'allow_paid_initial_plan')::boolean, false) = false then
    new.plan := 'free';
    new.subscription_status := 'free';
  end if;
  return new;
end;
$$;

drop trigger if exists condominiums_free_first_insert on public.condominiums;
create trigger condominiums_free_first_insert
before insert on public.condominiums
for each row execute function public.enforce_free_first_condominium_insert();
