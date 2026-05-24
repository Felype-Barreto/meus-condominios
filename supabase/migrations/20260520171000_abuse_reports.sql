create table if not exists public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete cascade,
  reported_by uuid references public.profiles(id),
  reported_user_id uuid references public.profiles(id),
  entity_type text,
  entity_id uuid,
  reason text not null,
  description text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint abuse_reports_status_check check (status in ('pending', 'reviewing', 'resolved', 'dismissed'))
);

create index if not exists abuse_reports_condominium_id_idx on public.abuse_reports(condominium_id);
create index if not exists abuse_reports_reported_by_idx on public.abuse_reports(reported_by);
create index if not exists abuse_reports_reported_user_id_idx on public.abuse_reports(reported_user_id);
create index if not exists abuse_reports_status_idx on public.abuse_reports(status);
create index if not exists abuse_reports_created_at_idx on public.abuse_reports(created_at desc);

drop trigger if exists abuse_reports_set_updated_at on public.abuse_reports;
create trigger abuse_reports_set_updated_at before update on public.abuse_reports
for each row execute function public.set_updated_at();

alter table public.abuse_reports enable row level security;

drop policy if exists "abuse reports create public" on public.abuse_reports;
create policy "abuse reports create public"
on public.abuse_reports for insert
to anon, authenticated
with check (reported_by is null or reported_by = auth.uid());

drop policy if exists "abuse reports read authorized" on public.abuse_reports;
create policy "abuse reports read authorized"
on public.abuse_reports for select
to authenticated
using (
  reported_by = auth.uid()
  or (
    condominium_id is not null
    and (
      public.is_subscriber_admin(condominium_id)
      or public.has_permission(condominium_id, 'security.view_reports')
      or public.has_permission(condominium_id, 'settings.security')
    )
  )
);

drop policy if exists "abuse reports update authorized" on public.abuse_reports;
create policy "abuse reports update authorized"
on public.abuse_reports for update
to authenticated
using (
  condominium_id is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'security.view_reports')
    or public.has_permission(condominium_id, 'settings.security')
  )
)
with check (
  condominium_id is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'security.view_reports')
    or public.has_permission(condominium_id, 'settings.security')
  )
);
