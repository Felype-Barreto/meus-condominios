-- Route public QR requests to the right people:
-- apartment requests go to the apartment contact, while staff only receives
-- an informational copy. Visitors without apartment information can call staff.

create or replace function public.notify_condominium_qr_staff(
  condo_id uuid,
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
  for member_row in
    select distinct m.user_id
    from public.memberships m
    where m.condominium_id = condo_id
      and m.status = 'active'
      and m.user_id is not null
      and m.role in ('subscriber_admin', 'admin', 'syndic', 'doorman')
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
      and m.role in ('resident', 'owner', 'admin', 'syndic')
      and m.user_id is not null
    group by m.user_id
    order by
      bool_or(coalesce((m.privacy_settings->>'is_apartment_responsible')::boolean, false)) desc,
      bool_or(m.role in ('resident', 'owner')) desc,
      min(m.created_at) asc
    limit 2
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

create or replace function public.notify_visitor_contact_responsibles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  visitor_label text;
  apartment_label text;
begin
  visitor_label := coalesce(nullif(new.visitor_name, ''), 'Um visitante');

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
      visitor_label || ' aguarda o apartamento ' || coalesce(apartment_label, 'informado') || ' no portao. Acesse para decidir se libera o contato.',
      '/app/notificacoes?visitor_request_id=' || new.id
    );

    perform public.notify_condominium_qr_staff(
      new.condominium_id,
      'visitor_contact_info',
      'Visitante aguardando apartamento',
      visitor_label || ' aguarda o apartamento ' || coalesce(apartment_label, 'informado') || '. O responsavel do apartamento foi avisado.',
      '/app/notificacoes?visitor_request_id=' || new.id
    );
  else
    perform public.notify_condominium_qr_staff(
      new.condominium_id,
      'visitor_contact_fallback',
      'Visitante precisa de ajuda',
      visitor_label || ' pediu ajuda pelo QR sem informar apartamento. Verifique com a portaria ou responsavel.',
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
begin
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
      status
    )
    values (
      condo.id,
      null,
      null,
      nullif(left(visitor_name_input, 120), ''),
      nullif(left(visitor_phone_input, 40), ''),
      nullif(left(visitor_message, 500), ''),
      'created'
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
    'target', 'apartment',
    'request_id', request_id,
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
begin
  select *
    into request_row
  from public.visitor_contact_requests
  where id = request_id;

  if request_row.id is null then
    return jsonb_build_object('ok', false, 'message', 'Solicitacao nao encontrada.');
  end if;

  if request_row.apartment_id is null then
    return jsonb_build_object('ok', false, 'message', 'Esta solicitacao deve ser tratada pela portaria ou administracao.');
  end if;

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

  return jsonb_build_object(
    'ok', true,
    'message', case when approve then 'Contato liberado.' else 'Solicitacao recusada.' end
  );
end;
$$;

revoke all on function public.notify_condominium_qr_staff(uuid, text, text, text, text) from public;
grant execute on function public.notify_condominium_qr_staff(uuid, text, text, text, text) to authenticated;

revoke all on function public.notify_apartment_responsibles(uuid, uuid, text, text, text, text) from public;
grant execute on function public.notify_apartment_responsibles(uuid, uuid, text, text, text, text) to authenticated;

grant execute on function public.submit_public_qr_request(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.release_visitor_contact(uuid, boolean) to authenticated;

create or replace function public.set_my_membership_apartment(
  condo_id uuid,
  apt_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  if not exists (
    select 1
    from public.apartments a
    where a.id = apt_id
      and a.condominium_id = condo_id
  ) then
    raise exception 'Apartamento invalido para este condominio.';
  end if;

  if not exists (
    select 1
    from public.memberships m
    where m.condominium_id = condo_id
      and m.user_id = actor
      and m.status = 'active'
      and m.role in ('subscriber_admin', 'admin', 'syndic')
  ) then
    raise exception 'Somente administrador ou sindico ativo pode marcar o proprio apartamento.';
  end if;

  update public.memberships m
  set
    apartment_id = apt_id,
    privacy_settings = jsonb_set(
      coalesce(m.privacy_settings, '{}'::jsonb),
      '{also_resident}',
      'true'::jsonb,
      true
    ),
    updated_at = now()
  where m.condominium_id = condo_id
    and m.user_id = actor
    and m.status = 'active'
    and m.role in ('subscriber_admin', 'admin', 'syndic');
end;
$$;

revoke all on function public.set_my_membership_apartment(uuid, uuid) from public;
grant execute on function public.set_my_membership_apartment(uuid, uuid) to authenticated;
