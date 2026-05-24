-- Cascading deletes can fire child-table audit triggers after the parent
-- condominium row has already been removed. In that case there is no valid
-- FK target for audit_logs, so skip the tenant audit row.

create or replace function public.log_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  condo_id uuid;
  row_id uuid;
  row_data jsonb;
  payload jsonb;
begin
  row_data := coalesce(to_jsonb(new), to_jsonb(old));
  row_id := (row_data->>'id')::uuid;

  if tg_table_name = 'condominiums' then
    condo_id := row_id;
  else
    condo_id := nullif(row_data->>'condominium_id', '')::uuid;
  end if;

  if condo_id is null then
    return coalesce(new, old);
  end if;

  if not exists (select 1 from public.condominiums c where c.id = condo_id) then
    return coalesce(new, old);
  end if;

  payload := jsonb_build_object(
    'old', case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    'new', case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

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
    lower(tg_op),
    tg_table_name,
    row_id,
    payload
  );

  return coalesce(new, old);
end;
$$;
