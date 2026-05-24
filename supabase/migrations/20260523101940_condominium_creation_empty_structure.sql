-- Condominium creation should not guess the building layout.
-- Start with one empty block; admins build floors/apartments later.

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
  invite_token text;
  plan_name text;
  plan_row public.plan_limits;
  syndic_choice text := coalesce(payload->>'syndic_choice', 'later');
  condo_slug text := public.slugify(coalesce(payload->>'slug', payload->>'name'));
  contact_email text := nullif(payload->>'contact_email', '');
begin
  if current_user_id is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  insert into public.profiles (id, email)
  values (current_user_id, contact_email)
  on conflict (id) do update
    set email = coalesce(public.profiles.email, excluded.email);

  if nullif(payload->>'name', '') is null then
    raise exception 'Nome do condominio e obrigatorio.';
  end if;

  if condo_slug = '' then
    raise exception 'Slug invalido.';
  end if;

  plan_name := public.get_entitled_plan_for_user(current_user_id);
  select * into plan_row from public.plan_limits where plan = plan_name;
  if plan_row.plan is null then
    raise exception 'Plano invalido.';
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
    case when plan_name = 'free' then 'free' else 'active' end,
    jsonb_build_object(
      'syndic_auto_approve', true,
      'syndic_defined', syndic_choice = 'self'
    )
  )
  returning id, slug into condo_id, condo_slug;

  insert into public.memberships (
    condominium_id, user_id, role, status, permissions, is_primary_syndic, approved_by, approved_at
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

  insert into public.blocks (condominium_id, name, sort_order)
  values (condo_id, 'Bloco A', 1);

  if syndic_choice = 'self' then
    insert into public.syndic_profiles (
      condominium_id, membership_id, full_name, phone, email, professional_note, start_date, status
    )
    select
      condo_id,
      admin_membership_id,
      coalesce(p.full_name, p.email, 'Sindico'),
      p.phone,
      p.email,
      'Criador do condominio atua como sindico principal.',
      current_date,
      'active'
    from public.profiles p
    where p.id = current_user_id;
  elsif syndic_choice = 'invite' then
    invite_token := encode(gen_random_bytes(24), 'hex');
    insert into public.invites (
      condominium_id, invited_by, token, invite_type, role, email, expires_at, status
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
    );
  end if;

  insert into public.audit_logs (
    condominium_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    condo_id,
    current_user_id,
    'create_condominium',
    'condominiums',
    condo_id,
    jsonb_build_object(
      'syndic_choice', syndic_choice,
      'plan', plan_name,
      'initial_structure', 'empty_block'
    )
  );

  return jsonb_build_object(
    'condominium_id', condo_id,
    'slug', condo_slug,
    'syndic_choice', syndic_choice,
    'invite_token', invite_token,
    'plan', plan_name
  );
end;
$$;

grant execute on function public.create_condominium_with_structure(jsonb) to authenticated;
