create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete cascade,
  user_id uuid references public.profiles(id),
  category text not null check (
    category in (
      'duvida',
      'cobranca',
      'cancelamento',
      'reembolso',
      'problema_tecnico',
      'privacidade_lgpd',
      'seguranca',
      'whatsapp',
      'outro'
    )
  ),
  subject text not null,
  message text not null,
  status text not null default 'open' check (
    status in ('open', 'waiting', 'in_progress', 'answered', 'closed')
  ),
  priority text not null default 'normal' check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_condominium_id_idx on public.support_tickets(condominium_id);
create index if not exists support_tickets_user_id_idx on public.support_tickets(user_id);
create index if not exists support_tickets_category_idx on public.support_tickets(category);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_priority_idx on public.support_tickets(priority);
create index if not exists support_tickets_created_at_idx on public.support_tickets(created_at desc);

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "support tickets create public" on public.support_tickets;
create policy "support tickets create public"
on public.support_tickets for insert
to anon, authenticated
with check (
  user_id is null
  or user_id = auth.uid()
);

drop policy if exists "support tickets read scoped" on public.support_tickets;
create policy "support tickets read scoped"
on public.support_tickets for select
to authenticated
using (
  user_id = auth.uid()
  or (
    condominium_id is not null
    and (
      public.is_subscriber_admin(condominium_id)
      or public.is_condo_admin(condominium_id)
      or public.has_permission(condominium_id, 'settings.view')
      or public.has_permission(condominium_id, 'audit_logs.view')
    )
  )
);

drop policy if exists "support tickets update authorized" on public.support_tickets;
create policy "support tickets update authorized"
on public.support_tickets for update
to authenticated
using (
  condominium_id is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.is_condo_admin(condominium_id)
    or public.has_permission(condominium_id, 'settings.view')
  )
)
with check (
  condominium_id is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.is_condo_admin(condominium_id)
    or public.has_permission(condominium_id, 'settings.view')
  )
);

create or replace function public.audit_support_ticket_change()
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
      new.user_id,
      'support_ticket_created',
      'support_tickets',
      new.id,
      jsonb_build_object(
        'category', new.category,
        'priority', new.priority,
        'status', new.status
      )
    );
  elsif tg_op = 'UPDATE' and (
    old.status is distinct from new.status
    or old.priority is distinct from new.priority
    or old.metadata is distinct from new.metadata
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
      'support_ticket_updated',
      'support_tickets',
      new.id,
      jsonb_build_object(
        'old_status', old.status,
        'new_status', new.status,
        'old_priority', old.priority,
        'new_priority', new.priority
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists support_tickets_audit_changes on public.support_tickets;
create trigger support_tickets_audit_changes
after insert or update on public.support_tickets
for each row execute function public.audit_support_ticket_change();
