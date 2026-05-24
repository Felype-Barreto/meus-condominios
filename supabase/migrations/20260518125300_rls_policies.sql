-- Initial RLS policies. These are deliberately conservative and tenant-scoped.

alter table public.profiles enable row level security;
alter table public.condominiums enable row level security;
alter table public.blocks enable row level security;
alter table public.apartments enable row level security;
alter table public.memberships enable row level security;
alter table public.syndic_profiles enable row level security;
alter table public.invites enable row level security;
alter table public.common_areas enable row level security;
alter table public.bookings enable row level security;
alter table public.tickets enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;
alter table public.packages enable row level security;
alter table public.documents enable row level security;
alter table public.incidents enable row level security;
alter table public.visitor_contact_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.plan_limits enable row level security;

create policy "profiles read own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles read same condominium"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.condominium_id = mine.condominium_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = profiles.id
      and theirs.status = 'active'
  )
);

create policy "profiles update own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "condominiums read active members"
on public.condominiums for select
to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.condominium_id = condominiums.id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy "condominiums subscriber admin manage"
on public.condominiums for all
to authenticated
using (public.is_subscriber_admin(id))
with check (owner_user_id = auth.uid() or public.is_subscriber_admin(id));

create policy "blocks read members"
on public.blocks for select
to authenticated
using (public.get_user_role(condominium_id) is not null);

create policy "blocks manage staff"
on public.blocks for all
to authenticated
using (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'blocks.manage'))
with check (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'blocks.manage'));

create policy "apartments read scoped"
on public.apartments for select
to authenticated
using (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'apartments.view')
  or id in (select public.current_user_apartment_ids(condominium_id))
);

create policy "apartments manage admins"
on public.apartments for all
to authenticated
using (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'apartments.manage'))
with check (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'apartments.manage'));

create policy "memberships read scoped"
on public.memberships for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'memberships.view')
  or apartment_id in (select public.current_user_apartment_ids(condominium_id))
);

create policy "memberships manage admins"
on public.memberships for all
to authenticated
using (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'memberships.manage'))
with check (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'memberships.manage'));

create policy "syndic profiles read members"
on public.syndic_profiles for select
to authenticated
using (public.get_user_role(condominium_id) is not null);

create policy "syndic profiles manage admins"
on public.syndic_profiles for all
to authenticated
using (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'syndic.manage'))
with check (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'syndic.manage'));

create policy "invites read admins"
on public.invites for select
to authenticated
using (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'invites.manage'));

create policy "invites manage admins"
on public.invites for all
to authenticated
using (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'invites.manage'))
with check (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'invites.manage'));

create policy "common areas read members"
on public.common_areas for select
to authenticated
using (active = true and public.get_user_role(condominium_id) is not null);

create policy "common areas manage admins"
on public.common_areas for all
to authenticated
using (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'common_areas.manage'))
with check (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'common_areas.manage'));

create policy "bookings read scoped"
on public.bookings for select
to authenticated
using (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'bookings.view')
  or user_id = auth.uid()
  or apartment_id in (select public.current_user_apartment_ids(condominium_id))
);

create policy "bookings create members"
on public.bookings for insert
to authenticated
with check (
  public.get_user_role(condominium_id) is not null
  and (
    public.is_condo_staff(condominium_id)
    or user_id = auth.uid()
    or apartment_id in (select public.current_user_apartment_ids(condominium_id))
  )
);

create policy "bookings update scoped"
on public.bookings for update
to authenticated
using (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'bookings.manage')
  or user_id = auth.uid()
)
with check (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'bookings.manage')
  or user_id = auth.uid()
);

create policy "tickets read scoped"
on public.tickets for select
to authenticated
using (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'tickets.view')
  or created_by = auth.uid()
  or apartment_id in (select public.current_user_apartment_ids(condominium_id))
);

create policy "tickets create members"
on public.tickets for insert
to authenticated
with check (
  public.get_user_role(condominium_id) is not null
  and (created_by = auth.uid() or public.is_condo_staff(condominium_id))
);

create policy "tickets manage staff"
on public.tickets for update
to authenticated
using (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'tickets.manage')
  or created_by = auth.uid()
)
with check (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'tickets.manage')
  or created_by = auth.uid()
);

create policy "announcements read members"
on public.announcements for select
to authenticated
using (public.get_user_role(condominium_id) is not null);

create policy "announcements manage staff"
on public.announcements for all
to authenticated
using (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'announcements.manage'))
with check (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'announcements.manage'));

create policy "announcement reads own"
on public.announcement_reads for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.announcements a
    where a.id = announcement_reads.announcement_id
      and public.is_condo_admin(a.condominium_id)
  )
);

create policy "announcement reads mark own"
on public.announcement_reads for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.announcements a
    where a.id = announcement_reads.announcement_id
      and public.get_user_role(a.condominium_id) is not null
  )
);

create policy "packages read scoped"
on public.packages for select
to authenticated
using (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'packages.view')
  or apartment_id in (select public.current_user_apartment_ids(condominium_id))
);

create policy "packages manage gatehouse"
on public.packages for all
to authenticated
using (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'packages.manage')
  or public.has_permission(condominium_id, 'gatehouse.manage')
)
with check (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'packages.manage')
  or public.has_permission(condominium_id, 'gatehouse.manage')
);

create policy "documents read scoped"
on public.documents for select
to authenticated
using (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'documents.view')
  or (
    visibility in ('residents', 'all')
    and public.get_user_role(condominium_id) in ('resident', 'owner')
  )
);

create policy "documents manage staff"
on public.documents for all
to authenticated
using (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'documents.manage'))
with check (public.is_condo_admin(condominium_id) or public.has_permission(condominium_id, 'documents.manage'));

create policy "incidents read scoped"
on public.incidents for select
to authenticated
using (
  public.is_condo_staff(condominium_id)
  or public.has_permission(condominium_id, 'incidents.view')
  or created_by = auth.uid()
  or apartment_id in (select public.current_user_apartment_ids(condominium_id))
);

create policy "incidents create members"
on public.incidents for insert
to authenticated
with check (
  public.get_user_role(condominium_id) is not null
  and (created_by = auth.uid() or public.is_condo_staff(condominium_id))
);

create policy "incidents manage staff"
on public.incidents for update
to authenticated
using (public.is_condo_staff(condominium_id) or public.has_permission(condominium_id, 'incidents.manage'))
with check (public.is_condo_staff(condominium_id) or public.has_permission(condominium_id, 'incidents.manage'));

create policy "visitor requests create public"
on public.visitor_contact_requests for insert
to anon, authenticated
with check (status = 'created');

create policy "visitor requests read gatehouse"
on public.visitor_contact_requests for select
to authenticated
using (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'visitors.view')
  or public.has_permission(condominium_id, 'gatehouse.view')
);

create policy "visitor requests manage gatehouse"
on public.visitor_contact_requests for update
to authenticated
using (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'visitors.manage')
  or public.has_permission(condominium_id, 'gatehouse.manage')
)
with check (
  public.is_condo_admin(condominium_id)
  or public.has_permission(condominium_id, 'visitors.manage')
  or public.has_permission(condominium_id, 'gatehouse.manage')
);

create policy "audit logs read subscriber admin"
on public.audit_logs for select
to authenticated
using (public.is_subscriber_admin(condominium_id) or public.has_permission(condominium_id, 'audit_logs.view'));

create policy "plan limits read authenticated"
on public.plan_limits for select
to authenticated
using (true);

create policy "plan limits read anon"
on public.plan_limits for select
to anon
using (true);
