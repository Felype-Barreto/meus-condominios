create table if not exists public.public_qr_attempts (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete cascade,
  public_code text not null,
  searched_term text,
  visitor_name text,
  outcome text not null default 'created',
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists public_qr_attempts_condominium_id_idx on public.public_qr_attempts (condominium_id);
create index if not exists public_qr_attempts_public_code_idx on public.public_qr_attempts (public_code);
create index if not exists public_qr_attempts_ip_hash_idx on public.public_qr_attempts (ip_hash);
create index if not exists public_qr_attempts_outcome_idx on public.public_qr_attempts (outcome);
create index if not exists public_qr_attempts_created_at_idx on public.public_qr_attempts (created_at);

alter table public.public_qr_attempts enable row level security;

create policy "public qr attempts read authorized"
on public.public_qr_attempts for select
to authenticated
using (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'public_qr.view_logs')
);

drop policy if exists "visitor requests create public" on public.visitor_contact_requests;

create policy "visitor requests read residents own apartment"
on public.visitor_contact_requests for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.condominium_id = visitor_contact_requests.condominium_id
      and m.apartment_id = visitor_contact_requests.apartment_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create or replace function public.normalize_public_search(value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(value, '')), '[^[:alnum:] ]', '', 'g'));
$$;

create or replace function public.get_public_qr_config(qr_public_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  condo record;
  enabled boolean;
begin
  select id, name, settings
  into condo
  from public.condominiums
  where public_code = qr_public_code;

  if condo.id is null then
    return jsonb_build_object('found', false, 'enabled', false);
  end if;

  enabled := coalesce((condo.settings->>'public_qr_enabled')::boolean, false);

  if enabled = false then
    return jsonb_build_object(
      'found', true,
      'enabled', false,
      'condominium_name', condo.name,
      'message', 'Este canal de contato não está disponível no momento.'
    );
  end if;

  return jsonb_build_object(
    'found', true,
    'enabled', true,
    'condominium_name', condo.name,
    'message', coalesce(
      nullif(condo.settings->>'public_qr_message', ''),
      'Informe quem deseja contatar. A administração ou o morador autorizado receberá sua solicitação.'
    )
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
  blocked_until timestamptz;
  matched_apartment_id uuid;
  matched_phone text;
  whatsapp_allowed boolean := false;
  request_id uuid;
  public_enabled boolean;
begin
  normalized_search := public.normalize_public_search(search_term);

  select id, name, settings
  into condo
  from public.condominiums
  where public_code = qr_public_code;

  if condo.id is null then
    insert into public.public_qr_attempts (public_code, searched_term, visitor_name, outcome, ip_hash, user_agent)
    values (qr_public_code, left(search_term, 120), left(visitor_name_input, 120), 'invalid_code', request_ip_hash, left(request_user_agent, 240));

    return jsonb_build_object('status', 'accepted', 'matched', false);
  end if;

  public_enabled := coalesce((condo.settings->>'public_qr_enabled')::boolean, false);

  if public_enabled = false then
    insert into public.public_qr_attempts (condominium_id, public_code, searched_term, visitor_name, outcome, ip_hash, user_agent)
    values (condo.id, qr_public_code, left(search_term, 120), left(visitor_name_input, 120), 'disabled', request_ip_hash, left(request_user_agent, 240));

    return jsonb_build_object('status', 'disabled', 'matched', false);
  end if;

  select count(*)
  into recent_attempts
  from public.public_qr_attempts a
  where a.condominium_id = condo.id
    and a.ip_hash = request_ip_hash
    and a.created_at >= now() - interval '10 minutes';

  if request_ip_hash is not null and recent_attempts >= 8 then
    blocked_until := now() + interval '10 minutes';

    insert into public.public_qr_attempts (condominium_id, public_code, searched_term, visitor_name, outcome, ip_hash, user_agent, metadata)
    values (
      condo.id,
      qr_public_code,
      left(search_term, 120),
      left(visitor_name_input, 120),
      'rate_limited',
      request_ip_hash,
      left(request_user_agent, 240),
      jsonb_build_object('blocked_until', blocked_until)
    );

    return jsonb_build_object(
      'status', 'rate_limited',
      'matched', false,
      'message', 'Muitas tentativas em pouco tempo. Tente novamente mais tarde.'
    );
  end if;

  if length(normalized_search) >= 2 then
    select a.id,
      case when coalesce((m.privacy_settings->>'allow_whatsapp_redirect')::boolean, false) then p.phone else null end,
      coalesce((m.privacy_settings->>'allow_whatsapp_redirect')::boolean, false)
    into matched_apartment_id, matched_phone, whatsapp_allowed
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
          coalesce((m.privacy_settings->>'allow_apartment_search')::boolean, false) = true
          or coalesce((m.privacy_settings->>'allow_public_qr_by_apartment')::boolean, false) = true
        )
        and (
          public.normalize_public_search(a.number) = normalized_search
          or public.normalize_public_search(coalesce(b.name, '') || ' ' || a.number) = normalized_search
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
    left(search_term, 120),
    left(visitor_name_input, 120),
    case when matched_apartment_id is null then 'no_authorized_match' else 'matched' end,
    request_ip_hash,
    left(request_user_agent, 240),
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
      left(search_term, 120),
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
    'whatsapp_url',
      case
        when whatsapp_allowed and nullif(regexp_replace(coalesce(matched_phone, ''), '[^0-9]', '', 'g'), '') is not null
        then 'https://wa.me/55' || regexp_replace(matched_phone, '[^0-9]', '', 'g')
        else null
      end
  );
end;
$$;

create or replace function public.update_public_qr_settings(
  condo_id uuid,
  enabled boolean,
  public_message text,
  default_privacy jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  can_manage boolean;
begin
  can_manage := public.is_condo_admin(condo_id)
    or public.has_permission(condo_id, 'public_qr.manage')
    or (enabled = true and public.has_permission(condo_id, 'public_qr.enable'))
    or (enabled = false and public.has_permission(condo_id, 'public_qr.disable'));

  if can_manage = false then
    raise exception 'Você não tem permissão para configurar o QR público.';
  end if;

  update public.condominiums
  set settings = settings
    || jsonb_build_object(
      'public_qr_enabled', enabled,
      'public_qr_message', left(coalesce(public_message, ''), 300),
      'public_qr_default_privacy', coalesce(default_privacy, '{}'::jsonb)
    ),
    updated_at = now()
  where id = condo_id;

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
    auth.uid(),
    'public_qr_settings_updated',
    'condominiums',
    condo_id,
    jsonb_build_object('enabled', enabled, 'default_privacy', default_privacy)
  );

  return public.get_public_qr_config((select public_code from public.condominiums where id = condo_id));
end;
$$;

grant execute on function public.get_public_qr_config(text) to anon, authenticated;
grant execute on function public.submit_public_qr_request(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_public_qr_settings(uuid, boolean, text, jsonb) to authenticated;
