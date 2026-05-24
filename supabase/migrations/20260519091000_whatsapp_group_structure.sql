alter table public.whatsapp_groups
  add column if not exists allowed_message_types text[] not null default array[
    'urgent_announcements',
    'daily_summary',
    'weekly_summary',
    'maintenance',
    'meetings'
  ]::text[];

create index if not exists whatsapp_groups_allowed_message_types_idx
on public.whatsapp_groups using gin (allowed_message_types);
