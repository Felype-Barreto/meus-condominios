alter table public.plan_limits
  add column if not exists whatsapp_included_messages int not null default 0,
  add column if not exists whatsapp_automatic_enabled boolean not null default false,
  add column if not exists whatsapp_group_enabled boolean not null default false,
  add column if not exists whatsapp_advanced_logs boolean not null default false;

update public.plan_limits
set
  whatsapp_included_messages = case plan
    when 'free' then 0
    when 'premium' then 100
    when 'pro' then 500
    when 'total' then 2000
    else whatsapp_included_messages
  end,
  whatsapp_automatic_enabled = plan in ('premium', 'pro', 'total'),
  whatsapp_group_enabled = plan = 'total',
  whatsapp_advanced_logs = plan in ('pro', 'total');

create table if not exists public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  provider text not null default 'meta_cloud_api',
  business_phone_number_id text,
  waba_id text,
  display_phone text,
  status text not null default 'not_configured',
  access_token_encrypted text,
  webhook_verify_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  whatsapp_account_id uuid references public.whatsapp_accounts(id) on delete cascade,
  group_id text,
  group_name text,
  block_id uuid references public.blocks(id) on delete set null,
  status text not null default 'pending',
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete cascade,
  template_key text not null,
  template_name text not null,
  category text not null,
  language text not null default 'pt_BR',
  body_preview text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, template_key)
);

create table if not exists public.whatsapp_opt_ins (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone text not null,
  opted_in boolean not null default false,
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, user_id)
);

create table if not exists public.whatsapp_message_logs (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  apartment_id uuid references public.apartments(id) on delete set null,
  whatsapp_account_id uuid references public.whatsapp_accounts(id) on delete set null,
  target_type text not null,
  target_phone text,
  target_group_id text,
  template_key text,
  message_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_usage (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  month text not null,
  included_messages int not null default 0,
  used_messages int not null default 0,
  extra_messages int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, month)
);

create table if not exists public.whatsapp_addons (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  addon_type text not null,
  quantity int not null default 0,
  price_cents int not null,
  status text not null default 'active',
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_accounts_condominium_id_idx on public.whatsapp_accounts (condominium_id);
create index if not exists whatsapp_accounts_status_idx on public.whatsapp_accounts (status);
create index if not exists whatsapp_accounts_created_at_idx on public.whatsapp_accounts (created_at);
create index if not exists whatsapp_groups_condominium_id_idx on public.whatsapp_groups (condominium_id);
create index if not exists whatsapp_groups_account_id_idx on public.whatsapp_groups (whatsapp_account_id);
create index if not exists whatsapp_groups_block_id_idx on public.whatsapp_groups (block_id);
create index if not exists whatsapp_groups_status_idx on public.whatsapp_groups (status);
create index if not exists whatsapp_templates_condominium_id_idx on public.whatsapp_templates (condominium_id);
create index if not exists whatsapp_templates_key_idx on public.whatsapp_templates (template_key);
create index if not exists whatsapp_templates_status_idx on public.whatsapp_templates (status);
create index if not exists whatsapp_opt_ins_condominium_id_idx on public.whatsapp_opt_ins (condominium_id);
create index if not exists whatsapp_opt_ins_user_id_idx on public.whatsapp_opt_ins (user_id);
create index if not exists whatsapp_opt_ins_opted_in_idx on public.whatsapp_opt_ins (opted_in);
create index if not exists whatsapp_message_logs_condominium_id_idx on public.whatsapp_message_logs (condominium_id);
create index if not exists whatsapp_message_logs_user_id_idx on public.whatsapp_message_logs (user_id);
create index if not exists whatsapp_message_logs_apartment_id_idx on public.whatsapp_message_logs (apartment_id);
create index if not exists whatsapp_message_logs_status_idx on public.whatsapp_message_logs (status);
create index if not exists whatsapp_message_logs_created_at_idx on public.whatsapp_message_logs (created_at);
create index if not exists whatsapp_usage_condominium_id_idx on public.whatsapp_usage (condominium_id);
create index if not exists whatsapp_usage_month_idx on public.whatsapp_usage (month);
create index if not exists whatsapp_addons_condominium_id_idx on public.whatsapp_addons (condominium_id);
create index if not exists whatsapp_addons_status_idx on public.whatsapp_addons (status);

alter table public.whatsapp_accounts enable row level security;
alter table public.whatsapp_groups enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.whatsapp_opt_ins enable row level security;
alter table public.whatsapp_message_logs enable row level security;
alter table public.whatsapp_usage enable row level security;
alter table public.whatsapp_addons enable row level security;

drop trigger if exists whatsapp_accounts_set_updated_at on public.whatsapp_accounts;
create trigger whatsapp_accounts_set_updated_at before update on public.whatsapp_accounts
for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_groups_set_updated_at on public.whatsapp_groups;
create trigger whatsapp_groups_set_updated_at before update on public.whatsapp_groups
for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_templates_set_updated_at on public.whatsapp_templates;
create trigger whatsapp_templates_set_updated_at before update on public.whatsapp_templates
for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_opt_ins_set_updated_at on public.whatsapp_opt_ins;
create trigger whatsapp_opt_ins_set_updated_at before update on public.whatsapp_opt_ins
for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_usage_set_updated_at on public.whatsapp_usage;
create trigger whatsapp_usage_set_updated_at before update on public.whatsapp_usage
for each row execute function public.set_updated_at();

create or replace function public.current_whatsapp_month()
returns text
language sql
stable
as $$
  select to_char(now(), 'YYYY-MM');
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
    'included_messages', pl.whatsapp_included_messages,
    'automatic_enabled', pl.whatsapp_automatic_enabled,
    'group_enabled', pl.whatsapp_group_enabled,
    'advanced_logs', pl.whatsapp_advanced_logs,
    'manual_only', c.plan = 'free',
    'allowed_message_types', case
      when c.plan = 'free' then jsonb_build_array()
      when c.plan = 'premium' then jsonb_build_array('package_received', 'booking_approved', 'booking_rejected', 'urgent_announcement', 'visitor_contact_request')
      when c.plan = 'pro' then jsonb_build_array('package_received', 'booking_approved', 'booking_rejected', 'urgent_announcement', 'visitor_contact_request', 'booking_reminder', 'important_announcement', 'weekly_summary')
      else jsonb_build_array('package_received', 'booking_approved', 'booking_rejected', 'urgent_announcement', 'visitor_contact_request', 'booking_reminder', 'important_announcement', 'weekly_summary', 'daily_summary', 'group_announcement')
    end
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.ensure_whatsapp_usage(condo_id uuid)
returns public.whatsapp_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  current_month text := public.current_whatsapp_month();
  limits jsonb := public.get_whatsapp_plan_limits(condo_id);
  included int := coalesce((limits->>'included_messages')::int, 0);
  usage_row public.whatsapp_usage;
begin
  insert into public.whatsapp_usage (condominium_id, month, included_messages)
  values (condo_id, current_month, included)
  on conflict (condominium_id, month)
  do update set included_messages = excluded.included_messages, updated_at = now()
  returning * into usage_row;

  return usage_row;
end;
$$;

create or replace function public.validate_whatsapp_opt_in(target_user_id uuid, condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.whatsapp_opt_ins o
    where o.condominium_id = condo_id
      and o.user_id = target_user_id
      and o.opted_in = true
  );
$$;

create or replace function public.can_send_whatsapp_message(condo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  limits jsonb := public.get_whatsapp_plan_limits(condo_id);
  usage_row public.whatsapp_usage;
  total_limit int;
  percent numeric;
  allowed boolean;
begin
  usage_row := public.ensure_whatsapp_usage(condo_id);
  total_limit := usage_row.included_messages + usage_row.extra_messages;
  allowed := coalesce((limits->>'automatic_enabled')::boolean, false) = true
    and usage_row.used_messages < total_limit;
  percent := case when total_limit <= 0 then 100 else round((usage_row.used_messages::numeric / total_limit::numeric) * 100, 2) end;

  if total_limit > 0 and usage_row.used_messages >= total_limit then
    perform public.log_plan_limit_hit(condo_id, 'whatsapp_messages', usage_row.used_messages, total_limit);
  end if;

  return jsonb_build_object(
    'allowed', allowed,
    'plan', limits->>'plan',
    'used', usage_row.used_messages,
    'included', usage_row.included_messages,
    'extra', usage_row.extra_messages,
    'limit', total_limit,
    'remaining', greatest(total_limit - usage_row.used_messages, 0),
    'percent', percent,
    'warn', percent >= 80,
    'blocked', usage_row.used_messages >= total_limit,
    'manual_only', coalesce((limits->>'manual_only')::boolean, false)
  );
end;
$$;

create or replace function public.consume_whatsapp_credit(condo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  check_result jsonb;
  usage_row public.whatsapp_usage;
begin
  check_result := public.can_send_whatsapp_message(condo_id);

  if coalesce((check_result->>'allowed')::boolean, false) = false then
    raise exception 'Limite de WhatsApp atingido ou envio automático indisponível neste plano.';
  end if;

  update public.whatsapp_usage
  set used_messages = used_messages + 1,
      updated_at = now()
  where condominium_id = condo_id
    and month = public.current_whatsapp_month()
  returning * into usage_row;

  return public.can_send_whatsapp_message(condo_id);
end;
$$;

create or replace function public.queue_whatsapp_message(input jsonb)
returns public.whatsapp_message_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  condo_id uuid := (input->>'condominium_id')::uuid;
  target_user_id uuid := nullif(input->>'user_id', '')::uuid;
  apt_id uuid := nullif(input->>'apartment_id', '')::uuid;
  account_id uuid := nullif(input->>'whatsapp_account_id', '')::uuid;
  target_type text := coalesce(input->>'target_type', 'user');
  message_type text := coalesce(input->>'message_type', 'manual');
  automatic boolean := coalesce((input->>'automatic')::boolean, true);
  created public.whatsapp_message_logs;
begin
  if auth.uid() is not null and not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'announcements.create')
    or public.has_permission(condo_id, 'packages.create')
    or public.has_permission(condo_id, 'bookings.approve')
    or public.has_permission(condo_id, 'gate.register_visitor')
    or public.has_permission(condo_id, 'settings.edit')
  ) then
    raise exception 'Você não tem permissão para criar notificações WhatsApp.';
  end if;

  if automatic = true then
    perform public.consume_whatsapp_credit(condo_id);

    if target_type = 'user' and target_user_id is not null and public.validate_whatsapp_opt_in(target_user_id, condo_id) = false then
      raise exception 'Morador sem opt-in para WhatsApp.';
    end if;
  end if;

  insert into public.whatsapp_message_logs (
    condominium_id,
    user_id,
    apartment_id,
    whatsapp_account_id,
    target_type,
    target_phone,
    target_group_id,
    template_key,
    message_type,
    payload,
    status
  )
  values (
    condo_id,
    target_user_id,
    apt_id,
    account_id,
    target_type,
    nullif(input->>'target_phone', ''),
    nullif(input->>'target_group_id', ''),
    nullif(input->>'template_key', ''),
    message_type,
    coalesce(input->'payload', '{}'::jsonb),
    case when automatic then 'queued' else 'manual_created' end
  )
  returning * into created;

  insert into public.audit_logs (condominium_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    condo_id,
    auth.uid(),
    case when automatic then 'queue_whatsapp_message' else 'create_manual_whatsapp_message' end,
    'whatsapp_message_logs',
    created.id,
    jsonb_build_object('message_type', message_type, 'target_type', target_type)
  );

  return created;
end;
$$;

create or replace function public.send_whatsapp_template(input jsonb)
returns public.whatsapp_message_logs
language plpgsql
security definer
set search_path = public
as $$
begin
  input := input || jsonb_build_object('target_type', coalesce(input->>'target_type', 'user'), 'automatic', true);
  return public.queue_whatsapp_message(input);
end;
$$;

create or replace function public.send_whatsapp_group_message(input jsonb)
returns public.whatsapp_message_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  condo_id uuid := (input->>'condominium_id')::uuid;
  limits jsonb := public.get_whatsapp_plan_limits(condo_id);
  group_record record;
begin
  if coalesce((limits->>'group_enabled')::boolean, false) = false then
    raise exception 'Envio automático em grupo não está disponível neste plano.';
  end if;

  select * into group_record
  from public.whatsapp_groups
  where condominium_id = condo_id
    and group_id = input->>'target_group_id'
    and enabled = true
    and status = 'active'
  limit 1;

  if group_record.id is null then
    raise exception 'Grupo não configurado ou não elegível.';
  end if;

  input := input || jsonb_build_object('target_type', 'group', 'automatic', true);
  return public.queue_whatsapp_message(input);
end;
$$;

create or replace function public.create_manual_whatsapp_share_text(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_phone text := coalesce(input->>'phone', '');
  digits text := regexp_replace(raw_phone, '[^0-9]', '', 'g');
  message text := left(coalesce(input->>'message', ''), 1000);
  condo_id uuid := nullif(input->>'condominium_id', '')::uuid;
begin
  if condo_id is not null and auth.uid() is not null then
    insert into public.audit_logs (condominium_id, actor_user_id, action, entity_type, metadata)
    values (condo_id, auth.uid(), 'create_manual_whatsapp_share_text', 'whatsapp', jsonb_build_object('has_phone', digits <> ''));
  end if;

  return jsonb_build_object(
    'text', message,
    'wa_me_url', case when digits <> '' then 'https://wa.me/55' || digits || '?text=' || replace(message, ' ', '%20') else null end,
    'share_url', 'https://wa.me/?text=' || replace(message, ' ', '%20')
  );
end;
$$;

create or replace function public.handle_whatsapp_webhook(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_id text := payload #>> '{entry,0,changes,0,value,statuses,0,id}';
  provider_status text := payload #>> '{entry,0,changes,0,value,statuses,0,status}';
  updated_count int := 0;
begin
  if provider_id is not null then
    update public.whatsapp_message_logs
    set status = provider_status,
        delivered_at = case when provider_status = 'delivered' then now() else delivered_at end,
        read_at = case when provider_status = 'read' then now() else read_at end,
        failed_at = case when provider_status = 'failed' then now() else failed_at end
    where provider_message_id = provider_id;
    get diagnostics updated_count = row_count;
  end if;

  return jsonb_build_object('received', true, 'updated', updated_count);
end;
$$;

insert into public.whatsapp_templates (condominium_id, template_key, template_name, category, body_preview, status)
values
  (null, 'package_received', 'Encomenda recebida', 'essential', 'Olá, {{nome}}. Uma encomenda chegou para o seu apartamento no Moraí.', 'approved'),
  (null, 'booking_approved', 'Agendamento aprovado', 'essential', 'Sua reserva foi aprovada. Confira os detalhes no Moraí.', 'approved'),
  (null, 'booking_rejected', 'Agendamento recusado', 'essential', 'Sua reserva não pôde ser aprovada. Confira os detalhes no Moraí.', 'approved'),
  (null, 'urgent_announcement', 'Comunicado urgente', 'essential', 'Comunicado urgente do condomínio: {{titulo}}', 'approved'),
  (null, 'visitor_contact_request', 'Visitante solicitou contato', 'essential', 'Um visitante solicitou contato pelo QR público do condomínio.', 'approved'),
  (null, 'booking_reminder', 'Lembrete de agendamento', 'automation', 'Lembrete: você possui uma reserva agendada em breve.', 'draft'),
  (null, 'weekly_summary', 'Resumo semanal', 'summary', 'Resumo semanal do condomínio disponível no Moraí.', 'draft')
on conflict (condominium_id, template_key) do nothing;

create policy "whatsapp accounts read authorized"
on public.whatsapp_accounts for select
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'settings.edit') or public.has_permission(condominium_id, 'announcements.create'));

create policy "whatsapp accounts manage subscriber"
on public.whatsapp_accounts for all
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'settings.edit'))
with check (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'settings.edit'));

create policy "whatsapp groups read authorized"
on public.whatsapp_groups for select
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'settings.edit') or public.has_permission(condominium_id, 'announcements.create'));

create policy "whatsapp groups manage authorized"
on public.whatsapp_groups for all
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'settings.edit'))
with check (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'settings.edit'));

create policy "whatsapp templates read members"
on public.whatsapp_templates for select
to authenticated
using (condominium_id is null or public.get_user_role(condominium_id) is not null);

create policy "whatsapp templates manage authorized"
on public.whatsapp_templates for all
to authenticated
using (condominium_id is not null and (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'settings.edit')))
with check (condominium_id is not null and (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'settings.edit')));

create policy "whatsapp opt ins read scoped"
on public.whatsapp_opt_ins for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'residents.view')
);

create policy "whatsapp opt ins manage own"
on public.whatsapp_opt_ins for all
to authenticated
using (
  user_id = auth.uid()
  or public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'residents.edit')
)
with check (
  user_id = auth.uid()
  or public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'residents.edit')
);

create policy "whatsapp logs read authorized"
on public.whatsapp_message_logs for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'audit_logs.view')
  or public.has_permission(condominium_id, 'announcements.view_reads')
);

create policy "whatsapp logs create authorized"
on public.whatsapp_message_logs for insert
to authenticated
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'announcements.create')
  or public.has_permission(condominium_id, 'packages.create')
  or public.has_permission(condominium_id, 'bookings.approve')
  or public.has_permission(condominium_id, 'gate.register_visitor')
);

create policy "whatsapp usage read authorized"
on public.whatsapp_usage for select
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'settings.view') or public.has_permission(condominium_id, 'audit_logs.view'));

create policy "whatsapp addons read authorized"
on public.whatsapp_addons for select
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'billing.view'));

create policy "whatsapp addons manage billing"
on public.whatsapp_addons for all
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'billing.manage'))
with check (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'billing.manage'));

grant execute on function public.get_whatsapp_plan_limits(uuid) to authenticated;
grant execute on function public.can_send_whatsapp_message(uuid) to authenticated;
grant execute on function public.consume_whatsapp_credit(uuid) to authenticated;
grant execute on function public.queue_whatsapp_message(jsonb) to authenticated;
grant execute on function public.send_whatsapp_template(jsonb) to authenticated;
grant execute on function public.send_whatsapp_group_message(jsonb) to authenticated;
grant execute on function public.create_manual_whatsapp_share_text(jsonb) to authenticated, anon;
grant execute on function public.validate_whatsapp_opt_in(uuid, uuid) to authenticated;
grant execute on function public.handle_whatsapp_webhook(jsonb) to authenticated;
