update public.plan_limits
set
  max_blocks = case plan
    when 'free' then 2
    when 'premium' then 2
    when 'pro' then 8
    when 'total' then 20
    else max_blocks
  end,
  max_apartments_per_block = case plan
    when 'free' then 24
    when 'premium' then 24
    when 'pro' then 240
    when 'total' then 1000
    else max_apartments_per_block
  end,
  max_total_apartments = case plan
    when 'free' then 24
    when 'premium' then 24
    when 'pro' then 240
    when 'total' then 1000
    else max_total_apartments
  end,
  max_whatsapp_credits_per_month = case plan
    when 'premium' then 0
    else coalesce(max_whatsapp_credits_per_month, 0)
  end
where plan in ('free', 'premium', 'pro', 'total');

create or replace function public.can_create_apartment(condo_id uuid, block_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  limits public.plan_limits;
  total_apartments int;
begin
  select pl.* into limits
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;

  select count(*) into total_apartments
  from public.apartments
  where condominium_id = condo_id;

  return public.plan_limit_result(
    condo_id,
    'apartments',
    total_apartments,
    limits.max_total_apartments
  );
end;
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
    'automatic_1_1', coalesce(plan_id, 'free') in ('pro', 'total'),
    'official_groups', coalesce(plan_id, 'free') = 'total' or automatic_multi_groups,
    'manual_groups', true,
    'templates', coalesce(plan_id, 'free') in ('pro', 'total'),
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
    'automatic_enabled', c.plan in ('pro', 'total'),
    'groups_enabled', c.plan = 'total',
    'advanced_logs', c.plan in ('pro', 'total')
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

grant execute on function public.can_create_apartment(uuid, uuid) to authenticated;
grant execute on function public.get_communication_plan_limits(uuid) to authenticated;
grant execute on function public.get_whatsapp_plan_limits(uuid) to authenticated;
