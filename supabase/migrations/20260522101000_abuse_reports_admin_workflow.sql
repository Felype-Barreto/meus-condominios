alter table public.abuse_reports
  add column if not exists severity text not null default 'normal',
  add column if not exists assigned_to uuid references public.profiles(id),
  add column if not exists actions_taken jsonb not null default '[]',
  add column if not exists decision_note text;

update public.abuse_reports
set status = 'rejected'
where status = 'dismissed';

alter table public.abuse_reports drop constraint if exists abuse_reports_status_check;
alter table public.abuse_reports
  add constraint abuse_reports_status_check
  check (status in ('pending', 'reviewing', 'action_required', 'resolved', 'rejected', 'escalated'));

alter table public.abuse_reports drop constraint if exists abuse_reports_severity_check;
alter table public.abuse_reports
  add constraint abuse_reports_severity_check
  check (severity in ('low', 'normal', 'high', 'critical'));

create index if not exists abuse_reports_severity_idx on public.abuse_reports(severity);
create index if not exists abuse_reports_assigned_to_idx on public.abuse_reports(assigned_to);
create index if not exists abuse_reports_entity_idx on public.abuse_reports(entity_type, entity_id);
create index if not exists abuse_reports_updated_at_idx on public.abuse_reports(updated_at desc);

drop policy if exists "abuse reports read platform roles" on public.abuse_reports;
create policy "abuse reports read platform roles"
on public.abuse_reports for select
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security', 'platform_support')
  or (
    public.get_platform_role() = 'platform_readonly'
    and severity in ('low', 'normal')
  )
);

drop policy if exists "abuse reports update platform security" on public.abuse_reports;
create policy "abuse reports update platform security"
on public.abuse_reports for update
to authenticated
using (public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security'))
with check (public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_security'));
