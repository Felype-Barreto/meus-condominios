-- Keep long booking calendars economical: visible-window queries filter by tenant,
-- area/status and start/end overlap instead of reading a full year.
create index if not exists bookings_condominium_range_idx
  on public.bookings (condominium_id, start_at, end_at);

create index if not exists bookings_common_area_range_idx
  on public.bookings (common_area_id, start_at, end_at)
  where status in ('pending', 'approved');

create index if not exists common_area_blocked_dates_area_day_idx
  on public.common_area_blocked_dates (condominium_id, common_area_id, blocked_date);
