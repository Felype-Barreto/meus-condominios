-- Secure condominium creation and syndic invitation flow.

create extension if not exists unaccent;

alter table public.memberships
  drop constraint if exists memberships_primary_syndic_role_check;

alter table public.memberships
  add constraint memberships_primary_syndic_role_check
  check (is_primary_syndic = false or role in ('subscriber_admin', 'syndic'));

create or replace function public.default_syndic_permissions()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'apartments.view_grid', true,
    'apartments.view_details', true,
    'apartments.view_contacts', true,
    'residents.view', true,
    'residents.approve', true,
    'residents.invite', true,
    'announcements.view', true,
    'announcements.create', true,
    'announcements.send_to_all', true,
    'bookings.view_all', true,
    'bookings.approve', true,
    'tickets.view_all', true,
    'tickets.reply', true,
    'tickets.change_status', true,
    'packages.view_all', true,
    'documents.view', true,
    'incidents.create', true,
    'incidents.review', true,
    'settings.view', true,
    'billing.manage', false,
    'billing.change_plan', false,
    'settings.roles', false,
    'privacy.export_data', false
  );
$$;

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.create_condominium_with_structure(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  condo_id uuid;
  admin_membership_id uuid;
  invite_id uuid;
  invite_token text;
  block_id uuid;
  block_index int;
  apt_index int;
  plan_name text := 'free';
  plan_row public.plan_limits;
  block_count int := coalesce((payload->>'block_count')::int, 1);
  apartments_per_block int := coalesce((payload->>'apartments_per_block')::int, 1);
  total_apartments int;
  syndic_choice text := coalesce(payload->>'syndic_choice', 'later');
  condo_slug text := public.slugify(coalesce(payload->>'slug', payload->>'name'));
  contact_email text := nullif(payload->>'contact_email', '');
begin
  if current_user_id is null then
    raise exception 'Usuário autenticado é obrigatório.';
  end if;

  if nullif(payload->>'name', '') is null then
    raise exception 'Nome do condomínio é obrigatório.';
  end if;

  if condo_slug = '' then
    raise exception 'Slug inválido.';
  end if;

  select * into plan_row from public.plan_limits where plan = plan_name;
  if plan_row.plan is null then
    raise exception 'Plano inválido.';
  end if;

  if block_count < 1 or apartments_per_block < 1 then
    raise exception 'Informe ao menos 1 bloco e 1 apartamento por bloco.';
  end if;

  total_apartments := block_count * apartments_per_block;

  if block_count > plan_row.max_blocks then
    raise exception 'O plano % permite no máximo % bloco(s).', plan_name, plan_row.max_blocks;
  end if;

  if apartments_per_block > plan_row.max_apartments_per_block then
    raise exception 'O plano % permite no máximo % apartamentos por bloco.', plan_name, plan_row.max_apartments_per_block;
  end if;

  if total_apartments > plan_row.max_total_apartments then
    raise exception 'O plano % permite no máximo % apartamentos no total.', plan_name, plan_row.max_total_apartments;
  end if;

  insert into public.condominiums (
    name,
    slug,
    contact_email,
    contact_phone,
    address,
    owner_user_id,
    plan,
    subscription_status,
    settings
  )
  values (
    payload->>'name',
    condo_slug,
    contact_email,
    nullif(payload->>'contact_phone', ''),
    nullif(payload->>'address', ''),
    current_user_id,
    plan_name,
    case when plan_name = 'free' then 'free' else 'trialing' end,
    jsonb_build_object(
      'syndic_auto_approve', true,
      'syndic_defined', syndic_choice = 'self'
    )
  )
  returning id into condo_id;

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
    condo_id,
    current_user_id,
    'subscriber_admin',
    'active',
    case when syndic_choice = 'self' then public.default_syndic_permissions() else '{}'::jsonb end,
    syndic_choice = 'self',
    current_user_id,
    now()
  )
  returning id into admin_membership_id;

  for block_index in 1..block_count loop
    insert into public.blocks (condominium_id, name, sort_order)
    values (condo_id, 'Bloco ' || chr(64 + block_index), block_index)
    returning id into block_id;

    for apt_index in 1..apartments_per_block loop
      insert into public.apartments (condominium_id, block_id, number, floor)
      values (
        condo_id,
        block_id,
        lpad(apt_index::text, 2, '0'),
        ceil(apt_index / 4.0)::int::text
      );
    end loop;
  end loop;

  if syndic_choice = 'self' then
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
    select
      condo_id,
      admin_membership_id,
      coalesce(p.full_name, p.email, 'Síndico'),
      p.phone,
      p.email,
      'Criador do condomínio atua como síndico principal.',
      current_date,
      'active'
    from public.profiles p
    where p.id = current_user_id;
  elsif syndic_choice = 'invite' then
    invite_token := encode(gen_random_bytes(24), 'hex');

    insert into public.invites (
      condominium_id,
      invited_by,
      token,
      invite_type,
      role,
      email,
      expires_at,
      status
    )
    values (
      condo_id,
      current_user_id,
      invite_token,
      'syndic',
      'syndic',
      nullif(payload->>'syndic_email', ''),
      now() + interval '7 days',
      'active'
    )
    returning id into invite_id;
  end if;

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
    current_user_id,
    'create_condominium',
    'condominiums',
    condo_id,
    jsonb_build_object('syndic_choice', syndic_choice, 'plan', plan_name)
  );

  return jsonb_build_object(
    'condominium_id', condo_id,
    'slug', condo_slug,
    'syndic_choice', syndic_choice,
    'invite_token', invite_token
  );
end;
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
    raise exception 'Usuário autenticado é obrigatório.';
  end if;

  select * into invite_row
  from public.invites
  where token = invite_token
    and invite_type = 'syndic'
    and role = 'syndic'
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

  select count(*) into active_syndics
  from public.memberships
  where condominium_id = invite_row.condominium_id
    and status = 'active'
    and (role = 'syndic' or is_primary_syndic = true);

  if active_syndics >= limits.max_syndics then
    raise exception 'Limite de síndicos do plano atingido.';
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
    coalesce(nullif(profile_payload->>'full_name', ''), 'Síndico'),
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
    'invite_type', i.invite_type,
    'role', i.role,
    'email', i.email,
    'status', i.status,
    'expires_at', i.expires_at,
    'valid', i.status = 'active' and i.used_at is null and (i.expires_at is null or i.expires_at > now())
  )
  from public.invites i
  join public.condominiums c on c.id = i.condominium_id
  where i.token = invite_token
  limit 1;
$$;
