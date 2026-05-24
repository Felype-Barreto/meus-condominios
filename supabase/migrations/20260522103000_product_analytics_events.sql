create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists product_events_condominium_id_idx on public.product_events(condominium_id);
create index if not exists product_events_user_id_idx on public.product_events(user_id);
create index if not exists product_events_event_name_idx on public.product_events(event_name);
create index if not exists product_events_entity_idx on public.product_events(entity_type, entity_id);
create index if not exists product_events_created_at_idx on public.product_events(created_at desc);

alter table public.product_events enable row level security;

drop policy if exists "product events read platform analytics" on public.product_events;
create policy "product events read platform analytics"
on public.product_events for select
to authenticated
using (
  public.get_platform_role() in ('platform_owner', 'platform_admin', 'platform_finance', 'platform_readonly')
);

drop policy if exists "product events insert platform or service" on public.product_events;
create policy "product events insert platform or service"
on public.product_events for insert
to authenticated
with check (
  public.is_platform_admin()
  or (
    condominium_id is not null
    and (
      public.is_subscriber_admin(condominium_id)
      or public.is_condo_admin(condominium_id)
      or public.is_condo_staff(condominium_id)
      or exists (
        select 1
        from public.memberships m
        where m.condominium_id = product_events.condominium_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
);

create or replace function public.safe_product_metadata(input jsonb default '{}')
returns jsonb
language sql
immutable
as $$
  select coalesce(input, '{}') - array[
    'body',
    'message',
    'phone',
    'email',
    'token',
    'access_token',
    'secret',
    'password',
    'authorization',
    'webhook_payload'
  ];
$$;

create or replace function public.track_product_event(
  event_name text,
  condominium_id uuid default null,
  user_id uuid default null,
  entity_type text default null,
  entity_id uuid default null,
  metadata jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.product_events (
    condominium_id,
    user_id,
    event_name,
    entity_type,
    entity_id,
    metadata
  )
  values (
    condominium_id,
    user_id,
    event_name,
    entity_type,
    entity_id,
    public.safe_product_metadata(metadata)
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.track_product_event_from_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  condo_id uuid;
  actor_id uuid;
  event text;
  meta jsonb := '{}';
begin
  if tg_table_name = 'condominiums' then
    condo_id := new.id;
    actor_id := new.owner_user_id;
    if tg_op = 'INSERT' then
      event := 'condo_created';
      meta := jsonb_build_object('plan', new.plan);
    elsif tg_op = 'UPDATE' and old.plan is distinct from new.plan and new.plan <> 'free' then
      event := 'subscription_started';
      meta := jsonb_build_object('old_plan', old.plan, 'new_plan', new.plan);
    elsif tg_op = 'UPDATE' and old.subscription_status is distinct from new.subscription_status and new.subscription_status = 'canceled' then
      event := 'subscription_canceled';
      meta := jsonb_build_object('plan', new.plan);
    end if;
  elsif tg_table_name = 'invites' then
    condo_id := new.condominium_id;
    actor_id := new.invited_by;
    if tg_op = 'INSERT' then
      event := case new.role
        when 'resident' then 'resident_invited'
        else 'invite_sent'
      end;
      meta := jsonb_build_object('role', new.role, 'invite_type', new.invite_type);
    elsif tg_op = 'UPDATE' and old.used_at is null and new.used_at is not null then
      event := 'invite_converted';
      actor_id := new.used_by;
      meta := jsonb_build_object('role', new.role, 'invite_type', new.invite_type);
    end if;
  elsif tg_table_name = 'memberships' then
    condo_id := new.condominium_id;
    actor_id := new.user_id;
    if tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'active' and new.role = 'resident' then
      event := 'resident_approved';
      meta := jsonb_build_object('role', new.role);
    end if;
  elsif tg_table_name = 'announcements' then
    condo_id := new.condominium_id;
    actor_id := new.created_by;
    event := 'announcement_created';
    meta := jsonb_build_object('urgent', new.urgent, 'target_type', new.target_type);
  elsif tg_table_name = 'bookings' then
    condo_id := new.condominium_id;
    actor_id := new.user_id;
    event := 'booking_created';
    meta := jsonb_build_object('status', new.status);
  elsif tg_table_name = 'packages' then
    condo_id := new.condominium_id;
    actor_id := new.registered_by;
    event := 'package_created';
    meta := jsonb_build_object('status', new.status);
  elsif tg_table_name = 'tickets' then
    condo_id := new.condominium_id;
    actor_id := new.created_by;
    if tg_op = 'INSERT' then
      event := 'ticket_created';
      meta := jsonb_build_object('category', new.category, 'priority', new.priority);
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status in ('resolved', 'closed') then
      event := 'ticket_resolved';
      meta := jsonb_build_object('category', new.category);
    end if;
  elsif tg_table_name = 'qr_public_access_logs' then
    condo_id := new.condominium_id;
    event := 'qr_public_accessed';
    meta := jsonb_build_object('result_type', new.result_type, 'blocked', new.blocked);
  elsif tg_table_name = 'whatsapp_message_logs' then
    condo_id := new.condominium_id;
    actor_id := new.user_id;
    if new.status in ('sent', 'queued', 'delivered') then
      event := 'whatsapp_auto_sent';
    elsif new.status = 'manual' then
      event := 'whatsapp_share_clicked';
    end if;
    meta := jsonb_build_object('target_type', new.target_type, 'message_type', new.message_type, 'status', new.status);
  elsif tg_table_name = 'communication_channels' then
    condo_id := new.condominium_id;
    event := 'communication_channel_created';
    meta := jsonb_build_object('type', new.type, 'scope', new.scope);
  elsif tg_table_name = 'communication_dispatches' then
    condo_id := new.condominium_id;
    actor_id := new.created_by;
    if new.status = 'sent' then
      event := 'communication_dispatch_sent';
    else
      event := 'communication_dispatch_created';
    end if;
    meta := jsonb_build_object('message_type', new.message_type, 'priority', new.priority, 'status', new.status);
  elsif tg_table_name = 'refund_requests' then
    condo_id := new.condominium_id;
    actor_id := new.requested_by;
    event := 'refund_requested';
    meta := jsonb_build_object('status', new.status);
  elsif tg_table_name = 'support_tickets' then
    condo_id := new.condominium_id;
    actor_id := new.user_id;
    event := 'support_ticket_created';
    meta := jsonb_build_object('category', new.category, 'priority', new.priority);
  end if;

  if event is not null then
    perform public.track_product_event(
      event,
      condo_id,
      actor_id,
      tg_table_name,
      new.id,
      meta
    );
  end if;

  return new;
end;
$$;

drop trigger if exists product_events_condominiums on public.condominiums;
create trigger product_events_condominiums
after insert or update on public.condominiums
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_invites on public.invites;
create trigger product_events_invites
after insert or update on public.invites
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_memberships on public.memberships;
create trigger product_events_memberships
after update on public.memberships
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_announcements on public.announcements;
create trigger product_events_announcements
after insert on public.announcements
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_bookings on public.bookings;
create trigger product_events_bookings
after insert on public.bookings
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_packages on public.packages;
create trigger product_events_packages
after insert on public.packages
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_tickets on public.tickets;
create trigger product_events_tickets
after insert or update on public.tickets
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_qr_public_access_logs on public.qr_public_access_logs;
create trigger product_events_qr_public_access_logs
after insert on public.qr_public_access_logs
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_whatsapp_message_logs on public.whatsapp_message_logs;
create trigger product_events_whatsapp_message_logs
after insert on public.whatsapp_message_logs
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_communication_channels on public.communication_channels;
create trigger product_events_communication_channels
after insert on public.communication_channels
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_communication_dispatches on public.communication_dispatches;
create trigger product_events_communication_dispatches
after insert on public.communication_dispatches
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_refund_requests on public.refund_requests;
create trigger product_events_refund_requests
after insert on public.refund_requests
for each row execute function public.track_product_event_from_row();

drop trigger if exists product_events_support_tickets on public.support_tickets;
create trigger product_events_support_tickets
after insert on public.support_tickets
for each row execute function public.track_product_event_from_row();
