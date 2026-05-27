create or replace function public.get_invite_public(invite_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', i.id,
    'condominium_id', i.condominium_id,
    'condominium_name', c.name,
    'condominium_code', c.slug,
    'invite_type', i.invite_type,
    'role', i.role,
    'email', i.email,
    'status', i.status,
    'expires_at', i.expires_at,
    'valid', i.status = 'active' and i.used_at is null and (i.expires_at is null or i.expires_at > now())
  )
  from public.invites i
  join public.condominiums c on c.id = i.condominium_id
  where i.token = invite_token
  limit 1;
$$;

revoke all on function public.get_invite_public(text) from public;
grant execute on function public.get_invite_public(text) to anon, authenticated;
