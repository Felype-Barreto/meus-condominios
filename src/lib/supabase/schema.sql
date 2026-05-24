-- Initial Meus Condomínios schema draft for Supabase Postgres + RLS.
-- Run after enabling Supabase Auth. Keep service keys out of the browser.

create type public.app_role as enum (
  'subscriber_admin',
  'admin',
  'syndic',
  'doorman',
  'resident',
  'owner'
);

create table public.condos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  subscriber_id uuid not null references auth.users(id) on delete cascade,
  syndic_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  condo_id uuid not null references public.condos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  can_manage boolean not null default false,
  created_at timestamptz not null default now(),
  unique (condo_id, user_id, role)
);

create table public.apartments (
  id uuid primary key default gen_random_uuid(),
  condo_id uuid not null references public.condos(id) on delete cascade,
  block text,
  number text not null,
  owner_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (condo_id, block, number)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  condo_id uuid not null references public.condos(id) on delete cascade,
  token text unique not null,
  email text,
  role public.app_role not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.condos enable row level security;
alter table public.memberships enable row level security;
alter table public.apartments enable row level security;
alter table public.invites enable row level security;

create policy "members can read their condos"
on public.condos for select
using (
  subscriber_id = auth.uid()
  or exists (
    select 1 from public.memberships m
    where m.condo_id = condos.id and m.user_id = auth.uid()
  )
);

create policy "subscriber admins can manage condo"
on public.condos for all
using (subscriber_id = auth.uid())
with check (subscriber_id = auth.uid());

create policy "members can read memberships"
on public.memberships for select
using (
  exists (
    select 1 from public.memberships own
    where own.condo_id = memberships.condo_id and own.user_id = auth.uid()
  )
);

create policy "admins can manage memberships"
on public.memberships for all
using (
  exists (
    select 1 from public.memberships own
    where own.condo_id = memberships.condo_id
      and own.user_id = auth.uid()
      and own.role in ('subscriber_admin', 'admin', 'syndic')
  )
)
with check (
  exists (
    select 1 from public.memberships own
    where own.condo_id = memberships.condo_id
      and own.user_id = auth.uid()
      and own.role in ('subscriber_admin', 'admin', 'syndic')
  )
);
