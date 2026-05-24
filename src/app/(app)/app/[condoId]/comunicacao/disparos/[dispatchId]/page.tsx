import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Eye, RefreshCw } from "lucide-react";
import Link from "next/link";
import { CommunicationNav } from "@/components/app/communication-nav";
import { CommunicationReportActions } from "@/components/app/communication-report-actions";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  markCommunicationDispatchReadAction,
  resendUnreadCommunicationAction,
} from "@/app/(app)/app/[condoId]/comunicacao/actions";
import { communicationMessageTypeLabels } from "@/lib/communication";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Report = {
  app_delivered?: number;
  app_read?: number;
  whatsapp_delivered?: number;
  failed?: number;
  channel_count?: number;
  credit_cost?: number;
  pending_app_reads?: number;
};

type DispatchRow = {
  id: string;
  title: string;
  body: string;
  priority: string;
  message_type: keyof typeof communicationMessageTypeLabels;
  target_type: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  scheduled_at: string | null;
  profiles: { full_name: string | null; email: string | null }[] | null;
};

type ChannelLog = {
  id: string;
  status: string;
  estimated_cost_units: number;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  communication_channels: { name: string | null; type: string | null; scope: string | null }[] | null;
};

type RecipientRow = {
  id: string;
  status: string;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  apartment_id: string | null;
  apartments: { number: string | null; blocks: { name: string | null }[] | null }[] | null;
  profiles: { full_name: string | null; email: string | null }[] | null;
  communication_channels: { name: string | null; type: string | null; scope: string | null }[] | null;
};

function metric(value: unknown) {
  return Number(value ?? 0);
}

function dateLabel(value?: string | null) {
  return value ? format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Não registrado";
}

export default async function CommunicationDispatchDetailPage({
  params,
}: {
  params: Promise<{ condoId: string; dispatchId: string }>;
}) {
  const { condoId, dispatchId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: dispatch }, { data: report }, { data: logs }, { data: recipients }, { data: limits }] =
    await Promise.all([
      supabase.from("condominiums").select("name").eq("id", condoId).single(),
      supabase
        .from("communication_dispatches")
        .select("*, profiles!communication_dispatches_created_by_fkey(full_name,email)")
        .eq("id", dispatchId)
        .eq("condominium_id", condoId)
        .single(),
      supabase.rpc("get_communication_dispatch_report", { dispatch_id_input: dispatchId }),
      supabase
        .from("communication_dispatch_channels")
        .select("id,status,estimated_cost_units,error_message,sent_at,created_at,communication_channels!communication_dispatch_channels_channel_id_fkey(name,type,scope)")
        .eq("dispatch_id", dispatchId)
        .order("created_at", { ascending: true }),
      supabase
        .from("communication_recipients")
        .select("id,status,delivered_at,read_at,failed_at,apartment_id,profiles!communication_recipients_user_id_fkey(full_name,email),apartments!communication_recipients_apartment_id_fkey(number,blocks(name)),communication_channels!communication_recipients_channel_id_fkey(name,type,scope)")
        .eq("dispatch_id", dispatchId)
        .order("created_at", { ascending: true })
        .limit(250),
      supabase.rpc("get_communication_plan_limits", { condo_id: condoId }),
    ]);

  const dispatchRow = dispatch as DispatchRow | null;
  const reportRow = (report ?? {}) as Report;
  const logRows = (logs ?? []) as ChannelLog[];
  const recipientRows = (recipients ?? []) as RecipientRow[];
  const pendingAppRows = recipientRows.filter((item) => {
    const channelType = item.communication_channels?.[0]?.type;
    return channelType === "app" && !item.read_at && item.status !== "failed";
  });
  const readPercent = metric(reportRow.app_delivered)
    ? Math.round((metric(reportRow.app_read) / metric(reportRow.app_delivered)) * 100)
    : 0;
  const plan = String((limits as { plan?: string } | null)?.plan ?? "free");
  const canExport = plan === "pro" || plan === "total";
  const canResend = plan === "pro" || plan === "total";

  if (!dispatchRow) {
    return (
      <div className="space-y-6">
        <CommunicationNav condoId={condoId} />
        <EmptyState icon={Eye} title="Disparo não encontrado" description="Verifique se o relatório pertence a este condomínio." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{condo?.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">{dispatchRow.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Relatório de alcance, leitura e canais usados pela Central de Comunicação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExport ? (
            <Button asChild variant="outline">
              <Link href={`/app/${condoId}/comunicacao/disparos/${dispatchId}/export`}>
                <Download className="h-4 w-4" />
                CSV
              </Link>
            </Button>
          ) : null}
          <form action={markCommunicationDispatchReadAction}>
            <input type="hidden" name="condominium_id" value={condoId} />
            <input type="hidden" name="dispatch_id" value={dispatchId} />
            <Button variant="outline" type="submit">
              <Eye className="h-4 w-4" />
              Marcar como lido
            </Button>
          </form>
        </div>
      </div>

      <CommunicationNav condoId={condoId} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Receberam no app</p>
          <strong className="mt-2 block text-3xl">{metric(reportRow.app_delivered)}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Visualizaram no app</p>
          <strong className="mt-2 block text-3xl">{metric(reportRow.app_read)}</strong>
          <p className="mt-1 text-xs text-muted-foreground">{readPercent}% de leitura</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">WhatsApp entregue</p>
          <strong className="mt-2 block text-3xl">{metric(reportRow.whatsapp_delivered)}</strong>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Falhas / créditos</p>
          <strong className="mt-2 block text-3xl">{metric(reportRow.failed)} / {metric(reportRow.credit_cost)}</strong>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge>{dispatchRow.status}</StatusBadge>
            <StatusBadge tone={dispatchRow.priority === "urgent" ? "warning" : "neutral"}>{dispatchRow.priority}</StatusBadge>
            <StatusBadge>{communicationMessageTypeLabels[dispatchRow.message_type] ?? dispatchRow.message_type}</StatusBadge>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-6">{dispatchRow.body}</p>
          <div className="mt-5 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <p>Enviado por: {dispatchRow.profiles?.[0]?.full_name ?? dispatchRow.profiles?.[0]?.email ?? "Administração"}</p>
            <p>Data: {dateLabel(dispatchRow.sent_at ?? dispatchRow.created_at)}</p>
            <p>Destino: {dispatchRow.target_type}</p>
            <p>Canais/grupos: {metric(reportRow.channel_count)}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <CommunicationReportActions title={dispatchRow.title} body={dispatchRow.body} />
            <form action={resendUnreadCommunicationAction}>
              <input type="hidden" name="condominium_id" value={condoId} />
              <input type="hidden" name="dispatch_id" value={dispatchId} />
              <Button variant="outline" type="submit" disabled={!canResend || pendingAppRows.length === 0}>
                <RefreshCw className="h-4 w-4" />
                Reenviar para não visualizados
              </Button>
            </form>
          </div>
          {!canResend ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Reenvio para não visualizados fica disponível nos planos Pro e Total.
            </p>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Apartamentos que ainda não visualizaram</h2>
          <div className="mt-4 space-y-3">
            {pendingAppRows.length ? (
              pendingAppRows.slice(0, 20).map((item) => (
                <div key={item.id} className="rounded-lg border bg-background p-3">
                  <p className="font-semibold">
                    {item.apartments?.[0]?.blocks?.[0]?.name ? `${item.apartments[0].blocks?.[0]?.name} · ` : ""}
                    Apto {item.apartments?.[0]?.number ?? "não vinculado"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.profiles?.[0]?.full_name ?? "Morador"} · telefone não exibido
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma pendência de leitura no app.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Logs por canal</h2>
          <div className="mt-4 space-y-3">
            {logRows.map((log) => (
              <div key={log.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{log.communication_channels?.[0]?.name ?? "Canal"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {log.communication_channels?.[0]?.type ?? "app"} · {log.communication_channels?.[0]?.scope ?? "all"}
                    </p>
                  </div>
                  <StatusBadge tone={log.status === "failed" ? "error" : log.status === "sent" ? "success" : "warning"}>
                    {log.status}
                  </StatusBadge>
                </div>
                {log.error_message ? <p className="mt-2 text-sm text-destructive">{log.error_message}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">{log.estimated_cost_units} crédito(s)</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Resumo por bloco</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(
              recipientRows.reduce<Record<string, { delivered: number; read: number }>>((acc, item) => {
                const key = item.apartments?.[0]?.blocks?.[0]?.name ?? "Sem bloco";
                acc[key] ??= { delivered: 0, read: 0 };
                if (item.delivered_at) acc[key].delivered += 1;
                if (item.read_at) acc[key].read += 1;
                return acc;
              }, {}),
            ).map(([block, item]) => (
              <div key={block} className="rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{block}</p>
                  <StatusBadge>{item.read}/{item.delivered} lidos</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
