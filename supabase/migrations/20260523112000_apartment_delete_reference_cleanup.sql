-- Allow apartment deletion without breaking historical communication reports.

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'communication_recipients'
      and constraint_name = 'communication_recipients_apartment_id_fkey'
  ) then
    alter table public.communication_recipients
      drop constraint communication_recipients_apartment_id_fkey;
    alter table public.communication_recipients
      add constraint communication_recipients_apartment_id_fkey
      foreign key (apartment_id) references public.apartments(id) on delete set null;
  end if;

  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'communication_reach_reports'
      and constraint_name = 'communication_reach_reports_apartment_id_fkey'
  ) then
    alter table public.communication_reach_reports
      drop constraint communication_reach_reports_apartment_id_fkey;
    alter table public.communication_reach_reports
      add constraint communication_reach_reports_apartment_id_fkey
      foreign key (apartment_id) references public.apartments(id) on delete set null;
  end if;
end $$;
