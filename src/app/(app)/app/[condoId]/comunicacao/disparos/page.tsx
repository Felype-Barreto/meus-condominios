import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send } from "lucide-react";
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
  body: string;
  priority: string;
  message_type: keyof typeof communicationMessageTypeLabels;
  target_type: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  communication_dispatch_channels: { id: string; status: string }[];
};

export default async function CommunicationDispatchesPage({
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
      .select("*, communication_dispatch_channels(id,status)")
      .eq("condominium_id", condoId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const rows = (dispatches ?? []) as DispatchRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{condo?.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Disparos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Acompanhe comunicados enviados, agendados, falhos e em fallback manual.
          </p>
        </div>
        <Button asChild>
          <Link href={`/app/${condoId}/comunicacao/disparos/novo`}>Novo disparo</Link>
        </Button>
      </div>

      <CommunicationNav condoId={condoId} />

      <Card className="p-5">
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((dispatch) => (
              <div
                key={dispatch.id}
                className="flex flex-col gap-3 rounded-lg border bg-background p-4 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={dispatch.priority === "urgent" ? "warning" : "neutral"}>
                      {dispatch.priority}
                    </StatusBadge>
                    <StatusBadge>{dispatch.status}</StatusBadge>
                    <StatusBadge>
                      {communicationMessageTypeLabels[dispatch.message_type] ?? dispatch.message_type}
                    </StatusBadge>
                  </div>
                  <h2 className="mt-3 font-semibold">{dispatch.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{dispatch.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {dispatch.target_type} · {dispatch.communication_dispatch_channels.length} canal(is) ·{" "}
                    {formatDistanceToNow(new Date(dispatch.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                  <Button asChild className="mt-3" size="sm" variant="outline">
                    <Link href={`/app/${condoId}/comunicacao/disparos/${dispatch.id}`}>
                      Ver relatório
                    </Link>
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs md:w-52">
                  {["sent", "manual_only", "failed"].map((status) => (
                    <div key={status} className="rounded-lg border bg-card p-2">
                      <strong className="block text-base">
                        {dispatch.communication_dispatch_channels.filter((item) => item.status === status).length}
                      </strong>
                      {status}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Send}
            title="Nenhum disparo"
            description="Os comunicados publicados pela Central aparecerão aqui."
          />
        )}
      </Card>
    </div>
  );
}
