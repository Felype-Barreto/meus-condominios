create table if not exists public.qr_public_access_logs (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete cascade,
  ip_hash text,
  user_agent_hash text,
  searched_term_hash text,
  result_type text not null,
  blocked boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists qr_public_access_logs_condominium_id_idx
  on public.qr_public_access_logs (condominium_id);
create index if not exists qr_public_access_logs_ip_hash_idx
  on public.qr_public_access_logs (ip_hash);
create index if not exists qr_public_access_logs_result_type_idx
  on public.qr_public_access_logs (result_type);
create index if not exists qr_public_access_logs_blocked_idx
  on public.qr_public_access_logs (blocked);
create index if not exists qr_public_access_logs_created_at_idx
  on public.qr_public_access_logs (created_at);

alter table public.qr_public_access_logs enable row level security;

drop policy if exists "qr public access logs read authorized" on public.qr_public_access_logs;
create policy "qr public access logs read authorized"
on public.qr_public_access_logs for select
using (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'public_qr.view_logs')
);

create or replace function public.hash_public_qr_value(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(extensions.digest(convert_to(coalesce(input, ''), 'UTF8'), 'sha256'), 'hex');
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
  blocked_until timestamptz;
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
    insert into public.qr_public_access_logs (
      ip_hash,
      user_agent_hash,
      searched_term_hash,
      result_type,
      blocked,
      reason
    )
    values (
      request_ip_hash,
      ua_hash,
      term_hash,
      'invalid_code',
      true,
      'invalid_public_code'
    );

    insert into public.public_qr_attempts (public_code, searched_term, visitor_name, outcome, ip_hash, user_agent)
    values (qr_public_code, null, null, 'invalid_code', request_ip_hash, null);

    return jsonb_build_object('status', 'accepted', 'matched', false);
  end if;

  public_enabled := coalesce((condo.settings->>'public_qr_enabled')::boolean, false);

  if public_enabled = false then
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
      'disabled',
      true,
      'public_qr_disabled'
    );

    insert into public.public_qr_attempts (condominium_id, public_code, searched_term, visitor_name, outcome, ip_hash, user_agent)
    values (condo.id, qr_public_code, null, null, 'disabled', request_ip_hash, null);

    return jsonb_build_object('status', 'disabled', 'matched', false);
  end if;

  select count(*)
  into recent_attempts
  from public.qr_public_access_logs a
  where a.condominium_id = condo.id
    and a.ip_hash = request_ip_hash
    and a.created_at >= now() - interval '10 minutes';

  if request_ip_hash is not null and recent_attempts >= 8 then
    blocked_until := now() + interval '10 minutes';

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
      'rate_limited',
      true,
      'too_many_attempts'
    );

    insert into public.public_qr_attempts (condominium_id, public_code, searched_term, visitor_name, outcome, ip_hash, user_agent, metadata)
    values (
      condo.id,
      qr_public_code,
      null,
      null,
      'rate_limited',
      request_ip_hash,
      null,
      jsonb_build_object('blocked_until', blocked_until)
    );

    return jsonb_build_object(
      'status', 'rate_limited',
      'matched', false,
      'message', 'Muitas tentativas em pouco tempo. Tente novamente mais tarde.'
    );
  end if;

  if length(normalized_search) >= 2 then
    select a.id
    into matched_apartment_id
    from public.memberships m
    join public.apartments a on a.id = m.apartment_id
    left join public.blocks b on b.id = a.block_id
    join public.profiles p on p.id = m.user_id
    where m.condominium_id = condo.id
      and m.status = 'active'
      and m.apartment_id is not null
      and coalesce((m.privacy_settings->>'allow_public_contact')::boolean, false) = true
      and (
        (
          (
            coalesce((m.privacy_settings->>'allow_apartment_search')::boolean, false) = true
            or coalesce((m.privacy_settings->>'allow_public_qr_by_apartment')::boolean, false) = true
          )
          and (
            public.normalize_public_search(a.number) = normalized_search
            or public.normalize_public_search(coalesce(b.name, '') || ' ' || a.number) = normalized_search
          )
        )
        or (
          (
            coalesce((m.privacy_settings->>'allow_name_search')::boolean, false) = true
            or coalesce((m.privacy_settings->>'allow_public_qr_by_name')::boolean, false) = true
          )
          and public.normalize_public_search(coalesce(p.full_name, '')) like normalized_search || '%'
        )
      )
    order by m.is_primary_syndic asc, m.created_at asc
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

  insert into public.public_qr_attempts (
    condominium_id,
    public_code,
    searched_term,
    visitor_name,
    outcome,
    ip_hash,
    user_agent,
    metadata
  )
  values (
    condo.id,
    qr_public_code,
    null,
    null,
    case when matched_apartment_id is null then 'no_authorized_match' else 'matched' end,
    request_ip_hash,
    null,
    jsonb_build_object('has_message', nullif(visitor_message, '') is not null)
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

grant execute on function public.hash_public_qr_value(text) to authenticated, anon, service_role;
grant execute on function public.submit_public_qr_request(text, text, text, text, text, text, text) to anon, authenticated;
