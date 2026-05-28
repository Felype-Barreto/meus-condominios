import Link from "next/link";
import { TicketForm } from "@/components/app/core-module-forms";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteTicketAction, updateTicketStatusAction } from "@/lib/actions/core-modules";
import { getCondominiumAccess } from "@/lib/condominium-access";
import { getEconomyPageSize } from "@/lib/economy-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClipboardList, Trash2 } from "lucide-react";

type TicketRow = {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  attachments: string[] | null;
  created_at: string;
  updated_at: string | null;
  created_by_profile?: { full_name: string | null; email: string | null } | null;
  apartments?: { number: string | null; blocks?: { name: string | null } | null } | null;
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: "Aberta",
    in_progress: "Em andamento",
    resolved: "Resolvida",
    closed: "Fechada",
  };
  return labels[status] ?? status;
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };
  return labels[priority] ?? priority;
}

async function signedAttachmentMap(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, rows: TicketRow[]) {
  const paths = Array.from(new Set(rows.flatMap((row) => row.attachments ?? []).filter(Boolean)));
  if (!paths.length) return new Map<string, string>();
  const { data } = await supabase.storage.from("morai-documents").createSignedUrls(paths, 60 * 30);
  return new Map((data ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
}

export default async function TicketsPage({ params }: { params: Promise<{ condoId: string }> }) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const access = await getCondominiumAccess(condoId);
  const ticketsQuery = supabase
    .from("tickets")
    .select("id,category,title,description,priority,status,attachments,created_at,updated_at,created_by_profile:profiles!tickets_created_by_fkey(full_name,email),apartments(number,blocks(name))")
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

  const [{ data: tickets }, { data: apartments }, { data: canChangeStatus }] = await Promise.all([
    ticketsQuery,
    apartmentsQuery,
    supabase.rpc("has_permission", { condo_id: condoId, permission_key: "tickets.change_status" }),
  ]);
  const ticketRows = (tickets ?? []) as unknown as TicketRow[];
  const attachmentUrls = await signedAttachmentMap(supabase, ticketRows);
  const canManage = !access.isResident && (access.isAdmin || access.isSyndic || Boolean(canChangeStatus));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Atendimento</p>
        <h1 className="mt-2 text-3xl font-semibold">Solicitações</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Solicitação é pedido de atendimento: morador abre reclamação, manutenção ou sugestão; administração acompanha e muda o status.
        </p>
      </div>
      <TicketForm condoId={condoId} apartments={(apartments ?? []) as never} />
      {ticketRows.length ? (
        <div className="space-y-3">
          {ticketRows.map((ticket) => (
            <Card key={ticket.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>{ticket.category}</StatusBadge>
                    <StatusBadge tone={ticket.status === "open" ? "warning" : "neutral"}>{statusLabel(ticket.status)}</StatusBadge>
                    <StatusBadge>{priorityLabel(ticket.priority)}</StatusBadge>
                  </div>
                  <h2 className="mt-3 font-semibold">{ticket.title}</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.description}</p>
                  <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>{ticket.apartments?.blocks?.name ?? "Sem bloco"} - {ticket.apartments?.number ?? "sem apto"}</span>
                    <span>Criado por: {ticket.created_by_profile?.full_name ?? ticket.created_by_profile?.email ?? "Não informado"}</span>
                    <span>{new Date(ticket.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  {ticket.attachments?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ticket.attachments.map((path, index) => (
                        <Button key={path} asChild variant="outline" size="sm">
                          <Link href={attachmentUrls.get(path) ?? "#"} target="_blank">Anexo {index + 1}</Link>
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <form action={updateTicketStatusAction} className="flex gap-2">
                      <input type="hidden" name="condominium_id" value={condoId} />
                      <input type="hidden" name="ticket_id" value={ticket.id} />
                      <select name="status" defaultValue={ticket.status} className="h-11 rounded-lg border bg-card px-3 text-sm">
                        <option value="open">Aberta</option>
                        <option value="in_progress">Em andamento</option>
                        <option value="resolved">Resolvida</option>
                        <option value="closed">Fechada</option>
                      </select>
                      <Button type="submit" variant="outline" size="sm">Salvar</Button>
                    </form>
                    {access.isAdmin ? (
                      <form action={deleteTicketAction}>
                        <input type="hidden" name="condominium_id" value={condoId} />
                        <input type="hidden" name="ticket_id" value={ticket.id} />
                        <Button type="submit" variant="destructive" size="icon" aria-label="Excluir solicitação">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="Nenhuma solicitação" description="Pedidos criados por moradores e administração aparecem aqui." />
      )}
    </div>
  );
}
