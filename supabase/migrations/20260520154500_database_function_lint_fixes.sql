create or replace function public.gen_random_bytes(size integer)
returns bytea
language sql
volatile
set search_path = extensions, public
as $$
  select extensions.gen_random_bytes(size);
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
  created_membership_id uuid;
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
    email = coalesce(nullif(profile_payload->>'email', ''), email),
    updated_at = now()
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
  returning id into created_membership_id;

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
    created_membership_id,
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

  perform public.audit_event(
    invite_row.condominium_id,
    'accept_syndic_invite',
    'invites',
    invite_row.id,
    jsonb_build_object('membership_id', created_membership_id, 'auto_approve', auto_approve)
  );

  return jsonb_build_object(
    'condominium_id', invite_row.condominium_id,
    'membership_id', created_membership_id,
    'status', case when auto_approve then 'active' else 'pending' end
  );
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
  invite_row public.invites;
  created_ids uuid[] := array[]::uuid[];
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

create or replace function public.dispatch_communication(
  condo_id uuid,
  dispatch_title text,
  dispatch_body text,
  dispatch_priority text,
  dispatch_message_type text,
  dispatch_target_type text,
  dispatch_target_ids uuid[],
  channel_ids uuid[],
  schedule_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  created_dispatch_id uuid;
  channel record;
  limits jsonb;
  channel_status text;
begin
  if actor is null then
    raise exception 'Entre na sua conta.';
  end if;

  if not public.can_manage_communication(condo_id) then
    raise exception 'Você não tem permissão para disparar comunicação.';
  end if;

  if dispatch_priority = 'urgent' and length(trim(dispatch_body)) < 10 then
    raise exception 'Comunicado urgente precisa de mensagem clara.';
  end if;

  limits := public.get_communication_plan_limits(condo_id);

  insert into public.communication_dispatches (
    condominium_id, created_by, title, body, priority, message_type, target_type,
    target_ids, status, scheduled_at, sent_at
  )
  values (
    condo_id, actor, dispatch_title, dispatch_body, dispatch_priority, dispatch_message_type,
    dispatch_target_type, dispatch_target_ids,
    case when schedule_at is not null then 'scheduled' else 'sent' end,
    schedule_at,
    case when schedule_at is null then now() else null end
  )
  returning id into created_dispatch_id;

  for channel in
    select *
    from public.communication_channels
    where condominium_id = condo_id
      and id = any(channel_ids)
      and status <> 'inactive'
  loop
    channel_status := 'sent';

    if channel.type = 'whatsapp_official' and coalesce((limits->>'official_groups')::boolean, false) is false then
      channel_status := 'manual_only';
    elsif channel.type = 'whatsapp_official' and channel.status <> 'active' then
      channel_status := 'manual_only';
    elsif channel.type in ('whatsapp_manual', 'whatsapp_official') and channel.scope in ('all', 'block', 'garage', 'gate', 'council', 'staff') and public.is_group_safe_message(dispatch_body) is false then
      channel_status := 'failed';
    elsif schedule_at is not null then
      channel_status := 'pending';
    end if;

    insert into public.communication_dispatch_channels (
      dispatch_id,
      channel_id,
      status,
      estimated_cost_units,
      sent_at,
      error_message
    )
    values (
      created_dispatch_id,
      channel.id,
      channel_status,
      case when channel.type = 'whatsapp_official' and channel_status = 'sent' then 1 else 0 end,
      case when channel_status = 'sent' then now() else null end,
      case
        when channel_status = 'failed' then 'Mensagem bloqueada por regra de segurança para grupo.'
        when channel_status = 'manual_only' then 'Canal usa fallback manual neste plano/configuração.'
        else null
      end
    );

    insert into public.channel_usage_limits (condominium_id, month, channel_id, sent_count, failed_count)
    values (
      condo_id,
      to_char(now(), 'YYYY-MM'),
      channel.id,
      case when channel_status = 'sent' then 1 else 0 end,
      case when channel_status = 'failed' then 1 else 0 end
    )
    on conflict (condominium_id, month, channel_id)
    do update set
      sent_count = public.channel_usage_limits.sent_count + excluded.sent_count,
      failed_count = public.channel_usage_limits.failed_count + excluded.failed_count,
      updated_at = now();
  end loop;

  if not exists (
    select 1
    from public.communication_dispatch_channels c
    where c.dispatch_id = created_dispatch_id
  ) then
    raise exception 'Selecione pelo menos um canal ativo.';
  end if;

  perform public.audit_event(
    condo_id,
    'communication_dispatch',
    'communication_dispatches',
    created_dispatch_id,
    jsonb_build_object('channels', coalesce(array_length(channel_ids, 1), 0), 'message_type', dispatch_message_type)
  );

  return created_dispatch_id;
end;
$$;
