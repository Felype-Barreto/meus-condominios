alter table public.announcements
  add column if not exists starts_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz;

create index if not exists announcements_lifecycle_idx
on public.announcements (condominium_id, starts_at, expires_at, pinned, created_at);

create or replace function public.notify_announcement_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_row record;
begin
  if coalesce(new.starts_at, now()) > now()
    or (new.expires_at is not null and new.expires_at < now())
  then
    return new;
  end if;

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
