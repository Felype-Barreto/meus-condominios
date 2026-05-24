create or replace function public.can_upload_file(condo_id uuid, file_size bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  limits public.plan_limits;
  used_mb int;
  file_mb int := ceil(file_size / 1048576.0)::int;
  allowed boolean;
  pct numeric;
begin
  select pl.* into limits
  from public.condominiums c
  join public.plan_limits pl on pl.plan = c.plan
  where c.id = condo_id;

  used_mb := (public.get_current_usage(condo_id)->>'storage_mb')::int;
  allowed := used_mb + file_mb <= limits.max_storage_mb;
  pct := case
    when limits.max_storage_mb <= 0 then 100
    else round(((used_mb + file_mb)::numeric / limits.max_storage_mb::numeric) * 100, 2)
  end;

  if not allowed then
    perform public.log_plan_limit_hit(condo_id, 'storage_mb', used_mb + file_mb, limits.max_storage_mb);
  end if;

  return jsonb_build_object(
    'key', 'storage_mb',
    'allowed', allowed,
    'used', used_mb,
    'limit', limits.max_storage_mb,
    'percent', pct,
    'warn', pct >= 80,
    'blocked', not allowed,
    'file_size_mb', file_mb
  );
end;
$$;
