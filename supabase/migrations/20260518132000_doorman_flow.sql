create or replace function public.default_doorman_permissions()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'gate.view_panel', true,
    'gate.search_apartment_limited', true,
    'gate.register_package', true,
    'gate.register_visitor', true,
    'gate.create_incident', true,
    'gate.call_resident', true,
    'gate.view_resident_phone_masked', true,
    'gate.view_resident_phone_full', false,
    'packages.create', true,
    'packages.view_all', true,
    'packages.mark_picked_up', true,
    'packages.upload_photo', true,
    'incidents.create', true,
    'billing.manage', false,
    'billing.change_plan', false,
    'billing.cancel', false,
    'settings.roles', false,
    'privacy.export_data', false
  );
$$;

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
  limits public.plan_limits;
  active_doormen int;
  invite_token text;
begin
  if actor is null then
    raise exception 'Usuário autenticado é obrigatório.';
  end if;

  if not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'settings.roles')
    or public.has_permission(condo_id, 'gate.view_panel')
  ) then
    raise exception 'Você não tem permissão para convidar guarita.';
  end if;

  select pl.* into limits
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;

  select count(*) into active_doormen
  from public.memberships
  where condominium_id = condo_id
    and role = 'doorman'
    and status in ('active', 'pending');

  if active_doormen >= limits.max_doormen then
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
    nullif(invite_email, ''),
    nullif(invite_phone, ''),
    now() + interval '7 days',
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
    jsonb_build_object('email', invite_email)
  );

  return jsonb_build_object('token', invite_token, 'condominium_id', condo_id);
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
  limits public.plan_limits;
  active_doormen int;
  membership_id uuid;
begin
  if actor is null then
    raise exception 'Usuário autenticado é obrigatório.';
  end if;

  select * into invite_row
  from public.invites
  where token = invite_token
    and invite_type = 'doorman'
    and role = 'doorman'
    and status = 'active'
    and used_at is null
    and (expires_at is null or expires_at > now())
  for update;

  if invite_row.id is null then
    raise exception 'Convite inválido, expirado ou já utilizado.';
  end if;

  select pl.* into limits
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = invite_row.condominium_id;

  select count(*) into active_doormen
  from public.memberships
  where condominium_id = invite_row.condominium_id
    and role = 'doorman'
    and status in ('active', 'pending');

  if active_doormen >= limits.max_doormen then
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

create or replace function public.search_gate_apartments(
  condo_id uuid,
  search_term text
)
returns table (
  apartment_id uuid,
  block_name text,
  apartment_number text,
  resident_name text,
  phone_display text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    b.name,
    a.number,
    coalesce(split_part(p.full_name, ' ', 1), 'Morador autorizado') as resident_name,
    case
      when public.has_permission(condo_id, 'gate.view_resident_phone_full') then p.phone
      when public.has_permission(condo_id, 'gate.view_resident_phone_masked') and p.phone is not null
        then regexp_replace(p.phone, '(\d{2}).*(\d{4})$', '\1*****\2')
      else null
    end as phone_display
  from public.apartments a
  left join public.blocks b on b.id = a.block_id
  left join public.memberships m
    on m.apartment_id = a.id
   and m.status = 'active'
   and m.role in ('resident', 'owner')
  left join public.profiles p on p.id = m.user_id
  where a.condominium_id = condo_id
    and public.has_permission(condo_id, 'gate.search_apartment_limited')
    and (
      a.number ilike '%' || search_term || '%'
      or b.name ilike '%' || search_term || '%'
    )
  order by b.sort_order, a.number
  limit 10;
$$;

create or replace function public.create_gate_package(
  condo_id uuid,
  apt_id uuid,
  recipient text,
  package_description text default null,
  package_photo_url text default null
)
returns public.packages
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.packages;
begin
  if not (
    public.has_permission(condo_id, 'gate.register_package')
    or public.has_permission(condo_id, 'packages.create')
  ) then
    raise exception 'Você não tem permissão para registrar encomenda.';
  end if;

  insert into public.packages (
    condominium_id,
    apartment_id,
    registered_by,
    recipient_name,
    description,
    photo_url,
    status
  )
  values (
    condo_id,
    apt_id,
    auth.uid(),
    nullif(recipient, ''),
    nullif(package_description, ''),
    nullif(package_photo_url, ''),
    'waiting'
  )
  returning * into created;

  insert into public.audit_logs (condominium_id, actor_user_id, action, entity_type, entity_id)
  values (condo_id, auth.uid(), 'gate_register_package', 'packages', created.id);

  return created;
end;
$$;

create or replace function public.mark_gate_package_picked_up(
  condo_id uuid,
  package_id uuid,
  picked_up_name text
)
returns public.packages
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.packages;
begin
  if not public.has_permission(condo_id, 'packages.mark_picked_up') then
    raise exception 'Você não tem permissão para marcar retirada.';
  end if;

  update public.packages
  set status = 'picked_up',
      picked_up_by = nullif(picked_up_name, ''),
      picked_up_at = now(),
      updated_at = now()
  where id = package_id
    and condominium_id = condo_id
  returning * into updated;

  if updated.id is null then
    raise exception 'Encomenda não encontrada.';
  end if;

  insert into public.audit_logs (condominium_id, actor_user_id, action, entity_type, entity_id)
  values (condo_id, auth.uid(), 'gate_package_picked_up', 'packages', updated.id);

  return updated;
end;
$$;

create or replace function public.create_gate_visitor(
  condo_id uuid,
  apt_id uuid,
  visitor_name_input text,
  visitor_phone_input text default null,
  visitor_message text default null
)
returns public.visitor_contact_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.visitor_contact_requests;
begin
  if not public.has_permission(condo_id, 'gate.register_visitor') then
    raise exception 'Você não tem permissão para registrar visitante.';
  end if;

  insert into public.visitor_contact_requests (
    condominium_id,
    apartment_id,
    searched_term,
    visitor_name,
    visitor_phone,
    message,
    status
  )
  values (
    condo_id,
    apt_id,
    '',
    nullif(visitor_name_input, ''),
    nullif(visitor_phone_input, ''),
    nullif(visitor_message, ''),
    'created'
  )
  returning * into created;

  insert into public.audit_logs (condominium_id, actor_user_id, action, entity_type, entity_id)
  values (condo_id, auth.uid(), 'gate_register_visitor', 'visitor_contact_requests', created.id);

  return created;
end;
$$;

create or replace function public.create_gate_incident(
  condo_id uuid,
  apt_id uuid,
  incident_title text,
  incident_description text
)
returns public.incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.incidents;
begin
  if not (
    public.has_permission(condo_id, 'gate.create_incident')
    or public.has_permission(condo_id, 'incidents.create')
  ) then
    raise exception 'Você não tem permissão para criar ocorrência.';
  end if;

  insert into public.incidents (
    condominium_id,
    apartment_id,
    created_by,
    type,
    title,
    description,
    severity,
    status
  )
  values (
    condo_id,
    apt_id,
    auth.uid(),
    'gate',
    incident_title,
    incident_description,
    'normal',
    'open'
  )
  returning * into created;

  insert into public.audit_logs (condominium_id, actor_user_id, action, entity_type, entity_id)
  values (condo_id, auth.uid(), 'gate_create_incident', 'incidents', created.id);

  return created;
end;
$$;

create or replace function public.get_gate_recent_visitors(condo_id uuid)
returns table (
  id uuid,
  apartment_number text,
  visitor_name text,
  visitor_phone text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id,
    a.number,
    v.visitor_name,
    v.visitor_phone,
    v.status,
    v.created_at
  from public.visitor_contact_requests v
  left join public.apartments a on a.id = v.apartment_id
  where v.condominium_id = condo_id
    and public.has_permission(condo_id, 'gate.view_panel')
  order by v.created_at desc
  limit 8;
$$;
