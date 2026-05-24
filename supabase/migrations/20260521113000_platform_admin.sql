create table if not exists public.platform_staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  email text unique not null,
  role text not null default 'platform_readonly' check (
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  actor_email text,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  metadata jsonb not null default '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists platform_staff_user_id_idx on public.platform_staff(user_id);
create index if not exists platform_staff_email_idx on public.platform_staff(email);
create index if not exists platform_staff_role_idx on public.platform_staff(role);
create index if not exists platform_staff_status_idx on public.platform_staff(status);
create index if not exists platform_staff_created_at_idx on public.platform_staff(created_at desc);

create index if not exists platform_audit_logs_actor_user_id_idx on public.platform_audit_logs(actor_user_id);
create index if not exists platform_audit_logs_actor_email_idx on public.platform_audit_logs(actor_email);
create index if not exists platform_audit_logs_action_idx on public.platform_audit_logs(action);
create index if not exists platform_audit_logs_entity_type_idx on public.platform_audit_logs(entity_type);
create index if not exists platform_audit_logs_created_at_idx on public.platform_audit_logs(created_at desc);

drop trigger if exists platform_staff_set_updated_at on public.platform_staff;
create trigger platform_staff_set_updated_at
before update on public.platform_staff
for each row execute function public.set_updated_at();

alter table public.platform_staff enable row level security;
alter table public.platform_audit_logs enable row level security;

create or replace function public.get_platform_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ps.role
  from public.platform_staff ps
  where ps.user_id = auth.uid()
    and ps.status = 'active'
  limit 1
$$;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_platform_role() is not null
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

drop policy if exists "platform staff read own or owner" on public.platform_staff;
create policy "platform staff read own or owner"
on public.platform_staff for select
to authenticated
using (
  user_id = auth.uid()
  or public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security')
);

drop policy if exists "platform staff manage owner" on public.platform_staff;
create policy "platform staff manage owner"
on public.platform_staff for all
to authenticated
using (public.get_platform_role() = 'platform_owner')
with check (public.get_platform_role() = 'platform_owner');

drop policy if exists "platform audit read staff" on public.platform_audit_logs;
create policy "platform audit read staff"
on public.platform_audit_logs for select
to authenticated
using (
  public.get_platform_role() in (
    'platform_owner',
    'platform_admin',
    'platform_security',
    'platform_readonly'
  )
);

drop policy if exists "platform audit insert staff" on public.platform_audit_logs;
create policy "platform audit insert staff"
on public.platform_audit_logs for insert
to authenticated
with check (public.is_platform_staff());
