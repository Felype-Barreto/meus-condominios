create table if not exists public.communication_channels (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null,
  type text not null check (type in ('app', 'whatsapp_manual', 'whatsapp_official', 'email', 'push')),
  scope text not null check (scope in ('all', 'block', 'apartment', 'role', 'staff', 'council', 'garage', 'gate')),
  block_id uuid references public.blocks(id) on delete set null,
  role text,
  status text not null default 'active' check (status in ('active', 'inactive', 'pending', 'failed', 'manual_only')),
  plan_required text not null default 'free',
  settings jsonb not null default '{}'::jsonb,
  allowed_message_types jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_dispatches (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  created_by uuid references public.profiles(id),
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'important', 'urgent')),
  message_type text not null check (message_type in ('announcement', 'maintenance', 'booking', 'package', 'security', 'meeting', 'summary', 'other')),
  target_type text not null check (target_type in ('all', 'block', 'apartment', 'role', 'channel')),
  target_ids uuid[],
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'partially_failed', 'failed', 'canceled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_dispatch_channels (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.communication_dispatches(id) on delete cascade,
  channel_id uuid not null references public.communication_channels(id) on delete cascade,
  status text not null default 'pending',
  provider_message_id text,
  error_message text,
  estimated_cost_units int not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete cascade,
  name text not null,
  category text not null,
  title_template text not null,
  body_template text not null,
  message_type text not null,
  safe_for_groups boolean not null default false,
  requires_private_channel boolean not null default false,
  suggested_priority text not null default 'normal',
  suggested_channels jsonb not null default '[]'::jsonb,
  variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_safety_rules (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete cascade,
  rule_key text not null,
  description text,
  enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.channel_usage_limits (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  month text not null,
  channel_id uuid not null references public.communication_channels(id) on delete cascade,
  sent_count int not null default 0,
  failed_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(condominium_id, month, channel_id)
);

create index if not exists communication_channels_condominium_id_idx on public.communication_channels(condominium_id);
create index if not exists communication_channels_type_idx on public.communication_channels(type);
create index if not exists communication_channels_scope_idx on public.communication_channels(scope);
create index if not exists communication_channels_status_idx on public.communication_channels(status);
create index if not exists communication_channels_created_at_idx on public.communication_channels(created_at);

create index if not exists communication_dispatches_condominium_id_idx on public.communication_dispatches(condominium_id);
create index if not exists communication_dispatches_created_by_idx on public.communication_dispatches(created_by);
create index if not exists communication_dispatches_status_idx on public.communication_dispatches(status);
create index if not exists communication_dispatches_message_type_idx on public.communication_dispatches(message_type);
create index if not exists communication_dispatches_created_at_idx on public.communication_dispatches(created_at);

create index if not exists communication_dispatch_channels_dispatch_id_idx on public.communication_dispatch_channels(dispatch_id);
create index if not exists communication_dispatch_channels_channel_id_idx on public.communication_dispatch_channels(channel_id);
create index if not exists communication_dispatch_channels_status_idx on public.communication_dispatch_channels(status);
create index if not exists communication_dispatch_channels_created_at_idx on public.communication_dispatch_channels(created_at);

create index if not exists communication_templates_condominium_id_idx on public.communication_templates(condominium_id);
create index if not exists communication_templates_category_idx on public.communication_templates(category);
create index if not exists communication_templates_message_type_idx on public.communication_templates(message_type);
create index if not exists communication_templates_created_at_idx on public.communication_templates(created_at);

create index if not exists communication_safety_rules_condominium_id_idx on public.communication_safety_rules(condominium_id);
create index if not exists communication_safety_rules_rule_key_idx on public.communication_safety_rules(rule_key);
create index if not exists channel_usage_limits_condominium_id_idx on public.channel_usage_limits(condominium_id);
create index if not exists channel_usage_limits_channel_id_idx on public.channel_usage_limits(channel_id);

drop trigger if exists communication_channels_set_updated_at on public.communication_channels;
create trigger communication_channels_set_updated_at before update on public.communication_channels
for each row execute function public.set_updated_at();

drop trigger if exists communication_dispatches_set_updated_at on public.communication_dispatches;
create trigger communication_dispatches_set_updated_at before update on public.communication_dispatches
for each row execute function public.set_updated_at();

drop trigger if exists communication_templates_set_updated_at on public.communication_templates;
create trigger communication_templates_set_updated_at before update on public.communication_templates
for each row execute function public.set_updated_at();

drop trigger if exists channel_usage_limits_set_updated_at on public.channel_usage_limits;
create trigger channel_usage_limits_set_updated_at before update on public.channel_usage_limits
for each row execute function public.set_updated_at();

alter table public.communication_channels enable row level security;
alter table public.communication_dispatches enable row level security;
alter table public.communication_dispatch_channels enable row level security;
alter table public.communication_templates enable row level security;
alter table public.communication_safety_rules enable row level security;
alter table public.channel_usage_limits enable row level security;

create or replace function public.get_communication_plan_limits(condo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_id text;
  extra_channels int := 0;
begin
  select lower(coalesce(c.plan, 'free')) into plan_id
  from public.condominiums c
  where c.id = condo_id;

  select coalesce(sum(quantity), 0) into extra_channels
  from public.whatsapp_addons
  where condominium_id = condo_id
    and addon_type = 'extra_channel'
    and status in ('active', 'requested');

  return jsonb_build_object(
    'plan', coalesce(plan_id, 'free'),
    'max_channels',
      case coalesce(plan_id, 'free')
        when 'premium' then 2
        when 'pro' then 6
        when 'total' then 20
        else 1
      end + extra_channels,
    'whatsapp_messages',
      case coalesce(plan_id, 'free')
        when 'premium' then 100
        when 'pro' then 500
        when 'total' then 2000
        else 0
      end,
    'automatic_1_1', coalesce(plan_id, 'free') in ('pro', 'total'),
    'official_groups', coalesce(plan_id, 'free') = 'total',
    'manual_groups', coalesce(plan_id, 'free') in ('premium', 'pro', 'total'),
    'templates', coalesce(plan_id, 'free') in ('premium', 'pro', 'total'),
    'advanced_logs', coalesce(plan_id, 'free') in ('pro', 'total')
  );
end;
$$;

create or replace function public.can_create_communication_channel(condo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  limits jsonb;
  used int;
begin
  limits := public.get_communication_plan_limits(condo_id);
  select count(*) into used
  from public.communication_channels
  where condominium_id = condo_id
    and type <> 'app'
    and status <> 'inactive';

  return jsonb_build_object(
    'allowed', used < (limits->>'max_channels')::int,
    'used', used,
    'limit', (limits->>'max_channels')::int,
    'percent', case when (limits->>'max_channels')::int = 0 then 100 else round((used::numeric / (limits->>'max_channels')::numeric) * 100)::int end,
    'warn', used >= greatest(1, floor((limits->>'max_channels')::numeric * 0.8)::int),
    'blocked', used >= (limits->>'max_channels')::int
  );
end;
$$;

create or replace function public.assert_communication_channel_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if new.type = 'app' then
    return new;
  end if;

  result := public.can_create_communication_channel(new.condominium_id);
  if coalesce((result->>'allowed')::boolean, false) is false then
    raise exception 'Limite de canais do plano atingido.';
  end if;
  return new;
end;
$$;

drop trigger if exists communication_channel_limit on public.communication_channels;
create trigger communication_channel_limit before insert on public.communication_channels
for each row execute function public.assert_communication_channel_limit();

create or replace function public.is_group_safe_message(message_body text)
returns boolean
language plpgsql
immutable
as $$
begin
  return not (
    message_body ~* 'telefone|whatsapp|cpf|rg|inadimpl|cobran|visitante|encomenda.*nome|apartamento [0-9]{1,5}.*deve'
  );
end;
$$;

create or replace function public.dispatch_communication(
  condo_id uuid,
  dispatch_title text,
  dispatch_body text,
  dispatch_priority text,
  dispatch_message_type text,
  dispatch_target_type text,
  dispatch_target_ids uuid[],
  channel_ids uuid[],
  schedule_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  dispatch_id uuid;
  channel record;
  limits jsonb;
  channel_status text;
begin
  if actor is null then
    raise exception 'Entre na sua conta.';
  end if;

  if not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'announcements.create')
    or public.has_permission(condo_id, 'settings.edit')
  ) then
    raise exception 'Você não tem permissão para disparar comunicação.';
  end if;

  if dispatch_priority = 'urgent' and length(trim(dispatch_body)) < 10 then
    raise exception 'Comunicado urgente precisa de mensagem clara.';
  end if;

  limits := public.get_communication_plan_limits(condo_id);

  insert into public.communication_dispatches (
    condominium_id, created_by, title, body, priority, message_type, target_type,
    target_ids, status, scheduled_at, sent_at
  )
  values (
    condo_id, actor, dispatch_title, dispatch_body, dispatch_priority, dispatch_message_type,
    dispatch_target_type, dispatch_target_ids,
    case when schedule_at is not null then 'scheduled' else 'sent' end,
    schedule_at,
    case when schedule_at is null then now() else null end
  )
  returning id into dispatch_id;

  for channel in
    select *
    from public.communication_channels
    where condominium_id = condo_id
      and id = any(channel_ids)
      and status <> 'inactive'
  loop
    channel_status := 'sent';

    if channel.type = 'whatsapp_official' and coalesce((limits->>'official_groups')::boolean, false) is false then
      channel_status := 'manual_only';
    elsif channel.type = 'whatsapp_official' and channel.status <> 'active' then
      channel_status := 'manual_only';
    elsif channel.type in ('whatsapp_manual', 'whatsapp_official') and channel.scope in ('all', 'block', 'garage', 'gate', 'council', 'staff') and public.is_group_safe_message(dispatch_body) is false then
      channel_status := 'failed';
    elsif schedule_at is not null then
      channel_status := 'pending';
    end if;

    insert into public.communication_dispatch_channels (
      dispatch_id,
      channel_id,
      status,
      estimated_cost_units,
      sent_at,
      error_message
    )
    values (
      dispatch_id,
      channel.id,
      channel_status,
      case when channel.type = 'whatsapp_official' and channel_status = 'sent' then 1 else 0 end,
      case when channel_status = 'sent' then now() else null end,
      case
        when channel_status = 'failed' then 'Mensagem bloqueada por regra de segurança para grupo.'
        when channel_status = 'manual_only' then 'Canal usa fallback manual neste plano/configuração.'
        else null
      end
    );

    insert into public.channel_usage_limits (condominium_id, month, channel_id, sent_count, failed_count)
    values (
      condo_id,
      to_char(now(), 'YYYY-MM'),
      channel.id,
      case when channel_status = 'sent' then 1 else 0 end,
      case when channel_status = 'failed' then 1 else 0 end
    )
    on conflict (condominium_id, month, channel_id)
    do update set
      sent_count = public.channel_usage_limits.sent_count + excluded.sent_count,
      failed_count = public.channel_usage_limits.failed_count + excluded.failed_count,
      updated_at = now();
  end loop;

  if not exists (
    select 1
    from public.communication_dispatch_channels c
    where c.dispatch_id = dispatch_id
  ) then
    raise exception 'Selecione pelo menos um canal ativo.';
  end if;

  perform public.audit_event(
    condo_id,
    'communication_dispatch',
    'communication_dispatches',
    dispatch_id,
    jsonb_build_object('channels', coalesce(array_length(channel_ids, 1), 0), 'message_type', dispatch_message_type)
  );

  return dispatch_id;
end;
$$;

drop policy if exists "communication channels read authorized" on public.communication_channels;
create policy "communication channels read authorized"
on public.communication_channels for select
to authenticated
using (
  public.get_user_role(condominium_id) is not null
);

drop policy if exists "communication channels manage authorized" on public.communication_channels;
create policy "communication channels manage authorized"
on public.communication_channels for all
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'settings.edit')
  or public.has_permission(condominium_id, 'announcements.create')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'settings.edit')
  or public.has_permission(condominium_id, 'announcements.create')
);

drop policy if exists "communication dispatches read authorized" on public.communication_dispatches;
create policy "communication dispatches read authorized"
on public.communication_dispatches for select
to authenticated
using (
  public.get_user_role(condominium_id) is not null
);

drop policy if exists "communication dispatches create authorized" on public.communication_dispatches;
create policy "communication dispatches create authorized"
on public.communication_dispatches for insert
to authenticated
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'announcements.create')
  or public.has_permission(condominium_id, 'settings.edit')
);

drop policy if exists "communication dispatch channels read authorized" on public.communication_dispatch_channels;
create policy "communication dispatch channels read authorized"
on public.communication_dispatch_channels for select
to authenticated
using (
  exists (
    select 1
    from public.communication_dispatches d
    where d.id = dispatch_id
      and public.get_user_role(d.condominium_id) is not null
  )
);

drop policy if exists "communication templates read members" on public.communication_templates;
create policy "communication templates read members"
on public.communication_templates for select
to authenticated
using (
  condominium_id is null
  or public.get_user_role(condominium_id) is not null
);

drop policy if exists "communication templates manage authorized" on public.communication_templates;
create policy "communication templates manage authorized"
on public.communication_templates for all
to authenticated
using (
  condominium_id is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'announcements.create')
    or public.has_permission(condominium_id, 'settings.edit')
  )
)
with check (
  condominium_id is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'announcements.create')
    or public.has_permission(condominium_id, 'settings.edit')
  )
);

drop policy if exists "communication safety rules read members" on public.communication_safety_rules;
create policy "communication safety rules read members"
on public.communication_safety_rules for select
to authenticated
using (
  condominium_id is null
  or public.get_user_role(condominium_id) is not null
);

drop policy if exists "channel usage read authorized" on public.channel_usage_limits;
create policy "channel usage read authorized"
on public.channel_usage_limits for select
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'announcements.create')
  or public.has_permission(condominium_id, 'audit_logs.view')
);

insert into public.communication_templates (
  condominium_id, name, category, title_template, body_template, message_type,
  safe_for_groups, requires_private_channel, suggested_priority, suggested_channels, variables
)
values
  (null, 'Falta de água', 'Manutenção', 'Aviso de falta de água', 'Olá! Informamos que haverá interrupção no abastecimento de água em {{data}} a partir de {{hora}}. Assim que o serviço for normalizado, avisaremos pelos canais oficiais.', 'maintenance', true, false, 'important', '["app","whatsapp_manual"]'::jsonb, '["data","hora"]'::jsonb),
  (null, 'Manutenção do elevador', 'Manutenção', 'Manutenção do elevador', 'O elevador {{local}} passará por manutenção em {{data}}. Durante o período, siga as orientações da administração.', 'maintenance', true, false, 'important', '["app","whatsapp_manual"]'::jsonb, '["local","data"]'::jsonb),
  (null, 'Assembleia', 'Reuniões', 'Convocação de assembleia', 'A administração convida os moradores para assembleia em {{data}}, às {{hora}}. A pauta e os detalhes estão disponíveis no Moraí.', 'meeting', true, false, 'important', '["app","whatsapp_manual"]'::jsonb, '["data","hora"]'::jsonb),
  (null, 'Limpeza da caixa dágua', 'Manutenção', 'Limpeza da caixa dágua', 'A limpeza da caixa dágua ocorrerá em {{data}}. Pedimos que todos se programem e acompanhem os avisos oficiais.', 'maintenance', true, false, 'normal', '["app","whatsapp_manual"]'::jsonb, '["data"]'::jsonb),
  (null, 'Segurança', 'Segurança', 'Aviso de segurança', 'Reforçamos uma orientação importante de segurança: {{orientacao}}. Em caso de dúvida, procure a administração ou a portaria.', 'security', true, false, 'urgent', '["app","whatsapp_manual"]'::jsonb, '["orientacao"]'::jsonb),
  (null, 'Encomenda privada', 'Encomendas', 'Encomenda disponível', 'Há uma encomenda disponível para retirada. Consulte os detalhes no Moraí.', 'package', false, true, 'normal', '["app"]'::jsonb, '[]'::jsonb)
on conflict do nothing;

insert into public.communication_safety_rules (condominium_id, rule_key, description, enabled, settings)
values
  (null, 'no_sensitive_data_in_groups', 'Bloqueia telefone, cobranças individuais, visitantes e dados sensíveis em canais de grupo.', true, '{}'::jsonb),
  (null, 'whatsapp_requires_opt_in', 'Envio privado por WhatsApp exige consentimento do morador.', true, '{}'::jsonb),
  (null, 'manual_fallback_when_official_missing', 'Quando a integração oficial não está ativa, o canal vira manual.', true, '{}'::jsonb)
on conflict do nothing;

grant execute on function public.get_communication_plan_limits(uuid) to authenticated;
grant execute on function public.can_create_communication_channel(uuid) to authenticated;
grant execute on function public.dispatch_communication(uuid, text, text, text, text, text, uuid[], uuid[], timestamptz) to authenticated;
