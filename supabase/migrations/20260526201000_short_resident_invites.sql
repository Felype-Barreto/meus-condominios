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

  if responsible_count + active_invite_count >= 2 then
    raise exception 'Este apartamento ja tem o limite de responsaveis ou convites ativos. Aguarde o convite expirar em ate 10 minutos ou remova um responsavel.';
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
    jsonb_build_object(
      'role', invite_role,
      'email', lower(trim(invite_email)),
      'apartment_id', apt_id,
      'expires_at', invite_expiration
    )
  );

  return jsonb_build_object(
    'token', invite_token,
    'condominium_id', condo_id,
    'apartment_id', apt_id,
    'expires_at', invite_expiration
  );
end;
$$;
