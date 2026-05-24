-- Do not depend on reading auth.users during condominium creation.
-- Some environments restrict direct reads there; a minimal profile row is
-- enough to satisfy internal foreign keys and can be completed later.

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
  block_id uuid;
  block_index int;
  apt_index int;
  plan_name text;
  plan_row public.plan_limits;
  block_count int := coalesce((payload->>'block_count')::int, 1);
  apartments_per_block int := coalesce((payload->>'apartments_per_block')::int, 1);
  total_apartments int;
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

  if block_count < 1 or apartments_per_block < 1 then
    raise exception 'Informe ao menos 1 bloco e 1 apartamento por bloco.';
  end if;

  total_apartments := block_count * apartments_per_block;

  if block_count > plan_row.max_blocks then
    raise exception 'O plano % permite no maximo % bloco(s).', plan_name, plan_row.max_blocks;
  end if;

  if apartments_per_block > plan_row.max_apartments_per_block then
    raise exception 'O plano % permite no maximo % apartamentos por bloco.', plan_name, plan_row.max_apartments_per_block;
  end if;

  if total_apartments > plan_row.max_total_apartments then
    raise exception 'O plano % permite no maximo % apartamentos no total.', plan_name, plan_row.max_total_apartments;
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

  for block_index in 1..block_count loop
    insert into public.blocks (condominium_id, name, sort_order)
    values (condo_id, 'Bloco ' || chr(64 + block_index), block_index)
    returning id into block_id;

    for apt_index in 1..apartments_per_block loop
      insert into public.apartments (condominium_id, block_id, number, floor)
      values (condo_id, block_id, lpad(apt_index::text, 2, '0'), ceil(apt_index / 4.0)::int::text);
    end loop;
  end loop;

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
      'ignored_payload_plan', nullif(payload->>'plan', '')
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
