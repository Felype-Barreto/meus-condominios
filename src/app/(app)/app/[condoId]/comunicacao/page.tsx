import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  Layers3,
  LockKeyhole,
  MessageCircle,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { CommunicationDispatchForm } from "@/components/app/communication-forms";
import { CommunicationNav } from "@/components/app/communication-nav";
import { UpgradeBanner } from "@/components/app/upgrade-banner";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  communicationChannelTypeLabels,
  communicationPlanDescriptions,
  getCommunicationPlanLimits,
} from "@/lib/communication";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canSendWhatsAppMessage } from "@/lib/whatsapp";
import { getWhatsAppConfigurationStatus } from "@/lib/whatsapp/adapter";

type ChannelRow = {
  id: string;
  name: string;
  type: keyof typeof communicationChannelTypeLabels;
  scope: string;
  status: string;
};

type DispatchRow = {
  id: string;
  title: string;
  priority: string;
  status: string;
  created_at: string;
};

export default async function CommunicationPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: channels }, { data: dispatches }, limits, whatsUsage] =
    await Promise.all([
      supabase.from("condominiums").select("name, plan").eq("id", condoId).single(),
      supabase
        .from("communication_channels")
        .select("id, name, type, scope, status")
        .eq("condominium_id", condoId)
        .order("created_at", { ascending: false }),
      supabase
        .from("communication_dispatches")
        .select("id, title, priority, status, created_at")
        .eq("condominium_id", condoId)
        .order("created_at", { ascending: false })
        .limit(6),
      getCommunicationPlanLimits(condoId),
      canSendWhatsAppMessage(condoId),
    ]);

  const channelRows = (channels ?? []) as ChannelRow[];
  const dispatchRows = (dispatches ?? []) as DispatchRow[];
  const envStatus = getWhatsAppConfigurationStatus();
  const planKey = (limits.plan as keyof typeof communicationPlanDescriptions) ?? "free";
  const advancedCommunicationEnabled = limits.plan === "pro" || limits.plan === "total";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{condo?.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Central de Comunicação
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Publique avisos no app, prepare WhatsApp manual e organize canais sem expor dados sensíveis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/app/${condoId}/comunicacao/canais`}>Gerenciar canais</Link>
          </Button>
          <Button asChild>
            <Link href={`/app/${condoId}/comunicacao/disparos/novo`}>Novo comunicado</Link>
          </Button>
        </div>
      </div>

      <CommunicationNav condoId={condoId} />

      {!limits.templates ? (
        <UpgradeBanner
          condoId={condoId}
          title="Templates e canais avançados estão nos planos pagos"
          description="No plano grátis, use Avisos e WhatsApp manual sem envio automático."
        />
      ) : null}

      {!envStatus.configured ? (
        <Card className="flex gap-3 border-amber-200 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">WhatsApp oficial não configurado</p>
            <p className="mt-1 text-sm">
              Canais oficiais ficam bloqueados até liberarmos Pro e Total.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <Layers3 className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Canais ativos</p>
          <strong className="mt-1 block text-3xl font-semibold">{channelRows.length}</strong>
          <p className="mt-2 text-xs text-muted-foreground">Limite do plano: {limits.max_channels}</p>
        </Card>
        <Card className="p-5">
          <MessageCircle className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">WhatsApp manual</p>
          <strong className="mt-1 block text-3xl font-semibold">{whatsUsage.remaining}</strong>
          <p className="mt-2 text-xs text-muted-foreground">{whatsUsage.percent}% usado</p>
        </Card>
        <Card className="p-5">
          <BellRing className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Últimos disparos</p>
          <strong className="mt-1 block text-3xl font-semibold">{dispatchRows.length}</strong>
          <p className="mt-2 text-xs text-muted-foreground">Histórico recente</p>
        </Card>
        <Card className="p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Plano</p>
          <strong className="mt-1 block text-2xl font-semibold">{limits.plan}</strong>
          <p className="mt-2 text-xs text-muted-foreground">
            {communicationPlanDescriptions[planKey] ?? communicationPlanDescriptions.free}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        {advancedCommunicationEnabled ? (
          <CommunicationDispatchForm condoId={condoId} channels={channelRows} />
        ) : (
          <Card className="relative min-h-80 overflow-hidden p-5">
            <div className="pointer-events-none select-none blur-[2px] opacity-45">
              <h2 className="text-lg font-semibold">Comunicação por canais</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Selecione canais, grupos e apartamentos para enviar comunicados segmentados.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted p-4">Grupo WhatsApp oficial</div>
                <div className="rounded-lg border bg-muted p-4">Moradores selecionados</div>
                <div className="rounded-lg border bg-muted p-4">Relatório de leitura</div>
                <div className="rounded-lg border bg-muted p-4">Automação de envio</div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 p-6 backdrop-blur-[1px]">
              <div className="max-w-sm rounded-lg border bg-card p-5 text-center shadow-lg">
                <LockKeyhole className="mx-auto h-8 w-8 text-primary" />
                <h2 className="mt-3 text-lg font-semibold">Bloqueado para Pro e Total</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  No Free e Premium, use Avisos e WhatsApp manual. Disparos automáticos e canais oficiais ficam para os planos Pro e Total.
                </p>
                <Button asChild className="mt-4" variant="outline">
                  <Link href={`/app/${condoId}/comunicados`}>Ir para Avisos</Link>
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Canais ativos</h2>
              <Button asChild size="sm" variant="outline" disabled={!advancedCommunicationEnabled}>
                <Link href={`/app/${condoId}/comunicacao/canais`}>
                  <Plus className="h-4 w-4" />
                  Canal
                </Link>
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {channelRows.length ? (
                channelRows.slice(0, 6).map((channel) => (
                  <div key={channel.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{channel.name}</p>
                      <StatusBadge tone={channel.status === "active" ? "success" : "warning"}>
                        {channel.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {communicationChannelTypeLabels[channel.type] ?? channel.type} · {channel.scope}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Layers3}
                  title="Nenhum canal criado"
                  description="Canais oficiais ficam bloqueados enquanto Pro e Total não forem liberados."
                />
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold">Últimos disparos</h2>
            <div className="mt-4 space-y-3">
              {dispatchRows.length ? (
                dispatchRows.map((dispatch) => (
                  <div key={dispatch.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{dispatch.title}</p>
                      <StatusBadge>{dispatch.status}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{dispatch.priority}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum disparo registrado ainda.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
