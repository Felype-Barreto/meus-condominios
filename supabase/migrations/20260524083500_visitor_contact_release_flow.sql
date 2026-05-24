-- Let apartment responsibles approve or reject a public QR contact request.

alter table public.visitor_contact_requests
  add column if not exists contact_released_by uuid references public.profiles(id),
  add column if not exists contact_released_at timestamptz,
  add column if not exists contact_rejected_at timestamptz;

create or replace function public.notify_visitor_contact_responsibles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  visitor_label text;
begin
  visitor_label := coalesce(nullif(new.visitor_name, ''), 'Um visitante');

  perform public.notify_apartment_responsibles(
    new.condominium_id,
    new.apartment_id,
    'visitor_contact_request',
    'Visitante aguardando contato',
    visitor_label || ' aguarda você no portão. Acesse para decidir se libera o contato.',
    '/app/notificacoes?visitor_request_id=' || new.id
  );

  return new;
end;
$$;

create or replace function public.release_visitor_contact(
  request_id uuid,
  approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.visitor_contact_requests;
  can_answer boolean;
begin
  select *
    into request_row
  from public.visitor_contact_requests
  where id = request_id;

  if request_row.id is null then
    return jsonb_build_object('ok', false, 'message', 'Solicitacao nao encontrada.');
  end if;

  select exists (
    select 1
    from public.memberships m
    where m.condominium_id = request_row.condominium_id
      and m.apartment_id = request_row.apartment_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('resident', 'owner')
  )
    into can_answer;

  if not can_answer then
    return jsonb_build_object('ok', false, 'message', 'Sem permissao para responder esta solicitacao.');
  end if;

  update public.visitor_contact_requests
  set
    status = case when approve then 'contact_released' else 'rejected' end,
    contact_released_by = case when approve then auth.uid() else contact_released_by end,
    contact_released_at = case when approve then now() else contact_released_at end,
    contact_rejected_at = case when approve then contact_rejected_at else now() end
  where id = request_id;

  return jsonb_build_object(
    'ok', true,
    'message', case when approve then 'Contato liberado.' else 'Solicitacao recusada.' end
  );
end;
$$;

create or replace function public.get_public_contact_request_status(request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.visitor_contact_requests;
  phone text;
  resident_name text;
  can_redirect boolean;
begin
  select *
    into request_row
  from public.visitor_contact_requests
  where id = request_id;

  if request_row.id is null then
    return jsonb_build_object('found', false, 'status', 'not_found');
  end if;

  if request_row.status <> 'contact_released' or request_row.contact_released_by is null then
    return jsonb_build_object(
      'found', true,
      'status', request_row.status,
      'whatsapp_url', null
    );
  end if;

  select
    p.phone,
    p.full_name,
    coalesce((m.privacy_settings->>'allow_whatsapp_redirect')::boolean, false)
    into phone, resident_name, can_redirect
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.condominium_id = request_row.condominium_id
    and m.apartment_id = request_row.apartment_id
    and m.user_id = request_row.contact_released_by
    and m.status = 'active'
  limit 1;

  return jsonb_build_object(
    'found', true,
    'status', request_row.status,
    'resident_name', case when can_redirect then resident_name else null end,
    'whatsapp_url',
      case
        when can_redirect and nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') is not null
          then 'https://wa.me/55' || regexp_replace(phone, '\D', '', 'g')
        else null
      end
  );
end;
$$;

grant execute on function public.release_visitor_contact(uuid, boolean) to authenticated;
grant execute on function public.get_public_contact_request_status(uuid) to anon, authenticated;
