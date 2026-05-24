-- Important query indexes for tenant scoping, membership lookups, status filters and public codes.

create index profiles_email_idx on public.profiles (email);
create index profiles_created_at_idx on public.profiles (created_at);

create index condominiums_slug_idx on public.condominiums (slug);
create index condominiums_public_code_idx on public.condominiums (public_code);
create index condominiums_invite_code_idx on public.condominiums (invite_code);
create index condominiums_owner_user_id_idx on public.condominiums (owner_user_id);
create index condominiums_created_at_idx on public.condominiums (created_at);

create index blocks_condominium_id_idx on public.blocks (condominium_id);
create index blocks_created_at_idx on public.blocks (created_at);

create index apartments_condominium_id_idx on public.apartments (condominium_id);
create index apartments_block_id_idx on public.apartments (block_id);
create index apartments_status_idx on public.apartments (status);
create index apartments_created_at_idx on public.apartments (created_at);

create index memberships_condominium_id_idx on public.memberships (condominium_id);
create index memberships_apartment_id_idx on public.memberships (apartment_id);
create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_role_idx on public.memberships (role);
create index memberships_status_idx on public.memberships (status);
create index memberships_created_at_idx on public.memberships (created_at);
create index memberships_user_condo_status_idx on public.memberships (user_id, condominium_id, status);

create index syndic_profiles_condominium_id_idx on public.syndic_profiles (condominium_id);
create index syndic_profiles_membership_id_idx on public.syndic_profiles (membership_id);
create index syndic_profiles_status_idx on public.syndic_profiles (status);
create index syndic_profiles_created_at_idx on public.syndic_profiles (created_at);

create index invites_condominium_id_idx on public.invites (condominium_id);
create index invites_invited_by_idx on public.invites (invited_by);
create index invites_token_idx on public.invites (token);
create index invites_role_idx on public.invites (role);
create index invites_status_idx on public.invites (status);
create index invites_apartment_id_idx on public.invites (apartment_id);
create index invites_created_at_idx on public.invites (created_at);

create index common_areas_condominium_id_idx on public.common_areas (condominium_id);
create index common_areas_active_idx on public.common_areas (active);
create index common_areas_created_at_idx on public.common_areas (created_at);

create index bookings_condominium_id_idx on public.bookings (condominium_id);
create index bookings_common_area_id_idx on public.bookings (common_area_id);
create index bookings_apartment_id_idx on public.bookings (apartment_id);
create index bookings_user_id_idx on public.bookings (user_id);
create index bookings_status_idx on public.bookings (status);
create index bookings_created_at_idx on public.bookings (created_at);
create index bookings_start_at_idx on public.bookings (start_at);

create index tickets_condominium_id_idx on public.tickets (condominium_id);
create index tickets_apartment_id_idx on public.tickets (apartment_id);
create index tickets_created_by_idx on public.tickets (created_by);
create index tickets_assigned_to_idx on public.tickets (assigned_to);
create index tickets_status_idx on public.tickets (status);
create index tickets_created_at_idx on public.tickets (created_at);

create index announcements_condominium_id_idx on public.announcements (condominium_id);
create index announcements_created_by_idx on public.announcements (created_by);
create index announcements_created_at_idx on public.announcements (created_at);
create index announcements_target_type_idx on public.announcements (target_type);

create index announcement_reads_user_id_idx on public.announcement_reads (user_id);
create index announcement_reads_read_at_idx on public.announcement_reads (read_at);

create index packages_condominium_id_idx on public.packages (condominium_id);
create index packages_apartment_id_idx on public.packages (apartment_id);
create index packages_registered_by_idx on public.packages (registered_by);
create index packages_status_idx on public.packages (status);
create index packages_created_at_idx on public.packages (created_at);

create index documents_condominium_id_idx on public.documents (condominium_id);
create index documents_uploaded_by_idx on public.documents (uploaded_by);
create index documents_created_at_idx on public.documents (created_at);
create index documents_visibility_idx on public.documents (visibility);

create index incidents_condominium_id_idx on public.incidents (condominium_id);
create index incidents_apartment_id_idx on public.incidents (apartment_id);
create index incidents_created_by_idx on public.incidents (created_by);
create index incidents_status_idx on public.incidents (status);
create index incidents_created_at_idx on public.incidents (created_at);

create index visitor_contact_requests_condominium_id_idx on public.visitor_contact_requests (condominium_id);
create index visitor_contact_requests_apartment_id_idx on public.visitor_contact_requests (apartment_id);
create index visitor_contact_requests_status_idx on public.visitor_contact_requests (status);
create index visitor_contact_requests_created_at_idx on public.visitor_contact_requests (created_at);

create index audit_logs_condominium_id_idx on public.audit_logs (condominium_id);
create index audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index audit_logs_action_idx on public.audit_logs (action);
create index audit_logs_entity_type_idx on public.audit_logs (entity_type);
create index audit_logs_entity_id_idx on public.audit_logs (entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at);

create index plan_limits_created_at_idx on public.plan_limits (created_at);
