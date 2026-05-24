create table if not exists public.data_requests (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete cascade,
  user_id uuid references public.profiles(id),
  request_type text not null check (
    request_type in ('export', 'correction', 'deletion', 'portability', 'consent_revocation')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'reviewing', 'processing', 'completed', 'rejected', 'canceled')
  ),
  description text,
  requested_by_email text,
  processed_by uuid references public.profiles(id),
  processed_at timestamptz,
  response_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_requests_condominium_id_idx on public.data_requests(condominium_id);
create index if not exists data_requests_user_id_idx on public.data_requests(user_id);
create index if not exists data_requests_request_type_idx on public.data_requests(request_type);
create index if not exists data_requests_status_idx on public.data_requests(status);
create index if not exists data_requests_created_at_idx on public.data_requests(created_at desc);

drop trigger if exists data_requests_set_updated_at on public.data_requests;
create trigger data_requests_set_updated_at
before update on public.data_requests
for each row execute function public.set_updated_at();

alter table public.data_requests enable row level security;

drop policy if exists "data requests create own" on public.data_requests;
create policy "data requests create own"
on public.data_requests for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    condominium_id is null
    or exists (
      select 1
      from public.memberships m
      where m.condominium_id = data_requests.condominium_id
        and m.user_id = auth.uid()
        and m.status in ('active', 'pending')
    )
    or public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'privacy.export_data')
  )
);

drop policy if exists "data requests read scoped" on public.data_requests;
create policy "data requests read scoped"
on public.data_requests for select
to authenticated
using (
  user_id = auth.uid()
  or (
    condominium_id is not null
    and (
      public.is_subscriber_admin(condominium_id)
      or public.has_permission(condominium_id, 'privacy.export_data')
      or public.has_permission(condominium_id, 'privacy.delete_data_request')
    )
  )
);

drop policy if exists "data requests update authorized" on public.data_requests;
create policy "data requests update authorized"
on public.data_requests for update
to authenticated
using (
  condominium_id is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'privacy.delete_data_request')
  )
)
with check (
  condominium_id is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'privacy.delete_data_request')
  )
);

create or replace function public.audit_data_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.condominium_id is not null then
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
        new.user_id,
        'data_request_created',
        'data_requests',
        new.id,
        jsonb_build_object('request_type', new.request_type, 'status', new.status)
      );
    end if;
  elsif tg_op = 'UPDATE' and (
    old.status is distinct from new.status
    or old.processed_by is distinct from new.processed_by
    or old.response_note is distinct from new.response_note
  ) then
    if new.condominium_id is not null then
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
        'data_request_updated',
        'data_requests',
        new.id,
        jsonb_build_object(
          'request_type', new.request_type,
          'old_status', old.status,
          'new_status', new.status
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists data_requests_audit_changes on public.data_requests;
create trigger data_requests_audit_changes
after insert or update on public.data_requests
for each row execute function public.audit_data_request_change();
