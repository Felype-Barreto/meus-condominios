create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  apartment_id uuid references public.apartments(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_condominium_id_idx on public.notifications (condominium_id);
create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_type_idx on public.notifications (type);
create index if not exists notifications_read_at_idx on public.notifications (read_at);
create index if not exists notifications_created_at_idx on public.notifications (created_at);

alter table public.notifications enable row level security;

create policy "notifications read scoped"
on public.notifications for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'audit_logs.view')
  or public.has_permission(condominium_id, 'announcements.view_reads')
);

create policy "notifications create authorized"
on public.notifications for insert
to authenticated
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'announcements.create')
  or public.has_permission(condominium_id, 'packages.create')
  or public.has_permission(condominium_id, 'bookings.approve')
  or public.has_permission(condominium_id, 'tickets.reply')
  or public.has_permission(condominium_id, 'gate.register_visitor')
);

create policy "notifications update own"
on public.notifications for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'audit_logs.view')
)
with check (
  user_id = auth.uid()
  or public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'audit_logs.view')
);
