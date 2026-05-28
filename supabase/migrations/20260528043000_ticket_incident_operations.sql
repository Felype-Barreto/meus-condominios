drop policy if exists "incidents create members" on public.incidents;
drop policy if exists "incidents create authorized" on public.incidents;
create policy "incidents create authorized"
on public.incidents for insert
to authenticated
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'incidents.create')
  or public.has_permission(condominium_id, 'gate.create_incident')
);

drop policy if exists "tickets delete authorized" on public.tickets;
create policy "tickets delete authorized"
on public.tickets for delete
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'tickets.change_status')
);

drop policy if exists "incidents delete authorized" on public.incidents;
create policy "incidents delete authorized"
on public.incidents for delete
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'incidents.review')
);

drop policy if exists "morai storage read tickets scoped" on storage.objects;
create policy "morai storage read tickets scoped"
on storage.objects for select
to authenticated
using (
  bucket_id = 'morai-documents'
  and public.storage_object_condominium_id(name) is not null
  and name like (public.storage_object_condominium_id(name)::text || '/tickets/%')
  and (
    public.is_condo_admin(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'tickets.view_all')
    or name like (public.storage_object_condominium_id(name)::text || '/tickets/' || auth.uid()::text || '/%')
  )
);

drop policy if exists "morai storage insert tickets scoped" on storage.objects;
create policy "morai storage insert tickets scoped"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'morai-documents'
  and public.storage_object_condominium_id(name) is not null
  and name like (public.storage_object_condominium_id(name)::text || '/tickets/' || auth.uid()::text || '/%')
  and coalesce((public.can_upload_file(
    public.storage_object_condominium_id(name),
    coalesce((metadata->>'size')::bigint, 0)
  )->>'allowed')::boolean, true)
  and public.has_permission(public.storage_object_condominium_id(name), 'tickets.create')
);

drop policy if exists "morai storage read own incidents scoped" on storage.objects;
create policy "morai storage read own incidents scoped"
on storage.objects for select
to authenticated
using (
  bucket_id = 'morai-documents'
  and public.storage_object_condominium_id(name) is not null
  and name like (public.storage_object_condominium_id(name)::text || '/incidents/%')
  and (
    public.is_condo_admin(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'incidents.review')
    or name like (public.storage_object_condominium_id(name)::text || '/incidents/' || auth.uid()::text || '/%')
  )
);

create or replace function public.notify_incident_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_condominium_admins(
    new.condominium_id,
    case when new.severity = 'critical' then 'incident_critical' else 'incident_created' end,
    case when new.severity = 'critical' then 'Ocorrencia critica' else 'Nova ocorrencia' end,
    coalesce(new.title, 'Uma ocorrencia foi registrada.'),
    '/app/' || new.condominium_id || '/ocorrencias'
  );
  return new;
end;
$$;

drop trigger if exists incidents_notify_created on public.incidents;
create trigger incidents_notify_created
after insert on public.incidents
for each row execute function public.notify_incident_created();
