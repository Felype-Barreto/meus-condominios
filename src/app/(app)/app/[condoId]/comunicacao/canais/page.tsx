import { Layers3, PackagePlus } from "lucide-react";
import {
  CommunicationChannelCard,
  CommunicationChannelForm,
  type CommunicationChannelCardData,
} from "@/components/app/communication-forms";
import { CommunicationNav } from "@/components/app/communication-nav";
import { UpgradeBanner } from "@/components/app/upgrade-banner";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  canCreateCommunicationChannel,
  communicationAddons,
  getCommunicationPlanLimits,
} from "@/lib/communication";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestCommunicationAddonAction } from "../actions";

type ChannelRow = {
  id: string;
  name: string;
  type: CommunicationChannelCardData["type"];
  scope: CommunicationChannelCardData["scope"];
  status: string;
  plan_required: string;
  role: string | null;
  block_id: string | null;
  allowed_message_types: CommunicationChannelCardData["allowed_message_types"];
  blocks: { name: string | null }[] | null;
};

type ChannelLogRow = {
  channel_id: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

export default async function CommunicationChannelsPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: condo }, { data: channels }, { data: blocks }, { data: logs }, limits, canCreate] =
    await Promise.all([
      supabase.from("condominiums").select("name").eq("id", condoId).single(),
      supabase
        .from("communication_channels")
        .select("id, name, type, scope, status, plan_required, role, block_id, allowed_message_types, blocks(name)")
        .eq("condominium_id", condoId)
        .order("created_at", { ascending: false }),
      supabase.from("blocks").select("id, name").eq("condominium_id", condoId).order("sort_order"),
      supabase
        .from("communication_dispatch_channels")
        .select("channel_id, status, error_message, sent_at, created_at, communication_dispatches!inner(condominium_id)")
        .eq("communication_dispatches.condominium_id", condoId)
        .order("created_at", { ascending: false })
        .limit(120),
      getCommunicationPlanLimits(condoId),
      canCreateCommunicationChannel(condoId),
    ]);

  const latestByChannel = new Map<string, ChannelLogRow>();
  ((logs ?? []) as ChannelLogRow[]).forEach((log) => {
    if (!latestByChannel.has(log.channel_id)) latestByChannel.set(log.channel_id, log);
  });

  const channelRows = (channels ?? []) as ChannelRow[];
  const appChannel: CommunicationChannelCardData = {
    id: "app-obrigatorio",
    name: "App Meus Condomínios",
    type: "app",
    scope: "all",
    status: "active",
    plan_required: "free",
    role: null,
    block_id: null,
    allowed_message_types: [
      "announcement",
      "maintenance",
      "booking",
      "package",
      "security",
      "meeting",
      "summary",
      "other",
    ],
  };
  const cardRows: CommunicationChannelCardData[] = [
    ...(channelRows.some((channel) => channel.type === "app") ? [] : [appChannel]),
    ...channelRows.map((channel) => {
      const latest = latestByChannel.get(channel.id);
      return {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        scope: channel.scope,
        status: channel.status,
        plan_required: channel.plan_required,
        role: channel.role,
        block_id: channel.block_id,
        allowed_message_types: channel.allowed_message_types,
        block_name: channel.blocks?.[0]?.name,
        last_status: latest?.status,
        last_sent_at: latest?.sent_at,
        last_error: latest?.error_message,
      };
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{condo?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Canais de comunicação</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Configure grupo geral, blocos, garagem, portaria, conselho, funcionários, app interno e WhatsApp privado.
        </p>
      </div>

      <CommunicationNav condoId={condoId} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Canais externos do plano</p>
          <strong className="mt-1 block text-3xl font-semibold">
            {canCreate.used}/{canCreate.limit}
          </strong>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(canCreate.percent, 100)}%` }} />
          </div>
          {canCreate.warn ? (
            <p className="mt-3 text-sm text-warning">Você está perto do limite de canais.</p>
          ) : null}
        </Card>
        <Card className="p-5 lg:col-span-2">
          <p className="text-sm font-semibold">Plano {limits.plan}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            App interno é obrigatório e não conta no limite. WhatsApp oficial só pode ser criado com configuração Meta válida.
            Grupos não aceitam mensagens privadas como encomendas e reservas individuais.
          </p>
        </Card>
      </div>

      {!canCreate.blocked ? (
        <CommunicationChannelForm condoId={condoId} blocks={blocks ?? []} />
      ) : (
        <UpgradeBanner
          condoId={condoId}
          title="Limite de canais atingido"
          description="Solicite um canal extra ou faça upgrade para criar novos grupos."
        />
      )}

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Layers3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Canais cadastrados</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cardRows.length ? (
            cardRows.map((channel) => (
              <CommunicationChannelCard
                key={channel.id}
                condoId={condoId}
                channel={channel}
                blocks={blocks ?? []}
              />
            ))
          ) : (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                icon={Layers3}
                title="Nenhum canal externo"
                description="Crie um WhatsApp manual, grupo de bloco ou canal da portaria."
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <PackagePlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Add-ons</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {communicationAddons.map((addon) => (
            <form key={addon.id} action={requestCommunicationAddonAction} className="rounded-lg border bg-background p-4">
              <input type="hidden" name="condominium_id" value={condoId} />
              <input type="hidden" name="addon_type" value={addon.id} />
              <p className="font-semibold">{addon.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{addon.price}</p>
              <Button className="mt-4 w-full" size="sm" variant="outline">
                Solicitar
              </Button>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}
