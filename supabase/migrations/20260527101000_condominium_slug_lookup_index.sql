create unique index if not exists condominiums_slug_lower_uidx
on public.condominiums (lower(slug));
