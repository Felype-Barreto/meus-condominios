-- Supabase Storage bucket and policies for condominium documents.
-- Object paths should start with the condominium UUID:
--   <condominium_id>/documents/<file-name>
--   <condominium_id>/packages/<file-name>
--   <condominium_id>/incidents/<file-name>

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'morai-documents',
  'morai-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_object_condominium_id(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create policy "morai documents read scoped"
on storage.objects for select
to authenticated
using (
  bucket_id = 'morai-documents'
  and (
    public.is_condo_staff(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.view')
    or public.get_user_role(public.storage_object_condominium_id(name)) in ('resident', 'owner')
  )
);

create policy "morai documents upload staff"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'morai-documents'
  and (
    public.is_condo_staff(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.manage')
    or public.has_permission(public.storage_object_condominium_id(name), 'packages.manage')
    or public.has_permission(public.storage_object_condominium_id(name), 'incidents.manage')
  )
);

create policy "morai documents update staff"
on storage.objects for update
to authenticated
using (
  bucket_id = 'morai-documents'
  and (
    public.is_condo_staff(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.manage')
  )
)
with check (
  bucket_id = 'morai-documents'
  and (
    public.is_condo_staff(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.manage')
  )
);

create policy "morai documents delete admins"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'morai-documents'
  and (
    public.is_condo_admin(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.delete')
  )
);
