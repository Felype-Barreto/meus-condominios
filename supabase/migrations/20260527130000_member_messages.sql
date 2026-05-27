create table if not exists public.member_messages (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  target_membership_id uuid not null references public.memberships(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 days')
);

create index if not exists member_messages_condo_target_created_idx
  on public.member_messages (condominium_id, target_membership_id, created_at desc);

create index if not exists member_messages_expires_at_idx
  on public.member_messages (expires_at);

alter table public.member_messages enable row level security;

drop policy if exists "member_messages_select_scoped" on public.member_messages;
create policy "member_messages_select_scoped"
on public.member_messages
for select
to authenticated
using (
  expires_at > now()
  and exists (
    select 1
    from public.memberships viewer
    where viewer.condominium_id = member_messages.condominium_id
      and viewer.user_id = auth.uid()
      and viewer.status = 'active'
      and (
        member_messages.sender_id = auth.uid()
        or exists (
          select 1
          from public.memberships target
          where target.id = member_messages.target_membership_id
            and target.user_id = auth.uid()
        )
        or public.is_subscriber_admin(member_messages.condominium_id)
        or public.has_permission(member_messages.condominium_id, 'residents.view')
      )
  )
);

drop policy if exists "member_messages_insert_scoped" on public.member_messages;
create policy "member_messages_insert_scoped"
on public.member_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and body = trim(body)
  and expires_at <= now() + interval '3 days 5 minutes'
  and exists (
    select 1
    from public.memberships viewer
    join public.memberships target
      on target.id = member_messages.target_membership_id
     and target.condominium_id = member_messages.condominium_id
    where viewer.condominium_id = member_messages.condominium_id
      and viewer.user_id = auth.uid()
      and viewer.status = 'active'
      and target.status = 'active'
      and (
        target.user_id = auth.uid()
        or public.is_subscriber_admin(member_messages.condominium_id)
        or public.has_permission(member_messages.condominium_id, 'residents.view')
      )
  )
);

create or replace function public.purge_expired_member_messages()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from public.member_messages
  where expires_at <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_member_messages() from public;
grant execute on function public.purge_expired_member_messages() to authenticated;
