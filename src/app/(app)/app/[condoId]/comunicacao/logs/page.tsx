import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ListChecks } from "lucide-react";
import { CommunicationNav } from "@/components/app/communication-nav";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LogRow = {
  id: string;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
  estimated_cost_units: number;
  sent_at: string | null;
  created_at: string;
  communication_channels: { name: string | null; type: string | null; scope: string | null }[] | null;
  communication_dispatches: { title: string | null; priority: string | null }[] | null;
};

export default async function CommunicationLogsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: logs }] = await Promise.all([
    supabase.from("condominiums").select("name").eq("id", condoId).single(),
    supabase
      .from("communication_dispatch_channels")
      .select(`
        id,
        status,
        provider_message_id,
        error_message,
        estimated_cost_units,
        sent_at,
        created_at,
        communication_channels(name,type,scope),
        communication_dispatches!inner(title,priority,condominium_id)
      `)
      .eq("communication_dispatches.condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(150),
  ]);

  const rows = (logs ?? []) as LogRow[];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Logs da comunicação</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Auditoria por canal, sem exibir telefone ou dados sensíveis de moradores.
        </p>
      </div>

      <CommunicationNav condoId={condoId} />

      <Card className="p-5">
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-3 rounded-lg border bg-background p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">{log.communication_dispatches?.[0]?.title ?? "Disparo"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {log.communication_channels?.[0]?.name ?? "Canal"} · {log.communication_channels?.[0]?.type ?? "app"} ·{" "}
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                  {log.error_message ? (
                    <p className="mt-1 text-sm text-destructive">{log.error_message}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={log.status === "failed" ? "error" : log.status === "sent" ? "success" : "warning"}>
                    {log.status}
                  </StatusBadge>
                  <StatusBadge>{log.estimated_cost_units} crédito(s)</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ListChecks}
            title="Nenhum log"
            description="Logs de envio, fallback manual e bloqueios de segurança aparecerão aqui."
          />
        )}
      </Card>
    </div>
  );
}
