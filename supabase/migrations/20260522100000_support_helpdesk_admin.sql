alter table public.support_tickets
  add column if not exists assigned_to uuid references public.profiles(id);

update public.support_tickets
set status = 'waiting_customer'
where status = 'waiting';

update public.support_tickets
set status = 'resolved'
where status = 'answered';

alter table public.support_tickets drop constraint if exists support_tickets_status_check;
alter table public.support_tickets
  add constraint support_tickets_status_check
  check (status in ('open', 'waiting_customer', 'in_progress', 'resolved', 'closed'));

create index if not exists support_tickets_assigned_to_idx on public.support_tickets(assigned_to);
create index if not exists support_tickets_updated_at_idx on public.support_tickets(updated_at desc);

drop policy if exists "support tickets read platform roles" on public.support_tickets;
create policy "support tickets read platform roles"
on public.support_tickets for select
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_support')
  or (
    public.get_platform_role() = 'platform_finance'
    and category in ('cobranca', 'cancelamento', 'reembolso')
  )
  or (
    public.get_platform_role() = 'platform_security'
    and category in ('seguranca', 'privacidade_lgpd')
  )
  or (
    public.get_platform_role() = 'platform_readonly'
    and category not in ('seguranca', 'privacidade_lgpd')
  )
);

drop policy if exists "support tickets update platform roles" on public.support_tickets;
create policy "support tickets update platform roles"
on public.support_tickets for update
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_support')
  or (
    public.get_platform_role() = 'platform_finance'
    and category in ('cobranca', 'cancelamento', 'reembolso')
  )
  or (
    public.get_platform_role() = 'platform_security'
    and category in ('seguranca', 'privacidade_lgpd')
  )
)
with check (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_support')
  or (
    public.get_platform_role() = 'platform_finance'
    and category in ('cobranca', 'cancelamento', 'reembolso')
  )
  or (
    public.get_platform_role() = 'platform_security'
    and category in ('seguranca', 'privacidade_lgpd')
  )
);
