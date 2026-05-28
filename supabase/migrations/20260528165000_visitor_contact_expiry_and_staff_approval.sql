alter table public.visitor_contact_requests
  add column if not exists expires_at timestamptz;

update public.visitor_contact_requests
set expires_at = created_at + interval '10 minutes'
where expires_at is null;

create or replace function public.expire_visitor_contact_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.visitor_contact_requests
  set status = 'expired'
  where status = 'created'
    and coalesce(expires_at, created_at + interval '10 minutes') <= now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.visitor_contact_phone_text(visitor_phone_input text)
returns text
language sql
immutable
as $$
  select case
    when nullif(trim(coalesce(visitor_phone_input, '')), '') is null then ''
    else ' Telefone informado pelo visitante: ' || left(trim(visitor_phone_input), 40) || '.'
  end;
$$;

create or replace function public.notify_visitor_contact_responsibles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  visitor_label text;
  apartment_label text;
  phone_text text;
begin
  visitor_label := coalesce(nullif(new.visitor_name, ''), 'Um visitante');
  phone_text := public.visitor_contact_phone_text(new.visitor_phone);

  if new.apartment_id is not null then
    select trim(coalesce(b.name || ' - ', '') || a.number)
      into apartment_label
    from public.apartments a
    left join public.blocks b on b.id = a.block_id
    where a.id = new.apartment_id;

    perform public.notify_apartment_responsibles(
      new.condominium_id,
      new.apartment_id,
      'visitor_contact_request',
      'Visitante aguardando contato',
      visitor_label || ' aguarda o apartamento ' || coalesce(apartment_label, 'informado') || ' no portao. Responda em ate 10 minutos.' || phone_text,
      '/app/notificacoes?visitor_request_id=' || new.id
    );

    perform public.notify_condominium_qr_staff(
      new.condominium_id,
      'visitor_contact_info',
      'Visitante aguardando apartamento',
      visitor_label || ' aguarda o apartamento ' || coalesce(apartment_label, 'informado') || '. O responsavel do apartamento foi avisado.' || phone_text,
      '/app/notificacoes?visitor_request_id=' || new.id
    );
  else
    perform public.notify_condominium_qr_staff(
      new.condominium_id,
      'visitor_contact_request',
      'Visitante aguardando guarita/responsavel',
      visitor_label || ' pediu contato sem informar apartamento. Responda em ate 10 minutos.' || phone_text,
      '/app/notificacoes?visitor_request_id=' || new.id
    );
  end if;

  return new;
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
  staff_target boolean := false;
  expires_at_value timestamptz := now() + interval '10 minutes';
begin
  perform public.expire_visitor_contact_requests();

  normalized_search := public.normalize_public_search(search_term);
  staff_target := normalized_search = public.normalize_public_search('__condo_responsible__');
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

  if staff_target then
    insert into public.visitor_contact_requests (
      condominium_id,
      apartment_id,
      searched_term,
      visitor_name,
      visitor_phone,
      message,
      status,
      expires_at
    )
    values (
      condo.id,
      null,
      null,
      nullif(left(visitor_name_input, 120), ''),
      nullif(left(visitor_phone_input, 40), ''),
      nullif(left(visitor_message, 500), ''),
      'created',
      expires_at_value
    )
    returning id into request_id;

    insert into public.qr_public_access_logs (
      condominium_id,
      ip_hash,
      user_agent_hash,
      searched_term_hash,
      result_type,
      blocked,
      reason
    )
    values (condo.id, request_ip_hash, ua_hash, term_hash, 'staff_requested', false, null);

    return jsonb_build_object(
      'status', 'accepted',
      'matched', true,
      'target', 'staff',
      'request_id', request_id,
      'expires_at', expires_at_value,
      'whatsapp_url', null
    );
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
          and m.role in ('resident', 'owner', 'admin', 'syndic')
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
      status,
      expires_at
    )
    values (
      condo.id,
      matched_apartment_id,
      null,
      nullif(left(visitor_name_input, 120), ''),
      nullif(left(visitor_phone_input, 40), ''),
      nullif(left(visitor_message, 500), ''),
      'created',
      expires_at_value
    )
    returning id into request_id;
  end if;

  return jsonb_build_object(
    'status', 'accepted',
    'matched', matched_apartment_id is not null,
    'target', 'apartment',
    'request_id', request_id,
    'expires_at', case when matched_apartment_id is not null then expires_at_value else null end,
    'whatsapp_url', null
  );
end;
$$;

create or replace function public.release_visitor_contact(
  request_id uuid,
  approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.visitor_contact_requests;
  can_answer boolean;
  responder_role text;
  responder_phone text;
  responder_name text;
  can_redirect boolean;
  apartment_label text;
  visitor_label text;
begin
  perform public.expire_visitor_contact_requests();

  select *
    into request_row
  from public.visitor_contact_requests
  where id = request_id;

  if request_row.id is null then
    return jsonb_build_object('ok', false, 'message', 'Solicitacao nao encontrada.');
  end if;

  if request_row.status <> 'created' then
    return jsonb_build_object(
      'ok', false,
      'message',
      case
        when request_row.status = 'expired' then 'Esta solicitacao expirou. O visitante precisa tentar novamente.'
        when request_row.status = 'contact_released' then 'Contato ja liberado.'
        when request_row.status = 'rejected' then 'Solicitacao ja recusada.'
        else 'Esta solicitacao nao pode mais ser respondida.'
      end
    );
  end if;

  if coalesce(request_row.expires_at, request_row.created_at + interval '10 minutes') <= now() then
    update public.visitor_contact_requests
    set status = 'expired'
    where id = request_id;

    return jsonb_build_object('ok', false, 'message', 'Esta solicitacao expirou. O visitante precisa tentar novamente.');
  end if;

  if request_row.apartment_id is null then
    select exists (
      select 1
      from public.memberships m
      where m.condominium_id = request_row.condominium_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('subscriber_admin', 'admin', 'syndic', 'doorman')
    )
      into can_answer;
  else
    select exists (
      select 1
      from public.memberships m
      where m.condominium_id = request_row.condominium_id
        and m.apartment_id = request_row.apartment_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('resident', 'owner', 'admin', 'syndic')
    )
      into can_answer;
  end if;

  if not can_answer then
    return jsonb_build_object('ok', false, 'message', 'Sem permissao para responder esta solicitacao.');
  end if;

  update public.visitor_contact_requests
  set
    status = case when approve then 'contact_released' else 'rejected' end,
    contact_released_by = case when approve then auth.uid() else contact_released_by end,
    contact_released_at = case when approve then now() else contact_released_at end,
    contact_rejected_at = case when approve then contact_rejected_at else now() end
  where id = request_id;

  if approve then
    visitor_label := coalesce(nullif(request_row.visitor_name, ''), 'Um visitante');

    select p.phone, p.full_name, coalesce((m.privacy_settings->>'allow_whatsapp_redirect')::boolean, false), m.role
      into responder_phone, responder_name, can_redirect, responder_role
    from public.memberships m
    join public.profiles p on p.id = m.user_id
    where m.condominium_id = request_row.condominium_id
      and m.user_id = auth.uid()
      and m.status = 'active'
    order by case when request_row.apartment_id is not null and m.apartment_id = request_row.apartment_id then 0 else 1 end
    limit 1;

    if request_row.apartment_id is not null and (
      not can_redirect
      or nullif(regexp_replace(coalesce(responder_phone, ''), '\D', '', 'g'), '') is null
    ) then
      select trim(coalesce(b.name || ' - ', '') || a.number)
        into apartment_label
      from public.apartments a
      left join public.blocks b on b.id = a.block_id
      where a.id = request_row.apartment_id;

      perform public.notify_condominium_qr_staff(
        request_row.condominium_id,
        'visitor_contact_released_to_gate',
        'Contato liberado pelo morador',
        coalesce(responder_name, 'O responsavel') || ' autorizou o contato de ' || visitor_label || ' para o apartamento ' || coalesce(apartment_label, 'informado') || '. Como nao ha WhatsApp publico liberado, oriente a portaria.' || public.visitor_contact_phone_text(request_row.visitor_phone),
        '/app/notificacoes?visitor_request_id=' || request_row.id
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', case when approve then 'Contato liberado.' else 'Solicitacao recusada.' end
  );
end;
$$;

create or replace function public.get_public_contact_request_status(request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.visitor_contact_requests;
  phone text;
  resident_name text;
  can_redirect boolean;
  remaining_seconds integer;
begin
  perform public.expire_visitor_contact_requests();

  select *
    into request_row
  from public.visitor_contact_requests
  where id = request_id;

  if request_row.id is null then
    return jsonb_build_object('found', false, 'status', 'not_found');
  end if;

  remaining_seconds := greatest(
    0,
    floor(extract(epoch from (coalesce(request_row.expires_at, request_row.created_at + interval '10 minutes') - now())))::integer
  );

  if request_row.status <> 'contact_released' or request_row.contact_released_by is null then
    return jsonb_build_object(
      'found', true,
      'status', request_row.status,
      'expires_at', coalesce(request_row.expires_at, request_row.created_at + interval '10 minutes'),
      'remaining_seconds', remaining_seconds,
      'whatsapp_url', null
    );
  end if;

  select
    p.phone,
    p.full_name,
    coalesce((m.privacy_settings->>'allow_whatsapp_redirect')::boolean, false)
    into phone, resident_name, can_redirect
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.condominium_id = request_row.condominium_id
    and m.user_id = request_row.contact_released_by
    and m.status = 'active'
    and (
      request_row.apartment_id is null
      or m.apartment_id = request_row.apartment_id
    )
  order by case when request_row.apartment_id is not null and m.apartment_id = request_row.apartment_id then 0 else 1 end
  limit 1;

  return jsonb_build_object(
    'found', true,
    'status', request_row.status,
    'expires_at', coalesce(request_row.expires_at, request_row.created_at + interval '10 minutes'),
    'remaining_seconds', 0,
    'resident_name', case when can_redirect then resident_name else null end,
    'whatsapp_url',
      case
        when can_redirect and nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') is not null
          then 'https://wa.me/55' || regexp_replace(phone, '\D', '', 'g')
        else null
      end
  );
end;
$$;

revoke all on function public.expire_visitor_contact_requests() from public;
grant execute on function public.expire_visitor_contact_requests() to authenticated, anon, service_role;
grant execute on function public.submit_public_qr_request(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.release_visitor_contact(uuid, boolean) to authenticated;
grant execute on function public.get_public_contact_request_status(uuid) to anon, authenticated;
