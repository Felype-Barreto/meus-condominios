-- Security hardening after full audit:
-- - subscriber_admin remains the only unlimited role
-- - admin/syndic/doorman capabilities come from permissions
-- - doorman cannot inherit broad staff visibility
-- - plan limits are enforced on direct table writes where possible
-- - storage policies validate path, permission and plan storage budget

create or replace function public.is_condo_admin(condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.condominium_id = condo_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'subscriber_admin'
  );
$$;

create or replace function public.is_condo_staff(condo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.condominium_id = condo_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('subscriber_admin', 'admin', 'syndic')
  );
$$;

create or replace function public.current_user_is_condo_role(condo_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.condominium_id = condo_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;

create or replace function public.enforce_membership_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_condo uuid := coalesce(new.condominium_id, old.condominium_id);
  limit_result jsonb;
  active_subscriber_count int;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.role = 'subscriber_admin' then
    if not public.is_subscriber_admin(old.condominium_id) then
      raise exception 'Somente o assinante principal pode alterar outro assinante principal.';
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.role = 'subscriber_admin' then
    select count(*)
    into active_subscriber_count
    from public.memberships m
    where m.condominium_id = old.condominium_id
      and m.role = 'subscriber_admin'
      and m.status = 'active'
      and (tg_op = 'DELETE' or m.id <> old.id);

    if (tg_op = 'DELETE' or new.role <> 'subscriber_admin' or new.status <> 'active')
      and active_subscriber_count = 0 then
      raise exception 'O condomínio precisa manter ao menos um assinante principal ativo.';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE')
    and new.status in ('active', 'pending')
    and (tg_op = 'INSERT' or new.role is distinct from old.role or new.status is distinct from old.status)
  then
    if new.role = 'admin' then
      limit_result := public.can_invite_admin(target_condo);
    elsif new.role = 'syndic' or new.is_primary_syndic = true then
      limit_result := public.can_invite_syndic(target_condo);
    elsif new.role = 'doorman' then
      limit_result := public.can_invite_doorman(target_condo);
    end if;

    if limit_result is not null and coalesce((limit_result->>'allowed')::boolean, false) = false then
      raise exception 'Limite do plano atingido para %.', limit_result->>'key';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists memberships_enforce_security on public.memberships;
create trigger memberships_enforce_security
before insert or update or delete on public.memberships
for each row execute function public.enforce_membership_security();

create or replace function public.enforce_structure_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_result jsonb;
begin
  if tg_table_name = 'blocks' then
    limit_result := public.can_create_block(new.condominium_id);
  elsif tg_table_name = 'apartments' then
    if new.block_id is not null and not exists (
      select 1 from public.blocks b
      where b.id = new.block_id and b.condominium_id = new.condominium_id
    ) then
      raise exception 'Bloco inválido para este condomínio.';
    end if;
    limit_result := public.can_create_apartment(new.condominium_id, new.block_id);
  end if;

  if limit_result is not null and coalesce((limit_result->>'allowed')::boolean, false) = false then
    raise exception 'Limite do plano atingido para %.', limit_result->>'key';
  end if;

  return new;
end;
$$;

drop trigger if exists blocks_enforce_plan_limit on public.blocks;
create trigger blocks_enforce_plan_limit
before insert on public.blocks
for each row execute function public.enforce_structure_plan_limits();

drop trigger if exists apartments_enforce_plan_limit on public.apartments;
create trigger apartments_enforce_plan_limit
before insert on public.apartments
for each row execute function public.enforce_structure_plan_limits();

drop policy if exists "blocks manage staff" on public.blocks;
create policy "blocks manage authorized"
on public.blocks for all
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'settings.edit')
  or public.has_permission(condominium_id, 'apartments.create')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'settings.edit')
  or public.has_permission(condominium_id, 'apartments.create')
);

drop policy if exists "apartments manage admins" on public.apartments;
create policy "apartments create authorized"
on public.apartments for insert
to authenticated
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'apartments.create')
);

create policy "apartments update authorized"
on public.apartments for update
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'apartments.edit')
  or public.has_permission(condominium_id, 'apartments.private_notes')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'apartments.edit')
  or public.has_permission(condominium_id, 'apartments.private_notes')
);

create policy "apartments delete authorized"
on public.apartments for delete
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'apartments.delete')
);

drop policy if exists "memberships manage admins" on public.memberships;
create policy "memberships manage privileged"
on public.memberships for all
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'settings.roles')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'settings.roles')
);

drop policy if exists "syndic profiles manage admins" on public.syndic_profiles;
create policy "syndic profiles manage authorized"
on public.syndic_profiles for all
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'syndic.change')
  or public.has_permission(condominium_id, 'syndic.invite')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'syndic.change')
  or public.has_permission(condominium_id, 'syndic.invite')
);

drop policy if exists "invites manage admins" on public.invites;
create policy "invites manage authorized"
on public.invites for all
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'settings.roles')
  or public.has_permission(condominium_id, 'residents.invite')
  or public.has_permission(condominium_id, 'syndic.invite')
  or public.has_permission(condominium_id, 'gate.view_panel')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'settings.roles')
  or public.has_permission(condominium_id, 'residents.invite')
  or public.has_permission(condominium_id, 'syndic.invite')
  or public.has_permission(condominium_id, 'gate.view_panel')
);

drop policy if exists "common areas manage admins" on public.common_areas;
drop policy if exists "common areas create granular" on public.common_areas;
drop policy if exists "common areas update granular" on public.common_areas;
create policy "common areas create authorized"
on public.common_areas for insert
to authenticated
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'common_areas.create')
);

create policy "common areas update authorized"
on public.common_areas for update
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'common_areas.edit')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'common_areas.edit')
);

create policy "common areas delete authorized"
on public.common_areas for delete
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'common_areas.delete')
);

drop policy if exists "bookings update scoped" on public.bookings;
drop policy if exists "bookings approve granular" on public.bookings;
create policy "bookings update authorized"
on public.bookings for update
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'bookings.approve')
  or public.has_permission(condominium_id, 'bookings.cancel_any')
  or (user_id = auth.uid() and public.has_permission(condominium_id, 'bookings.cancel_own'))
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'bookings.approve')
  or public.has_permission(condominium_id, 'bookings.cancel_any')
  or (user_id = auth.uid() and public.has_permission(condominium_id, 'bookings.cancel_own'))
);

drop policy if exists "tickets manage staff" on public.tickets;
create policy "tickets update authorized"
on public.tickets for update
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'tickets.reply')
  or public.has_permission(condominium_id, 'tickets.assign')
  or public.has_permission(condominium_id, 'tickets.change_status')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'tickets.reply')
  or public.has_permission(condominium_id, 'tickets.assign')
  or public.has_permission(condominium_id, 'tickets.change_status')
);

drop policy if exists "announcements manage staff" on public.announcements;
create policy "announcements create authorized"
on public.announcements for insert
to authenticated
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'announcements.create')
);

create policy "announcements update authorized"
on public.announcements for update
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'announcements.edit')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'announcements.edit')
);

create policy "announcements delete authorized"
on public.announcements for delete
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'announcements.delete')
);

drop policy if exists "packages manage gatehouse" on public.packages;
drop policy if exists "packages create granular" on public.packages;
drop policy if exists "packages update pickup granular" on public.packages;
create policy "packages create authorized"
on public.packages for insert
to authenticated
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'packages.create')
  or public.has_permission(condominium_id, 'gate.register_package')
);

create policy "packages update authorized"
on public.packages for update
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'packages.edit')
  or public.has_permission(condominium_id, 'packages.mark_picked_up')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'packages.edit')
  or public.has_permission(condominium_id, 'packages.mark_picked_up')
);

create policy "packages delete authorized"
on public.packages for delete
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'packages.delete')
);

drop policy if exists "documents manage staff" on public.documents;
create policy "documents create authorized"
on public.documents for insert
to authenticated
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'documents.upload')
);

create policy "documents update authorized"
on public.documents for update
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'documents.upload')
  or public.has_permission(condominium_id, 'documents.admin_only')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'documents.upload')
  or public.has_permission(condominium_id, 'documents.admin_only')
);

create policy "documents delete authorized"
on public.documents for delete
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'documents.delete')
);

drop policy if exists "incidents manage staff" on public.incidents;
create policy "incidents update authorized"
on public.incidents for update
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'incidents.review')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'incidents.review')
);

drop policy if exists "visitor requests read gatehouse" on public.visitor_contact_requests;
create policy "visitor requests read authorized"
on public.visitor_contact_requests for select
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'gate.register_visitor')
  or public.has_permission(condominium_id, 'public_qr.view_logs')
);

drop policy if exists "visitor requests manage gatehouse" on public.visitor_contact_requests;
create policy "visitor requests update authorized"
on public.visitor_contact_requests for update
to authenticated
using (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'gate.register_visitor')
)
with check (
  public.is_subscriber_admin(condominium_id)
  or public.has_permission(condominium_id, 'gate.register_visitor')
);

drop policy if exists "morai documents read scoped" on storage.objects;
drop policy if exists "morai documents upload staff" on storage.objects;
drop policy if exists "morai documents update staff" on storage.objects;
drop policy if exists "morai documents delete admins" on storage.objects;

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
        and d.visibility in ('residents', 'all')
        and public.get_user_role(d.condominium_id) in ('resident', 'owner')
    )
  )
);

create policy "morai documents upload hardened"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'morai-documents'
  and coalesce((public.can_upload_file(
    public.storage_object_condominium_id(name),
    coalesce((metadata->>'size')::bigint, 0)
  )->>'allowed')::boolean, false) = true
  and (
    public.is_subscriber_admin(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.upload')
    or public.has_permission(public.storage_object_condominium_id(name), 'packages.upload_photo')
    or public.has_permission(public.storage_object_condominium_id(name), 'incidents.create')
  )
);

create policy "morai documents update hardened"
on storage.objects for update
to authenticated
using (
  bucket_id = 'morai-documents'
  and (
    public.is_subscriber_admin(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.upload')
  )
)
with check (
  bucket_id = 'morai-documents'
  and (
    public.is_subscriber_admin(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.upload')
  )
);

create policy "morai documents delete hardened"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'morai-documents'
  and (
    public.is_subscriber_admin(public.storage_object_condominium_id(name))
    or public.has_permission(public.storage_object_condominium_id(name), 'documents.delete')
  )
);
