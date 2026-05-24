import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, Eye, Send, Smartphone } from "lucide-react";
import Link from "next/link";
import { CommunicationNav } from "@/components/app/communication-nav";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { communicationMessageTypeLabels } from "@/lib/communication";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DispatchRow = {
  id: string;
  title: string;
  priority: string;
  message_type: keyof typeof communicationMessageTypeLabels;
  status: string;
  created_at: string;
  sent_at: string | null;
  communication_recipients: {
    status: string;
    delivered_at: string | null;
    read_at: string | null;
    communication_channels: { type: string | null }[] | null;
  }[];
  communication_dispatch_channels: { id: string; status: string; estimated_cost_units: number }[];
};

function metrics(dispatch: DispatchRow) {
  const recipients = dispatch.communication_recipients ?? [];
  const appRecipients = recipients.filter((item) => item.communication_channels?.[0]?.type === "app");
  const whatsappRecipients = recipients.filter((item) => String(item.communication_channels?.[0]?.type ?? "").startsWith("whatsapp"));

  return {
    appDelivered: appRecipients.filter((item) => item.delivered_at).length,
    appRead: appRecipients.filter((item) => item.read_at).length,
    whatsappDelivered: whatsappRecipients.filter((item) => item.delivered_at).length,
    failed: recipients.filter((item) => item.status === "failed").length,
    credits: (dispatch.communication_dispatch_channels ?? []).reduce((sum, item) => sum + Number(item.estimated_cost_units ?? 0), 0),
  };
}

export default async function CommunicationReportsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: dispatches }] = await Promise.all([
    supabase.from("condominiums").select("name").eq("id", condoId).single(),
    supabase
      .from("communication_dispatches")
      .select(`
        id,
        title,
        priority,
        message_type,
        status,
        created_at,
        sent_at,
        communication_recipients(status,delivered_at,read_at,communication_channels(type)),
        communication_dispatch_channels(id,status,estimated_cost_units)
      `)
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const rows = (dispatches ?? []) as DispatchRow[];
  const totals = rows.reduce(
    (acc, dispatch) => {
      const item = metrics(dispatch);
      acc.appDelivered += item.appDelivered;
      acc.appRead += item.appRead;
      acc.whatsappDelivered += item.whatsappDelivered;
      acc.failed += item.failed;
      return acc;
    },
    { appDelivered: 0, appRead: 0, whatsappDelivered: 0, failed: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Relatórios de comunicação</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Veja alcance, leitura no app, falhas e canais usados sem expor telefone dos moradores.
        </p>
      </div>

      <CommunicationNav condoId={condoId} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <Send className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Receberam no app</p>
          <strong className="mt-1 block text-3xl">{totals.appDelivered}</strong>
        </Card>
        <Card className="p-5">
          <Eye className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Visualizaram</p>
          <strong className="mt-1 block text-3xl">{totals.appRead}</strong>
        </Card>
        <Card className="p-5">
          <Smartphone className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">WhatsApp entregue</p>
          <strong className="mt-1 block text-3xl">{totals.whatsappDelivered}</strong>
        </Card>
        <Card className="p-5">
          <BarChart3 className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Falhas</p>
          <strong className="mt-1 block text-3xl">{totals.failed}</strong>
        </Card>
      </div>

      <Card className="p-5">
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((dispatch) => {
              const item = metrics(dispatch);
              const readPercent = item.appDelivered ? Math.round((item.appRead / item.appDelivered) * 100) : 0;

              return (
                <div key={dispatch.id} className="rounded-lg border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone={dispatch.priority === "urgent" ? "warning" : "neutral"}>
                          {dispatch.priority}
                        </StatusBadge>
                        <StatusBadge>{communicationMessageTypeLabels[dispatch.message_type] ?? dispatch.message_type}</StatusBadge>
                        <StatusBadge>{readPercent}% lido</StatusBadge>
                      </div>
                      <h2 className="mt-3 font-semibold">{dispatch.title}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(dispatch.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/app/${condoId}/comunicacao/disparos/${dispatch.id}`}>
                        Ver relatório
                      </Link>
                    </Button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-5">
                    <div className="rounded-lg border bg-card p-2">
                      <strong className="block text-base">{item.appDelivered}</strong>
                      app
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <strong className="block text-base">{item.appRead}</strong>
                      lidos
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <strong className="block text-base">{item.whatsappDelivered}</strong>
                      WhatsApp
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <strong className="block text-base">{item.failed}</strong>
                      falhas
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <strong className="block text-base">{item.credits}</strong>
                      créditos
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={BarChart3}
            title="Nenhum relatório ainda"
            description="Quando a Central enviar comunicados, os relatórios de alcance aparecerão aqui."
          />
        )}
      </Card>
    </div>
  );
}
