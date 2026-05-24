alter table public.whatsapp_usage
add column if not exists included_credits int not null default 0,
add column if not exists used_credits int not null default 0,
add column if not exists addon_credits int not null default 0,
add column if not exists blocked_sends int not null default 0;

update public.whatsapp_usage
set included_credits = greatest(included_credits, included_messages),
    used_credits = greatest(used_credits, used_messages),
    addon_credits = greatest(addon_credits, extra_messages);

create table if not exists public.communication_addons (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  addon_type text not null,
  quantity int not null default 1,
  credits int not null default 0,
  price_cents int not null,
  status text not null default 'active',
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.communication_addons enable row level security;

create index if not exists communication_addons_condominium_id_idx on public.communication_addons(condominium_id);
create index if not exists communication_addons_type_idx on public.communication_addons(addon_type);
create index if not exists communication_addons_status_idx on public.communication_addons(status);
create index if not exists communication_addons_created_at_idx on public.communication_addons(created_at);

drop policy if exists "communication addons read authorized" on public.communication_addons;
create policy "communication addons read authorized"
on public.communication_addons for select
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'billing.view')
  or public.has_permission(condominium_id, 'settings.view')
);

drop policy if exists "communication addons manage billing" on public.communication_addons;
create policy "communication addons manage billing"
on public.communication_addons for all
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'billing.manage')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'billing.manage')
);

create or replace function public.get_monthly_whatsapp_credits(condo_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case lower(coalesce(c.plan, 'free'))
    when 'premium' then 100
    when 'pro' then 500
    when 'total' then 2000
    else 0
  end
  from public.condominiums c
  where c.id = condo_id;
$$;

create or replace function public.current_whatsapp_addon_credits(condo_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(credits), 0)::int
  from public.communication_addons
  where condominium_id = condo_id
    and addon_type in ('messages_500', 'messages_1000', 'messages_5000')
    and status = 'active'
    and (valid_until is null or valid_until >= now());
$$;

create or replace function public.ensure_whatsapp_usage(condo_id uuid)
returns public.whatsapp_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  current_month text := public.current_whatsapp_month();
  included int := coalesce(public.get_monthly_whatsapp_credits(condo_id), 0);
  addon int := coalesce(public.current_whatsapp_addon_credits(condo_id), 0);
  usage_row public.whatsapp_usage;
begin
  insert into public.whatsapp_usage (
    condominium_id,
    month,
    included_messages,
    included_credits,
    extra_messages,
    addon_credits
  )
  values (condo_id, current_month, included, included, addon, addon)
  on conflict (condominium_id, month)
  do update set
    included_messages = excluded.included_messages,
    included_credits = excluded.included_credits,
    extra_messages = excluded.extra_messages,
    addon_credits = excluded.addon_credits,
    used_credits = greatest(public.whatsapp_usage.used_credits, public.whatsapp_usage.used_messages),
    used_messages = greatest(public.whatsapp_usage.used_messages, public.whatsapp_usage.used_credits),
    updated_at = now()
  returning * into usage_row;

  return usage_row;
end;
$$;

create or replace function public.get_whatsapp_usage(condo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  usage_row public.whatsapp_usage;
  total_limit int;
  remaining int;
  percent numeric;
  plan_id text;
begin
  usage_row := public.ensure_whatsapp_usage(condo_id);
  select lower(coalesce(plan, 'free')) into plan_id from public.condominiums where id = condo_id;

  total_limit := usage_row.included_credits + usage_row.addon_credits;
  remaining := greatest(total_limit - usage_row.used_credits, 0);
  percent := case when total_limit <= 0 then 0 else round((usage_row.used_credits::numeric / total_limit::numeric) * 100, 2) end;

  return jsonb_build_object(
    'allowed', plan_id <> 'free' and remaining > 0,
    'plan', coalesce(plan_id, 'free'),
    'month', usage_row.month,
    'included_credits', usage_row.included_credits,
    'used_credits', usage_row.used_credits,
    'addon_credits', usage_row.addon_credits,
    'blocked_sends', usage_row.blocked_sends,
    'limit', total_limit,
    'remaining', remaining,
    'percent', percent,
    'warn', total_limit > 0 and percent >= 80,
    'blocked', plan_id <> 'free' and remaining <= 0,
    'manual_only', coalesce(plan_id, 'free') = 'free',
    'message', format('Você usou %s de %s mensagens WhatsApp deste mês.', usage_row.used_credits, total_limit)
  );
end;
$$;

create or replace function public.can_use_whatsapp_credits(condo_id uuid, estimated_credits int default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  usage jsonb;
  remaining int;
  plan_id text;
begin
  usage := public.get_whatsapp_usage(condo_id);
  remaining := coalesce((usage->>'remaining')::int, 0);
  plan_id := coalesce(usage->>'plan', 'free');

  if plan_id = 'free' then
    return usage || jsonb_build_object('allowed', false, 'reason', 'Plano grátis permite apenas compartilhamento manual.');
  end if;

  if remaining < estimated_credits then
    update public.whatsapp_usage
    set blocked_sends = blocked_sends + 1,
        updated_at = now()
    where condominium_id = condo_id
      and month = public.current_whatsapp_month();

    perform public.log_plan_limit_hit(condo_id, 'whatsapp_credits', coalesce((usage->>'used_credits')::int, 0), coalesce((usage->>'limit')::int, 0));

    return public.get_whatsapp_usage(condo_id) || jsonb_build_object('allowed', false, 'reason', 'Créditos WhatsApp insuficientes.');
  end if;

  return usage || jsonb_build_object('allowed', true, 'reason', 'Créditos disponíveis.');
end;
$$;

create or replace function public.consume_whatsapp_credits(condo_id uuid, amount int default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  check_result jsonb;
begin
  if amount <= 0 then
    return public.get_whatsapp_usage(condo_id);
  end if;

  check_result := public.can_use_whatsapp_credits(condo_id, amount);

  if coalesce((check_result->>'allowed')::boolean, false) = false then
    raise exception 'Créditos WhatsApp insuficientes ou envio automático indisponível.';
  end if;

  update public.whatsapp_usage
  set used_credits = used_credits + amount,
      used_messages = used_messages + amount,
      updated_at = now()
  where condominium_id = condo_id
    and month = public.current_whatsapp_month();

  perform public.audit_event(
    condo_id,
    'consume_whatsapp_credits',
    'whatsapp_usage',
    null,
    jsonb_build_object('amount', amount)
  );

  return public.get_whatsapp_usage(condo_id);
end;
$$;

create or replace function public.consume_whatsapp_credit(condo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.consume_whatsapp_credits(condo_id, 1);
end;
$$;

create or replace function public.refund_whatsapp_credits(condo_id uuid, amount int default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if amount <= 0 then
    return public.get_whatsapp_usage(condo_id);
  end if;

  update public.whatsapp_usage
  set used_credits = greatest(used_credits - amount, 0),
      used_messages = greatest(used_messages - amount, 0),
      updated_at = now()
  where condominium_id = condo_id
    and month = public.current_whatsapp_month();

  perform public.audit_event(
    condo_id,
    'refund_whatsapp_credits',
    'whatsapp_usage',
    null,
    jsonb_build_object('amount', amount)
  );

  return public.get_whatsapp_usage(condo_id);
end;
$$;

create or replace function public.can_send_whatsapp_message(condo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  usage jsonb;
begin
  usage := public.get_whatsapp_usage(condo_id);
  return jsonb_build_object(
    'allowed', coalesce((usage->>'allowed')::boolean, false),
    'plan', usage->>'plan',
    'used', (usage->>'used_credits')::int,
    'included', (usage->>'included_credits')::int,
    'extra', (usage->>'addon_credits')::int,
    'limit', (usage->>'limit')::int,
    'remaining', (usage->>'remaining')::int,
    'percent', (usage->>'percent')::numeric,
    'warn', (usage->>'warn')::boolean,
    'blocked', (usage->>'blocked')::boolean,
    'manual_only', (usage->>'manual_only')::boolean
  );
end;
$$;

create or replace function public.get_available_addons(condo_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_array(
    jsonb_build_object('addon_type', 'messages_500', 'label', 'Pacote 500 mensagens', 'credits', 500, 'price_cents', 2990, 'billing_cycle', 'once'),
    jsonb_build_object('addon_type', 'messages_1000', 'label', 'Pacote 1.000 mensagens', 'credits', 1000, 'price_cents', 4990, 'billing_cycle', 'once'),
    jsonb_build_object('addon_type', 'messages_5000', 'label', 'Pacote 5.000 mensagens', 'credits', 5000, 'price_cents', 19990, 'billing_cycle', 'once'),
    jsonb_build_object('addon_type', 'automatic_multi_groups', 'label', 'Multi-grupos automático', 'credits', 0, 'price_cents', 4990, 'billing_cycle', 'monthly'),
    jsonb_build_object('addon_type', 'extra_channel', 'label', 'Canal extra', 'credits', 0, 'price_cents', 990, 'billing_cycle', 'monthly')
  );
$$;

create or replace function public.get_communication_plan_limits(condo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_id text;
  extra_channels int := 0;
  automatic_multi_groups boolean := false;
begin
  select lower(coalesce(c.plan, 'free')) into plan_id
  from public.condominiums c
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
    'max_channels',
      case coalesce(plan_id, 'free')
        when 'premium' then 2
        when 'pro' then 6
        when 'total' then 20
        else 1
      end + extra_channels,
    'whatsapp_messages', public.get_monthly_whatsapp_credits(condo_id),
    'automatic_1_1', coalesce(plan_id, 'free') in ('pro', 'total'),
    'official_groups', coalesce(plan_id, 'free') = 'total' or automatic_multi_groups,
    'manual_groups', coalesce(plan_id, 'free') in ('premium', 'pro', 'total'),
    'templates', coalesce(plan_id, 'free') in ('premium', 'pro', 'total'),
    'advanced_logs', coalesce(plan_id, 'free') in ('pro', 'total')
  );
end;
$$;

create or replace function public.consume_communication_channel_credit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  condo_id_value uuid;
begin
  if coalesce(new.estimated_cost_units, 0) <= 0 or new.status <> 'sent' then
    return new;
  end if;

  select condominium_id into condo_id_value
  from public.communication_dispatches
  where id = new.dispatch_id;

  if condo_id_value is not null then
    perform public.consume_whatsapp_credits(condo_id_value, new.estimated_cost_units);
  end if;

  return new;
end;
$$;

drop trigger if exists communication_channel_credit_consume on public.communication_dispatch_channels;
create trigger communication_channel_credit_consume
after insert on public.communication_dispatch_channels
for each row execute function public.consume_communication_channel_credit();

create or replace function public.purchase_addon_mock(condo_id uuid, addon_type_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  addon_id uuid;
  credits_value int := 0;
  quantity_value int := 1;
  price_value int;
  valid_until_value timestamptz := date_trunc('month', now()) + interval '1 month';
begin
  if not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'billing.manage')
  ) then
    raise exception 'Você não tem permissão para comprar add-ons.';
  end if;

  if addon_type_input = 'messages_500' then
    credits_value := 500; price_value := 2990;
  elsif addon_type_input = 'messages_1000' then
    credits_value := 1000; price_value := 4990;
  elsif addon_type_input = 'messages_5000' then
    credits_value := 5000; price_value := 19990;
  elsif addon_type_input = 'automatic_multi_groups' then
    credits_value := 0; price_value := 4990;
  elsif addon_type_input = 'extra_channel' then
    credits_value := 0; price_value := 990;
  else
    raise exception 'Add-on inválido.';
  end if;

  insert into public.communication_addons (
    condominium_id,
    addon_type,
    quantity,
    credits,
    price_cents,
    status,
    valid_until
  )
  values (
    condo_id,
    addon_type_input,
    quantity_value,
    credits_value,
    price_value,
    'active',
    valid_until_value
  )
  returning id into addon_id;

  if credits_value > 0 then
    perform public.ensure_whatsapp_usage(condo_id);
  end if;

  perform public.audit_event(
    condo_id,
    'purchase_addon_mock',
    'communication_addons',
    addon_id,
    jsonb_build_object('addon_type', addon_type_input, 'credits', credits_value, 'price_cents', price_value)
  );

  return addon_id;
end;
$$;

grant execute on function public.get_monthly_whatsapp_credits(uuid) to authenticated;
grant execute on function public.get_whatsapp_usage(uuid) to authenticated;
grant execute on function public.can_use_whatsapp_credits(uuid, int) to authenticated;
grant execute on function public.consume_whatsapp_credits(uuid, int) to authenticated;
grant execute on function public.refund_whatsapp_credits(uuid, int) to authenticated;
grant execute on function public.get_available_addons(uuid) to authenticated;
grant execute on function public.purchase_addon_mock(uuid, text) to authenticated;
