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
begin
  if actor is null then
    raise exception 'Usuário autenticado é obrigatório.';
  end if;

  if invite_role not in ('resident', 'owner') then
    raise exception 'Tipo de convite inválido.';
  end if;

  if not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'residents.invite')
    or public.has_permission(condo_id, 'settings.roles')
  ) then
    raise exception 'Você não tem permissão para convidar moradores.';
  end if;

  if apt_id is not null and not exists (
    select 1 from public.apartments a
    where a.id = apt_id and a.condominium_id = condo_id
  ) then
    raise exception 'Apartamento inválido para este condomínio.';
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
    nullif(invite_email, ''),
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
    jsonb_build_object('role', invite_role, 'email', invite_email, 'apartment_id', apt_id)
  );

  return jsonb_build_object('token', invite_token, 'condominium_id', condo_id);
end;
$$;

create or replace function public.get_invite_apartments(invite_token text)
returns table (
  block_id uuid,
  block_name text,
  apartment_id uuid,
  apartment_number text
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, a.id, a.number
  from public.invites i
  join public.apartments a on a.condominium_id = i.condominium_id
  left join public.blocks b on b.id = a.block_id
  where i.token = invite_token
    and i.status = 'active'
    and i.used_at is null
    and (i.expires_at is null or i.expires_at > now())
    and i.invite_type in ('resident', 'owner')
    and (i.apartment_id is null or i.apartment_id = a.id)
  order by b.sort_order, a.number
  limit 200;
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
  invite_row public.invites;
  created_ids uuid[] := '{}';
  inserted_id uuid;
  role_to_insert text;
begin
  if actor is null then
    raise exception 'Usuário autenticado é obrigatório.';
  end if;

  if membership_kind not in ('resident', 'owner', 'resident_owner') then
    raise exception 'Tipo de cadastro inválido.';
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
    raise exception 'Convite inválido, expirado ou já utilizado.';
  end if;

  if invite_row.apartment_id is not null and invite_row.apartment_id <> apt_id then
    raise exception 'Este convite está vinculado a outro apartamento.';
  end if;

  if not exists (
    select 1 from public.apartments a
    where a.id = apt_id
      and a.condominium_id = invite_row.condominium_id
  ) then
    raise exception 'Apartamento inválido.';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(profile_payload->>'full_name', ''), full_name),
    email = coalesce(nullif(profile_payload->>'email', ''), email),
    phone = coalesce(nullif(profile_payload->>'phone', ''), phone)
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

create or replace function public.review_resident_membership(
  membership_id uuid,
  decision text
)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.memberships;
begin
  if decision not in ('approve', 'reject') then
    raise exception 'Decisão inválida.';
  end if;

  select * into target
  from public.memberships
  where id = membership_id
    and role in ('resident', 'owner')
  for update;

  if target.id is null then
    raise exception 'Cadastro não encontrado.';
  end if;

  if not (
    public.is_subscriber_admin(target.condominium_id)
    or public.has_permission(target.condominium_id, 'residents.approve')
    or public.has_permission(target.condominium_id, 'settings.roles')
  ) then
    raise exception 'Você não tem permissão para revisar moradores.';
  end if;

  update public.memberships
  set
    status = case when decision = 'approve' then 'active' else 'rejected' end,
    approved_by = case when decision = 'approve' then auth.uid() else approved_by end,
    approved_at = case when decision = 'approve' then now() else approved_at end,
    updated_at = now()
  where id = membership_id
  returning * into target;

  insert into public.audit_logs (
    condominium_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target.condominium_id,
    auth.uid(),
    case when decision = 'approve' then 'approve_resident' else 'reject_resident' end,
    'memberships',
    target.id,
    jsonb_build_object('role', target.role, 'apartment_id', target.apartment_id)
  );

  return target;
end;
$$;
