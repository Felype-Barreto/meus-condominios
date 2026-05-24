-- Remove older broad Storage policies and keep only path-scoped policies.

drop policy if exists "morai documents read hardened" on storage.objects;
drop policy if exists "morai documents upload hardened" on storage.objects;
drop policy if exists "morai documents update hardened" on storage.objects;
drop policy if exists "morai documents delete hardened" on storage.objects;
drop policy if exists "morai storage read scoped" on storage.objects;
drop policy if exists "morai storage insert scoped" on storage.objects;
drop policy if exists "morai storage update scoped" on storage.objects;
drop policy if exists "morai storage delete scoped" on storage.objects;

create policy "morai storage read scoped"
on storage.objects for select
to authenticated
using (
  bucket_id = 'morai-documents'
  and (
    public.is_condo_admin(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.view')
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
  and coalesce((public.can_upload_file(
    public.storage_object_condominium_id(name),
    coalesce((metadata->>'size')::bigint, 0)
  )->>'allowed')::boolean, false) = true
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
