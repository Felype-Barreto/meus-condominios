-- Make the bell useful: create account notifications for common operational events.

create or replace function public.notify_condominium_admins(
  condo_id uuid,
  notification_type text,
  notification_title text,
  notification_body text,
  notification_href text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    condominium_id,
    user_id,
    type,
    title,
    body,
    href
  )
  select
    condo_id,
    m.user_id,
    notification_type,
    notification_title,
    notification_body,
    notification_href
  from public.memberships m
  where m.condominium_id = condo_id
    and m.status = 'active'
    and m.role in ('subscriber_admin', 'admin', 'syndic')
    and m.user_id is not null
  on conflict do nothing;
end;
$$;

create or replace function public.notify_membership_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and new.role in ('resident', 'owner') then
    perform public.notify_condominium_admins(
      new.condominium_id,
      'membership_pending',
      'Novo cadastro aguardando aprovacao',
      'Um morador ou proprietario enviou cadastro para analise.',
      '/app/' || new.condominium_id || '/moradores'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists memberships_notify_pending on public.memberships;
create trigger memberships_notify_pending
after insert on public.memberships
for each row execute function public.notify_membership_pending();

create or replace function public.notify_booking_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    perform public.notify_condominium_admins(
      new.condominium_id,
      'booking_pending',
      'Reserva aguardando aprovacao',
      coalesce(new.title, 'Uma reserva precisa ser analisada.'),
      '/app/' || new.condominium_id || '/agendamentos'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_notify_pending on public.bookings;
create trigger bookings_notify_pending
after insert on public.bookings
for each row execute function public.notify_booking_pending();

create or replace function public.notify_package_waiting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'waiting' then
    perform public.notify_condominium_admins(
      new.condominium_id,
      'package_waiting',
      'Nova encomenda na portaria',
      coalesce(new.recipient_name, 'Uma encomenda foi registrada.'),
      '/app/' || new.condominium_id || '/encomendas'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists packages_notify_waiting on public.packages;
create trigger packages_notify_waiting
after insert on public.packages
for each row execute function public.notify_package_waiting();

create or replace function public.notify_ticket_urgent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.priority = 'urgent' and new.status <> 'closed' then
    perform public.notify_condominium_admins(
      new.condominium_id,
      'ticket_urgent',
      'Solicitacao urgente',
      coalesce(new.title, 'Uma solicitacao urgente foi aberta.'),
      '/app/' || new.condominium_id || '/solicitacoes'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_notify_urgent on public.tickets;
create trigger tickets_notify_urgent
after insert on public.tickets
for each row execute function public.notify_ticket_urgent();

grant execute on function public.notify_condominium_admins(uuid, text, text, text, text) to authenticated;
