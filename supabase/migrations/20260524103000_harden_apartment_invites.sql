create or replace function public.invite_resident(
  condo_id uuid,
  invite_role text default 'resident',
  invite_email text default null,
  invite_phone text default null,
  apt_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  invite_token text;
  responsible_count int;
  active_invite_count int;
begin
  if actor is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  if invite_role not in ('resident', 'owner') then
    raise exception 'Tipo de convite invalido.';
  end if;

  if apt_id is null then
    raise exception 'Selecione o apartamento deste convite.';
  end if;

  if not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'residents.invite')
    or public.has_permission(condo_id, 'settings.roles')
  ) then
    raise exception 'Voce nao tem permissao para convidar moradores.';
  end if;

  if not exists (
    select 1 from public.apartments a
    where a.id = apt_id and a.condominium_id = condo_id
  ) then
    raise exception 'Apartamento invalido para este condominio.';
  end if;

  select count(distinct m.user_id) into responsible_count
  from public.memberships m
  where m.condominium_id = condo_id
    and m.apartment_id = apt_id
    and m.role in ('resident', 'owner')
    and m.status in ('active', 'pending');

  select count(*) into active_invite_count
  from public.invites i
  where i.condominium_id = condo_id
    and i.apartment_id = apt_id
    and i.invite_type in ('resident', 'owner')
    and i.status = 'active'
    and i.used_at is null
    and (i.expires_at is null or i.expires_at > now());

  if responsible_count + active_invite_count >= 2 then
    raise exception 'Este apartamento ja tem o limite de responsaveis ou convites pendentes.';
  end if;

  invite_token := encode(gen_random_bytes(24), 'hex');

  insert into public.invites (
    condominium_id,
    invited_by,
    token,
    invite_type,
    role,
    apartment_id,
    email,
    phone,
    expires_at,
    status
  )
  values (
    condo_id,
    actor,
    invite_token,
    invite_role,
    invite_role,
    apt_id,
    nullif(lower(trim(invite_email)), ''),
    nullif(invite_phone, ''),
    now() + interval '14 days',
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
    'invite_resident',
    'invites',
    jsonb_build_object('role', invite_role, 'email', lower(trim(invite_email)), 'apartment_id', apt_id)
  );

  return jsonb_build_object('token', invite_token, 'condominium_id', condo_id, 'apartment_id', apt_id);
end;
$$;

create or replace function public.accept_resident_invite(
  invite_token text,
  profile_payload jsonb,
  apt_id uuid,
  membership_kind text,
  privacy_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_email text := lower(nullif(auth.jwt()->>'email', ''));
  invite_row public.invites;
  created_ids uuid[] := array[]::uuid[];
  inserted_id uuid;
  role_to_insert text;
  other_responsible_count int;
begin
  if actor is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  if membership_kind not in ('resident', 'owner', 'resident_owner') then
    raise exception 'Tipo de cadastro invalido.';
  end if;

  select * into invite_row
  from public.invites
  where token = invite_token
    and invite_type in ('resident', 'owner')
    and status = 'active'
    and used_at is null
    and (expires_at is null or expires_at > now())
  for update;

  if invite_row.id is null then
    raise exception 'Convite invalido, expirado ou ja utilizado.';
  end if;

  if invite_row.email is not null and (actor_email is null or lower(invite_row.email) <> actor_email) then
    raise exception 'Este convite foi emitido para outro e-mail.';
  end if;

  if invite_row.apartment_id is null or invite_row.apartment_id <> apt_id then
    raise exception 'Este convite esta vinculado a outro apartamento.';
  end if;

  if not exists (
    select 1 from public.apartments a
    where a.id = apt_id
      and a.condominium_id = invite_row.condominium_id
  ) then
    raise exception 'Apartamento invalido.';
  end if;

  select count(distinct m.user_id) into other_responsible_count
  from public.memberships m
  where m.condominium_id = invite_row.condominium_id
    and m.apartment_id = apt_id
    and m.role in ('resident', 'owner')
    and m.status in ('active', 'pending')
    and m.user_id <> actor;

  if other_responsible_count >= 2 then
    raise exception 'Este apartamento ja tem dois responsaveis cadastrados.';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(profile_payload->>'full_name', ''), full_name),
    email = coalesce(actor_email, nullif(profile_payload->>'email', ''), email),
    phone = coalesce(nullif(profile_payload->>'phone', ''), phone),
    updated_at = now()
  where id = actor;

  foreach role_to_insert in array case
    when membership_kind = 'resident_owner' then array['resident', 'owner']
    else array[membership_kind]
  end loop
    insert into public.memberships (
      condominium_id,
      apartment_id,
      user_id,
      role,
      status,
      permissions,
      privacy_settings
    )
    values (
      invite_row.condominium_id,
      apt_id,
      actor,
      role_to_insert,
      'pending',
      '{}'::jsonb,
      privacy_payload
    )
    on conflict (condominium_id, user_id, role)
    do update set
      apartment_id = excluded.apartment_id,
      status = 'pending',
      privacy_settings = excluded.privacy_settings,
      updated_at = now()
    returning id into inserted_id;

    created_ids := array_append(created_ids, inserted_id);
  end loop;

  update public.invites
  set used_at = now(), used_by = actor, status = 'used'
  where id = invite_row.id;

  perform public.audit_event(
    invite_row.condominium_id,
    'accept_resident_invite',
    'invites',
    invite_row.id,
    jsonb_build_object('apartment_id', apt_id, 'membership_kind', membership_kind)
  );

  return jsonb_build_object(
    'condominium_id', invite_row.condominium_id,
    'status', 'pending',
    'membership_ids', created_ids
  );
end;
$$;
