-- Moraí initial multi-tenant schema.
-- Every internal operational table carries condominium_id when the data belongs to a condominium.

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.condominiums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  legal_name text,
  document text,
  address text,
  contact_email text,
  contact_phone text,
  owner_user_id uuid references public.profiles(id),
  plan text not null default 'free',
  subscription_status text not null default 'free',
  public_code text unique not null default encode(gen_random_bytes(10), 'hex'),
  invite_code text unique not null default encode(gen_random_bytes(10), 'hex'),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (condominium_id, name)
);

create table public.apartments (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  block_id uuid references public.blocks(id) on delete cascade,
  number text not null,
  floor text,
  status text not null default 'vacant',
  notes_private text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, block_id, number)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  apartment_id uuid references public.apartments(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  status text not null default 'pending',
  permissions jsonb not null default '{}'::jsonb,
  privacy_settings jsonb not null default '{}'::jsonb,
  is_primary_syndic boolean not null default false,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.syndic_profiles (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  document text,
  professional_note text,
  start_date date,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  invited_by uuid references public.profiles(id),
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  invite_type text not null,
  role text not null,
  apartment_id uuid references public.apartments(id) on delete set null,
  email text,
  phone text,
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid references public.profiles(id),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.common_areas (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null,
  description text,
  capacity int,
  requires_approval boolean not null default false,
  rules text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  common_area_id uuid references public.common_areas(id) on delete cascade,
  apartment_id uuid references public.apartments(id) on delete cascade,
  user_id uuid references public.profiles(id),
  title text,
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  apartment_id uuid references public.apartments(id) on delete set null,
  created_by uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  category text not null,
  title text not null,
  description text not null,
  visibility text not null default 'private',
  priority text not null default 'normal',
  status text not null default 'open',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  created_by uuid references public.profiles(id),
  title text not null,
  body text not null,
  target_type text not null default 'all',
  target_ids uuid[],
  urgent boolean not null default false,
  pinned boolean not null default false,
  allow_comments boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  apartment_id uuid references public.apartments(id) on delete cascade,
  registered_by uuid references public.profiles(id),
  recipient_name text,
  description text,
  photo_url text,
  status text not null default 'waiting',
  picked_up_by text,
  picked_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  title text not null,
  description text,
  file_url text not null,
  file_type text,
  visibility text not null default 'residents',
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  apartment_id uuid references public.apartments(id) on delete set null,
  created_by uuid references public.profiles(id),
  type text not null,
  title text not null,
  description text not null,
  severity text not null default 'normal',
  status text not null default 'open',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visitor_contact_requests (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  apartment_id uuid references public.apartments(id) on delete set null,
  searched_term text,
  visitor_name text,
  visitor_phone text,
  message text,
  status text not null default 'created',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.plan_limits (
  plan text primary key,
  max_blocks int,
  max_apartments_per_block int,
  max_total_apartments int,
  max_admins int,
  max_syndics int,
  max_doormen int,
  max_common_areas int,
  max_bookings_per_month int,
  max_tickets_per_month int,
  max_announcements_per_month int,
  max_packages_per_month int,
  max_storage_mb int,
  ads_enabled boolean,
  brand_required boolean,
  advanced_permissions boolean,
  reports_enabled boolean,
  exports_enabled boolean,
  created_at timestamptz not null default now()
);

alter table public.condominiums
  add constraint condominiums_plan_fk foreign key (plan) references public.plan_limits(plan) deferrable initially deferred;

alter table public.memberships
  add constraint memberships_role_check check (role in ('subscriber_admin', 'admin', 'syndic', 'doorman', 'resident', 'owner')),
  add constraint memberships_status_check check (status in ('pending', 'active', 'suspended', 'rejected')),
  add constraint memberships_primary_syndic_role_check check (is_primary_syndic = false or role = 'syndic');

alter table public.condominiums
  add constraint condominiums_subscription_status_check check (subscription_status in ('free', 'trialing', 'active', 'past_due', 'canceled'));

alter table public.apartments
  add constraint apartments_status_check check (status in ('vacant', 'occupied', 'reserved', 'maintenance', 'inactive'));

alter table public.invites
  add constraint invites_status_check check (status in ('active', 'used', 'expired', 'revoked')),
  add constraint invites_role_check check (role in ('subscriber_admin', 'admin', 'syndic', 'doorman', 'resident', 'owner'));

create unique index memberships_one_role_per_user_per_condo_idx
  on public.memberships (condominium_id, user_id, role);

create unique index memberships_one_primary_syndic_per_condo_idx
  on public.memberships (condominium_id)
  where is_primary_syndic = true and status = 'active';

create unique index syndic_profiles_one_per_membership_idx
  on public.syndic_profiles (membership_id);
