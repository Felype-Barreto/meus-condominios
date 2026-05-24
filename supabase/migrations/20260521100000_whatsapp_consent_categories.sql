alter table public.whatsapp_opt_ins
  add column if not exists categories jsonb not null default '{
    "general": false,
    "urgent_announcement": false,
    "package": false,
    "booking": false,
    "visitor_contact": false,
    "summary": false
  }'::jsonb;

alter table public.whatsapp_opt_ins
  add column if not exists consent_text_version text not null default 'whatsapp-consent-v1';

create index if not exists whatsapp_opt_ins_categories_idx
  on public.whatsapp_opt_ins using gin (categories);

create or replace function public.has_whatsapp_consent(
  condo_id uuid,
  target_user_id uuid,
  category text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.whatsapp_opt_ins opt
    where opt.condominium_id = condo_id
      and opt.user_id = target_user_id
      and opt.opted_in = true
      and length(regexp_replace(coalesce(opt.phone, ''), '\D', '', 'g')) between 10 and 13
      and lower(coalesce(opt.categories ->> category, 'false')) = 'true'
  );
$$;

create or replace function public.validate_whatsapp_opt_in(
  target_user_id uuid,
  condo_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_whatsapp_consent(condo_id, target_user_id, 'general');
$$;

grant execute on function public.has_whatsapp_consent(uuid, uuid, text) to authenticated;
grant execute on function public.has_whatsapp_consent(uuid, uuid, text) to service_role;
grant execute on function public.validate_whatsapp_opt_in(uuid, uuid) to authenticated;
grant execute on function public.validate_whatsapp_opt_in(uuid, uuid) to service_role;
