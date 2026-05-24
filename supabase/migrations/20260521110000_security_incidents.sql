create table if not exists public.security_incidents (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete cascade,
  reported_by uuid references public.profiles(id),
  incident_type text not null check (
    incident_type in (
      'suspected_data_leak',
      'unauthorized_access',
      'abusive_use',
      'whatsapp_spam',
      'qr_abuse',
      'payment_issue',
      'account_takeover',
      'other'
    )
  ),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'triaging', 'investigating', 'contained', 'resolved', 'dismissed')),
  affected_data jsonb not null default '{}',
  actions_taken jsonb not null default '[]',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists security_incidents_condominium_id_idx on public.security_incidents(condominium_id);
create index if not exists security_incidents_reported_by_idx on public.security_incidents(reported_by);
create index if not exists security_incidents_incident_type_idx on public.security_incidents(incident_type);
create index if not exists security_incidents_severity_idx on public.security_incidents(severity);
create index if not exists security_incidents_status_idx on public.security_incidents(status);
create index if not exists security_incidents_created_at_idx on public.security_incidents(created_at desc);

drop trigger if exists security_incidents_set_updated_at on public.security_incidents;
create trigger security_incidents_set_updated_at
before update on public.security_incidents
for each row execute function public.set_updated_at();

alter table public.security_incidents enable row level security;

drop policy if exists "security incidents create public" on public.security_incidents;
create policy "security incidents create public"
on public.security_incidents for insert
to anon, authenticated
with check (
  reported_by is null
  or reported_by = auth.uid()
);

drop policy if exists "security incidents read scoped" on public.security_incidents;
create policy "security incidents read scoped"
on public.security_incidents for select
to authenticated
using (
  reported_by = auth.uid()
  or (
    condominium_id is not null
    and (
      public.is_subscriber_admin(condominium_id)
      or public.has_permission(condominium_id, 'security.view_incidents')
      or public.has_permission(condominium_id, 'security.view_reports')
      or public.has_permission(condominium_id, 'audit_logs.view')
    )
  )
);

drop policy if exists "security incidents update scoped" on public.security_incidents;
create policy "security incidents update scoped"
on public.security_incidents for update
to authenticated
using (
  condominium_id is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'security.manage_incidents')
    or public.has_permission(condominium_id, 'security.view_reports')
  )
)
with check (
  condominium_id is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'security.manage_incidents')
    or public.has_permission(condominium_id, 'security.view_reports')
  )
);

create or replace function public.audit_security_incident_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.condominium_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.audit_logs (
      condominium_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    values (
      new.condominium_id,
      new.reported_by,
      'security_incident_reported',
      'security_incidents',
      new.id,
      jsonb_build_object(
        'incident_type', new.incident_type,
        'severity', new.severity,
        'status', new.status
      )
    );
  elsif tg_op = 'UPDATE' and (
    old.status is distinct from new.status
    or old.severity is distinct from new.severity
    or old.actions_taken is distinct from new.actions_taken
  ) then
    insert into public.audit_logs (
      condominium_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    values (
      new.condominium_id,
      auth.uid(),
      'security_incident_updated',
      'security_incidents',
      new.id,
      jsonb_build_object(
        'old_status', old.status,
        'new_status', new.status,
        'old_severity', old.severity,
        'new_severity', new.severity
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists security_incidents_audit_changes on public.security_incidents;
create trigger security_incidents_audit_changes
after insert or update on public.security_incidents
for each row execute function public.audit_security_incident_change();
