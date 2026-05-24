alter table public.data_requests
  add column if not exists assigned_to uuid references public.profiles(id),
  add column if not exists priority text not null default 'normal',
  add column if not exists actions_taken jsonb not null default '[]',
  add column if not exists internal_due_at timestamptz;

update public.data_requests
set status = 'processed'
where status = 'completed';

update public.data_requests
set status = 'reviewing'
where status = 'processing';

alter table public.data_requests drop constraint if exists data_requests_request_type_check;
alter table public.data_requests
  add constraint data_requests_request_type_check
  check (request_type in ('export', 'correction', 'deletion', 'portability', 'consent_revocation', 'privacy_question'));

alter table public.data_requests drop constraint if exists data_requests_status_check;
alter table public.data_requests
  add constraint data_requests_status_check
  check (status in ('pending', 'reviewing', 'waiting_customer', 'processed', 'rejected', 'canceled'));

alter table public.data_requests drop constraint if exists data_requests_priority_check;
alter table public.data_requests
  add constraint data_requests_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

create index if not exists data_requests_assigned_to_idx on public.data_requests(assigned_to);
create index if not exists data_requests_priority_idx on public.data_requests(priority);
create index if not exists data_requests_internal_due_at_idx on public.data_requests(internal_due_at);
create index if not exists data_requests_updated_at_idx on public.data_requests(updated_at desc);

drop policy if exists "data requests read platform roles" on public.data_requests;
create policy "data requests read platform roles"
on public.data_requests for select
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security', 'platform_support')
);

drop policy if exists "data requests update platform roles" on public.data_requests;
create policy "data requests update platform roles"
on public.data_requests for update
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security')
  or (
    public.get_platform_role() = 'platform_support'
    and request_type in ('export', 'correction', 'portability', 'privacy_question', 'consent_revocation')
    and status not in ('processed', 'rejected')
  )
)
with check (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security')
  or (
    public.get_platform_role() = 'platform_support'
    and request_type in ('export', 'correction', 'portability', 'privacy_question', 'consent_revocation')
    and status not in ('processed', 'rejected')
  )
);
