-- Storage policies protect paths and permissions. This trigger also protects
-- plan quotas when an allowed client uploads directly to the private bucket.
create or replace function public.can_upload_file(condo_id uuid, file_size bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  limits public.plan_limits;
  used_mb int;
  file_mb int := ceil(greatest(file_size, 0) / 1048576.0)::int;
  pct numeric;
  total_allowed boolean;
  file_allowed boolean;
begin
  select pl.* into limits
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;

  if limits.plan is null then
    return jsonb_build_object('key', 'storage_mb', 'allowed', false, 'reason', 'plan_not_found');
  end if;

  used_mb := (public.get_current_usage(condo_id)->>'storage_mb')::int;
  file_allowed := file_mb <= coalesce(limits.max_upload_file_mb, 2);
  total_allowed := used_mb + file_mb <= limits.max_storage_mb;
  pct := case
    when limits.max_storage_mb <= 0 then 100
    else round(((used_mb + file_mb)::numeric / limits.max_storage_mb::numeric) * 100, 2)
  end;

  if not total_allowed then
    perform public.log_plan_limit_hit(condo_id, 'storage_mb', used_mb + file_mb, limits.max_storage_mb);
  end if;

  return jsonb_build_object(
    'key', 'storage_mb',
    'allowed', file_allowed and total_allowed,
    'reason', case
      when not file_allowed then 'file_too_large'
      when not total_allowed then 'storage_limit'
      else null
    end,
    'used', used_mb,
    'limit', limits.max_storage_mb,
    'percent', pct,
    'warn', pct >= 80,
    'blocked', not (file_allowed and total_allowed),
    'file_size_mb', file_mb
  );
end;
$$;

create or replace function public.enforce_morai_storage_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  condo_id uuid;
  file_size bigint;
  decision jsonb;
begin
  if new.bucket_id <> 'morai-documents' then
    return new;
  end if;

  condo_id := public.storage_object_condominium_id(new.name);
  if condo_id is null then
    raise exception 'Caminho de storage sem condomínio válido.';
  end if;

  file_size := coalesce((new.metadata->>'size')::bigint, 0);
  decision := public.can_upload_file(condo_id, file_size);
  if coalesce((decision->>'allowed')::boolean, false) = false then
    if decision->>'reason' = 'file_too_large' then
      raise exception 'Arquivo acima do limite permitido pelo plano.';
    end if;
    raise exception 'Limite de armazenamento do condomínio atingido.';
  end if;

  return new;
exception
  when invalid_text_representation then
    raise exception 'Metadados de storage inválidos.';
end;
$$;

drop trigger if exists morai_storage_plan_limit on storage.objects;
create trigger morai_storage_plan_limit
before insert on storage.objects
for each row execute function public.enforce_morai_storage_plan_limit();
