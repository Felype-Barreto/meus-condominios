import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { supportCategoryLabels } from "@/lib/support";

type SupportTicketRow = {
  id: string;
  category: keyof typeof supportCategoryLabels;
  subject: string;
  message: string;
  status: string;
  priority: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

function statusTone(status: string) {
  if (status === "resolved" || status === "closed" || status === "answered") return "success" as const;
  if (status === "in_progress" || status === "waiting_customer" || status === "waiting") return "warning" as const;
  return "neutral" as const;
}

export function SupportTicketList({ tickets }: { tickets: SupportTicketRow[] }) {
  if (!tickets.length) {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-lg font-semibold">Nenhum chamado registrado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Quando você abrir um chamado, ele aparecerá aqui com status e histórico básico.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {tickets.map((ticket) => {
        const response =
          typeof ticket.metadata?.response_note === "string"
            ? ticket.metadata.response_note
            : null;

        return (
          <Card key={ticket.id} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={statusTone(ticket.status)}>
                    {ticket.status}
                  </StatusBadge>
                  <StatusBadge>{ticket.priority}</StatusBadge>
                </div>
                <h2 className="mt-3 text-lg font-semibold">{ticket.subject}</h2>
                <p className="mt-1 text-sm font-medium text-primary">
                  {supportCategoryLabels[ticket.category] ?? ticket.category}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {ticket.message}
                </p>
                {response ? (
                  <div className="mt-4 rounded-lg border bg-background p-3 text-sm leading-6">
                    <strong>Resposta:</strong>
                    <p className="mt-1 text-muted-foreground">{response}</p>
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(ticket.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
