create or replace function public.validate_booking_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  area_record record;
  rules_record record;
  conflict_exists boolean;
  blocked_exists boolean;
  month_count int;
  duration_minutes int;
begin
  if new.status not in ('pending', 'approved') then
    return new;
  end if;

  select * into area_record
  from public.common_areas
  where id = new.common_area_id
    and condominium_id = new.condominium_id;

  if area_record.id is null then
    raise exception 'Area comum invalida.';
  end if;

  select * into rules_record
  from public.booking_rules
  where common_area_id = new.common_area_id;

  duration_minutes := extract(epoch from (new.end_at - new.start_at))::int / 60;

  if new.end_at <= new.start_at then
    raise exception 'Horario final deve ser maior que o inicial.';
  end if;

  if duration_minutes < coalesce(area_record.min_duration_minutes, 60) then
    raise exception 'Duracao da reserva fora das regras da area.';
  end if;

  if extract(dow from new.start_at)::int <> any(area_record.available_days) then
    raise exception 'Area indisponivel neste dia da semana.';
  end if;

  if new.start_at::time < area_record.available_start_time
    or new.end_at::time > area_record.available_end_time then
    raise exception 'Horario fora do funcionamento da area.';
  end if;

  if new.start_at < now() + make_interval(hours => coalesce(area_record.min_notice_hours, 24)) then
    raise exception 'Reserva fora da antecedencia minima.';
  end if;

  if new.start_at > now() + make_interval(days => coalesce(area_record.max_notice_days, 60)) then
    raise exception 'Reserva fora da antecedencia maxima.';
  end if;

  select exists (
    select 1
    from public.common_area_blocked_dates b
    where b.condominium_id = new.condominium_id
      and (b.common_area_id is null or b.common_area_id = new.common_area_id)
      and b.blocked_date = new.start_at::date
      and (
        b.full_day = true
        or (
          b.start_time is not null
          and b.end_time is not null
          and new.start_at::time < b.end_time
          and new.end_at::time > b.start_time
        )
      )
  ) into blocked_exists;

  if blocked_exists then
    raise exception 'Data bloqueada para esta area comum.';
  end if;

  if coalesce(rules_record.allow_overlapping, false) = false then
    select exists (
      select 1
      from public.bookings b
      where b.condominium_id = new.condominium_id
        and b.common_area_id = new.common_area_id
        and b.id <> coalesce(new.id, gen_random_uuid())
        and b.status in ('pending', 'approved')
        and new.start_at < b.end_at
        and new.end_at > b.start_at
    ) into conflict_exists;

    if conflict_exists then
      raise exception 'Ja existe reserva neste horario.';
    end if;
  end if;

  select count(*) into month_count
  from public.bookings b
  where b.condominium_id = new.condominium_id
    and b.common_area_id = new.common_area_id
    and b.apartment_id = new.apartment_id
    and b.status in ('pending', 'approved')
    and date_trunc('month', b.start_at) = date_trunc('month', new.start_at);

  if month_count >= coalesce(rules_record.max_bookings_per_apartment_month, area_record.max_bookings_per_apartment_month, 4) then
    raise exception 'Limite mensal de reservas por apartamento atingido.';
  end if;

  return new;
end;
$$;
