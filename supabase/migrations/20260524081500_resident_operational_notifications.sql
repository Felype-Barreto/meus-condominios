-- Send operational notifications to apartment responsible residents and
-- prevent more than two active/pending responsible memberships per apartment.

create or replace function public.notify_user_account(
  condo_id uuid,
  target_user_id uuid,
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
  if target_user_id is null then
    return;
  end if;

  insert into public.notifications (
    condominium_id,
    user_id,
    type,
    title,
    body,
    href
  )
  values (
    condo_id,
    target_user_id,
    notification_type,
    notification_title,
    notification_body,
    notification_href
  );
end;
$$;

create or replace function public.notify_apartment_responsibles(
  condo_id uuid,
  apt_id uuid,
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
declare
  member_row record;
begin
  if apt_id is null then
    return;
  end if;

  for member_row in
    select m.user_id
    from public.memberships m
    where m.condominium_id = condo_id
      and m.apartment_id = apt_id
      and m.status = 'active'
      and m.role in ('resident', 'owner')
      and m.user_id is not null
    group by m.user_id
    order by min(m.created_at) asc
    limit 2
  loop
    perform public.notify_user_account(
      condo_id,
      member_row.user_id,
      notification_type,
      notification_title,
      notification_body,
      notification_href
    );
  end loop;
end;
$$;

create or replace function public.enforce_apartment_responsible_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  if new.apartment_id is null
    or new.role not in ('resident', 'owner')
    or new.status not in ('active', 'pending')
  then
    return new;
  end if;

  select count(*)
    into current_count
  from public.memberships m
  where m.condominium_id = new.condominium_id
    and m.apartment_id = new.apartment_id
    and m.role in ('resident', 'owner')
    and m.status in ('active', 'pending')
    and m.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if current_count >= 2 then
    raise exception 'Este apartamento ja possui 2 responsaveis vinculados.';
  end if;

  return new;
end;
$$;

drop trigger if exists memberships_responsible_limit on public.memberships;
create trigger memberships_responsible_limit
before insert or update of apartment_id, role, status on public.memberships
for each row execute function public.enforce_apartment_responsible_limit();

create or replace function public.notify_package_apartment_responsibles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'waiting' then
    perform public.notify_apartment_responsibles(
      new.condominium_id,
      new.apartment_id,
      'package_waiting_resident',
      'Encomenda aguardando retirada',
      coalesce(new.description, new.recipient_name, 'Uma encomenda foi registrada para seu apartamento.'),
      '/app/' || new.condominium_id || '/encomendas'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists packages_notify_apartment_responsibles on public.packages;
create trigger packages_notify_apartment_responsibles
after insert on public.packages
for each row execute function public.notify_package_apartment_responsibles();

create or replace function public.notify_booking_status_to_resident()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  title_text text;
begin
  if old.status is not distinct from new.status
    or new.status not in ('approved', 'rejected', 'canceled')
  then
    return new;
  end if;

  title_text := case new.status
    when 'approved' then 'Agendamento aprovado'
    when 'rejected' then 'Agendamento recusado'
    else 'Agendamento cancelado'
  end;

  perform public.notify_user_account(
    new.condominium_id,
    new.user_id,
    'booking_' || new.status,
    title_text,
    coalesce(new.title, 'Confira os detalhes do seu agendamento.'),
    '/app/' || new.condominium_id || '/agendamentos'
  );

  return new;
end;
$$;

drop trigger if exists bookings_notify_status_to_resident on public.bookings;
create trigger bookings_notify_status_to_resident
after update of status on public.bookings
for each row execute function public.notify_booking_status_to_resident();

create or replace function public.notify_visitor_contact_responsibles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  visitor_label text;
begin
  visitor_label := coalesce(nullif(new.visitor_name, ''), 'Um visitante');

  perform public.notify_apartment_responsibles(
    new.condominium_id,
    new.apartment_id,
    'visitor_contact_request',
    'Visitante aguardando contato',
    visitor_label || ' aguarda você no portão. Acesse para decidir se libera o contato.',
    '/app/notificacoes'
  );

  return new;
end;
$$;

drop trigger if exists visitor_contact_notify_responsibles on public.visitor_contact_requests;
create trigger visitor_contact_notify_responsibles
after insert on public.visitor_contact_requests
for each row execute function public.notify_visitor_contact_responsibles();

create or replace function public.notify_announcement_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_row record;
begin
  for recipient_row in
    select distinct user_id
    from public.match_dispatch_recipient_members(new.condominium_id, new.target_type, new.target_ids)
    where user_id is not null
  loop
    perform public.notify_user_account(
      new.condominium_id,
      recipient_row.user_id,
      'announcement',
      coalesce(new.title, 'Novo aviso'),
      left(coalesce(new.body, 'Um aviso foi publicado.'), 240),
      '/app/' || new.condominium_id || '/comunicados'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists announcements_notify_recipients on public.announcements;
create trigger announcements_notify_recipients
after insert on public.announcements
for each row execute function public.notify_announcement_recipients();

grant execute on function public.notify_user_account(uuid, uuid, text, text, text, text) to authenticated;
grant execute on function public.notify_apartment_responsibles(uuid, uuid, text, text, text, text) to authenticated;
