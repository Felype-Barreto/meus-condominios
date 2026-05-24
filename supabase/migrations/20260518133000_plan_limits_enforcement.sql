alter table public.plan_limits
  add column if not exists monthly_price_cents int not null default 0,
  add column if not exists annual_price_cents int not null default 0,
  add column if not exists secure_qr boolean not null default false,
  add column if not exists read_receipts boolean not null default false,
  add column if not exists advanced_documents boolean not null default false,
  add column if not exists advanced_logs boolean not null default false,
  add column if not exists priority_support boolean not null default false;

update public.plan_limits
set
  monthly_price_cents = case plan
    when 'free' then 0
    when 'premium' then 3990
    when 'pro' then 9990
    when 'total' then 24990
    else monthly_price_cents
  end,
  annual_price_cents = case plan
    when 'free' then 0
    when 'premium' then 39900
    when 'pro' then 99900
    when 'total' then 249900
    else annual_price_cents
  end,
  secure_qr = plan in ('premium', 'pro', 'total'),
  read_receipts = plan in ('premium', 'pro', 'total'),
  advanced_documents = plan in ('pro', 'total'),
  advanced_logs = plan in ('pro', 'total'),
  priority_support = plan = 'total';

create or replace function public.current_month_start()
returns timestamptz
language sql
stable
as $$
  select date_trunc('month', now());
$$;

create or replace function public.get_current_usage(condo_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'blocks', (select count(*) from public.blocks where condominium_id = condo_id),
    'apartments', (select count(*) from public.apartments where condominium_id = condo_id),
    'admins', (
      select count(*) from public.memberships
      where condominium_id = condo_id and role = 'admin' and status in ('active', 'pending')
    ),
    'syndics', (
      select count(*) from public.memberships
      where condominium_id = condo_id
        and status in ('active', 'pending')
        and (role = 'syndic' or is_primary_syndic = true)
    ),
    'doormen', (
      select count(*) from public.memberships
      where condominium_id = condo_id and role = 'doorman' and status in ('active', 'pending')
    ),
    'common_areas', (select count(*) from public.common_areas where condominium_id = condo_id),
    'bookings_month', (
      select count(*) from public.bookings
      where condominium_id = condo_id and created_at >= public.current_month_start()
    ),
    'tickets_month', (
      select count(*) from public.tickets
      where condominium_id = condo_id and created_at >= public.current_month_start()
    ),
    'announcements_month', (
      select count(*) from public.announcements
      where condominium_id = condo_id and created_at >= public.current_month_start()
    ),
    'packages_month', (
      select count(*) from public.packages
      where condominium_id = condo_id and created_at >= public.current_month_start()
    ),
    'storage_mb', coalesce((
      select ceil(sum(coalesce((o.metadata->>'size')::bigint, 0)) / 1048576.0)::int
      from storage.objects o
      where o.bucket_id = 'morai-documents'
        and public.storage_object_condominium_id(o.name) = condo_id
    ), 0)
  );
$$;

create or replace function public.log_plan_limit_hit(
  condo_id uuid,
  limit_key text,
  used_value int,
  limit_value int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    condominium_id,
    actor_user_id,
    action,
    entity_type,
    metadata
  )
  values (
    condo_id,
    auth.uid(),
    'plan_limit_hit',
    'plan_limits',
    jsonb_build_object('limit_key', limit_key, 'used', used_value, 'limit', limit_value)
  );
end;
$$;

create or replace function public.plan_limit_result(
  condo_id uuid,
  limit_key text,
  used_value int,
  limit_value int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean := used_value < limit_value;
  pct numeric := case when limit_value <= 0 then 100 else round((used_value::numeric / limit_value::numeric) * 100, 2) end;
begin
  if not allowed then
    perform public.log_plan_limit_hit(condo_id, limit_key, used_value, limit_value);
  end if;

  return jsonb_build_object(
    'key', limit_key,
    'allowed', allowed,
    'used', used_value,
    'limit', limit_value,
    'percent', pct,
    'warn', pct >= 80,
    'blocked', not allowed
  );
end;
$$;

create or replace function public.can_create_block(condo_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.plan_limit_result(
    condo_id,
    'blocks',
    (public.get_current_usage(condo_id)->>'blocks')::int,
    pl.max_blocks
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.can_create_apartment(condo_id uuid, block_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  limits public.plan_limits;
  total_apartments int;
  block_apartments int;
  total_result jsonb;
begin
  select pl.* into limits
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;

  select count(*) into total_apartments from public.apartments where condominium_id = condo_id;
  select count(*) into block_apartments from public.apartments where condominium_id = condo_id and apartments.block_id = can_create_apartment.block_id;

  total_result := public.plan_limit_result(condo_id, 'apartments', total_apartments, limits.max_total_apartments);
  if (total_result->>'allowed')::boolean = false then
    return total_result;
  end if;

  return public.plan_limit_result(condo_id, 'apartments_per_block', block_apartments, limits.max_apartments_per_block);
end;
$$;

create or replace function public.can_invite_admin(condo_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.plan_limit_result(
    condo_id,
    'admins',
    (public.get_current_usage(condo_id)->>'admins')::int,
    pl.max_admins
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.can_invite_syndic(condo_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.plan_limit_result(
    condo_id,
    'syndics',
    (public.get_current_usage(condo_id)->>'syndics')::int,
    pl.max_syndics
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.can_invite_doorman(condo_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.plan_limit_result(
    condo_id,
    'doormen',
    (public.get_current_usage(condo_id)->>'doormen')::int,
    pl.max_doormen
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.can_create_common_area(condo_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.plan_limit_result(
    condo_id,
    'common_areas',
    (public.get_current_usage(condo_id)->>'common_areas')::int,
    pl.max_common_areas
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.can_create_booking(condo_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.plan_limit_result(
    condo_id,
    'bookings_month',
    (public.get_current_usage(condo_id)->>'bookings_month')::int,
    pl.max_bookings_per_month
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.can_create_ticket(condo_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.plan_limit_result(
    condo_id,
    'tickets_month',
    (public.get_current_usage(condo_id)->>'tickets_month')::int,
    pl.max_tickets_per_month
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.can_create_announcement(condo_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.plan_limit_result(
    condo_id,
    'announcements_month',
    (public.get_current_usage(condo_id)->>'announcements_month')::int,
    pl.max_announcements_per_month
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.can_create_package(condo_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.plan_limit_result(
    condo_id,
    'packages_month',
    (public.get_current_usage(condo_id)->>'packages_month')::int,
    pl.max_packages_per_month
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.can_upload_file(condo_id uuid, file_size bigint)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.plan_limit_result(
    condo_id,
    'storage_mb',
    (public.get_current_usage(condo_id)->>'storage_mb')::int,
    pl.max_storage_mb
  ) || jsonb_build_object(
    'file_size_mb', ceil(file_size / 1048576.0)::int,
    'allowed', ((public.get_current_usage(condo_id)->>'storage_mb')::int + ceil(file_size / 1048576.0)::int) <= pl.max_storage_mb
  )
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;
$$;

create or replace function public.assert_plan_limit(condo_id uuid, limit_function text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  execute format('select public.%I($1)', limit_function) using condo_id into result;

  if coalesce((result->>'allowed')::boolean, false) = false then
    raise exception 'Limite do plano atingido para %.', result->>'key';
  end if;
end;
$$;

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
begin
  if actor is null then
    raise exception 'Usuário autenticado é obrigatório.';
  end if;

  if not (
    public.is_subscriber_admin(condo_id)
    or public.has_permission(condo_id, 'settings.roles')
    or public.has_permission(condo_id, 'gate.view_panel')
  ) then
    raise exception 'Você não tem permissão para convidar guarita.';
  end if;

  can_invite := public.can_invite_doorman(condo_id);
  if (can_invite->>'allowed')::boolean = false then
    raise exception 'Limite de operadores de guarita do plano atingido.';
  end if;

  invite_token := encode(gen_random_bytes(24), 'hex');

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
    now() + interval '7 days',
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

  return jsonb_build_object('token', invite_token, 'condominium_id', condo_id);
end;
$$;

create or replace function public.create_gate_package(
  condo_id uuid,
  apt_id uuid,
  recipient text,
  package_description text default null,
  package_photo_url text default null
)
returns public.packages
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.packages;
  can_create jsonb;
begin
  if not (
    public.has_permission(condo_id, 'gate.register_package')
    or public.has_permission(condo_id, 'packages.create')
  ) then
    raise exception 'Você não tem permissão para registrar encomenda.';
  end if;

  can_create := public.can_create_package(condo_id);
  if (can_create->>'allowed')::boolean = false then
    raise exception 'Limite mensal de encomendas atingido.';
  end if;

  insert into public.packages (
    condominium_id,
    apartment_id,
    registered_by,
    recipient_name,
    description,
    photo_url,
    status
  )
  values (
    condo_id,
    apt_id,
    auth.uid(),
    nullif(recipient, ''),
    nullif(package_description, ''),
    nullif(package_photo_url, ''),
    'waiting'
  )
  returning * into created;

  insert into public.audit_logs (condominium_id, actor_user_id, action, entity_type, entity_id)
  values (condo_id, auth.uid(), 'gate_register_package', 'packages', created.id);

  return created;
end;
$$;
