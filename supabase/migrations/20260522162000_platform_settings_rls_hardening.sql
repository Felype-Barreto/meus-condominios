drop policy if exists "platform settings read admins" on public.platform_settings;
create policy "platform settings read platform roles"
on public.platform_settings for select
to authenticated
using (
  public.get_platform_role() in (
    'platform_owner',
    'platform_admin',
    'platform_support',
    'platform_finance',
    'platform_security',
    'platform_readonly'
  )
);

drop policy if exists "platform settings manage owner admin" on public.platform_settings;
drop policy if exists "platform settings insert scoped" on public.platform_settings;
create policy "platform settings insert scoped"
on public.platform_settings for insert
to authenticated
with check (
  public.get_platform_role() = 'platform_owner'
  or (
    public.get_platform_role() = 'platform_admin'
    and key in ('support', 'legal')
  )
);

drop policy if exists "platform settings update scoped" on public.platform_settings;
create policy "platform settings update scoped"
on public.platform_settings for update
to authenticated
using (
  public.get_platform_role() = 'platform_owner'
  or (
    public.get_platform_role() = 'platform_admin'
    and key in ('support', 'legal')
  )
)
with check (
  public.get_platform_role() = 'platform_owner'
  or (
    public.get_platform_role() = 'platform_admin'
    and key in ('support', 'legal')
  )
);

drop policy if exists "platform settings delete owner only" on public.platform_settings;
create policy "platform settings delete owner only"
on public.platform_settings for delete
to authenticated
using (public.get_platform_role() = 'platform_owner');
