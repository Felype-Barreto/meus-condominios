create or replace function public.notify_ticket_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'closed' then
    perform public.notify_condominium_admins(
      new.condominium_id,
      case when new.priority = 'urgent' then 'ticket_urgent' else 'ticket_created' end,
      case when new.priority = 'urgent' then 'Solicitacao urgente' else 'Nova solicitacao' end,
      coalesce(new.title, 'Uma solicitacao foi aberta.'),
      '/app/' || new.condominium_id || '/solicitacoes'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_notify_urgent on public.tickets;
drop trigger if exists tickets_notify_created on public.tickets;
create trigger tickets_notify_created
after insert on public.tickets
for each row execute function public.notify_ticket_created();
