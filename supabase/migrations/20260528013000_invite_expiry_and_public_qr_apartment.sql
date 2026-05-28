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
    and expires_at is not null
    and expires_at <= now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

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
  invite_expiration timestamptz := now() + interval '10 minutes';
begin
  if actor is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  perform public.expire_stale_invites();

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
    and i.expires_at > now();

  if responsible_count >= 2 then
    raise exception 'Este apartamento ja tem 2 responsaveis ativos ou pendentes. Aprove ou rejeite os cadastros pendentes antes de enviar outro convite.';
  end if;

  if responsible_count + active_invite_count >= 2 then
    raise exception 'Este apartamento ja tem convite ativo ocupando a vaga restante. Aguarde ate 10 minutos para expirar ou use o link ja gerado.';
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
    invite_expiration,
    'active'
  );

  return jsonb_build_object(
    'token', invite_token,
    'condominium_id', condo_id,
    'apartment_id', apt_id,
    'expires_at', invite_expiration
  );
end;
$$;

create or replace function public.submit_public_qr_request(
  qr_public_code text,
  search_term text,
  visitor_name_input text default null,
  visitor_phone_input text default null,
  visitor_message text default null,
  request_ip_hash text default null,
  request_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  condo record;
  normalized_search text;
  recent_attempts int;
  matched_apartment_id uuid;
  request_id uuid;
  public_enabled boolean;
  term_hash text;
  ua_hash text;
begin
  normalized_search := public.normalize_public_search(search_term);
  term_hash := public.hash_public_qr_value(normalized_search);
  ua_hash := public.hash_public_qr_value(left(coalesce(request_user_agent, ''), 240));

  select id, name, settings
  into condo
  from public.condominiums
  where public_code = qr_public_code;

  if condo.id is null then
    return jsonb_build_object('status', 'accepted', 'matched', false);
  end if;

  public_enabled := coalesce((condo.settings->>'public_qr_enabled')::boolean, false);
  if public_enabled = false then
    return jsonb_build_object('status', 'disabled', 'matched', false);
  end if;

  select count(*)
  into recent_attempts
  from public.qr_public_access_logs a
  where a.condominium_id = condo.id
    and a.ip_hash = request_ip_hash
    and a.created_at >= now() - interval '10 minutes';

  if request_ip_hash is not null and recent_attempts >= 8 then
    return jsonb_build_object('status', 'rate_limited', 'matched', false);
  end if;

  if length(normalized_search) >= 1 then
    select a.id
    into matched_apartment_id
    from public.apartments a
    left join public.blocks b on b.id = a.block_id
    where a.condominium_id = condo.id
      and (
        public.normalize_public_search(a.number) = normalized_search
        or public.normalize_public_search(coalesce(b.name, '') || ' ' || a.number) = normalized_search
        or public.normalize_public_search(coalesce(b.name, '') || '-' || a.number) = normalized_search
      )
      and exists (
        select 1
        from public.memberships m
        where m.condominium_id = condo.id
          and m.apartment_id = a.id
          and m.status = 'active'
          and m.role in ('resident', 'owner')
      )
    order by coalesce(b.name, ''), a.number
    limit 1;
  end if;

  insert into public.qr_public_access_logs (
    condominium_id,
    ip_hash,
    user_agent_hash,
    searched_term_hash,
    result_type,
    blocked,
    reason
  )
  values (
    condo.id,
    request_ip_hash,
    ua_hash,
    term_hash,
    case when matched_apartment_id is null then 'no_authorized_match' else 'matched' end,
    false,
    null
  );

  if matched_apartment_id is not null then
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
      condo.id,
      matched_apartment_id,
      null,
      nullif(left(visitor_name_input, 120), ''),
      nullif(left(visitor_phone_input, 40), ''),
      nullif(left(visitor_message, 500), ''),
      'created'
    )
    returning id into request_id;
  end if;

  return jsonb_build_object(
    'status', 'accepted',
    'matched', matched_apartment_id is not null,
    'request_id', request_id,
    'whatsapp_url', null
  );
end;
$$;

revoke all on function public.expire_stale_invites() from public;
grant execute on function public.expire_stale_invites() to authenticated, service_role;
grant execute on function public.submit_public_qr_request(text, text, text, text, text, text, text) to anon, authenticated;
