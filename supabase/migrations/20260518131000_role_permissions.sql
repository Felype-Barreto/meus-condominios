create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  role text not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, role),
  constraint role_permissions_role_check check (role in ('admin', 'syndic', 'doorman', 'resident', 'owner'))
);

create index if not exists role_permissions_condominium_id_idx on public.role_permissions (condominium_id);
create index if not exists role_permissions_role_idx on public.role_permissions (role);
create index if not exists role_permissions_created_at_idx on public.role_permissions (created_at);

alter table public.role_permissions enable row level security;

create trigger role_permissions_set_updated_at before update on public.role_permissions
for each row execute function public.set_updated_at();

create policy "role permissions read members"
on public.role_permissions for select
to authenticated
using (public.get_user_role(condominium_id) is not null);

create policy "role permissions manage authorized"
on public.role_permissions for all
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'settings.roles')
  or (
    role = 'syndic'
    and public.get_user_role(condominium_id) = 'syndic'
    and public.has_permission(condominium_id, 'syndic.manage_permissions')
  )
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'settings.roles')
  or (
    role = 'syndic'
    and public.get_user_role(condominium_id) = 'syndic'
    and public.has_permission(condominium_id, 'syndic.manage_permissions')
  )
);

create or replace function public.has_permission(condo_id uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_subscriber_admin(condo_id)
    or exists (
      select 1
      from public.memberships m
      left join public.role_permissions rp
        on rp.condominium_id = m.condominium_id
       and rp.role = m.role
      where m.condominium_id = condo_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and (
          (
            m.permissions ? permission_key
            and coalesce((m.permissions->>permission_key)::boolean, false)
          )
          or (
            rp.permissions ? permission_key
            and coalesce((rp.permissions->>permission_key)::boolean, false)
          )
        )
    ),
    false
  );
$$;

create or replace function public.set_role_permissions(
  condo_id uuid,
  target_role text,
  permission_payload jsonb
)
returns public.role_permissions
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text := public.get_user_role(condo_id);
  saved public.role_permissions;
begin
  if auth.uid() is null then
    raise exception 'Usuário autenticado é obrigatório.';
  end if;

  if target_role not in ('admin', 'syndic', 'doorman', 'resident', 'owner') then
    raise exception 'Papel inválido.';
  end if;

  if not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'settings.roles')
    or (
      target_role = 'syndic'
      and actor_role = 'syndic'
      and public.has_permission(condo_id, 'syndic.manage_permissions')
    )
  ) then
    raise exception 'Você não tem permissão para alterar permissões.';
  end if;

  if exists (
    select 1
    from public.condominiums c
    join public.plan_limits pl on pl.plan = c.plan
    where c.id = condo_id
      and coalesce(pl.advanced_permissions, false) = false
  ) then
    raise exception 'O plano atual não permite permissões avançadas.';
  end if;

  if target_role = 'doorman' then
    permission_payload := permission_payload
      || jsonb_build_object(
        'billing.manage', false,
        'billing.change_plan', false,
        'billing.cancel', false,
        'settings.roles', false,
        'privacy.export_data', false
      );
  end if;

  if target_role in ('resident', 'owner') then
    permission_payload := permission_payload
      || jsonb_build_object(
        'apartments.view_grid', false,
        'apartments.view_contacts', false,
        'residents.view', false,
        'residents.view_phone', false,
        'residents.view_email', false,
        'tickets.view_all', false,
        'packages.view_all', false,
        'billing.manage', false,
        'billing.change_plan', false,
        'billing.cancel', false,
        'settings.roles', false,
        'privacy.export_data', false,
        'privacy.view_sensitive', false
      );
  end if;

  insert into public.role_permissions (condominium_id, role, permissions)
  values (condo_id, target_role, permission_payload)
  on conflict (condominium_id, role)
  do update set permissions = excluded.permissions, updated_at = now()
  returning * into saved;

  insert into public.audit_logs (
    condominium_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    condo_id,
    auth.uid(),
    'update_role_permissions',
    'role_permissions',
    saved.id,
    jsonb_build_object('role', target_role, 'permissions', permission_payload)
  );

  return saved;
end;
$$;
