-- Tighten read paths so admin and syndic depend on explicit permissions.

drop policy if exists "profiles read same condominium" on public.profiles;
create policy "profiles read authorized condominium"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.memberships viewer
    join public.memberships target
      on target.condominium_id = viewer.condominium_id
     and target.user_id = profiles.id
     and target.status = 'active'
    where viewer.user_id = auth.uid()
      and viewer.status = 'active'
      and (
        viewer.role = 'subscriber_admin'
        or public.has_permission(viewer.condominium_id, 'residents.view')
        or public.has_permission(viewer.condominium_id, 'syndic.view')
        or public.has_permission(viewer.condominium_id, 'settings.roles')
      )
  )
);

drop policy if exists "memberships read scoped" on public.memberships;
create policy "memberships read authorized"
on public.memberships for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'residents.view')
  or public.has_permission(condominium_id, 'syndic.view')
  or public.has_permission(condominium_id, 'settings.roles')
);

drop policy if exists "bookings read scoped" on public.bookings;
create policy "bookings read authorized"
on public.bookings for select
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'bookings.view_all')
  or public.has_permission(condominium_id, 'bookings.view')
  or user_id = auth.uid()
  or apartment_id in (select public.current_user_apartment_ids(condominium_id))
);

drop policy if exists "bookings create members" on public.bookings;
create policy "bookings create authorized"
on public.bookings for insert
to authenticated
with check (
  public.get_user_role(condominium_id) is not null
  and (
    public.is_subscriber_admin(condominium_id)
    or public.has_permission(condominium_id, 'bookings.create')
    or public.has_permission(condominium_id, 'bookings.approve')
    or user_id = auth.uid()
    or apartment_id in (select public.current_user_apartment_ids(condominium_id))
  )
);

drop policy if exists "tickets read scoped" on public.tickets;
create policy "tickets read authorized"
on public.tickets for select
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'tickets.view_all')
  or created_by = auth.uid()
  or apartment_id in (select public.current_user_apartment_ids(condominium_id))
);

drop policy if exists "packages read scoped" on public.packages;
create policy "packages read authorized"
on public.packages for select
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'packages.view_all')
  or apartment_id in (select public.current_user_apartment_ids(condominium_id))
);

drop policy if exists "documents read scoped" on public.documents;
create policy "documents read authorized"
on public.documents for select
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'documents.view')
  or (
    visibility in ('residents', 'public')
    and public.get_user_role(condominium_id) in ('resident', 'owner')
  )
  or (
    visibility = 'owners'
    and public.get_user_role(condominium_id) = 'owner'
  )
);

drop policy if exists "incidents read scoped" on public.incidents;
create policy "incidents read authorized"
on public.incidents for select
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'incidents.review')
  or created_by = auth.uid()
);

drop policy if exists "announcement reads own" on public.announcement_reads;
create policy "announcement reads authorized"
on public.announcement_reads for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.announcements a
    where a.id = announcement_reads.announcement_id
      and (
        public.is_subscriber_admin(a.condominium_id)
        or public.has_permission(a.condominium_id, 'announcements.view_reads')
      )
  )
);

drop policy if exists "morai documents read hardened" on storage.objects;
create policy "morai documents read hardened"
on storage.objects for select
to authenticated
using (
  bucket_id = 'morai-documents'
  and (
    public.is_subscriber_admin(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.view')
    or public.has_permission(public.storage_object_condominium_id(name), 'packages.view_all')
    or public.has_permission(public.storage_object_condominium_id(name), 'incidents.review')
    or exists (
      select 1
      from public.documents d
      where d.condominium_id = public.storage_object_condominium_id(name)
        and (d.file_url = name or d.file_url like '%' || name)
        and (
          (
            d.visibility in ('residents', 'public')
            and public.get_user_role(d.condominium_id) in ('resident', 'owner')
          )
          or (
            d.visibility = 'owners'
            and public.get_user_role(d.condominium_id) = 'owner'
          )
        )
    )
  )
);
