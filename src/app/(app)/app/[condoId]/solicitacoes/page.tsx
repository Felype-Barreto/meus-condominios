import { TicketForm } from "@/components/app/core-module-forms";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { getCondominiumAccess } from "@/lib/condominium-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEconomyPageSize } from "@/lib/economy-mode";
import { ClipboardList } from "lucide-react";

type TicketRow = {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  apartments?: { number: string | null; blocks?: { name: string | null } | null } | null;
};

export default async function TicketsPage({ params }: { params: Promise<{ condoId: string }> }) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const access = await getCondominiumAccess(condoId);
  const ticketsQuery = supabase
    .from("tickets")
    .select("id,category,title,description,priority,status,created_at,apartments(number,blocks(name))")
    .eq("condominium_id", condoId)
    .order("created_at", { ascending: false })
    .limit(getEconomyPageSize(60));
  const apartmentsQuery = supabase
    .from("apartments")
    .select("id,number,blocks(name)")
    .eq("condominium_id", condoId)
    .order("number")
    .limit(getEconomyPageSize(300));

  if (access.isResident) {
    ticketsQuery.eq("created_by", access.userId);
    if (access.apartmentId) apartmentsQuery.eq("id", access.apartmentId);
  }

  const [{ data: tickets }, { data: apartments }] = await Promise.all([
    ticketsQuery,
    apartmentsQuery,
  ]);
  const ticketRows = (tickets ?? []) as unknown as TicketRow[];
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">Atendimento</p><h1 className="mt-2 text-3xl font-semibold">Solicitações</h1></div>
      <TicketForm condoId={condoId} apartments={(apartments ?? []) as never} />
      {ticketRows.length ? <div className="space-y-4">{ticketRows.map((ticket) => (
        <Card key={ticket.id} className="p-5">
          <div className="flex flex-wrap gap-2"><StatusBadge>{ticket.category}</StatusBadge><StatusBadge tone={ticket.status === "open" ? "warning" : "neutral"}>{ticket.status}</StatusBadge><StatusBadge>{ticket.priority}</StatusBadge></div>
          <h2 className="mt-3 font-semibold">{ticket.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">{ticket.apartments?.blocks?.name} - {ticket.apartments?.number}</p>
        </Card>
      ))}</div> : <EmptyState icon={ClipboardList} title="Nenhuma solicitação" description="Solicitações respeitam permissões e escopo do usuário." />}
    </div>
  );
}
