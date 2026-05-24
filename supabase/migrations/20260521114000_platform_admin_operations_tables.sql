create table if not exists public.platform_admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  role text not null check (
    role in (
      'platform_owner',
      'platform_admin',
      'platform_support',
      'platform_finance',
      'platform_security',
      'platform_readonly'
    )
  ),
  status text not null default 'active' check (status in ('active', 'disabled')),
  require_2fa boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  condominium_id uuid references public.condominiums(id) on delete set null,
  severity text not null default 'normal' check (severity in ('low', 'normal', 'high', 'critical')),
  reason text,
  metadata jsonb not null default '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.sensitive_access_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  target_type text not null,
  target_id uuid,
  condominium_id uuid references public.condominiums(id) on delete set null,
  field_accessed text not null,
  reason text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_analytics_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  total_condominiums int not null default 0,
  active_condominiums int not null default 0,
  new_condominiums int not null default 0,
  canceled_condominiums int not null default 0,
  total_users int not null default 0,
  active_users int not null default 0,
  mrr_cents int not null default 0,
  arr_cents int not null default 0,
  revenue_cents int not null default 0,
  whatsapp_credits_used int not null default 0,
  whatsapp_credits_purchased int not null default 0,
  support_open_count int not null default 0,
  abuse_open_count int not null default 0,
  security_incidents_open_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id),
  note text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'security', 'finance', 'support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_admin_users (user_id, role, status, require_2fa, created_at, updated_at)
select ps.user_id, ps.role, ps.status, ps.require_2fa, ps.created_at, ps.updated_at
from public.platform_staff ps
where ps.user_id is not null
on conflict (user_id) do update
set role = excluded.role,
    status = excluded.status,
    require_2fa = excluded.require_2fa,
    updated_at = now();

alter table public.refund_requests alter column condominium_id drop not null;
update public.refund_requests
set reason = 'Solicitação registrada antes da política detalhada de reembolso.'
where reason is null;
alter table public.refund_requests alter column reason set not null;
alter table public.refund_requests add column if not exists subscription_id uuid;
alter table public.refund_requests add column if not exists invoice_id uuid;
alter table public.refund_requests add column if not exists currency text default 'BRL';
alter table public.refund_requests add column if not exists provider_payment_id text;
alter table public.refund_requests add column if not exists decision_note text;
alter table public.refund_requests add column if not exists decided_by uuid references public.profiles(id);
alter table public.refund_requests add column if not exists decided_at timestamptz;
alter table public.refund_requests alter column currency set default 'BRL';
alter table public.refund_requests alter column status set default 'pending';
alter table public.refund_requests drop constraint if exists refund_requests_status_check;
alter table public.refund_requests
  add constraint refund_requests_status_check
  check (status in ('pending', 'reviewing', 'approved', 'rejected', 'processed', 'refunded', 'canceled'));

alter table public.billing_events alter column condominium_id drop not null;
alter table public.billing_events add column if not exists provider text;
alter table public.billing_events add column if not exists amount_cents int;
alter table public.billing_events add column if not exists currency text default 'BRL';
alter table public.billing_events add column if not exists status text;
alter table public.billing_events alter column currency set default 'BRL';

create index if not exists platform_admin_users_user_id_idx on public.platform_admin_users(user_id);
create index if not exists platform_admin_users_role_idx on public.platform_admin_users(role);
create index if not exists platform_admin_users_status_idx on public.platform_admin_users(status);
create index if not exists platform_admin_users_created_at_idx on public.platform_admin_users(created_at desc);

create index if not exists platform_admin_audit_logs_actor_user_id_idx on public.platform_admin_audit_logs(actor_user_id);
create index if not exists platform_admin_audit_logs_condominium_id_idx on public.platform_admin_audit_logs(condominium_id);
create index if not exists platform_admin_audit_logs_created_at_idx on public.platform_admin_audit_logs(created_at desc);
create index if not exists platform_admin_audit_logs_status_idx on public.platform_admin_audit_logs(severity);
create index if not exists platform_admin_audit_logs_entity_idx on public.platform_admin_audit_logs(entity_type, entity_id);

create index if not exists sensitive_access_logs_actor_user_id_idx on public.sensitive_access_logs(actor_user_id);
create index if not exists sensitive_access_logs_condominium_id_idx on public.sensitive_access_logs(condominium_id);
create index if not exists sensitive_access_logs_created_at_idx on public.sensitive_access_logs(created_at desc);
create index if not exists sensitive_access_logs_entity_idx on public.sensitive_access_logs(target_type, target_id);

create index if not exists platform_settings_key_idx on public.platform_settings(key);
create index if not exists platform_settings_updated_at_idx on public.platform_settings(updated_at desc);

create index if not exists platform_analytics_daily_date_idx on public.platform_analytics_daily(date desc);

create index if not exists admin_notes_condominium_id_idx on public.admin_notes(condominium_id);
create index if not exists admin_notes_user_id_idx on public.admin_notes(user_id);
create index if not exists admin_notes_created_by_idx on public.admin_notes(created_by);
create index if not exists admin_notes_created_at_idx on public.admin_notes(created_at desc);

create index if not exists refund_requests_subscription_id_idx on public.refund_requests(subscription_id);
create index if not exists refund_requests_invoice_id_idx on public.refund_requests(invoice_id);
create index if not exists refund_requests_decided_by_idx on public.refund_requests(decided_by);

create index if not exists billing_events_status_idx on public.billing_events(status);
create index if not exists billing_events_provider_idx on public.billing_events(provider);

drop trigger if exists platform_admin_users_set_updated_at on public.platform_admin_users;
create trigger platform_admin_users_set_updated_at
before update on public.platform_admin_users
for each row execute function public.set_updated_at();

drop trigger if exists admin_notes_set_updated_at on public.admin_notes;
create trigger admin_notes_set_updated_at
before update on public.admin_notes
for each row execute function public.set_updated_at();

drop trigger if exists platform_settings_set_updated_at on public.platform_settings;
create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row execute function public.set_updated_at();

create or replace function public.get_platform_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select pau.role
      from public.platform_admin_users pau
      where pau.user_id = auth.uid()
        and pau.status = 'active'
      limit 1
    ),
    (
      select ps.role
      from public.platform_staff ps
      where ps.user_id = auth.uid()
        and ps.status = 'active'
      limit 1
    )
  )
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_platform_role() is not null
$$;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
$$;

create or replace function public.has_platform_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.get_platform_role()
    when 'platform_owner' then true
    when 'platform_admin' then permission_key in (
      'condominiums.read', 'condominiums.manage',
      'users.read', 'support.read', 'support.manage',
      'settings.read', 'settings.manage',
      'logs.read', 'analytics.read'
    )
    when 'platform_support' then permission_key in (
      'support.read', 'support.manage',
      'abuse.read', 'abuse.manage',
      'users.read_masked', 'condominiums.read_masked'
    )
    when 'platform_finance' then permission_key in (
      'finance.read', 'finance.manage',
      'subscriptions.read', 'subscriptions.manage',
      'refunds.read', 'refunds.manage',
      'billing_events.read', 'analytics.read'
    )
    when 'platform_security' then permission_key in (
      'security.read', 'security.manage',
      'incidents.read', 'incidents.manage',
      'logs.read', 'sensitive_access.read',
      'abuse.read', 'abuse.manage'
    )
    when 'platform_readonly' then permission_key in (
      'analytics.read', 'logs.read_limited'
    )
    else false
  end
$$;

create or replace function public.can_platform_access(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_platform_role() = any(required_roles), false)
    or coalesce(public.get_platform_role() = 'platform_owner', false)
$$;

create or replace function public.log_platform_admin_action(
  action text,
  entity_type text,
  entity_id uuid default null,
  condominium_id uuid default null,
  severity text default 'normal',
  reason text default null,
  metadata jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.platform_admin_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    condominium_id,
    severity,
    reason,
    metadata
  )
  values (
    auth.uid(),
    action,
    entity_type,
    entity_id,
    condominium_id,
    severity,
    reason,
    coalesce(metadata, '{}')
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.audit_platform_admin_critical_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.platform_admin_audit_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      severity,
      metadata
    )
    values (
      auth.uid(),
      lower(tg_table_name) || '_updated',
      tg_table_name,
      new.id,
      'high',
      jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
    );
    return new;
  elsif tg_op = 'INSERT' then
    insert into public.platform_admin_audit_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      severity,
      metadata
    )
    values (
      auth.uid(),
      lower(tg_table_name) || '_created',
      tg_table_name,
      new.id,
      'normal',
      jsonb_build_object('new', to_jsonb(new))
    );
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists audit_platform_admin_users_changes on public.platform_admin_users;
create trigger audit_platform_admin_users_changes
after insert or update on public.platform_admin_users
for each row execute function public.audit_platform_admin_critical_changes();

drop trigger if exists audit_platform_settings_changes on public.platform_settings;
create trigger audit_platform_settings_changes
after insert or update on public.platform_settings
for each row execute function public.audit_platform_admin_critical_changes();

drop trigger if exists audit_refund_requests_platform_changes on public.refund_requests;
create trigger audit_refund_requests_platform_changes
after update on public.refund_requests
for each row
when (
  old.status is distinct from new.status
  or old.decision_note is distinct from new.decision_note
  or old.decided_by is distinct from new.decided_by
)
execute function public.audit_platform_admin_critical_changes();

alter table public.platform_admin_users enable row level security;
alter table public.platform_admin_audit_logs enable row level security;
alter table public.sensitive_access_logs enable row level security;
alter table public.platform_settings enable row level security;
alter table public.platform_analytics_daily enable row level security;
alter table public.admin_notes enable row level security;

drop policy if exists "platform admin users read scoped" on public.platform_admin_users;
create policy "platform admin users read scoped"
on public.platform_admin_users for select
to authenticated
using (
  user_id = auth.uid()
  or public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security')
);

drop policy if exists "platform owner manages admin users" on public.platform_admin_users;
create policy "platform owner manages admin users"
on public.platform_admin_users for all
to authenticated
using (public.get_platform_role() = 'platform_owner')
with check (public.get_platform_role() = 'platform_owner');

drop policy if exists "platform audit logs read by role" on public.platform_admin_audit_logs;
create policy "platform audit logs read by role"
on public.platform_admin_audit_logs for select
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security')
  or (
    public.get_platform_role() = 'platform_readonly'
    and severity in ('low', 'normal')
  )
  or (
    public.get_platform_role() = 'platform_support'
    and entity_type in ('support_tickets', 'abuse_reports')
  )
  or (
    public.get_platform_role() = 'platform_finance'
    and entity_type in ('refund_requests', 'billing_events', 'subscriptions', 'invoices', 'payment_events')
  )
);

drop policy if exists "platform audit logs insert by admins" on public.platform_admin_audit_logs;
create policy "platform audit logs insert by admins"
on public.platform_admin_audit_logs for insert
to authenticated
with check (public.is_platform_admin());

drop policy if exists "sensitive access read security owner" on public.sensitive_access_logs;
create policy "sensitive access read security owner"
on public.sensitive_access_logs for select
to authenticated
using (public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security'));

drop policy if exists "sensitive access insert admins" on public.sensitive_access_logs;
create policy "sensitive access insert admins"
on public.sensitive_access_logs for insert
to authenticated
with check (
  public.get_platform_role() in (
    'platform_owner',
    'platform_admin',
    'platform_support',
    'platform_finance',
    'platform_security'
  )
  and actor_user_id = auth.uid()
);

drop policy if exists "platform settings read admins" on public.platform_settings;
create policy "platform settings read admins"
on public.platform_settings for select
to authenticated
using (public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security'));

drop policy if exists "platform settings manage owner admin" on public.platform_settings;
create policy "platform settings manage owner admin"
on public.platform_settings for all
to authenticated
using (public.get_platform_role() in ('platform_owner', 'platform_admin'))
with check (public.get_platform_role() in ('platform_owner', 'platform_admin'));

drop policy if exists "platform analytics read platform roles" on public.platform_analytics_daily;
create policy "platform analytics read platform roles"
on public.platform_analytics_daily for select
to authenticated
using (
  public.get_platform_role() in (
    'platform_owner',
    'platform_admin',
    'platform_finance',
    'platform_readonly'
  )
);

drop policy if exists "platform analytics manage owner admin" on public.platform_analytics_daily;
create policy "platform analytics manage owner admin"
on public.platform_analytics_daily for all
to authenticated
using (public.get_platform_role() in ('platform_owner', 'platform_admin'))
with check (public.get_platform_role() in ('platform_owner', 'platform_admin'));

drop policy if exists "admin notes read scoped by platform role" on public.admin_notes;
create policy "admin notes read scoped by platform role"
on public.admin_notes for select
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin')
  or (public.get_platform_role() = 'platform_security' and visibility in ('internal', 'security'))
  or (public.get_platform_role() = 'platform_finance' and visibility = 'finance')
  or (public.get_platform_role() = 'platform_support' and visibility = 'support')
);

drop policy if exists "admin notes create platform staff" on public.admin_notes;
create policy "admin notes create platform staff"
on public.admin_notes for insert
to authenticated
with check (
  public.get_platform_role() in (
    'platform_owner',
    'platform_admin',
    'platform_support',
    'platform_finance',
    'platform_security'
  )
  and created_by = auth.uid()
);

drop policy if exists "admin notes update owner admin creator" on public.admin_notes;
create policy "admin notes update owner admin creator"
on public.admin_notes for update
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin')
  or created_by = auth.uid()
)
with check (
  public.get_platform_role() in ('platform_owner', 'platform_admin')
  or created_by = auth.uid()
);

drop policy if exists "refund requests platform read by role" on public.refund_requests;
create policy "refund requests platform read by role"
on public.refund_requests for select
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_finance')
  or requested_by = auth.uid()
  or (
    condominium_id is not null
    and (
      public.is_subscriber_admin(condominium_id)
      or public.has_permission(condominium_id, 'billing.view')
      or public.has_permission(condominium_id, 'billing.manage')
    )
  )
);

drop policy if exists "refund requests platform update finance" on public.refund_requests;
create policy "refund requests platform update finance"
on public.refund_requests for update
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_finance')
  or (
    condominium_id is not null
    and (
      public.is_subscriber_admin(condominium_id)
      or public.has_permission(condominium_id, 'billing.manage')
    )
  )
)
with check (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_finance')
  or (
    condominium_id is not null
    and (
      public.is_subscriber_admin(condominium_id)
      or public.has_permission(condominium_id, 'billing.manage')
    )
  )
);

drop policy if exists "billing events platform read by role" on public.billing_events;
create policy "billing events platform read by role"
on public.billing_events for select
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_finance')
  or (
    condominium_id is not null
    and (
      public.is_subscriber_admin(condominium_id)
      or public.has_permission(condominium_id, 'billing.view')
      or public.has_permission(condominium_id, 'billing.manage')
    )
  )
);
