create or replace function public.resolve_condominium_login(condo_code text)
returns table (
  condominium_id uuid,
  condominium_name text,
  condominium_slug text,
  role text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as condominium_id,
    c.name as condominium_name,
    c.slug as condominium_slug,
    m.role,
    m.status
  from public.condominiums c
  join public.memberships m on m.condominium_id = c.id
  where lower(c.slug) = lower(trim(condo_code))
    and m.user_id = auth.uid()
    and m.status in ('active', 'pending')
  order by
    case m.status when 'active' then 1 else 2 end,
    case m.role
      when 'subscriber_admin' then 1
      when 'admin' then 2
      when 'syndic' then 3
      when 'doorman' then 4
      when 'owner' then 5
      when 'resident' then 6
      else 7
    end
  limit 1;
$$;

revoke all on function public.resolve_condominium_login(text) from public;
grant execute on function public.resolve_condominium_login(text) to authenticated;
