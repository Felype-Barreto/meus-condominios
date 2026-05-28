create or replace function public.get_public_qr_apartments(qr_public_code text)
returns table (
  block_name text,
  apartment_number text,
  search_value text,
  label text
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(b.name, 'Sem bloco') as block_name,
    a.number as apartment_number,
    trim(coalesce(b.name || ' ', '') || a.number) as search_value,
    trim(coalesce(b.name || ' - ', '') || a.number) as label
  from public.condominiums c
  join public.apartments a on a.condominium_id = c.id
  left join public.blocks b on b.id = a.block_id
  where c.public_code = qr_public_code
    and coalesce((c.settings->>'public_qr_enabled')::boolean, false) = true
    and exists (
      select 1
      from public.memberships m
      where m.condominium_id = c.id
        and m.apartment_id = a.id
        and m.status = 'active'
        and m.role in ('resident', 'owner', 'admin', 'syndic')
        and m.user_id is not null
    )
  order by coalesce(b.name, ''), a.number;
$$;

grant execute on function public.get_public_qr_apartments(text) to anon, authenticated;
