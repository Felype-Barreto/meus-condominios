create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  user_id uuid references public.profiles(id),
  event_type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  requested_by uuid references public.profiles(id),
  amount_cents int,
  reason text,
  status text not null default 'pending',
  provider text,
  provider_refund_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refund_requests_status_check check (status in ('pending', 'reviewing', 'approved', 'rejected', 'refunded', 'canceled'))
);

create index if not exists billing_events_condominium_id_idx on public.billing_events(condominium_id);
create index if not exists billing_events_user_id_idx on public.billing_events(user_id);
create index if not exists billing_events_event_type_idx on public.billing_events(event_type);
create index if not exists billing_events_created_at_idx on public.billing_events(created_at desc);

create index if not exists refund_requests_condominium_id_idx on public.refund_requests(condominium_id);
create index if not exists refund_requests_requested_by_idx on public.refund_requests(requested_by);
create index if not exists refund_requests_status_idx on public.refund_requests(status);
create index if not exists refund_requests_created_at_idx on public.refund_requests(created_at desc);

drop trigger if exists refund_requests_set_updated_at on public.refund_requests;
create trigger refund_requests_set_updated_at before update on public.refund_requests
for each row execute function public.set_updated_at();

alter table public.billing_events enable row level security;
alter table public.refund_requests enable row level security;

drop policy if exists "billing events read billing managers" on public.billing_events;
create policy "billing events read billing managers"
on public.billing_events for select
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'billing.view')
  or public.has_permission(condominium_id, 'billing.manage')
);

drop policy if exists "billing events create billing managers" on public.billing_events;
create policy "billing events create billing managers"
on public.billing_events for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'billing.manage')
    or public.has_permission(condominium_id, 'billing.cancel')
  )
);

drop policy if exists "refund requests read billing managers" on public.refund_requests;
create policy "refund requests read billing managers"
on public.refund_requests for select
to authenticated
using (
  requested_by = auth.uid()
  or public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'billing.view')
  or public.has_permission(condominium_id, 'billing.manage')
);

drop policy if exists "refund requests create billing managers" on public.refund_requests;
create policy "refund requests create billing managers"
on public.refund_requests for insert
to authenticated
with check (
  requested_by = auth.uid()
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'billing.manage')
  )
);

drop policy if exists "refund requests update subscriber admin" on public.refund_requests;
create policy "refund requests update subscriber admin"
on public.refund_requests for update
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'billing.manage'))
with check (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'billing.manage'));
