-- Tighten Storage object policies by private path and module permission.
-- Object paths must start with the condominium UUID:
--   <condominium_id>/documents/<file>
--   <condominium_id>/packages/<file>
--   <condominium_id>/incidents/<file>

drop policy if exists "morai documents read scoped" on storage.objects;
drop policy if exists "morai documents upload staff" on storage.objects;
drop policy if exists "morai documents update staff" on storage.objects;
drop policy if exists "morai documents delete admins" on storage.objects;

create policy "morai storage read scoped"
on storage.objects for select
to authenticated
using (
  bucket_id = 'morai-documents'
  and (
    public.is_condo_admin(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.view')
    or public.has_permission(public.storage_object_condominium_id(name), 'packages.view_own')
    or public.has_permission(public.storage_object_condominium_id(name), 'packages.view_all')
    or public.has_permission(public.storage_object_condominium_id(name), 'incidents.review')
  )
);

create policy "morai storage insert scoped"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'morai-documents'
  and public.storage_object_condominium_id(name) is not null
  and (
    (
      name like (public.storage_object_condominium_id(name)::text || '/documents/%')
      and (
        public.is_condo_admin(public.storage_object_condominium_id(name))
        or public.has_permission(public.storage_object_condominium_id(name), 'documents.upload')
      )
    )
    or (
      name like (public.storage_object_condominium_id(name)::text || '/packages/%')
      and (
        public.is_condo_admin(public.storage_object_condominium_id(name))
        or public.has_permission(public.storage_object_condominium_id(name), 'packages.create')
        or public.has_permission(public.storage_object_condominium_id(name), 'packages.upload_photo')
        or public.has_permission(public.storage_object_condominium_id(name), 'gate.register_package')
      )
    )
    or (
      name like (public.storage_object_condominium_id(name)::text || '/incidents/%')
      and (
        public.is_condo_admin(public.storage_object_condominium_id(name))
        or public.has_permission(public.storage_object_condominium_id(name), 'incidents.create')
        or public.has_permission(public.storage_object_condominium_id(name), 'gate.create_incident')
      )
    )
  )
);

create policy "morai storage update scoped"
on storage.objects for update
to authenticated
using (
  bucket_id = 'morai-documents'
  and (
    public.is_condo_admin(public.storage_object_condominium_id(name))
    or (
      name like (public.storage_object_condominium_id(name)::text || '/documents/%')
      and public.has_permission(public.storage_object_condominium_id(name), 'documents.upload')
    )
    or (
      name like (public.storage_object_condominium_id(name)::text || '/packages/%')
      and public.has_permission(public.storage_object_condominium_id(name), 'packages.upload_photo')
    )
    or (
      name like (public.storage_object_condominium_id(name)::text || '/incidents/%')
      and public.has_permission(public.storage_object_condominium_id(name), 'incidents.create')
    )
  )
)
with check (
  bucket_id = 'morai-documents'
  and public.storage_object_condominium_id(name) is not null
  and (
    public.is_condo_admin(public.storage_object_condominium_id(name))
    or (
      name like (public.storage_object_condominium_id(name)::text || '/documents/%')
      and public.has_permission(public.storage_object_condominium_id(name), 'documents.upload')
    )
    or (
      name like (public.storage_object_condominium_id(name)::text || '/packages/%')
      and public.has_permission(public.storage_object_condominium_id(name), 'packages.upload_photo')
    )
    or (
      name like (public.storage_object_condominium_id(name)::text || '/incidents/%')
      and public.has_permission(public.storage_object_condominium_id(name), 'incidents.create')
    )
  )
);

create policy "morai storage delete scoped"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'morai-documents'
  and (
    public.is_condo_admin(public.storage_object_condominium_id(name))
    or (
      name like (public.storage_object_condominium_id(name)::text || '/documents/%')
      and public.has_permission(public.storage_object_condominium_id(name), 'documents.delete')
    )
    or (
      name like (public.storage_object_condominium_id(name)::text || '/packages/%')
      and public.has_permission(public.storage_object_condominium_id(name), 'packages.delete')
    )
  )
);
