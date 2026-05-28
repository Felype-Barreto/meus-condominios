create or replace function public.has_permission(condo_id uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_subscriber_admin(condo_id)
    or exists (
      select 1
      from public.memberships m
      left join public.role_permissions rp
        on rp.condominium_id = m.condominium_id
       and rp.role = m.role
      where m.condominium_id = condo_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and case
          when m.permissions ? permission_key then coalesce((m.permissions->>permission_key)::boolean, false)
          when rp.permissions ? permission_key then coalesce((rp.permissions->>permission_key)::boolean, false)
          when m.role = 'admin' then permission_key = any(array[
            'apartments.view_grid',
            'apartments.view_details',
            'apartments.view_contacts',
            'apartments.edit',
            'apartments.create',
            'residents.view',
            'residents.approve',
            'residents.edit',
            'residents.invite',
            'residents.view_phone',
            'residents.view_email',
            'syndic.view',
            'syndic.invite',
            'syndic.view_history',
            'gate.view_panel',
            'announcements.view',
            'announcements.create',
            'announcements.edit',
            'announcements.send_to_all',
            'bookings.view',
            'bookings.approve',
            'bookings.cancel_any',
            'bookings.view_all',
            'common_areas.view',
            'common_areas.create',
            'common_areas.edit',
            'tickets.view_all',
            'tickets.reply',
            'tickets.assign',
            'tickets.change_status',
            'packages.view_all',
            'packages.create',
            'packages.edit',
            'packages.mark_picked_up',
            'documents.view',
            'documents.upload',
            'public_qr.manage',
            'settings.view',
            'settings.edit',
            'security.view_incidents',
            'security.manage_incidents',
            'audit_logs.view'
          ])
          when m.role = 'syndic' then permission_key = any(array[
            'apartments.view_grid',
            'apartments.view_details',
            'apartments.view_contacts',
            'residents.view',
            'residents.approve',
            'residents.invite',
            'announcements.view',
            'announcements.create',
            'announcements.send_to_all',
            'bookings.view_all',
            'bookings.approve',
            'tickets.view_all',
            'tickets.reply',
            'tickets.change_status',
            'packages.view_all',
            'documents.view',
            'incidents.create',
            'incidents.review',
            'settings.view'
          ])
          when m.role = 'doorman' then permission_key = any(array[
            'gate.view_panel',
            'gate.search_apartment_limited',
            'gate.register_package',
            'gate.register_visitor',
            'gate.create_incident',
            'gate.call_resident',
            'gate.view_resident_phone_masked',
            'packages.view_all',
            'packages.create',
            'packages.mark_picked_up',
            'packages.upload_photo'
          ])
          when m.role = 'resident' then permission_key = any(array[
            'announcements.view',
            'bookings.view',
            'bookings.create',
            'bookings.cancel_own',
            'common_areas.view',
            'tickets.view_own',
            'tickets.create',
            'packages.view_own',
            'documents.view'
          ])
          when m.role = 'owner' then permission_key = any(array[
            'announcements.view',
            'bookings.view',
            'common_areas.view',
            'tickets.view_own',
            'tickets.create',
            'packages.view_own',
            'documents.view'
          ])
          else false
        end
    ),
    false
  );
$$;
