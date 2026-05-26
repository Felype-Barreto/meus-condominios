update public.condominiums
set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{public_qr_enabled}', 'true'::jsonb, true)
where coalesce((settings->>'public_qr_enabled')::boolean, false) = false;

create or replace function public.ensure_condominium_default_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.settings := coalesce(new.settings, '{}'::jsonb);

  if not (new.settings ? 'public_qr_enabled') then
    new.settings := new.settings || jsonb_build_object('public_qr_enabled', true);
  end if;

  if not (new.settings ? 'resident_auto_approve') then
    new.settings := new.settings || jsonb_build_object('resident_auto_approve', false);
  end if;

  return new;
end;
$$;

drop trigger if exists condominiums_default_settings on public.condominiums;
create trigger condominiums_default_settings
before insert on public.condominiums
for each row execute function public.ensure_condominium_default_settings();
