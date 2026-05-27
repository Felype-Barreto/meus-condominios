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
  can_invite jsonb;
  invite_token text;
  invite_expiration timestamptz;
begin
  if actor is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  if not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'settings.roles')
    or public.has_permission(condo_id, 'gate.view_panel')
  ) then
    raise exception 'Voce nao tem permissao para convidar guarita.';
  end if;

  can_invite := public.can_invite_doorman(condo_id);
  if (can_invite->>'allowed')::boolean = false then
    raise exception 'Limite de operadores de guarita do plano atingido.';
  end if;

  invite_token := encode(gen_random_bytes(24), 'hex');
  invite_expiration := now() + interval '10 minutes';

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
    'invite_doorman',
    'invites',
    jsonb_build_object('email', invite_email)
  );

  return jsonb_build_object(
    'token', invite_token,
    'condominium_id', condo_id,
    'expires_at', invite_expiration
  );
end;
$$;
