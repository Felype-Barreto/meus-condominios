-- Condominium names are not unique. Keep the internal URL slug automatic and
-- collision-free without asking the user to rename their condominium.

create or replace function public.assign_unique_condominium_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text := public.slugify(coalesce(nullif(new.slug, ''), new.name));
  candidate text;
  suffix int := 1;
begin
  if base_slug = '' then
    base_slug := 'condominio';
  end if;

  -- Serialize equal bases so two same-name creations cannot pick the same slug.
  perform pg_advisory_xact_lock(hashtext('morai-condo-slug:' || base_slug));

  candidate := base_slug;
  while exists (
    select 1
    from public.condominiums c
    where c.slug = candidate
      and c.id is distinct from new.id
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists condominiums_assign_unique_slug on public.condominiums;
create trigger condominiums_assign_unique_slug
before insert on public.condominiums
for each row execute function public.assign_unique_condominium_slug();
