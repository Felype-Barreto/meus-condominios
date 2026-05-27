create or replace function public.set_apartment_responsible(
  condo_id uuid,
  membership_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  target_row public.memberships;
  actor_is_same_apartment boolean := false;
begin
  if actor is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  select * into target_row
  from public.memberships m
  where m.id = membership_id
    and m.condominium_id = condo_id
    and m.role in ('resident', 'owner')
    and m.apartment_id is not null
    and m.status in ('active', 'pending');

  if target_row.id is null then
    raise exception 'Cadastro de morador invalido para este apartamento.';
  end if;

  select exists (
    select 1
    from public.memberships m
    where m.condominium_id = condo_id
      and m.apartment_id = target_row.apartment_id
      and m.user_id = actor
      and m.role in ('resident', 'owner')
      and m.status = 'active'
  ) into actor_is_same_apartment;

  if not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'residents.approve')
    or public.has_permission(condo_id, 'residents.invite')
    or actor_is_same_apartment
  ) then
    raise exception 'Voce nao tem permissao para alterar o responsavel do apartamento.';
  end if;

  update public.memberships m
  set
    privacy_settings = coalesce(m.privacy_settings, '{}'::jsonb) - 'is_apartment_responsible',
    updated_at = now()
  where m.condominium_id = condo_id
    and m.apartment_id = target_row.apartment_id
    and m.role in ('resident', 'owner')
    and m.id <> target_row.id;

  update public.memberships m
  set
    privacy_settings = jsonb_set(
      coalesce(m.privacy_settings, '{}'::jsonb),
      '{is_apartment_responsible}',
      'true'::jsonb,
      true
    ),
    updated_at = now()
  where m.id = target_row.id;
end;
$$;

create or replace function public.notify_apartment_responsibles(
  condo_id uuid,
  apt_id uuid,
  notification_type text,
  notification_title text,
  notification_body text,
  notification_href text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row record;
begin
  if apt_id is null then
    return;
  end if;

  for member_row in
    select m.user_id
    from public.memberships m
    where m.condominium_id = condo_id
      and m.apartment_id = apt_id
      and m.status = 'active'
      and m.role in ('resident', 'owner')
      and m.user_id is not null
    group by m.user_id
    order by
      bool_or(coalesce((m.privacy_settings->>'is_apartment_responsible')::boolean, false)) desc,
      min(m.created_at) asc
    limit 1
  loop
    perform public.notify_user_account(
      condo_id,
      member_row.user_id,
      notification_type,
      notification_title,
      notification_body,
      notification_href
    );
  end loop;
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
  used_invite_row public.invites;
  created_ids uuid[] := array[]::uuid[];
  existing_ids uuid[] := array[]::uuid[];
  inserted_id uuid;
  role_to_insert text;
  auto_approve boolean := false;
  target_status text := 'pending';
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
    select * into used_invite_row
    from public.invites
    where token = invite_token
      and invite_type in ('resident', 'owner')
      and status = 'used'
      and used_by = actor;

    if used_invite_row.id is not null then
      select array_agg(m.id order by m.created_at)
        into existing_ids
      from public.memberships m
      where m.condominium_id = used_invite_row.condominium_id
        and m.apartment_id = used_invite_row.apartment_id
        and m.user_id = actor
        and m.role in ('resident', 'owner')
        and m.status in ('active', 'pending');

      return jsonb_build_object(
        'condominium_id', used_invite_row.condominium_id,
        'status', coalesce((
          select m.status
          from public.memberships m
          where m.condominium_id = used_invite_row.condominium_id
            and m.apartment_id = used_invite_row.apartment_id
            and m.user_id = actor
            and m.role in ('resident', 'owner')
          order by m.created_at desc
          limit 1
        ), 'pending'),
        'membership_ids', coalesce(existing_ids, array[]::uuid[]),
        'already_used_by_actor', true
      );
    end if;

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

  select coalesce((c.settings->>'resident_auto_approve')::boolean, false)
    into auto_approve
  from public.condominiums c
  where c.id = invite_row.condominium_id;

  target_status := case when auto_approve then 'active' else 'pending' end;

  insert into public.profiles (id, full_name, email, phone)
  values (
    actor,
    nullif(profile_payload->>'full_name', ''),
    coalesce(actor_email, nullif(profile_payload->>'email', '')),
    nullif(profile_payload->>'phone', '')
  )
  on conflict (id)
  do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = coalesce(excluded.email, public.profiles.email),
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();

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
      approved_by,
      approved_at,
      permissions,
      privacy_settings
    )
    values (
      invite_row.condominium_id,
      apt_id,
      actor,
      role_to_insert,
      target_status,
      case when auto_approve then actor else null end,
      case when auto_approve then now() else null end,
      '{}'::jsonb,
      privacy_payload
    )
    on conflict (condominium_id, user_id, role)
    do update set
      apartment_id = excluded.apartment_id,
      status = target_status,
      approved_by = case when auto_approve then actor else public.memberships.approved_by end,
      approved_at = case when auto_approve then now() else public.memberships.approved_at end,
      privacy_settings = excluded.privacy_settings,
      updated_at = now()
    returning id into inserted_id;

    created_ids := array_append(created_ids, inserted_id);
  end loop;

  if not exists (
    select 1
    from public.memberships m
    where m.condominium_id = invite_row.condominium_id
      and m.apartment_id = apt_id
      and m.role in ('resident', 'owner')
      and m.id <> all(created_ids)
      and coalesce((m.privacy_settings->>'is_apartment_responsible')::boolean, false)
  ) then
    update public.memberships m
    set privacy_settings = jsonb_set(
      coalesce(m.privacy_settings, '{}'::jsonb),
      '{is_apartment_responsible}',
      'true'::jsonb,
      true
    )
    where m.id = created_ids[1];
  end if;

  update public.invites
  set used_at = now(), used_by = actor, status = 'used'
  where id = invite_row.id;

  perform public.audit_event(
    invite_row.condominium_id,
    'accept_resident_invite',
    'invites',
    invite_row.id,
    jsonb_build_object(
      'apartment_id', apt_id,
      'membership_kind', membership_kind,
      'status', target_status,
      'auto_approve', auto_approve
    )
  );

return jsonb_build_object(
    'condominium_id', invite_row.condominium_id,
    'status', target_status,
    'membership_ids', created_ids
  );
end;
$$;

revoke all on function public.set_apartment_responsible(uuid, uuid) from public;
grant execute on function public.set_apartment_responsible(uuid, uuid) to authenticated;

revoke all on function public.notify_apartment_responsibles(uuid, uuid, text, text, text, text) from public;
grant execute on function public.notify_apartment_responsibles(uuid, uuid, text, text, text, text) to authenticated;

revoke all on function public.accept_resident_invite(text, jsonb, uuid, text, jsonb) from public;
grant execute on function public.accept_resident_invite(text, jsonb, uuid, text, jsonb) to authenticated;
