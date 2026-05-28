create or replace function public.invite_deadline(invite_created_at timestamptz, invite_expires_at timestamptz)
returns timestamptz
language sql
immutable
set search_path = public
as $$
  select least(
    coalesce(invite_expires_at, 'infinity'::timestamptz),
    invite_created_at + interval '10 minutes'
  );
$$;

create or replace function public.expire_stale_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.invites
  set status = 'expired'
  where status = 'active'
    and used_at is null
    and public.invite_deadline(created_at, expires_at) <= now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

update public.invites
set status = 'expired'
where status = 'active'
  and used_at is null
  and public.invite_deadline(created_at, expires_at) <= now();

update public.memberships
set
  permissions = '{}'::jsonb,
  is_primary_syndic = false,
  updated_at = now()
where role = 'syndic'
  and status <> 'active';

update public.syndic_profiles sp
set status = 'inactive', updated_at = now()
where exists (
  select 1
  from public.memberships m
  where m.id = sp.membership_id
    and m.role = 'syndic'
    and m.status <> 'active'
);

create or replace function public.get_invite_public(invite_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', i.id,
    'condominium_id', i.condominium_id,
    'condominium_name', c.name,
    'condominium_code', c.slug,
    'invite_type', i.invite_type,
    'role', i.role,
    'email', i.email,
    'status', i.status,
    'expires_at', public.invite_deadline(i.created_at, i.expires_at),
    'valid',
      i.status = 'active'
      and i.used_at is null
      and public.invite_deadline(i.created_at, i.expires_at) > now()
  )
  from public.invites i
  join public.condominiums c on c.id = i.condominium_id
  where i.token = invite_token
  limit 1;
$$;

create or replace function public.accept_syndic_invite(
  invite_token text,
  profile_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  invite_row public.invites;
  limits public.plan_limits;
  active_syndics int;
  membership_id uuid;
  auto_approve boolean;
begin
  if current_user_id is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  perform public.expire_stale_invites();

  select * into invite_row
  from public.invites
  where token = invite_token
    and invite_type = 'syndic'
    and role = 'syndic'
    and status = 'active'
    and used_at is null
    and public.invite_deadline(created_at, expires_at) > now()
  for update;

  if invite_row.id is null then
    raise exception 'Convite invalido, expirado ou ja utilizado.';
  end if;

  select pl.* into limits
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = invite_row.condominium_id;

  select count(*) into active_syndics
  from public.memberships
  where condominium_id = invite_row.condominium_id
    and status = 'active'
    and (role = 'syndic' or is_primary_syndic = true);

  if active_syndics >= limits.max_syndics then
    raise exception 'Limite de sindicos do plano atingido.';
  end if;

  select coalesce((settings->>'syndic_auto_approve')::boolean, true)
  into auto_approve
  from public.condominiums
  where id = invite_row.condominium_id;

  update public.profiles
  set
    full_name = coalesce(nullif(profile_payload->>'full_name', ''), full_name),
    phone = coalesce(nullif(profile_payload->>'phone', ''), phone),
    email = coalesce(nullif(profile_payload->>'email', ''), email)
  where id = current_user_id;

  insert into public.memberships (
    condominium_id,
    user_id,
    role,
    status,
    permissions,
    is_primary_syndic,
    approved_by,
    approved_at
  )
  values (
    invite_row.condominium_id,
    current_user_id,
    'syndic',
    case when auto_approve then 'active' else 'pending' end,
    public.default_syndic_permissions(),
    active_syndics = 0,
    case when auto_approve then invite_row.invited_by else null end,
    case when auto_approve then now() else null end
  )
  on conflict (condominium_id, user_id, role)
  do update set
    status = excluded.status,
    permissions = excluded.permissions,
    is_primary_syndic = excluded.is_primary_syndic,
    approved_by = excluded.approved_by,
    approved_at = excluded.approved_at,
    updated_at = now()
  returning id into membership_id;

  insert into public.syndic_profiles (
    condominium_id,
    membership_id,
    full_name,
    phone,
    email,
    professional_note,
    start_date,
    status
  )
  values (
    invite_row.condominium_id,
    membership_id,
    coalesce(nullif(profile_payload->>'full_name', ''), 'Sindico'),
    nullif(profile_payload->>'phone', ''),
    nullif(profile_payload->>'email', ''),
    nullif(profile_payload->>'professional_note', ''),
    nullif(profile_payload->>'start_date', '')::date,
    case when auto_approve then 'active' else 'pending' end
  )
  on conflict (membership_id)
  do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    professional_note = excluded.professional_note,
    start_date = excluded.start_date,
    status = excluded.status,
    updated_at = now();

  update public.invites
  set
    used_at = now(),
    used_by = current_user_id,
    status = 'used'
  where id = invite_row.id;

  insert into public.audit_logs (
    condominium_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    invite_row.condominium_id,
    current_user_id,
    'accept_syndic_invite',
    'invites',
    invite_row.id,
    jsonb_build_object('membership_id', membership_id, 'auto_approve', auto_approve)
  );

  return jsonb_build_object(
    'condominium_id', invite_row.condominium_id,
    'membership_id', membership_id,
    'status', case when auto_approve then 'active' else 'pending' end
  );
end;
$$;

revoke all on function public.invite_deadline(timestamptz, timestamptz) from public;
grant execute on function public.invite_deadline(timestamptz, timestamptz) to anon, authenticated, service_role, postgres;
revoke all on function public.expire_stale_invites() from public;
grant execute on function public.expire_stale_invites() to anon, authenticated, service_role;
revoke all on function public.get_invite_public(text) from public;
grant execute on function public.get_invite_public(text) to anon, authenticated, service_role;
