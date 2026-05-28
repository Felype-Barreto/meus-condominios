create or replace function public.invite_doorman(
  condo_id uuid,
  invite_email text default null,
  invite_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  can_invite jsonb;
  invite_token text;
  invite_expiration timestamptz := now() + interval '10 minutes';
begin
  if actor is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  perform public.expire_stale_invites();

  if not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'settings.roles')
    or public.has_permission(condo_id, 'gate.view_panel')
  ) then
    raise exception 'Voce nao tem permissao para convidar guarita.';
  end if;

  can_invite := public.can_invite_doorman(condo_id);
  if coalesce((can_invite->>'allowed')::boolean, false) = false then
    raise exception 'Limite de operadores de guarita do plano atingido.';
  end if;

  invite_token := encode(gen_random_bytes(24), 'hex');

  insert into public.invites (
    condominium_id,
    invited_by,
    token,
    invite_type,
    role,
    email,
    phone,
    expires_at,
    status
  )
  values (
    condo_id,
    actor,
    invite_token,
    'doorman',
    'doorman',
    nullif(lower(trim(invite_email)), ''),
    nullif(invite_phone, ''),
    invite_expiration,
    'active'
  );

  insert into public.audit_logs (
    condominium_id,
    actor_user_id,
    action,
    entity_type,
    metadata
  )
  values (
    condo_id,
    actor,
    'invite_doorman',
    'invites',
    jsonb_build_object('email', nullif(lower(trim(invite_email)), ''))
  );

  return jsonb_build_object(
    'token', invite_token,
    'condominium_id', condo_id,
    'expires_at', invite_expiration
  );
end;
$$;

create or replace function public.accept_doorman_invite(
  invite_token text,
  profile_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  invite_row public.invites;
  can_invite jsonb;
  membership_id uuid;
begin
  if actor is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  perform public.expire_stale_invites();

  select * into invite_row
  from public.invites
  where token = invite_token
    and invite_type = 'doorman'
    and role = 'doorman'
    and status = 'active'
    and used_at is null
    and public.invite_deadline(created_at, expires_at) > now()
  for update;

  if invite_row.id is null then
    raise exception 'Convite invalido, expirado ou ja utilizado.';
  end if;

  can_invite := public.can_invite_doorman(invite_row.condominium_id);
  if coalesce((can_invite->>'allowed')::boolean, false) = false then
    raise exception 'Limite de operadores de guarita do plano atingido.';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(profile_payload->>'full_name', ''), full_name),
    phone = coalesce(nullif(profile_payload->>'phone', ''), phone),
    email = coalesce(nullif(profile_payload->>'email', ''), email)
  where id = actor;

  insert into public.memberships (
    condominium_id,
    user_id,
    role,
    status,
    permissions,
    approved_by,
    approved_at
  )
  values (
    invite_row.condominium_id,
    actor,
    'doorman',
    'active',
    public.default_doorman_permissions(),
    invite_row.invited_by,
    now()
  )
  on conflict (condominium_id, user_id, role)
  do update set
    status = 'active',
    permissions = excluded.permissions,
    approved_by = excluded.approved_by,
    approved_at = excluded.approved_at,
    updated_at = now()
  returning id into membership_id;

  update public.invites
  set used_at = now(), used_by = actor, status = 'used'
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
    actor,
    'accept_doorman_invite',
    'invites',
    invite_row.id,
    jsonb_build_object('membership_id', membership_id)
  );

  return jsonb_build_object(
    'condominium_id', invite_row.condominium_id,
    'membership_id', membership_id,
    'status', 'active'
  );
end;
$$;

update public.invites
set status = 'expired'
where status = 'active'
  and invite_type = 'doorman'
  and used_at is null
  and public.invite_deadline(created_at, expires_at) <= now();
